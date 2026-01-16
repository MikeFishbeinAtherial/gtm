# How Message Sending Works

**Last Updated:** January 16, 2026

---

## Overview

Messages are sent via two scripts that run on Railway:

| Script | How it Runs | Purpose |
|--------|-------------|---------|
| `process-message-queue.js` | Cron job (every 5 min) | Processes pending messages from **active** campaigns |
| `campaign-worker.js` | Continuous process | Alternative: runs continuously for a specific campaign |

---

## Database Tables

### `networking_outreach` (Main Table)

| Column | Type | Purpose |
|--------|------|---------|
| `status` | string | 'pending' → 'sending' → 'sent' / 'failed' / 'skipped' |
| `scheduled_at` | timestamp | When to send (must be in the past) |
| `sent_at` | timestamp | When actually sent (null until sent) |
| `batch_id` | uuid | Links to campaign |
| `connection_id` | uuid | Links to recipient |

### `networking_campaign_batches` (Campaign Table)

| Column | Type | Purpose |
|--------|------|---------|
| `status` | string | 'draft', 'active', 'paused', 'completed' |
| `sent_count` | integer | Number of messages sent |
| `name` | string | Campaign identifier |

---

## Message Sending Flow

```
1. Cron triggers process-message-queue.js (every 5 minutes)

2. Script queries for messages WHERE:
   - networking_outreach.status = 'pending'
   - networking_outreach.scheduled_at <= NOW()
   - networking_campaign_batches.status = 'in_progress'  ← CRITICAL!
   - Within send window (Mon-Fri, 9am-6pm ET)
   - Daily limit not exceeded (max 38/day)

3. If message found:
   a. Set status = 'sending' (atomic lock)
   b. Check for duplicates (same LinkedIn ID)
   c. Respect do_not_message list
   d. Send via Unipile API
   e. Set status = 'sent', sent_at = NOW() (with retries)
   f. Increment campaign sent_count

4. Message will NOT be sent again because status ≠ 'pending'
```

---

## Why Messages Don't Get Re-Sent

The `status` column acts as a state machine:

```
pending → sending → sent
                 ↘ failed
                 ↘ skipped
```

Once status changes from 'pending', the message is excluded from future queries:
```sql
.eq('status', 'pending')  -- Only pending messages are fetched
```

---

## How to Stop All Sending

### Option 1: Pause Campaign (Recommended)
```sql
UPDATE networking_campaign_batches 
SET status = 'paused' 
WHERE name = 'your-campaign-name';
```

### Option 2: Skip All Pending Messages
```sql
UPDATE networking_outreach 
SET status = 'skipped', skip_reason = 'Manually stopped'
WHERE status = 'pending';
```

### Option 3: Disconnect Railway
Disconnect GitHub from Railway to stop all cron jobs.

---

## How to Start a Campaign

1. Create campaign with status = 'draft'
2. Generate messages (creates outreach records with status = 'pending')
3. Schedule messages (set scheduled_at)
4. Activate campaign: `UPDATE networking_campaign_batches SET status = 'in_progress'`

---

## Duplicate Prevention (4 Layers)

| Layer | Check | What Happens |
|-------|-------|--------------|
| 1 | Application: Same campaign duplicate | Status → 'skipped' |
| 2 | Application: Cross-campaign duplicate | Status → 'skipped' |
| 3 | Atomic lock: status = 'sending' | Other processes skip |
| 4 | Database trigger | Raises exception on duplicate 'sent' |

---

## Scripts Reference

| Script | Usage |
|--------|-------|
| `campaign-worker.js "campaign-name"` | Run continuous worker for specific campaign |
| `process-message-queue.js` | Called by cron, processes all active campaigns |
| `stop-campaign.js` | Stop a campaign |
| `verify-no-duplicates.js` | Check for duplicate sent messages |

---

## Environment Variables Required

```
UNIPILE_DSN=https://api.unipile.com
UNIPILE_API_KEY=your-api-key
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

---

## Common Issues

### Issue: Messages not sending
1. Check campaign status is 'active'
2. Check messages have scheduled_at in the past
3. Check messages have status = 'pending'

### Issue: Duplicate messages sent
1. Run `node scripts/verify-no-duplicates.js`
2. Check if multiple crons are running
3. Verify duplicate prevention code is deployed

### Issue: Campaign not found
1. Check exact campaign name (case-sensitive)
2. Use: `SELECT name, status FROM networking_campaign_batches;`
