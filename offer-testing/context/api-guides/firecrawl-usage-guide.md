# When and How to Use Firecrawl

## Overview

Firecrawl is an **AI-powered web scraping and data extraction platform** that turns any website into LLM-ready data. Unlike traditional web scrapers that require custom code for each site, Firecrawl provides multiple endpoints that handle everything from single-page scraping to full website crawling to autonomous research.

**Think of Firecrawl as your web data extraction toolkit - it handles the hard stuff (proxies, anti-bot mechanisms, dynamic content, JavaScript rendering) so you can focus on using the data.**

## Firecrawl's Core Features

| Feature | Purpose | Best For |
|---------|---------|----------|
| **Scrape** | Extract content from a single URL | Getting data from one page (pricing, about page, etc.) |
| **Crawl** | Scrape entire websites automatically | Getting all pages from a site (documentation, blog, etc.) |
| **Map** | Get all URLs from a website instantly | Discovering site structure before crawling |
| **Search** | Search the web and scrape results | Finding content across the internet |
| **Extract** | Structured data extraction with AI | Multi-page or site-wide data extraction |
| **Agent** | Autonomous research and extraction | "Find X and extract Y" without knowing where it is |
| **Actions** | Interact with pages before scraping | Filling forms, clicking buttons, logging in |

### For Your Use Cases

**In this guide, we'll focus on the features most relevant to outbound outreach:**
- **Agent** - Autonomous research (competitive analysis, pre-outreach research)
- **Scrape + Actions** - Extracting from specific pages with interaction
- **Extract** - Multi-site structured extraction (comparing competitors)

**Less relevant for now:**
- Crawl/Map - More for documentation sites or content aggregation
- Search - When you don't know which sites have the data

## The Magic of /agent

The `/agent` endpoint is Firecrawl's most powerful feature for research:

- **No URLs Required**: Just describe what data you want via the `prompt` parameter
- **Deep Navigation**: Autonomously searches and navigates through multiple pages to find data
- **Structured Output**: Returns data in a JSON schema you define
- **Fast & Parallel**: Processes multiple sources simultaneously
- **Reliable**: Works with complex websites that traditional scrapers struggle with

**Core Concept:** You describe what you want in plain English, optionally provide a schema for structured output, and Firecrawl handles the rest.

## When to Use Firecrawl vs Other Tools

### ✅ Use Firecrawl For:

1. **Extracting structured data from websites**
   - "Find the pricing plans for Slack, Microsoft Teams, and Zoom"
   - "Extract contact information from this company's about page"
   - "Get the list of features from these 5 competitor products"

2. **Competitive research and analysis**
   - "Compare pricing between [competitor A] and [competitor B]"
   - "Find the team members and their roles at [company]"
   - "Extract case studies and customer testimonials from [company website]"

3. **Data gathering without specific URLs (Agent)**
   - "Find the top 5 AI startups and their funding amounts"
   - "Get contact information for YC companies in the latest batch"
   - "Find blog posts about [topic] published in the last month"

4. **Information in hard-to-reach places**
   - Data behind navigation (pricing pages, team pages)
   - Information requiring multiple page visits
   - Dynamic content that loads via JavaScript
   - Sites where traditional scraping would be brittle
   - Content behind tabs, modals, or interactive elements

5. **Personalization research for outreach**
   - "Find recent blog posts from [company] about [topic]"
   - "Extract the founders' backgrounds from [company website]"
   - "Get the company's recent product updates and announcements"

6. **Single-page extraction with interactions (Scrape + Actions)**
   - Click on pricing tabs to reveal different plans
   - Fill out forms to access gated content
   - Navigate through image carousels or galleries
   - Take screenshots of specific page states

### ❌ Don't Use Firecrawl For:

1. **Company/people databases** → Use Exa, Parallel, or Sumble
   - Finding companies matching ICP criteria
   - Searching for decision-makers by role
   - Getting firmographic data (employee count, revenue)
   - These tools have structured databases optimized for this

2. **Email finding and verification** → Use Leadmagic
   - Finding personal work emails
   - Verifying email deliverability
   - Bulk email lookups

3. **Job posting signals** → Use TheirStack
   - Who's hiring for specific roles
   - Job posting data and trends
   - Hiring velocity signals

4. **Simple single-page data extraction**
   - If you just need to scrape one known URL repeatedly
   - Traditional scraping or API calls would be more cost-effective

5. **Real-time monitoring**
   - Firecrawl is for one-time or periodic extraction, not real-time monitoring
   - Jobs can take several minutes to complete

**The Pattern:** Firecrawl excels at **extracting specific data** from websites, especially when you don't know exactly where the data lives. Other tools excel at **searching databases** (Exa, Parallel) and **structured enrichment** (Leadmagic, TheirStack).

## How Firecrawl Works

### Which Feature to Use?

**For your outreach workflow, focus on:**

1. **Scrape** - When you know the exact URL and want to extract data
   - Single competitor pricing page
   - Specific company about page
   - Known blog post URL
   - Use with **Actions** when you need to interact with the page first

