/**
 * Replace variant D messages in send_queue with variant A or F
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

const VARIANT_A = {
  subject: 'Ramp time',
  body: `{first_name},

How long does it take your new sales hires to close their first deal?

Most companies burn 3-10 weeks on training before reps are quota-ready.

We build custom AI sales roleplay trainers. One recent client slashed their ramp time by 2/3 and is seeing 21% greater cold call conversion rates.

Want to try a demo call with an AI prospect trained to act like your ICP? You'll experience what your reps will practice against. Takes 5 minutes.

Mike`
}

const VARIANT_F = {
  subject: 'New rep training',
  body: `{first_name},

How long does it take your new sales hires at {company} to close their first deal?

We build custom AI sales roleplay trainers. One of our clients cut ramp time by 2/3 - their reps practice 50+ calls with AI before touching real prospects.

Want to try a 5-min demo call with an AI prospect trained to act like your ICP?

Mike`
}

function shortenCompanyName(name: string): string {
  let cleaned = name
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  cleaned = cleaned.replace(
    /\b(incorporated|inc\.|inc|llc|l\.l\.c\.|ltd\.|ltd|corp\.|corp|corporation|company|co\.|co|holdings|group)\b\.?/gi,
    ''
  ).replace(/\s+/g, ' ').trim()

  if (cleaned.length <= 30) return cleaned

  const words = cleaned.split(' ')
  return words.slice(0, Math.min(4, words.length)).join(' ')
}

async function main() {
  console.log('\n🔄 Replacing Variant D in send_queue\n')

  // Get variant D messages from send_queue
  const { data: variantDMessages } = await supabase
    .from('send_queue')
    .select(`
      id,
      contact_id,
      subject,
      body,
      external_message_id,
      contacts!inner(first_name, companies!inner(name))
    `)
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('channel', 'email')
    .eq('status', 'pending')

  if (!variantDMessages || variantDMessages.length === 0) {
    console.log('✅ No variant D messages found in send_queue')
    return
  }

  // Check which ones are variant D by checking the messages table
  const messageIds = variantDMessages
    .map((sq: any) => sq.external_message_id)
    .filter(Boolean)

  const { data: messages } = await supabase
    .from('messages')
    .select('id, personalization_used')
    .in('id', messageIds)

  const variantDIds = new Set(
    messages
      ?.filter((m: any) => m.personalization_used?.Variant === 'D')
      .map((m: any) => m.id.toString()) || []
  )

  const toReplace = variantDMessages.filter((sq: any) =>
    variantDIds.has(sq.external_message_id)
  )

  if (toReplace.length === 0) {
    console.log('✅ No variant D messages found')
    return
  }

  console.log(`📋 Found ${toReplace.length} variant D messages to replace\n`)

  let replaced = 0
  for (let i = 0; i < toReplace.length; i++) {
    const sq = toReplace[i] as any
    const contact = sq.contacts as any
    const company = contact.companies as any

    // Alternate between A and F
    const variant = i % 2 === 0 ? VARIANT_A : VARIANT_F
    const safeCompany = shortenCompanyName(company?.name || 'your company')
    const firstName = contact.first_name || 'there'

    const newSubject = variant.subject.replace(/{company}/gi, safeCompany)
    const newBody = variant.body
      .replace(/{first_name}/gi, firstName)
      .replace(/{company}/gi, safeCompany)

    const { error } = await supabase
      .from('send_queue')
      .update({
        subject: newSubject,
        body: newBody
      })
      .eq('id', sq.id)

    if (error) {
      console.error(`❌ Failed to update ${sq.id}: ${error.message}`)
      continue
    }

    // Also update the messages table
    const { error: msgError } = await supabase
      .from('messages')
      .update({
        subject: newSubject,
        body: newBody,
        personalization_used: {
          ...(sq.personalization_used || {}),
          Variant: variant === VARIANT_A ? 'A' : 'F'
        }
      })
      .eq('id', sq.external_message_id)

    if (msgError) {
      console.error(`❌ Failed to update message ${sq.external_message_id}: ${msgError.message}`)
    }

    replaced++
  }

  console.log(`\n✅ Replaced ${replaced} variant D messages`)
  console.log(`   Variant A: ${Math.ceil(replaced / 2)}`)
  console.log(`   Variant F: ${Math.floor(replaced / 2)}`)
}

main().catch(console.error)
