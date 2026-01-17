# API Comparison: When to Use What

Quick reference for choosing the right API for each task in your workflow.

## Company Discovery

| Task | Best API | Why | Alternative |
|------|----------|-----|-------------|
| Find companies by industry/focus | **Exa** | Understands qualitative traits | Parallel (quantitative only) |
| Find companies by size/revenue | **Parallel** | Precise firmographic data | - |
| Find companies hiring for roles | **Sumble Jobs API** | Job postings + tech signals | TheirStack |
| Find companies hiring for tech | **Sumble Jobs API** | Tech-specific job data | TheirStack |
| Find companies like [example] | **Exa** | findsimilar function | Manual research |
| Enrich company data | **Parallel** | Detailed firmographics | - |
| Validate tech stack | **Sumble** | Technology usage data | - |

## People & Contact Discovery

| Task | Best API | Why | Alternative |
|------|----------|-----|-------------|
| Find people by role/title | **Exa** | Natural language, LinkedIn | Parallel |
| Find contacts at specific company | **Exa** | Targeted search | Parallel |
| Get detailed contact data | **Parallel** | Comprehensive profiles | - |
| Find email addresses | **FullEnrich** or **Leadmagic** | Bulk enrichment (FullEnrich) or instant (Leadmagic) | Manual |
| Enrich contacts at scale | **FullEnrich** | Bulk up to 100 contacts, async with webhooks | Leadmagic |
| Verify email deliverability | **Leadmagic** | Purpose-built for emails | - |

## Research & Intelligence

| Task | Best API | Why | Alternative |
|------|----------|-----|-------------|
| Company news and updates | **Exa** or **Perplexity** | Recent articles with summaries | Manual Google |
| Research company information | **Perplexity** | AI-powered web search with citations | Exa |
| Research contact/person background | **Perplexity** | Current information about people | Exa |
| Industry trends | **Exa** or **Perplexity** | AI-powered research | Manual research |
| Competitive intelligence | **Exa** or **Perplexity** | Similar company discovery, competitor research | Manual |
| Extract pricing/features from sites | **Firecrawl** | Structured extraction | Manual scraping |
| Extract team info from websites | **Firecrawl** | Autonomous navigation | Manual research |
| Competitive feature comparison | **Firecrawl** | Parallel multi-site extraction | Manual |
| Pre-outreach company research | **Firecrawl** or **Perplexity** | Deep website analysis or web research | Manual |
| Quantified company metrics | **Parallel** | Structured firmographic data | - |
| Technology stack validation | **Sumble** | Tech usage + people counts | - |
| Job posting signals | **Sumble Jobs API** | Hiring signals + tech filters | TheirStack |

## Outreach & Engagement

| Task | Best API | Why | Alternative |
|------|----------|-----|-------------|
| Send LinkedIn messages | **Unipile** | LinkedIn API integration | Manual (unsafe) |
| Send connection requests | **Unipile** | Rate limit management | Manual (unsafe) |
| Send emails | **Unipile** | Unified inbox | Standard SMTP |
| Track replies | **Unipile** | Inbox management | Manual |

---

## Use Case Scenarios

### Scenario 1: "Find B2B SaaS companies hiring sales reps"

**Solution:**
1. **Sumble Jobs API** - Find companies with SDR/BDR/AE job postings
2. **Parallel** - Enrich with company size, revenue, employee count
3. **Exa** - Find decision-makers (VP Sales, CRO) at those companies
4. **FullEnrich** - Get email addresses (bulk enrichment)
5. **Perplexity** - Research company and contacts for personalization
6. **Unipile** - Send outreach

**Why this order:**
- Sumble gives the strongest signal (hiring = budget + urgent need)
- Parallel adds firmographic validation
- Exa finds the right people
- FullEnrich gets contact info (bulk, async)
- Perplexity provides current personalization context
- Unipile handles delivery

### Scenario 2: "Find marketing agencies in healthcare"

**Solution:**
1. **Exa** - Find agencies specializing in healthcare
2. **Parallel** - Enrich with size, revenue, employee count
3. **Exa** - Find CMOs/Directors at target agencies
4. **FullEnrich** - Get emails (bulk enrichment)
5. **Perplexity** - Research each agency (clients, case studies, recent news)
6. **Unipile** - Send personalized outreach

**Why this order:**
- Exa best for qualitative ("specializing in healthcare")
- Parallel adds quantitative filters
- Rest follows standard workflow

### Scenario 3: "Create Permissionless Value for cosmetics manufacturers"

**Solution:**
1. **Exa** - Research industry trends and challenges
   - Query: "cosmetics manufacturing compliance challenges 2024"
2. **Firecrawl** - Extract real examples from industry sites
   - Get case studies with structured data
   - Extract specific problem descriptions and impacts
3. **Exa** - Find specific pain point examples
   - Query: "cosmetics manufacturers FDA regulatory issues"
4. **Exa** - Get case studies and data
   - Use summaries and highlights for insights
5. Use insights to create valuable content
6. **Exa** - Find target companies (cosmetics manufacturers)
7. Continue with standard workflow

**Why this approach:**
- Exa excels at research and insight gathering
- Firecrawl extracts structured data from websites
- Natural language queries surface relevant pain points
- Summaries provide quick value extraction

### Scenario 4: "Find companies like my best customer"

**Solution:**
1. **Exa** - Use findsimilar with customer's website
2. **Parallel** - Filter by similar size/revenue
3. **Firecrawl** - Deep research on top matches
   - Extract team structure, recent updates, key initiatives
4. **Exa** - Find decision-makers at matches
5. **Leadmagic** - Get emails
6. **Unipile** - Send outreach

