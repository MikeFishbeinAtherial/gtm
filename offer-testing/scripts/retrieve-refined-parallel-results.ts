/**
 * Retrieve results from refined Parallel FindAll queries.
 * Gets run IDs from saved JSON files and retrieves results.
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'glob'

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

async function main() {
  console.log('🔍 Retrieving Refined Parallel FindAll Results\n')

  // Get run IDs from saved JSON files or command line
  const runIdsArg = getArg('run-ids')
  let runIds: string[] = []

  if (runIdsArg) {
    runIds = runIdsArg.split(',').map(id => id.trim()).filter(Boolean)
    console.log(`📋 Using provided run IDs: ${runIds.join(', ')}\n`)
  } else {
    // Find all run ID JSON files
    const runIdFiles = glob.sync('parallel-refined-run-ids-*.json', { cwd: process.cwd() })
    
    if (runIdFiles.length === 0) {
      console.log('❌ No run ID files found.')
      console.log('   Run the script with: --run-ids findall_xxx,findall_yyy')
      process.exit(1)
    }

    console.log(`📋 Found ${runIdFiles.length} run ID files\n`)
    
    for (const file of runIdFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8')
        const data = JSON.parse(content)
        if (data.run_id) {
          runIds.push(data.run_id)
          console.log(`   ${data.query_name || 'unknown'}: ${data.run_id}`)
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to read ${file}`)
      }
    }
    
    console.log(`\n📋 Total run IDs: ${runIds.length}\n`)
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
        channel: 'linkedin',
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
      
      if (result.status === 'not_found') {
        console.log(`   ⚠️  Run not found (may have expired or been cleaned up)`)
        continue
      }

      const runStatus = result.run?.status?.status || result.status
      
      if (runStatus !== 'completed') {
        console.log(`   ⏳ Status: ${runStatus} (not completed yet)`)
        continue
      }

      const candidates = result.candidates || []
      const matched = candidates.filter((c: any) => c.match_status === 'matched')
      console.log(`   ✅ Found ${matched.length} matched companies (${candidates.length} total candidates)`)

      // Determine signal type from query name
      let signalType: 'maturity' | 'pain' = 'maturity'
      if (runId.includes('research') || runId.includes('sourcing')) {
        signalType = 'pain'
      }

      for (const item of matched) {
        const domain = normalizeDomain(item.url)
        if (!domain) continue
        
        const d = domain.toLowerCase()
        if (existingDomains.has(d)) continue

        const companyText = [item.name, item.description].filter(Boolean).join(' | ')
        if (!looksLikeFinanceFirm(companyText)) continue

        const segment = guessSegment(companyText)

        allCompanies.push({
          name: item.name || 'Unknown',
          domain: d,
          url: item.url,
          description: item.description,
          segment,
          signalType,
          match_status: item.match_status,
          output: item.output || {},
          basis: item.basis || [],
          raw_data: item,
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
  const outputFile = path.join(process.cwd(), `parallel-refined-retrieved-${Date.now()}.json`)
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
    url: c.url,
    description: c.description,
    vertical: c.segment,
    source_tool: 'parallel_findall',
    source_raw: {
      lead_source: 'parallel_findall',
      parallel_findall: c.raw_data,
      match_status: c.match_status,
      output: c.output,
      basis: c.basis,
    },
    signals: {
      segment_guess: c.segment,
      maturity_tier: 'unknown',
      maturity_method: 'parallel_findall',
      parallel: {
        signal_type: c.signalType,
        match_status: c.match_status,
        output: c.output,
        basis: c.basis,
      },
    },
    status: 'new',
  }))

  const { data: insertedCompanies, error: upErr } = await supabase
    .from('companies')
    .upsert(companyRows as any, { onConflict: 'offer_id,domain' })
    .select('id, domain, name')

  if (upErr) {
    throw new Error(`Failed to upsert companies: ${upErr.message}`)
  }

  // Link to campaign
  const campaignCompanies = (insertedCompanies || []).map((co: any) => ({
    campaign_id: campaign!.id,
    company_id: co.id,
    status: 'queued',
    source_tool: 'parallel_findall',
    added_reason: 'Refined Parallel FindAll queries - East Coast focus (NY/PA preferred)',
    source_query: 'parallel_findall_refined',
    source_raw: {
      lead_source: 'parallel_findall',
      signals: (allCompanies.find(x => x.domain === (co.domain || '').toLowerCase())?.raw_data) || null,
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
    .eq('campaign_id', campaign!.id)

  console.log(`\n✅ Saved ${insertedCompanies?.length || 0} companies to Supabase`)
  console.log(`📈 Finance companies now: ${afterCount || 'unknown'}`)
  console.log(`📊 Companies in campaign: ${campaignCount || 'unknown'}`)

  // Show sample companies
  console.log(`\n📋 Sample companies:`)
  allCompanies.slice(0, 10).forEach((c, idx) => {
    console.log(`\n${idx + 1}. ${c.name}`)
    console.log(`   Domain: ${c.domain}`)
    console.log(`   Segment: ${c.segment}`)
    console.log(`   Signal: ${c.signalType}`)
    if (c.description) {
      console.log(`   Description: ${c.description.substring(0, 80)}...`)
    }
  })
}

main().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
