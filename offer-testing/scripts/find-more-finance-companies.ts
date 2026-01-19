/**
 * Find more finance companies to reach 1000 total.
 * Uses simpler, broader queries to get more matches.
 * 
 * Budget: $25 remaining
 * Strategy: Use Core generator with broader match conditions
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'
import { ParallelClient } from '../src/lib/clients/parallel.ts'
import * as fs from 'fs'
import * as path from 'path'

const parallel = new ParallelClient(process.env.PARALLEL_API_KEY)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function getArg(name: string, defaultValue?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return defaultValue
  return process.argv[idx + 1] ?? defaultValue
}

const MATCH_LIMIT = Number(getArg('limit', '100')) // Get more companies per query
const GENERATOR = (getArg('generator', 'core') as 'base' | 'core' | 'pro') || 'core'

// Helper to poll for results
async function waitForFindAllResult(runId: string, maxWaitMinutes: number = 15): Promise<any> {
  const startTime = Date.now()
  const maxWaitMs = maxWaitMinutes * 60 * 1000
  const pollInterval = 10000 // Check every 10 seconds

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(`https://api.parallel.ai/v1beta/findall/runs/${runId}/result`, {
        headers: {
          'x-api-key': process.env.PARALLEL_API_KEY!,
          'parallel-beta': 'findall-2025-09-15'
        }
      })

      if (response.status === 404) {
        await new Promise(r => setTimeout(r, pollInterval))
        continue
      }

      const result = await response.json()
      const status = result.run?.status?.status || result.status
      const metrics = result.run?.status?.metrics

      if (status === 'completed') {
        return result
      }

      if (status === 'failed') {
        throw new Error(`FindAll run failed: ${result.run?.status?.termination_reason || 'unknown'}`)
      }

      // Show progress
      if (metrics) {
        process.stdout.write(`\r   ⏳ Status: ${status} (generated: ${metrics.generated_candidates_count || 0}, matched: ${metrics.matched_candidates_count || 0})`)
      }

      await new Promise(r => setTimeout(r, pollInterval))
    } catch (error: any) {
      if (error.message?.includes('not ready') || error.message?.includes('not found')) {
        await new Promise(r => setTimeout(r, pollInterval))
        continue
      }
      throw error
    }
  }

  throw new Error(`FindAll run timed out after ${maxWaitMinutes} minutes`)
}

function normalizeDomain(url?: string | null): string | null {
  if (!url) return null
  const d = url.trim().toLowerCase()
  if (!d) return null
  return d
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim() || null
}

function looksLikeFinanceFirm(companyText: string): boolean {
  const t = companyText.toLowerCase()
  
  // Exclude these
  if (t.includes('credit union') || t.includes('bank') || t.includes('insurance') || t.includes('mortgage')) {
    return false
  }
  
  const financeKeywords = [
    'hedge fund', 'private equity', 'asset management', 'investment management',
    'alternative investment', 'credit fund', 'buyout', 'growth equity'
  ]
  
  if (financeKeywords.some(k => t.includes(k))) return true
  
  if ((t.includes('capital') || t.includes('partners') || t.includes('management')) && !t.includes('bank')) {
    return true
  }
  
  return false
}

type FinanceSegment = 'hedge_fund' | 'private_equity' | 'asset_manager' | 'other'

function guessSegment(companyText: string): FinanceSegment {
  const t = companyText.toLowerCase()
  if (t.includes('hedge fund')) return 'hedge_fund'
  if (t.includes('private equity') || t.includes('buyout') || t.includes('growth equity')) return 'private_equity'
  if (t.includes('asset management') || t.includes('investment management')) return 'asset_manager'
  return 'other'
}

// ============================================
// QUERY 1: Hedge Funds - Broader Search
// ============================================

async function query1_HedgeFunds_Broad(offerId: string, campaignId: string) {
  const queryName = 'hedge_funds_broad'
  const objective = 'Find all hedge funds and alternative investment firms on the East Coast of the United States (ideally New York or Pennsylvania)'
  
  const matchConditions = [
    {
      name: 'hedge_fund_type',
      description: "Company must be a hedge fund, alternative investment fund, or investment management firm. Look for keywords: 'hedge fund', 'alternative investment', 'investment management'. Exclude banks, credit unions, insurance companies, venture capital firms, and private equity firms."
    },
    {
      name: 'east_coast_location',
      description: "Company headquarters must be on the East Coast of the United States. Prioritize companies in New York or Pennsylvania, but also include other East Coast states: New York, Pennsylvania, New Jersey, Massachusetts, Connecticut, Maryland, Virginia, North Carolina, South Carolina, Georgia, Florida."
    }
  ]

  console.log('\n🔍 Query 1: Hedge Funds (Broad Search)')
  console.log(`   Objective: ${objective}`)
  console.log(`   Generator: ${GENERATOR}, Limit: ${MATCH_LIMIT}`)
  
  const findall = await parallel.findAll(
    'companies',
    objective,
    matchConditions,
    MATCH_LIMIT,
    GENERATOR
  )

  const runId = findall.findall_id || findall.run_id
  console.log(`   ⏳ Run ID: ${runId}`)
  
  // Save run ID immediately
  const runIdFile = path.join(process.cwd(), `parallel-more-run-ids-${runId}.json`)
  fs.writeFileSync(runIdFile, JSON.stringify({
    run_id: runId,
    query_name: queryName,
    objective,
    match_conditions: matchConditions,
    generator: GENERATOR,
    match_limit: MATCH_LIMIT,
  }, null, 2))
  console.log(`   💾 Run ID saved: ${runIdFile}`)

  const result = await waitForFindAllResult(runId)
  const candidates = result.candidates || []
  const matched = candidates.filter((c: any) => c.match_status === 'matched')
  
  console.log(`\n   ✅ Found ${matched.length} matched companies (${candidates.length} total candidates)`)
  
  // Save results immediately
  const resultsFile = path.join(process.cwd(), `parallel-more-results-${runId}.json`)
  fs.writeFileSync(resultsFile, JSON.stringify({
    run_id: runId,
    query_name: queryName,
    result,
    matched_count: matched.length,
    total_candidates: candidates.length,
  }, null, 2))
  console.log(`   💾 Results saved: ${resultsFile}`)

  return matched
}

// ============================================
// QUERY 2: PE Firms - Broader Search
// ============================================

async function query2_PEFirms_Broad(offerId: string, campaignId: string) {
  const queryName = 'pe_firms_broad'
  const objective = 'Find all private equity firms and buyout firms on the East Coast of the United States (ideally New York or Pennsylvania)'
  
  const matchConditions = [
    {
      name: 'pe_firm_type',
      description: "Company must be a private equity firm, buyout firm, or growth equity firm. Look for keywords: 'private equity', 'buyout', 'growth equity', 'PE firm'. Exclude venture capital firms, hedge funds, banks, and credit unions."
    },
    {
      name: 'east_coast_location',
      description: "Company headquarters must be on the East Coast of the United States. Prioritize companies in New York or Pennsylvania, but also include other East Coast states: New York, Pennsylvania, New Jersey, Massachusetts, Connecticut, Maryland, Virginia, North Carolina, South Carolina, Georgia, Florida."
    }
  ]

  console.log('\n🔍 Query 2: PE Firms (Broad Search)')
  console.log(`   Objective: ${objective}`)
  console.log(`   Generator: ${GENERATOR}, Limit: ${MATCH_LIMIT}`)
  
  const findall = await parallel.findAll(
    'companies',
    objective,
    matchConditions,
    MATCH_LIMIT,
    GENERATOR
  )

  const runId = findall.findall_id || findall.run_id
  console.log(`   ⏳ Run ID: ${runId}`)
  
  const runIdFile = path.join(process.cwd(), `parallel-more-run-ids-${runId}.json`)
  fs.writeFileSync(runIdFile, JSON.stringify({
    run_id: runId,
    query_name: queryName,
    objective,
    match_conditions: matchConditions,
  }, null, 2))
  console.log(`   💾 Run ID saved: ${runIdFile}`)

  const result = await waitForFindAllResult(runId)
  const candidates = result.candidates || []
  const matched = candidates.filter((c: any) => c.match_status === 'matched')
  
  console.log(`\n   ✅ Found ${matched.length} matched companies (${candidates.length} total candidates)`)
  
  const resultsFile = path.join(process.cwd(), `parallel-more-results-${runId}.json`)
  fs.writeFileSync(resultsFile, JSON.stringify({
    run_id: runId,
    query_name: queryName,
    result,
    matched_count: matched.length,
  }, null, 2))
  console.log(`   💾 Results saved: ${resultsFile}`)

  return matched
}

// ============================================
// QUERY 3: Finance Firms with Job Postings
// ============================================

async function query3_FinanceFirms_WithJobPostings(offerId: string, campaignId: string) {
  const queryName = 'finance_firms_with_job_postings'
  const objective = 'Find all hedge funds and private equity firms on the East Coast of the United States (ideally New York or Pennsylvania) that have active job postings'
  
  const matchConditions = [
    {
      name: 'finance_firm_type',
      description: "Company must be a hedge fund, private equity firm, alternative investment fund, or investment management firm. Exclude banks, credit unions, insurance companies, and venture capital firms."
    },
    {
      name: 'has_job_postings',
      description: "Company must have active job postings listed publicly. Look for: LinkedIn job postings, company career page with open positions, job board listings from past 180 days."
    },
    {
      name: 'east_coast_location',
      description: "Company headquarters must be on the East Coast of the United States. Prioritize companies in New York or Pennsylvania, but also include other East Coast states: New York, Pennsylvania, New Jersey, Massachusetts, Connecticut, Maryland, Virginia, North Carolina, South Carolina, Georgia, Florida."
    }
  ]

  console.log('\n🔍 Query 3: Finance Firms with Job Postings')
  console.log(`   Objective: ${objective}`)
  console.log(`   Generator: ${GENERATOR}, Limit: ${MATCH_LIMIT}`)
  
  const findall = await parallel.findAll(
    'companies',
    objective,
    matchConditions,
    MATCH_LIMIT,
    GENERATOR
  )

  const runId = findall.findall_id || findall.run_id
  console.log(`   ⏳ Run ID: ${runId}`)
  
  const runIdFile = path.join(process.cwd(), `parallel-more-run-ids-${runId}.json`)
  fs.writeFileSync(runIdFile, JSON.stringify({
    run_id: runId,
    query_name: queryName,
    objective,
    match_conditions: matchConditions,
  }, null, 2))
  console.log(`   💾 Run ID saved: ${runIdFile}`)

  const result = await waitForFindAllResult(runId)
  const candidates = result.candidates || []
  const matched = candidates.filter((c: any) => c.match_status === 'matched')
  
  console.log(`\n   ✅ Found ${matched.length} matched companies (${candidates.length} total candidates)`)
  
  const resultsFile = path.join(process.cwd(), `parallel-more-results-${runId}.json`)
  fs.writeFileSync(resultsFile, JSON.stringify({
    run_id: runId,
    query_name: queryName,
    result,
    matched_count: matched.length,
  }, null, 2))
  console.log(`   💾 Results saved: ${resultsFile}`)

  return matched
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🏁 Find More Finance Companies - Reach 1000 Total')
  console.log(`   Generator: ${GENERATOR}`)
  console.log(`   Match Limit: ${MATCH_LIMIT} per query`)
  console.log(`\n💰 Budget: $25 remaining`)
  console.log(`   Core: $2 + $0.15/match per query\n`)

  // Load offer
  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('slug', 'finance')
    .maybeSingle()

  if (!offer) {
    throw new Error('Finance offer not found')
  }

  // Get or create campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('offer_id', offer.id)
    .eq('name', 'finance-leadgen-1000')
    .maybeSingle()

  if (!campaign) {
    const { data: newCampaign } = await supabase
      .from('campaigns')
      .insert({
        offer_id: offer.id,
        name: 'finance-leadgen-1000',
        status: 'draft',
        campaign_type: 'cold_outreach',
        channel: 'linkedin',
      } as any)
      .select('id')
      .maybeSingle()
    
    if (!newCampaign) throw new Error('Failed to create campaign')
  }

  const campaignId = campaign?.id || (await supabase.from('campaigns').select('id').eq('offer_id', offer.id).eq('name', 'finance-leadgen-1000').maybeSingle()).data?.id

  if (!campaignId) throw new Error('Campaign not found')

  // Load existing domains
  const { data: existingDomainsRows } = await supabase
    .from('companies')
    .select('domain')
    .eq('offer_id', offer.id)
    .not('domain', 'is', null)

  const existingDomains = new Set((existingDomainsRows || []).map(r => (r.domain || '').toLowerCase()))

  // Run queries
  const allResults: any[] = []
  let totalCost = 0

  try {
    const results = await query1_HedgeFunds_Broad(offer.id, campaignId)
    allResults.push(...results)
    const matches = results.length
    const cost = GENERATOR === 'core' ? 2 + (matches * 0.15) : GENERATOR === 'pro' ? 10 + (matches * 1) : 0
    totalCost += cost
    console.log(`   💰 Cost: $${cost.toFixed(2)} (${matches} matches)`)
  } catch (error: any) {
    console.error(`❌ Query 1 failed: ${error.message}`)
  }

  try {
    const results = await query2_PEFirms_Broad(offer.id, campaignId)
    allResults.push(...results)
    const matches = results.length
    const cost = GENERATOR === 'core' ? 2 + (matches * 0.15) : GENERATOR === 'pro' ? 10 + (matches * 1) : 0
    totalCost += cost
    console.log(`   💰 Cost: $${cost.toFixed(2)} (${matches} matches)`)
  } catch (error: any) {
    console.error(`❌ Query 2 failed: ${error.message}`)
  }

  try {
    const results = await query3_FinanceFirms_WithJobPostings(offer.id, campaignId)
    allResults.push(...results)
    const matches = results.length
    const cost = GENERATOR === 'core' ? 2 + (matches * 0.15) : GENERATOR === 'pro' ? 10 + (matches * 1) : 0
    totalCost += cost
    console.log(`   💰 Cost: $${cost.toFixed(2)} (${matches} matches)`)
  } catch (error: any) {
    console.error(`❌ Query 3 failed: ${error.message}`)
  }

  console.log(`\n💰 Total Estimated Cost: $${totalCost.toFixed(2)}`)
  console.log(`📊 Total Companies Found: ${allResults.length}`)

  // Process and save companies
  console.log('\n💾 Processing and saving companies...')
  
  // Extract company data
  const companies = allResults
    .map((c: any) => {
      const domain = normalizeDomain(c.url)
      return {
        name: c.name || 'Unknown',
        domain: domain?.toLowerCase() || null,
        url: c.url || null,
        description: c.description || null,
        match_status: c.match_status,
        output: c.output || {},
        basis: c.basis || [],
        raw_data: c,
      }
    })
    .filter(c => {
      if (!c.domain || c.domain === 'linkedin.com' || c.domain === 'unavailable') return false
      if (existingDomains.has(c.domain)) return false
      
      const companyText = [c.name, c.description].filter(Boolean).join(' | ')
      return looksLikeFinanceFirm(companyText)
    })

  console.log(`✅ Processed ${companies.length} companies (filtered out ${allResults.length - companies.length} invalid/duplicates)`)

  // Save to JSON
  const outputFile = path.join(process.cwd(), `parallel-more-companies-${Date.now()}.json`)
  fs.writeFileSync(outputFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    total_found: companies.length,
    total_candidates: allResults.length,
    queries_run: 3,
    generator: GENERATOR,
    estimated_cost: totalCost,
    companies,
  }, null, 2))
  console.log(`💾 Saved to: ${outputFile}`)

  // Save to Supabase
  const companyRows = companies.map(c => {
    const companyText = [c.name, c.description].filter(Boolean).join(' | ')
    const segment = guessSegment(companyText)
    
    return {
      offer_id: offer.id,
      name: c.name,
      domain: c.domain,
      url: c.url,
      description: c.description,
      vertical: segment,
      source_tool: 'parallel_findall',
      source_raw: {
        lead_source: 'parallel_findall',
        parallel_findall: c.raw_data,
        match_status: c.match_status,
        output: c.output,
        basis: c.basis,
      },
      signals: {
        segment_guess: segment,
        maturity_tier: 'unknown',
        maturity_method: 'parallel_findall',
        parallel: {
          signal_type: 'maturity',
          match_status: c.match_status,
          output: c.output,
          basis: c.basis,
        },
      },
      status: 'new',
    }
  })

  const { data: insertedCompanies, error: upErr } = await supabase
    .from('companies')
    .upsert(companyRows as any, { onConflict: 'offer_id,domain' })
    .select('id, domain, name')

  if (upErr) {
    throw new Error(`Failed to upsert companies: ${upErr.message}`)
  }

  // Link to campaign
  const campaignCompanies = (insertedCompanies || []).map((co: any) => ({
    campaign_id: campaignId,
    company_id: co.id,
    status: 'queued',
    source_tool: 'parallel_findall',
    added_reason: 'Broader Parallel FindAll queries - East Coast focus (NY/PA preferred)',
    source_query: 'parallel_findall_more',
    source_raw: {
      lead_source: 'parallel_findall',
      signals: (companies.find(x => x.domain === (co.domain || '').toLowerCase())?.raw_data) || null,
    },
  }))

  const { error: ccErr } = await supabase
    .from('campaign_companies')
    .upsert(campaignCompanies as any, { onConflict: 'campaign_id,company_id' })

  if (ccErr) {
    throw new Error(`Failed to upsert campaign_companies: ${ccErr.message}`)
  }

  // Final count
  const { count: afterCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', offer.id)

  const { count: campaignCount } = await supabase
    .from('campaign_companies')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)

  console.log(`\n✅ Saved ${insertedCompanies?.length || 0} companies to Supabase`)
  console.log(`📈 Finance companies now: ${afterCount || 'unknown'}`)
  console.log(`📊 Companies in campaign: ${campaignCount || 'unknown'}`)
  console.log(`🎯 Remaining to reach 1000: ${1000 - (afterCount || 0)}`)
  
  console.log(`\n📋 Sample companies:`)
  companies.slice(0, 10).forEach((c, idx) => {
    console.log(`\n${idx + 1}. ${c.name}`)
    console.log(`   Domain: ${c.domain}`)
    console.log(`   Segment: ${guessSegment([c.name, c.description].filter(Boolean).join(' | '))}`)
  })
}

main().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
