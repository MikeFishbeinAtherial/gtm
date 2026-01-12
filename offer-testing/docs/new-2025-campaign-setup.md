# New 2025 LinkedIn Campaign - Setup Guide

## Overview

You want to start a new campaign targeting your 1st-degree LinkedIn connections who:
- Connected with you in 2025
- Haven't been messaged in the past 30 days
- Have full message history for context
- Their companies are checked for hiring salespeople (via Sumble)

---

## What We've Created

### 1. **Codebase Guide** (`docs/codebase-guide.md`)
A comprehensive guide explaining:
- What "offers" and "commands" mean
- How the networking campaign system works
- Where to find API documentation
- Recommendations for improvements

### 2. **Filter Script** (`scripts/filter-2025-connections.js`)
A script that:
- ✅ Finds connections from 2025
- ✅ Filters out people messaged in last 30 days
- ✅ Pulls full message history for context
- ✅ Enriches with Sumble to find companies hiring salespeople
- ✅ Shows top candidates prioritized by hiring signals

---

## Step-by-Step Setup

### Step 1: Sync LinkedIn Data (If Not Already Done)

First, make sure you have all your connections and messages synced:

```bash
cd offer-testing
npx ts-node --esm scripts/sync-linkedin.ts
```

This will:
- Pull all 1st-degree connections from Unipile
- Pull all conversations and messages
- Store everything in Supabase

**Time:** ~2-3 minutes for initial sync

---

### Step 2: Run the Filter Script

Run the new filter script to find eligible connections:

```bash
node scripts/filter-2025-connections.js
```

**What it does:**
1. Queries `linkedin_connections` for connections from 2025
2. Excludes anyone messaged in last 30 days (checks `linkedin_messages`)
3. Loads full message history for each connection
4. Checks Sumble for hiring signals (sales roles)
5. Shows top candidates

**Output:**
- Summary statistics
- Top 10 candidates (hiring sales + has message history)
- Full data ready for campaign creation

**Note:** This uses Sumble API credits (3 credits per job search). For 100 connections, expect ~100-300 credits.

---

### Step 3: Create Campaign Batch in Supabase

After reviewing the filtered connections, create a campaign batch:

```sql
-- Create the new campaign batch
INSERT INTO networking_campaign_batches (
  name,
  description,
  message_template,
  personalization_instructions,
  target_filters,
  status
) VALUES (
  '2025-connections-q1',
  'Reconnecting with connections from 2025, focusing on companies hiring sales',
  'Hey {{firstname}}! Hope you''re doing well. I noticed {{company}} is hiring for {{role}} - exciting growth! Would love to reconnect and see how I can help.',
  'Personalize based on: 1) Last message context, 2) Their current role, 3) If their company is hiring sales',
  '{
    "connected_in_2025": true,
    "exclude_messaged_last_30_days": true,
    "prefer_hiring_sales": true
  }'::jsonb,
  'draft'
)
RETURNING *;
```

Save the `id` from the result - you'll need it for the next step.

---

### Step 4: Generate Messages

Once you have the campaign batch ID, you can either:

**Option A: Use existing script** (modify it for your campaign)
```bash
# Edit scripts/generate-networking-messages.js
# Change the campaign name to match your new batch
# Then run:
node scripts/generate-networking-messages.js
```

**Option B: Create messages manually in Supabase**

For each eligible connection, insert into `networking_outreach`:

```sql
INSERT INTO networking_outreach (
  batch_id,
  connection_id,
  personalized_message,
  personalization_notes,
  status
) VALUES (
  '<your-batch-id>',
  '<connection-id>',
  'Your personalized message here...',
  'Mentioned their new role and hiring signal',
  'pending'
);
```

---

### Step 5: Review Messages

Before sending, review each message:

```sql
-- Get all pending messages for review
SELECT 
  no.id,
  lc.full_name,
  lc.current_company,
  lc.current_title,
  no.personalized_message,
  no.personalization_notes,
  lc.message_count,
  lc.last_interaction_at
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE no.batch_id = '<your-batch-id>'
  AND no.status = 'pending'
ORDER BY lc.priority DESC NULLS LAST, lc.last_interaction_at ASC;
```

Review and approve/edit each message. Update status to `'approved'` when ready.

---

### Step 6: Send Messages

Use the existing message queue processor:

```bash
node scripts/process-message-queue.js
```