**Why this approach:**
- Exa's findsimilar finds semantically similar companies
- Parallel ensures quantitative match
- Firecrawl provides deep context for personalization
- Rest follows standard workflow

### Scenario 5: "Compare competitor pricing and features"

**Solution:**
1. **Exa** - Find main competitors in space
   - Query: "companies similar to [your product]"
2. **Firecrawl** - Extract pricing from competitor sites
   - Get structured pricing data (plans, prices, features)
3. **Firecrawl** - Extract feature lists
   - Compare capabilities across competitors
4. Analyze gaps and differentiation opportunities
5. Use insights for positioning

**Why this approach:**
- Exa finds the right competitors
- Firecrawl efficiently extracts structured data from multiple sites
- Much faster than manual research
- Structured output enables easy comparison

---

## Decision Tree

```
Need to find something?
│
├─ Companies?
│  ├─ By qualitative traits? → Exa
│  ├─ By quantitative data? → Parallel
│  ├─ With hiring signals? → Sumble Jobs API
│  └─ Using specific tech? → Sumble (validate tech stack)
│
├─ People?
│  ├─ By role/context? → Exa
│  ├─ With detailed data? → Parallel
│  ├─ Email addresses (bulk)? → FullEnrich
│  └─ Email addresses (instant)? → Leadmagic
│
├─ Research?
│  ├─ News/trends? → Exa or Perplexity
│  ├─ Company information? → Perplexity
│  ├─ Contact background? → Perplexity
│  ├─ Company metrics? → Parallel
│  ├─ Tech stack? → Sumble
│  ├─ Job postings? → Sumble Jobs API
│  └─ Extract data from websites? → Firecrawl
│
├─ Extract from websites?
│  ├─ Pricing/features? → Firecrawl
│  ├─ Team information? → Firecrawl
│  ├─ Blog content? → Firecrawl
│  └─ Competitive comparison? → Firecrawl
│
└─ Send outreach?
   ├─ LinkedIn? → Unipile
   └─ Email? → Unipile
```

---

## Cost Considerations

| API | Typical Cost | When Expensive | How to Optimize |
|-----|--------------|----------------|-----------------|
| **Exa** | $$ - Moderate | Content extraction | Use summaries vs full text |
| **Perplexity** | $$ - Moderate | Per API call | Cache results, use for high-value research |
| **FullEnrich** | $$ - Moderate | Per contact (1-10 credits) | Use webhooks, batch up to 100 |
| **Firecrawl** | $$ - Moderate | Deep navigation, many sources | Provide URLs, set maxCredits |
| **Parallel** | $$ - Moderate | Many lookups | Batch operations |
| **TheirStack** | $ - Low | High volume | Filter carefully |
| **Sumble** | $$ - Moderate | Many enrichments | Only enrich qualifed leads |
| **Leadmagic** | $ - Low | Verification | Only verify targets |
| **Unipile** | $$$ - High | High volume | Respect rate limits |

**General Rule:** Discovery (Exa, TheirStack) → Research (Perplexity) → Enrichment (Parallel, Sumble, FullEnrich, Leadmagic, Firecrawl) → Action (Unipile)

Do cheap discovery first, enrich only qualified leads, act only on best matches.

---

## Quick Lookup Table

| I need to... | Use... |
|--------------|--------|
| Find companies by culture/focus | Exa |
| Find companies by size/revenue | Parallel |
| Find companies that are hiring | Sumble Jobs API |
| Find companies hiring for specific tech | Sumble Jobs API |
| Find companies like [example] | Exa (findsimilar) |
| Validate tech stack at company | Sumble Enrichment API |
| Find decision-makers | Exa or Parallel |
| Find email addresses (bulk) | FullEnrich |
| Find email addresses (instant) | Leadmagic |
| Enrich contacts at scale | FullEnrich |
| Research company information | Perplexity |
| Research contact background | Perplexity |
| Research company news | Exa or Perplexity |
| Understand industry trends | Exa or Perplexity |
| Extract pricing from websites | Firecrawl |
| Extract features from websites | Firecrawl |
| Extract team info from websites | Firecrawl |
| Compare competitors | Firecrawl |
| Pre-outreach deep research | Firecrawl |
| Get company firmographics | Parallel |
| Get technology usage data | Sumble |
| Get detailed job posting info | Sumble Jobs API |
| Send LinkedIn messages | Unipile |
| Send emails | Unipile |
| Manage inbox/replies | Unipile |

---

## API Strengths Summary

### Exa 🔍
**Strength:** Discovery by meaning
- Natural language understanding
- Qualitative criteria
- Research and insights

### Firecrawl 🌐
**Strength:** Website data extraction
- AI-powered scraping without code
- Structured output with schemas
- Autonomous navigation
- Parallel multi-site processing

### Parallel 📊
**Strength:** Quantitative data
- Precise firmographics
- Company metrics
- People data

### Sumble 💼
**Strength:** Hiring signals & tech intelligence
- Job posting search (PRIMARY USE)
- Technology stack validation
- People using specific tech
- Hiring trends

### Perplexity 🔍
**Strength:** AI-powered web research
- Real-time web search with citations
- Company and contact research
- Current information and trends
- Competitive intelligence

### FullEnrich 📧
**Strength:** Contact enrichment at scale
- Bulk email finding (up to 100 contacts)
- Mobile phone numbers
- Personal emails
- Asynchronous with webhooks
- LinkedIn URL improves results

### Leadmagic 📧
**Strength:** Email finding (instant)
- Find work emails
- Email verification
- High deliverability
- Synchronous lookups

### Unipile 📤
**Strength:** Outreach delivery
- LinkedIn automation
- Email sending
- Inbox management

---

**Remember:** Use the right tool for each job. Don't force Exa to do quantitative filtering or Parallel to do qualitative discovery.

