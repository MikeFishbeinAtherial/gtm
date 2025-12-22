# When and How to Use Exa

## Overview

Exa is an **AI-powered search engine built for finding specific information on the web**. Unlike Google (keyword-based), Exa uses **embeddings** to understand meaning and intent. This makes it perfect for finding companies, people, and research that match specific criteria.

## Exa's Five Core Functions

| Function | Purpose | When to Use |
|----------|---------|-------------|
| `/search` | Find webpages using embeddings-based search | Finding companies, people, or content matching criteria |
| `/contents` | Get clean, parsed HTML from search results | Extracting full text, summaries, or highlights |
| `/findsimilar` | Find pages similar to a given URL | "Find more companies like this one" |
| `/answer` | Get direct answers with citations | Quick facts: "What is X's revenue?" |
| `/research` | Automated in-depth research with structured JSON | Deep dives into topics, competitive analysis |

**Pro tip:** Use `/search` + `/contents` together via `searchAndContents()` for efficiency (one API call instead of two).

## When to Use Exa vs Other Tools

### ✅ Use Exa For:

1. **Finding companies by qualitative criteria**
   - "B2B SaaS companies with strong engineering culture"
   - "Marketing agencies specializing in healthcare"
   - "Startups that raised Series B in 2024"
   
2. **Finding people by role and context**
   - "Heads of Sales at companies with less than 500 employees in Europe"
   - "Engineering managers at Fortune 500 non-tech companies"
   - "CMOs at B2B SaaS companies"

3. **Research and intelligence gathering**
   - Recent company news and announcements
   - Industry trends and pain points
   - Competitive intelligence

4. **Finding similar companies**
   - "Companies like Stripe" (findsimilar)
   - Competitive set expansion

### ❌ Don't Use Exa For:

1. **Quantitative data enrichment** → Use Parallel, Sumble, or TheirStack
   - Employee counts, revenue, funding amounts
   - Technographics (what tools they use)
   - Firmographic data (industry codes, etc.)

2. **Email finding and verification** → Use Leadmagic
   - Personal email addresses
   - Email validation

3. **Job posting signals** → Use TheirStack
   - Who's hiring for specific roles
   - Job posting data and trends

4. **LinkedIn messaging** → Use Unipile
   - Sending connection requests
   - Sending messages
   - Inbox management

**The Pattern:** Exa excels at **discovery** (finding the right targets). Other tools excel at **enrichment** (getting detailed data) and **action** (sending outreach).

## Understanding Criteria vs Enrichments

This is a critical concept from Exa's documentation:

### Criteria = Filters (Who You Get)

**Criteria determine WHICH results you see.** Every result must satisfy ALL criteria. If a result fails even one criterion, it's excluded.

- Criteria are binary (yes/no)
- Criteria are included in base search cost
- If a result doesn't meet a criterion, you never see it

**Examples:**
- "Currently employed as VP Sales"
- "Has 5+ years of experience"
- "Located in San Francisco"
- "Previously worked at Google"

**Common Mistake:** Making optional preferences into criteria.

❌ **Too strict:** "VP Sales with 10+ years experience in healthcare SaaS"
- This filters OUT good candidates who have 8 years or work in adjacent industries

✅ **Better:** "VP Sales with 5+ years in B2B SaaS"
- Gets qualified candidates, then you manually filter

**Rule of Thumb:** If it's a "must-have," use criteria. If it's a "nice-to-have," don't.

### Enrichments = Data Extraction (What You Learn)

**Enrichments pull additional info from results that already passed criteria.** They don't filter - they just add data columns.

- Enrichments don't affect which results you get
- Enrichments cost additional credits per result
- Use enrichments for context, outreach, or prioritization

**Examples:**
- Email address
- Current company size
- Years of experience (exact number)
- LinkedIn profile URL
- Key skills or technologies

**When to Use:** You need the data for outreach or research, but it shouldn't disqualify someone.

### Example: Finding Sales Leaders

**Goal:** Find sales leaders at mid-market B2B SaaS companies for outreach.

**Criteria (Must-Haves):**
- Currently employed as VP Sales, Head of Sales, or CRO
- Works at B2B SaaS company
- Company has 50-500 employees
- Based in United States

**Enrichments (Nice-to-Haves):**
- Email address (for outreach)
- LinkedIn profile URL (for research)
- Company funding stage (Series A/B/C)
- Years in current role (prioritize recently hired = more likely to respond)

**Why this structure works:**
- Criteria ensure you only get qualified leads
- Enrichments give you the context to personalize outreach
- You don't over-filter (missing great candidates because they don't check every box)