2. **Agent** - When you don't know where the data is or need autonomous research
   - "Find the founders of [company]" (don't know which page)
   - "Compare pricing across [list of competitors]" (don't know exact URLs)
   - Multi-source research tasks

3. **Crawl** - When you need content from an entire site
   - Less relevant for outreach
   - Better for documentation aggregation or content libraries

### Scrape: Single-Page Extraction

**Use when:** You know the exact URL and want to extract its content.

```typescript
import { firecrawlScrape } from '@/lib/clients'
import { z } from 'zod'

// Basic scrape (get markdown and HTML)
const doc = await firecrawlScrape('https://acme.com/pricing', {
  formats: ['markdown', 'html']
})

console.log(doc.markdown) // Clean markdown version
console.log(doc.html) // Raw HTML

// Scrape with JSON extraction (structured data)
const pricing = await firecrawlScrape('https://acme.com/pricing', {
  formats: [{
    type: 'json',
    schema: z.object({
      plans: z.array(z.object({
        name: z.string(),
        price: z.string(),
        features: z.array(z.string())
      }))
    })
  }]
})

console.log(pricing.json) // Structured pricing data
```

**When to use Scrape:**
- ✅ You have the exact URL
- ✅ Single page has all the data you need
- ✅ No complex navigation required
- ✅ You want to extract with a schema OR get markdown/HTML

### Scrape + Actions: Interactive Extraction

**Use when:** The data you want requires interaction (clicking, typing, waiting).

Actions let you control the page before scraping - perfect for dynamic content.

```typescript
import { firecrawlScrape, FirecrawlActions } from '@/lib/clients'

// Click on pricing tabs to reveal all plans
const allPlans = await firecrawlScrape('https://acme.com/pricing', {
  formats: [{
    type: 'json',
    prompt: 'Extract all pricing plans with names, prices, and features'
  }],
  actions: [
    FirecrawlActions.wait(1000), // Wait for page to load
    FirecrawlActions.click('#enterprise-tab'), // Click enterprise tab
    FirecrawlActions.wait(500), // Wait for content
    FirecrawlActions.click('#teams-tab'), // Click teams tab
    FirecrawlActions.wait(500)
  ]
})

// Navigate through a multi-step form
const gatedContent = await firecrawlScrape('https://acme.com/resources', {
  formats: ['markdown'],
  actions: [
    FirecrawlActions.write('john@example.com'), // Type email
    FirecrawlActions.press('Tab'), // Move to next field
    FirecrawlActions.write('Acme Corp'), // Type company
    FirecrawlActions.click('button[type="submit"]'), // Submit
    FirecrawlActions.wait(2000), // Wait for content to load
    FirecrawlActions.screenshot(true) // Take full-page screenshot
  ]
})
```

**Common Actions:**
- `FirecrawlActions.wait(ms)` - Wait for content to load
- `FirecrawlActions.click(selector)` - Click buttons, tabs, links
- `FirecrawlActions.write(text)` - Type into input fields
- `FirecrawlActions.press(key)` - Press keyboard keys (Tab, Enter, etc.)
- `FirecrawlActions.scroll('down')` - Scroll to load more content
- `FirecrawlActions.screenshot()` - Capture visual state

**When to use Actions:**
- ✅ Content is behind tabs or accordions
- ✅ Need to fill forms to access data
- ✅ Page uses infinite scroll
- ✅ Data loads dynamically after interaction
- ✅ Want to capture screenshots of specific states

### Agent: Autonomous Research

**Use when:** You don't know exactly where the data is, or need multi-source research.

The Agent autonomously searches the web, navigates to relevant pages, and extracts data.

### Agent: Basic Flow

1. **You provide a prompt**: "Find the founders of Firecrawl"
2. **Optionally provide URLs**: Focus the search on specific sites
3. **Optionally provide a schema**: Define the structure you want
4. **Firecrawl searches & navigates**: Finds relevant pages and extracts data
5. **Returns structured data**: JSON matching your schema

### Agent: Usage Patterns

#### Pattern 1: Wait for Results (Default)

The simplest approach - call `agent()` and it waits for completion:

```typescript
import { firecrawl } from '@/lib/clients'
import { z } from 'zod'

const result = await firecrawl.agent({
  prompt: "Find the founders of Firecrawl",
  schema: z.object({
    founders: z.array(z.object({
      name: z.string().describe("Full name of the founder"),
      role: z.string().describe("Role or position").optional(),
      background: z.string().describe("Professional background").optional()
    })).describe("List of founders")
  })
})

console.log(result.data)
// {
//   founders: [
//     { name: "Eric Ciarla", role: "Co-founder", background: "Previously at Mendable" },
//     { name: "Nicolas Camara", role: "Co-founder", background: "Previously at Mendable" },
//     ...
//   ]
// }
```

#### Pattern 2: Start Job + Poll Status

When you want to start a job and check back later:

```typescript
import { firecrawl } from '@/lib/clients'

// Start the job
const job = await firecrawl.startAgent({
  prompt: "Find pricing information for top 5 CRM tools"
})

console.log(`Job started: ${job.id}`)

// Later... check status
const status = await firecrawl.getAgentStatus(job.id)

if (status.status === 'completed') {
  console.log(status.data)
  console.log(`Credits used: ${status.creditsUsed}`)
} else if (status.status === 'processing') {
  console.log('Still working on it...')
} else if (status.status === 'failed') {
  console.log('Job failed')
}
```

**When to use each:**
- **Wait for results**: Simple queries, you need results immediately
- **Start + poll**: Long-running jobs, batch operations, user-initiated research

### Providing URLs (Optional)

You can optionally provide URLs to focus the agent on specific pages:

```typescript
const result = await firecrawl.agent({
  urls: [
    "https://docs.firecrawl.dev",
    "https://firecrawl.dev/pricing"
  ],
  prompt: "Compare the features and pricing information from these pages"
})
```

**When to provide URLs:**
- You know exactly which sites have the data
- You want to limit search scope (faster, cheaper)
- You're extracting from specific competitor pages

**When to skip URLs:**
- You want Firecrawl to find the data autonomously
- You don't know where the data lives
- You want broader research across multiple sources

## Firecrawl in Your Offer Testing Workflow

### Step 3: Offer Research (Competitive Analysis)

**When:** You're researching competitors to understand positioning and messaging.

**Use Firecrawl for:**
- Extracting competitor pricing and features
- Gathering competitor positioning and messaging
- Finding case studies and customer testimonials
- Researching how competitors describe value

```typescript
import { firecrawl } from '@/lib/clients'
import { z } from 'zod'

// Extract competitor pricing
const pricing = await firecrawl.agent({
  urls: [
    "https://competitor-a.com/pricing",
    "https://competitor-b.com/pricing",
    "https://competitor-c.com/pricing"
  ],
  prompt: "Extract pricing information including plan names, prices, and key features",
  schema: z.object({
    competitors: z.array(z.object({
      company: z.string(),
      plans: z.array(z.object({
        name: z.string(),
        price: z.string(),
        features: z.array(z.string())
      }))
    }))
  })
})

// Use this data to position your offer differently
console.log(pricing.data)
```

**What to extract:**
- Pricing tiers and feature comparisons
- Value propositions and messaging
- Target customers (from case studies)
- Key features and differentiators

### Step 8: Pre-Outreach Research (Personalization)

**When:** Before reaching out, you need company-specific information for personalization.

**Use Firecrawl for:**
- Finding company blog posts about relevant topics
- Extracting team member information
- Getting recent company updates
- Gathering context for "reason for reaching out"

```typescript
import { firecrawl } from '@/lib/clients'
import { z } from 'zod'

// Research company before outreach
const research = await firecrawl.agent({
  urls: [`https://${company.domain}`],
  prompt: `Find recent blog posts, news, or updates about ${company.name} related to sales, hiring, or growth. Also extract information about the founders or leadership team.`,
  schema: z.object({
    recent_updates: z.array(z.object({
      title: z.string(),
      summary: z.string(),
      date: z.string().optional(),
      url: z.string()
    })),
    leadership: z.array(z.object({
      name: z.string(),
      title: z.string(),
      background: z.string().optional()
    }))
  })
})

