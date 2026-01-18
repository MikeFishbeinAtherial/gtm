# Parallel FindAll Task API Enrichment - Explained

## How FindAll Uses Task API

FindAll has a **3-stage pipeline**:

### Stage 1: Generate Candidates (FindAll Filter - $1.29)
- Searches web index for potential entities matching your query
- Generates candidate companies dynamically
- **Cost:** ~$0.06-1.43 per 1000 companies (depending on generator)

### Stage 2: Evaluate Match Conditions (FindAll Filter)
- Each candidate is evaluated against your match conditions
- Uses multi-hop reasoning across web sources
- Only candidates that satisfy ALL conditions reach "matched" status
- **Cost:** Included in Stage 1

### Stage 3: Extract Structured Enrichments (Task API - $15.50)
**This is where Task API is automatically used.**

For each **matched** entity, FindAll automatically orchestrates Task API to extract:
- **Basic attributes:** Domain, LinkedIn URL, employee count, revenue, AUM
- **Company descriptions:** Long description, SEO description
- **Location data:** City, state, country, headquarters
- **Match evidence:** Reasoning for why they matched, citations
- **Confidence scores:** How confident Parallel is in the match

**Cost:** ~$0.10-0.50 per company (Task API pricing)

---

## What Data Are We Getting from Task API?

For each matched company, Task API extracts:

### Core Company Data
```json
{
  "name": "Acme Capital Management",
  "domain": "acmecapital.com",
  "linkedin_url": "https://linkedin.com/company/acme-capital",
  "employee_count": 25,
  "location": "New York, NY",
  "description": "Acme Capital is a quantitative hedge fund..."
}
```

### Match Evidence
```json
{
  "match_reasoning": "Company matches criteria because: 1) LinkedIn shows 'hedge fund' in description, 2) Job posting from 6 months ago for 'Head of Data', 3) Company website mentions 'Snowflake' in tech stack",
  "citations": [
    {
      "url": "https://linkedin.com/company/acme-capital",
      "excerpt": "Acme Capital is a quantitative hedge fund..."
    },
    {
      "url": "https://acmecapital.com/careers",
      "excerpt": "We're hiring a Head of Data to lead our AI initiatives..."
    }
  ],
  "confidence_score": "high"
}
```

### Enrichments (if specified)
- Revenue, AUM, funding stage
- Technology stack mentions
- Recent news/press releases
- Key people (if requested)

---

## Why Task API Costs So Much ($15.50 vs $1.29)

**Task API is doing deep research** for each matched company:
1. Visits company website
2. Checks LinkedIn page
3. Searches for job postings
4. Extracts structured data
5. Validates information across multiple sources
6. Provides citations and reasoning

**This is valuable** because you get:
- ✅ Verified company domains (not just names)
- ✅ LinkedIn URLs for outreach
- ✅ Employee counts for sizing
- ✅ Evidence for why they match (for personalization)
- ✅ Citations for fact-checking

**But it's expensive** - ~$0.21 per company ($15.50 / ~73 companies)

---

## How to Minimize Task API Usage

### Option 1: Use "Preview" Generator (Cheapest)
- **Generator:** `preview`
- **What it does:** Returns ~10 candidates, minimal enrichment
- **Cost:** Very low (just filtering)
- **Downside:** Limited results, basic data only

### Option 2: Use "Base" Generator (Cheaper)
- **Generator:** `base`
- **Cost:** ~$0.06 per 1000 companies
- **Enrichment:** Still uses Task API but less comprehensive
- **Good balance:** Lower cost, still gets domains/LinkedIn

### Option 3: Disable Enrichments (Not Possible)
**FindAll always uses Task API** for matched entities. There's no way to disable it.

### Option 4: Use FindAll Filter Only (Not Available)
The filtering stage ($1.29) and enrichment stage ($15.50) are bundled together.

---

## Recommendation: Use Base Generator

For finding more companies cost-effectively:

1. **Use `base` generator** instead of `core` or `pro`
   - Cost: ~$0.06 per 1000 companies (vs $0.23 for core)
   - Still gets: Domain, LinkedIn, basic company data
   - Less comprehensive enrichment (saves money)

2. **Run more queries** with `base` generator
   - You can run ~4x more queries for the same cost
   - Get more companies, less enrichment per company

3. **Enrich later** if needed
   - Use Task API separately for high-value prospects only
   - Don't enrich every company upfront

---

## Current Situation

**What happened:**
- FindAll Filter found companies: $1.29
- Task API enriched them: $15.50
- **Total: $16.79 for ~73 companies**

**What we got:**
- Company names, domains, LinkedIn URLs
- Employee counts, locations
- Match reasoning and citations
- Structured data ready for outreach

**What we need to do:**
1. Retrieve results from Parallel API
2. Save companies to Supabase
3. For future runs, use `base` generator to get more companies for less cost
