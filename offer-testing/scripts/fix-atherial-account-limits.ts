/**
 * Fix mike@atherial.ai account:
 * 1. Set daily_limit_emails to 20
 * 2. Fix messages scheduled outside business hours
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
const DAILY_LIMIT = 20

function getETParts(date: Date): { hour: number; dayOfWeek: number; year: number; month: number; dayOfMonth: number } {
  const hour = parseInt(date.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }))
  const dayName = date.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'long' })
  const dayMap: Record<string, number> = {
    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
    'Friday': 5, 'Saturday': 6, 'Sunday': 7
  }
  const dateStr = date.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })
  const [month, day, year] = dateStr.split('/').map(Number)
  
  return {
    hour,
    dayOfWeek: dayMap[dayName] || 1,
    year,
    month: month - 1,
    dayOfMonth: day
  }
}

function inBusinessHoursET(date: Date): boolean {
  const { hour, dayOfWeek } = getETParts(date)
  return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 18
}

function moveToNextBusinessMorningET(date: Date): Date {
  const parts = getETParts(date)
  
  let daysToAdd = 0
  if (parts.dayOfWeek === 6) {
    daysToAdd = 2
  } else if (parts.dayOfWeek === 7) {
    daysToAdd = 1
  } else if (parts.hour >= 18) {
    daysToAdd = 1
    if (parts.dayOfWeek === 5) daysToAdd = 3
  } else {
    daysToAdd = 1
    if (parts.dayOfWeek === 5) daysToAdd = 3
  }
  
  let candidate = new Date(date)
  candidate.setUTCDate(candidate.getUTCDate() + daysToAdd)
  
  const targetETDate = candidate.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })
  const [month, day, year] = targetETDate.split('/').map(Number)
  
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T09:00:00`
  
  let testDate = new Date(`${dateStr}-05:00`)
  let testParts = getETParts(testDate)
  if (testParts.hour === 9 && testParts.dayOfWeek === getETParts(candidate).dayOfWeek) {
    return testDate
  }
  
  testDate = new Date(`${dateStr}-04:00`)
  testParts = getETParts(testDate)
  if (testParts.hour === 9 && testParts.dayOfWeek === getETParts(candidate).dayOfWeek) {
    return testDate
  }
  
  return new Date(`${dateStr}-05:00`)
}

async function main() {
  console.log('\n🔧 Fixing mike@atherial.ai Account Limits\n')

  // Step 1: Update daily limit
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('unipile_account_id', ATHERIAL_ACCOUNT_ID)
    .single()

  if (accountError || !account) {
    console.error('❌ Account not found:', accountError?.message)
    return
  }

  console.log(`Current daily limit: ${account.daily_limit_emails || 'NOT SET'}`)
  
  const { error: updateError } = await supabase
    .from('accounts')
    .update({ daily_limit_emails: DAILY_LIMIT })
    .eq('id', account.id)

  if (updateError) {
    console.error('❌ Failed to update daily limit:', updateError.message)
    return
  }

  console.log(`✅ Updated daily limit to ${DAILY_LIMIT} emails/day\n`)

  // Step 2: Fix messages outside business hours
  const { data: queueItems } = await supabase
    .from('send_queue')
    .select('id, scheduled_for, status')
    .eq('account_id', account.id)
    .eq('channel', 'email')
    .eq('status', 'pending')
    .order('scheduled_for', { ascending: true })

  if (!queueItems || queueItems.length === 0) {
    console.log('✅ No pending messages to fix')
    return
  }

  let fixed = 0
  for (const item of queueItems) {
    const scheduled = new Date(item.scheduled_for)
    
    if (!inBusinessHoursET(scheduled)) {
      const newTime = moveToNextBusinessMorningET(scheduled)
      
      // Add random minutes (5-20)
      const minutesToAdd = 5 + Math.floor(Math.random() * 16)
      const finalTime = new Date(newTime.getTime() + minutesToAdd * 60 * 1000)
      
      const { error } = await supabase
        .from('send_queue')
        .update({ scheduled_for: finalTime.toISOString() })
        .eq('id', item.id)

      if (error) {
        console.error(`❌ Failed to update ${item.id}: ${error.message}`)
        continue
      }

      fixed++
    }
  }

  console.log(`✅ Fixed ${fixed} messages scheduled outside business hours`)
  console.log(`   All messages now scheduled 9 AM - 6 PM ET, Mon-Fri`)
}

main().catch(console.error)
