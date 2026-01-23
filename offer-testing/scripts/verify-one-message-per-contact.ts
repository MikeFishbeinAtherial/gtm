/**
 * Verify each contact only has one message (no sequences)
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
  console.log('\n📧 Verifying One Message Per Contact\n')

  const { data: messages } = await supabase
    .from('messages')
    .select('contact_id, sequence_step, status, subject')
    .eq('status', 'pending')

  const contactCounts = (messages || []).reduce((acc, m) => {
    acc[m.contact_id] = (acc[m.contact_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const multipleMessages = Object.entries(contactCounts).filter(([, count]) => count > 1)

  console.log('📊 Message Distribution:')
  console.log(`   Total contacts with messages: ${Object.keys(contactCounts).length}`)
  console.log(`   Contacts with 1 message: ${Object.values(contactCounts).filter(c => c === 1).length}`)
  console.log(`   Contacts with multiple messages: ${multipleMessages.length}`)
  console.log('')

  if (multipleMessages.length > 0) {
    console.log('⚠️  WARNING: Some contacts have multiple messages (sequences detected):')
    multipleMessages.slice(0, 10).forEach(([contactId, count]) => {
      const contactMessages = messages?.filter(m => m.contact_id === contactId) || []
      console.log(`   Contact ${contactId.slice(0, 8)}...: ${count} messages`)
      contactMessages.forEach(m => {
        console.log(`     - Step ${m.sequence_step}: "${m.subject}"`)
      })
    })
    
    if (multipleMessages.length > 10) {
      console.log(`   ... and ${multipleMessages.length - 10} more contacts with multiple messages`)
    }
  } else {
    console.log('✅ Perfect! All contacts have exactly 1 message (no sequences)')
  }
}

main().catch(console.error)