## Exa in Your Offer Testing Workflow

### Step 5: Company Discovery

**When:** You've defined your ICP and signals, now need to find actual companies.

**Use Exa for:**
- Finding companies matching qualitative criteria
- Discovering companies you wouldn't find in traditional databases
- Finding companies exhibiting specific signals

```typescript
// Find companies matching ICP
const companies = await exaFindCompanies({
  industry: 'marketing agency',
  size: '20-50 employees',
  geography: 'United States',
  signals: ['hiring salespeople', 'expanding to new markets']
})
```

**Example Queries:**
- "Marketing agencies in the US with 20-50 employees that are hiring salespeople"
- "B2B SaaS companies that raised Series B in 2024 and have a head of people"
- "Research labs with at least 3 researchers that have a biochemistry focus"

**Criteria to include:**
- Industry/category (must match)
- Company size (rough range)
- Geography (must be in target region)
- Key signals (must be present)

**Don't over-constrain:**
- ❌ "Marketing agencies with exactly 25 employees in San Francisco using HubSpot"
- ✅ "Marketing agencies with 20-50 employees in the US"

### Step 6: Contact Discovery

**When:** You've found target companies, now need decision-makers.

**Use Exa for:**
- Finding people in specific roles at target companies
- Discovering decision-makers on LinkedIn
- Finding champions and influencers

```typescript
// Find contacts at specific company
const contacts = await exaFindContacts({
  company: 'Acme Corp',
  titles: ['VP Sales', 'Head of Sales', 'CRO', 'Sales Director'],
  limit: 10
})

// Or find people matching broader criteria
const salesLeaders = await exaSearchPeople({
  query: 'VP Sales at B2B SaaS company with 50-200 employees',
  num_results: 50
})
```

**Example Queries:**
- "Heads of Sales at companies with less than 500 employees, based in Europe"
- "Engineering managers at Fortune 500 companies in traditional industries"
- "CMOs at B2B SaaS companies that recently raised funding"

**Criteria to include:**
- Job title/role (must be decision-maker)
- Company type (must match ICP)
- Company size (rough range)
- Geography (if relevant)

**Enrichments to get:**
- LinkedIn profile URL (for research and outreach)
- Current company name (for context)
- Time in role (recently hired = more open to new solutions)

**Don't over-constrain:**
- ❌ "VP Sales with 10+ years at healthcare SaaS companies who previously worked at Salesforce"
- ✅ "VP Sales at B2B SaaS company" (then filter manually for best fits)

### Step 8: Company Research (Pre-Outreach)

**When:** Before reaching out, research the company for personalization.

**Use Exa for:**
- Recent news and announcements
- Funding rounds
- Hiring trends
- Product launches

```typescript
// Research company before outreach
const research = await exaResearchCompany('Acme Corp', {
  include_news: true,
  days_back: 90,
  get_summary: true
})

// Use AI summaries for quick insights
const recentNews = research.contents?.results[0]?.summary
// "Acme Corp raised $10M Series A and is hiring 15 sales reps..."
```

**What to look for:**
- Recent funding (signals growth = need your solution)
- Hiring for relevant roles (signals pain point)
- Product launches (signals momentum)
- Executive changes (new leaders = open to change)

### Permissionless Value Creation

**When:** Creating PVP content, need to understand industry deeply.

**Use Exa for:**
- Industry trends and challenges
- Competitive intelligence
- Pain point research
- Case studies and examples

```typescript
// Research industry pain points for PVP
const insights = await exaIndustryResearch(
  'cosmetics manufacturing',
  'compliance challenges regulations',
  { days_back: 365, limit: 20 }
)

// Get summaries and highlights for PVP ideas
insights.contents?.results.forEach(article => {
  console.log(article.summary)    // Key insights
  console.log(article.highlights) // Important excerpts
})
```

**Use for:**
- Understanding what your ICP is talking about
- Finding quantifiable pain points
- Discovering information asymmetries
- Researching competitive solutions

### Find Similar Companies

**When:** You found one perfect-fit company, want more like it.

**Use Exa for:**
- Expanding your target list
- Finding competitive sets
- Discovering similar companies in adjacent markets

```typescript
import Exa from 'exa-js'

const exa = new Exa(process.env.EXA_API_KEY)

// Find companies similar to your best customer
const similar = await exa.findSimilar(
  'https://example.com',  // Perfect fit company
  {
    numResults: 50,
    excludeDomains: ['example.com']  // Don't include the original
  }
)
```

**When to use:**
- You have a great example company
- You want to expand within a niche
- You're building a competitive set

