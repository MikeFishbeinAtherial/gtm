/**
 * Fix send_queue items that are scheduled outside business hours
 * Reschedules them to next business day 9 AM ET
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

const CAMPAIGN_ID = '926752dc-d0f6-4084-9610-680a26b81080'

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

function moveToNextBusinessMorningET(date: Date): Date {
  const { hour, dayOfWeek } = getETParts(date)
  
  let daysToAdd = 0
  if (dayOfWeek === 6) {
    daysToAdd = 2
  } else if (dayOfWeek === 7) {
    daysToAdd = 1
  } else if (hour >= 18) {
    daysToAdd = 1
    if (dayOfWeek === 5) daysToAdd = 3
  } else {
    daysToAdd = 1
    if (dayOfWeek === 5) daysToAdd = 3
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
  console.log('\n🕐 Fixing send_queue business hours\n')

  // Get all pending send_queue items
  const { data: queueItems } = await supabase
    .from('send_queue')
    .select('id, scheduled_for, status')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('channel', 'email')
    .eq('status', 'pending')

  if (!queueItems || queueItems.length === 0) {
    console.log('✅ No pending items to fix')
    return
  }

  console.log(`📋 Checking ${queueItems.length} pending items\n`)

  let fixed = 0
  for (const item of queueItems) {
    if (!item.scheduled_for) continue
    
    const scheduled = new Date(item.scheduled_for)
    
    if (!inBusinessHoursET(scheduled)) {
      const newTime = moveToNextBusinessMorningET(scheduled)
      
      const { error } = await supabase
        .from('send_queue')
        .update({ scheduled_for: newTime.toISOString() })
        .eq('id', item.id)

      if (error) {
        console.error(`❌ Failed to update ${item.id}: ${error.message}`)
        continue
      }

      fixed++
    }
  }

  console.log(`\n✅ Fixed ${fixed} items scheduled outside business hours`)
  console.log(`   All items now scheduled 9 AM - 6 PM ET, Mon-Fri`)
}

main().catch(console.error)
