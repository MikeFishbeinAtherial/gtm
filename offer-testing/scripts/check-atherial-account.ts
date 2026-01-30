/**
 * Check mike@atherial.ai account configuration and scheduled messages
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

const ATHERIAL_ACCOUNT_ID = '0pKp3VL5TGSAMQpg-eNC7A'

function formatDateET(date: Date): string {
  return date.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function getETParts(date: Date): { hour: number; dayOfWeek: number } {
  const hour = parseInt(date.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }))
  const dayName = date.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'long' })
  const dayMap: Record<string, number> = {
    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
    'Friday': 5, 'Saturday': 6, 'Sunday': 7
  }
  return { hour, dayOfWeek: dayMap[dayName] || 1 }
}

function inBusinessHoursET(date: Date): boolean {
  const { hour, dayOfWeek } = getETParts(date)
  return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 18
}

async function main() {
  console.log('\n📧 Checking mike@atherial.ai Account\n')

  // Find account by unipile_account_id
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('unipile_account_id', ATHERIAL_ACCOUNT_ID)
    .single()

  if (accountError || !account) {
    console.log('⚠️  Account not found in database')
    console.log('   This account may need to be upserted')
    console.log(`   Unipile Account ID: ${ATHERIAL_ACCOUNT_ID}`)
    return
  }

  console.log('Account Configuration:')
  console.log(`  ID: ${account.id}`)
  console.log(`  Name: ${account.name || 'N/A'}`)
  console.log(`  Email: ${account.email_address || 'N/A'}`)
  console.log(`  Unipile Account ID: ${account.unipile_account_id}`)
  console.log(`  Daily Limit: ${account.daily_limit_emails || 'NOT SET'} emails/day`)
  console.log(`  Type: ${account.type || 'N/A'}`)
  console.log('')

  // Check send_queue for this account
  const { data: queueItems } = await supabase
    .from('send_queue')
    .select(`
      id,
      scheduled_for,
      status,
      channel
    `)
    .eq('account_id', account.id)
    .eq('channel', 'email')
    .order('scheduled_for', { ascending: true })

  if (!queueItems || queueItems.length === 0) {
    console.log('✅ No pending messages scheduled from this account')
    return
  }

  console.log(`📋 Found ${queueItems.length} messages scheduled from this account\n`)

  // Group by date
  const byDate = new Map<string, any[]>()
  let outsideBusinessHours = 0

  for (const item of queueItems) {
    if (item.status !== 'pending') continue
    
    const scheduled = new Date(item.scheduled_for)
    const dateKey = formatDateET(scheduled).split(',')[0] // Just the date part

    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, [])
    }
    byDate.get(dateKey)!.push(item)

    if (!inBusinessHoursET(scheduled)) {
      outsideBusinessHours++
    }
  }

  console.log('Daily counts:')
  let violations = 0
  for (const [date, items] of Array.from(byDate.entries()).sort()) {
    const count = items.length
    const status = count > 20 ? '❌' : '✅'
    console.log(`  ${date}: ${count} messages ${status}`)
    if (count > 20) violations++
  }

  console.log('')
  if (violations > 0) {
    console.log(`⚠️  Found ${violations} days exceeding 20/day limit`)
  } else {
    console.log('✅ All days respect 20/day limit')
  }

  if (outsideBusinessHours > 0) {
    console.log(`⚠️  Found ${outsideBusinessHours} messages scheduled outside business hours (9 AM - 6 PM ET, Mon-Fri)`)
  } else {
    console.log('✅ All messages scheduled within business hours')
  }

  // Show some examples of scheduled times
  if (queueItems.length > 0) {
    console.log('\nSample scheduled times:')
    const pending = queueItems.filter((q: any) => q.status === 'pending').slice(0, 5)
    for (const item of pending) {
      const scheduled = new Date(item.scheduled_for)
      const etTime = formatDateET(scheduled)
      const inHours = inBusinessHoursET(scheduled) ? '✅' : '❌'
      console.log(`  ${etTime} ${inHours}`)
    }
  }
}

main().catch(console.error)
