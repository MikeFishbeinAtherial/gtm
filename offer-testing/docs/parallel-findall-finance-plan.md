# Parallel FindAll API - Finance Company Discovery Plan

## Overview

Use Parallel's **FindAll API** to discover finance companies matching our ICP using natural language queries. FindAll is perfect for this because it:
- Finds entities (companies) based on complex multi-criteria queries
- Evaluates match conditions using multi-hop reasoning
- Extracts structured enrichments automatically
- Provides citations and confidence scores

**Cost:** ~$0.06-1.43 per 1000 companies found (depending on generator: base/core/pro)

---

## ICP Summary

### Target Companies

**Primary Target 1: Small-to-Mid Hedge Funds**
- **Size:** $10M-$500M AUM
- **Signals:** AI/data leadership, data infrastructure investment
- **Pain:** Manual research can't compete with AI-powered competitors

**Primary Target 2: Mid-Market Private Equity Firms**
- **Size:** $100M-$2B AUM
- **Signals:** Technical leadership, data infrastructure
- **Pain:** Traditional sourcing only reaches 16.5% of deals

### Maturity Signals (Readiness)
- Companies hiring AI/data leadership (Head of AI, Chief Data Officer, Head of Data)
- Companies using data infrastructure (Snowflake, Databricks, dbt, LLMs)
- Companies with technical leadership roles

### Pain Signals (Problem)
- Companies hiring manual research roles (Research Analyst, Investment Analyst)
- Companies hiring deal sourcing roles (Deal Sourcing Analyst, Sourcing Analyst)

---

## FindAll Query Strategy

### Query 1: Maturity Signals - Hedge Funds with AI/Data Leadership

**Objective:**
```
Find all small-to-mid hedge funds ($10M-$500M AUM) in the United States that have hired AI/data leadership roles or are investing in data infrastructure
```

**Entity Type:** `companies`

**Match Conditions:**

1. **Hedge Fund Type Check**
   - Description: "Company must be a hedge fund, alternative investment fund, or investment management firm. Look for keywords in company description: 'hedge fund', 'alternative investment', 'investment management', 'asset management'. Exclude banks, credit unions, insurance companies, and mortgage lenders."

2. **AUM Size Check**
   - Description: "Company must have Assets Under Management (AUM) between $10M and $500M. Look for AUM information in company descriptions, LinkedIn pages, SEC filings, or fund databases. If AUM is not explicitly stated but company has 5-50 employees and describes itself as a 'small' or 'mid-sized' fund, consider requirement satisfied."

3. **AI/Data Leadership Check**
   - Description: "Company must have hired for AI/data leadership roles in the past 2 years. Look for job postings, LinkedIn profiles, or press releases mentioning: 'Head of AI', 'Chief Data Officer', 'CDO', 'Head of Data', 'Director of Data', 'VP Data', 'AI Engineer', 'Machine Learning Engineer', 'Data Scientist', 'Quantitative Research'. Evidence can be from job boards, company career pages, or LinkedIn company updates."

4. **Data Infrastructure Check**
   - Description: "Company must be using or investing in data infrastructure. Look for mentions of: 'Snowflake', 'Databricks', 'dbt', 'BigQuery', 'Redshift', 'Airflow', 'LLM', 'large language model', 'machine learning', 'NLP', 'vector database'. Evidence can be from job descriptions, tech stack mentions, or company blog posts."

5. **US Location Check**
   - Description: "Company headquarters must be in the United States. Look for location information in company descriptions, LinkedIn pages, or contact pages."

**Generator:** `core` (good balance of recall and cost)

**Match Limit:** 200 (we can run multiple queries with different criteria)

---

### Query 2: Maturity Signals - PE Firms with Technical Leadership

**Objective:**
```
Find all mid-market private equity firms ($100M-$2B AUM) in the United States that have technical leadership or data infrastructure investment
```

**Entity Type:** `companies`

**Match Conditions:**

1. **Private Equity Type Check**
   - Description: "Company must be a private equity firm, buyout firm, or growth equity firm. Look for keywords: 'private equity', 'buyout', 'growth equity', 'PE firm'. Exclude venture capital firms, banks, and credit unions."

2. **AUM Size Check**
   - Description: "Company must have Assets Under Management (AUM) between $100M and $2B. Look for AUM in company descriptions, fund announcements, or industry databases. If AUM is not stated but company has 10-100 employees and describes itself as 'mid-market', consider requirement satisfied."

3. **Technical Leadership Check**
   - Description: "Company must have hired for technical roles in the past 2 years. Look for: 'CTO', 'Head of Technology', 'VP Technology', 'Technology Director', 'Data Engineer', 'Platform Engineer', 'Automation Engineer'. Evidence from job postings, LinkedIn, or press releases."

4. **Data Infrastructure Check**
   - Description: "Company must mention using data infrastructure tools or AI. Look for: 'Snowflake', 'Databricks', 'dbt', 'LLM', 'AI', 'machine learning', 'data platform'. Evidence from job descriptions or company pages."

5. **US Location Check**
   - Description: "Company headquarters must be in the United States."

**Generator:** `core`

**Match Limit:** 200

---

### Query 3: Pain Signals - Hedge Funds Hiring Manual Research Roles