// Use this for personalized outreach
const recentUpdate = research.data.recent_updates[0]
// "I saw you recently published [title] - I had some thoughts on [topic]..."
```

**When to use:**
- **Use Case-Driven Outreach**: Deep research to find specific implementation details
- **Permissionless Value**: Find information asymmetries or insights to share
- **Warm-up research**: Find common ground or conversation starters

**Don't overdo it:**
- ❌ Research every company extensively (too slow, expensive)
- ✅ Research top-priority leads or high-value targets
- ✅ Use for second/third touches when personalizing follow-ups

### Step 10: Permissionless Value Creation

**When:** Creating PVP content, you need specific examples and data points.

**Use Firecrawl for:**
- Finding examples of the problem your ICP faces
- Extracting case studies and real-world data
- Gathering insights from multiple sources
- Building information asymmetries

```typescript
import { firecrawl } from '@/lib/clients'
import { z } from 'zod'

// Research examples of the problem
const examples = await firecrawl.agent({
  prompt: `Find examples of companies in ${icp.industry} facing challenges with ${icp.problem}. Look for blog posts, case studies, or news articles that describe specific instances of this problem.`,
  schema: z.object({
    examples: z.array(z.object({
      company: z.string(),
      problem_description: z.string(),
      impact: z.string().describe("Quantified impact if available"),
      source_url: z.string()
    }))
  })
})

// Use these examples to create PVP
// "I noticed companies like [X] and [Y] are struggling with [problem]"
// "Here's a framework I created to solve [problem]..."
```

**PVP Use Cases:**
- Quantify the problem with real examples
- Find information asymmetries (data they don't have)
- Gather competitive insights to share
- Build frameworks based on research

### Step 3.5: ICP Validation Research

**When:** You've defined an ICP, now validate it by researching actual companies.

**Use Firecrawl for:**
- Extracting data from target company websites
- Validating that companies match your assumptions
- Gathering evidence of the problem you solve
- Finding signals that indicate fit

```typescript
import { firecrawl } from '@/lib/clients'
import { z } from 'zod'

// Validate ICP assumptions
const validation = await firecrawl.agent({
  urls: targetCompanyUrls, // From Exa or TheirStack
  prompt: `For each company, determine: 1) Do they have the problem we solve? 2) Are they the size we target? 3) Do they show signs of growth? Extract any evidence of these criteria.`,
  schema: z.object({
    companies: z.array(z.object({
      name: z.string(),
      has_problem: z.boolean().describe("Shows evidence of having the problem"),
      problem_evidence: z.string().optional(),
      size_match: z.boolean().describe("Matches our size criteria"),
      growth_signals: z.array(z.string()).describe("Signs of growth or hiring")
    }))
  })
})

// Refine ICP based on findings
```

### Integration with Other APIs

Firecrawl works best when combined with other tools:

#### Pattern: Exa → Firecrawl → Leadmagic → Unipile

Complete research and outreach workflow:

```typescript
// 1. Find target companies (Exa)
const companies = await exaFindCompanies({
  industry: icp.industry,
  size: icp.company_size,
  signals: icp.key_signals
})

