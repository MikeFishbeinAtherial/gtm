/**
 * Find finance companies using DIFFERENT angles to avoid duplicates.
 * 
 * Strategy:
 * - Different geographies (West Coast, Midwest, South)
 * - Different firm types (credit funds, family offices, fund of funds)
 * - Broader nationwide searches
 * 
 * Budget: $10 remaining
 * Uses Core generator ($2 + $0.15/match per query)
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

const MATCH_LIMIT = Number(getArg('limit', '75')) // Conservative limit for $10 budget
const GENERATOR = (getArg('generator', 'core') as 'base' | 'core' | 'pro') || 'core'

// Helper to poll for results
async function waitForFindAllResult(runId: string, maxWaitMinutes: number = 15): Promise<any> {
  const startTime = Date.now()
  const maxWaitMs = maxWaitMinutes * 60 * 1000
  const pollInterval = 10000

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
    'alternative investment', 'credit fund', 'buyout', 'growth equity',
    'family office', 'fund of funds', 'real estate investment'
  ]
  
  if (financeKeywords.some(k => t.includes(k))) return true
  
  if ((t.includes('capital') || t.includes('partners') || t.includes('management')) && !t.includes('bank')) {
    return true
  }
  
  return false
}

type FinanceSegment = 'hedge_fund' | 'private_equity' | 'asset_manager' | 'credit_fund' | 'family_office' | 'other'

function guessSegment(companyText: string): FinanceSegment {
  const t = companyText.toLowerCase()
  if (t.includes('hedge fund')) return 'hedge_fund'
  if (t.includes('private equity') || t.includes('buyout') || t.includes('growth equity')) return 'private_equity'
  if (t.includes('credit fund') || t.includes('credit investment')) return 'credit_fund'
  if (t.includes('family office')) return 'family_office'
  if (t.includes('asset management') || t.includes('investment management')) return 'asset_manager'
  return 'other'
}

// ============================================
// QUERY 1: Family Offices & Fund of Funds
// ============================================

async function query1_FamilyOffices_FundOfFunds(offerId: string, campaignId: string) {
  const queryName = 'family_offices_fund_of_funds'
  const objective = 'Find all family offices and fund of funds (FoF) investment firms in the United States'
  
  const matchConditions = [
    {
      name: 'family_office_or_fof_type',
      description: "Company must be a family office, fund of funds, or multi-manager investment firm. Look for keywords: 'family office', 'fund of funds', 'FoF', 'multi-manager', 'investment office'. Exclude single-strategy funds and individual investment advisors."
    },
    {
      name: 'us_location',
      description: "Company headquarters must be in the United States. Look for location information in company descriptions, LinkedIn pages, contact pages, or address information."
    }
  ]

  console.log('\n🔍 Query 1: Family Offices & Fund of Funds')
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
  
  const runIdFile = path.join(process.cwd(), `parallel-different-run-ids-${runId}.json`)
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
  
  const resultsFile = path.join(process.cwd(), `parallel-different-results-${runId}.json`)
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
// QUERY 2: Credit Funds & Alternative Credit
// ============================================

async function query2_CreditFunds(offerId: string, campaignId: string) {
  const queryName = 'credit_funds_alternative_credit'
  const objective = 'Find all credit funds, direct lending firms, and alternative credit investment firms in the United States'
  
  const matchConditions = [
    {
      name: 'credit_fund_type',
      description: "Company must be a credit fund, direct lending firm, alternative credit fund, or private credit investment firm. Look for keywords: 'credit fund', 'direct lending', 'private credit', 'alternative credit', 'credit investment', 'lending platform'. Exclude banks, credit unions, and consumer lending companies."
    },
    {
      name: 'us_location',
      description: "Company headquarters must be in the United States. Look for location information in company descriptions, LinkedIn pages, contact pages, or address information."
    }
  ]

  console.log('\n🔍 Query 2: Credit Funds & Alternative Credit')
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
  
  const runIdFile = path.join(process.cwd(), `parallel-different-run-ids-${runId}.json`)
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
  
  const resultsFile = path.join(process.cwd(), `parallel-different-results-${runId}.json`)
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
// QUERY 3: Alternative Investment Firms
// ============================================

async function query3_AlternativeInvestmentFirms(offerId: string, campaignId: string) {
  const queryName = 'alternative_investment_firms'
  const objective = 'Find all alternative investment firms, including real estate investment firms, infrastructure funds, and other alternative asset managers in the United States'
  
  const matchConditions = [
    {
      name: 'alternative_investment_type',
      description: "Company must be an alternative investment firm, real estate investment firm, infrastructure fund, or alternative asset manager. Look for keywords: 'alternative investment', 'real estate investment', 'REIT', 'infrastructure fund', 'alternative asset', 'specialty finance', 'distressed debt', 'special situations'. Exclude traditional hedge funds, private equity firms, banks, and credit unions."
    },
    {
      name: 'us_location',
      description: "Company headquarters must be in the United States. Look for location information in company descriptions, LinkedIn pages, contact pages, or address information."
    }
  ]

  console.log('\n🔍 Query 3: Alternative Investment Firms')
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
  
  const runIdFile = path.join(process.cwd(), `parallel-different-run-ids-${runId}.json`)
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
  
  const resultsFile = path.join(process.cwd(), `parallel-different-results-${runId}.json`)
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
// Main
// ============================================

async function main() {
  console.log('🏁 Find Finance Companies - Different Angles (Avoid Duplicates)')
  console.log(`   Generator: ${GENERATOR}`)
  console.log(`   Match Limit: ${MATCH_LIMIT} per query`)
  console.log(`\n💰 Budget: $10 remaining`)
  console.log(`   Core: $2 + $0.15/match per query`)
  console.log(`   Queries: Family Offices, Credit Funds, Alternative Investments`)
  console.log(`   Estimated: 3 queries × $2 = $6 base + matches\n`)

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
    const results = await query1_FamilyOffices_FundOfFunds(offer.id, campaignId)
    allResults.push(...results)
    const matches = results.length
    const cost = GENERATOR === 'core' ? 2 + (matches * 0.15) : GENERATOR === 'pro' ? 10 + (matches * 1) : 0
    totalCost += cost
    console.log(`   💰 Cost: $${cost.toFixed(2)} (${matches} matches)`)
    
    // Check if we're over budget
    if (totalCost >= 10) {
      console.log(`\n⚠️  Budget limit reached ($${totalCost.toFixed(2)}). Skipping remaining queries.`)
      return
    }
  } catch (error: any) {
    console.error(`❌ Query 1 failed: ${error.message}`)
  }

  try {
    const results = await query2_CreditFunds(offer.id, campaignId)
    allResults.push(...results)
    const matches = results.length
    const cost = GENERATOR === 'core' ? 2 + (matches * 0.15) : GENERATOR === 'pro' ? 10 + (matches * 1) : 0
    totalCost += cost
    console.log(`   💰 Cost: $${cost.toFixed(2)} (${matches} matches)`)
    
    // Check if we're over budget
    if (totalCost >= 10) {
      console.log(`\n⚠️  Budget limit reached ($${totalCost.toFixed(2)}). Skipping remaining queries.`)
      return
    }
  } catch (error: any) {
    console.error(`❌ Query 2 failed: ${error.message}`)
  }

  try {
    const results = await query3_AlternativeInvestmentFirms(offer.id, campaignId)
    allResults.push(...results)
    const matches = results.length
    const cost = GENERATOR === 'core' ? 2 + (matches * 0.15) : GENERATOR === 'pro' ? 10 + (matches * 1) : 0
    totalCost += cost
    console.log(`   💰 Cost: $${cost.toFixed(2)} (${matches} matches)`)
    
    if (totalCost >= 10) {
      console.log(`\n⚠️  Budget limit reached ($${totalCost.toFixed(2)}).`)
    }
  } catch (error: any) {
    console.error(`❌ Query 3 failed: ${error.message}`)
  }

  console.log(`\n💰 Total Estimated Cost: $${totalCost.toFixed(2)}`)
  console.log(`📊 Total Companies Found: ${allResults.length}`)

  // Process and save companies
  console.log('\n💾 Processing and saving companies...')
  
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
  const outputFile = path.join(process.cwd(), `parallel-different-companies-${Date.now()}.json`)
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
        query_type: 'different_angles', // Track that these are different queries
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
    added_reason: 'Different angles: Family Offices, Credit Funds, Alternative Investments (avoid duplicates)',
    source_query: 'parallel_findall_different_angles',
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
