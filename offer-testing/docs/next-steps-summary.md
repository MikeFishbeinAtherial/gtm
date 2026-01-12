# Next Steps Summary

## ✅ What's Been Fixed

### 1. Campaign Tracking
- ✅ Added `connection_campaigns` junction table
- ✅ Migration applied via Supabase MCP
- ✅ Script created: `add-connections-to-campaign.js`

### 2. Sumble API
- ✅ Fixed API format (Query vs Filters)
- ✅ Changed to ONE broad search strategy (much more efficient)
- ✅ Limited to 2 jobs per company

### 3. Date Range
- ✅ Updated to handle both 2025 and 2026 dates

## 🔍 Why Sumble Isn't Working

**The Issue:** Sumble API is returning "Invalid query" errors.

**Possible Causes:**
1. Query syntax might be wrong - Sumble might not support complex OR queries
2. Sumble might only support Query format for certain fields
3. The API might need simpler query format

**What to Try:**

1. **Check if SUMBLE_API_KEY is set:**
   ```bash
   grep SUMBLE_API_KEY .env.local
   ```

2. **Test with simpler query:**
   The script now tries a fallback with just "sales" if the complex query fails.

3. **Check Sumble dashboard:**
   - Go to sumble.com
   - Try a search manually
   - Click "API" button to see the generated query format
   - Compare with what we're sending

## 📋 Next Steps

### Step 1: Run Filter Script

```bash
node scripts/filter-2025-connections.js
```

**What it does:**
- Finds 2025-2026 connections (handles both date ranges)
- Makes ONE Sumble search for sales roles
- Filters results by company name
- Saves to database

**If Sumble fails:**
- The script will continue without Sumble data
- You'll still get the filtered connections list
- You can manually check Sumble later

### Step 2: Add Connections to Campaign

```bash
node scripts/add-connections-to-campaign.js atherial-ai-roleplay-2025-q1 --all-2025
```

This links connections to your campaign so you can track them.

### Step 3: Query Campaign Data

```sql
-- See connections in your campaign
SELECT 
  lc.full_name,
  lc.current_company,
  lc.is_hiring_sales,
  lc.sumble_insights->>'sales_job_titles' as roles,
  cc.status
FROM linkedin_connections lc
JOIN connection_campaigns cc ON lc.id = cc.connection_id
JOIN networking_campaign_batches ncb ON cc.campaign_batch_id = ncb.id
WHERE ncb.slug = 'atherial-ai-roleplay-2025-q1';
```

### Step 4: Compare Campaigns

```sql
-- Find connections in Happy New Year campaign
SELECT lc.full_name, lc.current_company
FROM linkedin_connections lc
JOIN connection_campaigns cc ON lc.id = cc.connection_id
JOIN networking_campaign_batches ncb ON cc.campaign_batch_id = ncb.id
WHERE ncb.name LIKE '%happy%new%year%';
```

## 🔧 Debugging Sumble

If Sumble still doesn't work:

1. **Check API key:**
   ```bash
   echo $SUMBLE_API_KEY  # Should show your key
   ```

2. **Test manually:**
   ```bash
   curl -X POST https://api.sumble.com/v3/jobs/find \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"filters": {"query": "sales"}, "limit": 10}'
   ```

3. **Check Sumble docs:**
   - Go to sumble.com
   - Try a search
   - Click "API" to see the exact format

4. **Alternative:** Use Sumble web dashboard to manually check companies, then add data to database

## 📊 Current Status

- ✅ **1,038 connections imported** from CSV
- ✅ **1,027 connections from 2025-2026** date range
- ✅ **Campaign tracking** table created
- ⏳ **Sumble integration** - needs API format fix

## Files Created

- ✅ `scripts/add-connections-to-campaign.js` - Link connections to campaigns
- ✅ `docs/campaign-tracking-guide.md` - How to use campaign tracking
- ✅ `docs/fixes-summary.md` - Summary of fixes
- ✅ `connection_campaigns` table - Junction table for tracking