// 2. Research each company (Firecrawl)
for (const company of companies.results.slice(0, 10)) {
  const research = await firecrawl.agent({
    urls: [company.url],
    prompt: "Extract recent blog posts, team members, and company updates",
    schema: researchSchema
  })
  
  // 3. Find contact emails (Leadmagic)
  const contacts = await leadmagicFindEmails({
    company: company.title,
    titles: icp.target_titles
  })
  
  // 4. Generate personalized copy using research
  const copy = await generateCopy({
    contact: contacts[0],
    research: research.data,
    offer: offer
  })
  
  // 5. Send via Unipile
  await unipileSendMessage({
    contact: contacts[0],
    message: copy.email_body
  })
}
```

#### Pattern: TheirStack → Firecrawl → Manual Review

Signal-based targeting with deep research:

```typescript
// 1. Find companies with hiring signals (TheirStack)
const hiringCompanies = await theirstackFindCompanies({
  job_titles: ['SDR', 'BDR', 'Account Executive'],
  posted_within_days: 30
})

// 2. Research each company (Firecrawl)
for (const company of hiringCompanies) {
  const teamInfo = await firecrawl.agent({
    urls: [company.website],
    prompt: "Find the VP of Sales or Head of Sales at this company. Extract their name, background, and how long they've been in the role.",
    schema: salesLeaderSchema
  })
  
  // 3. Save to database for manual review
  await saveToDatabase({
    company,
    research: teamInfo.data,
    signal: 'hiring_sales_team',
    ready_for_outreach: true
  })
}

// 4. User reviews and approves outreach in UI
```

## Defining Schemas for Structured Output

Schemas ensure you get back clean, structured data. Use Zod for type safety:

### Basic Schema Patterns

```typescript
import { z } from 'zod'

// Single entity
const companySchema = z.object({
  name: z.string().describe("Company name"),
  description: z.string().describe("What the company does"),
  employee_count: z.string().optional().describe("Number of employees"),
  location: z.string().optional().describe("Headquarters location")
})

// Array of entities
const foundersSchema = z.object({
  founders: z.array(z.object({
    name: z.string().describe("Full name"),
    role: z.string().optional().describe("Role or title"),
    background: z.string().optional().describe("Previous experience")
  })).describe("List of company founders")
})

// Nested structure
const competitorSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    pricing: z.object({
      plans: z.array(z.object({
        name: z.string(),
        price: z.string(),
        features: z.array(z.string())
      }))
    }),
    key_features: z.array(z.string()),
    target_customer: z.string().optional()
  }))
})
```

### Schema Best Practices

1. **Use `.describe()` for clarity**
   - Helps Firecrawl understand what to extract
   - Makes your intent explicit

```typescript
// ❌ Vague
z.string()

// ✅ Clear
z.string().describe("Full name including first and last name")
```

2. **Make fields optional when uncertain**
   - Not all websites have all data
   - Optional fields prevent extraction failures

```typescript
z.object({
  name: z.string(),                    // Required - always present
  email: z.string().optional(),        // Optional - might not be public
  linkedin: z.string().optional()      // Optional - might not exist
})
```

3. **Use arrays for lists**
   - Firecrawl can extract multiple items
   - Better than asking for "top 3" or specific count

```typescript
// ✅ Good - gets all available
z.array(z.object({ name: z.string(), role: z.string() }))

// ❌ Less flexible - limited to specific count
z.object({ founder1: z.string(), founder2: z.string() })
```

4. **Keep schemas focused**
   - One schema per type of extraction
   - Don't try to extract everything at once

```typescript
// ❌ Too broad - mixing concerns
const everythingSchema = z.object({
  company_info: z.object({...}),
  pricing: z.object({...}),
  team_members: z.array({...}),
  blog_posts: z.array({...}),
  case_studies: z.array({...})
})

