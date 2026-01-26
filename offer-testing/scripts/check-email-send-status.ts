/**
 * Check if any finance emails have been sent
 * Checks: Supabase messages, send_queue, and Unipile API
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkUnipile() {
  if (!UNIPILE_API_KEY) {
    console.log('⚠️  UNIPILE_API_KEY not set, skipping Unipile check')
    return null
  }

  try {
    const response = await fetch('https://api.unipile.com/v1/emails', {
      headers: {
        'Authorization': `Bearer ${UNIPILE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.log(`⚠️  Unipile API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.log(`⚠️  Error checking Unipile: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('\n📧 Checking Email Send Status\n')
  console.log(`Current time: ${new Date().toISOString()}\n`)

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

  console.log(`Campaign: ${campaign.name} (${campaign.id})\n`)

  // Check send_queue status
  const { data: queueItems } = await supabase
    .from('send_queue')
    .select('id, status, scheduled_for, sent_at, subject, external_message_id')
    .eq('campaign_id', campaign.id)
    .order('scheduled_for')

  const byStatus = (queueItems || []).reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('📬 Send Queue Status:')
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`)
  })

  // Check scheduled vs sent
  const now = new Date()
  const scheduled = queueItems?.filter(q => new Date(q.scheduled_for) <= now) || []
  const sent = queueItems?.filter(q => q.status === 'sent') || []
  const pending = queueItems?.filter(q => q.status === 'pending' && new Date(q.scheduled_for) <= now) || []

  console.log(`\n📅 Scheduling Analysis:`)
  console.log(`   Total items: ${queueItems?.length || 0}`)
  console.log(`   Scheduled for past: ${scheduled.length}`)
  console.log(`   Status = sent: ${sent.length}`)
  console.log(`   Status = pending (should have sent): ${pending.length}`)

  if (pending.length > 0) {
    console.log(`\n⚠️  ${pending.length} emails scheduled for past but still pending:`)
    pending.slice(0, 5).forEach(q => {
      const scheduledDate = new Date(q.scheduled_for)
      const hoursAgo = Math.floor((now.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60))
      console.log(`   - "${q.subject}" scheduled ${hoursAgo}h ago (${q.scheduled_for})`)
    })
  }

  // Check messages table
  const { data: messages } = await supabase
    .from('messages')
    .select('id, status, sent_at, subject, external_id')
    .eq('campaign_id', campaign.id)

  const messagesByStatus = (messages || []).reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log(`\n📧 Messages Table:`)
  Object.entries(messagesByStatus).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`)
  })

  const sentMessages = messages?.filter(m => m.status === 'sent') || []
  if (sentMessages.length > 0) {
    console.log(`\n✅ Sent Messages:`)
    sentMessages.forEach(m => {
      console.log(`   - "${m.subject}" sent at ${m.sent_at}`)
      if (m.external_id) {
        console.log(`     Unipile ID: ${m.external_id}`)
      }
    })
  }

  // Check Unipile API
  console.log(`\n🔍 Checking Unipile API...`)
  const unipileData = await checkUnipile()
  if (unipileData) {
    console.log(`✅ Unipile API response received`)
    if (unipileData.emails || unipileData.data) {
      const emails = unipileData.emails || unipileData.data || []
      console.log(`   Found ${emails.length} emails in Unipile`)
      if (emails.length > 0) {
        emails.slice(0, 5).forEach((email: any) => {
          console.log(`   - To: ${email.to || email.recipient}`)
          console.log(`     Subject: ${email.subject}`)
          console.log(`     Sent: ${email.sent_at || email.created_at}`)
        })
      }
    }
  }

  // Summary
  console.log(`\n\n📊 Summary:`)
  console.log(`   Send queue pending (past due): ${pending.length}`)
  console.log(`   Send queue sent: ${sent.length}`)
  console.log(`   Messages table sent: ${sentMessages.length}`)
  
  if (pending.length > 0 && sent.length === 0) {
    console.log(`\n⚠️  WARNING: ${pending.length} emails are scheduled for the past but haven't been sent`)
    console.log(`   Possible issues:`)
    console.log(`   1. Railway cron not running`)
    console.log(`   2. process-message-queue.js not executing`)
    console.log(`   3. Unipile API errors`)
    console.log(`   4. Account spacing preventing sends`)
  } else if (sent.length > 0) {
    console.log(`\n✅ Emails have been sent!`)
  }
}

main().catch(console.error)