**Or** send manually via LinkedIn and update status:

```sql
UPDATE networking_outreach
SET 
  status = 'sent',
  sent_at = NOW()
WHERE id = '<message-id>';
```

**Important:** Respect LinkedIn rate limits:
- Max 40 messages/day (recommended: 20-25)
- 2-5 minute delays between sends
- Business hours only (9am-6pm weekdays)

---

## Checking for Previous Campaigns

To avoid messaging people from the "Happy New Year" campaign:

```sql
-- Find people in the Happy New Year campaign
SELECT DISTINCT lc.id, lc.full_name, lc.current_company
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
JOIN networking_campaign_batches ncb ON no.batch_id = ncb.id
WHERE ncb.name LIKE '%happy%new%year%'
  AND no.status = 'sent'
  AND no.sent_at >= NOW() - INTERVAL '30 days';
```

Exclude these IDs when creating your new campaign batch.

---

## Message History Context

The filter script loads full message history. To view it:

```sql
-- Get message history for a specific connection
SELECT 
  lm.sent_at,
  lm.is_from_me,
  lm.message_text,
  CASE 
    WHEN lm.is_from_me THEN 'You'
    ELSE lc.full_name
  END as sender
FROM linkedin_messages lm
JOIN linkedin_connections lc ON lm.connection_id = lc.id
WHERE lm.connection_id = '<connection-id>'
ORDER BY lm.sent_at ASC;
```

Use this context to personalize your messages:
- Reference previous conversations
- Acknowledge time since last message
- Build on past topics

---

## Sumble Insights

The script checks Sumble for hiring signals. To see the data:

```sql
-- View connections with Sumble data (if stored)
-- Note: The current script shows this in console output
-- You may want to store this in a separate table or JSONB column

-- For now, re-run the filter script to see Sumble insights
```

**What Sumble tells you:**
- Is the company hiring sales roles?
- What specific roles (SDR, BDR, AE, Sales Manager)?
- When were jobs posted?
- Full job descriptions for personalization

**Use this for:**
- Prioritizing who to message first
- Personalizing messages with specific role mentions
- Understanding company growth signals

---

## Troubleshooting

### "No connections found from 2025"
- Check `linkedin_connections.connected_at` dates
- Make sure you've run `sync-linkedin.ts` recently
- Verify Unipile has your connection data

### "Sumble API errors"
- Check `SUMBLE_API_KEY` in `.env.local`
- Verify you have enough credits
- Rate limit: 10 requests/second (script has delays built in)

### "Message history not loading"
- Make sure you've synced messages: `sync-linkedin.ts`
- Check `linkedin_messages` table has data
- Verify `connection_id` foreign keys are correct

---

## Next Steps & Improvements

### Recommended Enhancements

1. **Store Sumble Data**
   - Add `sumble_insights` JSONB column to `linkedin_connections`
   - Store hiring signals, job titles, dates
   - Avoid re-checking same companies

2. **Campaign Comparison Function**
   - Create a function to check previous campaigns
   - Automatically exclude people messaged in last 30 days
   - Show overlap between campaigns

3. **Message History View**
   - Create a view: `connection_message_context`
   - Shows full thread in chronological order
   - Makes it easier to review before messaging

4. **Better Company Domain Extraction**
   - Enhance company name → domain mapping
   - Use Parallel or other APIs to get accurate domains
   - Improves Sumble search accuracy

5. **API Tool Documentation**
   - Create `context/api-tools/` folder structure
   - Detailed docs per API (Unipile, Sumble, etc.)
   - Code examples and use cases

---

## Questions?

Refer to:
- `docs/codebase-guide.md` - Understanding the system
- `docs/networking-architecture.md` - Networking campaign architecture
- `context/api-guides/sumble.md` - Sumble API guide
- `scripts/setup-networking-schema.sql` - Database schema

---

## Summary

✅ **Created:**
- Codebase guide explaining the system
- Filter script for 2025 connections
- This setup guide

🔄 **Next:**
1. Run `sync-linkedin.ts` (if needed)
2. Run `filter-2025-connections.js`
3. Review results and create campaign batch
4. Generate personalized messages
5. Review and send

💡 **Key Insight:**
The system is designed to help you be **thoughtful** about outreach, not spam at scale. Use the message history and Sumble insights to create genuine, personalized messages that add value.
