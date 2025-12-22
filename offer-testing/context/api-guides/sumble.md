# Sumble API - Context & Usage Guide

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

## How to Use Sumble

### Client Location

```typescript
import { sumble } from '@/lib/clients/sumble'
// or
import { SumbleClient } from '@/lib/clients/sumble'
const client = new SumbleClient()
```

### Primary Method: findJobs()

**Use this for discovering companies with hiring signals:**

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

// Use natural language
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

### Secondary Method: enrichOrganization()

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

## Integration with Offer Testing Workflow

### Step 1: Company Discovery (company-finder.ts)

**START HERE with Jobs API:**

```typescript
// Find companies with hiring signals
const jobs = await sumble.findJobs({
  filters: {
    technologies: offer.targetTechnologies,
    countries: offer.targetCountries,
    since: '2024-11-01'  // Last 2 months
  },
  limit: 100
})

// Group by company and prioritize multi-job companies
const companies = groupByDomain(jobs.jobs)
  .filter(c => c.jobCount >= 2)  // At least 2 openings
  .sort((a, b) => b.jobCount - a.jobCount)

// Store in Supabase with hiring signals
await saveCompanies(companies.map(c => ({
  domain: c.domain,
  name: c.name,
  hiring_signal_count: c.jobCount,
  latest_job_title: c.latestJob.job_title,
  latest_job_date: c.latestJob.datetime_pulled,
  matched_technologies: c.latestJob.matched_technologies
})))
```

### Step 2: ICP Validation (icp-generator.ts)

**Use Enrichment API to validate tech fit:**

```typescript
// After finding companies via Jobs API
for (const company of companies) {
  const techData = await sumble.enrichOrganization({
    domain: company.domain,
    technologies: offer.requiredTechnologies
  })
  
  // Calculate tech stack match score
  const matchScore = (techData.technologies_count || 0) / offer.requiredTechnologies.length
  
  if (matchScore >= 0.67) {
    company.icp_match = true
    company.tech_stack = techData.technologies_found
    company.engineer_count = techData.technologies?.reduce(
      (sum, t) => sum + (t.people_count || 0), 0
    )
  }
}
```

### Step 3: Copy Generation (copy-generator.ts)

**Use job data for personalization:**

```typescript
// Get recent jobs for personalization
const jobs = await sumble.findJobs({
  organization: { domain: company.domain },
  filters: { since: '2024-11-01' },
  limit: 5
})

if (jobs.jobs.length > 0) {
  const latestJob = jobs.jobs[0]
  
  // Generate personalized hook
  const hook = jobs.total >= 5
    ? `I see you're rapidly scaling your engineering team (${jobs.total} open roles)`
    : `I noticed you recently posted for a ${latestJob.job_title}`
  
  const context = latestJob.matched_technologies
    ? `As you're building with ${latestJob.matched_technologies}, `
    : ''
  
  return {
    opening: `${hook}. ${context}I wanted to share something relevant...`,
    jobUrl: latestJob.url,  // Reference in email
    jobTitle: latestJob.job_title,
    technologies: latestJob.matched_technologies
  }
}
```

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

## Signal Quality Indicators

### Strong Signals (High Priority)
- ✅ **5+ job openings** = Rapidly scaling, big budget
- ✅ **Posted within 30 days** = Urgent need
- ✅ **Multiple technologies match** = Strong ICP fit
- ✅ **Specific tech in job title** = Core to their stack

### Medium Signals
- ⚠️ **2-4 job openings** = Steady growth
- ⚠️ **Posted 30-60 days ago** = Still relevant
- ⚠️ **1 technology matches** = Potential fit

### Weak Signals (Deprioritize)
- ❌ **1 job opening** = Less urgent
- ❌ **Posted 60+ days ago** = May be filled
- ❌ **No tech match** = Poor fit

## Common Patterns

### Pattern 1: Discovery → Validation → Personalization

```typescript
// 1. Discovery: Find companies hiring
const jobs = await sumble.findJobs({ filters: { technologies: ['python'] }})

// 2. Validation: Check tech stack
const tech = await sumble.enrichOrganization({ 
  domain: topCompany.domain,
  technologies: ['python', 'aws', 'react']
})

// 3. Personalization: Use job details in copy
const message = `I noticed you're hiring for ${jobs.jobs[0].job_title}...`
```

### Pattern 2: Competitive Intelligence

```typescript
const competitors = ['stripe.com', 'square.com', 'adyen.com']

for (const domain of competitors) {
  const jobs = await sumble.findJobs({
    organization: { domain },
    filters: { since: '2024-01-01' }
  })
  
  console.log(`${domain}: ${jobs.total} jobs, hiring for ${getUniqueTech(jobs)}`)
}
```

### Pattern 3: Bulk Tech Validation

```typescript
// Validate multiple companies against ICP
const results = await sumble.bulkEnrich(
  companyDomains,
  ['python', 'aws', 'react']
)

const matches = results.filter(r => r.technologies_count >= 2)
```

## Tips for Best Results

1. **Always use `since` parameter** - Job signals get stale fast (30-60 days max)
2. **Start with Jobs API** - Better for discovery than enrichment
3. **Group by company** - Multiple openings = stronger signal
4. **Check `matched_technologies`** - Validates what actually matched your search
5. **Use job descriptions** - Full text has rich personalization data
6. **Monitor credits** - Jobs API costs add up with large searches
7. **Combine with Parallel** - Sumble for hiring signals, Parallel for contacts
8. **Save job URLs** - Reference them in outreach for credibility

## Example Queries You Might Ask

### Discovery Queries
- "Find companies hiring Python engineers"
- "Show me companies with 5+ open engineering roles"
- "Which SaaS companies are hiring for React developers?"
- "Find startups scaling their engineering teams"

### Validation Queries
- "Does Stripe use Python and AWS?"
- "Check if these 10 companies match our tech ICP"
- "How many engineers at Anthropic work with Python?"

### Personalization Queries
- "Get recent job postings at Stripe for copy generation"
- "What's Anthropic hiring for right now?"
- "Show me the latest engineering roles at these companies"

### Analysis Queries
- "Compare the tech stacks of Stripe, Square, and Adyen"
- "Which companies are adopting Kubernetes?"
- "Show hiring trends for React vs Vue"

## Technical Reference

**Client File:** `src/lib/clients/sumble.ts`
**Documentation:** `docs/sumble-guide.md`
**Test Script:** `scripts/test-sumble.ts`
**Example Script:** `scripts/sumble-find-companies.ts`

**Environment Variable:** `SUMBLE_API_KEY` in `.env.local`

## Quick Decision Tree

```
Need to find companies? 
├─ With specific characteristics (industry, size, location)?
│  └─ Use: Exa or Parallel
│
├─ That are HIRING right now?
│  └─ Use: Sumble Jobs API ✅
│
└─ Already have domain, need to validate tech stack?
   └─ Use: Sumble Enrichment API ✅

Need contact information?
└─ Use: Parallel or Leadmagic (NOT Sumble)

Need general company data?
└─ Use: Parallel (NOT Sumble)
```

## Summary

**Sumble's Superpower:** Finding companies with hiring signals and validating tech stacks.

**Primary Use Case:** Discovery via Jobs API - this is where Sumble shines!

**Best For:** Signal-based outreach where timing and personalization matter.

**Not For:** General enrichment, contact finding, or broad company discovery.

**Integration Point:** Use FIRST in company-finder.ts to get hot leads with hiring signals, then validate with other APIs.