// ✅ Focused - separate extractions
const companySchema = z.object({ name: z.string(), ... })
const pricingSchema = z.object({ plans: z.array({...}) })
const teamSchema = z.object({ members: z.array({...}) })
```

## Writing Effective Prompts

The quality of your results depends heavily on your prompt. Here are patterns that work:

### Good Prompt Patterns

**Be specific about what you want:**

✅ **Good:**
- "Find the founders of Firecrawl including their names, roles, and professional backgrounds"
- "Extract pricing plans with plan names, monthly prices, and key features for each plan"
- "Get the list of team members on the About page with their names, titles, and brief descriptions"

❌ **Too vague:**
- "Find information about Firecrawl"
- "Get pricing"
- "Find team members"

**Specify where to look (if relevant):**

✅ **Good:**
- "From the pricing page, extract..."
- "Look for recent blog posts published in the last 3 months about..."
- "On the About page or Team page, find..."

❌ **Missing context:**
- "Find blog posts" (which topics? how recent?)
- "Get team information" (which team members? what info?)

**Define the structure implicitly in the prompt:**

✅ **Good:**
- "For each competitor, get their company name, pricing tiers, and key differentiators"
- "Extract blog post titles, summaries, publication dates, and URLs"

**Include qualifiers when needed:**

✅ **Good:**
- "Find founders or co-founders (not just advisors or investors)"
- "Extract pricing for paid plans only (exclude free tier)"
- "Get only full-time team members listed on the About page"

### Prompt Templates for Common Tasks

#### Competitive Pricing Research
```typescript
const prompt = `Extract pricing information from ${competitors.join(', ')}.

For each company, find:
- Company name
- All pricing plan names
- Price for each plan (including currency and billing period)
- Key features included in each plan
- Any free trial or free plan details

Focus on publicly available pricing pages. Skip any enterprise/custom pricing tiers that don't show prices.`
```

#### Team/Founder Research
```typescript
const prompt = `Find information about the ${role} at ${companyName}.

Extract:
- Full name
- Current role/title
- How long they've been in this role (if mentioned)
- Previous companies or roles (if mentioned)
- Educational background (if mentioned)
- LinkedIn profile URL (if available)

Look on the About page, Team page, or executive profiles.`
```

#### Blog Post/Content Research
```typescript
const prompt = `Find recent blog posts or articles from ${companyName} about ${topic}.

For each post, extract:
- Article title
- Brief summary (2-3 sentences)
- Publication date
- Author name (if available)
- URL to the article

Focus on content published in the last ${days} days.`
```

#### Feature Comparison
```typescript
const prompt = `Compare the features of ${products.join(', ')}.

For each product, extract:
- Product name
- Key features (list of feature names)
- Feature descriptions (what each feature does)
- Feature categories (if organized by category)

Focus on features pages or documentation.`
```

## Cost Management

Firecrawl uses **dynamic credit-based pricing**. Costs scale with complexity:

- **Simple extractions** (single page, basic data) = fewer credits
- **Complex research** (multiple domains, deep navigation) = more credits

### Free Tier
- **5 free daily runs** for all users
- Perfect for testing and exploring

### Understanding Credits

**Factors that increase credit usage:**
1. Number of pages Firecrawl needs to visit
2. Complexity of navigation required
3. Amount of data to process
4. Schema complexity (more fields = more extraction work)

**Example costs:**
- Extract founders from one company page: ~5-15 credits
- Compare pricing across 3 competitors: ~20-40 credits
- Deep research across multiple sources: ~50-100+ credits

### Cost Optimization Tips

1. **Provide URLs when you know them**
   - Faster extraction
   - Fewer credits (less searching)
   - More focused results

```typescript
// ❌ More expensive - has to search
await firecrawl.agent({
  prompt: "Find Firecrawl's pricing"
})

// ✅ Cheaper - direct to pricing page
await firecrawl.agent({
  urls: ["https://firecrawl.dev/pricing"],
  prompt: "Extract pricing information"
})
```

2. **Set maxCredits limits**
   - Prevents runaway costs
   - Job stops if it would exceed limit
   - Good for batch operations

```typescript
await firecrawl.agent({
  prompt: "Research top 10 competitors",
  maxCredits: 100  // Stop if it would cost more than 100 credits
})
```

3. **Batch similar extractions**
   - Extract from multiple competitors in one call
   - Processes in parallel
   - More efficient than separate calls

```typescript
// ✅ Efficient - one job for all competitors
await firecrawl.agent({
  urls: competitorUrls,
  prompt: "For each company, extract pricing and features"
})

// ❌ Less efficient - separate job per competitor
for (const url of competitorUrls) {
  await firecrawl.agent({ urls: [url], prompt: "Extract pricing" })
}
```

4. **Use focused prompts**
   - Request only data you need
   - Simpler schemas use fewer credits
   - Don't ask for "everything"

5. **Start with free daily runs**
   - Test prompts and schemas
   - Validate approach before scaling
   - Understand credit usage for your use cases

### Monitoring Usage

```typescript
const result = await firecrawl.agent({
  prompt: "Extract company information",
  urls: [companyUrl]
})

// Check credits used
console.log(`Credits used: ${result.creditsUsed}`)

// Track in your database
await supabase.from('firecrawl_usage').insert({
  prompt: "Extract company information",
  credits_used: result.creditsUsed,
  company_url: companyUrl,
  timestamp: new Date().toISOString()
})
```

## Error Handling and Edge Cases

### Job States

| Status | Description | What to do |
|--------|-------------|------------|
| `processing` | Agent is still working | Wait and poll again |
| `completed` | Extraction finished successfully | Use the data! |
| `failed` | An error occurred | Check error message, revise prompt |

### Common Issues and Solutions

#### "Job failed with no results"

**Possible causes:**
1. Data doesn't exist on the specified pages
2. Prompt was too specific or unclear
3. Schema doesn't match available data
4. Website blocks automated access

**Solutions:**
- Verify data exists manually (visit URLs)
- Simplify prompt - be less specific
- Make more schema fields optional
- Try different URLs or remove URL filters

#### "Results are incomplete"

**Possible causes:**
1. Data is behind login/paywall
2. Schema too complex for available data
3. Prompt didn't specify all requirements
4. Hit credit limit mid-extraction

**Solutions:**
- Use publicly accessible URLs only
- Simplify schema - start with required fields only
- Be more explicit in prompt
- Increase maxCredits if needed

#### "Job times out or takes very long"

**Possible causes:**
1. Prompt requires too much navigation
2. Looking for data that doesn't exist
3. Too many URLs to process

**Solutions:**
- Provide specific URLs to reduce searching
- Break into smaller jobs
- Set reasonable maxCredits limit
- Use start + poll pattern instead of waiting

#### "Data format is unexpected"

**Possible causes:**
1. Schema doesn't match data structure on page
2. Multiple data formats across different pages
3. Prompt ambiguous about format

**Solutions:**
- Review pages manually first
- Adjust schema to match actual structure
- Be more specific in prompt about format
- Make schema more flexible (more optional fields)

### Best Practices for Reliability

1. **Test with free runs first**
   - Validate prompt and schema
   - Check credit usage
   - Iterate before scaling

2. **Handle failures gracefully**
```typescript
try {
  const result = await firecrawl.agent({ prompt, urls, schema })
  
  if (result.status === 'completed') {
    // Success - use data
    return result.data
  } else if (result.status === 'failed') {
    // Log failure and fallback
    console.error('Firecrawl job failed')
    return null
  }
} catch (error) {
  // API error - retry or fallback
  console.error('Firecrawl API error:', error)
  return null
}
```

3. **Use start + poll for batch operations**
```typescript
// Start all jobs
const jobIds = await Promise.all(
  companies.map(c => firecrawl.startAgent({
    urls: [c.website],
    prompt: researchPrompt
  }))
)

