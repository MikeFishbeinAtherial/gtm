# Message Regeneration Guide

## Why Contacts Were Skipped

**Status: `skipped` with reason "No valid member_id (test mode)"**

During the 10-person test, contacts were skipped because:
- They had temporary `linkedin_id` values (`temp_*`) 
- These were created during import when contacts couldn't be matched to Unipile relations
- The test script skipped them to avoid sending to invalid recipients

**Total skipped:** 537 contacts

---

## Solution: Look Up Member IDs from Unipile

### How It Works

1. **Fetch ALL Unipile relations** (with pagination - ~7,667 total)
2. **Create lookup maps** by:
   - LinkedIn URL (normalized)
   - LinkedIn username (extracted from URL)
   - Public identifier
3. **Match skipped contacts** to Unipile relations
4. **Update `linkedin_id`** in `linkedin_connections` table
5. **Generate new messages** with variations A, B, C
6. **Schedule messages** 6-16 minutes apart using `scheduled_at`
7. **Reset status** from `skipped` → `pending`

---

## Message Variations

### Variant A (Original)
```
Happy holidays {{firstname}}! What's in store for you in 2026? 

Let me know if I can be a resource to anyone in your network who wants to implement custom AI agents or internal tools. Here are demo videos of some of what we've shipped to production: https://www.atherial.ai/work. Happy to share lessons and best practices.
```

### Variant B (Free Prototype Offer)
```
Happy holidays {{firstname}}! What's in store for you in 2026? 

We're building free AI prototypes in Jan for anyone referred by our networks. Let me know if we can be a resource to anyone you know who wants to implement custom agents or internal tools. Here are demo videos of some of what we've shipped to production: https://www.atherial.ai/work.
```

### Variant C (New Year + Specific Audience)
```
Happy new year {{firstname}}! What's in store for you in 2026? 

We're building free AI prototypes in Jan for business owners and gtm leaders who want to become AI native. 

Do you know anyone who wants to implement custom agents or internal tools? 

Here are demo videos of some of what we've shipped to production: https://www.atherial.ai/work.
```

**Distribution:** Randomly assigned to each contact (33% each)

---

## Scheduling: 6-16 Minutes Apart

**Why:** Railway cron runs every 5 minutes, so we need spacing to avoid sending at the same interval.

**How it works:**
- Each message gets a `scheduled_at` timestamp
- Random delay: 6-16 minutes between each message
- Campaign worker only sends messages where `scheduled_at <= now()`
- Messages are sent in order of `scheduled_at`

**Example schedule:**
```
Message 1: scheduled_at = 2025-12-29 10:00:00
Message 2: scheduled_at = 2025-12-29 10:08:00  (8 min delay)
Message 3: scheduled_at = 2025-12-29 10:19:00  (11 min delay)
Message 4: scheduled_at = 2025-12-29 10:32:00  (13 min delay)
...
```

---

## Running the Regeneration Script

```bash
node scripts/regenerate-networking-messages.js
```

**What it does:**
1. ✅ Fetches all Unipile relations (~7,667)
2. ✅ Matches skipped contacts to relations
3. ✅ Updates `linkedin_id` for matched contacts
4. ✅ Generates messages with random variations
5. ✅ Schedules messages 6-16 minutes apart
6. ✅ Resets `skipped` → `pending` for matched contacts
7. ✅ Skips the 11 already sent (won't regenerate)

---

## Campaign Worker Behavior

The campaign worker (`campaign-worker.js`) already handles `scheduled_at`:

```javascript
.eq('status', 'pending')
.not('scheduled_at', 'is', null)
.lte('scheduled_at', new Date().toISOString())
.order('scheduled_at', { ascending: true })
```

**This means:**
- ✅ Only sends `pending` messages
- ✅ Only sends messages where `scheduled_at` has passed
- ✅ Sends in chronological order
- ✅ Won't re-send `sent` messages (they're not `pending`)
- ✅ Won't send `skipped` messages (they're not `pending`)

---

## Expected Results

After running the script:
- **~525 contacts** will have `status = 'pending'`
- **~525 messages** scheduled 6-16 minutes apart
- **~175 messages** per variant (A, B, C)
- **Total time span:** ~50-140 hours (2-6 days) to send all messages
- **11 already sent** remain untouched

---

## Monitoring

**Check progress:**
```sql
SELECT 
  status,
  COUNT(*) as count
FROM networking_outreach
GROUP BY status;
```

**Check scheduled messages:**
```sql
SELECT 
  COUNT(*) as pending_scheduled,
  MIN(scheduled_at) as next_send,
  MAX(scheduled_at) as last_scheduled
FROM networking_outreach
WHERE status = 'pending'
  AND scheduled_at IS NOT NULL;
```

**Check variant distribution:**
```sql
SELECT 
  CASE 
    WHEN personalized_message LIKE '%Happy holidays%' AND personalized_message LIKE '%best practices%' THEN 'Variant A'
    WHEN personalized_message LIKE '%free AI prototypes%' AND personalized_message LIKE '%Happy holidays%' THEN 'Variant B'
    WHEN personalized_message LIKE '%Happy new year%' THEN 'Variant C'
    ELSE 'Unknown'
  END as variant,
  COUNT(*) as count
FROM networking_outreach
WHERE status = 'pending'
GROUP BY variant;
```

