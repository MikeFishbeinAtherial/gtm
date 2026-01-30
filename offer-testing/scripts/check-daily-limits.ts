/**
 * Check if daily limits (20/day per account) are being enforced
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

function formatDateET(date: Date): string {
  return date.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })
}

async function main() {
  console.log('\n📊 Checking Daily Limits per Account\n')

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

  if (!queueItems || queueItems.length === 0) {
    console.log('✅ No pending items')
    return
  }

  // Group by account and ET date
  const byAccountAndDate = new Map<string, Map<string, number>>()

  for (const item of queueItems) {
    const account = (item as any).accounts.name
    const scheduled = new Date(item.scheduled_for)
    const dateKey = formatDateET(scheduled)

    if (!byAccountAndDate.has(account)) {
      byAccountAndDate.set(account, new Map())
    }

    const dateMap = byAccountAndDate.get(account)!
    dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1)
  }

  console.log('Daily counts per account:\n')
  let violations = 0

  for (const [account, dateMap] of byAccountAndDate.entries()) {
    console.log(`${account}:`)
    for (const [date, count] of Array.from(dateMap.entries()).sort()) {
      const status = count > 20 ? '❌' : '✅'
      console.log(`  ${date}: ${count} messages ${status}`)
      if (count > 20) violations++
    }
    console.log('')
  }

  if (violations > 0) {
    console.log(`⚠️  Found ${violations} days exceeding 20/day limit`)
    console.log('   Run fix-daily-limits script to reschedule')
  } else {
    console.log('✅ All days respect 20/day limit')
  }
}

main().catch(console.error)
