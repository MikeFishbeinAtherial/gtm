# Sumble Integration Guide

## Overview

Sumble helps you discover **which people at a company use specific technologies** and **find job postings with hiring signals**. This is perfect for finding technical decision-makers and understanding a company's tech stack.

## What Sumble Does

Unlike traditional enrichment APIs that give you basic firmographics, Sumble specializes in:

1. **Technology Discovery** - Find which companies use specific technologies
2. **People Discovery** - Discover people at a company who work with those technologies
3. **Job Posting Analysis** - Get detailed job listings to find hiring signals
4. **Team Insights** - Identify teams using particular technologies

## Setup

Your API key is already configured in `.env.local`:

```bash
SUMBLE_API_KEY=your_api_key_here
```

Generate keys at: https://sumble.com/account/api-keys

## Usage

### 1. Technology Discovery (Organization Enrichment)

Find which people at a company use specific technologies.

```typescript
import { sumble } from '@/lib/clients/sumble'

// Find companies using Python
const result = await sumble.enrichOrganization({
  domain: 'anthropic.com',
  technologies: ['python']  // REQUIRED: at least one technology
})

console.log(`${result.organization.name} has ${result.technologies_count} matches`)
console.log(`Technologies found: ${result.technologies_found}`)
```

### 2. Job Posting Search (Hiring Signals)

Find job postings to discover hiring signals. **This is the killer feature for outreach!**

```typescript
// Find all Python jobs at a specific company
const jobs = await sumble.findJobs({
  organization: { domain: 'stripe.com' },
  filters: { 
    technologies: ['python'],
    since: '2024-01-01'  // Only recent postings
  },
  limit: 20
})

console.log(`Found ${jobs.total} Python jobs at Stripe`)
jobs.jobs.forEach(job => {
  console.log(`${job.job_title} - ${job.location}`)
  console.log(`Posted: ${job.datetime_pulled}`)
  console.log(`URL: ${job.url}`)
})
```

#### Find Jobs Across All Companies

Don't specify an organization to search globally:

```typescript
// Find all React jobs in the US
const jobs = await sumble.findJobs({
  filters: {
    technologies: ['react'],
    countries: ['US']
  },
  limit: 50
})

// Group by company
const byCompany = jobs.jobs.reduce((acc, job) => {
  const domain = job.organization_domain || 'unknown'
  if (!acc[domain]) acc[domain] = []
  acc[domain].push(job)
  return acc
}, {} as Record<string, typeof jobs.jobs>)

console.log(`Found companies hiring for React:`)
Object.entries(byCompany).forEach(([domain, jobs]) => {
  console.log(`${domain}: ${jobs.length} open positions`)
})
```

#### Natural Language Query

Use natural language instead of filters:

```typescript
const jobs = await sumble.findJobs({
  query: 'Senior Python Engineer with AWS experience in San Francisco',
  limit: 20
})
```

### 3. Detailed Technology Breakdown

Get detailed info about which teams/people use specific technologies:

```typescript
const result = await sumble.enrichOrganization({
  domain: 'stripe.com',
  technologies: ['python', 'aws', 'react', 'kubernetes']
})

// See detailed info for each technology
result.technologies?.forEach(tech => {
  console.log(`\n${tech.name}:`)
  console.log(`  - ${tech.people_count} people use this`)
  console.log(`  - ${tech.jobs_count} recent job postings`)
  console.log(`  - Last job post: ${tech.last_job_post}`)
  console.log(`  - View people: ${tech.people_data_url}`)
})
```

### 4. Bulk Operations

Process multiple companies efficiently:

```typescript
const result = await sumble.enrichOrganization({
  domain: 'stripe.com',
  technologies: ['python', 'aws', 'react', 'kubernetes']
})

// See detailed info for each technology
result.technologies?.forEach(tech => {
  console.log(`\n${tech.name}:`)
  console.log(`  - ${tech.people_count} people use this`)
  console.log(`  - ${tech.jobs_count} recent job postings`)
  console.log(`  - Last job post: ${tech.last_job_post}`)
  console.log(`  - View people: ${tech.people_data_url}`)
})
```

