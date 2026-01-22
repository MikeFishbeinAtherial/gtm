/**
 * Create personalized email messages for finance campaign
 * 
 * Usage:
 *   npx ts-node scripts/create-email-messages.ts [--limit 50] [--dry-run]
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
const UNIPILE_EMAIL_ACCOUNT_ID = process.env.UNIPILE_EMAIL_ACCOUNT_ID || '0pKp3VL5TGSAMQpg-eNC7A'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Email templates
const TEMPLATE_HEDGE_FUND = {
  subject: "While Citadel runs LLMs on earnings calls, you're reading transcripts manually",
  body: `Hi {FirstName},

While Citadel and Two Sigma run LLMs on earnings calls to extract sentiment and predict surprises, most mid-market funds are still reading transcripts manually.

**The gap:**
- Mega-funds use AI to analyze earnings calls in minutes
- You're spending hours reading transcripts looking for signals
- They're faster, more accurate, and catching insights you're missing

**The opportunity:**
LLMs can extract sentiment signals that predict earnings surprises better than consensus estimates. The management tone in earnings calls - how they answer questions, what they emphasize, what they avoid - is a signal most funds aren't capturing.

I just finished a report called "The AI Earnings Edge Report" that shows:
- How LLM-extracted management tone predicts earnings surprises
- The sentiment signal that beats consensus estimates
- Real examples from funds we've worked with
- How to leverage AI for research without building a 50-person team

We've helped 4 mid-market funds ($50M-$300M AUM) build AI earnings analysis systems. One fund improved earnings surprise prediction accuracy by 23%.

Want the report? Just reply and I'll send it over - no pitch, just insights.

Best,
{YourName}`
}

const TEMPLATE_PRIVATE_EQUITY = {
  subject: "The earnings call sentiment edge that 80% of Balyasny's staff use daily",
  body: `Hi {FirstName},

There's a sentiment signal in earnings calls that most funds are missing.

While you're reading transcripts looking for management tone changes, LLMs can extract this signal automatically - and it predicts earnings surprises better than consensus estimates.

**Here's what we've seen:**
- Funds using AI sentiment analysis saw 8% alpha improvement in earnings-driven trades
- One fund improved earnings surprise prediction accuracy by 23% using our LLM approach
- The management tone in earnings calls - how they answer questions, what they emphasize - is a signal most funds aren't capturing

I just finished a report called "The AI Earnings Edge Report" that shows:
- The sentiment signal that beats consensus estimates
- How LLM-extracted management tone predicts earnings surprises
- Real examples from funds we've worked with
- A playbook on leveraging AI for research without building a 50-person team

We've helped 4 mid-market funds ($50M-$300M AUM) build AI earnings analysis systems. The report shares what we learned.

Want it? Just reply and I'll send it over - no pitch, just insights.

Best,
{YourName}`
}

const TEMPLATE_GENERAL = {
  subject: "How LLMs predict earnings surprises better than consensus estimates",
  body: `Hi {FirstName},

I help finance firms like {CompanyName} leverage AI for research without building large teams.

I just finished a report called "The AI Earnings Edge Report" that shows how LLMs extract sentiment signals from earnings calls - signals that predict earnings surprises better than consensus estimates.

**What's in the report:**
- How LLM-extracted management tone predicts earnings surprises
- The sentiment signal that beats consensus estimates
- Real examples from 4 mid-market funds ($50M-$300M AUM)
- A playbook on leveraging AI for research without building a 50-person team

One fund we worked with improved earnings surprise prediction accuracy by 23%.

Want the report? Just reply and I'll send it over - no pitch, just insights.

Best,
{YourName}`
}

function selectTemplate(vertical: string | null): typeof TEMPLATE_HEDGE_FUND {
  if (!vertical) return TEMPLATE_GENERAL
  
  const v = vertical.toLowerCase()
  if (v === 'hedge_fund' || v === 'asset_manager') {
    return TEMPLATE_HEDGE_FUND
  }
  if (v === 'private_equity') {
    return TEMPLATE_PRIVATE_EQUITY
  }
  return TEMPLATE_GENERAL
}

function personalizeTemplate(template: typeof TEMPLATE_HEDGE_FUND, firstName: string, companyName: string): { subject: string; body: string } {
  return {
    subject: template.subject.replace(/{FirstName}/g, firstName),
    body: template.body
      .replace(/{FirstName}/g, firstName)
      .replace(/{CompanyName}/g, companyName)
      .replace(/{YourName}/g, YOUR_NAME)
  }
}

function getNextScheduledTime(lastScheduled: Date | null, index: number): Date {
  const now = new Date()
  const start = lastScheduled && lastScheduled > now ? lastScheduled : now
  
  // Add 5-20 minutes spacing (randomized)
  const minutesToAdd = 5 + Math.floor(Math.random() * 16) // 5-20 minutes
  const scheduled = new Date(start.getTime() + minutesToAdd * 60 * 1000)
  
  // Ensure business hours (9 AM - 6 PM ET, Mon-Fri)
  const etHour = new Date(scheduled.toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours()
  const dayOfWeek = scheduled.getDay() // 0 = Sunday, 5 = Friday
  
  // If outside business hours or weekend, move to next business day 9 AM ET
  if (dayOfWeek === 0 || dayOfWeek === 6 || etHour < 9 || etHour >= 18) {
    const daysToAdd = dayOfWeek === 6 ? 2 : dayOfWeek === 0 ? 1 : 0
    scheduled.setDate(scheduled.getDate() + daysToAdd)
    scheduled.setHours(9, 0, 0, 0)
  }
  
  return scheduled
}

async function main() {
  const args = process.argv.slice(2)
  const limitArg = args.find(arg => arg.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined
  const dryRun = args.includes('--dry-run')

  console.log('\n📧 Creating Email Messages\n')

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
    console.error('❌ Campaign finance-leadgen-1000 not found. Run link-contacts-to-campaign.ts first.')
    process.exit(1)
  }

  // Get account (email account)
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('external_id', UNIPILE_EMAIL_ACCOUNT_ID)
    .maybeSingle()

  if (!account) {
    console.error(`❌ Account not found for UNIPILE_EMAIL_ACCOUNT_ID: ${UNIPILE_EMAIL_ACCOUNT_ID}`)
    console.error('   Create account record in Supabase first')
    process.exit(1)
  }

  // Get contacts linked to campaign that don't have messages yet
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

  // Get existing messages to find last scheduled time
  const { data: lastMessage } = await supabase
    .from('messages')
    .select('scheduled_at')
    .eq('campaign_id', campaign.id)
    .eq('channel', 'email')
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastScheduled = lastMessage?.scheduled_at ? new Date(lastMessage.scheduled_at) : null

  // Filter contacts with emails and companies
  const readyContacts = campaignContacts
    .filter(cc => {
      const contact = cc.contacts as any
      return contact?.email && contact?.first_name && contact?.companies
    })
    .slice(0, limit)

  console.log(`📋 Processing ${readyContacts.length} contacts`)

  // Check for existing messages
  const contactIds = readyContacts.map(cc => (cc.contacts as any).id)
  const { data: existingMessages } = await supabase
    .from('messages')
    .select('contact_id')
    .in('contact_id', contactIds)
    .eq('campaign_id', campaign.id)
    .eq('channel', 'email')
    .eq('sequence_step', 1)

  const existingContactIds = new Set((existingMessages || []).map(m => m.contact_id))
  const newContacts = readyContacts.filter(cc => !existingContactIds.has((cc.contacts as any).id))

  console.log(`   Already have messages: ${existingContactIds.size}`)
  console.log(`   New messages to create: ${newContacts.length}`)

  if (newContacts.length === 0) {
    console.log('\n✅ All contacts already have messages!')
    process.exit(0)
  }

  // Create messages
  const messagesToInsert = []
  let currentScheduled = lastScheduled

  for (let i = 0; i < newContacts.length; i++) {
    const cc = newContacts[i]
    const contact = cc.contacts as any
    const company = contact.companies as any

    const template = selectTemplate(company.vertical)
    const personalized = personalizeTemplate(
      template,
      contact.first_name || 'there',
      company.name || 'your firm'
    )

    currentScheduled = getNextScheduledTime(currentScheduled, i)

    messagesToInsert.push({
      campaign_id: campaign.id,
      contact_id: contact.id,
      account_id: account.id,
      channel: 'email',
      sequence_step: 1,
      subject: personalized.subject,
      body: personalized.body,
      personalization_used: {
        FirstName: contact.first_name,
        CompanyName: company.name,
        YourName: YOUR_NAME
      },
      scheduled_at: currentScheduled.toISOString(),
      status: 'pending'
    })
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN - Would create messages:\n')
    messagesToInsert.slice(0, 3).forEach((msg, idx) => {
      console.log(`Message ${idx + 1}:`)
      console.log(`  To: ${readyContacts[idx].contacts.email}`)
      console.log(`  Subject: ${msg.subject}`)
      console.log(`  Scheduled: ${msg.scheduled_at}`)
      console.log('')
    })
    console.log(`... and ${messagesToInsert.length - 3} more`)
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
  console.log(`\n💡 Next steps:`)
  console.log(`   1. Review messages in Supabase`)
  console.log(`   2. Set up Railway cron: node scripts/process-message-queue.js`)
  console.log(`   3. Monitor sending via process-message-queue.js logs`)
}

main().catch(console.error)
