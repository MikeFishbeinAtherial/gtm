# 2025 Campaign Updates - Summary

## Changes Made

### 1. ✅ Updated Filter Script (`scripts/filter-2025-connections.js`)

**Changes:**
- **Changed from 30 days to 7 days** for duplicate prevention
- **Switched to `networking_outreach` table** instead of `linkedin_messages` (which is empty)
- **Added fallback check** - checks both `networking_outreach` AND `linkedin_messages`
- **Integrated sales job titles helper** - better matching for sales roles
- **Saves Sumble data to database** - stores hiring signals in `linkedin_connections` table

**Why:**
- `linkedin_messages` table is currently empty, so we need to check `networking_outreach` which has campaign data
- 7 days is more appropriate for networking campaigns (avoid over-messaging)
- Storing Sumble data prevents re-checking same companies

### 2. ✅ Added Database Columns for Sumble Insights

**Migration:** `scripts/add-sumble-insights-columns.sql`

**New Columns in `linkedin_connections`:**
- `sumble_insights` (JSONB) - Full Sumble API response data
- `is_hiring_sales` (BOOLEAN) - Quick flag for filtering
- `sumble_checked_at` (TIMESTAMPTZ) - When we last checked

**Structure of `sumble_insights`:**
```json
{
  "is_hiring_sales": true,
  "total_jobs": 15,
  "sales_jobs_count": 3,
  "sales_job_titles": ["SDR", "Account Executive", "Sales Manager"],
  "sales_jobs_categorized": [
    {
      "title": "SDR",
      "category": "entry",
      "posted_date": "2025-01-15T00:00:00Z",
      "url": "https://...",
      "location": "Remote"
    }
  ],
  "latest_sales_job_date": "2025-01-15T00:00:00Z",
  "checked_at": "2025-01-20T10:00:00Z"
}
```

**To Run Migration:**
```bash
# Via Supabase SQL editor, or:
psql $DATABASE_URL -f scripts/add-sumble-insights-columns.sql
```

### 3. ✅ Created Sales Job Titles Helper

**File:** `context/sales-job-titles.ts`

**What it does:**
- Comprehensive list of sales job titles (SDR, BDR, AE, Sales Manager, etc.)
- Categorizes jobs (entry, accountExecutive, management, specialized, revops)
- Helper functions to check if a job title/description is sales-related

**Usage:**
```typescript
import { isSalesJobTitle, isSalesJobDescription, categorizeSalesJob } from '@/context/sales-job-titles'

if (isSalesJobTitle(job.job_title)) {
  // It's a sales role!
}
```

### 4. ✅ Reorganized API Documentation

**New Structure:** `context/api-tools/`

**Created:**
- `context/api-tools/README.md` - Overview
- `context/api-tools/sumble/` - Complete Sumble guide with examples
- `context/api-tools/unipile/` - Complete Unipile guide with examples

**Consolidated:**
- Moved content from `context/api-guides/sumble.md` to new structure
- Added detailed examples and setup guides
- Kept quick references in `api-guides/` for fast lookup

**Why:**
- Better organization per API tool
- Includes setup, examples, and use cases
- Easier to find "how do I use X API?"

## Next Steps

### 1. Run Database Migration

```bash
# Apply the Sumble insights columns
psql $DATABASE_URL -f scripts/add-sumble-insights-columns.sql
```

Or via Supabase SQL editor - copy/paste the SQL from `scripts/add-sumble-insights-columns.sql`

### 2. Run Filter Script

```bash
node scripts/filter-2025-connections.js
```

This will:
- Find connections from 2025
- Filter out people messaged in last 7 days
- Check Sumble for hiring signals
- Save data to database
- Show top candidates

### 3. Review Results

Query the database to see who's hiring:

```sql
-- Find connections whose companies are hiring sales
SELECT 
  full_name,
  current_company,
  is_hiring_sales,
  sumble_insights->>'sales_job_titles' as job_titles,
  sumble_insights->>'sales_jobs_count' as job_count
FROM linkedin_connections
WHERE is_hiring_sales = TRUE
ORDER BY (sumble_insights->>'sales_jobs_count')::int DESC;
```

### 4. Create Campaign Batch

Create your campaign batch in Supabase:

```sql
INSERT INTO networking_campaign_batches (
  name,
  description,
  message_template,
  personalization_instructions,
  target_filters,
  status
) VALUES (
  'atherial-ai-roleplay-2025',
  'Reconnecting with 2025 connections to offer AI roleplay training for sales teams',
  'Hey {{firstname}}! I noticed {{company}} is hiring for {{role}} - exciting growth! Would love to share how we help sales teams get new hires quota-ready in weeks with AI roleplay training.',
  'Personalize based on: 1) Their current role, 2) If company is hiring sales (mention specific role), 3) Last message context if available',
  '{
    "connected_in_2025": true,
    "exclude_messaged_last_7_days": true,
    "prefer_hiring_sales": true
  }'::jsonb,
  'draft'
)
RETURNING *;
```

## Database Schema Updates

### New Columns in `linkedin_connections`

| Column | Type | Description |
|--------|------|-------------|
| `sumble_insights` | JSONB | Full Sumble API response with hiring data |
| `is_hiring_sales` | BOOLEAN | Quick flag - is company hiring sales? |
| `sumble_checked_at` | TIMESTAMPTZ | When we last checked Sumble |

### Indexes Added

- `idx_linkedin_connections_hiring_sales` - Fast filtering by hiring status
- `idx_linkedin_connections_sumble_insights` - GIN index for JSONB queries

## Sales Job Titles

The system recognizes these sales roles:

**Entry Level:** SDR, BDR, Sales Development Rep, Inside Sales Rep

**Account Executive:** AE, Account Executive, Account Manager, Sales Rep, Territory Manager

**Management:** Sales Manager, Sales Director, VP Sales, Head of Sales, CRO

**Specialized:** Enterprise Sales, Channel Sales, Sales Engineer, Sales Enablement

**RevOps:** Revenue Operations, Sales Operations, RevOps Manager

See `context/sales-job-titles.ts` for the complete list.

## Files Created/Modified

### Created:
- `scripts/filter-2025-connections.js` - Filter script (updated)
- `scripts/add-sumble-insights-columns.sql` - Database migration
- `context/sales-job-titles.ts` - Sales job titles helper
- `context/api-tools/README.md` - API tools overview
- `context/api-tools/sumble/sumble-tool-guide.md` - Sumble guide
- `context/api-tools/sumble/examples.ts` - Sumble examples
- `context/api-tools/unipile/unipile-tool-guide.md` - Unipile guide
- `context/api-tools/unipile/examples.ts` - Unipile examples
- `docs/2025-campaign-updates.md` - This file

### Modified:
- `scripts/filter-2025-connections.js` - Updated to use networking_outreach, 7 days, save Sumble data
- `context/api-guides/README.md` - Added note about new structure

## Questions?

- **Database schema:** See `scripts/setup-networking-schema.sql`
- **API usage:** See `context/api-tools/`
- **Sales job titles:** See `context/sales-job-titles.ts`
- **Filter script:** See `scripts/filter-2025-connections.js`
