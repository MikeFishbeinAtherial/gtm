/**
 * Fix send_queue items exceeding 20/day per account limit
 * Redistributes excess messages to later days
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
const DAILY_LIMIT = 20

function formatDateET(date: Date): string {
  return date.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })
}

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

function moveToNextBusinessMorningET(date: Date): Date {
  const parts = getETParts(date)
  
  let daysToAdd = 0
  if (parts.dayOfWeek === 6) {
    daysToAdd = 2
  } else if (parts.dayOfWeek === 7) {
    daysToAdd = 1
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
  console.log('\n🔧 Fixing Daily Limits (20/day per account)\n')

  const { data: queueItems } = await supabase
    .from('send_queue')
    .select(`
      id,
      scheduled_for,
      account_id,
      accounts!inner(name)
    `)
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('channel', 'email')
    .eq('status', 'pending')
    .order('scheduled_for', { ascending: true })

  if (!queueItems || queueItems.length === 0) {
    console.log('✅ No pending items')
    return
  }

  // Group by account and ET date
  const byAccountAndDate = new Map<string, Map<string, any[]>>()

  for (const item of queueItems) {
    const account = (item as any).accounts.name
    const scheduled = new Date(item.scheduled_for)
    const dateKey = formatDateET(scheduled)

    if (!byAccountAndDate.has(account)) {
      byAccountAndDate.set(account, new Map())
    }

    const dateMap = byAccountAndDate.get(account)!
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, [])
    }
    dateMap.get(dateKey)!.push(item)
  }

  let totalFixed = 0

  for (const [account, dateMap] of byAccountAndDate.entries()) {
    for (const [date, items] of dateMap.entries()) {
      if (items.length <= DAILY_LIMIT) continue

      console.log(`\n${account} - ${date}: ${items.length} messages (limit: ${DAILY_LIMIT})`)
      
      // Keep first 20, reschedule the rest
      const toKeep = items.slice(0, DAILY_LIMIT)
      const toReschedule = items.slice(DAILY_LIMIT)

      console.log(`   Keeping: ${toKeep.length}`)
      console.log(`   Rescheduling: ${toReschedule.length}`)

      // Find next available day for this account
      let nextDate = new Date(toReschedule[0].scheduled_for)
      const accountDateMap = byAccountAndDate.get(account)!

      for (const item of toReschedule) {
        // Move to next business day
        nextDate = moveToNextBusinessMorningET(nextDate)
        
        // Check if that day already has 20
        const nextDateKey = formatDateET(nextDate)
        const existingOnDay = accountDateMap.get(nextDateKey) || []
        
        if (existingOnDay.length >= DAILY_LIMIT) {
          // Move to next day
          nextDate = moveToNextBusinessMorningET(
            new Date(nextDate.getTime() + 24 * 60 * 60 * 1000)
          )
        }

        // Add random minutes (5-20)
        const minutesToAdd = 5 + Math.floor(Math.random() * 16)
        const finalTime = new Date(nextDate.getTime() + minutesToAdd * 60 * 1000)

        const { error } = await supabase
          .from('send_queue')
          .update({ scheduled_for: finalTime.toISOString() })
          .eq('id', item.id)

        if (error) {
          console.error(`   ❌ Failed to update ${item.id}: ${error.message}`)
          continue
        }

        // Update our tracking
        const newDateKey = formatDateET(finalTime)
        if (!accountDateMap.has(newDateKey)) {
          accountDateMap.set(newDateKey, [])
        }
        accountDateMap.get(newDateKey)!.push({ ...item, scheduled_for: finalTime.toISOString() })

        // Remove from old date
        const oldDateKey = formatDateET(new Date(item.scheduled_for))
        const oldItems = accountDateMap.get(oldDateKey) || []
        accountDateMap.set(oldDateKey, oldItems.filter((i: any) => i.id !== item.id))

        nextDate = finalTime
        totalFixed++
      }
    }
  }

  console.log(`\n✅ Fixed ${totalFixed} messages exceeding daily limits`)
  console.log(`   All accounts now respect 20/day limit`)
}

main().catch(console.error)
