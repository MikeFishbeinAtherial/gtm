# Sumble Data Summary - Most Recent Script Run

## Overall Statistics

- **Total 2025-2026 Connections:** 1,038
- **Companies Hiring Sales:** 38 (3.7%)
- **Companies NOT Hiring Sales:** 960 (92.5%)
- **Companies Not Checked Yet:** 40 (3.8%)

## The Problem: False Positives

**⚠️ MAJOR ISSUE:** Most companies marked as "hiring sales" are actually showing:
- **"AI Process Automation Engineer"** - This is NOT a sales job!

**Why this is happening:**
1. Sumble's query filter might not be working perfectly
2. Our code was checking job descriptions, which can match non-sales jobs
3. Some job descriptions mention "sales" in context like "sales automation"

**Companies with false positives:**
- Better Together Agency
- Braintrust
- CMO Alliance
- DataStreams Solutions, LLC
- Dispatch
- Gram Interactive
- Growth Alliance
- Haast
- Hamilton Lane
- Highwire
- Jack & Jill
- Jeeva / Jeeva AI
- Kixie
- Loop AI
- Lovarank
- Lumana
- Meal Ticket
- SDG Strategy, LLC
- Stuut
- And more...

**Companies with REAL sales jobs:**
- Auto - "Experienced Automotive Sales Associate" ✅
- Creatio - "Business Development Executive" ✅
- Facto - "Corporate Sales" ✅
- Ro - "Inspections Sales Representative" ✅

## The Fix

I've updated the code to be MUCH stricter:

1. **Primary check:** `primary_job_function === 'Sales'` or `'Business Development'` (most reliable)
2. **Secondary check:** Title must clearly indicate sales (keywords like sales, SDR, BDR, account executive, GTM)
3. **Tertiary check:** Description mentions sales AND title has business keywords (not just any description match)

**We should re-run the script** to get accurate data, or manually fix the false positives in the database.

## Using This Data for Messaging

### For Companies Hiring Sales (`is_hiring_sales = TRUE`):
**Message template:**
```
Hey [Name], saw [Company] is hiring for [sales_job_titles]. 
I help GTM teams with AI roleplay training - would love to 
show you how we can help your new sales hires get quota-ready faster.
```

**Query:**
```sql
SELECT 
  full_name,
  current_company,
  sumble_insights->>'sales_job_titles' as roles
FROM linkedin_connections
WHERE is_hiring_sales = TRUE
AND sumble_insights->'sales_jobs_categorized'->0->>'title' ILIKE '%sales%'
   OR sumble_insights->'sales_jobs_categorized'->0->>'title' ILIKE '%account executive%'
   OR sumble_insights->'sales_jobs_categorized'->0->>'title' ILIKE '%business development%'
ORDER BY current_company;
```

### For Companies NOT Hiring Sales (`is_hiring_sales = FALSE`):
**Message template:**
```
Hey [Name], do you know anyone at [Company] who's hiring 
for sales roles? I help GTM teams with AI roleplay training 
and would love to connect with them.
```

**Query:**
```sql
SELECT 
  full_name,
  current_company
FROM linkedin_connections
WHERE is_hiring_sales = FALSE
AND sumble_checked_at IS NOT NULL  -- Only checked companies
ORDER BY current_company;
```

## Next Steps

1. **Re-run the filter script** with the stricter filtering logic
2. **OR manually fix false positives** in the database:
   ```sql
   UPDATE linkedin_connections
   SET is_hiring_sales = FALSE,
       sumble_insights = jsonb_set(
         sumble_insights,
         '{is_hiring_sales}',
         'false'
       )
   WHERE is_hiring_sales = TRUE
   AND sumble_insights->'sales_jobs_categorized'->0->>'title' = 'AI Process Automation Engineer';
   ```
