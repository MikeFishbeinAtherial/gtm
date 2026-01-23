/**
 * Check contact and company statistics
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
  console.log('\n📊 Contact & Company Statistics\n')

  // Get finance offer
  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('slug', 'finance')
    .single()

  if (!offer) {
    console.error('❌ Finance offer not found')
    process.exit(1)
  }

  // Get total companies
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, vertical')
    .eq('offer_id', offer.id)

  // Get contacts with emails
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, email, first_name, company_id, companies!inner(vertical, offer_id)')
    .not('email', 'is', null)
    .eq('companies.offer_id', offer.id)

  // Get messages already created
  const { data: messages } = await supabase
    .from('messages')
    .select('id, contact_id, personalization_used')

  const messageContactIds = new Set(messages?.map(m => m.contact_id) || [])
  const contactsWithoutMessages = contacts?.filter(c => !messageContactIds.has(c.id)) || []

  // Group by vertical
  const companiesByVertical = (companies || []).reduce((acc, c) => {
    const vertical = c.vertical || 'unknown'
    acc[vertical] = (acc[vertical] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const contactsByVertical = (contacts || []).reduce((acc, c: any) => {
    const vertical = c.companies?.vertical || 'unknown'
    acc[vertical] = (acc[vertical] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const unmessagedByVertical = contactsWithoutMessages.reduce((acc, c: any) => {
    const vertical = c.companies?.vertical || 'unknown'
    acc[vertical] = (acc[vertical] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('📈 Overall Stats:')
  console.log(`   Total companies: ${companies?.length || 0}`)
  console.log(`   Total contacts with emails: ${contacts?.length || 0}`)
  console.log(`   Messages already created: ${messages?.length || 0}`)
  console.log(`   Contacts WITHOUT messages: ${contactsWithoutMessages.length}`)
  console.log('')

  console.log('🏢 Companies by Vertical:')
  Object.entries(companiesByVertical)
    .sort(([, a], [, b]) => b - a)
    .forEach(([vertical, count]) => {
      console.log(`   ${vertical}: ${count}`)
    })
  console.log('')

  console.log('👥 Contacts with Emails by Vertical:')
  Object.entries(contactsByVertical)
    .sort(([, a], [, b]) => b - a)
    .forEach(([vertical, count]) => {
      console.log(`   ${vertical}: ${count}`)
    })
  console.log('')

  console.log('📭 Contacts WITHOUT Messages by Vertical:')
  Object.entries(unmessagedByVertical)
    .sort(([, a], [, b]) => b - a)
    .forEach(([vertical, count]) => {
      console.log(`   ${vertical}: ${count}`)
    })
  console.log('')

  console.log('💡 Summary:')
  console.log(`   - ${messages?.length || 0} contacts are scheduled for earnings analysis (V2/V3)`)
  console.log(`   - ${contactsWithoutMessages.length} contacts available for sentiment analysis email`)
  console.log(`   - PE firms should NOT get earnings emails, but CAN get sentiment emails`)
}

main().catch(console.error)
