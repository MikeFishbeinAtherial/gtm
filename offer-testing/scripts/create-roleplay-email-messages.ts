/**
 * Create personalized email messages for AI Sales Roleplay Trainer campaign
 *
 * Usage:
 *   npx tsx scripts/create-roleplay-email-messages.ts [--limit=50] [--dry-run]
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

const YOUR_NAME = process.env.YOUR_NAME || 'Mike'
const UNIPILE_EMAIL_ACCOUNT_IDS = (process.env.UNIPILE_EMAIL_ACCOUNT_IDS ||
  process.env.UNIPILE_EMAIL_ACCOUNT_ID ||
  '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

if (UNIPILE_EMAIL_ACCOUNT_IDS.length === 0) {
  console.error('❌ Missing UNIPILE_EMAIL_ACCOUNT_IDS or UNIPILE_EMAIL_ACCOUNT_ID')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const CAMPAIGN_NAME = 'hiring-signal-new-sales-team'

const VARIANTS = [
  {
    id: 'A',
    subject: 'Ramp time',
    body: `{first_name},

How long does it take your new sales hires to close their first deal?

Most companies burn 3-10 weeks on training before reps are quota-ready.

We build custom AI sales roleplay trainers. One recent client slashed their ramp time by 2/3 and is seeing 21% greater cold call conversion rates.

Want to try a demo call with an AI prospect trained to act like your ICP? You'll experience what your reps will practice against. Takes 5 minutes.

${YOUR_NAME}`
  },
  {
    id: 'D',
    subject: 'Ramp time',
    body: `{first_name},

Your new salespeople freeze up on objections because they're learning in the field instead of practicing first.

We build custom AI sales roleplay trainers. Your reps practice unlimited calls with AI prospects that sounds like your real buyers.

We've helped clients cut ramp time by 2/3 and win more deals.

Interested in seeing how this would work for {company}?

${YOUR_NAME}`
  },
  {
    id: 'F',
    subject: 'Ramp time',
    body: `{first_name},

How long does it take your new sales hires at {company} to close their first deal?

We build custom AI sales roleplay trainers. One of our clients cut ramp time by 2/3 - their reps practice 50+ calls with AI before touching real prospects.

Want to try a 5-min demo call with an AI prospect trained to act like your ICP?

${YOUR_NAME}`
  }
]

function formatDateET(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(date)
}

function inBusinessHoursET(date: Date): boolean {
  const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hour = etDate.getHours()
  const day = etDate.getDay()
  return day !== 0 && day !== 6 && hour >= 9 && hour < 18
}

function moveToNextBusinessMorningET(date: Date): Date {
  const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day = etDate.getDay()
  const daysToAdd = day === 6 ? 2 : day === 0 ? 1 : 0
  etDate.setDate(etDate.getDate() + daysToAdd)
  etDate.setHours(9, 0, 0, 0)
  return new Date(etDate.toLocaleString('en-US', { timeZone: 'America/New_York' }))
}

function addRandomMinutes(date: Date): Date {
  const minutesToAdd = 5 + Math.floor(Math.random() * 16) // 5-20 minutes
  return new Date(date.getTime() + minutesToAdd * 60 * 1000)
}

function personalize(variant: typeof VARIANTS[number], firstName: string, company: string) {
  const body = variant.body
    .replace(/{first_name}/gi, firstName)
    .replace(/{company}/gi, company)
  const subject = variant.subject.replace(/{company}/gi, company)
  return { subject, body }
}

async function main() {
  const args = process.argv.slice(2)
  const limitArg = args.find((arg) => arg.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined
  const dryRun = args.includes('--dry-run')

  console.log('\n📧 Creating Roleplay Email Messages\n')

  // Get offer
  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('slug', 'ai-sales-roleplay-trainer')
    .maybeSingle()

  if (!offer) {
    console.error('❌ AI Sales Roleplay Trainer offer not found')
    process.exit(1)
  }

  // Get campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('offer_id', offer.id)
    .eq('name', CAMPAIGN_NAME)
    .maybeSingle()

  if (!campaign) {
    console.error(`❌ Campaign ${CAMPAIGN_NAME} not found. Run link-roleplay-contacts-to-campaign.ts first.`)
    process.exit(1)
  }

  // Get account IDs
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, external_id')
    .in('external_id', UNIPILE_EMAIL_ACCOUNT_IDS)

  if (!accounts || accounts.length === 0) {
    console.error('❌ No matching Unipile accounts found in Supabase for provided IDs')
    process.exit(1)
  }

  const accountsByExternalId = new Map(accounts.map((a) => [a.external_id, a.id]))
  const accountIds = UNIPILE_EMAIL_ACCOUNT_IDS
    .map((id) => accountsByExternalId.get(id))
    .filter(Boolean) as string[]

  if (accountIds.length === 0) {
    console.error('❌ No valid account IDs found for UNIPILE_EMAIL_ACCOUNT_IDS')
    process.exit(1)
  }

  // Get campaign contacts queued
  const { data: campaignContacts } = await supabase
    .from('campaign_contacts')
    .select(`
      contact_id,
      contacts!inner (
        id,
        email,
        first_name,
        company_id,
        companies!inner (
          id,
          name
        )
      )
    `)
    .eq('campaign_id', campaign.id)
    .eq('status', 'queued')

  if (!campaignContacts || campaignContacts.length === 0) {
    console.log('⚠️  No contacts ready for messaging')
    process.exit(0)
  }

  // Filter contacts with emails and companies
  const readyContacts = campaignContacts
    .filter((cc: any) => {
      const contact = cc.contacts as any
      return contact?.email && contact?.first_name && contact?.companies
    })
    .slice(0, limit)

  console.log(`📋 Processing ${readyContacts.length} contacts`)

  // Check existing messages to avoid duplicates
  const contactIds = readyContacts.map((cc: any) => (cc.contacts as any).id)
  const { data: existingMessages } = await supabase
    .from('messages')
    .select('contact_id')
    .in('contact_id', contactIds)
    .eq('campaign_id', campaign.id)
    .eq('channel', 'email')
    .eq('sequence_step', 1)

  const existingContactIds = new Set((existingMessages || []).map((m: any) => m.contact_id))
  const newContacts = readyContacts.filter(
    (cc: any) => !existingContactIds.has((cc.contacts as any).id)
  )

  console.log(`   Already have messages: ${existingContactIds.size}`)
  console.log(`   New messages to create: ${newContacts.length}`)

  if (newContacts.length === 0) {
    console.log('\n✅ All contacts already have messages!')
    process.exit(0)
  }

  // Fetch last scheduled message per account for this campaign
  const { data: previousMessages } = await supabase
    .from('messages')
    .select('account_id, scheduled_at')
    .eq('campaign_id', campaign.id)
    .eq('channel', 'email')
    .in('account_id', accountIds)
    .order('scheduled_at', { ascending: false })

  const lastScheduledByAccount = new Map<string, Date | null>()
  const dailyCountByAccount = new Map<string, Map<string, number>>()

  accountIds.forEach((id) => {
    lastScheduledByAccount.set(id, null)
    dailyCountByAccount.set(id, new Map())
  })

  if (previousMessages && previousMessages.length > 0) {
    for (const msg of previousMessages) {
      if (!msg.scheduled_at || !msg.account_id) continue
      const scheduled = new Date(msg.scheduled_at)
      const accountId = msg.account_id as string

      // Track last scheduled
      const currentLast = lastScheduledByAccount.get(accountId)
      if (!currentLast || scheduled > currentLast) {
        lastScheduledByAccount.set(accountId, scheduled)
      }

      // Track daily count (ET)
      const dateKey = formatDateET(scheduled)
      const counts = dailyCountByAccount.get(accountId)!
      counts.set(dateKey, (counts.get(dateKey) || 0) + 1)
    }
  }

  const messagesToInsert: any[] = []

  for (let i = 0; i < newContacts.length; i++) {
    const cc = newContacts[i]
    const contact = cc.contacts as any
    const company = contact.companies as any

    const variant = VARIANTS[i % VARIANTS.length]
    const personalized = personalize(
      variant,
      contact.first_name || 'there',
      company.name || 'your company'
    )

    const accountId = accountIds[i % accountIds.length]
    let nextTime = lastScheduledByAccount.get(accountId) || new Date()

    // Step forward and enforce daily limits per account (20/day)
    let safe = 0
    while (safe < 365) {
      safe++
      nextTime = addRandomMinutes(nextTime)

      if (!inBusinessHoursET(nextTime)) {
        nextTime = moveToNextBusinessMorningET(nextTime)
      }

      const dateKey = formatDateET(nextTime)
      const counts = dailyCountByAccount.get(accountId)!
      const dayCount = counts.get(dateKey) || 0

      if (dayCount >= 20) {
        // Move to next day 9am ET
        const bumped = moveToNextBusinessMorningET(
          new Date(nextTime.getTime() + 24 * 60 * 60 * 1000)
        )
        nextTime = bumped
        continue
      }

      counts.set(dateKey, dayCount + 1)
      break
    }

    lastScheduledByAccount.set(accountId, nextTime)

    messagesToInsert.push({
      campaign_id: campaign.id,
      contact_id: contact.id,
      account_id: accountId,
      channel: 'email',
      sequence_step: 1,
      subject: personalized.subject,
      body: personalized.body,
      personalization_used: {
        FirstName: contact.first_name,
        CompanyName: company.name,
        YourName: YOUR_NAME,
        Variant: variant.id
      },
      scheduled_at: nextTime.toISOString(),
      status: 'pending'
    })
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN - Would create messages:\n')
    messagesToInsert.slice(0, 3).forEach((msg, idx) => {
      console.log(`Message ${idx + 1}:`)
      console.log(`  To: ${newContacts[idx].contacts.email}`)
      console.log(`  Subject: ${msg.subject}`)
      console.log(`  Variant: ${msg.personalization_used.Variant}`)
      console.log(`  Account: ${msg.account_id}`)
      console.log(`  Scheduled: ${msg.scheduled_at}`)
      console.log('')
    })
    console.log(`... and ${messagesToInsert.length - 3} more`)
    return
  }

  const { error: insertError } = await supabase
    .from('messages')
    .insert(messagesToInsert)

  if (insertError) {
    console.error('❌ Failed to create messages:', insertError.message)
    process.exit(1)
  }

  console.log(`\n✅ Successfully created ${messagesToInsert.length} email messages`)
  console.log(`\n📅 Scheduling:`)
  console.log(`   First message: ${messagesToInsert[0].scheduled_at}`)
  console.log(`   Last message: ${messagesToInsert[messagesToInsert.length - 1].scheduled_at}`)
  console.log(`\n💡 Next steps:`)
  console.log(`   1. Review messages in Supabase`)
  console.log(`   2. Run process-message-queue.js on a schedule`)
}

main().catch(console.error)
