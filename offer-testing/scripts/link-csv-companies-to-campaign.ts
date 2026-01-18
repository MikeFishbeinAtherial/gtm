/**
 * Link existing CSV-imported companies to finance-leadgen-1000 campaign
 * and add lead_source tracking
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'

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

async function main() {
  console.log('🔗 Linking CSV-imported companies to finance-leadgen-1000 campaign\n')

  // Load finance offer
  const { data: offer, error: offerErr } = await supabase
    .from('offers')
    .select('id, slug')
    .eq('slug', 'finance')
    .maybeSingle()

  if (offerErr || !offer?.id) {
    throw new Error(`Finance offer not found: ${offerErr?.message || ''}`)
  }

  // Get or create campaign
  const campaignName = 'finance-leadgen-1000'
  let { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('offer_id', offer.id)
    .eq('name', campaignName)
    .maybeSingle()

  if (!campaign) {
    const { data: newCampaign, error: createErr } = await supabase
      .from('campaigns')
      .insert({
        offer_id: offer.id,
        name: campaignName,
        status: 'draft',
        campaign_type: 'cold_outreach',
        channel: 'linkedin', // Required field
      } as any)
      .select('id, name')
      .maybeSingle()
    
    if (createErr || !newCampaign) {
      throw new Error(`Failed to create campaign: ${createErr?.message || 'unknown error'}`)
    }
    campaign = newCampaign
  }

  if (!campaign?.id) {
    throw new Error('Failed to get or create campaign')
  }

  console.log(`✅ Campaign: ${campaign.name} (${campaign.id})\n`)

  // Find all CSV-imported companies (sumble, csv, manual sources)
  const { data: csvCompanies, error: csvErr } = await supabase
    .from('companies')
    .select('id, domain, name, source_tool, source_raw')
    .eq('offer_id', offer.id)
    .in('source_tool', ['sumble', 'csv', 'manual'])

  if (csvErr) {
    throw new Error(`Failed to load CSV companies: ${csvErr.message}`)
  }

  if (!csvCompanies || csvCompanies.length === 0) {
    console.log('ℹ️  No CSV-imported companies found.')
    return
  }

  console.log(`📊 Found ${csvCompanies.length} CSV-imported companies\n`)

  // Check which ones are already linked
  const { data: existingLinks } = await supabase
    .from('campaign_companies')
    .select('company_id')
    .eq('campaign_id', campaign.id)
    .in('company_id', csvCompanies.map(c => c.id))

  const existingCompanyIds = new Set((existingLinks || []).map(l => l.company_id))
  const toLink = csvCompanies.filter(c => !existingCompanyIds.has(c.id))

  console.log(`   • Already linked: ${existingCompanyIds.size}`)
  console.log(`   • Need to link: ${toLink.length}\n`)

  if (toLink.length === 0) {
    console.log('✅ All CSV companies are already linked to the campaign.')
    return
  }

  // Link companies to campaign with lead_source tracking
  const campaignCompanies = toLink.map((co: any) => {
    const leadSource = co.source_tool || 'csv'
    const sourceRaw = co.source_raw || {}
    
    return {
      campaign_id: campaign.id,
      company_id: co.id,
      status: 'queued',
      source_tool: leadSource,
      added_reason: `Linked existing ${leadSource}-imported company to finance-leadgen-1000 campaign`,
      source_query: 'csv_import',
      source_raw: {
        lead_source: leadSource, // Track lead source
        ...sourceRaw, // Preserve existing source_raw data
      },
    }
  })

  const { error: linkErr } = await supabase
    .from('campaign_companies')
    .upsert(campaignCompanies as any, { onConflict: 'campaign_id,company_id' })

  if (linkErr) {
    throw new Error(`Failed to link companies: ${linkErr.message}`)
  }

  // Update companies' source_raw to include lead_source if missing
  const updates = csvCompanies
    .filter(c => {
      const sourceRaw = c.source_raw || {}
      return !sourceRaw.lead_source
    })
    .map(c => ({
      id: c.id,
      source_raw: {
        lead_source: c.source_tool || 'csv',
        ...(c.source_raw || {}),
      },
    }))

  if (updates.length > 0) {
    for (const update of updates) {
      await supabase
        .from('companies')
        .update({ source_raw: update.source_raw })
        .eq('id', update.id)
    }
    console.log(`✅ Updated lead_source for ${updates.length} companies\n`)
  }

  // Final counts
  const { count: campaignCount } = await supabase
    .from('campaign_companies')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id)

  const { count: totalCompanies } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', offer.id)

  console.log(`✅ Linked ${toLink.length} CSV companies to campaign`)
  console.log(`📊 Total companies in campaign: ${campaignCount || 'unknown'}`)
  console.log(`📈 Total finance companies: ${totalCompanies || 'unknown'}`)
}

main().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
