/**
 * Check which campaign the send_queue items belong to
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
  console.log('\n📊 Send Queue by Campaign\n')

  const campaignIds = [
    '61abfc55-856e-4d78-80d0-8baa5e4643e8', // finance-leadgen-1000
    'c1654101-a9a8-4c24-97ed-3323d7640f58' // finance-fi-company-enrichment
  ]

  const { data: queueItems } = await supabase
    .from('send_queue')
    .select('campaign_id, status, subject')
    .in('campaign_id', campaignIds)

  const byCampaign = (queueItems || []).reduce((acc, q) => {
    const campaignName = q.campaign_id === campaignIds[0] 
      ? 'finance-leadgen-1000' 
      : 'finance-fi-company-enrichment'
    
    if (!acc[campaignName]) {
      acc[campaignName] = { pending: 0, failed: 0, total: 0 }
    }
    
    acc[campaignName][q.status] = (acc[campaignName][q.status] || 0) + 1
    acc[campaignName].total++
    return acc
  }, {} as Record<string, any>)

  console.log('📊 Send Queue Breakdown:\n')
  Object.entries(byCampaign).forEach(([campaign, stats]: [string, any]) => {
    console.log(`${campaign}:`)
    console.log(`   Total: ${stats.total}`)
    console.log(`   Pending: ${stats.pending || 0}`)
    console.log(`   Failed: ${stats.failed || 0}`)
    console.log('')
  })

  // Show sample subjects
  const { data: samples } = await supabase
    .from('send_queue')
    .select('campaign_id, subject, status, scheduled_for')
    .in('campaign_id', campaignIds)
    .eq('status', 'pending')
    .order('scheduled_for')
    .limit(5)

  console.log('📅 Sample Pending Emails:\n')
  samples?.forEach((q, idx) => {
    const campaign = q.campaign_id === campaignIds[0] 
      ? 'finance-leadgen-1000' 
      : 'finance-fi-company-enrichment'
    console.log(`${idx + 1}. ${campaign}`)
    console.log(`   Subject: "${q.subject}"`)
    console.log(`   Scheduled: ${q.scheduled_for}`)
    console.log('')
  })
}

main().catch(console.error)
