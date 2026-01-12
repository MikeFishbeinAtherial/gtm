# Understanding Sumble Insights Data

## The JSON Structure

Here's what each field in `sumble_insights` means:

```json
{
  "checked_at": "2026-01-12T18:29:32.981Z",        // When we last checked Sumble
  "total_jobs": 2,                                  // Total jobs found for this company
  "credits_used": 6,                                // Sumble credits spent (3 per job)
  "is_hiring_sales": true,                          // Quick boolean: are they hiring sales?
  "sales_job_titles": [                             // Array of sales job titles found
    "AI Process Automation Engineer"                // ⚠️ This shouldn't be here - bug!
  ],
  "sales_jobs_count": 1,                           // Number of sales jobs (should match array length)
  "credits_remaining": 8976,                       // Your remaining Sumble credits
  "latest_sales_job_date": "2026-01-11T23:29:34.405199Z",  // Most recent job posting date
  "sales_jobs_categorized": [                      // Detailed job info
    {
      "url": "https://sumble.com/l/job/fdTWZgH3UInJ",  // Link to view job on Sumble
      "title": "AI Process Automation Engineer",       // Job title
      "category": "unknown",                           // Sales category (entry/accountExecutive/management/unknown)
      "location": "Seattle, Washington, United States", // Job location
      "posted_date": "2026-01-11T23:29:34.405199Z"    // When job was posted
    }
  ]
}
```

## The Problem: False Positives

**"AI Process Automation Engineer" is NOT a sales job!**

This is showing up because:
1. Sumble's query filter might not be working perfectly
2. Our code checks job descriptions for sales keywords, which can match non-sales jobs
3. Some job descriptions mention "sales" in context like "sales automation" or "sales process"

## How We Detect Sales Jobs

We check three things (in order of reliability):

1. **Primary Job Function** (Most Reliable)
   - `job.primary_job_function === 'Sales'` or `'Business Development'`
   - This is Sumble's classification - most accurate

2. **Job Title Keywords** (Reliable)
   - Checks if title contains: sales, SDR, BDR, account executive, GTM, etc.
   - See `isSalesJobTitle()` function

3. **Job Description** (Less Reliable - Can Cause False Positives)
   - Only used if title has business-related keywords
   - Checks for: sales, revenue, quota, prospect, lead generation, etc.

## Current Data Summary

From the most recent script run:

- **Total connections checked:** 1,000 (2025-2026 connections)
- **Companies hiring sales:** 38
- **Companies NOT hiring sales:** 1,000
- **Companies not checked:** 0

**Note:** Some of those 38 might be false positives (like "AI Process Automation Engineer").

## Using This Data for Messaging

### For Companies Hiring Sales (`is_hiring_sales = TRUE`):
```
"Hey [Name], saw [Company] is hiring for [sales_job_titles]. 
I help GTM teams with AI roleplay training - would love to 
show you how we can help your new sales hires get quota-ready faster."
```

### For Companies NOT Hiring Sales (`is_hiring_sales = FALSE`):
```
"Hey [Name], do you know anyone at [Company] who's hiring 
for sales roles? I help GTM teams with AI roleplay training 
and would love to connect with them."
```

## Query Examples

**Find all companies hiring sales:**
```sql
SELECT 
  full_name,
  current_company,
  sumble_insights->>'sales_job_titles' as roles,
  sumble_insights->'sales_jobs_categorized'->0->>'location' as location
FROM linkedin_connections
WHERE is_hiring_sales = TRUE
ORDER BY current_company;
```

**Find companies NOT hiring:**
```sql
SELECT 
  full_name,
  current_company
FROM linkedin_connections
WHERE is_hiring_sales = FALSE
AND sumble_checked_at IS NOT NULL  -- Only checked companies
ORDER BY current_company;
```

**Review potentially incorrect classifications:**
```sql
SELECT 
  current_company,
  sumble_insights->>'sales_job_titles' as job_titles
FROM linkedin_connections
WHERE is_hiring_sales = TRUE
AND sumble_insights->'sales_jobs_categorized'->0->>'title' NOT ILIKE '%sales%'
AND sumble_insights->'sales_jobs_categorized'->0->>'title' NOT ILIKE '%account executive%'
AND sumble_insights->'sales_jobs_categorized'->0->>'title' NOT ILIKE '%business development%'
AND sumble_insights->'sales_jobs_categorized'->0->>'title' NOT ILIKE '%gtm%';
```
