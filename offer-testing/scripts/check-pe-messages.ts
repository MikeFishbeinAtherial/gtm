/**
 * Check if PE firms got earnings emails (they shouldn't have)
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
  console.log('\n📊 Checking Messages by Vertical\n')

  const { data: messages } = await supabase
    .from('messages')
    .select(`
      id,
      contact_id,
      subject,
      personalization_used,
      status,
      contact:contacts!inner(
        id,
        email,
        first_name,
        companies!inner(
          name,
          vertical
        )
      )
    `)
    .eq('status', 'pending')

  const byVertical = (messages || []).reduce((acc, m: any) => {
    const vertical = m.contact?.companies?.vertical || 'unknown'
    acc[vertical] = acc[vertical] || []
    acc[vertical].push(m)
    return acc
  }, {} as Record<string, any[]>)

  console.log('📈 Pending Messages by Vertical:')
  Object.entries(byVertical)
    .sort(([, a], [, b]) => b.length - a.length)
    .forEach(([vertical, msgs]) => {
      console.log(`   ${vertical}: ${msgs.length} messages`)
    })
  console.log('')

  const peMessages = byVertical['private_equity'] || []
  const hedgeFundMessages = byVertical['hedge_fund'] || []

  if (peMessages.length > 0) {
    console.log('⚠️  WARNING: PE contacts got earnings emails (should be deleted):')
    peMessages.slice(0, 10).forEach((m: any) => {
      console.log(`   - ${m.contact.first_name} at ${m.contact.companies.name}`)
      console.log(`     Subject: ${m.subject}`)
      console.log(`     Message ID: ${m.id}`)
    })
    if (peMessages.length > 10) {
      console.log(`   ... and ${peMessages.length - 10} more`)
    }
    console.log('')
    console.log(`💡 Action needed: Delete ${peMessages.length} PE messages and recreate with sentiment email`)
  } else {
    console.log('✅ No PE firms got earnings emails (correct!)')
  }

  console.log('')
  console.log('📊 Summary:')
  console.log(`   - Total pending messages: ${messages?.length || 0}`)
  console.log(`   - Hedge fund messages: ${hedgeFundMessages.length}`)
  console.log(`   - PE messages (WRONG): ${peMessages.length}`)
  console.log(`   - Other verticals: ${messages!.length - hedgeFundMessages.length - peMessages.length}`)
}

main().catch(console.error)