// Poll periodically
for (const job of jobIds) {
  let status = await firecrawl.getAgentStatus(job.id)
  
  while (status.status === 'processing') {
    await sleep(5000) // Wait 5 seconds
    status = await firecrawl.getAgentStatus(job.id)
  }
  
  if (status.status === 'completed') {
    // Process results
  }
}
```

4. **Validate extracted data**
```typescript
const result = await firecrawl.agent({ prompt, schema })

// Check data quality
if (!result.data || !result.data.founders?.length) {
  console.warn('No founders found - data may be incomplete')
}

// Validate format
for (const founder of result.data.founders) {
  if (!founder.name) {
    console.warn('Founder missing name field')
  }
}
```

## Example Use Cases with Code

### Use Case 1: Competitive Pricing Research

**Goal:** Extract and compare pricing across 3 competitors.

```typescript
import { firecrawl } from '@/lib/clients'
import { z } from 'zod'

const competitorUrls = [
  "https://competitor-a.com/pricing",
  "https://competitor-b.com/pricing",
  "https://competitor-c.com/pricing"
]

const pricingSchema = z.object({
  competitors: z.array(z.object({
    company_name: z.string().describe("Company name"),
    plans: z.array(z.object({
      plan_name: z.string().describe("Name of pricing plan (e.g., Starter, Pro, Enterprise)"),
      price: z.string().describe("Price with currency and period (e.g., $99/month)"),
      key_features: z.array(z.string()).describe("List of main features included")
    })).describe("All pricing plans for this company"),
    free_trial: z.string().optional().describe("Free trial details if available")
  })).describe("Pricing information for each competitor")
})

const result = await firecrawl.agent({
  urls: competitorUrls,
  prompt: `Extract detailed pricing information from each company.
  
  For each competitor, get:
  - Company name
  - All pricing plans (exclude enterprise/custom pricing if no price shown)
  - Price for each plan including currency and billing period
  - Key features for each plan
  - Free trial information if available`,
  schema: pricingSchema
})

// Use results for positioning
console.log(`Analyzed ${result.data.competitors.length} competitors`)
result.data.competitors.forEach(comp => {
  console.log(`\n${comp.company_name}:`)
  comp.plans.forEach(plan => {
    console.log(`  ${plan.plan_name}: ${plan.price}`)
    console.log(`  Features: ${plan.key_features.join(', ')}`)
  })
})

console.log(`\nCredits used: ${result.creditsUsed}`)
```

### Use Case 2: Pre-Outreach Company Research

**Goal:** Research a target company before reaching out.

```typescript
import { firecrawl } from '@/lib/clients'
import { z } from 'zod'

async function researchCompany(companyDomain: string, topic: string) {
  const researchSchema = z.object({
    recent_content: z.array(z.object({
      title: z.string(),
      summary: z.string().describe("2-3 sentence summary"),
      date: z.string().optional(),
      url: z.string(),
      relevance: z.string().describe("Why this is relevant to the topic")
    })).describe("Recent blog posts or news related to the topic"),
    
    key_people: z.array(z.object({
      name: z.string(),
      title: z.string(),
      background: z.string().optional().describe("Brief background or notable experience")
    })).describe("Leadership team members"),
    
    company_updates: z.array(z.string()).describe("Recent company news like funding, hiring, product launches")
  })

  const result = await firecrawl.agent({
    urls: [`https://${companyDomain}`],
    prompt: `Research ${companyDomain} focusing on:
    
    1. Recent blog posts, articles, or news about ${topic} (last 6 months)
    2. Leadership team members (especially VP Sales, Head of Sales, CRO)
    3. Recent company updates: funding rounds, hiring announcements, product launches
    
    Focus on information useful for personalized outreach.`,
    schema: researchSchema,
    maxCredits: 50
  })

  return result.data
}

// Use in outreach workflow
const research = await researchCompany('acme-corp.com', 'sales team hiring')

if (research.recent_content.length > 0) {
  const latestPost = research.recent_content[0]
  console.log(`\nPersonalization angle:`)
  console.log(`"I read your recent post '${latestPost.title}' and had some thoughts on ${latestPost.relevance}..."`)
}

if (research.company_updates.length > 0) {
  console.log(`\nContext for outreach:`)
  research.company_updates.forEach(update => console.log(`- ${update}`))
}
```

### Use Case 3: Permissionless Value - Industry Examples

**Goal:** Find real examples of the problem your ICP faces for PVP content.

```typescript
import { firecrawl } from '@/lib/clients'
import { z } from 'zod'

