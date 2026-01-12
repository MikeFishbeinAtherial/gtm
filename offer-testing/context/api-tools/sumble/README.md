# Sumble API - Complete Guide

> **Moved from:** `context/api-guides/sumble.md`  
> **Consolidated with:** Quick reference content

## What Sumble Does

Sumble is a **hiring signals and technology intelligence API**. It specializes in:

1. **Job Posting Search** - Find companies actively hiring (THE PRIMARY USE CASE)
2. **Technology Discovery** - See which people at a company use specific technologies
3. **People Discovery** - Find engineers/teams working with particular tech stacks

## When to Use Sumble

### ✅ USE Sumble For:

1. **Finding Companies with Hiring Signals** 🔥
   - "Find companies hiring Python engineers"
   - "Show me companies scaling their engineering teams"
   - "Who's hiring for React developers in the US?"
   - **Why:** Hiring = budget + urgent need + perfect timing

2. **Technology Stack Validation**
   - "Does this company use Python?"
   - "How many engineers at Stripe work with AWS?"
   - "Validate if these companies match our tech ICP"
   - **Why:** Confirms product-market fit

3. **Personalization Data for Outreach**
   - "Get recent job postings at [company] for copy generation"
   - "Find what technologies they're hiring for"
   - **Why:** Job details = hyper-specific personalization hooks

4. **Competitive Intelligence**
   - "What tech is [competitor] hiring for?"
   - "Compare tech stacks of [companies]"
   - **Why:** Market insights and positioning

### ❌ DON'T Use Sumble For:

1. **General Company Enrichment**
   - Use Parallel for: revenue, employee count, industry, location
   - Sumble only returns basic org info (name, domain, id)

2. **Contact Finding**
   - Use Parallel or Leadmagic for: emails, phone numbers, titles
   - Sumble gives you people counts, not contact details

3. **Company Search/Discovery**
   - Use Exa or Parallel for: "Find all SaaS companies in SF"
   - Sumble requires you to already have domain names OR search by tech/jobs

4. **Web Research**
   - Use Exa for: company websites, news, blog posts
   - Sumble focuses on job postings and tech usage

## Setup

### Environment Variables

Add to `.env.local`:
```bash
SUMBLE_API_KEY=your_api_key_here
```

Get your API key at: https://sumble.com/account/api-keys

### Client Import

```typescript
import { sumble } from '@/lib/clients/sumble'
// or
import { SumbleClient } from '@/lib/clients/sumble'
const client = new SumbleClient()
```

## API Methods

### 1. findJobs() - Find Companies Hiring

**Primary use case:** Discover companies with hiring signals

```typescript
// Find companies hiring for specific tech
const jobs = await sumble.findJobs({
  filters: {
    technologies: ['python', 'react'],  // REQUIRED
    countries: ['US'],                   // Optional
    since: '2024-11-01'                  // Optional but recommended
  },
  limit: 50  // Max 100, costs 3 credits per job returned
})

// Scope to specific company
const jobs = await sumble.findJobs({
  organization: { domain: 'stripe.com' },
  filters: { since: '2024-11-01' },
  limit: 20
})

// Use natural language query
const jobs = await sumble.findJobs({
  query: 'Senior Python Engineer with AWS experience',
  limit: 20
})
```

**Response includes:**
- `job_title` - Exact role they're hiring for
- `matched_technologies` - Technologies that matched your search
- `description` - Full job posting text
- `datetime_pulled` - When job was posted
- `location` - Where the role is based
- `url` - Link to view on Sumble

### 2. enrichOrganization() - Validate Tech Stack

**Use this for validating tech stack:**

```typescript
// Check if company uses specific technologies
const result = await sumble.enrichOrganization({
  domain: 'stripe.com',
  technologies: ['python', 'aws', 'react']  // REQUIRED: at least one
})

// Returns:
// - technologies_found: "Python, AWS, React"
// - technologies: [{ name, people_count, jobs_count, last_job_post }]
```

**Important:** You MUST specify technologies. This is NOT for general enrichment.

## Cost & Rate Limits

### Credits
- **Organization Enrichment:** 5 credits per request
- **Jobs Search:** 3 credits per job returned (NOT per search)
  - Example: `limit: 50` with 50 matches = 150 credits
  - Example: `limit: 50` with 10 matches = 30 credits

### Rate Limits
- **10 requests per second** across all endpoints
- Returns 429 error if exceeded
- Use `bulkEnrich()` method for automatic batching

### Current Balance
Check any response for: `credits_used` and `credits_remaining`

## Finding Sales Roles

When checking if a company is hiring salespeople, use the sales job titles helper:

```typescript
import { isSalesJobTitle, isSalesJobDescription } from '@/context/sales-job-titles'

const jobs = await sumble.findJobs({
  organization: { domain: 'company.com' },
  filters: { since: '2024-12-01' },
  limit: 20
})

const salesJobs = jobs.jobs.filter(job => 
  isSalesJobTitle(job.job_title || '') || 
  isSalesJobDescription(job.description || '')
)
```

See `context/sales-job-titles.ts` for the complete list of sales roles.

## Examples

See `examples.ts` for detailed code examples.

## Related Files

- **Client:** `src/lib/clients/sumble.ts`
- **Sales Job Titles:** `context/sales-job-titles.ts`
- **Quick Reference:** `../api-guides/sumble.md` (legacy, will be removed)
