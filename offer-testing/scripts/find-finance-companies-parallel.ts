/**
 * Find finance companies using Parallel FindAll API.
 * 
 * Uses natural language queries to find companies matching our ICP:
 * - Small-to-Mid Hedge Funds ($10M-$500M AUM) with AI/data maturity signals
 * - Mid-Market PE Firms ($100M-$2B AUM) with technical leadership
 * - Companies hiring manual research/sourcing roles (pain signals)
 * 
 * Storage (Supabase):
 * - `companies`: canonical company per offer (deduped by (offer_id, domain))
 * - `campaign_companies`: links companies to "finance-leadgen-1000" campaign
 * 
 * Usage (Mac terminal):
 *   npx ts-node scripts/find-finance-companies-parallel.ts --target-total 1000 --batch 200
 * 
 * Notes:
 * - FindAll is async (15-30 seconds per query) - script polls for results
 * - Cost: ~$0.06-1.43 per 1000 companies (depending on generator)
 * - We intentionally do NOT find contacts here. After companies are loaded, run
 *   `scripts/enrich-finance-companies.ts` to find contacts + emails.
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { parallel } from '../src/lib/clients/parallel.ts'
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
const DRY_RUN = getBoolArg('dry-run', false)
const GENERATOR = (getArg('generator', 'core') as 'base' | 'core' | 'pro') || 'core'

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
// Helper Functions
// -------------------------

function normalizeDomain(domain?: string | null): string | null {
  if (!domain) return null
  const d = domain.trim().toLowerCase()
  if (!d) return null
  return d
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim() || null
}

type FinanceSegment = 'hedge_fund' | 'private_equity' | 'asset_manager' | 'other'
type MaturityTier = 'high' | 'medium' | 'low'

function guessSegment(companyText: string): FinanceSegment {
  const t = companyText.toLowerCase()
  if (t.includes('hedge fund')) return 'hedge_fund'
  if (t.includes('private equity') || t.includes('buyout') || t.includes('growth equity')) return 'private_equity'
  if (t.includes('asset management') || t.includes('investment management')) return 'asset_manager'
  return 'other'
}

function guessMaturity(signals: any): MaturityTier {
  const signalType = signals?.parallel?.signal_type || ''
  const evidence = signals?.parallel?.evidence || ''
  
  // High: explicit AI/data leadership
  if (evidence.includes('Head of AI') || evidence.includes('Chief Data Officer') || evidence.includes('Head of Data')) {
    return 'high'
  }
  
  // Medium: data infrastructure or technical roles
  if (signalType === 'maturity' || evidence.includes('Data Engineer') || evidence.includes('Snowflake') || evidence.includes('Databricks')) {
    return 'medium'
  }
  
  return 'low'
}

function looksLikeFinanceFirm(companyText: string): boolean {
  const t = companyText.toLowerCase()
  
  // Exclude obvious mismatches
  if (t.includes('credit union') || t.includes('bank') || t.includes('insurance') || t.includes('mortgage')) {
    return false
  }
  
  // Must contain finance-firm keywords
  const financeKeywords = [
    'hedge fund', 'private equity', 'asset management', 'investment management',
    'alternative investment', 'credit fund', 'buyout', 'growth equity', 'venture capital'
  ]
  
  if (financeKeywords.some(k => t.includes(k))) return true
  
  // Fallback: capital/partners/management without bank/credit union
  if ((t.includes('capital') || t.includes('partners') || t.includes('management')) && !t.includes('bank')) {
    return true
  }
  
  return false
}

// Extract company data from Parallel FindAll result
function extractCompanyFromFindAll(item: any, signalType: 'maturity' | 'pain'): {
  domain: string | null
  name: string
  description: string | null
  linkedinUrl: string | null
  employeeCount: number | null
  location: string | null
  evidence: string
  confidence: string | null
} {
  const domain = normalizeDomain(item.domain || item.website || item.url)
  const name = item.name || item.company_name || 'Unknown'
  const description = item.description || item.about || null
  const linkedinUrl = item.linkedin_url || item.linkedin || null
  const employeeCount = item.employee_count || item.employees || null
  const location = item.location || item.headquarters || item.city || null
  
  // Extract evidence from match reasoning or citations
  const evidence = [
    item.match_reasoning,
    item.reasoning,
    item.citations?.map((c: any) => c.excerpt || c.title).join(' | '),
  ].filter(Boolean).join(' | ') || ''
  
  const confidence = item.confidence_score || item.confidence || null

  return {
    domain,
    name,
    description,
    linkedinUrl,
    employeeCount,
    location,
    evidence,
    confidence,
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

// Poll for FindAll results
async function waitForFindAllResult(runId: string, maxWaitMinutes: number = 10): Promise<any> {
  const startTime = Date.now()
  const maxWaitMs = maxWaitMinutes * 60 * 1000
  const pollInterval = 5000 // Check every 5 seconds

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const result = await parallel.getFindAllResult(runId)
      
      // Check if completed
      if (result.status === 'completed') {
        return result
      }
      
      if (result.status === 'failed') {
        throw new Error(`FindAll run failed: ${result.error || 'unknown error'}`)
      }
      
      // Still running, wait and check again
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    } catch (error: any) {
      // If it's a "not ready" error, continue polling
      if (error.message?.includes('not ready') || error.message?.includes('not found')) {
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        continue
      }
      throw error
    }
  }

  throw new Error(`FindAll run timed out after ${maxWaitMinutes} minutes`)
}

// -------------------------
// FindAll Queries
// -------------------------

async function queryMaturityHedgeFunds(offerId: string, campaignId: string): Promise<any[]> {
  const queryName = 'maturity_hedge_funds'
  const objective = 'Find all small-to-mid hedge funds ($10M-$500M AUM) in the United States that have hired AI/data leadership roles or are investing in data infrastructure'
  const matchConditions = [
    {
      name: 'hedge_fund_type',
      description: "Company must be a hedge fund, alternative investment fund, or investment management firm. Look for keywords in company description: 'hedge fund', 'alternative investment', 'investment management', 'asset management'. Exclude banks, credit unions, insurance companies, and mortgage lenders."
    },
    {
      name: 'aum_size',
      description: "Company must have Assets Under Management (AUM) between $10M and $500M. Look for AUM information in company descriptions, LinkedIn pages, SEC filings, or fund databases. If AUM is not explicitly stated but company has 5-50 employees and describes itself as a 'small' or 'mid-sized' fund, consider requirement satisfied."
    },
    {
      name: 'ai_data_leadership',
      description: "Company must have hired for AI/data leadership roles in the past 2 years. Look for job postings, LinkedIn profiles, or press releases mentioning: 'Head of AI', 'Chief Data Officer', 'CDO', 'Head of Data', 'Director of Data', 'VP Data', 'AI Engineer', 'Machine Learning Engineer', 'Data Scientist', 'Quantitative Research'. Evidence can be from job boards, company career pages, or LinkedIn company updates."
    },
    {
      name: 'data_infrastructure',
      description: "Company must be using or investing in data infrastructure. Look for mentions of: 'Snowflake', 'Databricks', 'dbt', 'BigQuery', 'Redshift', 'Airflow', 'LLM', 'large language model', 'machine learning', 'NLP', 'vector database'. Evidence can be from job descriptions, tech stack mentions, or company blog posts."
    },
    {
      name: 'us_location',
      description: "Company headquarters must be in the United States. Look for location information in company descriptions, LinkedIn pages, or contact pages."
    }
  ]

  console.log('🔍 Query 1: Hedge Funds with AI/Data Maturity Signals...')
  
  const startTime = Date.now()
  const findall = await parallel.findAll(
    'companies',
    objective,
    matchConditions,
    BATCH,
    GENERATOR
  )

  const runId = findall.findall_id || findall.run_id
  console.log(`   ⏳ FindAll run created: ${runId}`)
  console.log(`   ⏳ Waiting for results (typically 15-30 seconds)...`)
  
  // Save run record (pending status)
  const { data: runRecord } = await supabase
    .from('parallel_findall_runs')
    .insert({
      findall_run_id: runId,
      query_name: queryName,
      objective: objective,
      entity_type: 'companies',
      generator: GENERATOR,
      match_limit: BATCH,
      match_conditions: matchConditions,
      request_params: findall,
      status: 'pending',
      offer_id: offerId,
      campaign_id: campaignId,
    } as any)
    .select('id')
    .maybeSingle()

  const result = await waitForFindAllResult(runId)
  const items = result.output?.items || result.candidates || []
  const durationSeconds = Math.floor((Date.now() - startTime) / 1000)
  
  // Calculate estimated cost (per 1000 companies)
  const costPer1000 = GENERATOR === 'base' ? 0.06 : GENERATOR === 'core' ? 0.23 : 1.43
  const estimatedCost = (items.length / 1000) * costPer1000
  
  // Update run record with results
  if (runRecord?.id) {
    await supabase
      .from('parallel_findall_runs')
      .update({
        status: 'completed',
        raw_response: result,
        items_count: items.length,
        estimated_cost_usd: estimatedCost,
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', runRecord.id)
  }
  
  console.log(`   ✅ Found ${items.length} companies (cost: ~$${estimatedCost.toFixed(2)})`)
  return items.map((item: any) => ({ ...item, signalType: 'maturity' }))
}

async function queryMaturityPEFirms(offerId: string, campaignId: string): Promise<any[]> {
  const queryName = 'maturity_pe_firms'
  const objective = 'Find all mid-market private equity firms ($100M-$2B AUM) in the United States that have technical leadership or data infrastructure investment'
  const matchConditions = [
    {
      name: 'pe_type',
      description: "Company must be a private equity firm, buyout firm, or growth equity firm. Look for keywords: 'private equity', 'buyout', 'growth equity', 'PE firm'. Exclude venture capital firms, banks, and credit unions."
    },
    {
      name: 'aum_size',
      description: "Company must have Assets Under Management (AUM) between $100M and $2B. Look for AUM in company descriptions, fund announcements, or industry databases. If AUM is not stated but company has 10-100 employees and describes itself as 'mid-market', consider requirement satisfied."
    },
    {
      name: 'technical_leadership',
      description: "Company must have hired for technical roles in the past 2 years. Look for: 'CTO', 'Head of Technology', 'VP Technology', 'Technology Director', 'Data Engineer', 'Platform Engineer', 'Automation Engineer'. Evidence from job postings, LinkedIn, or press releases."
    },
    {
      name: 'data_infrastructure',
      description: "Company must mention using data infrastructure tools or AI. Look for: 'Snowflake', 'Databricks', 'dbt', 'LLM', 'AI', 'machine learning', 'data platform'. Evidence from job descriptions or company pages."
    },
    {
      name: 'us_location',
      description: "Company headquarters must be in the United States."
    }
  ]

  console.log('🔍 Query 2: PE Firms with Technical Leadership...')
  
  const startTime = Date.now()
  const findall = await parallel.findAll(
    'companies',
    objective,
    matchConditions,
    BATCH,
    GENERATOR
  )

  const runId = findall.findall_id || findall.run_id
  console.log(`   ⏳ FindAll run created: ${runId}`)
  console.log(`   ⏳ Waiting for results (typically 15-30 seconds)...`)
  
  const { data: runRecord } = await supabase
    .from('parallel_findall_runs')
    .insert({
      findall_run_id: runId,
      query_name: queryName,
      objective: objective,
      entity_type: 'companies',
      generator: GENERATOR,
      match_limit: BATCH,
      match_conditions: matchConditions,
      request_params: findall,
      status: 'pending',
      offer_id: offerId,
      campaign_id: campaignId,
    } as any)
    .select('id')
    .maybeSingle()

  const result = await waitForFindAllResult(runId)
  const items = result.output?.items || result.candidates || []
  const durationSeconds = Math.floor((Date.now() - startTime) / 1000)
  
  const costPer1000 = GENERATOR === 'base' ? 0.06 : GENERATOR === 'core' ? 0.23 : 1.43
  const estimatedCost = (items.length / 1000) * costPer1000
  
  if (runRecord?.id) {
    await supabase
      .from('parallel_findall_runs')
      .update({
        status: 'completed',
        raw_response: result,
        items_count: items.length,
        estimated_cost_usd: estimatedCost,
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', runRecord.id)
  }
  
  console.log(`   ✅ Found ${items.length} companies (cost: ~$${estimatedCost.toFixed(2)})`)
  return items.map((item: any) => ({ ...item, signalType: 'maturity' }))
}

async function queryPainHedgeFunds(offerId: string, campaignId: string): Promise<any[]> {
  const queryName = 'pain_hedge_funds'
  const objective = 'Find all small-to-mid hedge funds ($10M-$500M AUM) in the United States that are currently hiring for manual research or analysis roles'
  const matchConditions = [
    {
      name: 'hedge_fund_type',
      description: "Company must be a hedge fund, alternative investment fund, or investment management firm. Exclude banks, credit unions, insurance companies."
    },
    {
      name: 'aum_size',
      description: "Company must have AUM between $10M and $500M."
    },
    {
      name: 'active_hiring',
      description: "Company must have posted job openings in the past 6 months for research or analysis roles. Look for job titles: 'Research Analyst', 'Investment Analyst', 'Equity Research', 'Research Associate', 'Investment Research'. Evidence from LinkedIn Jobs, company career pages, or job boards."
    },
    {
      name: 'us_location',
      description: "Company headquarters must be in the United States."
    }
  ]

  console.log('🔍 Query 3: Hedge Funds Hiring Manual Research Roles...')
  
  const startTime = Date.now()
  const findall = await parallel.findAll(
    'companies',
    objective,
    matchConditions,
    BATCH,
    'base' // Use base generator for simpler query (cheaper)
  )

  const runId = findall.findall_id || findall.run_id
  console.log(`   ⏳ FindAll run created: ${runId}`)
  console.log(`   ⏳ Waiting for results (typically 15-30 seconds)...`)
  
  const { data: runRecord } = await supabase
    .from('parallel_findall_runs')
    .insert({
      findall_run_id: runId,
      query_name: queryName,
      objective: objective,
      entity_type: 'companies',
      generator: 'base',
      match_limit: BATCH,
      match_conditions: matchConditions,
      request_params: findall,
      status: 'pending',
      offer_id: offerId,
      campaign_id: campaignId,
    } as any)
    .select('id')
    .maybeSingle()

  const result = await waitForFindAllResult(runId)
  const items = result.output?.items || result.candidates || []
  const durationSeconds = Math.floor((Date.now() - startTime) / 1000)
  
  const estimatedCost = (items.length / 1000) * 0.06 // base generator
  
  if (runRecord?.id) {
    await supabase
      .from('parallel_findall_runs')
      .update({
        status: 'completed',
        raw_response: result,
        items_count: items.length,
        estimated_cost_usd: estimatedCost,
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', runRecord.id)
  }
  
  console.log(`   ✅ Found ${items.length} companies (cost: ~$${estimatedCost.toFixed(2)})`)
  return items.map((item: any) => ({ ...item, signalType: 'pain' }))
}

async function queryPainPEFirms(offerId: string, campaignId: string): Promise<any[]> {
  const queryName = 'pain_pe_firms'
  const objective = 'Find all mid-market private equity firms ($100M-$2B AUM) in the United States that are currently hiring for deal sourcing or business development roles'
  const matchConditions = [
    {
      name: 'pe_type',
      description: "Company must be a private equity firm, buyout firm, or growth equity firm."
    },
    {
      name: 'aum_size',
      description: "Company must have AUM between $100M and $2B."
    },
    {
      name: 'deal_sourcing_hiring',
      description: "Company must have posted job openings in the past 6 months for deal sourcing or business development roles. Look for: 'Deal Sourcing', 'Sourcing Analyst', 'Business Development', 'Deal Origination', 'Investment Sourcing'. Evidence from LinkedIn Jobs or company career pages."
    },
    {
      name: 'us_location',
      description: "Company headquarters must be in the United States."
    }
  ]

  console.log('🔍 Query 4: PE Firms Hiring Deal Sourcing Roles...')
  
  const startTime = Date.now()
  const findall = await parallel.findAll(
    'companies',
    objective,
    matchConditions,
    BATCH,
    'base' // Use base generator for simpler query (cheaper)
  )

  const runId = findall.findall_id || findall.run_id
  console.log(`   ⏳ FindAll run created: ${runId}`)
  console.log(`   ⏳ Waiting for results (typically 15-30 seconds)...`)
  
  const { data: runRecord } = await supabase
    .from('parallel_findall_runs')
    .insert({
      findall_run_id: runId,
      query_name: queryName,
      objective: objective,
      entity_type: 'companies',
      generator: 'base',
      match_limit: BATCH,
      match_conditions: matchConditions,
      request_params: findall,
      status: 'pending',
      offer_id: offerId,
      campaign_id: campaignId,
    } as any)
    .select('id')
    .maybeSingle()

  const result = await waitForFindAllResult(runId)
  const items = result.output?.items || result.candidates || []
  const durationSeconds = Math.floor((Date.now() - startTime) / 1000)
  
  const estimatedCost = (items.length / 1000) * 0.06 // base generator
  
  if (runRecord?.id) {
    await supabase
      .from('parallel_findall_runs')
      .update({
        status: 'completed',
        raw_response: result,
        items_count: items.length,
        estimated_cost_usd: estimatedCost,
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', runRecord.id)
  }
  
  console.log(`   ✅ Found ${items.length} companies (cost: ~$${estimatedCost.toFixed(2)})`)
  return items.map((item: any) => ({ ...item, signalType: 'pain' }))
}

// -------------------------
// Main Function
// -------------------------

async function main() {
  console.log('🏁 Parallel FindAll Finance Company Discovery')
  console.log(`   targetTotal=${TARGET_TOTAL} batch=${BATCH} generator=${GENERATOR} dryRun=${DRY_RUN}`)

  // Load offer
  const { data: offer, error: offerErr } = await supabase
    .from('offers')
    .select('id, slug')
    .eq('slug', 'finance')
    .maybeSingle()

  if (offerErr || !offer?.id) {
    throw new Error(`Finance offer not found in DB (slug=finance). ${offerErr?.message || ''}`)
  }

  const campaign = await ensureLeadgenCampaign(offer.id)

  // Current count
  const { count: currentCompaniesCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', offer.id)

  const current = currentCompaniesCount || 0
  console.log(`📦 Current companies for finance: ${current}`)

  if (current >= TARGET_TOTAL) {
    console.log('✅ Already at or above target. Nothing to do.')
    return
  }

  // Load existing domains for deduplication
  const { data: existingDomainsRows, error: domErr } = await supabase
    .from('companies')
    .select('domain')
    .eq('offer_id', offer.id)
    .not('domain', 'is', null)

  if (domErr) throw new Error(`Failed to load existing domains: ${domErr.message}`)
  const existingDomains = new Set((existingDomainsRows || []).map(r => (r.domain || '').toLowerCase()))

  // Run all FindAll queries
  const allResults: any[] = []
  let totalCost = 0
  
  try {
    const results = await queryMaturityHedgeFunds(offer.id, campaign.id)
    allResults.push(...results)
    const costPer1000 = GENERATOR === 'base' ? 0.06 : GENERATOR === 'core' ? 0.23 : 1.43
    totalCost += (results.length / 1000) * costPer1000
  } catch (error: any) {
    console.error(`❌ Query 1 failed: ${error.message}`)
  }

  try {
    const results = await queryMaturityPEFirms(offer.id, campaign.id)
    allResults.push(...results)
    const costPer1000 = GENERATOR === 'base' ? 0.06 : GENERATOR === 'core' ? 0.23 : 1.43
    totalCost += (results.length / 1000) * costPer1000
  } catch (error: any) {
    console.error(`❌ Query 2 failed: ${error.message}`)
  }

  try {
    const results = await queryPainHedgeFunds(offer.id, campaign.id)
    allResults.push(...results)
    totalCost += (results.length / 1000) * 0.06 // base generator
  } catch (error: any) {
    console.error(`❌ Query 3 failed: ${error.message}`)
  }

  try {
    const results = await queryPainPEFirms(offer.id, campaign.id)
    allResults.push(...results)
    totalCost += (results.length / 1000) * 0.06 // base generator
  } catch (error: any) {
    console.error(`❌ Query 4 failed: ${error.message}`)
  }

  console.log(`\n💰 Total estimated cost: ~$${totalCost.toFixed(2)}`)

  console.log(`\n🧺 Total companies found: ${allResults.length}`)

  // Process and deduplicate
  const toInsert: Array<{
    name: string
    domain: string
    vertical: string | null
    signals: any
    source_tool: string
  }> = []

  for (const item of allResults) {
    const c = extractCompanyFromFindAll(item, item.signalType)
    if (!c.domain) continue
    
    const d = c.domain.toLowerCase()
    if (existingDomains.has(d)) continue

    const companyText = [c.name, c.description, c.location].filter(Boolean).join(' | ')
    if (!looksLikeFinanceFirm(companyText)) continue

    const segment = guessSegment(companyText)
    const maturity = guessMaturity({ parallel: { signal_type: c.signalType, evidence: c.evidence } })

    toInsert.push({
      name: c.name,
      domain: d,
      vertical: segment,
      source_tool: 'parallel_findall',
      signals: {
        segment_guess: segment,
        maturity_tier: maturity,
        maturity_method: 'parallel_findall+heuristic',
        parallel: {
          signal_type: item.signalType,
          evidence: c.evidence,
          confidence: c.confidence,
          linkedin_url: c.linkedinUrl,
          employee_count: c.employeeCount,
          location: c.location,
        },
      },
    })

    existingDomains.add(d)
  }

  console.log(`✅ Processed ${toInsert.length} new companies (${allResults.length - toInsert.length} duplicates/filtered)`)

  if (toInsert.length === 0) {
    console.log('ℹ️ No new companies to insert.')
    return
  }

  // Save to JSON file (even in dry-run)
  const outputFile = path.join(process.cwd(), `parallel-findall-companies-${Date.now()}.json`)
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
    return
  }

  // Upsert companies
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

  // Link to campaign
  const campaignCompanies = (insertedCompanies || []).map((co: any) => ({
    campaign_id: campaign.id,
    company_id: co.id,
    status: 'queued',
    source_tool: 'parallel_findall',
    added_reason: 'finance-leadgen-1000: maturity/pain signals via Parallel FindAll',
    source_query: `generator=${GENERATOR}`,
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
  console.error('❌ Parallel FindAll discovery failed:', err)
  process.exit(1)
})
