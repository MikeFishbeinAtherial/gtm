# Parallel API Integration Guide

Complete guide to using Parallel APIs in your offer testing system.

## Overview

Parallel provides three main APIs that work together for web intelligence and data enrichment:

| API | Speed | Best For | When to Use |
|-----|-------|----------|-------------|
| **Search** | 1-2s | Real-time web search | Finding companies matching signals |
| **Extract** | 1-3s/URL | Content from specific URLs | Scraping pages for personalization |
| **Task** | 30-60s | Deep research with citations | Comprehensive analysis for outreach |
| **FindAll** | 15-30s | People discovery | Finding decision makers at companies |

---

## Installation & Setup

### 1. Install the SDK

```bash
npm install parallel-web
```

### 2. Add API Key to Environment

Add to `.env.local`:

```bash
PARALLEL_API_KEY=your_api_key_here
```

Get your API key from: https://parallel.ai/dashboard

### 3. Test the Integration

```bash
npm run test-parallel
```

This will test all four APIs and show you real examples.

---

## API Usage Guide

### Search API - Fast Company Discovery

**Use this for:** Finding companies that match your ICP signals in real-time.

**Example Use Cases:**
- Find B2B SaaS companies hiring sales people
- Discover companies using specific tech stacks
- Identify companies with certain job postings

**Code Example:**

```typescript
import { parallel } from '@/lib/clients/parallel'

// Find companies hiring SDRs
const results = await parallel.search(
  'Find B2B SaaS companies currently hiring SDRs or AEs',
  ['site:linkedin.com/jobs SDR OR AE'],
  10 // max results
)

// Process results
for (const result of results.results) {
  console.log({
    title: result.title,
    url: result.url,
    excerpt: result.excerpts?.[0] // Relevant content snippet
  })
}
```

**Response Structure:**

```typescript
{
  search_id: "search_abc123...",
  results: [
    {
      url: "https://...",
      title: "Page title",
      excerpts: ["Relevant content snippet..."],
      publish_date: "2024-12-20"
    }
  ],
  usage: [
    { name: "search_query", count: 1 }
  ]
}
```

**Tips:**
- Use `mode: 'agentic'` for token-efficient results (already set in our wrapper)
- Combine `objective` (natural language) with `search_queries` (keywords) for best results
- Set `max_chars_per_result` in excerpts to control output length

---

### Extract API - Pull Content from URLs

**Use this for:** Getting full content from specific pages for personalization.

**Example Use Cases:**
- Extract company "About" pages
- Get full job posting details
- Scrape specific pages for research

**Code Example:**

```typescript
import { parallel } from '@/lib/clients/parallel'

// Extract content from company pages
const results = await parallel.extract(
  [
    'https://acme.com/about',
    'https://acme.com/careers'
  ],
  'What does this company do and are they hiring?' // Optional objective
)

// Process results
for (const result of results.results) {
  console.log({
    url: result.url,
    title: result.title,
    fullContent: result.full_content, // Complete page content
    excerpts: result.excerpts // Relevant to objective
  })
}
```

**Response Structure:**

```typescript
{
  extract_id: "extract_xyz789...",
  results: [
    {
      url: "https://...",
      title: "Page title",
      full_content: "Complete markdown content...",
      excerpts: ["Relevant excerpts..."], // Only if objective provided
      publish_date: "2024-12-20"
    }
  ],
  errors: [] // Any URLs that failed
}
```

**Tips:**
- Use `objective` to get focused excerpts instead of full content
- Content is returned as clean markdown (great for LLM processing)
- Handle `errors` array for failed URLs

---

### Task API - Deep Research

**Use this for:** Comprehensive, multi-step research that synthesizes information.

**Example Use Cases:**
- Detailed company analysis for personalized outreach
- Research specific use cases or problems
- Generate insight-based value propositions

**Code Example:**

```typescript
import { parallel } from '@/lib/clients/parallel'

// Start deep research task
const task = await parallel.deepResearch(`
  Research Acme Corp (acme.com) and provide:
  
  1. Current sales tech stack
  2. Recent hiring activity for sales roles
  3. Pain points related to sales training
  4. Key decision makers in sales enablement
  
  Provide specific, actionable insights.
`)

console.log(`Task created: ${task.id}`)

// Poll for completion (typically 30-60 seconds)
let result = null
let attempts = 0
const maxAttempts = 30

while (attempts < maxAttempts) {
  await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2s
  
  const status = await parallel.checkTaskStatus(task.id)
  
  if (status.status === 'completed') {
    result = status.result
    break
  }
  
  attempts++
}

if (result) {
  // Access research results
  console.log(result.output.text) // Main research findings
  
  // Access citations
  for (const citation of result.citations) {
    console.log(`Source: ${citation.url}`)
  }
}
```

**Response Structure:**

```typescript
{
  id: "task_123...",
  status: "completed",
  output: {
    type: "text",
    text: "Detailed research findings with analysis..."
  },
  citations: [
    {
      url: "https://source1.com",
      title: "Source title",
      publish_date: "2024-12-20"
    }
  ]
}
```

**Tips:**
- Be specific in your instructions for better results
- Tasks run asynchronously - save the `task.id` for polling
- Results include citations for fact-checking
- Use for high-value prospects where deep research is worth the time

---

### FindAll API - Discover People

**Use this for:** Finding decision makers and contacts at target companies.

