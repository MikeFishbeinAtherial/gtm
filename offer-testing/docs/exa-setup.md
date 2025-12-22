# Exa Setup Guide

## What is Exa?

Exa is an **AI-powered search engine** specifically designed for developers and researchers. Unlike traditional search engines, Exa understands **natural language queries** and can find companies, **people**, research, news, and more with semantic understanding.

### Key Features

- 🎯 **Neural Search**: Understands meaning, not just keywords
- 🏢 **Company Discovery**: Find businesses matching specific criteria
- 👥 **People Search** (NEW): Find decision-makers, experts, and contacts
- 📰 **Research & News**: Get recent articles and insights
- 🔍 **Category Filtering**: Filter by company, research, news, etc.
- 📅 **Date Ranges**: Search within specific time periods
- 🌐 **Domain Control**: Include/exclude specific websites
- ⚡ **Efficient API**: Combined search + content in one call

## Why We Use Exa

In our offer testing system, Exa helps us:

1. **Find Target Companies**: Search for businesses matching our ICP signals
   - Example: "B2B SaaS companies hiring SDRs in 2024"
   
2. **Find Decision-Makers** (NEW): Discover contacts at target companies
   - Example: "CMO at B2B SaaS company site:linkedin.com"
   
3. **Research Companies**: Get recent news, funding, hiring announcements
   - Example: Find all recent articles about a prospect
   
4. **Industry Insights**: Understand market trends and pain points
   - Example: "challenges in cosmetics manufacturing compliance"

## Setup Steps

### 1. Get Your API Key