## Best Practices

### 1. Start Broad, Then Narrow

❌ **Don't start with:**
"VP Sales with 10+ years at healthcare SaaS companies under 100 employees in California who previously worked at Salesforce and have experience with PLG"

✅ **Start with:**
"VP Sales at B2B SaaS company in United States"

Then manually filter the results. You'll find better candidates and won't miss edge cases.

### 2. Use Natural Language

Exa understands intent, not just keywords.

✅ **Good queries:**
- "Marketing agencies hiring salespeople"
- "B2B SaaS companies with strong engineering culture"
- "Startups that raised Series B in 2024"

❌ **Don't use keyword stuffing:**
- "marketing agency sales hiring salespeople sales reps"

### 3. Leverage Autoprompt

Always use `use_autoprompt: true`. Exa will optimize your query:

```typescript
const results = await exaSearch({
  query: 'B2B SaaS companies',
  use_autoprompt: true,  // Let Exa optimize this
  num_results: 50
})

console.log(results.autoprompt_string)
// "Companies specializing in business-to-business software as a service..."
```

### 4. Use Category Filters

When you know what type of content you want:

```typescript
await exaSearch({
  query: 'marketing agencies',
  category: 'company',  // Only company websites
  use_autoprompt: true
})
```

**Available categories:**
- `company` - Business websites
- `news` - News articles
- `research paper` - Academic research
- `github` - Code repositories
- `personal site` - Blogs and personal sites

### 5. Combine with Date Filters

For recent information:

```typescript
const last90Days = new Date()
last90Days.setDate(last90Days.getDate() - 90)

await exaSearch({
  query: 'AI startups raising funding',
  start_published_date: last90Days.toISOString().split('T')[0],
  category: 'news'
})
```

### 6. Use searchAndContents for Efficiency

Instead of two API calls:

❌ **Less efficient:**
```typescript
const search = await exaSearch({ query: 'AI trends' })
const contents = await exaGetContents({ ids: search.results.map(r => r.id) })
```

✅ **More efficient:**
```typescript
const results = await exaSearchAndContents({
  query: 'AI trends',
  summary: true,
  highlights: true
})
// Results have content immediately!
```

### 7. Extract Only What You Need

```typescript
await exaSearchAndContents({
  query: 'company research',
  summary: true,      // ✅ Quick insights
  highlights: true,   // ✅ Key excerpts
  text: false         // ❌ Full text is usually too long
})
```

## Cost Optimization

### Credits Usage

- **Search**: ~1-5 credits per search
- **Content extraction**: Additional credits per result
- **Summaries**: More credits than highlights
- **Full text**: Most expensive

### Tips to Save Credits

1. **Be specific in searches** - fewer irrelevant results to filter
2. **Use criteria wisely** - don't over-filter (causing re-searches)
3. **Extract only needed content** - skip full text if summary works
4. **Batch operations** - search once, then manually filter
5. **Use findsimilar** - cheaper than multiple searches for similar companies

## Common Patterns

### Pattern 1: ICP-Based Company Discovery

```typescript
// 1. Define criteria from ICP
const criteria = {
  industry: icp.industry,
  size: icp.company_size,
  geography: icp.geography,
  signals: icp.key_signals
}

// 2. Find companies
const companies = await exaFindCompanies(criteria)

// 3. Research top matches
for (const company of companies.results.slice(0, 10)) {
  const research = await exaResearchCompany(company.title, {
    days_back: 90,
    get_summary: true
  })
  
  // Use research for personalization
}
```

### Pattern 2: Contact Discovery at Target Companies

```typescript
// 1. Get list of target companies (from TheirStack, manual research, etc.)
const targetCompanies = ['Acme Corp', 'Beta Inc', 'Gamma LLC']

// 2. Find decision-makers at each
for (const company of targetCompanies) {
  const contacts = await exaFindContacts({
    company,
    titles: icp.target_titles,
    limit: 5
  })
  
  // 3. Save to database for outreach
  await saveContactsToDatabase(contacts.results)
}
```

### Pattern 3: PVP Research

```typescript
// 1. Research industry pain points
const painPoints = await exaIndustryResearch(
  icp.industry,
  icp.problem_space,
  { days_back: 365 }
)

// 2. Find specific examples
const examples = await exaSearch({
  query: `case study ${icp.problem_space} ${icp.industry}`,
  num_results: 10
})

// 3. Get detailed content
const content = await exaSearchAndContents({
  query: `how companies solve ${icp.problem_space}`,
  summary: true,
  highlights: true
})

// 4. Use insights to create PVP
// - Quantify the problem
// - Find information asymmetries
// - Create independently useful content
```

