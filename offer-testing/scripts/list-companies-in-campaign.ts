/**
 * List all companies getting emails in this campaign
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
  console.log('\n🏢 Companies Receiving Emails\n')

  // Get all contacts with messages
  const { data: contacts } = await supabase
    .from('contacts')
    .select(`
      id,
      first_name,
      email,
      company_id,
      companies!inner(
        id,
        name,
        vertical,
        lead_source
      )
    `)
    .not('email', 'is', null)

  // Get message contact IDs
  const { data: messages } = await supabase
    .from('messages')
    .select('contact_id')
    .eq('status', 'pending')

  const messageContactIds = new Set(messages?.map(m => m.contact_id) || [])

  // Filter to only contacts with messages
  const contactsWithMessages = contacts?.filter(c => messageContactIds.has(c.id)) || []

  // Group by vertical
  const byVertical = contactsWithMessages.reduce((acc, c: any) => {
    const vertical = c.companies?.vertical || 'unknown'
    if (!acc[vertical]) acc[vertical] = []
    acc[vertical].push({
      name: c.companies.name,
      contact: c.first_name,
      lead_source: c.companies.lead_source
    })
    return acc
  }, {} as Record<string, any[]>)

  // Show all verticals
  console.log('📊 Breakdown by Vertical:\n')
  Object.entries(byVertical)
    .sort(([, a], [, b]) => b.length - a.length)
    .forEach(([vertical, companies]) => {
      console.log(`\n${vertical}: ${companies.length} contacts`)
      
      // Show first 10
      companies.slice(0, 10).forEach((c, idx) => {
        console.log(`  ${idx + 1}. ${c.contact} at ${c.name} (source: ${c.lead_source || 'unknown'})`)
      })
      
      if (companies.length > 10) {
        console.log(`  ... and ${companies.length - 10} more`)
      }
    })

  console.log('\n\n🎯 ICP Analysis:')
  const goodVerticals = ['hedge_fund', 'private_equity', 'investment_firm', 'asset_manager']
  const goodCount = goodVerticals.reduce((sum, v) => sum + (byVertical[v]?.length || 0), 0)
  const totalCount = contactsWithMessages.length

  console.log(`  Good ICP: ${goodCount} / ${totalCount} (${Math.round((goodCount / totalCount) * 100)}%)`)
  console.log(`  Needs review: ${totalCount - goodCount} contacts`)

  // Check lead sources
  console.log('\n\n📍 Lead Sources:')
  const bySources = contactsWithMessages.reduce((acc, c: any) => {
    const source = c.companies?.lead_source || 'unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  Object.entries(bySources)
    .sort(([, a], [, b]) => b - a)
    .forEach(([source, count]) => {
      console.log(`  ${source}: ${count} contacts`)
    })
}

main().catch(console.error)
