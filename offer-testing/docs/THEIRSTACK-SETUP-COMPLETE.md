# TheirStack Setup - COMPLETE ✅

**Date**: December 20, 2024  
**Status**: ✅ Fully Configured and Tested

---

## What Was Done

### 1. Updated API Client ✅

**File**: `src/lib/clients/theirstack.ts`

- ✅ Updated to match real TheirStack API v1
- ✅ Added complete TypeScript types based on API docs
- ✅ Implemented all major search methods
- ✅ Added helper methods for common use cases
- ✅ No linter errors

**Key Features**:
- `searchJobs()` - Full custom search with all filters
- `findCompaniesHiringSales()` - Find companies hiring SDR/BDR/AE
- `findCompaniesHiringForDepartment()` - Find by department
- `findCompaniesByTechnology()` - Find companies using specific tech
- `searchByDescription()` - Search job descriptions for keywords
- `testConnection()` - Test API connectivity

### 2. Created Test Script ✅

**File**: `scripts/test-theirstack.ts`

- ✅ Loads environment variables from `.env.local`
- ✅ Tests 5 different search scenarios
- ✅ All tests passing successfully

**Run it**:
```bash
cd offer-testing
npx tsx scripts/test-theirstack.ts
```

### 3. Created Documentation ✅

**Files**:
- `docs/theirstack-setup.md` - Complete setup guide with examples
- `docs/THEIRSTACK-QUICKSTART.md` - Quick reference card

---

## Test Results

```
✅ Connection successful
✅ Sales jobs search: 5 results
✅ Engineering jobs: 5 results  
✅ AI/LLM jobs: 5 results
✅ YC company search: 5 results
```

---

## How to Use

### Quick Example

```typescript
import { theirstack } from './src/lib/clients/theirstack'

// Find companies hiring sales reps in the last 2 weeks
const jobs = await theirstack.findCompaniesHiringSales({
  country_codes: ['US'],
  posted_within_days: 14,
  min_employee_count: 50,
  max_employee_count: 500,
  limit: 25
})

// Process results
for (const job of jobs.data) {
  console.log(`${job.job_title} at ${job.company_object?.name}`)
  console.log(`Domain: ${job.company_object?.domain}`)
  console.log(`Size: ${job.company_object?.employee_count} employees`)
}
```

### Real-World Use Case

**Scenario**: You're selling a **Sales Call Role Play Training App**

**Signal**: Companies hiring sales reps need to train them!

**Code**:
```typescript
// Find companies hiring SDRs/BDRs in last 7 days
const hiringCompanies = await theirstack.findCompaniesHiringSales({
  country_codes: ['US'],
  posted_within_days: 7,
  min_employee_count: 50,  // Not too small
  max_employee_count: 500, // Not too big
  limit: 50
})

// Now you have a list of companies that NEED sales training!
// Each company includes:
// - Company name, domain, LinkedIn URL
// - Employee count, industry, location
// - The specific job they're hiring for
// - Sometimes even the hiring manager's LinkedIn
```

---

## API Structure

### Required Filters

You **must** include at least ONE of these:

- ✅ `posted_at_max_age_days: 14` (easiest - jobs from last N days)
- ✅ `posted_at_gte: "2024-12-01"` (jobs after this date)
- ✅ `company_domain_or: ['acme.com']` (specific companies)

### Common Filters

```typescript
{
  // Job filters
  job_title_pattern_or: ['SDR', 'BDR', 'Sales'],     // Job titles (regex)
  job_country_code_or: ['US', 'CA'],                  // Country codes
  job_location_pattern_or: ['San Francisco'],         // Location text
  remote: true,                                       // Remote only
  
  // Company filters  
  min_employee_count: 50,                            // Min company size
  max_employee_count: 500,                           // Max company size
  only_yc_companies: true,                           // Y Combinator only
  company_technology_slug_or: ['salesforce'],        // Tech they use
  
  // Pagination
  limit: 25,                                         // Results per page
  page: 0                                            // Page number
}
```

### Response Structure

```typescript
{
  metadata: {
    total_results: 100,      // Total jobs
    total_companies: 45      // Unique companies
  },
  data: [                    // Array of jobs
    {
      id: 1234,
      job_title: "SDR",
      date_posted: "2024-12-15",
      remote: true,
      
      company_object: {      // Rich company data
        name: "Acme Inc",
        domain: "acme.com",
        employee_count: 250,
        linkedin_url: "...",
        technology_slugs: ["salesforce", "hubspot"],
        // ... and much more
      },
      
      locations: [...],      // Job locations
      hiring_team: [...],    // Hiring managers (if available)
      description: "..."     // Full job description
    }
  ]
}
```

---

## Integration with Your System

### Save to Database

```typescript
import { theirstack } from './src/lib/clients/theirstack'
import { supabase } from './src/lib/clients/supabase'

// 1. Find companies
const jobs = await theirstack.findCompaniesHiringSales({
  country_codes: ['US'],
  posted_within_days: 14,
  limit: 50
})

// 2. Save to your companies table
for (const job of jobs.data) {
  const company = job.company_object
  
  await supabase.from('companies').insert({
    offer_id: 'your-offer-id',
    name: company.name,
    domain: company.domain,
    size_exact: company.employee_count,
    industry: company.industry,
    
    // Store the hiring signal!
    signals: {
      hiring_sales: true,
      hiring_roles: [job.job_title],
      job_posted_date: job.date_posted
    },
    
    source_tool: 'theirstack',
    source_query: 'Hiring sales reps in last 14 days',
    source_raw: job,  // Store full data for reference
    
    status: 'new'
  })
}
```

