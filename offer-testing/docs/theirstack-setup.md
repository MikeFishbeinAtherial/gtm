# TheirStack API Setup & Usage Guide

## ✅ Setup Complete!

Your TheirStack integration is now working! The test script confirmed successful API calls.

## 📋 What's Configured

1. **API Client**: `src/lib/clients/theirstack.ts` - Fully updated with real API types
2. **Test Script**: `scripts/test-theirstack.ts` - Tests 5 different search scenarios
3. **Environment**: Your API key is loaded from `.env.local`

## 🔑 API Key Location

Your TheirStack API key should be in `/offer-testing/.env.local`:

```bash
THEIRSTACK_API_KEY=your_api_key_here
```

## 🧪 Running Tests

Test the API connection:

```bash
cd offer-testing
npx tsx scripts/test-theirstack.ts
```

This will run 5 different searches:
1. Basic connection test
2. Find US companies hiring sales reps
3. Find companies hiring engineers
4. Find AI/LLM jobs
5. Advanced: Remote sales jobs at YC companies

## 📖 Usage Examples

### Example 1: Find Companies Hiring Sales Reps

Perfect for selling **sales training/enablement tools**:

```typescript
import { theirstack } from './src/lib/clients/theirstack'

// Find companies actively hiring SDRs/BDRs
const jobs = await theirstack.findCompaniesHiringSales({
  country_codes: ['US'],
  posted_within_days: 14,      // Last 2 weeks
  min_employee_count: 50,      // Mid-size companies
  max_employee_count: 500,
  limit: 25
})

// Each job includes:
// - job_title: "SDR", "BDR", "Account Executive", etc.
// - company_object: Full company details (name, domain, size, etc.)
// - locations: Where the job is located
// - description: Full job description
// - hiring_team: Who's hiring (if available)
```

**Why this works:**  
- Companies hiring sales reps → need to train them!
- This is a **strong buying signal** for your offer
- You reach out when they're actively thinking about sales

### Example 2: Find Companies by Department

```typescript
// Find companies hiring in specific departments
const engineeringJobs = await theirstack.findCompaniesHiringForDepartment(
  'engineering',  // or 'sales', 'marketing', 'product', 'customer_success'
  {
    country_codes: ['US', 'CA'],
    posted_within_days: 7,
    limit: 50
  }
)
```

**Use cases:**
- `engineering` → Selling dev tools, CI/CD, code review
- `marketing` → Selling marketing automation, analytics
- `product` → Selling product management tools
- `customer_success` → Selling support/ticketing tools

### Example 3: Custom Job Description Search

Find jobs mentioning specific technologies or keywords:

```typescript
// Find jobs mentioning AI/ML
const aiJobs = await theirstack.searchByDescription(
  ['artificial intelligence', 'machine learning', 'LLM', 'GPT'],
  {
    country_codes: ['US'],
    posted_within_days: 7
  }
)
```

**Why this works:**  
- Hyper-specific signal matching
- Find companies mentioning YOUR tech stack
- Target companies with specific pain points

### Example 4: Advanced Custom Search

Full control over all filters:

```typescript
const jobs = await theirstack.searchJobs({
  // Job title filters (regex patterns)
  job_title_pattern_or: ['SDR', 'BDR', 'Sales Development'],
  
  // Date filter (REQUIRED - at least one)
  posted_at_max_age_days: 14,
  
  // Location
  job_country_code_or: ['US'],
  remote: true,  // Remote jobs only
  
  // Company size
  min_employee_count: 50,
  max_employee_count: 500,
  
  // Company attributes
  only_yc_companies: true,  // Y Combinator companies only
  
  // Pagination
  limit: 25,
  page: 0
})
```

## 🎯 Finding the Right Signal

TheirStack is all about **hiring signals**. Here's how to match signals to your offer:

| Your Offer | Signal to Track | TheirStack Filter |
|------------|----------------|-------------------|
| Sales training | Hiring SDRs/BDRs | `job_title_pattern_or: ['SDR', 'BDR']` |
| Dev tools | Hiring engineers | `job_title_pattern_or: ['engineer', 'developer']` |
| Marketing automation | Hiring marketing | `job_title_pattern_or: ['marketing', 'growth']` |
| HR software | Hiring people ops | `job_title_pattern_or: ['recruiter', 'HR', 'people']` |
| Customer support tools | Hiring CS team | `job_title_pattern_or: ['support', 'customer success']` |

## 📊 Understanding the Response

Each job includes:

