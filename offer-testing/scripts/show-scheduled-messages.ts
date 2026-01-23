/**
 * Show what messages are scheduled in Supabase
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
  console.log('\n📊 Your Scheduled Messages in Supabase\n')

  // Get counts by status
  const { data: allMessages } = await supabase
    .from('messages')
    .select('status')

  const statusCounts = (allMessages || []).reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('📈 Status Breakdown:')
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`)
  })
  console.log('')

  // Get next 10 messages to send
  const { data: nextMessages } = await supabase
    .from('messages')
    .select(`
      scheduled_at,
      subject,
      personalization_used,
      contact:contacts(first_name, companies(name))
    `)
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true })
    .limit(10)

  console.log('📅 Next 10 Messages to Send:')
  console.log('')
  nextMessages?.forEach((m: any, idx) => {
    const date = new Date(m.scheduled_at)
    const formattedDate = date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    
    console.log(`${idx + 1}. ${formattedDate} ET`)
    console.log(`   Subject: "${m.subject}"`)
    console.log(`   Template: ${m.personalization_used?.Template || 'Unknown'}`)
    console.log(`   To: ${m.contact?.first_name} at ${m.contact?.companies?.name}`)
    console.log('')
  })

  console.log('💡 How it works:')
  console.log('   Railway cron runs every 5 minutes')
  console.log('   Checks: WHERE status=pending AND scheduled_at <= NOW()')
  console.log('   Sends 1 message per run via Unipile')
  console.log('   Updates status to "sent"')
}

main().catch(console.error)
