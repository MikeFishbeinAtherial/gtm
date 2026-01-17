/**
 * Enrich Finance companies with:
 * - Company type classification (cheap heuristics)
 * - Decision-maker contacts (Exa)
 * - Emails (FullEnrich) [optional]
 *
 * Writes results into canonical tables:
 * - companies (updates signals/vertical/description where possible)
 * - contacts (deduped by per-offer unique indexes)
 * - campaign_contacts (membership)
 *
 * Usage (Mac terminal):
 *   npx ts-node scripts/enrich-finance-companies.ts
 *
 * Optional args:
 *   --limit 25                    Number of companies to process
 *   --max-per-company 2           Max contacts to find per company
 *   --only-fit true               Only process "fit" companies (investment firms, etc.)
 *   --skip-email true             Skip email enrichment
 *   --skip-classify true          Skip company classification
 *   --dry-run true                Don't write to database
 *   --enrich-existing true        Enrich emails for existing contacts without emails (bulk, up to 100)
 *
 * Note: FullEnrich is asynchronous. This script uses polling to wait for results.
 * For production, set up webhooks (see FullEnrich docs).
 * 
 * Bulk enrichment: Use --enrich-existing to enrich up to 100 contacts at once.
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  exaSearchPeople,
  exaSearchAndContents,
  type ExaPerson,
} from '../src/lib/clients/exa.ts'
import { FullenrichClient } from '../src/lib/clients/fullenrich.ts'

dotenv.config({ path: '.env.local' })
dotenv.config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE service key.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// -------------------------
// Args
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

const LIMIT = Number(getArg('limit', '25'))
const MAX_PER_COMPANY = Number(getArg('max-per-company', '2'))
const ONLY_FIT = getBoolArg('only-fit', true)
const SKIP_EMAIL = getBoolArg('skip-email', false)
const SKIP_CLASSIFY = getBoolArg('skip-classify', false)
const DRY_RUN = getBoolArg('dry-run', false)
const ENRICH_EXISTING = getBoolArg('enrich-existing', false) // Enrich emails for existing contacts without emails

// -------------------------
// Finance title set (small + stable)
// -------------------------
const FINANCE_TITLES = [
  'Chief Investment Officer',
  'CIO',
  'Head of Research',
  'Portfolio Manager',
  'Managing Partner',
  'Partner',
  'Managing Director',
  'Principal',
]

// -------------------------
// Cheap company type classifier (no API credits)
// -------------------------
type CompanyType =
  | 'credit_union'
  | 'bank'
  | 'insurance'
  | 'mortgage'
  | 'investment_firm'
  | 'broker_dealer'
  | 'fintech'
  | 'unknown'

function classifyCompanyName(name: string, domain: string | null): { type: CompanyType; confidence: 'high' | 'medium' | 'low' } {
  const n = (name || '').toLowerCase()
  const d = (domain || '').toLowerCase()

  if (n.includes('credit union') || d.includes('fcu') || d.endsWith('.creditunion')) return { type: 'credit_union', confidence: 'high' }
  if (n.includes('bank') || d.endsWith('.bank')) return { type: 'bank', confidence: 'high' }
  if (n.includes('insurance') || n.includes('underwriting')) return { type: 'insurance', confidence: 'high' }
  if (n.includes('mortgage')) return { type: 'mortgage', confidence: 'high' }
  if (n.includes('securities') || n.includes('broker')) return { type: 'broker_dealer', confidence: 'medium' }
  if (n.includes('capital') || n.includes('partners') || n.includes('asset management') || n.includes('investment management') || n.includes('advisors')) {
    return { type: 'investment_firm', confidence: 'medium' }
  }
  if (n.includes('fintech') || n.includes('payments') || n.includes('pay')) return { type: 'fintech', confidence: 'low' }
  return { type: 'unknown', confidence: 'low' }
}

function isFitForFinanceOffer(type: CompanyType): boolean {
  // For now: prioritize investment-style firms + broker-dealers + fintech over retail banks/credit unions.
  return ['investment_firm', 'broker_dealer', 'fintech'].includes(type)
}

// -------------------------
// Exa contact finding
// -------------------------
function buildExaPeopleQuery(companyName: string, domain: string): string {
  const titleExpr = `(${FINANCE_TITLES.map(t => (t === 'CIO' ? 'CIO' : `"${t}"`)).join(' OR ')})`
  const companyExpr = `("${companyName}" OR "${domain}")`
  return `${titleExpr} ${companyExpr} site:linkedin.com/in`
}

function pickBestPeople(results: ExaPerson[], max: number): ExaPerson[] {
  // Exa already returns a score; we add a tiny filter to prefer results with LinkedIn URLs and a parsed title.
  const filtered = results
    .filter(r => !!r.linkedin_url && r.url.includes('linkedin.com'))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  return filtered.slice(0, max)
}

function splitName(fullName: string): { first_name: string | null; last_name: string | null; full_name: string | null } {
  const cleaned = (fullName || '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return { first_name: null, last_name: null, full_name: null }
  const parts = cleaned.split(' ')
  if (parts.length === 1) return { first_name: parts[0], last_name: null, full_name: cleaned }
  return { first_name: parts[0], last_name: parts.slice(1).join(' '), full_name: cleaned }
}

// -------------------------
// Main
// -------------------------
async function main() {
  console.log('🏁 Finance company enrichment starting...')
  console.log(`   limit=${LIMIT} maxPerCompany=${MAX_PER_COMPANY} onlyFit=${ONLY_FIT} skipEmail=${SKIP_EMAIL} skipClassify=${SKIP_CLASSIFY} dryRun=${DRY_RUN} enrichExisting=${ENRICH_EXISTING}`)

  // Load offer + campaign
  const { data: offer, error: offerErr } = await supabase
    .from('offers')
    .select('id, slug')
    .eq('slug', 'finance')
    .maybeSingle()

  if (offerErr || !offer?.id) throw new Error(`Finance offer not found in DB (slug=finance). ${offerErr?.message || ''}`)

  const { data: campaign, error: campErr } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('offer_id', offer.id)
    .eq('name', 'finance-fi-company-enrichment')
    .maybeSingle()

  if (campErr || !campaign?.id) throw new Error(`Campaign not found (finance-fi-company-enrichment). ${campErr?.message || ''}`)

  // Find companies missing contacts (canonical)
  const { data: companies, error: companiesErr } = await supabase
    .from('companies')
    .select('id, name, domain, signals, vertical, description')
    .eq('offer_id', offer.id)
    .not('domain', 'is', null)

  if (companiesErr) throw new Error(`Failed to fetch companies: ${companiesErr.message}`)
  if (!companies || companies.length === 0) throw new Error('No companies found for finance offer')

  // Determine which ones already have contacts
  const { data: contactCounts, error: ccErr } = await supabase
    .from('contacts')
    .select('company_id')
    .eq('offer_id', offer.id)

  if (ccErr) throw new Error(`Failed to fetch contacts: ${ccErr.message}`)
  const hasContact = new Set((contactCounts || []).map(r => r.company_id))

  const missing = companies.filter(c => !hasContact.has(c.id))
  console.log(`🏢 Companies total=${companies.length} missingContacts=${missing.length}`)

  // Optional: cheap classification on all missing companies
  const missingSorted = [...missing].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  const targets = []
  for (const c of missingSorted) {
    const { type, confidence } = classifyCompanyName(c.name, c.domain)
    const fit = isFitForFinanceOffer(type)
    if (!ONLY_FIT || fit) {
      targets.push({ ...c, company_type: type, company_type_confidence: confidence, fit })
    }
  }

  console.log(`🎯 Target companies after filters=${targets.length}`)
  const batch = targets.slice(0, LIMIT)
  console.log(`📦 Processing batch size=${batch.length}`)

  const fullenrich = new FullenrichClient()
  const canEmailEnrich = !!process.env.FULLENRICH_API_KEY && !SKIP_EMAIL
  const canExa = !!process.env.EXA_API_KEY

  if (!canExa) {
    throw new Error('EXA_API_KEY is missing. Set it in offer-testing/.env.local before running.')
  }

  let contactsCreated = 0
  let emailsFound = 0
  let companiesClassified = 0

  for (const company of batch) {
    const domain = (company.domain || '').trim()
    if (!domain) continue

    // 1) Save cheap classification to company.signals/vertical
    if (!SKIP_CLASSIFY) {
      const nextSignals = {
        ...(company.signals || {}),
        company_type: company.company_type,
        company_type_confidence: company.company_type_confidence,
        company_type_method: 'heuristic',
        finance_fit: company.fit,
      }

      if (!DRY_RUN) {
        await supabase
          .from('companies')
          .update({
            vertical: company.company_type, // coarse bucket (good enough for now)
            signals: nextSignals,
            updated_at: new Date().toISOString(),
          })
          .eq('id', company.id)
      }

      companiesClassified++
    }

    // 2) Find people with Exa
    const query = buildExaPeopleQuery(company.name, domain)
    const people = await exaSearchPeople({
      query,
      num_results: Math.max(5, MAX_PER_COMPANY * 3),
      include_domains: ['linkedin.com'],
    })

    const best = pickBestPeople(people.results, MAX_PER_COMPANY)
    if (best.length === 0) {
      console.log(`⚠️  No people found via Exa for ${company.name} (${domain})`)
      continue
    }

    for (const person of best) {
      const { first_name, last_name, full_name } = splitName(person.name)
      const title = person.title || null
      const linkedin_url = person.linkedin_url || person.url || null

      // 3) Optional email enrichment (FullEnrich - async with polling)
      let email: string | null = null
      let email_status: string | null = null
      let fullenrich_raw: any = null

      if (canEmailEnrich && first_name && last_name) {
        try {
          // Submit enrichment request
          const enrichment = await fullenrich.enrichContact({
            firstname: first_name,
            lastname: last_name,
            domain: domain,
            company_name: company.name,
            linkedin_url: linkedin_url || undefined,
            enrich_fields: ['contact.emails'], // Work email (1 credit)
            custom: {
              contact_name: full_name,
              company_id: company.id,
            },
          })

          // Wait for results (FullEnrich is async, typically 30-90 seconds)
          console.log(`   ⏳ Waiting for FullEnrich results (enrichment_id: ${enrichment.enrichment_id})...`)
          const statusResponse = await fullenrich.waitForCompletion(
            enrichment.enrichment_id,
            120, // max 2 minutes wait
            10   // check every 10 seconds (API recommends 5-10 min intervals, but we'll check more frequently for script)
          )

          fullenrich_raw = {
            enrichment_id: enrichment.enrichment_id,
            status: statusResponse,
          }

          if (statusResponse && statusResponse.status === 'FINISHED') {
            const bestEmail = fullenrich.getBestEmail(statusResponse)
            if (bestEmail) {
              email = bestEmail
              // Check email status from the contact data
              const contactData = statusResponse.datas?.[0]?.contact
              if (contactData?.most_probable_email_status === 'HIGH_PROBABILITY' || 
                  contactData?.emails?.some(e => e.email === bestEmail && e.status === 'DELIVERABLE')) {
                email_status = 'valid'
              } else {
                email_status = 'unknown'
              }
            }
          }
        } catch (e: any) {
          // Don’t fail the whole run if one enrichment fails.
          fullenrich_raw = { error: e?.message || String(e) }
          console.log(`   ⚠️  FullEnrich failed for ${full_name}: ${e?.message || String(e)}`)
        }
      }

      // 4) Insert contact (dedupe indexes will prevent duplicates)
      const contactPayload = {
        offer_id: offer.id,
        company_id: company.id,
        first_name,
        last_name,
        full_name,
        title,
        email,
        email_status,
        linkedin_url,
        source_tool: 'exa',
        source_raw: {
          exa: { query, result: person },
          fullenrich: fullenrich_raw,
          company_type: company.company_type,
        },
        status: email ? 'ready' : 'enriched',
      }

      let contactId: string | null = null

      if (!DRY_RUN) {
        const { data: inserted, error: insErr } = await supabase
          .from('contacts')
          .insert(contactPayload as any)
          .select('id')
          .maybeSingle()

        if (insErr) {
          // likely unique violation: fetch existing by linkedin_url or email
          const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('offer_id', offer.id)
            .or(
              [
                linkedin_url ? `linkedin_url.eq.${linkedin_url}` : null,
                email ? `email.ilike.${email}` : null,
              ].filter(Boolean).join(',')
            )
            .limit(1)
            .maybeSingle()

          contactId = existing?.id || null
        } else {
          contactId = inserted?.id || null
          contactsCreated++
          if (email) emailsFound++
        }

        // 5) Add to campaign_contacts (membership)
        if (contactId) {
          await supabase
            .from('campaign_contacts')
            .upsert(
              {
                campaign_id: campaign.id,
                contact_id: contactId,
                status: 'queued',
              } as any,
              { onConflict: 'campaign_id,contact_id' }
            )
        }
      }
    }

    console.log(`✅ Processed ${company.name} (${domain}) — found ${best.length} contact(s)`)
  }

  // ===========================================
  // Enrich existing contacts without emails (bulk)
  // ===========================================
  if (ENRICH_EXISTING && canEmailEnrich) {
    console.log('\n📧 Enriching emails for existing contacts without emails...')
    
    // Find contacts without emails
    const { data: contactsWithoutEmail, error: cweErr } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, full_name, company_id, linkedin_url')
      .eq('offer_id', offer.id)
      .or('email.is.null,email.eq.')
      .limit(100) // FullEnrich bulk limit is 100

    if (cweErr) {
      console.error(`⚠️  Failed to fetch contacts without emails: ${cweErr.message}`)
    } else if (contactsWithoutEmail && contactsWithoutEmail.length > 0) {
      console.log(`   Found ${contactsWithoutEmail.length} contacts without emails`)

      // Get company domains for these contacts
      const companyIds = [...new Set(contactsWithoutEmail.map(c => c.company_id))]
      const { data: contactCompanies } = await supabase
        .from('companies')
        .select('id, name, domain')
        .in('id', companyIds)

      const companyMap = new Map((contactCompanies || []).map(c => [c.id, c]))

      // Prepare bulk enrichment request
      const contactsToEnrich = contactsWithoutEmail
        .filter(c => {
          const company = companyMap.get(c.company_id)
          if (!c.first_name || !c.last_name || !company?.domain) return false
          
          // Filter out invalid LinkedIn URLs (must be valid LinkedIn profile URLs)
          if (c.linkedin_url) {
            const linkedinUrl = c.linkedin_url.trim()
            // Valid LinkedIn URLs: https://linkedin.com/in/... or https://www.linkedin.com/in/...
            if (!linkedinUrl.match(/^https?:\/\/(www\.)?linkedin\.com\/in\/[^\/\s]+$/i)) {
              return false // Skip contacts with invalid LinkedIn URLs
            }
          }
          return true
        })
        .slice(0, 100) // FullEnrich limit

      if (contactsToEnrich.length > 0) {
        console.log(`   Preparing bulk enrichment for ${contactsToEnrich.length} contacts...`)

        const bulkRequest = {
          name: `Finance contacts email enrichment - ${new Date().toISOString()}`,
          datas: contactsToEnrich.map(c => {
            const company = companyMap.get(c.company_id)!
            // Clean LinkedIn URL - only include if valid
            let linkedinUrl: string | undefined = undefined
            if (c.linkedin_url) {
              const cleaned = c.linkedin_url.trim()
              if (cleaned.match(/^https?:\/\/(www\.)?linkedin\.com\/in\/[^\/\s]+$/i)) {
                linkedinUrl = cleaned
              }
            }
            
            return {
              firstname: c.first_name!,
              lastname: c.last_name!,
              domain: company.domain!,
              company_name: company.name,
              linkedin_url: linkedinUrl,
              enrich_fields: ['contact.emails'],
              custom: {
                contact_id: c.id,
                full_name: c.full_name,
              },
            }
          }),
        }

        try {
          const enrichment = await fullenrich.enrichBulk(bulkRequest)
          console.log(`   ✅ Submitted bulk enrichment (enrichment_id: ${enrichment.enrichment_id})`)
          console.log(`   ⏳ Waiting for results (this may take 30-90 seconds)...`)

          const statusResponse = await fullenrich.waitForCompletion(
            enrichment.enrichment_id,
            300, // max 5 minutes wait
            15   // check every 15 seconds
          )

          if (statusResponse && statusResponse.status === 'FINISHED' && statusResponse.datas) {
            console.log(`   ✅ Enrichment completed! Processing results...`)

            // Map results back to contacts
            const contactIdMap = new Map(contactsToEnrich.map((c, idx) => [idx, c.id]))
            let updatedCount = 0

            for (let i = 0; i < statusResponse.datas.length; i++) {
              const contactData = statusResponse.datas[i]
              const contactId = contactIdMap.get(i)

              if (!contactId || !contactData.contact) continue

              const bestEmail = contactData.contact.most_probable_email || 
                               contactData.contact.emails?.[0]?.email

              if (bestEmail) {
                const emailStatus = contactData.contact.most_probable_email_status === 'HIGH_PROBABILITY' ||
                                  contactData.contact.emails?.some(e => e.status === 'DELIVERABLE' && e.email === bestEmail)
                  ? 'valid'
                  : 'unknown'

                // Update contact with email
                const { error: updateErr } = await supabase
                  .from('contacts')
                  .update({
                    email: bestEmail,
                    email_status: emailStatus,
                    source_raw: {
                      fullenrich_bulk: {
                        enrichment_id: enrichment.enrichment_id,
                        result: contactData,
                      },
                    },
                    status: 'ready',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', contactId)

                if (!updateErr) {
                  updatedCount++
                  emailsFound++
                } else {
                  console.log(`   ⚠️  Failed to update contact ${contactId}: ${updateErr.message}`)
                }
              }
            }

            console.log(`   ✅ Updated ${updatedCount} contacts with emails`)
          } else {
            console.log(`   ⚠️  Enrichment status: ${statusResponse?.status || 'unknown'}`)
          }
        } catch (e: any) {
          console.error(`   ❌ Bulk enrichment failed: ${e?.message || String(e)}`)
        }
      } else {
        console.log(`   ℹ️  No contacts ready for enrichment (need first_name, last_name, and company domain)`)
      }
    } else {
      console.log(`   ℹ️  No contacts found without emails`)
    }
  }

  console.log('\n🎉 Done')
  console.log(`   companiesClassified=${companiesClassified}`)
  console.log(`   contactsCreated=${contactsCreated}`)
  console.log(`   emailsFound=${emailsFound}`)
  console.log(`   NOTE: run again with a higher --limit to process more`)
}

main().catch(err => {
  console.error('❌ Enrichment failed:', err)
  process.exit(1)
})