```typescript
{
  id: 1234,
  job_title: "Senior Sales Development Representative",
  date_posted: "2024-12-15",
  remote: true,
  
  // Company info
  company_object: {
    name: "Acme Inc",
    domain: "acme.com",
    employee_count: 250,
    linkedin_url: "https://linkedin.com/company/acme",
    industry: "Software",
    founded_year: 2020,
    technology_slugs: ["salesforce", "hubspot"],  // Tech they use
    // ... and much more
  },
  
  // Location
  locations: [{
    display_name: "San Francisco, California, United States",
    country_code: "US",
    state: "California"
  }],
  
  // Description
  description: "We're looking for an SDR to...",
  
  // Hiring team (if available)
  hiring_team: [{
    full_name: "John Smith",
    role: "VP Sales",
    linkedin_url: "https://linkedin.com/in/johnsmith"
  }]
}
```

## 🚀 Next Steps: Integrating with Your Workflow

### 1. Save Companies to Database

When you find interesting jobs, save the companies:

```typescript
import { supabase } from './src/lib/clients/supabase'
import { theirstack } from './src/lib/clients/theirstack'

const jobs = await theirstack.findCompaniesHiringSales({ ... })

for (const job of jobs.data) {
  const company = job.company_object
  
  await supabase.from('companies').insert({
    offer_id: 'your-offer-id',
    name: company.name,
    domain: company.domain,
    size_exact: company.employee_count,
    industry: company.industry,
    headquarters_city: company.city,
    headquarters_country: company.country,
    
    // Store hiring signal
    signals: {
      hiring_sales: true,
      hiring_roles: [job.job_title],
    },
    
    source_tool: 'theirstack',
    source_query: 'Hiring SDRs/BDRs in last 14 days',
    source_raw: job,
    status: 'new'
  })
}
```

### 2. Use in Your Outreach

Now you can reference the hiring in your outreach:

```
Hi {firstName},

I saw {companyName} is hiring {jobTitle} – congrats on the growth!

I've been helping sales teams like yours...
```

This is **contextual** and **relevant** because:
- ✅ Based on real-time signal (they're hiring NOW)
- ✅ Shows you did research
- ✅ Ties to their immediate needs

## 🔍 API Constraints & Best Practices

### Required Filters

You **must** include at least one of these filters:

- `posted_at_max_age_days` (recommended: 7-30 days)
- `posted_at_gte` / `posted_at_lte` (specific date range)
- `company_domain_or` (specific companies)
- `company_linkedin_url_or`
- `company_name_or`

### Rate Limits

- **Free**: 4/second, 10/minute, 50/hour, 400/day
- **Paid**: 4/second (no other limits)

### Credits

- 1 credit per job returned
- Use `limit` parameter to control costs
- Use `blur_company_data: true` for free preview (blurred data, no credits)

### Performance Tips

1. **Don't use `include_total_results: true`** unless you need it
   - Significantly slower
   - Only use on first request, then disable for pagination

2. **Use specific filters** to narrow results:
   - `posted_at_max_age_days: 7` instead of 30
   - `min_employee_count` / `max_employee_count`
   - Country filters

3. **Paginate efficiently**:
   ```typescript
   // Page 1
   const page1 = await theirstack.searchJobs({ ..., page: 0, limit: 25 })
   
   // Page 2
   const page2 = await theirstack.searchJobs({ ..., page: 1, limit: 25 })
   ```

## 🛠️ Common Patterns

### Pattern 1: Weekly Signal Check

Run weekly to find new companies hiring:

```typescript
// Every Monday, find companies that started hiring in last 7 days
const newHiring = await theirstack.findCompaniesHiringSales({
  posted_within_days: 7,
  country_codes: ['US'],
  min_employee_count: 50,
  limit: 100
})

// Save to database, score for fit, add to outreach queue
```

### Pattern 2: Company Research

Check if a specific company is hiring:

```typescript
const jobs = await theirstack.searchJobs({
  company_domain_or: ['acme.com'],
  posted_at_max_age_days: 90,  // Last 3 months
  limit: 100
})

// Understand their hiring patterns, priorities, tech stack
```

### Pattern 3: Territory Assignment

Find companies hiring in specific locations:

```typescript
const westCoastJobs = await theirstack.searchJobs({
  job_title_pattern_or: ['SDR', 'BDR'],
  job_location_pattern_or: [
    'San Francisco',
    'Los Angeles',
    'Seattle',
    'Portland'
  ],
  posted_at_max_age_days: 30
})
```

## 📚 Additional Resources

- **API Docs**: https://api.theirstack.com/
- **Technology Catalog**: GET `/v0/catalog/technologies` (find tech slugs)
- **Industry Catalog**: GET `/v0/catalog/industries` (find industry IDs)
- **Location Catalog**: GET `/v0/catalog/locations` (find location IDs)

## ❓ Questions?

Common issues:

1. **401 Unauthorized**: Check your API key in `.env.local`
2. **400 Bad Request**: Missing required filter (posted_at_max_age_days, etc.)
3. **Empty results**: Try broader filters or longer time range
4. **Rate limited (429)**: Slow down your requests (4/second max)

---

**Status**: ✅ Setup complete and tested!  
**Last Updated**: December 20, 2024

