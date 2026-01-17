/**
 * Import companies from TheirStack JSON export files into Supabase.
 * 
 * Use this to recover data from dry-run runs or import saved TheirStack results.
 * 
 * Usage:
 *   npx ts-node scripts/import-theirstack-companies-from-json.ts --file theirstack-companies-1234567890.json
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })
dotenv.config()

function getArg(name: string, defaultValue?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return defaultValue
  return process.argv[idx + 1] ?? defaultValue
}

const FILE_PATH = getArg('file')
if (!FILE_PATH) {
  console.error('❌ Missing --file argument. Usage: --file theirstack-companies-1234567890.json')
  process.exit(1)
}

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

async function main() {
  console.log(`📂 Reading file: ${FILE_PATH}`)
  
  const filePath = path.isAbsolute(FILE_PATH) ? FILE_PATH : path.join(process.cwd(), FILE_PATH)
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`)
    process.exit(1)
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(fileContent)

  if (!data.companies || !Array.isArray(data.companies)) {
    console.error('❌ Invalid JSON format. Expected { companies: [...] }')
    process.exit(1)
  }

  console.log(`📦 Found ${data.companies.length} companies in file`)
  console.log(`   Timestamp: ${data.timestamp || 'unknown'}`)
  console.log(`   Dry run: ${data.dry_run || false}`)

  // Load finance offer
  const { data: offer, error: offerErr } = await supabase
    .from('offers')
    .select('id, slug')
    .eq('slug', 'finance')
    .maybeSingle()

  if (offerErr || !offer?.id) {
    throw new Error(`Finance offer not found in DB (slug=finance). ${offerErr?.message || ''}`)
  }

  // Load existing domains for deduplication
  const { data: existingDomainsRows, error: domErr } = await supabase
    .from('companies')
    .select('domain')
    .eq('offer_id', offer.id)
    .not('domain', 'is', null)

  if (domErr) throw new Error(`Failed to load existing domains: ${domErr.message}`)
  const existingDomains = new Set((existingDomainsRows || []).map(r => (r.domain || '').toLowerCase()))

  // Filter out duplicates
  const toInsert = data.companies.filter((c: any) => {
    const domain = c.domain?.toLowerCase()
    return domain && !existingDomains.has(domain)
  })

  console.log(`✅ ${toInsert.length} new companies (${data.companies.length - toInsert.length} duplicates skipped)`)

  if (toInsert.length === 0) {
    console.log('ℹ️ No new companies to import.')
    return
  }

  // Ensure campaign exists
  const campaignName = 'finance-leadgen-1000'
  const { data: existingCampaign, error: campaignErr } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('offer_id', offer.id)
    .eq('name', campaignName)
    .maybeSingle()

  if (campaignErr) throw new Error(`Failed to load campaign: ${campaignErr.message}`)
  
  let campaignId: string
  if (existingCampaign?.id) {
    campaignId = existingCampaign.id
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from('campaigns')
      .insert({
        offer_id: offer.id,
        name: campaignName,
        status: 'draft',
        campaign_type: 'cold_outreach',
      } as any)
      .select('id')
      .maybeSingle()

    if (insErr || !inserted?.id) throw new Error(`Failed to create campaign: ${insErr?.message || 'unknown error'}`)
    campaignId = inserted.id
  }

  // Upsert companies
  const companyRows = toInsert.map((c: any) => ({
    offer_id: offer.id,
    name: c.name,
    domain: c.domain,
    vertical: c.vertical,
    signals: c.signals,
    source_tool: c.source_tool || 'theirstack',
    status: 'new',
  }))

  const { data: insertedCompanies, error: upErr } = await supabase
    .from('companies')
    .upsert(companyRows as any, { onConflict: 'offer_id,domain' })
    .select('id, domain, name')

  if (upErr) throw new Error(`Failed to upsert companies: ${upErr.message}`)

  // Link to campaign
  const campaignCompanies = (insertedCompanies || []).map((co: any) => ({
    campaign_id: campaignId,
    company_id: co.id,
    status: 'queued',
    source_tool: 'theirstack',
    added_reason: `Imported from JSON file: ${path.basename(FILE_PATH)}`,
    source_query: `imported_from_json`,
    source_raw: {
      signals: (toInsert.find((x: any) => x.domain === (co.domain || '').toLowerCase())?.signals) || null,
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

  console.log(`✅ Imported ${insertedCompanies?.length || 0} companies`)
  console.log(`📈 Finance companies now: ${afterCount || 'unknown'}`)
}

main().catch(err => {
  console.error('❌ Import failed:', err)
  process.exit(1)
})
