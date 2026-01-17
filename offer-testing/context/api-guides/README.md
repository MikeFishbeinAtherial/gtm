# API Usage Guides

Context documents explaining when and how to use each API in the Offer Testing System.

## Available Guides

> **Note:** Detailed API documentation has been moved to `../api-tools/` with examples and setup guides.  
> These quick references remain here for fast lookup during development.

### [Exa Usage Guide](./exa-usage-guide.md)
**When to use:** Finding companies and people by qualitative criteria, research, industry insights

**Key capabilities:**
- 🏢 Company discovery with natural language
- 👥 People search (find decision-makers)
- 🔍 Research and competitive intelligence
- 📊 Industry trends and insights

**Core concept:** Exa is for **discovery** - finding who and what based on meaning, not just data.

---

### [Firecrawl Usage Guide](./firecrawl-usage-guide.md)
**When to use:** Extracting specific data from websites, competitive research, pre-outreach personalization

**Key capabilities:**
- 🌐 AI-powered web data extraction
- 🔄 Autonomous navigation and search
- 📋 Structured output with custom schemas
- ⚡ Parallel processing of multiple sources

**Core concept:** Firecrawl is for **extraction** - gathering specific data from websites without writing scrapers.

---

### [Sumble Usage Guide](./sumble.md)
**See also:** `../api-tools/sumble/sumble-tool-guide.md` for detailed docs and examples
**When to use:** Finding hiring signals and validating technology stacks

**Key capabilities:**
- 💼 Job posting search (PRIMARY USE CASE)
- 🔧 Technology stack validation
- 👥 People using specific technologies
- 📈 Hiring trends and velocity

**Core concept:** Sumble is for **hiring signals** - finding companies with urgent needs based on job postings.

---

### [Perplexity](../api-tools/perplexity/perplexity-tool-guide.md)
**See also:** `../api-tools/perplexity/perplexity-tool-guide.md` for detailed docs and examples
**When to use:** Web search and research, company/contact research, competitive intelligence

**Key capabilities:**
- 🔍 AI-powered web search with citations
- 🏢 Company research and information
- 👤 Contact/person background research
- 📰 Industry trends and news
- 🎯 Competitive intelligence

**Core concept:** Perplexity is for **research** - getting current information from the web with AI understanding.

---

### [FullEnrich](../api-tools/fullenrich/fullenrich-tool-guide.md)
**See also:** `../api-tools/fullenrich/fullenrich-tool-guide.md` for detailed docs and examples
**When to use:** Contact enrichment at scale, finding email addresses, bulk operations

**Key capabilities:**
- 📧 Find work email addresses (1 credit)
- 📱 Get mobile phone numbers (10 credits)
- ✉️ Find personal emails (3 credits)
- 📦 Bulk enrichment (up to 100 contacts)
- 🔔 Asynchronous with webhooks

**Core concept:** FullEnrich is for **contact enrichment** - finding contact information at scale with async processing.

---

## Other APIs (Guides Coming Soon)

### Parallel
**When to use:** Quantitative company data, people search, web scraping
- Employee counts, revenue, funding
- Technographics (tech stack)
- Detailed people/contact data

### Leadmagic
**When to use:** Email finding and verification
- Find personal work emails
- Verify email deliverability
- Bulk email lookups

### [Unipile](../api-tools/unipile/unipile-tool-guide.md)
**When to use:** LinkedIn and email outreach
- Send LinkedIn connection requests
- Send LinkedIn messages
- Manage inbox and replies
- Send emails
- Sync connections and message history

---

## Decision Tree: Which API to Use?

### I need to find companies...
- **By qualitative traits** (culture, focus, specialty) → **Exa**
- **By quantitative data** (revenue, employee count) → **Parallel**
- **That are hiring** (job postings with tech/role filters) → **Sumble Jobs API**
- **Using specific technologies** (validate tech stack) → **Sumble Enrichment API**

### I need to extract data from websites...
- **Specific data** (pricing, features, team info) → **Firecrawl**
- **General research** (articles, trends) → **Exa**
- **Technical data** (tech stack, tools used) → **Parallel**

### I need to find people...
- **By role and context** ("CMOs at B2B SaaS") → **Exa** or **Parallel**
- **With detailed data** (seniority, departments) → **Parallel**
- **Contact information** (emails, bulk) → **FullEnrich**
- **Contact information** (emails, instant) → **Leadmagic**

### I need to research...
- **Industry trends and insights** → **Exa** or **Perplexity**
- **Company information** → **Perplexity**
- **Contact/person background** → **Perplexity**
- **Company-specific news** → **Exa** or **Perplexity**
- **Competitive intelligence** → **Exa**, **Perplexity**, or **Firecrawl**
- **Quantified company data** → **Parallel**
- **Technology stack and usage** → **Sumble**
- **Hiring signals and job postings** → **Sumble Jobs API**
- **Specific website data** (pricing, features, team) → **Firecrawl**

### I need to do outreach...
- **Send messages** → **Unipile**
- **Find emails first** (bulk) → **FullEnrich**
- **Find emails first** (instant) → **Leadmagic**
- **Research targets first** → **Perplexity**, **Exa**, **Firecrawl**

---

## The Data Pipeline

Here's how APIs work together in a typical workflow:

1. **Discovery** (Find who to target)
   - Sumble Jobs API: Find companies with hiring signals
   - Exa: Find companies matching ICP qualitatively
   - Exa or Parallel: Find decision-makers at those companies

2. **Enrichment** (Get detailed data)
   - Parallel: Get employee counts, revenue, tech stack
   - Sumble: Validate technology usage and get hiring data
   - FullEnrich: Find email addresses (bulk enrichment)
   - Leadmagic: Find and verify email addresses (instant)

3. **Research** (Personalize outreach)
   - Perplexity: Research company and contact information
   - Sumble: Get job posting details for personalization
   - Firecrawl: Extract pricing, features, team info from websites
   - Exa: Research company news and context
   - Manual: Review LinkedIn profiles

4. **Outreach** (Make contact)
   - Unipile: Send LinkedIn messages and connection requests
   - Unipile: Send emails
   - Unipile: Manage inbox and track replies

5. **Learning** (Improve over time)
   - Track what works in Supabase
   - Iterate on ICP and messaging

---

## Contributing

When adding new API guides, follow this structure:

1. **Overview** - What is this API?
2. **When to Use** - Specific use cases
3. **When NOT to Use** - What it's bad at
4. **Integration Points** - Where it fits in workflow
5. **Best Practices** - Tips and patterns
6. **Examples** - Real queries and code
7. **Troubleshooting** - Common issues

See `exa-usage-guide.md` as a reference template.

