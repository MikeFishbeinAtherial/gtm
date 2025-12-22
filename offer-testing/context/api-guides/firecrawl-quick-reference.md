# Firecrawl Quick Reference

Quick reference for common Firecrawl operations in the Offer Testing System.

## Installation & Setup

```bash
npm install @mendable/firecrawl-js
```

Add to `.env.local`:
```
FIRECRAWL_API_KEY=fc-YOUR_API_KEY
```

## Import

```typescript
import { firecrawl, firecrawlScrape, firecrawlAgent, FirecrawlActions } from '@/lib/clients'
import { z } from 'zod'
```

## Which Feature to Use?

| Use Case | Use |
|----------|-----|
| Know exact URL, want content | **Scrape** |
| Know URL, need to interact with page | **Scrape + Actions** |
| Don't know where data is | **Agent** |
| Multi-source autonomous research | **Agent** |
| Need entire website content | Crawl (less common) |

## Common Patterns

### 1. Scrape: Single Page Extraction

```typescript
// Get markdown from a page
const doc = await firecrawlScrape('https://acme.com/about', {
  formats: ['markdown']
})

// Extract structured data
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
```

### 2. Scrape with Actions (Interactive)

```typescript
// Click tabs to reveal all content
const allContent = await firecrawlScrape('https://acme.com/pricing', {
  formats: ['markdown'],
  actions: [
    FirecrawlActions.wait(1000),
    FirecrawlActions.click('#premium-tab'),
    FirecrawlActions.wait(500),
    FirecrawlActions.click('#enterprise-tab'),
    FirecrawlActions.wait(500)
  ]
})

// Fill form to access gated content
const content = await firecrawlScrape('https://acme.com/whitepaper', {
  formats: ['markdown'],
  actions: [
    FirecrawlActions.write('john@example.com'),
    FirecrawlActions.press('Tab'),
    FirecrawlActions.write('Acme Corp'),
    FirecrawlActions.click('button[type="submit"]'),
    FirecrawlActions.wait(2000)
  ]
})
```

### 3. Agent: Autonomous Research (Wait for Results)

```typescript
const result = await firecrawlAgent({
  prompt: "Find the founders of Acme Corp",
  schema: z.object({
    founders: z.array(z.object({
      name: z.string(),
      role: z.string().optional()
    }))
  })
})

console.log(result.data)
```

### 4. Agent: With Specific URLs

```typescript
const result = await firecrawlAgent({
  urls: ["https://acme.com/pricing"],
  prompt: "Extract pricing plans with names, prices, and features"
})
```

### 5. Agent: Start Job + Poll Status

```typescript
// Start job
const job = await firecrawlStartAgent({
  prompt: "Research top 5 CRM tools",
  maxCredits: 50
})

// Poll status
const status = await firecrawlGetAgentStatus(job.id)
if (status.status === 'completed') {
  console.log(status.data)
}
```

### 6. Set Credit Limit

```typescript
const result = await firecrawlAgent({
  prompt: "Extract competitor information",
  maxCredits: 30  // Stop if would exceed 30 credits
})
```

## Common Actions

```typescript
// Available actions for Scrape
FirecrawlActions.wait(milliseconds)       // Wait for page to load
FirecrawlActions.click(selector)          // Click element
FirecrawlActions.write(text)              // Type into input
FirecrawlActions.press(key)               // Press keyboard key
FirecrawlActions.scroll('down')           // Scroll page
FirecrawlActions.screenshot(fullPage)     // Take screenshot
```

## Common Schemas

### Company Information
```typescript
const companySchema = z.object({
  name: z.string(),
  description: z.string(),
  employee_count: z.string().optional(),
  location: z.string().optional(),
  founded: z.string().optional()
})
```

### Pricing
```typescript
const pricingSchema = z.object({
  plans: z.array(z.object({
    name: z.string(),
    price: z.string(),
    features: z.array(z.string())
  }))
})
```

### Team Members
```typescript
const teamSchema = z.object({
  members: z.array(z.object({
    name: z.string(),
    title: z.string(),
    background: z.string().optional()
  }))
})
```

### Blog Posts / Content
```typescript
const contentSchema = z.object({
  posts: z.array(z.object({
    title: z.string(),
    summary: z.string(),
    date: z.string().optional(),
    url: z.string()
  }))
})
```

## Prompt Templates

### Competitive Pricing
```typescript
const prompt = `Extract pricing information from [competitors].

For each company, find:
- Company name
- All pricing plan names
- Price for each plan (include currency and period)
- Key features included in each plan

Focus on publicly available pricing pages.`
```

### Pre-Outreach Research
```typescript
const prompt = `Research ${companyDomain} focusing on:

1. Recent blog posts about ${topic} (last 6 months)
2. Leadership team (especially ${targetRole})
3. Recent company updates: funding, hiring, product launches

Focus on information useful for personalized outreach.`
```

### Team/Founder Research
```typescript
const prompt = `Find the ${role} at ${companyName}.

Extract:
- Full name and current title
- How long they've been in this role
- Previous companies or roles
- LinkedIn profile URL if available

Look on About page, Team page, or executive profiles.`
```

## Cost Management

### Free Tier
- 5 free daily runs for all users
- Perfect for testing

### Optimization Tips
1. **Provide URLs when known** - Faster and cheaper
2. **Set maxCredits** - Prevent runaway costs
3. **Batch similar extractions** - More efficient
4. **Use focused prompts** - Only request needed data
5. **Start with free runs** - Test before scaling

### Monitor Usage
```typescript
console.log(`Credits used: ${result.creditsUsed}`)
```

## Error Handling

```typescript
try {
  const result = await firecrawl.agent({ prompt, urls, schema })
  
  if (result.status === 'completed') {
    return result.data
  } else if (result.status === 'failed') {
    console.error('Firecrawl job failed')
    return null
  }
} catch (error) {
  console.error('Firecrawl API error:', error)
  return null
}
```

## Job States

| Status | Description | Action |
|--------|-------------|--------|
| `processing` | Still working | Wait and poll again |
| `completed` | Finished successfully | Use the data |
| `failed` | Error occurred | Check logs, revise prompt |

## When to Use vs Other Tools

| Need | Use |
|------|-----|
| Extract pricing/features from websites | ✅ Firecrawl |
| Find companies matching ICP | ❌ Use Exa |
| Get email addresses | ❌ Use Leadmagic |
| Research company news | Exa or Firecrawl |
| Extract team info from website | ✅ Firecrawl |
| Find people by role | ❌ Use Exa or Parallel |

## Common Use Cases

1. **Competitive Pricing Research** - Extract and compare pricing
2. **Pre-Outreach Research** - Get context for personalization
3. **PVP Content Creation** - Find real-world examples
4. **Team Background Research** - Research decision-makers
5. **Feature Comparison** - Compare product features

## Schema Best Practices

✅ **Do:**
- Use `.describe()` for clarity
- Make uncertain fields optional
- Use arrays for lists
- Keep schemas focused

❌ **Don't:**
- Make everything required
- Try to extract everything at once
- Use vague field names

## Prompt Best Practices

✅ **Do:**
- Be specific about what you want
- Specify where to look (if relevant)
- Include qualifiers when needed
- Focus on publicly available data

❌ **Don't:**
- Be too vague ("find information")
- Ask for private/behind-login data
- Combine multiple unrelated extractions

## Full Documentation

See `/context/api-guides/firecrawl-usage-guide.md` for:
- Detailed use cases with code
- Integration patterns with other APIs
- Troubleshooting guide
- Advanced techniques

## Official Docs

https://docs.firecrawl.dev/