**Objective:**
```
Find all small-to-mid hedge funds ($10M-$500M AUM) in the United States that are currently hiring for manual research or analysis roles
```

**Entity Type:** `companies`

**Match Conditions:**

1. **Hedge Fund Type Check**
   - Description: "Company must be a hedge fund, alternative investment fund, or investment management firm. Exclude banks, credit unions, insurance companies."

2. **AUM Size Check**
   - Description: "Company must have AUM between $10M and $500M."

3. **Active Hiring Check**
   - Description: "Company must have posted job openings in the past 6 months for research or analysis roles. Look for job titles: 'Research Analyst', 'Investment Analyst', 'Equity Research', 'Research Associate', 'Investment Research'. Evidence from LinkedIn Jobs, company career pages, or job boards."

4. **US Location Check**
   - Description: "Company headquarters must be in the United States."

**Generator:** `base` (cheaper, still good recall for this simpler query)

**Match Limit:** 200

---

### Query 4: Pain Signals - PE Firms Hiring Deal Sourcing Roles

**Objective:**
```
Find all mid-market private equity firms ($100M-$2B AUM) in the United States that are currently hiring for deal sourcing or business development roles
```

**Entity Type:** `companies`

**Match Conditions:**

1. **Private Equity Type Check**
   - Description: "Company must be a private equity firm, buyout firm, or growth equity firm."

2. **AUM Size Check**
   - Description: "Company must have AUM between $100M and $2B."

3. **Deal Sourcing Hiring Check**
   - Description: "Company must have posted job openings in the past 6 months for deal sourcing or business development roles. Look for: 'Deal Sourcing', 'Sourcing Analyst', 'Business Development', 'Deal Origination', 'Investment Sourcing'. Evidence from LinkedIn Jobs or company career pages."

4. **US Location Check**
   - Description: "Company headquarters must be in the United States."

**Generator:** `base`

**Match Limit:** 200

---

## Implementation Plan

### Phase 1: Update Parallel Client

1. **Add FindAll API support** to `src/lib/clients/parallel.ts`
   - Implement `findCompanies()` method
   - Add polling for async results
   - Handle different generator types (base/core/pro)

### Phase 2: Create Discovery Script

2. **Create `scripts/find-finance-companies-parallel.ts`**
   - Run all 4 FindAll queries
   - Process results and deduplicate
   - Classify companies (hedge_fund vs private_equity)
   - Assess maturity tier (high/medium/low)
   - Save to Supabase `companies` table
   - Link to `finance-leadgen-1000` campaign

### Phase 3: Data Processing

3. **Extract structured enrichments:**
   - Company name, domain, LinkedIn URL
   - AUM (if available)
   - Employee count
   - Location
   - Evidence of signals (job postings, tech stack mentions)
   - Citations and confidence scores

4. **Deduplication:**
   - Match against existing companies by domain
   - Skip companies already in database

5. **Segmentation:**
   - Classify as `hedge_fund`, `private_equity`, or `asset_manager`
   - Assess maturity tier based on signals found
   - Store signal evidence in `signals` JSON field

### Phase 4: Integration

6. **Combine with existing TheirStack approach:**
   - Use FindAll for discovery (broader coverage)
   - Use TheirStack for validation (job posting signals)
   - Use Exa for contact finding (after companies are identified)

---

## Expected Results

**Coverage:**
- FindAll Base: ~30% recall (finds 30% of all matching companies)
- FindAll Core: ~52% recall (finds 52% of all matching companies)
- FindAll Pro: ~61% recall (finds 61% of all matching companies)

**Cost Estimate:**
- Base: $0.06 per 1000 companies
- Core: $0.23 per 1000 companies
- Pro: $1.43 per 1000 companies

**For 1000 companies:**
- Base: ~$60
- Core: ~$230
- Pro: ~$1,430

**Recommendation:** Use `core` for maturity queries (better recall worth the cost), `base` for pain queries (simpler criteria).

---

## Advantages Over TheirStack

1. **Natural Language Queries:** Easier to express complex criteria
2. **Multi-Hop Reasoning:** Evaluates multiple conditions together
3. **Structured Enrichments:** Automatically extracts company details
4. **Citations:** Every data point has source attribution
5. **Coverage:** Finds companies that don't have active job postings

## Disadvantages

1. **Cost:** More expensive than TheirStack (but better recall)
2. **Speed:** 15-30 seconds per query (vs instant for TheirStack)
3. **Less Real-Time:** May miss very recent job postings

## Best Strategy: Hybrid Approach

1. **FindAll:** Initial discovery (broader coverage, finds companies without active hiring)
2. **TheirStack:** Validation and recent signals (job postings from last 365 days)
3. **Exa:** Contact finding (after companies identified)
4. **FullEnrich:** Email enrichment (after contacts found)

---

## Next Steps

1. ✅ Review FindAll API documentation
2. ⏳ Update Parallel client with FindAll support
3. ⏳ Create discovery script
4. ⏳ Test with small match_limit (10-20 companies)
5. ⏳ Run full queries and import to Supabase
6. ⏳ Compare results with TheirStack approach
7. ⏳ Combine datasets and deduplicate
