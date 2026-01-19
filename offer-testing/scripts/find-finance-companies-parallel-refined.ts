/**
 * Refined Parallel FindAll queries for small-to-medium finance firms.
 * 
 * Key improvements:
 * - Better size filtering (explicitly excludes large firms like KKR)
 * - Active hiring signals (current job postings)
 * - AI/data leadership signals (people with AI titles)
 * - Recent growth signals (multiple hires)
 * 
 * Uses Core generator ($2 + $0.15/match) to stay within $37 budget.
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

const MATCH_LIMIT = Number(getArg('limit', '50')) // Start with 50 per query
const GENERATOR = (getArg('generator', 'core') as 'base' | 'core' | 'pro') || 'core'
const DRY_RUN = getArg('dry-run') === 'true'

// ============================================
// QUERY 1: Small-to-Mid Hedge Funds with Active Hiring + AI Leadership
// ============================================

async function query1_HedgeFunds_ActiveHiring_AILeadership(offerId: string, campaignId: string) {
  const queryName = 'hedge_funds_active_hiring_ai_leadership'
  const objective = 'Find all small-to-mid hedge funds ($10M-$500M AUM) on the East Coast of the United States (ideally New York or Pennsylvania) that are currently hiring and have AI/data leadership on staff'
  
  const matchConditions = [
    {
      name: 'hedge_fund_type',
      description: "Company must be a hedge fund, alternative investment fund, or investment management firm. Look for keywords: 'hedge fund', 'alternative investment', 'investment management'. Exclude banks, credit unions, insurance companies, venture capital firms, and private equity firms."
    },
    {
      name: 'small_to_mid_size',
      description: "Company must be small-to-mid sized. Look for evidence: employee count 5-100, AUM between $10M-$500M, or descriptions like 'small fund', 'mid-sized fund', 'boutique'. Exclude large firms: if AUM mentioned is over $500M, employee count over 200, or descriptions like 'global', 'multi-billion', 'largest'."
    },
    {
      name: 'currently_hiring',
      description: "Company must have active job postings listed publicly. Look for: LinkedIn job postings from past 90 days, company career page with open positions, job board listings. Evidence should show they are actively recruiting."
    },
    {
      name: 'ai_data_leadership',
      description: "Company must have at least one person on staff with AI/data leadership title. Look for: 'Head of AI', 'Head of Data', 'Chief Data Officer', 'CDO', 'Director of Data', 'VP Data', 'AI Engineer', 'Machine Learning Engineer', 'Data Scientist' in LinkedIn profiles, team pages, or job descriptions."
    },
    {
      name: 'east_coast_location',
      description: "Company headquarters must be on the East Coast of the United States. Prioritize companies in New York or Pennsylvania, but also include other East Coast states: New York, Pennsylvania, New Jersey, Massachusetts, Connecticut, Maryland, Virginia, North Carolina, South Carolina, Georgia, Florida. Look for location information in company descriptions, LinkedIn pages, contact pages, or address information."
    }
  ]

  console.log('\n🔍 Query 1: Small-to-Mid Hedge Funds with Active Hiring + AI Leadership')
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
  const runIdFile = path.join(process.cwd(), `parallel-refined-run-ids-${runId}.json`)
  fs.writeFileSync(runIdFile, JSON.stringify({
    run_id: runId,
    query_name: queryName,
    objective,
    match_conditions: matchConditions,
    generator: GENERATOR,
    match_limit: MATCH_LIMIT,
  }, null, 2))
  console.log(`   💾 Run ID saved: ${runIdFile}`)

  // Poll for results
  let result: any = null
  const maxWait = 10 * 60 * 1000 // 10 minutes
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWait) {
    const response = await fetch(`https://api.parallel.ai/v1beta/findall/runs/${runId}/result`, {
      headers: {
        'x-api-key': process.env.PARALLEL_API_KEY!,
        'parallel-beta': 'findall-2025-09-15'
      }
    })
    
    if (response.status === 404) {
      await new Promise(r => setTimeout(r, 5000))
      continue
    }
    
    result = await response.json()
    const status = result.run?.status?.status || result.status
    
    if (status === 'completed') {
      break
    }
    
    if (status === 'failed') {
      throw new Error(`FindAll run failed: ${result.run?.status?.termination_reason || 'unknown'}`)
    }
    
    await new Promise(r => setTimeout(r, 5000))
  }

  if (!result || result.run?.status?.status !== 'completed') {
    throw new Error('FindAll run timed out or failed')
  }

  const candidates = result.candidates || []
  const matched = candidates.filter((c: any) => c.match_status === 'matched')
  
  console.log(`   ✅ Found ${matched.length} matched companies (${candidates.length} total candidates)`)
  
  // Save results immediately
  const resultsFile = path.join(process.cwd(), `parallel-refined-results-${runId}.json`)
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
// QUERY 2: Mid-Market PE Firms with Active Hiring + Technical Roles
// ============================================

async function query2_PEFirms_ActiveHiring_TechnicalRoles(offerId: string, campaignId: string) {
  const queryName = 'pe_firms_active_hiring_technical'
  const objective = 'Find all mid-market private equity firms ($100M-$2B AUM) on the East Coast of the United States (ideally New York or Pennsylvania) that are currently hiring for technical or data roles'
  
  const matchConditions = [
    {
      name: 'pe_firm_type',
      description: "Company must be a private equity firm, buyout firm, or growth equity firm. Look for keywords: 'private equity', 'buyout', 'growth equity', 'PE firm'. Exclude venture capital firms, hedge funds, banks, and credit unions."
    },
    {
      name: 'mid_market_size',
      description: "Company must be mid-market sized. Look for evidence: employee count 10-150, AUM between $100M-$2B, or descriptions like 'mid-market', 'middle market', 'boutique PE'. Exclude mega-firms: if AUM mentioned is over $2B, employee count over 200, or descriptions like 'global', 'multi-billion', 'largest PE firm'."
    },
    {
      name: 'currently_hiring_technical',
      description: "Company must have active job postings for technical or data roles. Look for: job titles like 'Data Engineer', 'Platform Engineer', 'Automation Engineer', 'Technology Analyst', 'IT Manager', 'Data Analyst', 'Software Engineer', 'CTO', 'Head of Technology' posted in past 90 days on LinkedIn, company career pages, or job boards."
    },
    {
      name: 'east_coast_location',
      description: "Company headquarters must be on the East Coast of the United States. Prioritize companies in New York or Pennsylvania, but also include other East Coast states: New York, Pennsylvania, New Jersey, Massachusetts, Connecticut, Maryland, Virginia, North Carolina, South Carolina, Georgia, Florida. Look for location information in company descriptions, LinkedIn pages, contact pages, or address information."
    }
  ]

  console.log('\n🔍 Query 2: Mid-Market PE Firms with Active Hiring + Technical Roles')
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
  
  const runIdFile = path.join(process.cwd(), `parallel-refined-run-ids-${runId}.json`)
  fs.writeFileSync(runIdFile, JSON.stringify({
    run_id: runId,
    query_name: queryName,
    objective,
    match_conditions: matchConditions,
  }, null, 2))
  console.log(`   💾 Run ID saved: ${runIdFile}`)

  // Poll for results (with longer timeout for Core/Pro generators)
  let result: any = null
  const maxWait = 15 * 60 * 1000 // 15 minutes for Core/Pro queries
  const startTime = Date.now()
  let lastStatus = 'unknown'
  
  console.log(`   ⏳ Polling for results (max 15 minutes)...`)
  
  while (Date.now() - startTime < maxWait) {
    const response = await fetch(`https://api.parallel.ai/v1beta/findall/runs/${runId}/result`, {
      headers: {
        'x-api-key': process.env.PARALLEL_API_KEY!,
        'parallel-beta': 'findall-2025-09-15'
      }
    })
    
    if (response.status === 404) {
      await new Promise(r => setTimeout(r, 5000))
      continue
    }
    
    result = await response.json()
    const status = result.run?.status?.status || result.status
    const metrics = result.run?.status?.metrics
    
    // Show progress
    if (status !== lastStatus) {
      if (metrics) {
        console.log(`   📊 Status: ${status} (generated: ${metrics.generated_candidates_count || 0}, matched: ${metrics.matched_candidates_count || 0})`)
      } else {
        console.log(`   📊 Status: ${status}`)
      }
      lastStatus = status
    }
    
    if (status === 'completed') break
    if (status === 'failed') {
      throw new Error(`FindAll run failed: ${result.run?.status?.termination_reason || 'unknown'}`)
    }
    
    await new Promise(r => setTimeout(r, 10000)) // Check every 10 seconds
  }

  if (!result || result.run?.status?.status !== 'completed') {
    console.log(`   ⚠️  Run not completed yet. Run ID saved - can retrieve later with retrieve-refined-parallel-results.ts`)
    return [] // Return empty array so script can continue with other queries
  }

  const candidates = result.candidates || []
  const matched = candidates.filter((c: any) => c.match_status === 'matched')
  
  console.log(`   ✅ Found ${matched.length} matched companies`)
  
  const resultsFile = path.join(process.cwd(), `parallel-refined-results-${runId}.json`)
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
// QUERY 3: Hedge Funds Hiring Research Analysts (Pain Signal)
// ============================================

async function query3_HedgeFunds_HiringResearchAnalysts(offerId: string, campaignId: string) {
  const queryName = 'hedge_funds_hiring_research_analysts'
  const objective = 'Find all small-to-mid hedge funds ($10M-$500M AUM) on the East Coast of the United States (ideally New York or Pennsylvania) that are currently hiring research analysts or investment analysts'
  
  const matchConditions = [
    {
      name: 'hedge_fund_type',
      description: "Company must be a hedge fund, alternative investment fund, or investment management firm. Exclude banks, credit unions, insurance companies, venture capital firms, and private equity firms."
    },
    {
      name: 'small_to_mid_size',
      description: "Company must be small-to-mid sized. Look for: employee count 5-100, AUM $10M-$500M, or 'small fund', 'mid-sized fund', 'boutique'. Exclude large firms with AUM over $500M or employee count over 200."
    },
    {
      name: 'hiring_research_analysts',
      description: "Company must have active job postings for research or investment analyst roles. Look for: 'Research Analyst', 'Investment Analyst', 'Equity Research Analyst', 'Research Associate', 'Investment Research', 'Credit Analyst' posted in past 90 days on LinkedIn, company career pages, or job boards."
    },
    {
      name: 'east_coast_location',
      description: "Company headquarters must be on the East Coast of the United States. Prioritize companies in New York or Pennsylvania, but also include other East Coast states: New York, Pennsylvania, New Jersey, Massachusetts, Connecticut, Maryland, Virginia, North Carolina, South Carolina, Georgia, Florida. Look for location information in company descriptions, LinkedIn pages, contact pages, or address information."
    }
  ]

  console.log('\n🔍 Query 3: Hedge Funds Hiring Research Analysts (Pain Signal)')
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
  
  const runIdFile = path.join(process.cwd(), `parallel-refined-run-ids-${runId}.json`)
  fs.writeFileSync(runIdFile, JSON.stringify({
    run_id: runId,
    query_name: queryName,
    objective,
    match_conditions: matchConditions,
  }, null, 2))
  console.log(`   💾 Run ID saved: ${runIdFile}`)

  // Poll for results (with longer timeout for Core/Pro generators)
  let result: any = null
  const maxWait = 15 * 60 * 1000 // 15 minutes for Core/Pro queries
  const startTime = Date.now()
  let lastStatus = 'unknown'
  
  console.log(`   ⏳ Polling for results (max 15 minutes)...`)
  
  while (Date.now() - startTime < maxWait) {
    const response = await fetch(`https://api.parallel.ai/v1beta/findall/runs/${runId}/result`, {
      headers: {
        'x-api-key': process.env.PARALLEL_API_KEY!,
        'parallel-beta': 'findall-2025-09-15'
      }
    })
    
    if (response.status === 404) {
      await new Promise(r => setTimeout(r, 5000))
      continue
    }
    
    result = await response.json()
    const status = result.run?.status?.status || result.status
    const metrics = result.run?.status?.metrics
    
    // Show progress
    if (status !== lastStatus) {
      if (metrics) {
        console.log(`   📊 Status: ${status} (generated: ${metrics.generated_candidates_count || 0}, matched: ${metrics.matched_candidates_count || 0})`)
      } else {
        console.log(`   📊 Status: ${status}`)
      }
      lastStatus = status
    }
    
    if (status === 'completed') break
    if (status === 'failed') {
      throw new Error(`FindAll run failed: ${result.run?.status?.termination_reason || 'unknown'}`)
    }
    
    await new Promise(r => setTimeout(r, 10000)) // Check every 10 seconds
  }

  if (!result || result.run?.status?.status !== 'completed') {
    console.log(`   ⚠️  Run not completed yet. Run ID saved - can retrieve later with retrieve-refined-parallel-results.ts`)
    return [] // Return empty array so script can continue with other queries
  }

  const candidates = result.candidates || []
  const matched = candidates.filter((c: any) => c.match_status === 'matched')
  
  console.log(`   ✅ Found ${matched.length} matched companies`)
  
  const resultsFile = path.join(process.cwd(), `parallel-refined-results-${runId}.json`)
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
// QUERY 4: PE Firms Hiring Deal Sourcing (Pain Signal)
// ============================================

async function query4_PEFirms_HiringDealSourcing(offerId: string, campaignId: string) {
  const queryName = 'pe_firms_hiring_deal_sourcing'
  const objective = 'Find all mid-market private equity firms ($100M-$2B AUM) on the East Coast of the United States (ideally New York or Pennsylvania) that are currently hiring deal sourcing or business development roles'
  
  const matchConditions = [
    {
      name: 'pe_firm_type',
      description: "Company must be a private equity firm, buyout firm, or growth equity firm. Exclude venture capital firms, hedge funds, banks, and credit unions."
    },
    {
      name: 'mid_market_size',
      description: "Company must be mid-market sized. Look for: employee count 10-150, AUM $100M-$2B, or 'mid-market', 'middle market', 'boutique PE'. Exclude mega-firms with AUM over $2B or employee count over 200."
    },
    {
      name: 'hiring_deal_sourcing',
      description: "Company must have active job postings for deal sourcing or business development roles. Look for: 'Deal Sourcing', 'Sourcing Analyst', 'Business Development', 'Deal Origination', 'Investment Sourcing', 'Deal Flow' posted in past 90 days on LinkedIn, company career pages, or job boards."
    },
    {
      name: 'east_coast_location',
      description: "Company headquarters must be on the East Coast of the United States. Prioritize companies in New York or Pennsylvania, but also include other East Coast states: New York, Pennsylvania, New Jersey, Massachusetts, Connecticut, Maryland, Virginia, North Carolina, South Carolina, Georgia, Florida. Look for location information in company descriptions, LinkedIn pages, contact pages, or address information."
    }
  ]

  console.log('\n🔍 Query 4: PE Firms Hiring Deal Sourcing (Pain Signal)')
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
  
  const runIdFile = path.join(process.cwd(), `parallel-refined-run-ids-${runId}.json`)
  fs.writeFileSync(runIdFile, JSON.stringify({
    run_id: runId,
    query_name: queryName,
    objective,
    match_conditions: matchConditions,
  }, null, 2))
  console.log(`   💾 Run ID saved: ${runIdFile}`)

  // Poll for results (with longer timeout for Core/Pro generators)
  let result: any = null
  const maxWait = 15 * 60 * 1000 // 15 minutes for Core/Pro queries
  const startTime = Date.now()
  let lastStatus = 'unknown'
  
  console.log(`   ⏳ Polling for results (max 15 minutes)...`)
  
  while (Date.now() - startTime < maxWait) {
    const response = await fetch(`https://api.parallel.ai/v1beta/findall/runs/${runId}/result`, {
      headers: {
        'x-api-key': process.env.PARALLEL_API_KEY!,
        'parallel-beta': 'findall-2025-09-15'
      }
    })
    
    if (response.status === 404) {
      await new Promise(r => setTimeout(r, 5000))
      continue
    }
    
    result = await response.json()
    const status = result.run?.status?.status || result.status
    const metrics = result.run?.status?.metrics
    
    // Show progress
    if (status !== lastStatus) {
      if (metrics) {
        console.log(`   📊 Status: ${status} (generated: ${metrics.generated_candidates_count || 0}, matched: ${metrics.matched_candidates_count || 0})`)
      } else {
        console.log(`   📊 Status: ${status}`)
      }
      lastStatus = status
    }
    
    if (status === 'completed') break
    if (status === 'failed') {
      throw new Error(`FindAll run failed: ${result.run?.status?.termination_reason || 'unknown'}`)
    }
    
    await new Promise(r => setTimeout(r, 10000)) // Check every 10 seconds
  }

  if (!result || result.run?.status?.status !== 'completed') {
    console.log(`   ⚠️  Run not completed yet. Run ID saved - can retrieve later with retrieve-refined-parallel-results.ts`)
    return [] // Return empty array so script can continue with other queries
  }

  const candidates = result.candidates || []
  const matched = candidates.filter((c: any) => c.match_status === 'matched')
  
  console.log(`   ✅ Found ${matched.length} matched companies`)
  
  const resultsFile = path.join(process.cwd(), `parallel-refined-results-${runId}.json`)
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
  console.log('🏁 Parallel FindAll Refined Queries - Small-to-Medium Finance Firms')
  console.log(`   Generator: ${GENERATOR}`)
  console.log(`   Match Limit: ${MATCH_LIMIT} per query`)
  console.log(`   Dry Run: ${DRY_RUN}`)
  console.log(`\n💰 Budget: $37 remaining`)
  console.log(`   Core: $2 + $0.15/match per query`)
  console.log(`   Pro: $10 + $1/match per query (over budget)\n`)

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
    
    console.log('✅ Created finance-leadgen-1000 campaign\n')
  }

  const campaignId = campaign?.id || (await supabase.from('campaigns').select('id').eq('offer_id', offer.id).eq('name', 'finance-leadgen-1000').maybeSingle()).data?.id

  if (!campaignId) throw new Error('Campaign not found')

  // Run queries
  const allResults: any[] = []
  let totalCost = 0

  try {
    const results = await query1_HedgeFunds_ActiveHiring_AILeadership(offer.id, campaignId)
    allResults.push(...results)
    const matches = results.length
    const cost = GENERATOR === 'core' ? 2 + (matches * 0.15) : GENERATOR === 'pro' ? 10 + (matches * 1) : 0
    totalCost += cost
    console.log(`   💰 Cost: $${cost.toFixed(2)} (${matches} matches)`)
  } catch (error: any) {
    console.error(`❌ Query 1 failed: ${error.message}`)
  }

  try {
    const results = await query2_PEFirms_ActiveHiring_TechnicalRoles(offer.id, campaignId)
    allResults.push(...results)
    const matches = results.length
    const cost = GENERATOR === 'core' ? 2 + (matches * 0.15) : GENERATOR === 'pro' ? 10 + (matches * 1) : 0
    totalCost += cost
    console.log(`   💰 Cost: $${cost.toFixed(2)} (${matches} matches)`)
  } catch (error: any) {
    console.error(`❌ Query 2 failed: ${error.message}`)
  }

  try {
    const results = await query3_HedgeFunds_HiringResearchAnalysts(offer.id, campaignId)
    allResults.push(...results)
    const matches = results.length
    const cost = GENERATOR === 'core' ? 2 + (matches * 0.15) : GENERATOR === 'pro' ? 10 + (matches * 1) : 0
    totalCost += cost
    console.log(`   💰 Cost: $${cost.toFixed(2)} (${matches} matches)`)
  } catch (error: any) {
    console.error(`❌ Query 3 failed: ${error.message}`)
  }

  try {
    const results = await query4_PEFirms_HiringDealSourcing(offer.id, campaignId)
    allResults.push(...results)
    const matches = results.length
    const cost = GENERATOR === 'core' ? 2 + (matches * 0.15) : GENERATOR === 'pro' ? 10 + (matches * 1) : 0
    totalCost += cost
    console.log(`   💰 Cost: $${cost.toFixed(2)} (${matches} matches)`)
  } catch (error: any) {
    console.error(`❌ Query 4 failed: ${error.message}`)
  }

  console.log(`\n💰 Total Estimated Cost: $${totalCost.toFixed(2)}`)
  console.log(`📊 Total Companies Found: ${allResults.length}`)

  if (DRY_RUN) {
    console.log('\n🧪 Dry run - not saving to database')
    console.log(`\nSample companies:`)
    allResults.slice(0, 5).forEach((c: any, i: number) => {
      console.log(`\n${i + 1}. ${c.name || 'Unknown'}`)
      console.log(`   URL: ${c.url || 'N/A'}`)
      console.log(`   Match Status: ${c.match_status}`)
      if (c.description) {
        console.log(`   Description: ${c.description.substring(0, 100)}...`)
      }
    })
    return
  }

  // Process and save companies
  console.log('\n💾 Processing and saving companies...')
  
  // Load existing domains for deduplication
  const { data: existingDomainsRows } = await supabase
    .from('companies')
    .select('domain')
    .eq('offer_id', offer.id)
    .not('domain', 'is', null)

  const existingDomains = new Set((existingDomainsRows || []).map(r => (r.domain || '').toLowerCase()))
  
  // Extract company data
  const companies = allResults
    .map((c: any) => {
      const domain = c.url?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || null
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
      return true
    })

  console.log(`✅ Processed ${companies.length} companies (filtered out ${allResults.length - companies.length} invalid/duplicates)`)

  // Save to JSON
  const outputFile = path.join(process.cwd(), `parallel-refined-companies-${Date.now()}.json`)
  fs.writeFileSync(outputFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    total_found: companies.length,
    total_candidates: allResults.length,
    queries_run: 4,
    generator: GENERATOR,
    estimated_cost: totalCost,
    companies,
  }, null, 2))
  console.log(`💾 Saved to: ${outputFile}`)

  if (DRY_RUN) {
    console.log('\n🧪 Dry run - not saving to database')
    console.log(`\nSample companies:`)
    companies.slice(0, 10).forEach((c: any, i: number) => {
      console.log(`\n${i + 1}. ${c.name}`)
      console.log(`   Domain: ${c.domain}`)
      console.log(`   Match Status: ${c.match_status}`)
      if (c.description) {
        console.log(`   Description: ${c.description.substring(0, 100)}...`)
      }
    })
    return
  }

  // Save to Supabase
  console.log('\n💾 Saving to Supabase...')
  
  // Determine signal type and segment from query name
  const companyRows = companies.map((c: any) => {
    // Extract signal type from raw_data (if available)
    let signalType: 'maturity' | 'pain' = 'maturity'
    let segment: string = 'other'
    
    // Try to determine from query context or company description
    const desc = (c.description || '').toLowerCase()
    if (desc.includes('hedge fund')) segment = 'hedge_fund'
    if (desc.includes('private equity') || desc.includes('pe firm')) segment = 'private_equity'
    if (desc.includes('asset management')) segment = 'asset_manager'
    
    // Check if it's a pain signal (hiring research/sourcing roles)
    if (c.output && Object.keys(c.output).some(k => k.includes('research') || k.includes('sourcing'))) {
      signalType = 'pain'
    }

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
          signal_type: signalType,
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
    added_reason: 'Refined Parallel FindAll queries - East Coast focus (NY/PA preferred)',
    source_query: 'parallel_findall_refined',
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
  
  console.log(`\n📋 Sample companies:`)
  companies.slice(0, 10).forEach((c: any, i: number) => {
    console.log(`\n${i + 1}. ${c.name}`)
    console.log(`   Domain: ${c.domain}`)
    console.log(`   Match Status: ${c.match_status}`)
  })
}

main().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
