/**
 * Backfill pending messages into send_queue
 *
 * This converts existing scheduled messages into send_queue items so Railway
 * will continue sending without duplicates.
 *
 * Usage (Mac terminal):
 *   npx ts-node scripts/backfill-messages-to-send-queue.ts --dry-run
 *   npx ts-node scripts/backfill-messages-to-send-queue.ts
 */

import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function getArg(name: string) {
  const index = process.argv.findIndex(arg => arg === name)
  if (index >= 0) return process.argv[index + 1]
  return null
}

const isDryRun = process.argv.includes('--dry-run')
const campaignId = getArg('--campaign-id')

async function backfill() {
  console.log(`🔎 Backfill pending messages ${campaignId ? `for campaign ${campaignId}` : ''}`)
  if (isDryRun) {
    console.log('🧪 Dry run enabled - no changes will be made')
  }

  // Try to select campaign_id if it exists, but don't fail if column doesn't exist yet
  // We'll get campaign_id from campaign_contacts join instead
  let query = supabase
    .from('messages')
    .select(`
      id,
      campaign_contact_id,
      contact_id,
      account_id,
      channel,
      sequence_step,
      subject,
      body,
      scheduled_at,
      status,
      campaign_contact:campaign_contacts(campaign_id)
    `)
    .eq('status', 'pending')
    .not('scheduled_at', 'is', null)

  // If filtering by campaign, we'll filter via campaign_contacts join
  // Note: campaign_id filter won't work if column doesn't exist yet

  const { data: messages, error } = await query

  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`)
  }

  if (!messages || messages.length === 0) {
    console.log('✅ No pending messages to backfill')
    return
  }

  const queueRows = messages
    .map(message => {
      const resolvedCampaignId = message.campaign_id || message.campaign_contact?.campaign_id
      if (!resolvedCampaignId) {
        console.warn(`⚠️ Skipping message ${message.id}: missing campaign_id`)
        return null
      }

      return {
        id: message.id, // reuse message id to prevent duplicates
        campaign_id: resolvedCampaignId,
        campaign_contact_id: message.campaign_contact_id,
        contact_id: message.contact_id,
        account_id: message.account_id,
        channel: message.channel,
        sequence_step: message.sequence_step || 1,
        subject: message.subject,
        body: message.body,
        scheduled_for: message.scheduled_at,
        status: 'pending'
      }
    })
    .filter(Boolean)

  if (queueRows.length === 0) {
    console.log('✅ No valid messages to backfill')
    return
  }

  console.log(`🧾 Found ${queueRows.length} pending messages to move`)

  if (isDryRun) {
    console.log('✅ Dry run complete')
    return
  }

  const { error: insertError } = await supabase
    .from('send_queue')
    .upsert(queueRows, { onConflict: 'id', ignoreDuplicates: true })

  if (insertError) {
    throw new Error(`Failed to insert send_queue rows: ${insertError.message}`)
  }

  const { error: updateError } = await supabase
    .from('messages')
    .update({ status: 'queued' })
    .in('id', messages.map(m => m.id))

  if (updateError) {
    throw new Error(`Failed to update messages: ${updateError.message}`)
  }

  console.log('✅ Backfill complete')
}

backfill().catch(error => {
  console.error('❌ Backfill failed:', error.message)
  process.exit(1)
})
