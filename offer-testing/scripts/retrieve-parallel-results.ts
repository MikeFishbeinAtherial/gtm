/**
 * Retrieve and save Parallel FindAll results from completed runs.
 * 
 * This script:
 * 1. Gets findall_run_ids from parallel_findall_runs table (or you can pass them)
 * 2. Fetches results from Parallel API
 * 3. Processes companies and saves to Supabase
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

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
const PARALLEL_API_KEY = process.env.PARALLEL_API_KEY

if (!PARALLEL_API_KEY) {
  console.error('❌ PARALLEL_API_KEY not set')
  process.exit(1)
}

function getArg(name: string, defaultValue?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return defaultValue
  return process.argv[idx + 1] ?? defaultValue
}

// Get run IDs from command line, database, or try to fetch from Parallel
const runIdsArg = getArg('run-ids') // Comma-separated list
const retrieveFromDb = !runIdsArg

async function getFindAllResult(runId: string) {
  const response = await fetch(`https://api.parallel.ai/v1beta/findall/runs/${runId}/result`, {
    method: 'GET',
    headers: {
      'x-api-key': PARALLEL_API_KEY,
      'parallel-beta': 'findall-2025-09-15'
    }
  })

  if (response.status === 404) {
    return { status: 'not_found' }
  }

  if (!response.ok) {
    let error: any
    try {
      error = await response.json()
    } catch {
      error = { error: await response.text() }
    }
    throw new Error(`Parallel API error (${response.status}): ${JSON.stringify(error)}`)
  }

  return response.json()
}

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

function looksLikeFinanceFirm(companyText: string): boolean {
  const t = companyText.toLowerCase()
  
  if (t.includes('credit union') || t.includes('bank') || t.includes('insurance') || t.includes('mortgage')) {
    return false
  }
  
  const financeKeywords = [
    'hedge fund', 'private equity', 'asset management', 'investment management',
    'alternative investment', 'credit fund', 'buyout', 'growth equity', 'venture capital'
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

function extractCompanyFromFindAll(item: any, signalType: 'maturity' | 'pain'): {
  domain: string | null
  name: string
  description: string | null
  linkedinUrl: string | null
  employeeCount: number | null
  location: string | null
  evidence: string
  confidence: string | null
  rawData: any
} {
  const domain = normalizeDomain(item.domain || item.website || item.url)
  const name = item.name || item.company_name || 'Unknown'
  const description = item.description || item.about || null
  const linkedinUrl = item.linkedin_url || item.linkedin || null
  const employeeCount = item.employee_count || item.employees || null
  const location = item.location || item.headquarters || item.city || null
  
  const evidence = [
    item.match_reasoning,
    item.reasoning,
    item.match_status,
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
    rawData: item, // Store full raw data
  }
}

async function tryListRuns(): Promise<string[]> {
  // Try to query Parallel API for recent runs
  try {
    const response = await fetch('https://api.parallel.ai/v1beta/findall/runs?limit=20', {
      method: 'GET',
      headers: {
        'x-api-key': PARALLEL_API_KEY,
        'parallel-beta': 'findall-2025-09-15'
      }
    })

    if (response.ok) {
      const data = await response.json()
      if (data.runs && Array.isArray(data.runs)) {
        return data.runs
          .map((r: any) => r.findall_id || r.run_id || r.id)
          .filter(Boolean)
      }
    }
  } catch (error) {
    // API doesn't support listing runs - that's okay
  }
  return []
}

async function main() {
  console.log('🔍 Retrieving Parallel FindAll Results\n')

  // Get run IDs
  let runIds: string[] = []

  if (runIdsArg) {
    runIds = runIdsArg.split(',').map(id => id.trim()).filter(Boolean)
    console.log(`📋 Using provided run IDs: ${runIds.join(', ')}\n`)
  } else {
    // Try to get from database first
    const { data: runs, error } = await supabase
      .from('parallel_findall_runs')
      .select('findall_run_id, query_name, status')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && runs && runs.length > 0) {
      runIds = runs.map(r => r.findall_run_id).filter(Boolean) as string[]
      console.log(`📋 Found ${runIds.length} run IDs in database\n`)
    } else {
      // Try to query Parallel API directly
      console.log('📋 No runs in database, trying to query Parallel API...\n')
      const apiRunIds = await tryListRuns()
      if (apiRunIds.length > 0) {
        runIds = apiRunIds
        console.log(`📋 Found ${runIds.length} run IDs from Parallel API\n`)
      } else {
        console.log('❌ No run IDs found.')
        console.log('   The CSV file doesn\'t contain run IDs - it only has usage data.')
        console.log('   Please get run IDs from: https://platform.parallel.ai/')
        console.log('   Then run: --run-ids findall_xxx,findall_yyy,findall_zzz')
        process.exit(1)
      }
    }
  }

  // Load finance offer
  const { data: offer, error: offerErr } = await supabase
    .from('offers')
    .select('id, slug')
    .eq('slug', 'finance')
    .maybeSingle()

  if (offerErr || !offer?.id) {
    throw new Error(`Finance offer not found: ${offerErr?.message || ''}`)
  }

  // Load existing domains
  const { data: existingDomainsRows } = await supabase
    .from('companies')
    .select('domain')
    .eq('offer_id', offer.id)
    .not('domain', 'is', null)

  const existingDomains = new Set((existingDomainsRows || []).map(r => (r.domain || '').toLowerCase()))

  // Get or create campaign
  const campaignName = 'finance-leadgen-1000'
  let { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('offer_id', offer.id)
    .eq('name', campaignName)
    .maybeSingle()

  if (!campaign) {
    const { data: newCampaign } = await supabase
      .from('campaigns')
      .insert({
        offer_id: offer.id,
        name: campaignName,
        status: 'draft',
        campaign_type: 'cold_outreach',
        channel: 'linkedin', // Required field
      } as any)
      .select('id')
      .maybeSingle()
    campaign = newCampaign
  }

  const allCompanies: any[] = []

  // Retrieve results for each run
  for (const runId of runIds) {
    console.log(`🔍 Retrieving results for: ${runId}`)
    
    try {
      const result = await getFindAllResult(runId)
      
      // Check if run exists and is completed
      // API returns: { run: { status: { status: 'completed' } }, candidates: [...] }
      const runStatus = result.run?.status?.status || result.status
      
      if (runStatus === 'not_found' || !result.run) {
        console.log(`   ⚠️  Run not found (may have expired or been cleaned up)`)
        continue
      }

      if (runStatus !== 'completed') {
        console.log(`   ⏳ Status: ${runStatus} (not completed yet)`)
        continue
      }

      // Extract candidates from API response
      // API returns candidates array directly, or in output.items
      const items = result.candidates || result.output?.items || []
      console.log(`   ✅ Found ${items.length} companies`)

      // Determine signal type from query name (if we have it)
      let signalType: 'maturity' | 'pain' = 'maturity'
      if (runId.includes('pain')) {
        signalType = 'pain'
      }

      for (const item of items) {
        const c = extractCompanyFromFindAll(item, signalType)
        if (!c.domain) continue
        
        const d = c.domain.toLowerCase()
        if (existingDomains.has(d)) continue

        const companyText = [c.name, c.description, c.location].filter(Boolean).join(' | ')
        if (!looksLikeFinanceFirm(companyText)) continue

        const segment = guessSegment(companyText)

        allCompanies.push({
          name: c.name,
          domain: d,
          vertical: segment,
          source_tool: 'parallel_findall',
          source_raw: {
            lead_source: 'parallel_findall', // Track lead source
            parallel_findall: c.rawData, // Store full raw response
          },
          signals: {
            segment_guess: segment,
            maturity_tier: 'unknown', // We'll assess later
            maturity_method: 'parallel_findall',
            parallel: {
              signal_type: signalType,
              evidence: c.evidence,
              confidence: c.confidence,
              linkedin_url: c.linkedinUrl,
              employee_count: c.employeeCount,
              location: c.location,
              raw_data: c.rawData, // Store full raw response
            },
          },
        })

        existingDomains.add(d)
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`)
    }
  }

  console.log(`\n📊 Total companies to save: ${allCompanies.length}`)

  if (allCompanies.length === 0) {
    console.log('ℹ️  No new companies to save.')
    return
  }

  // Save to JSON file
  const outputFile = path.join(process.cwd(), `parallel-retrieved-companies-${Date.now()}.json`)
  fs.writeFileSync(outputFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    run_ids: runIds,
    total_companies: allCompanies.length,
    companies: allCompanies,
  }, null, 2))
  console.log(`💾 Saved to: ${outputFile}`)

  // Save to Supabase
  const companyRows = allCompanies.map(c => ({
    offer_id: offer.id,
    name: c.name,
    domain: c.domain,
    vertical: c.vertical,
    signals: c.signals,
    source_tool: c.source_tool,
    source_raw: c.source_raw, // Include lead_source tracking
    status: 'new',
  }))

  const { data: insertedCompanies, error: upErr } = await supabase
    .from('companies')
    .upsert(companyRows as any, { onConflict: 'offer_id,domain' })
    .select('id, domain, name')

  if (upErr) {
    throw new Error(`Failed to upsert companies: ${upErr.message}`)
  }

  // Link to campaign with lead_source tracking
  const campaignCompanies = (insertedCompanies || []).map((co: any) => ({
    campaign_id: campaign!.id,
    company_id: co.id,
    status: 'queued',
    source_tool: 'parallel_findall',
    added_reason: 'Retrieved from Parallel FindAll runs',
    source_query: `run_ids=${runIds.join(',')}`,
    source_raw: {
      lead_source: 'parallel_findall', // Track lead source
      signals: (allCompanies.find(x => x.domain === (co.domain || '').toLowerCase())?.signals) || null,
    },
  }))

  const { error: ccErr } = await supabase
    .from('campaign_companies')
    .upsert(campaignCompanies as any, { onConflict: 'campaign_id,company_id' })

  if (ccErr) {
    throw new Error(`Failed to upsert campaign_companies: ${ccErr.message}`)
  }

  // Ensure all existing CSV-imported companies are also linked to this campaign
  console.log('\n🔗 Linking existing CSV-imported companies to campaign...')
  
  const { data: existingCompanies } = await supabase
    .from('companies')
    .select('id, domain, source_tool')
    .eq('offer_id', offer.id)
    .in('source_tool', ['sumble', 'csv', 'manual'])

  if (existingCompanies && existingCompanies.length > 0) {
    const csvCampaignCompanies = existingCompanies
      .filter(c => c.id) // Ensure we have IDs
      .map((co: any) => ({
        campaign_id: campaign!.id,
        company_id: co.id,
        status: 'queued',
        source_tool: co.source_tool || 'csv',
        added_reason: 'Linked existing CSV-imported companies to finance-leadgen-1000 campaign',
        source_query: 'csv_import',
        source_raw: {
          lead_source: co.source_tool || 'csv', // Track lead source
        },
      }))

    const { error: csvLinkErr } = await supabase
      .from('campaign_companies')
      .upsert(csvCampaignCompanies as any, { onConflict: 'campaign_id,company_id' })

    if (csvLinkErr) {
      console.warn(`⚠️  Warning: Failed to link CSV companies: ${csvLinkErr.message}`)
    } else {
      console.log(`✅ Linked ${csvCampaignCompanies.length} existing CSV-imported companies to campaign`)
    }
  }

  // Final count
  const { count: afterCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', offer.id)

  const { count: campaignCount } = await supabase
    .from('campaign_companies')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign!.id)

  console.log(`\n✅ Saved ${insertedCompanies?.length || 0} companies to Supabase`)
  console.log(`📈 Finance companies now: ${afterCount || 'unknown'}`)
  console.log(`📊 Companies in campaign: ${campaignCount || 'unknown'}`)

  // Show sample companies
  console.log(`\n📋 Sample companies:`)
  allCompanies.slice(0, 5).forEach((c, idx) => {
    console.log(`\n${idx + 1}. ${c.name}`)
    console.log(`   Domain: ${c.domain}`)
    console.log(`   Segment: ${c.signals.segment_guess}`)
    console.log(`   Signal: ${c.signals.parallel.signal_type}`)
    if (c.signals.parallel.linkedin_url) {
      console.log(`   LinkedIn: ${c.signals.parallel.linkedin_url}`)
    }
  })
}

main().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