async function findProblemExamples(industry: string, problem: string) {
  const examplesSchema = z.object({
    examples: z.array(z.object({
      company_name: z.string().describe("Company experiencing the problem"),
      problem_description: z.string().describe("Specific description of how they experienced the problem"),
      impact: z.string().describe("Business impact or consequences mentioned"),
      context: z.string().describe("Additional context about the situation"),
      source_url: z.string()
    })).describe("Real-world examples of companies facing this problem")
  })

  const result = await firecrawl.agent({
    prompt: `Find real-world examples of companies in the ${industry} industry facing challenges with ${problem}.
    
    Look for:
    - Blog posts where companies describe struggling with this problem
    - Case studies that mention this as a pain point before a solution
    - News articles or interviews discussing this challenge
    - Company posts about hiring or changes made because of this problem
    
    For each example, extract:
    - Which company experienced it
    - Specific details about the problem
    - Business impact (lost revenue, wasted time, missed opportunities, etc.)
    - Any context about why it was a problem for them
    
    Focus on examples from the last 2 years.`,
    schema: examplesSchema,
    maxCredits: 75
  })

  return result.data.examples
}

// Use for PVP creation
const examples = await findProblemExamples(
  'B2B SaaS',
  'sales rep training and practice before real calls'
)

console.log(`Found ${examples.length} real-world examples:\n`)

examples.forEach((ex, i) => {
  console.log(`${i + 1}. ${ex.company_name}`)
  console.log(`   Problem: ${ex.problem_description}`)
  console.log(`   Impact: ${ex.impact}`)
  console.log(`   Source: ${ex.source_url}\n`)
})

// Use these in PVP:
// "I analyzed [X] companies in [industry] and found they all struggled with [problem]"
// "Here's a framework based on how [Company A] and [Company B] solved this..."
```

### Use Case 4: Founder/Team Background Research

**Goal:** Research decision-makers before outreach.

```typescript
import { firecrawl } from '@/lib/clients'
import { z } from 'zod'

async function researchDecisionMaker(
  companyDomain: string,
  targetRole: string
) {
  const personSchema = z.object({
    name: z.string(),
    current_role: z.string(),
    time_in_role: z.string().optional().describe("How long in current role if mentioned"),
    previous_experience: z.array(z.object({
      company: z.string(),
      role: z.string(),
      duration: z.string().optional()
    })).optional().describe("Previous companies and roles"),
    education: z.string().optional(),
    linkedin_url: z.string().optional(),
    notable_achievements: z.array(z.string()).optional().describe("Awards, publications, notable projects")
  })

  const result = await firecrawl.agent({
    urls: [`https://${companyDomain}/about`, `https://${companyDomain}/team`],
    prompt: `Find the ${targetRole} at this company.
    
    Extract comprehensive background:
    - Full name and current role
    - How long they've been in this role
    - Previous companies and positions
    - Educational background
    - LinkedIn profile URL
    - Any notable achievements, awards, or projects mentioned
    
    Look on the About page, Team page, or leadership profiles.`,
    schema: z.object({
      decision_maker: personSchema.optional()
    })
  })

  return result.data.decision_maker
}

// Use in outreach prep
const dm = await researchDecisionMaker('acme-corp.com', 'VP Sales')

if (dm) {
  console.log(`\nResearch on ${dm.name}:`)
  console.log(`Role: ${dm.current_role}`)
  
  if (dm.time_in_role) {
    console.log(`Time in role: ${dm.time_in_role}`)
    // Recently hired = great time to reach out!
  }
  
  if (dm.previous_experience && dm.previous_experience.length > 0) {
    console.log(`\nPrevious experience:`)
    dm.previous_experience.forEach(exp => {
      console.log(`- ${exp.role} at ${exp.company}`)
    })
    // Look for common ground or relevant experience
  }
  
  if (dm.notable_achievements && dm.notable_achievements.length > 0) {
    console.log(`\nNotable achievements:`)
    dm.notable_achievements.forEach(ach => console.log(`- ${ach}`))
    // Reference in outreach for personalization
  }
}
```

### Use Case 5: Feature Comparison for Positioning

**Goal:** Compare product features to find differentiation opportunities.

```typescript
import { firecrawl } from '@/lib/clients'
import { z } from 'zod'

async function compareFeatures(competitorUrls: string[]) {
  const featuresSchema = z.object({
    products: z.array(z.object({
      product_name: z.string(),
      features: z.array(z.object({
        feature_name: z.string(),
        description: z.string(),
        category: z.string().optional().describe("Feature category if available")
      })),
      unique_capabilities: z.array(z.string()).describe("Features that seem unique or emphasized")
    }))
  })

  const result = await firecrawl.agent({
    urls: competitorUrls,
    prompt: `For each product, extract:
    - Product name
    - All features listed (including feature names and descriptions)
    - Feature categories if organized that way
    - Any features that seem unique or heavily emphasized
    
    Look on features pages, product pages, or documentation.`,
    schema: featuresSchema,
    maxCredits: 60
  })

  // Analyze for gaps
  const allFeatures = new Set<string>()
  const featureCount: Record<string, number> = {}

  result.data.products.forEach(product => {
    product.features.forEach(feature => {
      const fname = feature.feature_name.toLowerCase()
      allFeatures.add(fname)
      featureCount[fname] = (featureCount[fname] || 0) + 1
    })
  })

  // Features only 1-2 competitors have = differentiation opportunities
  const opportunities = Object.entries(featureCount)
    .filter(([_, count]) => count <= 2)
    .map(([feature]) => feature)

  return {
    products: result.data.products,
    commonFeatures: Object.entries(featureCount)
      .filter(([_, count]) => count >= result.data.products.length)
      .map(([feature]) => feature),
    differentiationOpportunities: opportunities
  }
}

