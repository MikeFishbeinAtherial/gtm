/**
 * Link AI Sales Roleplay Trainer contacts (with emails) to campaign
 *
 * Usage:
 *   npx tsx scripts/link-roleplay-contacts-to-campaign.ts
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

const CAMPAIGN_NAME = 'hiring-signal-new-sales-team'

async function main() {
  console.log('\n🔗 Linking Roleplay Contacts to Campaign\n')

  // Get offer
  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('slug', 'ai-sales-roleplay-trainer')
    .maybeSingle()

  if (!offer) {
    console.error('❌ AI Sales Roleplay Trainer offer not found')
    process.exit(1)
  }

  // Get or create campaign
  let { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('offer_id', offer.id)
    .eq('name', CAMPAIGN_NAME)
    .maybeSingle()

  if (!campaign) {
    console.log(`📝 Creating ${CAMPAIGN_NAME} campaign...`)
    const { data: newCampaign, error: createError } = await supabase
      .from('campaigns')
      .insert({
        offer_id: offer.id,
        name: CAMPAIGN_NAME,
        channel: 'email',
        status: 'draft',
        campaign_type: 'cold_outreach'
      })
      .select('id, name')
      .single()

    if (createError || !newCampaign) {
      console.error('❌ Failed to create campaign:', createError?.message)
      process.exit(1)
    }

    campaign = newCampaign
    console.log(`✅ Created campaign: ${campaign.id}`)
  } else {
    console.log(`✅ Found campaign: ${campaign.id}`)
  }

  // Get all contacts with emails at critical companies
  const { data: contacts } = await supabase
    .from('contacts')
    .select(`
      id,
      email,
      email_status,
      first_name,
      company_id,
      companies!inner(priority)
    `)
    .eq('offer_id', offer.id)
    .eq('companies.priority', 'critical')
    .not('email', 'is', null)
    .neq('email_status', 'failed')

  if (!contacts || contacts.length === 0) {
    console.log('⚠️  No contacts with emails found')
    process.exit(0)
  }

  console.log(`\n📧 Found ${contacts.length} contacts with emails`)

  // Get existing campaign_contacts
  const { data: existingLinks } = await supabase
    .from('campaign_contacts')
    .select('contact_id')
    .eq('campaign_id', campaign.id)

  const existingContactIds = new Set((existingLinks || []).map(cc => cc.contact_id))
  const newContacts = contacts.filter(c => !existingContactIds.has(c.id))

  console.log(`   Already linked: ${existingContactIds.size}`)
  console.log(`   New to link: ${newContacts.length}`)

  if (newContacts.length === 0) {
    console.log('\n✅ All contacts already linked!')
    process.exit(0)
  }

  // Link new contacts
  const linksToInsert = newContacts.map(contact => ({
    campaign_id: campaign.id,
    contact_id: contact.id,
    status: 'queued'
  }))

  const { error: insertError } = await supabase
    .from('campaign_contacts')
    .insert(linksToInsert)

  if (insertError) {
    console.error('❌ Failed to link contacts:', insertError.message)
    process.exit(1)
  }

  console.log(`\n✅ Successfully linked ${newContacts.length} contacts to campaign`)
  console.log(`\n📊 Summary:`)
  console.log(`   Total contacts in campaign: ${existingContactIds.size + newContacts.length}`)
  console.log(`   Ready for email sending: ${newContacts.length}`)
}

main().catch(console.error)
