# Firecrawl Setup Complete ✅

## What Was Done

### 1. Package Installation
- ✅ Installed `@mendable/firecrawl-js` package
- ✅ Added to project dependencies

### 2. Client Implementation
- ✅ Created `/src/lib/clients/firecrawl.ts` with helper functions:
  - `firecrawlScrape()` - Single-page extraction
  - `firecrawlAgent()` - Autonomous research
  - `firecrawlStartAgent()` / `firecrawlGetAgentStatus()` - Async jobs
  - `firecrawlCrawl()` - Full site crawling
  - `FirecrawlActions` - Page interaction helpers
  - `FirecrawlSchemas` - Common extraction schemas
- ✅ Added to client barrel export `/src/lib/clients/index.ts`

### 3. Documentation Created
- ✅ **Full Usage Guide**: `/context/api-guides/firecrawl-usage-guide.md`
  - Overview of all Firecrawl features (Scrape, Agent, Crawl, Actions)
  - When and how to use each feature
  - 5 detailed use case examples with code
  - Scrape + Actions patterns for interactive extraction
  - Agent patterns for autonomous research
  - Integration patterns with other APIs
  - Schema patterns and best practices
  - Cost optimization tips
  - Troubleshooting guide

- ✅ **Quick Reference**: `/context/api-guides/firecrawl-quick-reference.md`
  - Common patterns
  - Schema templates
  - Prompt templates
  - Quick lookup tables

- ✅ **Updated README**: `/context/api-guides/README.md`
  - Added Firecrawl to available guides
  - Updated decision tree
  - Added website extraction flows

- ✅ **Updated API Comparison**: `/context/api-guides/api-comparison.md`
  - Added Firecrawl to research & intelligence section
  - Added new use case scenarios
  - Updated cost considerations
  - Updated quick lookup table

### 4. Test Script
- ✅ Created `/scripts/test-firecrawl.ts`
- ✅ Added `test-firecrawl` script to `package.json`
- ✅ Tests 4 different use cases:
  1. Basic extraction (founders)
  2. Pricing extraction with URLs
  3. Start job + poll status
  4. No-URL extraction (agent search)

### 5. Environment Configuration
- ⚠️  **Action Required**: Add your Firecrawl API key to `.env.local`:
  ```
  FIRECRAWL_API_KEY=fc-YOUR_API_KEY
  ```

## How to Use

### Choose the Right Feature

| Use Case | Feature | Example |
|----------|---------|---------|
| Extract from known URL | **Scrape** | Get pricing from competitor's pricing page |
| Interact with page first | **Scrape + Actions** | Click tabs to reveal all pricing tiers |
| Don't know where data is | **Agent** | "Find the founders of Acme Corp" |
| Multi-source research | **Agent** | Compare pricing across 5 competitors |

### Import the Client

```typescript
import { firecrawlScrape, firecrawlAgent, FirecrawlActions } from '@/lib/clients'
import { z } from 'zod'
```

### Scrape: Single Page

```typescript
// Get markdown
const doc = await firecrawlScrape('https://acme.com/about', {
  formats: ['markdown']
})

// Extract structured data
const pricing = await firecrawlScrape('https://acme.com/pricing', {
  formats: [{
    type: 'json',
    schema: pricingSchema
  }]
})
```

### Scrape + Actions: Interactive

```typescript
// Click tabs to reveal all content
const content = await firecrawlScrape('https://acme.com/pricing', {
  formats: ['markdown'],
  actions: [
    FirecrawlActions.wait(1000),
    FirecrawlActions.click('#enterprise-tab'),
    FirecrawlActions.wait(500)
  ]
})
```

### Agent: Autonomous Research

```typescript
// Extract with schema
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

### Test the Integration

```bash
npm run test-firecrawl
```

## When to Use Firecrawl

### ✅ Perfect For:
1. **Competitive Research**
   - Extract pricing and features from competitor sites
   - Compare multiple competitors in one job
   
2. **Pre-Outreach Personalization**
   - Research target company websites
   - Extract team information
   - Find recent blog posts and updates

3. **Permissionless Value Creation**
   - Find real-world problem examples
   - Extract case studies and data
   - Gather evidence for PVP content

4. **Data Extraction Without Scraping**
   - Get structured data from websites
   - No need to write custom scrapers
   - Works with complex, dynamic sites

### ❌ Don't Use For:
- Finding companies (use Exa, Parallel, TheirStack)
- Finding people (use Exa, Parallel)
- Getting emails (use Leadmagic)
- Sending outreach (use Unipile)

## Integration with Your Workflow

### Phase 3: Offer Research
Use Firecrawl to extract competitor pricing, features, and positioning:

```typescript
const pricing = await firecrawl.agent({
  urls: competitorPricingUrls,
  prompt: "Extract pricing plans with names, prices, and features",
  schema: pricingSchema
})
```

### Phase 8: Pre-Outreach Research
Deep-dive into target company before reaching out:

```typescript
const research = await firecrawl.agent({
  urls: [`https://${company.domain}`],
  prompt: "Find recent blog posts, team members, and company updates",
  schema: researchSchema
})
```

### Combined with Other APIs

**Exa → Firecrawl → Leadmagic → Unipile**

1. Exa: Find target companies
2. Firecrawl: Extract details from their websites
3. Leadmagic: Get contact emails
4. Unipile: Send personalized outreach

## Cost Management

### Free Tier
- 5 free daily runs for testing
- Use these to validate prompts and schemas

### Optimization Tips
1. **Provide URLs when known** - Faster and cheaper
2. **Set maxCredits limits** - Prevent runaway costs
3. **Batch similar extractions** - Process multiple sites in one job
4. **Use focused prompts** - Only extract what you need

### Monitor Usage

```typescript
console.log(`Credits used: ${result.creditsUsed}`)
```

## Common Patterns

### Pattern 1: Competitive Pricing
```typescript
const result = await firecrawl.agent({
  urls: ["https://competitor-a.com/pricing", "https://competitor-b.com/pricing"],
  prompt: "Extract pricing plans with names, prices, and key features",
  schema: pricingSchema
})
```

### Pattern 2: Team Research
```typescript
const result = await firecrawl.agent({
  urls: [`https://${company.domain}/team`],
  prompt: `Find the ${targetRole} including name, background, and LinkedIn`,
  schema: teamSchema
})
```

### Pattern 3: Recent Content
```typescript
const result = await firecrawl.agent({
  urls: [`https://${company.domain}/blog`],
  prompt: `Find recent blog posts about ${topic} from the last 6 months`,
  schema: contentSchema
})
```

## Documentation Links

- **Full Guide**: `/context/api-guides/firecrawl-usage-guide.md`
- **Quick Reference**: `/context/api-guides/firecrawl-quick-reference.md`
- **API Comparison**: `/context/api-guides/api-comparison.md`
- **Official Docs**: https://docs.firecrawl.dev/

## Next Steps

1. ✅ Add `FIRECRAWL_API_KEY` to `.env.local`
2. ✅ Run `npm run test-firecrawl` to verify setup
3. ✅ Review usage guide for your specific use cases
4. ✅ Start with free daily runs to test prompts
5. ✅ Integrate into your offer research and outreach workflows

## Support

- **Documentation**: See `/context/api-guides/firecrawl-usage-guide.md`
- **Official Docs**: https://docs.firecrawl.dev/
- **Support Email**: help@firecrawl.com

---

**Setup Status**: ✅ Complete

Firecrawl is now ready to use in your Offer Testing System. Start by adding your API key and running the test script to verify everything works!

