# How to Find the Atherial AI Roleplay Campaign in Supabase

## Quick Summary

**Campaign Identifier:** `slug = 'atherial-ai-roleplay-2025-q1'`

**Current Status (as of query):**
- ✅ **Sent:** 334 messages
- 📋 **Pending:** 618 messages  
- ❌ **Failed:** 16 messages
- ⏭️ **Skipped:** 3 messages
- **Total:** 971 messages

**Campaign Details:**
- **Campaign ID:** `2a80165c-e69a-498d-9e84-5d6560d606c1`
- **Name:** "Atherial AI Roleplay Training - 2025 Q1"
- **Status:** `in_progress`
- **Created:** January 12, 2026

---

## Database Structure

### Primary Table: `networking_campaign_batches`

This table stores the campaign definition:

| Column | Type | Description | Key Value |
|--------|------|-------------|-----------|
| `id` | UUID | Primary key | `2a80165c-e69a-498d-9e84-5d6560d606c1` |
| `name` | TEXT | Campaign name | "Atherial AI Roleplay Training - 2025 Q1" |
| `slug` | TEXT | **Unique identifier** | **`'atherial-ai-roleplay-2025-q1'`** ⭐ |
| `description` | TEXT | Campaign description | "Outreach to 2025-2026 LinkedIn connections..." |
| `status` | TEXT | Campaign status | `'in_progress'` |
| `sent_count` | INTEGER | Messages sent | 334 |
| `reply_count` | INTEGER | Replies received | 0 |
| `created_at` | TIMESTAMPTZ | Creation time | 2026-01-12 19:33:54 |

### Messages Table: `networking_outreach`

This table stores individual messages for the campaign:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `batch_id` | UUID | **Foreign key** → `networking_campaign_batches.id` |
| `connection_id` | UUID | Foreign key → `linkedin_connections.id` |
| `personalized_message` | TEXT | The actual message content |
| `status` | TEXT | `'pending'`, `'sent'`, `'failed'`, `'skipped'` |
| `scheduled_at` | TIMESTAMPTZ | When to send (UTC) |
| `sent_at` | TIMESTAMPTZ | When actually sent (UTC) |
| `created_at` | TIMESTAMPTZ | Record creation time |

---

## How to Query the Campaign

### 1. Find the Campaign by Slug

```sql
SELECT 
  id,
  name,
  slug,
  status,
  sent_count,
  reply_count,
  created_at
FROM networking_campaign_batches
WHERE slug = 'atherial-ai-roleplay-2025-q1';
```

### 2. Count Messages by Status

```sql
SELECT 
  status,
  COUNT(*) as count
FROM networking_outreach
WHERE batch_id = (
  SELECT id FROM networking_campaign_batches 
  WHERE slug = 'atherial-ai-roleplay-2025-q1'
)
GROUP BY status
ORDER BY count DESC;
```

**Result:**
- `pending`: 618 messages
- `sent`: 334 messages
- `failed`: 16 messages
- `skipped`: 3 messages

### 3. Get Detailed Campaign Statistics

```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE status = 'skipped') as skipped_count,
  COUNT(*) as total_messages,
  MIN(scheduled_at) FILTER (WHERE status = 'pending') as next_scheduled_message,
  MAX(scheduled_at) FILTER (WHERE status = 'pending') as last_scheduled_message,
  MIN(sent_at) FILTER (WHERE status = 'sent') as first_sent_message,
  MAX(sent_at) FILTER (WHERE status = 'sent') as last_sent_message
FROM networking_outreach
WHERE batch_id = (
  SELECT id FROM networking_campaign_batches 
  WHERE slug = 'atherial-ai-roleplay-2025-q1'
);
```

**Result:**
- **Sent:** 334
- **Pending:** 618
- **Failed:** 16
- **Skipped:** 3
- **Total:** 971
- **Next scheduled:** 2026-01-25 20:22:00 UTC (3:22 PM ET)
- **Last scheduled:** 2026-02-07 21:21:00 UTC (4:21 PM ET)
- **First sent:** 2026-01-16 15:06:24 UTC
- **Last sent:** 2026-01-25 20:20:56 UTC