### Use in Outreach

Now you can write **contextual** outreach:

```
Hi {firstName},

I noticed {companyName} is hiring {jobTitle} – 
congrats on the growth!

I've been helping sales teams prepare new reps 
faster with AI-powered role-play training...
```

This works because:
- ✅ It's timely (they're hiring NOW)
- ✅ It's relevant (they need to train these people)
- ✅ It shows research (you're not spamming)

---

## Rate Limits & Costs

### Rate Limits
- **Free**: 4/second, 10/minute, 50/hour, 400/day
- **Paid**: 4/second (unlimited otherwise)

### Credits
- **1 credit** = 1 job returned
- Use `limit` parameter to control costs
- Example: `limit: 25` = max 25 credits per request

### Best Practices
1. Start with small limits (`limit: 25`)
2. Use specific date ranges (`posted_at_max_age_days: 7`)
3. Filter by company size to narrow results
4. Don't use `include_total_results: true` unless needed (slow)

---

## Common Patterns

### Pattern 1: Weekly Signal Check

Run this every Monday:

```typescript
// Find companies that started hiring in last 7 days
const newHiring = await theirstack.findCompaniesHiringSales({
  posted_within_days: 7,
  country_codes: ['US'],
  min_employee_count: 50,
  limit: 100
})

// → Add to database
// → Score for fit
// → Add to outreach queue
```

### Pattern 2: Department-Specific

Target companies hiring specific roles:

```typescript
// Sales enablement → companies hiring sales
const salesJobs = await theirstack.findCompaniesHiringForDepartment('sales', { ... })

// Dev tools → companies hiring engineers  
const engineeringJobs = await theirstack.findCompaniesHiringForDepartment('engineering', { ... })

// Marketing tools → companies hiring marketing
const marketingJobs = await theirstack.findCompaniesHiringForDepartment('marketing', { ... })
```

### Pattern 3: Company Research

Check if a specific company is hiring:

```typescript
const jobs = await theirstack.searchJobs({
  company_domain_or: ['acme.com'],
  posted_at_max_age_days: 90,  // Last 3 months
  limit: 100
})

// See what roles they're hiring, their tech stack, etc.
```

---

## Files Created/Updated

```
offer-testing/
├── src/lib/clients/
│   └── theirstack.ts              ← ✅ Updated with real API
├── scripts/
│   └── test-theirstack.ts         ← ✅ New test script
└── docs/
    ├── theirstack-setup.md        ← ✅ Complete guide
    ├── THEIRSTACK-QUICKSTART.md   ← ✅ Quick reference
    └── THEIRSTACK-SETUP-COMPLETE.md ← ✅ This file
```

---

## Next Steps

### 1. Integrate with Company Finder

Update `src/core/company-finder.ts` to use TheirStack:

```typescript
import { theirstack } from '../lib/clients/theirstack'

async findCompaniesBySignal(signal: 'hiring_sales' | 'hiring_engineering', options) {
  if (signal === 'hiring_sales') {
    return await theirstack.findCompaniesHiringSales(options)
  }
  // ... etc
}
```

### 2. Add to Offer Workflow

When creating a new offer:

1. Define positioning & ICP
2. **Identify hiring signals** (which roles indicate they have the problem?)
3. Use TheirStack to find companies with those signals
4. Save to database
5. Generate personalized outreach

### 3. Build Signal Library

Create a mapping of offers → signals:

```typescript
const SIGNAL_LIBRARY = {
  'sales-training': {
    signal: 'hiring_sales',
    search: () => theirstack.findCompaniesHiringSales({ ... })
  },
  'dev-tools': {
    signal: 'hiring_engineering',
    search: () => theirstack.findCompaniesHiringForDepartment('engineering', { ... })
  },
  // ... etc
}
```

---

## Troubleshooting

### Issue: "Not authenticated" error

**Solution**: Check `.env.local` has `THEIRSTACK_API_KEY=your_key_here`

### Issue: "Must include required filter"

**Solution**: Add `posted_at_max_age_days: 14` or another required filter

### Issue: Empty results

**Solution**: 
- Try broader filters
- Increase time range (`posted_at_max_age_days: 30` instead of 7)
- Remove company size filters

### Issue: Rate limited (429)

**Solution**: Slow down requests - max 4 per second

---

## Resources

- **API Documentation**: https://api.theirstack.com/
- **Test Script**: `npx tsx scripts/test-theirstack.ts`
- **Quick Reference**: `docs/THEIRSTACK-QUICKSTART.md`
- **Full Guide**: `docs/theirstack-setup.md`

---

## Status: ✅ READY TO USE

Your TheirStack integration is complete and tested. You can now:

1. ✅ Search for companies by hiring signals
2. ✅ Filter by job title, location, company size, etc.
3. ✅ Get rich company data (domain, LinkedIn, tech stack)
4. ✅ Save companies to your database
5. ✅ Use signals in your outreach

**Start using it**: Import `theirstack` from `src/lib/clients/theirstack` and call the search methods!

