# TheirStack Quick Reference

## 🚀 Quick Start

```typescript
import { theirstack } from './src/lib/clients/theirstack'

// Find companies hiring sales reps
const jobs = await theirstack.findCompaniesHiringSales({
  country_codes: ['US'],
  posted_within_days: 14,
  min_employee_count: 50,
  max_employee_count: 500,
  limit: 25
})
```

## 🎯 Common Use Cases

### 1. Sales Training/Enablement → Find Companies Hiring Sales

```typescript
const salesJobs = await theirstack.findCompaniesHiringSales({
  country_codes: ['US'],
  posted_within_days: 14,
  min_employee_count: 50,
  limit: 50
})

// Returns jobs for: SDR, BDR, Account Executive, Sales Rep
```

### 2. Dev Tools → Find Companies Hiring Engineers

```typescript
const engineeringJobs = await theirstack.findCompaniesHiringForDepartment(
  'engineering',
  { posted_within_days: 7, limit: 50 }
)
```

### 3. Marketing Tools → Find Companies Hiring Marketing

```typescript
const marketingJobs = await theirstack.findCompaniesHiringForDepartment(
  'marketing',
  { posted_within_days: 7, limit: 50 }
)
```

### 4. Custom Search by Keywords

```typescript
const jobs = await theirstack.searchByDescription(
  ['AI', 'machine learning', 'LLM'],
  { posted_within_days: 7 }
)
```

### 5. Advanced Custom Search

```typescript
const jobs = await theirstack.searchJobs({
  // Job filters
  job_title_pattern_or: ['SDR', 'BDR'],
  job_country_code_or: ['US'],
  remote: true,
  
  // Date (REQUIRED - at least one)
  posted_at_max_age_days: 14,
  
  // Company filters
  min_employee_count: 50,
  max_employee_count: 500,
  only_yc_companies: true,
  
  // Pagination
  limit: 25,
  page: 0
})
```

## 📊 What You Get Back

```typescript
{
  metadata: {
    total_results: 100,      // Total jobs found
    total_companies: 45      // Unique companies
  },
  data: [
    {
      id: 1234,
      job_title: "SDR",
      date_posted: "2024-12-15",
      remote: true,
      description: "...",
      
      company_object: {
        name: "Acme Inc",
        domain: "acme.com",
        employee_count: 250,
        linkedin_url: "...",
        industry: "Software",
        technology_slugs: ["salesforce", "hubspot"]
      },
      
      locations: [{
        display_name: "San Francisco, CA, USA",
        country_code: "US"
      }],
      
      hiring_team: [{
        full_name: "John Smith",
        role: "VP Sales",
        linkedin_url: "..."
      }]
    }
  ]
}
```

## 🔑 Key Filters

### Required (at least one):
- `posted_at_max_age_days: 14` - Jobs posted in last N days
- `posted_at_gte: "2024-12-01"` - Jobs posted after date
- `company_domain_or: ['acme.com']` - Specific companies

### Job Filters:
- `job_title_pattern_or: ['SDR', 'BDR']` - Regex job title match
- `job_country_code_or: ['US', 'CA']` - Country codes
- `job_location_pattern_or: ['San Francisco']` - Location text match
- `remote: true` - Remote jobs only
- `job_description_pattern_or: ['AI', 'ML']` - Keywords in description

### Company Filters:
- `min_employee_count: 50` / `max_employee_count: 500` - Company size
- `only_yc_companies: true` - Y Combinator only
- `company_technology_slug_or: ['salesforce']` - Companies using tech
- `funding_stage_or: ['series_a', 'series_b']` - Funding stage

### Pagination:
- `limit: 25` - Results per page
- `page: 0` - Page number (0-indexed)

## 🧪 Test the API

```bash
cd offer-testing
npx tsx scripts/test-theirstack.ts
```

## 📝 Integration Example

```typescript
import { theirstack } from './src/lib/clients/theirstack'
import { supabase } from './src/lib/clients/supabase'

// 1. Find companies hiring
const jobs = await theirstack.findCompaniesHiringSales({
  country_codes: ['US'],
  posted_within_days: 14,
  min_employee_count: 50,
  limit: 50
})

// 2. Save to database
for (const job of jobs.data) {
  const company = job.company_object
  
  await supabase.from('companies').insert({
    offer_id: 'your-offer-id',
    name: company.name,
    domain: company.domain,
    size_exact: company.employee_count,
    signals: {
      hiring_sales: true,
      hiring_roles: [job.job_title]
    },
    source_tool: 'theirstack',
    source_raw: job
  })
}
```

## ⚠️ Important Notes

1. **Always include a date filter** (posted_at_max_age_days is easiest)
2. **1 credit = 1 job returned** - use `limit` to control costs
3. **Rate limit**: 4 requests/second (free tier)
4. **Use specific filters** to get better results
5. **Check company_object** for rich company data

## 🎯 Signal Matching Guide

| Your Offer | Search For |
|------------|------------|
| Sales training | Companies hiring SDR/BDR |
| Dev tools | Companies hiring engineers |
| Marketing tools | Companies hiring marketing |
| HR software | Companies hiring recruiters |
| Support tools | Companies hiring customer success |

---

**Full docs**: `docs/theirstack-setup.md`  
**Test script**: `scripts/test-theirstack.ts`  
**Client**: `src/lib/clients/theirstack.ts`

