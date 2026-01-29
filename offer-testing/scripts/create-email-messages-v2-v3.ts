/**
 * Create email messages using V2 and V3 templates (50/50 split)
 * Schedule 20 emails per day spread across business hours
 * 
 * Usage:
 *   npx ts-node scripts/create-email-messages-v2-v3.ts [--dry-run]
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

const UNIPILE_EMAIL_ACCOUNT_ID = process.env.UNIPILE_EMAIL_ACCOUNT_ID || '0pKp3VL5TGSAMQpg-eNC7A'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Email templates
const TEMPLATE_V2 = {
  subject: "AI for earnings",
  body: `{FirstName},

Manual earnings call analysis takes hours per company.

AI does it in seconds and catches alpha humans miss. Management tone, answer patterns, topic avoidance all signal surprises before they hit.

A hedge fund client of ours improved earnings prediction accuracy 23% using AI analysis.

Want a free guide on how to get AI to do this on thousands of companies automatically, immediately after earnings? Just reply yes and I'll send it to you.

Best,
Mike`
}

const TEMPLATE_V3 = {
  subject: "build earnings AI",
  body: `{FirstName},

Most funds analyze earnings calls one at a time.

What if AI could do it for every company in your portfolio simultaneously?

We built a guide showing how to set this up yourself. No vendor dependency, runs on your schedule, scales to hundreds of companies.

A hedge fund client of ours expanded the number of companies in their research universe 8x using this approach.

Want it? Just reply "send guide".

Best,
Mike`
}

function personalizeTemplate(template: typeof TEMPLATE_V2, firstName: string): { subject: string; body: string } {
  return {
    subject: template.subject,
    body: template.body.replace(/{FirstName}/g, firstName || 'there')
  }
}

function getNextScheduledTime(index: number, dailyLimit: number, startDate: Date): Date {
  // Calculate which business day (0-indexed) and position within that day
  const businessDayNumber = Math.floor(index / dailyLimit)
  const positionInDay = index % dailyLimit
  
  // Start from tomorrow 7 AM ET
  const scheduled = new Date(startDate)
  scheduled.setHours(7, 0, 0, 0)
  
  // Add business days (skipping weekends)
  let daysAdded = 0
  let currentDay = 0
  while (currentDay <= businessDayNumber) {
    scheduled.setDate(scheduled.getDate() + 1)
    const dayOfWeek = scheduled.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
      currentDay++
    }
  }
  
  // Business hours: 7 AM - 6 PM ET (11 hours = 660 minutes)
  // Spread dailyLimit emails across 11 hours
  const minutesPerEmail = Math.floor(660 / dailyLimit)
  
  // Add time offset for position in day
  scheduled.setMinutes(scheduled.getMinutes() + (positionInDay * minutesPerEmail))
  
  // Add random jitter (0-5 minutes)
  const jitterMinutes = Math.floor(Math.random() * 6)
  scheduled.setMinutes(scheduled.getMinutes() + jitterMinutes)
  
  return scheduled
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const dailyLimit = 20 // Send 20 emails per day

  console.log('\n📧 Creating Email Messages (V2 and V3 Split)\n')

  // Get finance offer
  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('slug', 'finance')
    .maybeSingle()

  if (!offer) {
    console.error('❌ Finance offer not found')
    process.exit(1)
  }

  // Get campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('offer_id', offer.id)
    .eq('name', 'finance-leadgen-1000')
    .maybeSingle()

  if (!campaign) {
    console.error('❌ Campaign finance-leadgen-1000 not found')
    process.exit(1)
  }

  // Create or get placeholder account
  const placeholderAccountId = '00000000-0000-0000-0000-000000000001'
  
  const { error: accountError } = await supabase
    .from('accounts')
    .upsert({ 
      id: placeholderAccountId, 
      name: 'Mike Email (Unipile)',
      type: 'email',
      owner: 'mike@atherial.ai',
      provider: 'unipile',
      unipile_account_id: UNIPILE_EMAIL_ACCOUNT_ID,
      email_address: 'mike@atherial.ai',
      status: 'active'
    })
    .select()
    .single()

  if (accountError) {
    console.error('❌ Failed to create/update account:', accountError.message)
    process.exit(1)
  }

  console.log(`📧 Using account ID: ${placeholderAccountId}`)

  const accountId = placeholderAccountId

  // Get contacts linked to campaign
  const { data: campaignContacts } = await supabase
    .from('campaign_contacts')
    .select(`
      id,
      contact_id,
      contacts!inner (
        id,
        email,
        first_name,
        company_id,
        companies!inner (
          id,
          name,
          vertical
        )
      )
    `)
    .eq('campaign_id', campaign.id)
    .eq('status', 'queued')

  if (!campaignContacts || campaignContacts.length === 0) {
    console.log('⚠️  No contacts ready for messaging')
    process.exit(0)
  }

  // Filter contacts with emails
  const readyContacts = campaignContacts.filter(cc => {
    const contact = cc.contacts as any
    return contact?.email && contact?.first_name
  })

  console.log(`📋 Processing ${readyContacts.length} contacts`)

  // Check for existing messages
  const contactIds = readyContacts.map(cc => (cc.contacts as any).id)
  const { data: existingMessages } = await supabase
    .from('messages')
    .select('contact_id')
    .in('contact_id', contactIds)
    .eq('campaign_id', campaign.id)
    .eq('channel', 'email')

  const existingContactIds = new Set((existingMessages || []).map(m => m.contact_id))
  const newContacts = readyContacts.filter(cc => !existingContactIds.has((cc.contacts as any).id))

  console.log(`   Already have messages: ${existingContactIds.size}`)
  console.log(`   New messages to create: ${newContacts.length}`)

  if (newContacts.length === 0) {
    console.log('\n✅ All contacts already have messages!')
    process.exit(0)
  }

  // Start scheduling from tomorrow
  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1)

  // Split contacts 50/50 between V2 and V3
  const shuffled = [...newContacts].sort(() => Math.random() - 0.5)
  const halfPoint = Math.ceil(shuffled.length / 2)
  const v2Contacts = shuffled.slice(0, halfPoint)
  const v3Contacts = shuffled.slice(halfPoint)

  console.log(`\n📊 Template Split:`)
  console.log(`   V2 (AI for earnings): ${v2Contacts.length} contacts`)
  console.log(`   V3 (build earnings AI): ${v3Contacts.length} contacts`)

  // Create messages
  const messagesToInsert = []
  let messageIndex = 0

  for (const cc of v2Contacts) {
    const contact = cc.contacts as any
    const template = TEMPLATE_V2
    const personalized = personalizeTemplate(template, contact.first_name || 'there')

    const scheduled = getNextScheduledTime(messageIndex, dailyLimit, startDate)

    messagesToInsert.push({
      campaign_contact_id: cc.id,
      contact_id: contact.id,
      account_id: accountId,
      channel: 'email',
      sequence_step: 1,
      subject: personalized.subject,
      body: personalized.body,
      personalization_used: {
        FirstName: contact.first_name,
        Template: 'V2'
      },
      scheduled_at: scheduled.toISOString(),
      status: 'pending'
    })
    messageIndex++
  }

  for (const cc of v3Contacts) {
    const contact = cc.contacts as any
    const template = TEMPLATE_V3
    const personalized = personalizeTemplate(template, contact.first_name || 'there')

    const scheduled = getNextScheduledTime(messageIndex, dailyLimit, startDate)

    messagesToInsert.push({
      campaign_contact_id: cc.id,
      contact_id: contact.id,
      account_id: accountId,
      channel: 'email',
      sequence_step: 1,
      subject: personalized.subject,
      body: personalized.body,
      personalization_used: {
        FirstName: contact.first_name,
        Template: 'V3'
      },
      scheduled_at: scheduled.toISOString(),
      status: 'pending'
    })
    messageIndex++
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN - Would create messages:\n')
    messagesToInsert.slice(0, 5).forEach((msg, idx) => {
      console.log(`Message ${idx + 1}:`)
      console.log(`  Template: ${msg.personalization_used.Template}`)
      console.log(`  Subject: ${msg.subject}`)
      console.log(`  Scheduled: ${msg.scheduled_at}`)
      console.log('')
    })
    console.log(`... and ${messagesToInsert.length - 5} more`)
    
    // Show daily breakdown
    const byDay = messagesToInsert.reduce((acc, msg) => {
      const day = new Date(msg.scheduled_at).toISOString().split('T')[0]
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('\n📅 Daily Breakdown:')
    Object.entries(byDay).forEach(([day, count]) => {
      console.log(`   ${day}: ${count} emails`)
    })
    
    return
  }

  // Insert messages
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
  console.log(`   Daily limit: ${dailyLimit} emails`)
  console.log(`   Total days: ${Math.ceil(messagesToInsert.length / dailyLimit)}`)
  
  // Show daily breakdown
  const byDay = messagesToInsert.reduce((acc, msg) => {
    const day = new Date(msg.scheduled_at).toISOString().split('T')[0]
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  console.log('\n📊 Daily Breakdown:')
  Object.entries(byDay).forEach(([day, count]) => {
    console.log(`   ${day}: ${count} emails`)
  })
  
  console.log(`\n💡 Next steps:`)
  console.log(`   1. Review messages in Supabase (check personalization)`)
  console.log(`   2. Set up Railway cron: node scripts/process-message-queue.js`)
  console.log(`   3. Monitor sending via Railway logs`)
  console.log(`   4. Track template performance (V2 vs V3)`)
}

main().catch(console.error)