1. Go to [https://dashboard.exa.ai/](https://dashboard.exa.ai/)
2. Sign up or log in
3. Navigate to API Keys section
4. Copy your API key

### 2. Add to Environment Variables

Open your `.env.local` file (in the `offer-testing` folder) and add:

```bash
EXA_API_KEY=your_api_key_here
```

**Important**: Replace `your_api_key_here` with your actual API key from step 1.

### 3. Test the Integration

Run the test script to verify everything works:

```bash
npm run test-exa
```

This will test:
- ✅ Basic search functionality
- ✅ Company finding
- ✅ Company research
- ✅ Industry research

## Using Exa in Your Code

All functions use the official `exa-js` SDK for better performance and reliability.

### Basic Search

```typescript
import { exaSearch } from '@/lib/clients/exa'

const results = await exaSearch({
  query: 'B2B SaaS companies with 20-100 employees',
  num_results: 10,
  use_autoprompt: true,  // Let Exa optimize your query
  category: 'company'     // Filter for company websites
})
```

### Search with Content (More Efficient)

Instead of calling `search` then `getContents`, use `searchAndContents`:

```typescript
import { exaSearchAndContents } from '@/lib/clients/exa'

const results = await exaSearchAndContents({
  query: 'AI automation trends 2024',
  num_results: 10,
  summary: true,      // Get AI summaries
  highlights: true,   // Get key excerpts
  text: false         // Skip full text (can be very long)
})

// Results include both search results AND content
results.results.forEach(result => {
  console.log(result.title)
  console.log(result.summary)  // Available immediately!
})
```

**Why this is better**: One API call instead of two, faster and uses fewer credits.

### Find People (NEW 🆕)

Search for decision-makers and contacts on LinkedIn:

```typescript
import { exaSearchPeople } from '@/lib/clients/exa'

const people = await exaSearchPeople({
  query: 'CMO at B2B SaaS company',
  num_results: 20,
  include_domains: ['linkedin.com']  // Default, but you can customize
})

people.results.forEach(person => {
  console.log(person.name)
  console.log(person.title)        // Extracted from LinkedIn
  console.log(person.company)      // Extracted from LinkedIn
  console.log(person.linkedin_url)
})
```

**How it works**: The function searches LinkedIn profiles and automatically extracts name, title, and company information from the profile titles.

### Find Contacts at Specific Companies (NEW 🆕)

When you have a target company, find decision-makers there:

```typescript
import { exaFindContacts } from '@/lib/clients/exa'

const contacts = await exaFindContacts({
  company: 'Acme Corp',
  titles: ['VP Sales', 'Sales Director', 'CRO', 'Head of Sales'],
  limit: 10
})

contacts.results.forEach(contact => {
  console.log(`${contact.name} - ${contact.title}`)
  console.log(contact.linkedin_url)
})
```

**Perfect for**: Contact discovery in your outreach campaigns (Step 6)!

### Find Companies by Criteria

```typescript
import { exaFindCompanies } from '@/lib/clients/exa'

const companies = await exaFindCompanies({
  industry: 'marketing agency',
  size: '10-50 employees',
  geography: 'United States',
  signals: ['hiring salespeople', 'raised funding'],
  limit: 50
})
```

**How it works**: This function constructs a natural language query from your parameters. For the example above, it searches for: "marketing agency with 10-50 employees in United States that are hiring salespeople and raised funding companies"

### Research a Specific Company

```typescript
import { exaResearchCompany } from '@/lib/clients/exa'

const research = await exaResearchCompany('Acme Corp', {
  include_news: true,
  days_back: 90,           // Last 90 days
  get_summary: true        // Get AI summaries of articles
})

// Access results
console.log(research.search.results)  // Articles found
console.log(research.contents)        // Summaries of articles
```

### Industry Research & Insights

```typescript
import { exaIndustryResearch } from '@/lib/clients/exa'

const insights = await exaIndustryResearch(
  'cosmetics manufacturing',
  'compliance challenges regulations',
  { limit: 20, days_back: 365 }
)

// Perfect for creating Permissionless Value Propositions (PVPs)
insights.contents?.results.forEach(article => {
  console.log(article.summary)  // Key insights
  console.log(article.highlights)  // Important excerpts
})
```

## API Response Structure

### Search Results

```typescript
{
  results: [
    {
      title: "Company Name",
      url: "https://example.com",
      published_date: "2024-01-15",
      author: "John Doe",
      score: 0.89,  // Relevance score (0-1)
      id: "abc123"  // Unique ID for getting content
    }
  ],
  autoprompt_string: "Optimized query Exa used"
}
```

### Content Results

```typescript
{
  results: [
    {
      id: "abc123",
      url: "https://example.com",
      title: "Article Title",
      text: "Full article text...",
      highlights: ["Important excerpt 1", "Important excerpt 2"],
      summary: "AI-generated summary of the content"
    }
  ]
}
```

## Tips & Best Practices

### 1. Use Autoprompt

Always set `use_autoprompt: true` to let Exa optimize your queries:

```typescript
// ✅ Good
await exaSearch({
  query: 'marketing agencies',
  use_autoprompt: true
})

// ❌ Less effective
await exaSearch({
  query: 'marketing agencies',
  use_autoprompt: false
})
```

### 2. Specify Categories

Use the `category` parameter to improve results:

- `'company'` - For finding businesses
- `'news'` - For recent news articles
- `'research paper'` - For academic research
- `'github'` - For code repositories

### 3. Date Filtering

Use date ranges to find recent information:

```typescript
const last30Days = new Date()
last30Days.setDate(last30Days.getDate() - 30)

await exaSearch({
  query: 'AI startups',
  start_published_date: last30Days.toISOString().split('T')[0],
  category: 'news'
})
```

### 4. Domain Control

Include or exclude specific domains:

```typescript
await exaSearch({
  query: 'SaaS funding news',
  include_domains: ['techcrunch.com', 'venturebeat.com'],
  exclude_domains: ['reddit.com']
})
```

### 5. Get Full Content When Needed

If you need the actual article text or summaries:

```typescript
// 1. First search
const search = await exaSearch({ query: 'AI trends', num_results: 5 })

// 2. Get full content for results
const contents = await exaGetContents({
  ids: search.results.map(r => r.id),
  summary: true,      // Get AI summaries
  highlights: true,   // Get key excerpts
  text: false         // Don't need full text (can be very long)
})
```

## Integration with Offer Testing System

Exa fits into our workflow at several points:

### 1. Company Discovery (Step 5)

```typescript
// In src/core/company-finder.ts
const companies = await exaFindCompanies({
  industry: icp.industry,
  size: icp.company_size,
  geography: icp.geography,
  signals: icp.signals
})
```

### 2. Contact Discovery (Step 6) - NEW 🆕

```typescript
// Find decision-makers at discovered companies
for (const company of companies.results) {
  const contacts = await exaFindContacts({
    company: company.title,
    titles: icp.target_titles,  // e.g., ['VP Sales', 'CRO']
    limit: 5
  })
  
  // Save contacts to database for outreach
}
```

### 3. Company Research (Before Outreach)

```typescript
// Before reaching out, research the company
const research = await exaResearchCompany(company.name, {
  include_news: true,
  days_back: 90
})

// Use insights for personalization
const recentNews = research.search.results[0]
const summary = research.contents?.results[0]?.summary
```

### 4. PVP Creation

```typescript
// Understand industry pain points
const insights = await exaIndustryResearch(
  offer.industry,
  offer.problemSpace,
  { days_back: 365 }
)

// Use insights to create valuable content
```

## Troubleshooting

### "EXA_API_KEY not set in environment variables"

- Check that `.env.local` exists in the `offer-testing` folder
- Verify the key is named exactly `EXA_API_KEY=`
- Make sure there are no extra spaces around the `=` sign
- Restart your development server after adding the key

### "401 Unauthorized" or "403 Forbidden"

- Your API key is invalid or expired
- Get a new key from [dashboard.exa.ai](https://dashboard.exa.ai/)
- Make sure you copied the entire key (no spaces or missing characters)

### "429 Too Many Requests"

- You've hit your rate limit
- Wait a few minutes before trying again
- Check your plan limits at [dashboard.exa.ai](https://dashboard.exa.ai/)

### Network Errors

- Check your internet connection
- Exa API might be experiencing issues (rare)
- Try again in a few minutes

## API Limits

Check your plan at [dashboard.exa.ai](https://dashboard.exa.ai/) for specific limits.

**Free Tier** (typical):
- 1,000 searches per month
- Standard rate limiting

**Paid Tiers**:
- Higher search volumes
- Faster rate limits
- Priority support

## Next Steps

1. ✅ Get your API key
2. ✅ Add to `.env.local`
3. ✅ Run `npm run test-exa`
4. 🎯 Start using Exa in your offer testing workflows!

## Related Documentation

- [Exa Official Docs](https://docs.exa.ai/)
- [Exa Dashboard](https://dashboard.exa.ai/)
- [Our Company Finder Code](../src/core/company-finder.ts)
- [Signal Generation Guide](../context/frameworks/signal-generation-guide.md)

---

**Ready to test?** Run: `npm run test-exa`

