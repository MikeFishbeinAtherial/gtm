/**
 * Update subject lines for existing roleplay campaign messages
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

const CAMPAIGN_NAME = 'cold-email-roleplay-aicom-hiring-012926'
const SUBJECTS = ['Ramp time', 'Win more', 'New rep training']

async function main() {
  console.log('\n✉️  Updating subject lines for roleplay campaign\n')

  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('slug', 'ai-sales-roleplay-trainer')
    .maybeSingle()

  if (!offer) {
    console.error('❌ Offer not found')
    process.exit(1)
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('offer_id', offer.id)
    .eq('name', CAMPAIGN_NAME)
    .maybeSingle()

  if (!campaign) {
    console.error('❌ Campaign not found')
    process.exit(1)
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('id, subject, personalization_used')
    .eq('campaign_id', campaign.id)
    .eq('channel', 'email')
    .eq('sequence_step', 1)

  if (!messages || messages.length === 0) {
    console.log('⚠️  No messages found')
    return
  }

  let updated = 0
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const subject = SUBJECTS[i % SUBJECTS.length]
    const personalization = {
      ...(msg.personalization_used || {}),
      SubjectVariant: subject
    }

    const { error } = await supabase
      .from('messages')
      .update({ subject, personalization_used: personalization })
      .eq('id', msg.id)

    if (error) {
      console.error(`❌ Failed updating ${msg.id}: ${error.message}`)
      continue
    }
    updated++
  }

  console.log(`✅ Updated ${updated} subjects`)
}

main().catch(console.error)
