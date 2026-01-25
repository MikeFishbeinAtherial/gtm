# Networking Campaign Compatibility with New System

**Date:** January 25, 2026  
**Campaign:** Atherial AI Roleplay Training - 2025 Q1  
**Slug:** `atherial-ai-roleplay-2025-q1`

## ✅ Status: Campaign Will Continue Running

The LinkedIn networking campaign uses a **separate system** (`networking_campaign_batches` + `networking_outreach`) that is **fully compatible** with the new send queue system. Both systems can run simultaneously without conflicts.

---

## What Was Updated

### 1. **Global Outreach Tracking** ✅
Both campaign workers now log to `outreach_history` for the 60-day global rule:

- **`campaign-worker.js`** (lines 530-546): Updated to find matching `contact_id` by LinkedIn URL
- **`process-message-queue.js`** (lines 666-700): Added `outreach_history` logging for networking messages

**Why this matters:** Prevents duplicate outreach across different campaigns (e.g., if someone is in both a networking campaign and a cold email campaign).

### 2. **Message Spacing** ✅
Already correctly configured:

- **`campaign-worker.js`**: 6-16 minute random delays (lines 74-75)
- **`process-message-queue.js`**: Runs every 5 minutes, processes 1 message per run (natural spacing)

### 3. **Daily Limits** ✅
Already enforced:

- **Max 38 messages/day** (safety cap below LinkedIn's 40/day limit)
- Daily counter resets at midnight ET
- Both workers respect the same daily limit

### 4. **Duplicate Prevention** ✅
Multiple layers of protection:

1. **Same campaign duplicate check**: Prevents sending twice in the same campaign
2. **Cross-campaign duplicate check**: Prevents sending across multiple campaigns
3. **Atomic locking**: `status = 'sending'` prevents race conditions
4. **Global 60-day rule**: `outreach_history` tracks all outreach globally

---

## How It Works

### Two Parallel Systems

```
┌─────────────────────────────────────┐
│  NEW SYSTEM: send_queue             │
│  • Cold email campaigns             │
│  • Uses campaigns table             │
│  • Processed by process-message-    │
│    queue.js cron (every 5 min)      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  NETWORKING SYSTEM:                 │
│  networking_outreach                 │
│  • LinkedIn networking campaigns    │
│  • Uses networking_campaign_batches  │
│  • Processed by campaign-worker.js  │
│    (continuous) OR                  │
│  • process-message-queue.js         │
│    (cron, 1 per run)                │
└─────────────────────────────────────┘
```

**Key Point:** These systems are **independent** and don't interfere with each other.

---

## Campaign Worker Configuration

### For Continuous Worker (`campaign-worker.js`)

**Run on Railway:**
```bash
CAMPAIGN_NAME="Atherial AI Roleplay Training - 2025 Q1" node scripts/campaign-worker.js
```

**Or:**
```bash
node scripts/campaign-worker.js "Atherial AI Roleplay Training - 2025 Q1"
```

**Safety Settings:**
- Max messages/day: 38
- Delay between messages: 6-16 minutes (random)
- Business hours: 9 AM - 6 PM ET (Mon-Fri)
- Check interval: Every 1 minute

### For Cron Job (`process-message-queue.js`)

**Already running on Railway** (every 5 minutes)

- Processes 1 networking message per run
- Natural spacing enforced by cron frequency
- Same safety checks as continuous worker

---

## Verification Checklist

- [x] Campaign worker logs to `outreach_history`
- [x] Cron job logs to `outreach_history`
- [x] Message spacing: 6-16 minutes ✅
- [x] Daily limits: 38/day ✅
- [x] Duplicate prevention: Multiple layers ✅
- [x] Business hours: 9 AM - 6 PM ET ✅
- [x] No conflicts with new `send_queue` system ✅

---

## Current Campaign Stats

**Campaign:** `atherial-ai-roleplay-2025-q1`

- **Sent:** 334 messages
- **Pending:** 618 messages
- **Failed:** 16 messages
- **Skipped:** 3 messages
- **Total:** 971 messages
- **Progress:** 34.4% complete

**Timeline:**
- First sent: January 16, 2026
- Last sent: January 25, 2026 (today)
- Next scheduled: January 25, 2026 at 3:22 PM ET
- Campaign ends: February 7, 2026

---

## What Happens Next

1. **Campaign continues running** as before
2. **All sends logged to `outreach_history`** for global tracking
3. **60-day rule enforced** automatically via trigger
4. **No duplicate messages** across campaigns
5. **Proper spacing maintained** (6-16 minutes)

---

## Troubleshooting

### If campaign stops sending:

1. **Check campaign status:**
   ```sql
   SELECT status FROM networking_campaign_batches 
   WHERE slug = 'atherial-ai-roleplay-2025-q1';
   ```
   Should be `'in_progress'` (not `'paused'` or `'completed'`)

2. **Check daily limit:**
   ```sql
   SELECT COUNT(*) FROM networking_outreach
   WHERE status = 'sent'
   AND sent_at >= CURRENT_DATE;
   ```
   Should be < 38

3. **Check business hours:**
   - Must be Mon-Fri, 9 AM - 6 PM ET

4. **Check for pending messages:**
   ```sql
   SELECT COUNT(*) FROM networking_outreach
   WHERE batch_id = (
     SELECT id FROM networking_campaign_batches 
     WHERE slug = 'atherial-ai-roleplay-2025-q1'
   )
   AND status = 'pending'
   AND scheduled_at <= NOW();
   ```

---

## Summary

✅ **Your networking campaign will continue running without interruption.**

The new send queue system (`send_queue`) is for **cold email campaigns** only. Your LinkedIn networking campaign uses the existing `networking_outreach` system, which has been updated to:

1. Log to `outreach_history` for global tracking
2. Respect the 60-day rule
3. Prevent duplicates across campaigns
4. Maintain proper spacing (6-16 minutes)

**No action required** - the campaign will continue automatically.
