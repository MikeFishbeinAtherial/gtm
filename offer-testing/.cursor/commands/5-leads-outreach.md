# /offer-send - Schedule and Send Messages

Schedule messages with smart spacing and send them automatically via Railway cron jobs.

**⚠️ This command will create scheduled messages that WILL BE SENT AUTOMATICALLY. Make sure you've reviewed your leads and copy first.**

---

## Status: IMPLEMENTED ✅

The scheduling system is now live! Messages are scheduled at campaign creation time and sent automatically by Railway cron jobs.

---

## What This Command Does

1. **Generate message queue** → Create personalized messages for all campaign contacts
2. **Schedule with smart spacing** → Use MessageScheduler service to spread messages over time
3. **Insert to database** → Store messages with `scheduled_at` timestamps and `status = 'pending'`
4. **Railway cron sends automatically** → Every 5 minutes, cron job sends due messages via Unipile
5. **Monitor progress** → Use Supabase views to track sending progress and results, same should show up in our new user intrface web app. 

---

## Prerequisites

- ✅ Offer exists (`/new-offer` completed)
- ✅ Campaign exists (`/offer-campaign` completed)
- ✅ Leads found (`/offer-launch` completed)
- ✅ Campaign status = 'ready'
- ✅ Unipile API key set in `.env` and Railway
- ✅ LinkedIn and/or email account connected in Unipile
- ✅ Unipile account IDs added to Railway + `.env.local`
- ✅ Unipile accounts upserted in Supabase
- ✅ Contacts linked to campaign before message creation

---

## Input Required

```
/offer-send {offer-slug} {campaign-slug}
```

**Optional parameters:**
- `--batch` - Review N messages at a time (default: 10)
- `--auto-approve` - Skip review (NOT RECOMMENDED, violates human-in-loop)
- `--dry-run` - Show what would be sent without actually sending

**Examples:**
```
/offer-send sales-roleplay-trainer hiring-signal-q1
/offer-send sales-roleplay-trainer pvp-benchmarks --batch 20
/offer-send sales-roleplay-trainer tech-stack --dry-run
```

---

## Message Scheduling System

When launching a campaign, the system automatically schedules messages:

### How It Works

1. **Cursor calls Scheduler Service** when campaign is created
2. **Scheduler queries existing queue** - finds last scheduled message per channel
3. **Scheduler assigns `scheduled_at`** to each new message:
   - 6-16 min random intervals between messages
   - Max 40 LinkedIn messages per day per account
   - Max 20 emails per business day per account
   - Per-account daily limits are enforced independently
   - Business hours only (9 AM - 5 PM) for cold email campaigns, networking linkedin campaigns can differ
   - Weekdays only (Mon-Fri) for cold email campaigns, networking linkedin campaigns can differ
4. **Messages inserted to Supabase** with their scheduled timestamps

### Explicit Unipile Account Setup (Required)

1. Add account IDs to `.env.local` and Railway:
   - `UNIPILE_EMAIL_ACCOUNT_ID_AICOM`
   - `UNIPILE_EMAIL_ACCOUNT_ID_CO`
2. Upsert accounts into Supabase:
   - `npx tsx scripts/upsert-unipile-accounts.ts`
3. Confirm accounts appear in `accounts` table:
   - Each message will store `account_id` in `messages`

### Campaign Linking (Before Message Creation)

1. Link contacts with emails to campaign:
   - `npx tsx scripts/link-roleplay-contacts-to-campaign.ts`
2. Only linked `campaign_contacts.status = 'queued'` are used for message creation

### Key File: `src/lib/services/message-scheduler.ts`

Always use this service when creating messages:

```typescript
import { scheduleNewMessages } from '@/lib/services/message-scheduler';

// After generating messages, schedule them
await scheduleNewMessages(campaignId, messages);
```

### Configuration

Default scheduling config (can be overridden per campaign):

```json
{
  "daily_limit": 40,
  "min_interval_minutes": 5,
  "max_interval_minutes": 10,
  "business_hours_start": 8,
  "business_hours_end": 19,
  "send_days": [0, 1, 2, 3, 4, 5, 6]
}
```

### Campaign Types

Choose the appropriate campaign type for your outreach:

**Cold Outreach** (`campaign_type: 'cold_outreach'`)
- For prospecting new contacts
- Never messages 1st degree LinkedIn connections
- Sends connection requests to 2nd/3rd degree connections

**Networking** (`campaign_type: 'networking'`)
- For reaching existing network
- Allows messaging 1st degree connections
- Sends DMs to all connection degrees

### Railway Cron Job

- Runs every 5 minutes
- Queries: `send_queue` items where `scheduled_for <= NOW()` and `status = 'pending'` (LIMIT 1)
- Sends only 1 message per cron run (spaced 6-15 min apart)
- Respects campaign type rules for connection messaging
- Script: `scripts/process-message-queue.js`

