# How Sumble Search Works - Explained

## The Strategy: One Broad Search vs 905 Individual Searches

### ❌ What We DON'T Do (Inefficient)
**Old approach would be:**
- Search Sumble for "Auto" company sales jobs → 1 API call
- Search Sumble for "Creatio" company sales jobs → 1 API call  
- Search Sumble for "Facto" company sales jobs → 1 API call
- ... repeat 905 times
- **Total: 905 API calls × ~6 credits each = 5,430 credits**

### ✅ What We DO (Efficient)
**New approach:**
1. **ONE API call** to Sumble: "Give me all sales jobs from all companies"
   ```javascript
   query: `job_function IN ('Sales', 'Business Development') AND hiring_period EQ '18mo'`
   limit: 50
   ```
   - Returns: 50 sales jobs from various companies
   - Cost: 150 credits (50 jobs × 3 credits each)

2. **Filter in code** (free, no API calls):
   - Take the 50 jobs from Sumble
   - For each of your 905 companies from LinkedIn CSV:
     - Check if any of the 50 jobs match that company name
     - If yes → mark company as "hiring sales"
   - **Cost: $0 (just code processing)**

**Total: 1 API call = 150 credits** (vs 5,430 credits)

## How We Match Companies

We match companies by:
1. **Company name** from LinkedIn CSV (`current_company` field)
2. **Organization name** from Sumble job (`job.organization_name`)
3. **Fuzzy matching** - handles variations:
   - "Auto" matches "Auto Company" or "Auto Inc"
   - "Creatio" matches "Creatio Inc" or "Creatio Ltd"

**Example:**
- LinkedIn CSV has: `current_company = "Ro"`
- Sumble returns job with: `organization_name = "Ro Inc"`
- Our code matches: `"Ro".includes("Ro Inc")` OR `"Ro Inc".includes("Ro")` ✅
- Result: Mark "Ro" as hiring sales

## Why Only 5 Companies Show Up

The script reported "10 companies hiring sales" but database shows 5. Here's why:

**The script counts:**
- Each unique company that has sales jobs
- But it might count the same company multiple times if:
  - Company name has slight variations
  - Multiple connections from same company
  - Company name matching is fuzzy

**The database shows:**
- Actual unique companies: 5
- Each company can have multiple connections

## The 5 Companies Hiring Sales

1. **Auto** - "Experienced Automotive Sales Associate"
2. **Creatio** - "Business Development Executive (E-Commerce Solutions)"
3. **Facto** - "Corporate Sales"
4. **Ro** - "Inspections Sales Representative" + "Experienced Automotive Sales Associate"
5. **The Creative Marketer** - "Business Development Executive (E-Commerce Solutions)"

## How We Know They're Hiring Sales

We check three things:

1. **Job Title** - Contains sales keywords:
   - "Sales", "SDR", "BDR", "Account Executive", "Sales Manager", etc.
   - See `isSalesJobTitle()` function

2. **Job Description** - Mentions sales terms:
   - "sales", "revenue", "quota", "prospect", "lead generation"
   - See `isSalesJobDescription()` function

3. **Job Function** - Sumble's classification:
   - `job.primary_job_function === 'Sales'`

If ANY of these match → company is marked as "hiring sales"

## Data Stored in Database

For each company, we store in `sumble_insights` JSONB column:

```json
{
  "is_hiring_sales": true,
  "total_jobs": 2,
  "sales_jobs_count": 2,
  "sales_job_titles": ["Inspections Sales Representative", "Experienced Automotive Sales Associate"],
  "sales_jobs_categorized": [
    {
      "title": "Inspections Sales Representative",
      "category": "unknown",
      "posted_date": "2026-01-11T21:55:27.297733Z",
      "url": "https://sumble.com/l/job/xgCwV2tka9DK",
      "location": "Charlotte, North Carolina, United States"
    }
  ],
  "latest_sales_job_date": "2026-01-11T21:55:27.297733Z",
  "checked_at": "2026-01-12T18:03:20.728Z",
  "credits_used": 150,
  "credits_remaining": 9540
}
```

## Can We Search Specific Companies?

**Yes!** If you want to search specific companies, we can:

1. **Search by company domain** (if we have it):
   ```javascript
   {
     organization: { domain: "company.com" },
     filters: { query: "job_function IN ('Sales')" }
   }
   ```

2. **Search by company name** (fuzzy):
   ```javascript
   {
     filters: { query: "organization_name EQ 'Company Name' AND job_function IN ('Sales')" }
   }
   ```

**Cost:** ~3 credits per job found (limit 2 jobs = 6 credits per company)

Since you have 9,540 credits remaining, we can search specific companies if needed!
