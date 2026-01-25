/**
 * Backfill sent messages into outreach_history
 *
 * This ensures the global 60-day rule sees past sends.
 *
 * Usage (Mac terminal):
 *   npx ts-node scripts/backfill-sent-messages-to-outreach-history.ts --dry-run
 *   npx ts-node scripts/backfill-sent-messages-to-outreach-history.ts
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

const isDryRun = process.argv.includes('--dry-run')

async function backfillSent() {
  console.log('🔎 Backfill sent messages into outreach_history')
  if (isDryRun) {
    console.log('🧪 Dry run enabled - no changes will be made')
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select(`
      id,
      campaign_id,
      contact_id,
      account_id,
      channel,
      subject,
      body,
      sent_at,
      status,
      contact:contacts(email, linkedin_url),
      campaign:campaigns(offer_id)
    `)
    .in('status', ['sent', 'delivered', 'replied', 'bounced'])
    .not('sent_at', 'is', null)

  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`)
  }

  if (!messages || messages.length === 0) {
    console.log('✅ No sent messages to backfill')
    return
  }

  let inserted = 0

  for (const message of messages) {
    const contactEmail = message.contact?.email || null
    const contactLinkedin = message.contact?.linkedin_url || null

    if (!contactEmail && !contactLinkedin) {
      console.warn(`⚠️ Skipping message ${message.id}: no contact email or LinkedIn URL`)
      continue
    }

    const orFilters = [
      contactEmail ? `contact_email.eq.${contactEmail}` : null,
      contactLinkedin ? `contact_linkedin_url.eq.${contactLinkedin}` : null
    ].filter(Boolean)

    const { data: existing } = await supabase
      .from('outreach_history')
      .select('id')
      .eq('sent_at', message.sent_at)
      .eq('channel', message.channel)
      .or(orFilters.join(','))
      .limit(1)

    if (existing && existing.length > 0) {
      continue
    }

    const row = {
      contact_email: contactEmail,
      contact_linkedin_url: contactLinkedin,
      contact_id: message.contact_id,
      campaign_id: message.campaign_id,
      offer_id: message.campaign?.offer_id || null,
      account_id: message.account_id,
      send_queue_id: null,
      channel: message.channel,
      message_subject: message.subject,
      message_body: message.body,
      sent_at: message.sent_at,
      status: message.status
    }

    if (!isDryRun) {
      const { error: insertError } = await supabase
        .from('outreach_history')
        .insert(row)

      if (insertError) {
        console.warn(`⚠️ Failed to insert message ${message.id}: ${insertError.message}`)
        continue
      }
    }

    inserted += 1
  }

  console.log(`✅ Backfill complete (inserted ${inserted} rows)`)
}

backfillSent().catch(error => {
  console.error('❌ Backfill failed:', error.message)
  process.exit(1)
})