### Messages vs Send Queue (Important)

- `messages` = the **source of truth** for what we intend to send (content, subject, account, scheduled_at).
- `send_queue` = the **execution queue** that the Railway cron actually reads.
- If a message only exists in `messages`, **it will not send** until it is enqueued.
- Always enqueue after message creation (or create directly into `send_queue`).

### How Messages Get Enqueued

**Current Process:**
1. Scripts create rows in `messages` table (content + schedule)
2. **Manual step required:** Enqueue into `send_queue` via SQL or script
3. Railway cron reads `send_queue` and sends

**Why Two Tables?**
- `messages` = **persistent record** (what we planned to send, audit trail)
- `send_queue` = **execution queue** (what's ready to send right now)
- Separation allows: editing messages before sending, pausing without losing data, retry logic

**Enqueue SQL (run after creating messages):**
```sql
INSERT INTO send_queue (
  campaign_id,
  campaign_contact_id,
  contact_id,
  account_id,
  channel,
  sequence_step,
  subject,
  body,
  scheduled_for,
  priority,
  status,
  external_message_id
)
SELECT
  m.campaign_id,
  m.campaign_contact_id,
  m.contact_id,
  m.account_id,
  m.channel,
  m.sequence_step,
  m.subject,
  m.body,
  m.scheduled_at,
  5,
  'pending',
  m.id::text
FROM messages m
WHERE m.campaign_id = 'YOUR_CAMPAIGN_ID'
  AND m.status IN ('pending', 'queued')
  AND NOT EXISTS (
    SELECT 1 FROM send_queue sq WHERE sq.external_message_id = m.id::text
  );
```

**What Happens After Sending:**
- `send_queue.status` updates: `pending → sent` (or `failed` if error)
- `messages.status` updates: `queued → sent` (linked via `external_message_id`)
- **Rows are NOT deleted** - kept for audit/logging
- `send_queue.sent_at` timestamp recorded
- `messages.sent_at` timestamp recorded

### Monitoring

Use these Supabase views to monitor progress:

```sql
-- Recent activity
SELECT * FROM message_activity_recent LIMIT 10;

-- Today's progress
SELECT * FROM today_sending_progress;

-- Campaign overview
SELECT * FROM campaign_progress;
```

### Canonical Tracking (IDs)

- **Message ID**: `messages.id` (UUID)
- **Campaign ID**: `messages.campaign_id`
- **Contact ID**: `messages.contact_id`
- **Account ID**: `messages.account_id` (ties the exact Unipile sender)

### Emergency Controls

To stop sending immediately:

```sql
-- Pause all campaigns
UPDATE campaigns SET status = 'paused' WHERE status = 'active';

-- Stop Railway service in Railway Dashboard
-- Go to Railway → Your Service → Stop
```

---

## Campaign Naming + Metadata (Required)

Every campaign must include the following in **name**, **slug**, and stored metadata:

- Cold vs networking
- Offer (e.g., roleplay)
- Channel (email and/or linkedin)
- Account names + IDs (Unipile)
- Signal (e.g., hiring)
- ICP (e.g., PMRE or hedge funds)

**Example name + slug:**
```
cold-email-roleplay-aicom-hiring-012926
```

**Required Supabase columns (campaigns):**
- `campaign_slug`
- `campaign_type`
- `channel`
- `account_ids` (JSONB array of account IDs + names)
- `target_criteria` (JSONB: signal, icp, offer, channel, accounts)

If these are missing in your DB, run the `setup-db.sql` campaign migration section.

## Proposed Process

### Step 1: Load Campaign & Queue

```typescript
import { supabaseAdmin } from '@/lib/clients/supabase'

// Load campaign
const { data: campaign } = await supabaseAdmin
  .from('campaigns')
  .select('*, offer:offers(*)')
  .eq('id', campaignId)
  .single()

// Load queued contacts
const { data: queuedContacts } = await supabaseAdmin
  .from('campaign_contacts')
  .select(`
    *,
    contact:contacts(*),
    company:companies(*)
  `)
  .eq('campaign_id', campaignId)
  .eq('status', 'queued')
  .order('created_at', { ascending: true })

// Check rate limits
const { canSend, remaining } = await checkRateLimits(campaign.account_id)
```

Display summary:
```
📋 Campaign: {Campaign Name}
   Offer: {Offer Name}
   Status: {status}

📊 Queue Status:
   • Total contacts: 69
   • Queued: 69
   • Already sent: 0
   • Skipped: 21

⏱️  Rate Limits (today):
   • Connection requests: 12/20 used, 8 remaining
   • Messages: 23/40 used, 17 remaining
   • Can send now: Yes (business hours)

📝 Copy Variants:
   • Email: 2 variants (A/B test)
   • LinkedIn: 2 variants (A/B test)

Ready to review? (Y/n)
```

### Step 2: Message Review Loop

For each contact in queue (in batches of 10):

```
────────────────────────────────────────
Message 1 of 69

Company: Acme Corp (acme.com)
├─ Size: 45 employees
├─ Industry: B2B SaaS
├─ Signal: Hiring 3 SDRs in last 14 days
└─ Fit Score: 9/10

Contact: John Smith
├─ Title: VP Sales
├─ LinkedIn: linkedin.com/in/johnsmith
├─ Connection Degree: 2nd
└─ Shared Connections: 3

Copy Variant: LinkedIn v1 (PVP approach)
─────────────────────────────────────────
Subject: Sales rep ramp time at B2B SaaS companies

Hi John,

Saw Acme is hiring 3 SDRs. Based on our research across 50 B2B SaaS 
companies with similar profiles, the average SDR takes 87 days to first deal.

We compiled a report on what the top 20% do differently (they average 
42 days). Would you want this benchmark data?

No pitch, just the report if useful.

Best,
{Your Name}
─────────────────────────────────────────

[A] Approve & Send
[E] Edit message
[S] Skip this contact
[V] Switch to variant 2
[Q] Quit (save progress)

Your choice:
```

User options:
- **Approve** → Queue for sending
- **Edit** → Open inline editor, modify message, then approve
- **Skip** → Mark as skipped, move to next
- **Switch variant** → Try different copy version
- **Quit** → Save progress, resume later

### Step 3: Batch Send

After user reviews a batch (e.g., 10 messages):

```
✅ Reviewed 10 messages:
   • 7 approved
   • 2 edited
   • 1 skipped

🚀 Ready to send these 9 messages?
   ⚠️  This will use Unipile API to send actual LinkedIn messages
   
Sending will respect:
   • Rate limits (max 20 conn req, 40 msg per day)
   • Business hours (9am-6pm recipient timezone)
   • Random delays (2-5 min between sends)
   • LinkedIn safety rules

Proceed? (Y/n)
```

If yes:

```typescript
import { unipileSendMessage } from '@/lib/clients/unipile'
import { checkLinkedInSafety } from '@/lib/utils/linkedin-safety'

for (const message of approvedMessages) {
  // Final safety check
  const safetyCheck = await checkLinkedInSafety({
    account_id: campaign.account_id,
    action_type: 'message',
    contact: message.contact
  })
  
  if (!safetyCheck.allowed) {
    console.log(`⏸️  Rate limit reached (${safetyCheck.reason})`)
    console.log(`   Stopping for today. ${approvedMessages.length - i} messages queued for tomorrow.`)
    break
  }
  
  // Send message
  try {
    const result = await unipileSendMessage({
      account_id: campaign.account_id,
      recipient_linkedin_url: message.contact.linkedin_url,
      message_text: message.final_text,
      send_as_connection_request: message.contact.connection_degree > 1
    })
    
    // Log to database
    await supabaseAdmin.from('messages').insert({
      campaign_id: campaign.id,
      campaign_contact_id: message.campaign_contact_id,
      contact_id: message.contact_id,
      company_id: message.company_id,
      account_id: campaign.account_id,
      channel: 'linkedin',
      message_type: result.was_connection_request ? 'connection_request' : 'message',
      subject: null,
      body: message.final_text,
      copy_variant: message.variant,
      status: 'sent',
      sent_at: new Date()
    })
    
    // Log activity for rate limiting
    await supabaseAdmin.from('account_activity').insert({
      account_id: campaign.account_id,
      message_id: result.message_id,
      contact_id: message.contact_id,
      action_type: result.was_connection_request ? 'connection_request' : 'message',
      status: 'success',
      created_at: new Date()
    })
    
    // Update campaign_contacts
    await supabaseAdmin
      .from('campaign_contacts')
      .update({ status: 'in_progress', current_step: 1 })
      .eq('id', message.campaign_contact_id)
    
    console.log(`✅ Sent to ${message.contact.name} at ${message.company.name}`)
    
    // Delay before next send (2-5 min random)
    const delay = Math.random() * (300000 - 120000) + 120000
    console.log(`   Waiting ${Math.round(delay/1000/60)} minutes...`)
    await sleep(delay)
    
  } catch (error) {
    console.error(`❌ Failed to send to ${message.contact.name}: ${error.message}`)
    
    // Log failure
    await supabaseAdmin.from('account_activity').insert({
      account_id: campaign.account_id,
      contact_id: message.contact_id,
      action_type: 'message',
      status: 'failed',
      error_message: error.message,
      created_at: new Date()
    })
  }
}
```

Display progress:
```
🚀 Sending messages...

✅ Sent to John Smith @ Acme Corp (waiting 3 min...)
✅ Sent to Jane Doe @ Beta Inc (waiting 4 min...)
✅ Sent to Bob Johnson @ Gamma LLC (waiting 2 min...)
⏸️  Rate limit reached (18/20 connection requests today)
   Stopping for today. 6 messages queued for tomorrow.

📊 Session Summary:
   • Reviewed: 10 messages
   • Sent: 3 messages
   • Remaining in queue: 66
   • Will resume: Tomorrow at 9am

💡 Tip: Run `/offer-send` again tomorrow to continue.
```

### Step 4: Resume Support

Save progress between sessions:

```typescript
// Campaign status tracks overall progress
await supabaseAdmin
  .from('campaigns')
  .update({
    status: 'active', // Change from 'ready' to 'active'
    first_send_at: firstSendAt,
    last_send_at: new Date(),
    total_sent: campaign.total_sent + sentCount,
    contacts_sent: campaign.contacts_sent + sentCount,
    contacts_remaining: campaign.contacts_remaining - sentCount
  })
  .eq('id', campaign.id)

// Individual contact status
// 'queued' → 'in_progress' → 'completed' or 'replied'
```

When user runs `/offer-send` again:
```
📋 Campaign: hiring-signal-q1
   Status: Active (in progress)

📊 Progress:
   • Total contacts: 69
   • Sent: 3
   • In queue: 66
   • Skipped: 21

⏱️  Rate Limits:
   • Reset: Tomorrow at 12:00 AM
   • Can send: 0 today (limit reached)
   
Options:
[C] Continue reviewing messages
[P] Pause campaign
[S] View stats
[Q] Quit

Your choice:
```

---

## LinkedIn Safety Integration

Reference: @file src/lib/utils/linkedin-safety.ts

All sends must pass safety checks:

```typescript
export async function checkLinkedInSafety(params: {
  account_id: string
  action_type: 'connection_request' | 'message'
  contact: Contact
}): Promise<SafetyCheckResult> {
  // Check 1: Daily rate limits
  const counts = await getLinkedInDailyCounts(params.account_id)
  if (counts[params.action_type] >= LINKEDIN_LIMITS[params.action_type]) {
    return { allowed: false, reason: 'rate_limit_exceeded' }
  }
  
  // Check 2: Business hours
  if (!isBusinessHours()) {
    return { allowed: false, reason: 'outside_business_hours' }
  }
  
  // Check 3: Skip 1st degree connections
  if (params.contact.connection_degree === 1) {
    return { allowed: false, reason: '1st_degree_connection' }
  }
  
  // Check 4: Minimum delay since last action
  const lastAction = await getLastActionTime(params.account_id)
  const minDelay = 120000 // 2 minutes
  if (Date.now() - lastAction < minDelay) {
    return { allowed: false, reason: 'too_soon' }
  }
  
  return { allowed: true }
}
```

---

## Database Schema Integration

### Messages Table
Tracks every message sent:
```sql
messages
├─ campaign_id → which campaign
├─ contact_id → to whom
├─ body → message text
├─ copy_variant → which version
├─ status → sent/delivered/opened/replied
├─ sent_at → when
└─ replied_at → when they responded
```

### Account Activity Table
Tracks actions for rate limiting:
```sql
account_activity
├─ account_id → which LinkedIn account
├─ action_type → connection_request/message
├─ status → success/failed/rate_limited
└─ created_at → when
```

### Campaign Contacts Table
Tracks per-contact status:
```sql
campaign_contacts
├─ campaign_id
├─ contact_id
├─ status → queued/in_progress/completed/replied
├─ current_step → which message in sequence
└─ last_contacted_at
```

---

## Future Enhancements (V2+)

- [ ] Web UI for message review (instead of CLI)
- [ ] Reply monitoring and classification
- [ ] Automatic follow-ups based on engagement
- [ ] A/B test results analysis
- [ ] Bulk actions (approve all, skip all)
- [ ] Message templates with variable substitution
- [ ] Schedule sends for specific times
- [ ] Multi-channel orchestration (LinkedIn + Email)

---

## Related Files

- **LinkedIn Safety:** `src/lib/utils/linkedin-safety.ts` (CRITICAL - must use)
- **Unipile Client:** `src/lib/clients/unipile.ts` (sending implementation)
- **Database Schema:** `scripts/setup-db.sql` (messages, account_activity tables)
- **Types:** `src/lib/types/message.ts`, `src/lib/types/campaign.ts`
- **Previous Command:** `.cursor/commands/offer-launch.md` (creates the queue)
- **Framework:** `.cursor/rules/project.mdc` (LinkedIn safety rules)

