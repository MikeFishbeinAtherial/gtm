/**
 * Fix PE messages: Delete earnings emails, create sentiment emails instead
 * 
 * Usage:
 *   npx ts-node scripts/fix-pe-messages-and-create-sentiment.ts [--dry-run]
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

// Sentiment email template
const SENTIMENT_TEMPLATE = {
  subject: "Reddit sentiment",
  body: `{FirstName},

Most funds miss sentiment shifts before earnings season hits.

Reddit, Glassdoor, etc light up 2-3 months before bad quarters. By the time earnings drop, you're late.

AI can auto-analyze this for public and private companies. Panera analysts caught sentiment collapse 18 days before the earnings miss using this approach.

Want a free guide on how to get AI to do sentiment analysis on your entire portfolio or research list? Just reply yes and I'll send it to you.

Best,

Mike`
}

function personalizeTemplate(firstName: string): { subject: string; body: string } {
  return {
    subject: SENTIMENT_TEMPLATE.subject,
    body: SENTIMENT_TEMPLATE.body.replace(/{FirstName}/g, firstName || 'there')
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
  const dailyLimit = 20

  console.log('\n🔧 Fixing PE Messages & Creating Sentiment Emails\n')

  // Get PE messages (earnings emails sent by mistake)
  const { data: peMessages } = await supabase
    .from('messages')
    .select(`
      id,
      contact_id,
      campaign_contact_id,
      subject,
      contact:contacts!inner(
        id,
        email,
        first_name,
        companies!inner(
          name,
          vertical
        )
      )
    `)
    .eq('status', 'pending')

  const peMessagesToDelete = (peMessages || []).filter((m: any) => 
    m.contact?.companies?.vertical === 'private_equity'
  )

  console.log(`📋 Found ${peMessagesToDelete.length} PE messages to fix`)
  console.log('')

  if (peMessagesToDelete.length === 0) {
    console.log('✅ No PE messages to fix!')
    return
  }

  // Show preview
  console.log('🔍 Preview of messages to delete and recreate:')
  peMessagesToDelete.slice(0, 5).forEach((m: any, idx) => {
    console.log(`   ${idx + 1}. ${m.contact.first_name} at ${m.contact.companies.name}`)
    console.log(`      Current: "${m.subject}"`)
    console.log(`      New: "${SENTIMENT_TEMPLATE.subject}"`)
  })
  if (peMessagesToDelete.length > 5) {
    console.log(`   ... and ${peMessagesToDelete.length - 5} more`)
  }
  console.log('')

  if (dryRun) {
    console.log('🔍 DRY RUN - No changes made')
    console.log(`\nWould delete ${peMessagesToDelete.length} messages and create ${peMessagesToDelete.length} new sentiment emails`)
    return
  }

  // Delete PE messages
  const messageIdsToDelete = peMessagesToDelete.map(m => m.id)
  
  console.log(`🗑️  Deleting ${messageIdsToDelete.length} PE messages...`)
  const { error: deleteError } = await supabase
    .from('messages')
    .delete()
    .in('id', messageIdsToDelete)

  if (deleteError) {
    console.error('❌ Failed to delete messages:', deleteError.message)
    process.exit(1)
  }

  console.log(`✅ Deleted ${messageIdsToDelete.length} messages`)
  console.log('')

  // Get account
  const accountId = '00000000-0000-0000-0000-000000000001'

  // Get last scheduled message to continue scheduling
  const { data: lastMessage } = await supabase
    .from('messages')
    .select('scheduled_at')
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let startDate = new Date()
  if (lastMessage?.scheduled_at) {
    startDate = new Date(lastMessage.scheduled_at)
    startDate.setDate(startDate.getDate() + 1) // Start day after last message
  }

  // Create sentiment emails
  console.log('📧 Creating sentiment analysis emails...')
  
  const newMessages = peMessagesToDelete.map((msg: any, index) => {
    const personalized = personalizeTemplate(msg.contact.first_name || 'there')
    const scheduled = getNextScheduledTime(index, dailyLimit, startDate)

    return {
      campaign_contact_id: msg.campaign_contact_id,
      contact_id: msg.contact.id,
      account_id: accountId,
      channel: 'email',
      sequence_step: 1,
      subject: personalized.subject,
      body: personalized.body,
      personalization_used: {
        FirstName: msg.contact.first_name,
        Template: 'Sentiment'
      },
      scheduled_at: scheduled.toISOString(),
      status: 'pending'
    }
  })

  const { error: insertError } = await supabase
    .from('messages')
    .insert(newMessages)

  if (insertError) {
    console.error('❌ Failed to create sentiment emails:', insertError.message)
    process.exit(1)
  }

  console.log(`✅ Created ${newMessages.length} sentiment emails`)
  console.log('')

  console.log('📅 Scheduling:')
  console.log(`   First sentiment email: ${newMessages[0].scheduled_at}`)
  console.log(`   Last sentiment email: ${newMessages[newMessages.length - 1].scheduled_at}`)
  console.log(`   Daily limit: ${dailyLimit} emails`)
  console.log('')

  console.log('✅ Done! PE contacts now have sentiment emails instead of earnings emails')
}

main().catch(console.error)