**Example Use Cases:**
- Find VP of Sales at target companies
- Discover sales enablement leaders
- Build contact lists for outreach

**Code Example:**

```typescript
import { parallel } from '@/lib/clients/parallel'

// Find decision makers at a company
const findall = await parallel.findPeople(
  'acme.com', // Company domain
  'VP of Sales, Director of Sales Enablement, or Head of Sales' // Criteria
)

console.log(`FindAll run created: ${findall.id}`)

// Poll for results (typically 15-30 seconds)
let result = null
let attempts = 0

while (attempts < 15) {
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  try {
    result = await parallel.getFindAllResult(findall.id)
    break
  } catch (error) {
    // Not ready yet, continue polling
    attempts++
  }
}

if (result) {
  // Process people found
  for (const person of result.output.items) {
    console.log({
      name: person.name,
      title: person.title,
      company: person.company,
      linkedinUrl: person.linkedin_url,
      email: person.email // If available
    })
  }
}
```

**Response Structure:**

```typescript
{
  id: "findall_abc123...",
  status: "completed",
  output: {
    items: [
      {
        name: "Jane Smith",
        title: "VP of Sales",
        company: "Acme Corp",
        linkedin_url: "https://linkedin.com/in/...",
        email: "jane@acme.com" // If available
      }
    ]
  }
}
```

**Tips:**
- Be specific about titles and roles for better matching
- Results may include LinkedIn URLs and sometimes emails
- Use for targeted outreach to specific decision makers
- Combine with Leadmagic for email finding/verification

---

## Integration with Your System

### Company Discovery Flow

```typescript
// 1. Find companies matching signals
const companies = await parallel.search(
  'B2B SaaS companies hiring sales development reps',
  ['site:linkedin.com/jobs SDR'],
  50
)

// 2. Extract details from company pages
for (const company of companies.results) {
  const details = await parallel.extract(
    [company.url],
    'What does this company do? What are their main products?'
  )
  
  // Store in Supabase...
}

// 3. Find contacts at each company
for (const company of targetCompanies) {
  const contacts = await parallel.findPeople(
    company.domain,
    'VP of Sales or Head of Sales Enablement'
  )
  
  // Store contacts in Supabase...
}

// 4. Deep research for personalization
for (const contact of readyForOutreach) {
  const research = await parallel.deepResearch(`
    Research ${contact.company_name} and create a personalized 
    value proposition for ${contact.title} about [your offer].
    Focus on their specific pain points and how we can help.
  `)
  
  // Use research for personalized copy...
}
```

### Cost Optimization

**Search API:**
- ✅ Use for initial filtering (fast & cheap)
- ✅ Set appropriate `max_results` (don't over-fetch)
- ❌ Don't use for detailed analysis (use Task API)

**Extract API:**
- ✅ Use when you need specific page content
- ✅ Batch multiple URLs in single call
- ❌ Don't extract pages you won't use

**Task API:**
- ✅ Use for high-value prospects only
- ✅ Be specific to reduce research scope
- ❌ Don't use for simple lookups (use Search instead)

**FindAll API:**
- ✅ Use after company selection (not on raw leads)
- ✅ Be specific about titles to reduce results
- ❌ Don't use for broad searches

---

## Error Handling

```typescript
try {
  const results = await parallel.search('query', ['keywords'], 10)
} catch (error) {
  if (error instanceof Parallel.AuthenticationError) {
    // API key invalid
    console.error('Check PARALLEL_API_KEY in .env.local')
  } else if (error instanceof Parallel.RateLimitError) {
    // Too many requests
    console.error('Rate limit exceeded, wait before retrying')
  } else if (error instanceof Parallel.BadRequestError) {
    // Invalid parameters
    console.error('Invalid request parameters:', error.message)
  } else {
    // Other errors
    console.error('API error:', error.message)
  }
}
```

---

## Rate Limits & Pricing

Check your usage at: https://parallel.ai/dashboard

**Rate Limits:**
- Search: High volume (thousands per hour)
- Extract: Medium volume (hundreds per hour)
- Task: Lower volume (tens per hour)
- FindAll: Medium volume (hundreds per hour)

**Cost Estimates** (check current pricing):
- Search: $0.001-0.01 per query
- Extract: $0.01-0.05 per URL
- Task: $0.10-0.50 per research task
- FindAll: $0.05-0.20 per company

💡 **Tip:** Use Search for broad filtering, then Task/FindAll for qualified prospects.

---

## Testing

Run the comprehensive test suite:

```bash
npm run test-parallel
```

This will test:
1. ✅ API connection
2. ✅ Search API
3. ✅ Extract API
4. ✅ Task API (with polling)
5. ✅ FindAll API (with polling)

---

## Resources

- **Official Docs:** https://docs.parallel.ai/
- **Dashboard:** https://parallel.ai/dashboard
- **TypeScript SDK:** https://www.npmjs.com/package/parallel-web
- **API Status:** https://status.parallel.ai/

---

## Quick Reference

```typescript
import { parallel } from '@/lib/clients/parallel'

// Search web
await parallel.search(objective, searchQueries, maxResults)

// Extract URLs
await parallel.extract(urls, objective)

// Deep research
const task = await parallel.deepResearch(instructions)
const result = await parallel.getTaskResult(task.id)

// Find people
const findall = await parallel.findPeople(domain, criteria)
const result = await parallel.getFindAllResult(findall.id)

// Test connection
await parallel.testConnection()

// Access raw SDK
parallel.sdk
```