### 4. View Pending Messages with Contact Info

```sql
SELECT 
  no.id,
  no.status,
  no.scheduled_at AT TIME ZONE 'America/New_York' as scheduled_et,
  lc.full_name,
  lc.current_company,
  lc.current_title,
  no.personalized_message
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE no.batch_id = (
  SELECT id FROM networking_campaign_batches 
  WHERE slug = 'atherial-ai-roleplay-2025-q1'
)
AND no.status = 'pending'
ORDER BY no.scheduled_at
LIMIT 20;
```

### 5. View Sent Messages

```sql
SELECT 
  no.id,
  no.sent_at AT TIME ZONE 'America/New_York' as sent_et,
  lc.full_name,
  lc.current_company,
  no.personalized_message
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE no.batch_id = (
  SELECT id FROM networking_campaign_batches 
  WHERE slug = 'atherial-ai-roleplay-2025-q1'
)
AND no.status = 'sent'
ORDER BY no.sent_at DESC
LIMIT 20;
```

### 6. Messages Scheduled for a Specific Date

```sql
SELECT 
  TO_CHAR(no.scheduled_at AT TIME ZONE 'America/New_York', 'HH12:MI AM') as time_et,
  lc.full_name,
  lc.current_company
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE no.batch_id = (
  SELECT id FROM networking_campaign_batches 
  WHERE slug = 'atherial-ai-roleplay-2025-q1'
)
AND no.status = 'pending'
AND DATE(no.scheduled_at AT TIME ZONE 'America/New_York') = '2026-01-23'
ORDER BY no.scheduled_at;
```

---

## Key Relationships

```
networking_campaign_batches (campaign)
    ↓ (batch_id)
networking_outreach (messages)
    ↓ (connection_id)
linkedin_connections (contacts)
```

**To find all messages for this campaign:**
1. Find campaign by `slug = 'atherial-ai-roleplay-2025-q1'` → get `id`
2. Query `networking_outreach` where `batch_id = <campaign_id>`

---

## Status Values Explained

### Campaign Status (`networking_campaign_batches.status`)
- `'draft'` - Planning phase
- `'ready'` - Ready to send
- `'in_progress'` - Currently sending ✅ (current)
- `'completed'` - All messages sent
- `'paused'` - Temporarily stopped

### Message Status (`networking_outreach.status`)
- `'pending'` - Scheduled, waiting to send
- `'approved'` - User approved (if review required)
- `'sent'` - Successfully sent ✅
- `'failed'` - Send failed ❌
- `'replied'` - Got a response
- `'skipped'` - Decided not to send

---

## Quick Reference Queries

### Total Messages Sent Today
```sql
SELECT COUNT(*) 
FROM networking_outreach
WHERE batch_id = (SELECT id FROM networking_campaign_batches WHERE slug = 'atherial-ai-roleplay-2025-q1')
AND status = 'sent'
AND DATE(sent_at AT TIME ZONE 'America/New_York') = CURRENT_DATE;
```

### Messages Remaining Today
```sql
SELECT COUNT(*) 
FROM networking_outreach
WHERE batch_id = (SELECT id FROM networking_campaign_batches WHERE slug = 'atherial-ai-roleplay-2025-q1')
AND status = 'pending'
AND DATE(scheduled_at AT TIME ZONE 'America/New_York') = CURRENT_DATE;
```

### Campaign Progress Percentage
```sql
SELECT 
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'sent') / COUNT(*), 1) as percent_complete
FROM networking_outreach
WHERE batch_id = (SELECT id FROM networking_campaign_batches WHERE slug = 'atherial-ai-roleplay-2025-q1');
```

---

## Summary

**To find this campaign:**
1. Use `slug = 'atherial-ai-roleplay-2025-q1'` in `networking_campaign_batches`
2. Use the campaign `id` to query `networking_outreach` messages
3. Join with `linkedin_connections` to get contact details

**Current Progress:**
- 334 sent / 971 total = **34.4% complete**
- 618 messages remaining
- Campaign will complete around **February 7, 2026**