### Bulk Enrichment

```typescript
const companies = [
  'stripe.com',
  'shopify.com',
  'square.com'
]

const results = await sumble.bulkEnrich(
  companies,
  ['python', 'aws', 'react']  // Technologies to search for
)

// Process results
results.forEach(result => {
  console.log(`${result.organization.name}: ${result.technologies_found}`)
})
```

## API Response Structures

### Organization Enrichment Response

```typescript
{
  id: "019b3ce6-...",              // Request ID
  credits_used: 5,                  // Credits consumed by this request
  credits_remaining: 9890,          // Your remaining credit balance
  
  organization: {
    id: 1726684,
    slug: "sumble",
    name: "Sumble",
    domain: "sumble.com"
  },
  
  technologies_found: "Python, AWS, React",  // Comma-separated list
  technologies_count: 3,                      // Number of matching technologies
  source_data_url: "https://sumble.com/...", // View full data on Sumble.com
  
  technologies: [
    {
      name: "Python",
      people_count: 7,              // People at company who use this tech
      jobs_count: 1,                // Recent job postings requiring this tech
      last_job_post: "2025-09-23",  // Most recent job posting date
      people_data_url: "https://sumble.com/...",  // View matching people
      jobs_data_url: "https://sumble.com/...",    // View job postings
      teams_count: 1,               // Teams using this tech
      teams_data_url: "https://sumble.com/..."    // View teams
    }
  ]
}
```

### Jobs Search Response

```typescript
{
  id: "019b3ce6-...",              // Request ID
  credits_used: 15,                 // 3 credits per job returned
  credits_remaining: 9840,
  total: 5,                         // Total jobs matching query
  
  jobs: [
    {
      id: 123456,
      organization_id: 789,
      organization_name: "Anthropic",
      organization_domain: "anthropic.com",
      job_title: "Research Scientist, Life Sciences",
      datetime_pulled: "2025-12-03T10:00:00Z",  // When job was scraped
      primary_job_function: "Engineering",
      location: "San Francisco, California, United States",
      teams: "Research, ML",
      matched_technologies: "Python",           // Technologies that matched search
      matched_projects: null,
      projects_description: null,
      matched_job_functions: "Engineering",
      projects: null,
      description: "Full job description...",   // Complete job posting text
      url: "https://sumble.com/l/job/..."      // URL to view on Sumble
    }
  ]
}
```

## Credits & Rate Limits

### Credits

- **Organization Enrichment**: 5 credits per request
- **Job Search**: 3 credits per job returned (not per search!)
  - If you search with `limit: 20` and get 20 jobs = 60 credits
  - If you search with `limit: 20` but only 5 match = 15 credits

Monitor your credits in every API response:
```typescript
const result = await sumble.enrichOrganization(...)
console.log(`Used: ${result.credits_used}, Remaining: ${result.credits_remaining}`)
```

### Rate Limits

- **10 requests per second** across all endpoints
- Responses include HTTP 429 if you exceed the limit
- The `bulkEnrich()` method automatically batches requests to stay under the limit

## Use Cases for Offer Testing

### 1. Hiring Signals = Perfect Timing (🔥 BEST USE CASE)

Companies posting jobs = they're growing and need help RIGHT NOW!

```typescript
// Find companies hiring for your target role/tech
const jobs = await sumble.findJobs({
  filters: {
    technologies: ['react', 'typescript'],
    countries: ['US'],
    since: '2024-11-01'  // Last 2 months
  },
  limit: 100
})

// Group by company to find companies with multiple openings
const companiesByJobCount = jobs.jobs.reduce((acc, job) => {
  const domain = job.organization_domain
  if (!domain) return acc
  if (!acc[domain]) {
    acc[domain] = { 
      name: job.organization_name, 
      jobs: [] 
    }
  }
  acc[domain].jobs.push(job)
  return acc
}, {} as Record<string, { name: string, jobs: typeof jobs.jobs }>)

// Sort by number of openings (more openings = more need)
const topCompanies = Object.entries(companiesByJobCount)
  .sort(([,a], [,b]) => b.jobs.length - a.jobs.length)
  .slice(0, 20)

console.log('Top 20 companies actively hiring:')
topCompanies.forEach(([domain, data]) => {
  console.log(`${data.name} (${domain}): ${data.jobs.length} openings`)
  console.log(`  Latest: ${data.jobs[0].job_title}`)
})
```

