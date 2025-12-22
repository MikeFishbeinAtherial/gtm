# /offer-send - Review and Send Messages

Review queued messages and send them safely via Unipile, respecting LinkedIn rate limits.

**⚠️ This command will send actual messages. Make sure you've reviewed your leads and copy first.**

---

## Status: NOT YET IMPLEMENTED

This is a stub document describing the intended workflow. Implementation coming in V2.

**For now:** Manually send messages or use Unipile UI directly.

---

## What This Command Will Do

1. **Load campaign queue** → Get all contacts with status = 'queued'
2. **Match copy to contacts** → Select appropriate email/LinkedIn variant
3. **Personalize messages** → Insert company/contact-specific details
4. **Show review UI** → User approves/edits/skips each message
5. **Send via Unipile** → Respects rate limits and business hours
6. **Track results** → Log to database, monitor replies

---

## Prerequisites

- ✅ Offer exists (`/new-offer` completed)
- ✅ Campaign exists (`/offer-campaign` completed)
- ✅ Leads found (`/offer-launch` completed)
- ✅ Campaign status = 'ready'
- ✅ Unipile API key set in `.env`
- ✅ LinkedIn account connected in Unipile

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

