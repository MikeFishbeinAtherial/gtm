/**
 * Debug why emails scheduled for past haven't been sent
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
  console.log('\n🔍 Debugging Unsent Emails\n')
  console.log(`Current time: ${new Date().toISOString()}`)
  console.log(`Current time ET: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET\n`)

  // Get finance campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('name', 'finance-fi-company-enrichment')
    .single()

  if (!campaign) {
    console.error('❌ Campaign not found')
    return
  }

  // Get send_queue items scheduled for past
  const now = new Date().toISOString()
  const { data: pastDue } = await supabase
    .from('send_queue')
    .select(`
      id,
      status,
      scheduled_for,
      subject,
      account_id,
      contact_id,
      last_error,
      accounts(id, unipile_account_id),
      contacts(email, first_name)
    `)
    .eq('campaign_id', campaign.id)
    .lte('scheduled_for', now)
    .order('scheduled_for')
    .limit(10)

  console.log(`📅 Emails Scheduled for Past: ${pastDue?.length || 0}\n`)

  if (pastDue && pastDue.length > 0) {
    pastDue.forEach((q: any, idx) => {
      const scheduled = new Date(q.scheduled_for)
      const hoursAgo = Math.floor((Date.now() - scheduled.getTime()) / (1000 * 60 * 60))
      const minutesAgo = Math.floor((Date.now() - scheduled.getTime()) / (1000 * 60))
      
      console.log(`${idx + 1}. "${q.subject}"`)
      console.log(`   Scheduled: ${q.scheduled_for}`)
      console.log(`   Scheduled ET: ${scheduled.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`)
      console.log(`   ${hoursAgo}h ${minutesAgo % 60}m ago`)
      console.log(`   Status: ${q.status}`)
      console.log(`   Account ID: ${q.account_id}`)
      console.log(`   Unipile Account: ${q.accounts?.unipile_account_id || 'missing'}`)
      console.log(`   Contact: ${q.contacts?.first_name} (${q.contacts?.email})`)
      if (q.last_error) {
        console.log(`   Error: ${q.last_error}`)
      }
      console.log('')
    })
  }

  // Check if Railway cron is configured
  console.log('\n🔧 Railway Cron Check:')
  console.log('   Check Railway dashboard for:')
  console.log('   1. Cron job running every 5 minutes')
  console.log('   2. process-message-queue.js executing')
  console.log('   3. Any errors in logs')
  console.log('')
  console.log('   Command should be: node scripts/process-message-queue.js')
  console.log('   Or: npx ts-node scripts/process-message-queue.js')

  // Check account activity
  const { data: recentActivity } = await supabase
    .from('account_activity')
    .select('created_at, action_type, status')
    .order('created_at', { ascending: false })
    .limit(10)

  console.log('\n📊 Recent Account Activity:')
  if (recentActivity && recentActivity.length > 0) {
    recentActivity.forEach((a, idx) => {
      const time = new Date(a.created_at)
      const hoursAgo = Math.floor((Date.now() - time.getTime()) / (1000 * 60 * 60))
      console.log(`   ${idx + 1}. ${a.action_type} - ${a.status} (${hoursAgo}h ago)`)
    })
  } else {
    console.log('   No recent activity - Railway cron may not be running')
  }
}

main().catch(console.error)