**Why this is powerful:**
- Company is hiring = they have budget
- Multiple openings = scaling fast
- Recent posts = urgent need
- Perfect timing for your outreach!

### 2. Find Companies Using Your Tech Stack

Perfect for "We help companies that use X technology":

```typescript
// Find companies using Python (your target tech)
const result = await sumble.enrichOrganization({
  domain: targetCompany,
  technologies: ['python']
})

if (result.technologies_count > 0) {
  // This company uses Python - good fit!
  console.log(`${result.organization.name} has ${result.technologies?.[0].people_count} Python developers`)
}
```

### 3. Personalize Outreach with Job Data

Use actual job postings to personalize your message:

```typescript
// Get recent jobs at target company
const jobs = await sumble.findJobs({
  organization: { domain: 'stripe.com' },
  filters: { since: '2024-11-01' },
  limit: 10
})

if (jobs.jobs.length > 0) {
  const latestJob = jobs.jobs[0]
  
  // Use in your outreach copy
  const personalizedOpening = `
I noticed ${latestJob.organization_name} recently posted for a ${latestJob.job_title} 
${latestJob.matched_technologies ? `working with ${latestJob.matched_technologies}` : ''}.

As you're expanding your ${latestJob.primary_job_function} team...
  `.trim()
  
  console.log(personalizedOpening)
}
```

### 4. Technology Migration Signals

Find companies adopting new tech (great timing for outreach):

```typescript
const result = await sumble.enrichOrganization({
  domain: company.domain,
  technologies: ['aws', 'kubernetes', 'terraform']
})

// Recent job posts = actively building/migrating
const recentlyHiring = result.technologies?.filter(tech => {
  const postDate = new Date(tech.last_job_post || '')
  const monthsAgo = (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  return monthsAgo < 3  // Within last 3 months
})

if (recentlyHiring && recentlyHiring.length > 0) {
  console.log(`🚀 ${company.name} is actively expanding their cloud infrastructure!`)
}
```

### 5. Find Decision-Makers

Use the `people_data_url` to find specific people who work with your target technology:

```typescript
const result = await sumble.enrichOrganization({
  domain: 'stripe.com',
  technologies: ['python']
})

const pythonTech = result.technologies?.find(t => t.name === 'Python')
if (pythonTech) {
  console.log(`Found ${pythonTech.people_count} Python developers`)
  console.log(`View profiles: ${pythonTech.people_data_url}`)
  // Visit this URL to see names, titles, LinkedIn profiles
}
```

### 6. Competitive Intelligence

See what technologies your target companies are hiring for:

```typescript
const competitors = ['stripe.com', 'square.com', 'adyen.com']

for (const domain of competitors) {
  const jobs = await sumble.findJobs({
    organization: { domain },
    filters: { since: '2024-01-01' },
    limit: 50
  })
  
  // Extract unique technologies from job postings
  const technologies = new Set(
    jobs.jobs
      .map(j => j.matched_technologies?.split(',').map(t => t.trim()) || [])
      .flat()
  )
  
  console.log(`\n${domain}:`)
  console.log(`  ${jobs.total} total jobs`)
  console.log(`  Technologies: ${Array.from(technologies).join(', ')}`)
}

## Integration with Your Workflow

### In Company Discovery (company-finder.ts)

**Use Jobs API to find companies with hiring signals:**

```typescript
// BEST APPROACH: Start with hiring signals
const jobs = await sumble.findJobs({
  filters: {
    technologies: ['python', 'react'],  // Your target tech
    countries: ['US'],
    since: '2024-11-01'  // Recent postings only
  },
  limit: 100
})

