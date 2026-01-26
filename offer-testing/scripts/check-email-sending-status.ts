/**
 * Comprehensive check of email sending status
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

const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY
const UNIPILE_DSN = process.env.UNIPILE_DSN
const UNIPILE_EMAIL_ACCOUNT_ID = process.env.UNIPILE_EMAIL_ACCOUNT_ID

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkUnipileAccount() {
  console.log('\n🔍 Checking Unipile Account Status\n')
  console.log(`Email Account ID: ${UNIPILE_EMAIL_ACCOUNT_ID || 'NOT SET'}`)
  console.log(`DSN: ${UNIPILE_DSN || 'NOT SET'}\n`)

  if (!UNIPILE_API_KEY || !UNIPILE_DSN) {
    console.error('❌ Missing UNIPILE_API_KEY or UNIPILE_DSN')
    return null
  }

  try {
    // Check account status
    const response = await fetch(`${UNIPILE_DSN}/accounts`, {
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Unipile API error: ${response.status} ${response.statusText}`)
      console.error(`   ${errorText}`)
      return null
    }

    const data = await response.json()
    const accounts = Array.isArray(data) ? data : data.items || []

    console.log(`📋 Found ${accounts.length} accounts:\n`)

    const emailAccount = accounts.find((acc: any) => 
      acc.id === UNIPILE_EMAIL_ACCOUNT_ID ||
      (acc.provider === 'GOOGLE_OAUTH' && acc.email_address?.includes('atherial'))
    )

    if (emailAccount) {
      console.log(`✅ Email Account Found:`)
      console.log(`   ID: ${emailAccount.id}`)
      console.log(`   Name: ${emailAccount.name || emailAccount.email_address || 'N/A'}`)
      console.log(`   Provider: ${emailAccount.provider || emailAccount.type || 'N/A'}`)
      console.log(`   Status: ${emailAccount.status || 'unknown'}`)
      
      if (emailAccount.id !== UNIPILE_EMAIL_ACCOUNT_ID) {
        console.log(`\n⚠️  WARNING: Account ID mismatch!`)
        console.log(`   Expected: ${UNIPILE_EMAIL_ACCOUNT_ID}`)
        console.log(`   Found: ${emailAccount.id}`)
      }
    } else {
      console.log(`❌ Email account not found!`)
      console.log(`   Looking for: ${UNIPILE_EMAIL_ACCOUNT_ID}`)
      console.log(`\nAvailable accounts:`)
      accounts.forEach((acc: any) => {
        console.log(`   - ${acc.provider || acc.type}: ${acc.id} (${acc.name || acc.email_address || 'N/A'})`)
      })
    }

    return emailAccount
  } catch (error: any) {
    console.error(`❌ Error checking Unipile: ${error.message}`)
    return null
  }
}

async function checkSendQueue() {
  console.log('\n📬 Checking Send Queue Status\n')

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

  console.log(`Campaign: ${campaign.name}\n`)

  // Check pending items scheduled for past
  const now = new Date().toISOString()
  const { data: pendingPast } = await supabase
    .from('send_queue')
    .select(`
      id,
      status,
      scheduled_for,
      last_error,
      subject,
      account_id,
      accounts(unipile_account_id, email_address, name)
    `)
    .eq('campaign_id', campaign.id)
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('scheduled_for')
    .limit(10)

  console.log(`📅 Pending items scheduled for past: ${pendingPast?.length || 0}\n`)

  if (pendingPast && pendingPast.length > 0) {
    pendingPast.forEach((item: any, idx) => {
      const scheduled = new Date(item.scheduled_for)
      const hoursAgo = Math.floor((Date.now() - scheduled.getTime()) / (1000 * 60 * 60))
      console.log(`${idx + 1}. "${item.subject}"`)
      console.log(`   Scheduled: ${item.scheduled_for} (${hoursAgo}h ago)`)
      console.log(`   Account ID: ${item.account_id}`)
      console.log(`   Unipile Account: ${item.accounts?.unipile_account_id || 'MISSING'}`)
      if (item.last_error) {
        console.log(`   Last Error: ${item.last_error}`)
      }
      console.log('')
    })
  }

  // Check failed items
  const { data: failed } = await supabase
    .from('send_queue')
    .select('id, status, last_error, subject, scheduled_for')
    .eq('campaign_id', campaign.id)
    .eq('status', 'failed')
    .order('scheduled_for', { ascending: false })
    .limit(5)

  console.log(`\n❌ Failed items: ${failed?.length || 0}\n`)

  if (failed && failed.length > 0) {
    failed.forEach((item: any, idx) => {
      console.log(`${idx + 1}. "${item.subject}"`)
      console.log(`   Error: ${item.last_error}`)
      console.log('')
    })
  }

  // Check sent items
  const { data: sent } = await supabase
    .from('send_queue')
    .select('id, status, sent_at, subject')
    .eq('campaign_id', campaign.id)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(5)

  console.log(`\n✅ Sent items: ${sent?.length || 0}\n`)

  if (sent && sent.length > 0) {
    sent.forEach((item: any, idx) => {
      const sentDate = new Date(item.sent_at)
      const hoursAgo = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60))
      console.log(`${idx + 1}. "${item.subject}"`)
      console.log(`   Sent: ${item.sent_at} (${hoursAgo}h ago)`)
      console.log('')
    })
  }
}

async function checkAccountActivity() {
  console.log('\n📊 Recent Account Activity\n')

  const { data: activity } = await supabase
    .from('account_activity')
    .select('created_at, action_type, status, error_message')
    .order('created_at', { ascending: false })
    .limit(10)

  if (activity && activity.length > 0) {
    activity.forEach((a: any, idx) => {
      const time = new Date(a.created_at)
      const hoursAgo = Math.floor((Date.now() - time.getTime()) / (1000 * 60 * 60))
      const statusIcon = a.status === 'success' ? '✅' : a.status === 'failed' ? '❌' : '⚠️'
      console.log(`${idx + 1}. ${statusIcon} ${a.action_type} - ${a.status} (${hoursAgo}h ago)`)
      if (a.error_message) {
        console.log(`   Error: ${a.error_message.substring(0, 100)}`)
      }
    })
  } else {
    console.log('No recent activity found')
  }
}

async function main() {
  console.log('🔍 Comprehensive Email Sending Status Check\n')
  console.log(`Current time: ${new Date().toISOString()}`)
  console.log(`Current time ET: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET\n`)

  // Check environment
  console.log('🔧 Environment Variables:')
  console.log(`   UNIPILE_EMAIL_ACCOUNT_ID: ${UNIPILE_EMAIL_ACCOUNT_ID || 'NOT SET'}`)
  console.log(`   UNIPILE_DSN: ${UNIPILE_DSN || 'NOT SET'}`)
  console.log(`   UNIPILE_API_KEY: ${UNIPILE_API_KEY ? 'SET' : 'NOT SET'}\n`)

  await checkUnipileAccount()
  await checkSendQueue()
  await checkAccountActivity()

  console.log('\n💡 Next Steps:')
  console.log('   1. Check Railway logs: railway logs')
  console.log('   2. Verify Railway has UNIPILE_EMAIL_ACCOUNT_ID set')
  console.log('   3. Check if cron is running: railway logs --tail 50')
}

main().catch(console.error)
