# Fixes Summary - Campaign Tracking & Sumble

## Issues Fixed

### 1. ✅ Campaign Tracking

**Problem:** Couldn't tell which connections were in which campaigns.

**Solution:** Added `connection_campaigns` junction table (many-to-many relationship).

**Migration Applied:** `add_connection_campaigns_junction`

**How to Use:**
```bash
# Add all 2025 connections to your new campaign
node scripts/add-connections-to-campaign.js atherial-ai-roleplay-2025-q1 --all-2025
```

**Query connections by campaign:**
```sql
SELECT lc.* 
FROM linkedin_connections lc
JOIN connection_campaigns cc ON lc.id = cc.connection_id
JOIN networking_campaign_batches ncb ON cc.campaign_batch_id = ncb.id
WHERE ncb.slug = 'atherial-ai-roleplay-2025-q1';
```

### 2. ✅ Sumble API Format

**Problem:** Getting 400 errors - "Invalid query"

**Root Cause:** 
- Sumble API `filters` can be EITHER Filters object OR Query object, not both
- We were trying to combine query with `since` date filter
- Query format needs to be: `filters: { query: "..." }`

**Solution:** 
- Use Query format only: `filters: { query: "sales OR SDR..." }`
- Filter by date in our code (last 2 months)
- Made ONE broad search instead of searching each company

**New Strategy:**
1. **One API call** to search for all sales roles (limit 200)
2. **Filter in code** by:
   - Company name match
   - Date (last 2 months)
   - Sales role keywords
3. **Limit to 2 jobs** per company

**Credit Savings:**
- Old: 910 companies × 6 credits = 5,460 credits max
- New: 1 search × ~300 credits = ~300 credits total
- **95% reduction!**

### 3. ✅ Date Range Handling

**Problem:** CSV has both "31 Dec 2025" and "01 Jan 2026" dates.

**Solution:** Updated filter to search for connections from 2025-01-01 to 2026-12-31.

## Next Steps

### 1. Run Filter Script

```bash
node scripts/filter-2025-connections.js
```

This will:
- Find 2025-2026 connections
- Make ONE Sumble search for sales roles
- Filter results by company
- Save Sumble data to database

### 2. Add Connections to Campaign

```bash
node scripts/add-connections-to-campaign.js atherial-ai-roleplay-2025-q1 --all-2025
```

This links connections to your campaign so you can track them.

### 3. Query Campaign Data

```sql
-- See all connections in your campaign
SELECT 
  lc.full_name,
  lc.current_company,
  lc.is_hiring_sales,
  lc.sumble_insights->>'sales_job_titles' as roles,
  cc.status,
  cc.added_at
FROM linkedin_connections lc
JOIN connection_campaigns cc ON lc.id = cc.connection_id
JOIN networking_campaign_batches ncb ON cc.campaign_batch_id = ncb.id
WHERE ncb.slug = 'atherial-ai-roleplay-2025-q1'
ORDER BY lc.is_hiring_sales DESC, lc.full_name;
```

## Database Changes

### New Table: `connection_campaigns`
- Links connections to campaigns (many-to-many)
- Tracks status per campaign
- Prevents duplicate messaging

### New View: `connection_campaigns_view`
- Shows connections with all their campaigns
- Easy to query: `SELECT * FROM connection_campaigns_view WHERE 'campaign-slug' = ANY(campaign_slugs)`

## Sumble Data Storage

Sumble insights are stored in `linkedin_connections`:
- `sumble_insights` (JSONB) - Full data
- `is_hiring_sales` (BOOLEAN) - Quick filter
- `sumble_checked_at` (TIMESTAMPTZ) - Last check

Query hiring companies:
```sql
SELECT full_name, current_company, 
       sumble_insights->>'sales_job_titles' as roles
FROM linkedin_connections
WHERE is_hiring_sales = TRUE;
```