// Extract unique companies
const companies = Array.from(
  new Map(
    jobs.jobs
      .filter(j => j.organization_domain)
      .map(j => [
        j.organization_domain,
        {
          domain: j.organization_domain!,
          name: j.organization_name,
          jobCount: jobs.jobs.filter(jb => jb.organization_domain === j.organization_domain).length,
          latestJob: j
        }
      ])
  ).values()
)

// Prioritize companies with multiple openings
companies.sort((a, b) => b.jobCount - a.jobCount)

console.log(`Found ${companies.length} companies actively hiring`)
```

**Then enrich with technology data:**

```typescript
// After finding companies via Jobs API
for (const company of companies) {
  const techData = await sumble.enrichOrganization({
    domain: company.domain,
    technologies: ['python', 'aws', 'react']
  })
  
  // Store technology signals
  company.tech_stack = techData.technologies_found
  company.engineer_count = techData.technologies?.reduce((sum, t) => sum + (t.people_count || 0), 0)
  company.is_hiring = techData.technologies?.some(t => t.jobs_count > 0)
}
```

### In ICP Targeting (icp-generator.ts)

```typescript
// Define required technologies for your ICP
const requiredTech = ['python', 'aws', 'react']

// Validate company matches ICP
const techData = await sumble.enrichOrganization({
  domain: company.domain,
  technologies: requiredTech
})

const matchScore = (techData.technologies_count || 0) / requiredTech.length
if (matchScore >= 0.67) {
  // Company uses 2/3 of required tech - good fit!
  console.log(`✅ ${company.name} matches ICP (${matchScore * 100}%)`)
}
```

### In Copy Generation (copy-generator.ts)

**Use job data for hyper-personalization:**

```typescript
// Get recent jobs at target company
const jobs = await sumble.findJobs({
  organization: { domain: company.domain },
  filters: { since: '2024-11-01' },
  limit: 5
})

let personalizedHook = ''

if (jobs.jobs.length > 0) {
  const latestJob = jobs.jobs[0]
  
  // Personalize based on hiring activity
  if (jobs.total > 5) {
    personalizedHook = `I see you're rapidly scaling your ${latestJob.primary_job_function} team ` +
                       `(${jobs.total} open roles). `
  } else {
    personalizedHook = `I noticed you recently posted for a ${latestJob.job_title}. `
  }
  
  // Add technology context
  if (latestJob.matched_technologies) {
    personalizedHook += `As you're building with ${latestJob.matched_technologies}, `
  }
}

// Use in email/LinkedIn message
const message = `
${personalizedHook}

I wanted to share something that might help...
`.trim()
```

## Testing

Run the test script to verify your setup:

```bash
npx tsx scripts/test-sumble.ts
```

This will:
1. ✅ Check API key configuration
2. ✅ Test basic enrichment
3. ✅ Test multi-technology enrichment
4. ✅ Show your credit balance

## Documentation

- API Docs: https://sumble.com/docs/api
- Manage API Keys: https://sumble.com/account/api-keys
- View Credit Balance: Check any API response's `credits_remaining` field

## Tips & Best Practices

1. **Start with Jobs API for discovery** - Use `findJobs()` to find companies with hiring signals, THEN enrich with technology data
2. **Filter by date** - Always use `since` parameter to get recent postings (hiring signals get stale fast!)
3. **Look for multiple openings** - Companies with 3+ openings in your target area = massive opportunity
4. **Use job descriptions** - The `description` field has tons of detail about tech stack, team, and pain points
5. **Check `matched_technologies`** - This shows which of your search terms matched (helps validate fit)
6. **Monitor credits carefully with Jobs API** - Each job returned costs 3 credits (not each search)
7. **Combine signals** - Jobs API (hiring) + Enrichment API (team size) = powerful targeting
8. **Use `people_data_url`** - Visit these URLs to find specific contacts (names, titles, LinkedIn profiles)
9. **Natural language queries** - For complex searches, use `query` instead of filters
10. **Pagination** - Use `offset` to paginate through large result sets (max 100 per request)

