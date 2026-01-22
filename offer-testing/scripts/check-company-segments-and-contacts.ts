/**
 * Check company segments and contact status for email campaign planning
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
  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('slug', 'finance')
    .maybeSingle()

  if (!offer) {
    console.error('❌ Finance offer not found')
    process.exit(1)
  }

  // Get campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('offer_id', offer.id)
    .eq('name', 'finance-leadgen-1000')
    .maybeSingle()

  if (!campaign) {
    console.error('❌ Campaign finance-leadgen-1000 not found')
    process.exit(1)
  }

  // Get companies
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, vertical, domain')
    .eq('offer_id', offer.id)

  // Get contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, email, email_status, first_name, company_id')
    .eq('offer_id', offer.id)

  // Get campaign contacts
  const { data: campaignContacts } = await supabase
    .from('campaign_contacts')
    .select('contact_id')
    .eq('campaign_id', campaign.id)

  const campaignContactIds = new Set((campaignContacts || []).map(cc => cc.contact_id))
  const contactsInCampaign = (contacts || []).filter(c => campaignContactIds.has(c.id))

  console.log('\n📊 Company Segments:\n')
  const segments: Record<string, number> = {}
  ;(companies || []).forEach(c => {
    const seg = c.vertical || 'other'
    segments[seg] = (segments[seg] || 0) + 1
  })
  
  Object.entries(segments)
    .sort((a, b) => b[1] - a[1])
    .forEach(([seg, count]) => {
      console.log(`  ${seg}: ${count}`)
    })

  console.log(`\n  Total Companies: ${(companies || []).length}`)

  console.log('\n📧 Contact Status:\n')
  const withEmail = (contactsInCampaign || []).filter(
    c => c.email && c.email_status !== 'failed'
  ).length
  const withoutEmail = (contactsInCampaign || []).length - withEmail
  
  console.log(`  Total Contacts in Campaign: ${contactsInCampaign.length}`)
  console.log(`  With Email: ${withEmail}`)
  console.log(`  Without Email: ${withoutEmail}`)
  console.log(`  Email Success Rate: ${contactsInCampaign.length > 0 ? ((withEmail / contactsInCampaign.length) * 100).toFixed(1) : 0}%`)

  console.log('\n👥 Companies with Contacts:\n')
  const companiesWithContacts = new Set(
    (contactsInCampaign || []).map(c => c.company_id).filter(Boolean)
  )
  console.log(`  ${companiesWithContacts.size} companies have at least one contact`)
  const companiesWithoutContacts = (companies || []).filter(
    c => !companiesWithContacts.has(c.id)
  ).length
  console.log(`  ${companiesWithoutContacts} companies without contacts`)

  // Segment breakdown with contacts
  console.log('\n📈 Segment Breakdown with Contacts:\n')
  const segmentStats: Record<string, { companies: number; contacts: number; withEmail: number }> = {}
  
  ;(companies || []).forEach(c => {
    const seg = c.vertical || 'other'
    if (!segmentStats[seg]) {
      segmentStats[seg] = { companies: 0, contacts: 0, withEmail: 0 }
    }
    segmentStats[seg].companies++
    
    const segContacts = (contactsInCampaign || []).filter(
      contact => contact.company_id === c.id
    )
    segmentStats[seg].contacts += segContacts.length
    segmentStats[seg].withEmail += segContacts.filter(
      c => c.email && c.email_status !== 'failed'
    ).length
  })

  Object.entries(segmentStats)
    .sort((a, b) => b[1].companies - a[1].companies)
    .forEach(([seg, stats]) => {
      console.log(`  ${seg}:`)
      console.log(`    Companies: ${stats.companies}`)
      console.log(`    Contacts: ${stats.contacts}`)
      console.log(`    With Email: ${stats.withEmail}`)
    })
}

main().catch(console.error)