// Use for positioning
const comparison = await compareFeatures([
  "https://competitor-a.com/features",
  "https://competitor-b.com/features",
  "https://competitor-c.com/features"
])

console.log(`\nCommon features (table stakes):`)
comparison.commonFeatures.forEach(f => console.log(`- ${f}`))

console.log(`\nDifferentiation opportunities:`)
comparison.differentiationOpportunities.forEach(f => console.log(`- ${f}`))
```

## Integration Patterns

### Pattern 1: Exa + Firecrawl (Discovery + Deep Research)

Use Exa to find companies, Firecrawl to research them:

```typescript
import { exa, firecrawl } from '@/lib/clients'

// 1. Find companies with Exa
const companies = await exa.searchAndContents({
  query: 'B2B SaaS companies with 50-200 employees',
  category: 'company',
  numResults: 20
})

// 2. Deep research on top matches with Firecrawl
const researched = []
for (const company of companies.results.slice(0, 5)) {
  const research = await firecrawl.agent({
    urls: [company.url],
    prompt: `Research ${company.title} to extract:
    - Recent blog posts about sales or growth
    - Key leadership team members
    - Recent company updates or announcements`,
    schema: researchSchema
  })
  
  researched.push({
    company: company.title,
    url: company.url,
    research: research.data
  })
}

// Now you have deep context for personalized outreach
```

### Pattern 2: TheirStack + Firecrawl (Signals + Context)

Use TheirStack for signals, Firecrawl for context:

```typescript
import { theirstack, firecrawl } from '@/lib/clients'

// 1. Find companies hiring (signal)
const hiring = await theirstackFindCompanies({
  job_titles: ['Sales Development Representative', 'BDR'],
  posted_within_days: 30
})

// 2. Research hiring context with Firecrawl
for (const company of hiring) {
  const context = await firecrawl.agent({
    urls: [company.website, `${company.website}/careers`],
    prompt: `Extract context about their sales team hiring:
    - Why are they hiring (growth, expansion, new markets)?
    - Current team size mentions
    - Sales leadership team members
    - Any content about their sales process or methodology`,
    schema: hiringContextSchema
  })
  
  // Use for hyper-personalized outreach
  // "I saw you're hiring SDRs - noticed [context] on your site..."
}
```

### Pattern 3: Firecrawl + Leadmagic + Unipile (Research → Email → Send)

Complete research-to-outreach pipeline:

```typescript
import { firecrawl, leadmagic, unipile } from '@/lib/clients'

async function researchAndOutreach(companyDomain: string, role: string) {
  // 1. Research with Firecrawl
  const research = await firecrawl.agent({
    urls: [`https://${companyDomain}`],
    prompt: `Find the ${role} and research:
    - Their name and background
    - Recent company news or blog posts
    - Signs of growth or expansion`,
    schema: researchSchema
  })
  
  if (!research.data.decision_maker) {
    return { success: false, reason: 'Could not find decision maker' }
  }
  
  // 2. Find email with Leadmagic
  const email = await leadmagic.findEmail({
    name: research.data.decision_maker.name,
    domain: companyDomain
  })
  
  if (!email.email) {
    return { success: false, reason: 'Could not find email' }
  }
  
  // 3. Generate personalized copy using research
  const copy = generatePersonalizedCopy(research.data, offer)
  
  // 4. Queue for sending via Unipile
  await saveToOutreachQueue({
    contact_name: research.data.decision_maker.name,
    contact_email: email.email,
    company_domain: companyDomain,
    research_context: research.data,
    email_subject: copy.subject,
    email_body: copy.body,
    ready_for_review: true
  })
  
  return { success: true }
}
```

## Summary: When to Use Firecrawl

| Use Case | Use Firecrawl? | Alternative |
|----------|---------------|-------------|
| Extract competitor pricing | ✅ Yes | Manual research |
| Research company blog posts | ✅ Yes | Exa (for search), manual reading |
| Find team/founder backgrounds | ✅ Yes | Manual LinkedIn research |
| Extract product features | ✅ Yes | Manual research |
| Compare multiple competitors | ✅ Yes | Manual research |
| Pre-outreach personalization research | ✅ Yes | Manual research |
| Find PVP examples | ✅ Yes | Exa + manual research |
| Find companies matching ICP | ❌ No | Exa, Parallel, TheirStack |
| Get email addresses | ❌ No | Leadmagic |
| Track job postings | ❌ No | TheirStack |
| Send outreach messages | ❌ No | Unipile |

**The Rule:** Firecrawl is for **extracting specific data from websites**, especially when you need structured output or the data requires navigation to find. It makes manual web research obsolete for repetitive data extraction tasks.

**Best Combined With:**
- **Exa** - Use Exa to find which companies to research, Firecrawl to extract detailed data
- **TheirStack** - Use TheirStack for signals, Firecrawl for context about those signals
- **Leadmagic** - Use Firecrawl to find decision-makers, Leadmagic to get their emails
- **Unipile** - Use Firecrawl research to personalize messages sent via Unipile

---

**Ready to use Firecrawl?**
- Install package: `npm install @mendable/firecrawl-js`
- Add API key to `.env.local`: `FIRECRAWL_API_KEY=fc-YOUR_API_KEY`
- Import client: `import { firecrawl } from '@/lib/clients'`
- Start with free daily runs to test your use cases
- Official docs: https://docs.firecrawl.dev/

