# Campaign Tracking Guide

## Problem

You need to know which connections are in which campaigns, especially when the same person might be in multiple campaigns (e.g., "Happy New Year 2025" and "Atherial AI Roleplay 2025 Q1").

## Solution: Connection-Campaign Junction Table

We've added a `connection_campaigns` table that creates a many-to-many relationship between connections and campaigns.

### Database Structure

```
linkedin_connections (1) ──── (N) connection_campaigns (N) ──── (1) networking_campaign_batches
```

**`connection_campaigns` table:**
- `connection_id` - Links to `linkedin_connections`
- `campaign_batch_id` - Links to `networking_campaign_batches`
- `status` - 'added', 'contacted', 'replied', 'skipped'
- `added_at` - When they were added to this campaign
- `contacted_at` - When they were messaged in this campaign

## How to Use

### 1. Add Connections to a Campaign

**Option A: Add all 2025 connections**
```bash
node scripts/add-connections-to-campaign.js atherial-ai-roleplay-2025-q1 --all-2025
```

**Option B: Add specific connections**
```bash
node scripts/add-connections-to-campaign.js atherial-ai-roleplay-2025-q1 <connection-id-1> <connection-id-2>
```

### 2. Query Connections by Campaign

**Find all connections in a specific campaign:**
```sql
SELECT 
  lc.full_name,
  lc.current_company,
  lc.connected_at,
  cc.status,
  cc.added_at
FROM linkedin_connections lc
JOIN connection_campaigns cc ON lc.id = cc.connection_id
JOIN networking_campaign_batches ncb ON cc.campaign_batch_id = ncb.id
WHERE ncb.slug = 'atherial-ai-roleplay-2025-q1'
ORDER BY lc.full_name;
```

**Find which campaigns a connection is in:**
```sql
SELECT 
  ncb.name as campaign_name,
  ncb.slug as campaign_slug,
  cc.status,
  cc.added_at,
  cc.contacted_at
FROM connection_campaigns cc
JOIN networking_campaign_batches ncb ON cc.campaign_batch_id = ncb.id
WHERE cc.connection_id = '<connection-id>'
ORDER BY cc.added_at DESC;
```

**Find connections in multiple campaigns:**
```sql
SELECT 
  lc.full_name,
  lc.current_company,
  array_agg(ncb.name) as campaigns,
  COUNT(DISTINCT cc.campaign_batch_id) as campaign_count
FROM linkedin_connections lc
JOIN connection_campaigns cc ON lc.id = cc.connection_id
JOIN networking_campaign_batches ncb ON cc.campaign_batch_id = ncb.id
GROUP BY lc.id, lc.full_name, lc.current_company
HAVING COUNT(DISTINCT cc.campaign_batch_id) > 1
ORDER BY campaign_count DESC;
```

### 3. Use the Helper View

**View connections with all their campaigns:**
```sql
SELECT 
  full_name,
  current_company,
  campaign_names,
  campaign_slugs,
  campaign_count
FROM connection_campaigns_view
WHERE 'atherial-ai-roleplay-2025-q1' = ANY(campaign_slugs)
ORDER BY full_name;
```

## Comparing Campaigns

### Find connections in Campaign A but not Campaign B

```sql
-- Connections in "Happy New Year" but not in "Atherial 2025 Q1"
SELECT lc.*
FROM linkedin_connections lc
JOIN connection_campaigns cc1 ON lc.id = cc1.connection_id
JOIN networking_campaign_batches ncb1 ON cc1.campaign_batch_id = ncb1.id
WHERE ncb1.slug = 'networking-holidays-2025'
AND NOT EXISTS (
  SELECT 1
  FROM connection_campaigns cc2
  JOIN networking_campaign_batches ncb2 ON cc2.campaign_batch_id = ncb2.id
  WHERE cc2.connection_id = lc.id
    AND ncb2.slug = 'atherial-ai-roleplay-2025-q1'
);
```

### Find overlap between campaigns

```sql
-- Connections in both campaigns
SELECT lc.full_name, lc.current_company
FROM linkedin_connections lc
WHERE EXISTS (
  SELECT 1 FROM connection_campaigns cc1
  JOIN networking_campaign_batches ncb1 ON cc1.campaign_batch_id = ncb1.id
  WHERE cc1.connection_id = lc.id AND ncb1.slug = 'networking-holidays-2025'
)
AND EXISTS (
  SELECT 1 FROM connection_campaigns cc2
  JOIN networking_campaign_batches ncb2 ON cc2.campaign_batch_id = ncb2.id
  WHERE cc2.connection_id = lc.id AND ncb2.slug = 'atherial-ai-roleplay-2025-q1'
);
```

## Updating Campaign Status

When you message someone in a campaign, update their status:

```sql
UPDATE connection_campaigns
SET 
  status = 'contacted',
  contacted_at = NOW()
WHERE connection_id = '<connection-id>'
  AND campaign_batch_id = '<campaign-id>';
```

## Migration Applied

The `connection_campaigns` table has been created. You can now:

1. ✅ Track which connections are in which campaigns
2. ✅ See if someone is in multiple campaigns
3. ✅ Query by campaign easily
4. ✅ Avoid duplicate messaging across campaigns