### Pattern 4: Competitive Intelligence

```typescript
// 1. Find similar companies to your best customer
const similar = await exa.findSimilar(
  'https://best-customer.com',
  { numResults: 20 }
)

// 2. Research each one
for (const company of similar.results) {
  const research = await exaSearchAndContents({
    query: `${company.title} customers case studies`,
    summary: true
  })
  
  // Understand their positioning and messaging
}
```

## Example Queries for Your Use Cases

### Finding Companies

**B2B SaaS:**
- "B2B SaaS companies with 50-200 employees that recently raised Series A or B"
- "Early-stage SaaS startups with product-led growth motion"
- "Enterprise software companies expanding to new markets"

**Agencies:**
- "Marketing agencies with 20-50 employees specializing in B2B"
- "Creative agencies in the US that work with healthcare brands"
- "Digital agencies hiring for account management roles"

**Manufacturing:**
- "Cosmetics manufacturers with regulatory compliance needs"
- "Food and beverage manufacturers expanding production"
- "Medical device manufacturers seeking FDA approval"

### Finding People

**Sales Leaders:**
- "VP Sales at B2B SaaS companies with 50-500 employees"
- "Heads of Sales at companies that raised Series B in 2024"
- "Chief Revenue Officers at enterprise software companies"

**Marketing Leaders:**
- "CMOs at B2B companies with 100-1000 employees"
- "VPs of Marketing at companies hiring aggressively"
- "Marketing Directors at agencies with healthcare focus"

**Technical Leaders:**
- "CTOs at early-stage startups with AI/ML focus"
- "Engineering managers at Fortune 500 non-tech companies"
- "VPs of Engineering at companies scaling rapidly"

### Research Queries

**Industry Trends:**
- "Latest challenges in [industry] [topic]"
- "Emerging trends in [industry] 2024"
- "[Industry] companies facing [specific problem]"

**Company-Specific:**
- "[Company name] news funding hiring product launches"
- "[Company name] challenges expansion plans"
- "[Company name] customer success stories"

**Competitive:**
- "Companies similar to [competitor name]"
- "[Competitor name] customers case studies reviews"
- "Alternatives to [competitor product]"

## Troubleshooting

### "Not getting enough results"

**Problem:** Your criteria are too strict.

**Solutions:**
1. Remove optional criteria - make them enrichments instead
2. Broaden geography ("United States" vs "San Francisco")
3. Accept wider company sizes (50-500 vs exactly 100)
4. Use fewer required signals
5. Try more general industry terms

### "Results aren't relevant"

**Problem:** Query is too vague or Exa misunderstood intent.

**Solutions:**
1. Be more specific about what you want
2. Use category filters (`category: 'company'`)
3. Add domain filters (`include_domains: ['linkedin.com']`)
4. Check the `autoprompt_string` - is Exa interpreting correctly?
5. Try example-based query: "Companies like [specific example]"

### "Results are outdated"

**Problem:** No date filtering or stale content.

**Solutions:**
1. Add date filters (`start_published_date`)
2. Use shorter time windows (90 days vs 365 days)
3. Include "2024" or "recent" in query
4. Use category: 'news' for recent updates

### "Running out of credits"

**Problem:** Inefficient usage or too many content extractions.

**Solutions:**
1. Use `searchAndContents()` instead of separate calls
2. Extract only summaries, skip full text
3. Search once with broader criteria, filter manually
4. Use fewer enrichments - get only essential data
5. Cache results - don't re-search the same thing

## Summary: When to Use Exa

| Use Case | Use Exa? | Alternative |
|----------|----------|-------------|
| Find companies matching qualitative criteria | ✅ Yes | TheirStack (signals), Parallel (quantitative) |
| Find decision-makers on LinkedIn | ✅ Yes | Parallel (people search) |
| Research company news and trends | ✅ Yes | Manual Google search |
| Find similar companies | ✅ Yes | Manual research |
| Industry insights for PVP | ✅ Yes | Manual research |
| Get employee count, revenue | ❌ No | Parallel, Sumble |
| Find email addresses | ❌ No | Leadmagic |
| Track job postings | ❌ No | TheirStack |
| Send LinkedIn messages | ❌ No | Unipile |

**The Rule:** Exa is for **discovery** (finding who and what). Other tools are for **enrichment** (detailed data) and **action** (outreach).

---

**Ready to use Exa?** Check out:
- Setup guide: `docs/exa-setup.md`
- Test script: `npm run test-exa`
- Official docs: https://docs.exa.ai/

