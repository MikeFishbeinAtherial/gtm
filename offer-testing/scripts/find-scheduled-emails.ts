/**
 * Find where scheduled emails are stored
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
  console.log('\n📧 Finding Scheduled Emails\n')

  const campaignIds = [
    '61abfc55-856e-4d78-80d0-8baa5e4643e8', // finance-leadgen-1000
    'c1654101-a9a8-4c24-97ed-3323d7640f58' // finance-fi-company-enrichment
  ]

  // Check messages table
  const { data: messages, count: messageCount } = await supabase
    .from('messages')
    .select('id, campaign_id, status, scheduled_at', { count: 'exact' })
    .in('campaign_id', campaignIds)

  console.log(`\n📊 Messages Table:`)
  console.log(`   Total: ${messageCount || 0}`)
  
  const byStatus = (messages || []).reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`)
  })

  // Check send_queue table
  try {
    const { data: queueItems, count: queueCount } = await supabase
      .from('send_queue')
      .select('id, campaign_id, status, scheduled_for', { count: 'exact' })
      .in('campaign_id', campaignIds)

    console.log(`\n📊 Send Queue Table:`)
    console.log(`   Total: ${queueCount || 0}`)
    
    if (queueItems && queueItems.length > 0) {
      const byStatus = queueItems.reduce((acc, q) => {
        acc[q.status] = (acc[q.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`)
      })
    }
  } catch (error: any) {
    console.log(`\n📊 Send Queue Table: Does not exist or error: ${error.message}`)
  }

  // Check pending messages specifically
  const { data: pendingMessages } = await supabase
    .from('messages')
    .select('campaign_id, subject, scheduled_at')
    .in('campaign_id', campaignIds)
    .eq('status', 'pending')
    .order('scheduled_at')
    .limit(5)

  if (pendingMessages && pendingMessages.length > 0) {
    console.log(`\n📅 Sample Pending Messages:`)
    pendingMessages.forEach((m, idx) => {
      const campaign = m.campaign_id === campaignIds[0] ? 'finance-leadgen-1000' : 'finance-fi-company-enrichment'
      console.log(`   ${idx + 1}. ${campaign}: "${m.subject}"`)
      console.log(`      Scheduled: ${m.scheduled_at}`)
    })
  }
}

main().catch(console.error)
