# Campaign Name Columns Added to Views

**Date:** January 12, 2026  
**Migration:** `add-campaign-name-to-views.sql`

---

## ✅ What Was Added

### 1. New View: `networking_outreach_with_campaign`

This view extends `networking_outreach` to include campaign information:

**Columns Added:**
- `campaign_name` - Name of the campaign (e.g., "Atherial AI Roleplay Training - 2025 Q1")
- `campaign_slug` - Campaign slug (e.g., "atherial-ai-roleplay-2025-q1")
- `campaign_status` - Campaign status (draft, ready, in_progress, etc.)
- `campaign_description` - Campaign description

**Usage:**
```sql
SELECT 
  campaign_name,
  lc.first_name,
  lc.last_name,
  no.status,
  no.scheduled_at
FROM networking_outreach_with_campaign no
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE campaign_name = 'Atherial AI Roleplay Training - 2025 Q1'
ORDER BY no.scheduled_at;
```

### 2. Updated View: `networking_contacts_ready`

Added campaign information to show which campaigns each connection is in:

**Columns Added:**
- `campaign_names` - Array of campaign names this connection is in
- `campaign_ids` - Array of campaign IDs
- `active_campaigns_count` - Number of active campaigns

**Usage:**
```sql
SELECT 
  first_name,
  last_name,
  campaign_names,
  active_campaigns_count
FROM networking_contacts_ready
WHERE 'Atherial AI Roleplay Training - 2025 Q1' = ANY(campaign_names);
```

---

## 📋 How to Apply

### Option 1: Via Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `scripts/add-campaign-name-to-views.sql`
3. Paste and run

### Option 2: Via Supabase CLI

```bash
supabase db execute -f scripts/add-campaign-name-to-views.sql
```

---

## 🔍 Benefits

1. **Easy Querying** - No need to JOIN manually to get campaign names
2. **Better Filtering** - Filter by campaign name directly
3. **Campaign Tracking** - See which campaigns each connection is in
4. **Simplified Queries** - Use `networking_outreach_with_campaign` instead of manual JOINs

---

## 📊 Example Queries

### Get all messages for a specific campaign:
```sql
SELECT 
  campaign_name,
  COUNT(*) as total_messages,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM networking_outreach_with_campaign
WHERE campaign_name = 'Atherial AI Roleplay Training - 2025 Q1'
GROUP BY campaign_name;
```

### Find connections in multiple campaigns:
```sql
SELECT 
  first_name,
  last_name,
  campaign_names,
  active_campaigns_count
FROM networking_contacts_ready
WHERE active_campaigns_count > 1
ORDER BY active_campaigns_count DESC;
```

### Get campaign performance:
```sql
SELECT 
  campaign_name,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN status = 'replied' THEN 1 END) as replied,
  ROUND(
    COUNT(CASE WHEN status = 'replied' THEN 1 END)::decimal / 
    NULLIF(COUNT(CASE WHEN status = 'sent' THEN 1 END), 0) * 100, 
    2
  ) as reply_rate
FROM networking_outreach_with_campaign
GROUP BY campaign_name
ORDER BY total DESC;
```

---

**Migration File:** `scripts/add-campaign-name-to-views.sql`
