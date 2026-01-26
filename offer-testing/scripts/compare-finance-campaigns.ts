/**
 * Compare the two finance campaigns
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
  console.log('\n📊 Comparing Finance Campaigns\n')

  // Get finance offer
  const { data: offer } = await supabase
    .from('offers')
    .select('id, name')
    .eq('slug', 'finance')
    .single()

  if (!offer) {
    console.error('❌ Finance offer not found')
    return
  }

  // Get both campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, campaign_type, created_at')
    .eq('offer_id', offer.id)
    .in('name', ['finance-leadgen-1000', 'finance-fi-company-enrichment'])

  if (!campaigns || campaigns.length === 0) {
    console.log('❌ Campaigns not found')
    return
  }

  console.log('📋 Campaigns Found:\n')
  campaigns.forEach(c => {
    console.log(`   ${c.name}`)
    console.log(`   ID: ${c.id}`)
    console.log(`   Type: ${c.campaign_type || 'null'}`)
    console.log(`   Created: ${c.created_at}`)
    console.log('')
  })

  // Get campaign contacts for each
  for (const campaign of campaigns) {
    const { data: campaignContacts } = await supabase
      .from('campaign_contacts')
      .select(`
        contact_id,
        contacts!inner(
          id,
          first_name,
          email,
          company_id,
          companies!inner(
            id,
            name,
            vertical
          )
        )
      `)
      .eq('campaign_id', campaign.id)

    const { data: messages } = await supabase
      .from('messages')
      .select('id, contact_id, subject, status')
      .eq('campaign_id', campaign.id)

    console.log(`\n📊 ${campaign.name}:`)
    console.log(`   Contacts: ${campaignContacts?.length || 0}`)
    console.log(`   Messages: ${messages?.length || 0}`)
    console.log(`   Pending: ${messages?.filter(m => m.status === 'pending').length || 0}`)
    console.log(`   Sent: ${messages?.filter(m => m.status === 'sent').length || 0}`)
  }

  // Check for duplicate contacts across campaigns
  const campaign1 = campaigns[0]
  const campaign2 = campaigns[1]

  const { data: contacts1 } = await supabase
    .from('campaign_contacts')
    .select('contact_id')
    .eq('campaign_id', campaign1.id)

  const { data: contacts2 } = await supabase
    .from('campaign_contacts')
    .select('contact_id')
    .eq('campaign_id', campaign2.id)

  const contactIds1 = new Set(contacts1?.map(c => c.contact_id) || [])
  const contactIds2 = new Set(contacts2?.map(c => c.contact_id) || [])

  const duplicates = [...contactIds1].filter(id => contactIds2.has(id))
  const onlyIn1 = [...contactIds1].filter(id => !contactIds2.has(id))
  const onlyIn2 = [...contactIds2].filter(id => !contactIds1.has(id))

  console.log(`\n\n🔄 Overlap Analysis:`)
  console.log(`   Contacts in both: ${duplicates.length}`)
  console.log(`   Only in ${campaign1.name}: ${onlyIn1.length}`)
  console.log(`   Only in ${campaign2.name}: ${onlyIn2.length}`)

  // Check for duplicate messages (same contact, different campaigns)
  const { data: allMessages } = await supabase
    .from('messages')
    .select('id, contact_id, campaign_id, subject, status')
    .in('campaign_id', campaigns.map(c => c.id))

  const messagesByContact = (allMessages || []).reduce((acc, m) => {
    if (!acc[m.contact_id]) acc[m.contact_id] = []
    acc[m.contact_id].push(m)
    return acc
  }, {} as Record<string, any[]>)

  const duplicateMessages = Object.entries(messagesByContact)
    .filter(([, msgs]) => msgs.length > 1)
    .map(([contactId, msgs]) => ({
      contactId,
      messages: msgs.map(m => ({
        id: m.id,
        campaign: campaigns.find(c => c.id === m.campaign_id)?.name,
        subject: m.subject,
        status: m.status
      }))
    }))

  if (duplicateMessages.length > 0) {
    console.log(`\n\n⚠️  Duplicate Messages (same contact, different campaigns):`)
    duplicateMessages.slice(0, 10).forEach((dup, idx) => {
      console.log(`\n   ${idx + 1}. Contact ID: ${dup.contactId.slice(0, 8)}...`)
      dup.messages.forEach(m => {
        console.log(`      - ${m.campaign}: "${m.subject}" (${m.status})`)
      })
    })
    if (duplicateMessages.length > 10) {
      console.log(`   ... and ${duplicateMessages.length - 10} more contacts with duplicates`)
    }
  } else {
    console.log(`\n\n✅ No duplicate messages found`)
  }

  // Show sample companies from each campaign
  console.log(`\n\n📋 Sample Companies:\n`)
  for (const campaign of campaigns) {
    const { data: sampleContacts } = await supabase
      .from('campaign_contacts')
      .select(`
        contacts!inner(
          companies!inner(name, vertical)
        )
      `)
      .eq('campaign_id', campaign.id)
      .limit(5)

    console.log(`${campaign.name}:`)
    sampleContacts?.forEach((cc: any) => {
      console.log(`   - ${cc.contacts.companies.name} (${cc.contacts.companies.vertical || 'unknown'})`)
    })
    console.log('')
  }
}

main().catch(console.error)
