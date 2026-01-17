/**
 * Find more finance companies (goal: reach 1000) using maturity-first signals.
 *
 * Primary discovery source in this script: TheirStack (job posting signals).
 * - We look for "readiness" (AI/data leadership + data infrastructure investment)
 * - We also look for "pain" (roles that AI can replace/augment)
 *
 * Storage (Supabase):
 * - `companies`: canonical company per offer (deduped by (offer_id, domain))
 * - `campaign_companies`: links companies to a "leadgen" campaign + stores why/source
 *
 * Usage (Mac terminal):
 *   npx ts-node scripts/find-finance-companies-1000.ts --target-total 1000 --batch 200
 *
 * Notes:
 * - This spends TheirStack credits (Company Search API: 3 credits per company returned).
 * - Uses Company Search API (more efficient than Job Search) - gets companies + signals in one call.
 * - We intentionally do NOT find contacts here. After companies are loaded, run
 *   `scripts/enrich-finance-companies.ts` to find contacts + emails.
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { TheirStackClient } from '../src/lib/clients/theirstack.ts'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })
dotenv.config()

// -------------------------
// Args (simple parsing)
// -------------------------
function getArg(name: string, defaultValue?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return defaultValue
  return process.argv[idx + 1] ?? defaultValue
}

function getBoolArg(name: string, defaultValue: boolean): boolean {
  const v = getArg(name)
  if (v === undefined) return defaultValue
  return ['true', '1', 'yes', 'y'].includes(v.toLowerCase())
}

const TARGET_TOTAL = Number(getArg('target-total', '1000'))
const BATCH = Number(getArg('batch', '200')) // how many NEW companies to try to add per run
const MAX_PAGES = Number(getArg('max-pages', '10')) // pages of TheirStack results to scan per query
const POSTED_WITHIN_DAYS = Number(getArg('posted-within-days', '365'))
const DRY_RUN = getBoolArg('dry-run', false)
const THEIRSTACK_PAGE_SIZE = Math.min(Number(getArg('theirstack-page-size', '25')), 25) // plan limit: <= 25

// -------------------------
// Env + Supabase
// -------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env. Need NEXT_PUBLIC_SUPABASE_URL and a Supabase service key.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// -------------------------
// "Maturity-first" signals (heuristics)
// -------------------------

// 1) Technical leadership / AI roles (readiness)
const MATURITY_JOB_TITLE_PATTERNS = [
  'Head of Data',
  'Director of Data',
  'VP Data',
  'Chief Data Officer',
  'CDO',
  'Head of AI',
  'AI Engineer',
  'Machine Learning',
  'ML Engineer',
  'Data Scientist',
  'Data Engineer',
  'Quant',
  'Quantitative Research',
  'Automation',
  'Platform Engineer',
]

// 2) Data infrastructure investment (readiness)
const MATURITY_JOB_DESC_PATTERNS = [
  'Snowflake',
  'Databricks',
  'dbt',
  'BigQuery',
  'Redshift',
  'Airflow',
  'Kubernetes',
  'LLM',
  'large language model',
  'machine learning',
  'NLP',
  'vector database',
]

// 3) Roles AI can replace/augment (pain)
const PAIN_JOB_TITLE_PATTERNS = [
  'Research Analyst',
  'Investment Analyst',
  'Equity Research',
  'Deal Sourcing',
  'Sourcing Analyst',
  'Business Development',
  'Operations Analyst',
]

// Finance-firm intent filter (to reduce banks/credit unions/insurance noise)
const FINANCE_FIRM_KEYWORDS = [
  'hedge fund',
  'private equity',
  'asset management',
  'investment management',
  'alternative investment',
  'credit fund',
  'buyout',
  'growth equity',
  'venture capital',
]

const EXCLUDE_KEYWORDS = [
  'credit union',
  'bank',
  'insurance',
  'mortgage',
]

type FinanceSegment = 'hedge_fund' | 'private_equity' | 'asset_manager' | 'venture_capital' | 'other'
type MaturityTier = 'high' | 'medium' | 'low'

function guessSegment(companyText: string): FinanceSegment {
  const t = companyText.toLowerCase()
  if (t.includes('hedge fund')) return 'hedge_fund'
  if (t.includes('private equity') || t.includes('buyout') || t.includes('growth equity')) return 'private_equity'
  if (t.includes('asset management') || t.includes('investment management')) return 'asset_manager'
  if (t.includes('venture capital')) return 'venture_capital'
  return 'other'
}

function guessMaturity(jobTitles: string[], jobDescHits: string[]): MaturityTier {
  const titles = jobTitles.map(s => s.toLowerCase())
  const desc = jobDescHits.map(s => s.toLowerCase())

  // High: explicit AI/data leadership
  if (titles.some(t => t.includes('head of ai') || t.includes('chief data') || t.includes('head of data'))) {
    return 'high'
  }

  // Medium: building data/ML infrastructure
  if (
    titles.some(t => t.includes('data engineer') || t.includes('data scientist') || t.includes('machine learning') || t.includes('ml engineer')) ||
    desc.length > 0
  ) {
    return 'medium'
  }

  return 'low'
}

function looksLikeFinanceFirm(companyText: string): boolean {
  const t = companyText.toLowerCase()

  // Exclude obvious mismatches
  if (EXCLUDE_KEYWORDS.some(k => t.includes(k))) return false

  // Must contain at least one finance-firm keyword OR common investment-firm suffixes
  if (FINANCE_FIRM_KEYWORDS.some(k => t.includes(k))) return true

  // Fallback heuristic: if it says "capital", "partners", or "management" without bank/credit union/insurance
  if (t.includes('capital') || t.includes('partners') || t.includes('management')) return true

  return false
}

// Extract a clean domain from TheirStack job/company objects
function normalizeDomain(domain?: string | null): string | null {
  if (!domain) return null
  const d = domain.trim().toLowerCase()
  if (!d) return null
  // Some sources include full URLs; keep only hostname-ish
  return d
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim() || null
}

// Helper to extract company data from TheirStack Company Search API response
function collectCompanyFromCompanySearch(company: any, signalType: 'maturity' | 'pain') {
  const domain = normalizeDomain(company.domain)
  const name = company.name || 'Unknown'
  const industry = company.industry || null
  const description = company.long_description || company.seo_description || null

  const companyText = [name, industry, description].filter(Boolean).join(' | ')
  
  // Extract job titles from matching jobs (if any)
  const jobTitles = (company.jobs_found || []).map((j: any) => j.job_title || '').filter(Boolean)
  const primaryJobTitle = jobTitles[0] || ''
  
  // Extract tech hits from technologies_found
  const techHits = (company.technologies_found || [])
    .map((t: any) => t.technology?.slug || '')
    .filter((slug: string) => MATURITY_JOB_DESC_PATTERNS.some(p => slug.toLowerCase().includes(p.toLowerCase())))

  return {
    domain,
    name,
    industry,
    description,
    companyText,
    jobTitles,
    primaryJobTitle,
    techHits,
    theirstackCompanyId: company.id || null,
    theirstackCompanyLinkedin: company.linkedin_url || null,
    employeeCount: company.employee_count || null,
    signalType,
  }
}

async function ensureLeadgenCampaign(offerId: string): Promise<{ id: string; name: string }> {
  const campaignName = 'finance-leadgen-1000'
  const { data: existing, error: existingErr } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('offer_id', offerId)
    .eq('name', campaignName)
    .maybeSingle()

  if (existingErr) throw new Error(`Failed to load campaign: ${existingErr.message}`)
  if (existing?.id) return existing as any

  if (DRY_RUN) {
    // Fake ID in dry-run mode; we won't write anyway.
    return { id: 'dry_run_campaign', name: campaignName }
  }

  const { data: inserted, error: insErr } = await supabase
    .from('campaigns')
    .insert({
      offer_id: offerId,
      name: campaignName,
      status: 'draft',
      campaign_type: 'cold_outreach',
    } as any)
    .select('id, name')
    .maybeSingle()

  if (insErr || !inserted?.id) throw new Error(`Failed to create campaign: ${insErr?.message || 'unknown error'}`)
  return inserted as any
}

async function main() {
  console.log('🏁 Finance company discovery starting...')
  console.log(`   targetTotal=${TARGET_TOTAL} batch=${BATCH} postedWithinDays=${POSTED_WITHIN_DAYS} maxPages=${MAX_PAGES} dryRun=${DRY_RUN}`)

  // Load offer
  const { data: offer, error: offerErr } = await supabase
    .from('offers')
    .select('id, slug')
    .eq('slug', 'finance')
    .maybeSingle()

  if (offerErr || !offer?.id) throw new Error(`Finance offer not found in DB (slug=finance). ${offerErr?.message || ''}`)

  const campaign = await ensureLeadgenCampaign(offer.id)

  // Current count
  const { count: currentCompaniesCount, error: countErr } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', offer.id)

  if (countErr) throw new Error(`Failed to count companies: ${countErr.message}`)
  const current = currentCompaniesCount || 0
  console.log(`📦 Current companies for finance: ${current}`)

  if (current >= TARGET_TOTAL) {
    console.log('✅ Already at or above target. Nothing to do.')
    return
  }

  const theirstack = new TheirStackClient()
  if (!process.env.THEIRSTACK_API_KEY) {
    console.warn('⚠️ THEIRSTACK_API_KEY not set. This script will fail.')
  }

  // Build a set of existing domains to dedupe locally (saves DB round trips).
  const { data: existingDomainsRows, error: domErr } = await supabase
    .from('companies')
    .select('domain')
    .eq('offer_id', offer.id)
    .not('domain', 'is', null)

  if (domErr) throw new Error(`Failed to load existing domains: ${domErr.message}`)
  const existingDomains = new Set((existingDomainsRows || []).map(r => (r.domain || '').toLowerCase()))

  const toInsert: Array<{
    name: string
    domain: string
    vertical: string | null
    signals: any
    source_tool: string
  }> = []

  // Helper to add a company if it's new + looks like finance firm
  function maybeAddCompany(params: {
    name: string
    domain: string | null
    companyText: string
    jobTitles: string[]
    primaryJobTitle: string
    techHits: string[]
    signalType: 'maturity' | 'pain'
    theirstackCompanyId: string | null
    theirstackCompanyLinkedin: string | null
    employeeCount: number | null
    industry: string | null
    description: string | null
  }) {
    const domain = params.domain
    if (!domain) return
    const d = domain.toLowerCase()
    if (existingDomains.has(d)) return

    // Avoid obvious non-fit
    if (!looksLikeFinanceFirm(params.companyText)) return

    const segment = guessSegment(params.companyText)
    const maturity = guessMaturity(params.jobTitles, params.techHits)

    toInsert.push({
      name: params.name,
      domain: d,
      vertical: segment, // coarse segment for routing copy later
      source_tool: 'theirstack',
      signals: {
        // Segmentation
        segment_guess: segment,
        maturity_tier: maturity,
        maturity_method: 'job_signals+tech_signals+heuristic',
        // Signal evidence
        theirstack: {
          signal_type: params.signalType,
          job_titles: params.jobTitles,
          primary_job_title: params.primaryJobTitle,
          tech_hits: params.techHits,
          company: {
            industry: params.industry,
            employee_count: params.employeeCount,
            linkedin_url: params.theirstackCompanyLinkedin || null,
            theirstack_company_id: params.theirstackCompanyId || null,
          },
        },
      },
    })

    existingDomains.add(d)
  }

  // -----------------------------------------
  // Query A: "Maturity" companies (AI/data readiness)
  // Using Company Search API - more efficient (companies + signals in one call)
  // -----------------------------------------
  console.log('🔎 TheirStack Company Search: AI/data maturity signals...')
  for (let page = 0; page < MAX_PAGES && toInsert.length < BATCH; page++) {
    const resp = await theirstack.searchCompanies({
      page: page,
      limit: THEIRSTACK_PAGE_SIZE,
      job_filters: {
        job_title_pattern_or: MATURITY_JOB_TITLE_PATTERNS,
        job_description_pattern_or: MATURITY_JOB_DESC_PATTERNS,
        posted_at_max_age_days: POSTED_WITHIN_DAYS,
      },
      company_description_pattern_or: FINANCE_FIRM_KEYWORDS,
      include_total_results: page === 0,
      order_by: [{ field: 'employee_count', desc: true }],
    })

    const companies = resp.data || []
    for (const company of companies) {
      const c = collectCompanyFromCompanySearch(company, 'maturity')
      if (!c.domain) continue
      maybeAddCompany({
        name: c.name,
        domain: c.domain,
        companyText: c.companyText,
        jobTitles: c.jobTitles,
        primaryJobTitle: c.primaryJobTitle,
        techHits: c.techHits,
        signalType: c.signalType,
        theirstackCompanyId: c.theirstackCompanyId,
        theirstackCompanyLinkedin: c.theirstackCompanyLinkedin,
        employeeCount: c.employeeCount,
        industry: c.industry,
        description: c.description,
      })
      if (toInsert.length >= BATCH) break
    }
  }

  // -----------------------------------------
  // Query B: "Pain" companies (hiring roles AI replaces/augments)
  // Using Company Search API - more efficient
  // -----------------------------------------
  console.log('🔎 TheirStack: searching for “pain” signals (manual research/sourcing roles)...')
  for (let page = 0; page < MAX_PAGES && toInsert.length < BATCH; page++) {
    const resp = await theirstack.searchCompanies({
      page: page,
      limit: THEIRSTACK_PAGE_SIZE,
      job_filters: {
        job_title_pattern_or: PAIN_JOB_TITLE_PATTERNS,
        posted_at_max_age_days: POSTED_WITHIN_DAYS,
      },
      company_description_pattern_or: FINANCE_FIRM_KEYWORDS,
      include_total_results: page === 0,
      order_by: [{ field: 'employee_count', desc: true }],
    })

    const companies = resp.data || []
    for (const companyItem of companies) {
      const c = collectCompanyFromCompanySearch(companyItem, 'pain')
      if (!c.domain) continue
      maybeAddCompany({
        name: c.name,
        domain: c.domain,
        companyText: c.companyText,
        jobTitles: c.jobTitles,
        primaryJobTitle: c.primaryJobTitle,
        techHits: c.techHits,
        signalType: c.signalType,
        theirstackCompanyId: c.theirstackCompanyId,
        theirstackCompanyLinkedin: c.theirstackCompanyLinkedin,
        employeeCount: c.employeeCount,
        industry: c.industry,
        description: c.description,
      })
      if (toInsert.length >= BATCH) break
    }
    
    if (companies.length < THEIRSTACK_PAGE_SIZE) break // No more results
  }

  console.log(`🧺 Candidate NEW companies to insert: ${toInsert.length}`)
  if (toInsert.length === 0) {
    console.log('ℹ️ No new companies found in this run (try increasing max-pages or changing patterns).')
    return
  }

  // Always save processed data to JSON file (even in dry-run) so we don't lose API results
  const outputFile = path.join(process.cwd(), `theirstack-companies-${Date.now()}.json`)
  fs.writeFileSync(outputFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    dry_run: DRY_RUN,
    total_found: toInsert.length,
    companies: toInsert,
  }, null, 2))
  console.log(`💾 Saved ${toInsert.length} companies to: ${outputFile}`)

  if (DRY_RUN) {
    console.log('🧪 Dry run enabled — not writing to database.')
    console.log('Example company:', JSON.stringify(toInsert[0], null, 2))
    console.log(`📁 All ${toInsert.length} companies saved to JSON file above.`)
    return
  }

  // Upsert companies (dedupe enforced by DB unique constraint on (offer_id, domain))
  const companyRows = toInsert.map(c => ({
    offer_id: offer.id,
    name: c.name,
    domain: c.domain,
    vertical: c.vertical,
    signals: c.signals,
    source_tool: c.source_tool,
    status: 'new',
  }))

  const { data: insertedCompanies, error: upErr } = await supabase
    .from('companies')
    .upsert(companyRows as any, { onConflict: 'offer_id,domain' })
    .select('id, domain, name')

  if (upErr) throw new Error(`Failed to upsert companies: ${upErr.message}`)

  // Link to campaign via campaign_companies
  const campaignCompanies = (insertedCompanies || []).map(co => ({
    campaign_id: campaign.id,
    company_id: co.id,
    status: 'queued',
    source_tool: 'theirstack',
    added_reason: 'finance-leadgen-1000: maturity/pain hiring signals via TheirStack',
    source_query: `posted_at_max_age_days=${POSTED_WITHIN_DAYS}`,
    source_raw: {
      signals: (toInsert.find(x => x.domain === (co.domain || '').toLowerCase())?.signals) || null,
    },
  }))

  const { error: ccErr } = await supabase
    .from('campaign_companies')
    .upsert(campaignCompanies as any, { onConflict: 'campaign_id,company_id' })

  if (ccErr) throw new Error(`Failed to upsert campaign_companies: ${ccErr.message}`)

  // Final count
  const { count: afterCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', offer.id)

  console.log(`✅ Inserted/linked ${insertedCompanies?.length || 0} companies`)
  console.log(`📈 Finance companies now: ${afterCount || 'unknown'}`)
  console.log('Next: run `scripts/enrich-finance-companies.ts` to find contacts + emails for these new companies.')
}

main().catch(err => {
  console.error('❌ Finance company discovery failed:', err)
  process.exit(1)
})

