# Company Fit Signals Guide

## Overview

This guide explains what signals we track for each company and how to understand why a company is a good fit for outreach.

---

## Database Schema: What We Store

### Companies Table Columns

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `name` | TEXT | Company name | "Numerai" |
| `domain` | TEXT | Normalized domain | "numer.ai" |
| `vertical` | TEXT | Company type | "hedge_fund", "private_equity" |
| `source_tool` | TEXT | How we found them | "parallel_findall", "sumble" |
| `source_query` | TEXT | Query that found them | "hedge_funds_broad" |
| `signals` | JSONB | Structured signals | See below |
| `source_raw` | JSONB | Raw API responses | See below |
| `fit_score` | INTEGER | 1-10 fit score | 8 |
| `fit_reasoning` | TEXT | Why this score | "AI leadership + hiring" |

---

## Signals We Track

### 1. Parallel FindAll Signals (from `source_raw.parallel_findall`)

**Location:** `companies.source_raw.parallel_findall`

**What Parallel Returns:**

```json
{
  "match_status": "matched",
  "output": {
    "currently_hiring": true,
    "ai_data_leadership": true,
    "small_to_mid_size": true,
    "east_coast_location": true
  },
  "basis": [
    {
      "field": "ai_data_leadership",
      "reasoning": "The company recently hired a Head of AI...",
      "confidence": "high",
      "citations": [
        {
          "title": "Company Careers Page",
          "url": "https://...",
          "excerpts": ["Head of AI role posted..."]
        }
      ]
    }
  ]
}
```

**Key Signals from Parallel:**

- ✅ **`currently_hiring`** - Company has active job postings
- ✅ **`ai_data_leadership`** - Has AI/data leadership roles
- ✅ **`small_to_mid_size`** - Fits size criteria ($10M-$500M AUM)
- ✅ **`east_coast_location`** - Located in target geography
- ✅ **`technical_leadership`** - Hiring for technical roles
- ✅ **`deal_sourcing_hiring`** - Hiring deal sourcing roles (pain signal)

**How to Check:**
```sql
SELECT 
  name,
  source_raw->'parallel_findall'->'output'->>'currently_hiring' as hiring,
  source_raw->'parallel_findall'->'output'->>'ai_data_leadership' as ai_leadership
FROM companies
WHERE source_tool = 'parallel_findall';
```

---

### 2. Structured Signals (from `signals` JSONB)

**Location:** `companies.signals`

**What We Store:**

```json
{
  "company_type": "hedge_fund",
  "company_type_confidence": "high",
  "finance_fit": true,
  "parallel": {
    "signal_type": "maturity",
    "match_status": "matched",
    "output": { /* Parallel output */ },
    "basis": [ /* Parallel basis */ ]
  },
  "segment_guess": "hedge_fund",
  "maturity_tier": "unknown"
}
```

**Key Fields:**

- `company_type` - Classification (hedge_fund, private_equity, etc.)
- `finance_fit` - Boolean indicating if it's a finance firm
- `parallel.signal_type` - "maturity" or "pain" signal
- `parallel.match_status` - "matched", "unmatched", "generated"

---

### 3. Sumble Signals (from `source_raw`)

**Location:** `companies.source_raw` (for Sumble companies)

**What Sumble Provides:**

```json
{
  "lead_source": "sumble",
  "matching_job_post_count": 12,
  "matching_people_count": 80,
  "matching_team_count": 7,
  "linkedin_organization_url": "https://..."
}
```

**Key Signals:**

- `matching_job_post_count` - Number of job postings found
- `matching_people_count` - Number of people at company
- `matching_team_count` - Number of teams

---

## How to Understand Why a Company is a Good Fit

### Method 1: Use the Analysis Script

```bash
npx ts-node scripts/analyze-company-fit-signals.ts
```

This shows:
- Top companies by fit score
- All fit reasons for each company
- Signal breakdown across all companies
- Companies needing attention

### Method 2: Query Database Directly

**Find companies with specific signals:**

```sql
-- Companies with AI leadership (from Parallel)
SELECT name, domain, vertical
FROM companies
WHERE source_raw->'parallel_findall'->'output'->>'ai_data_leadership' = 'true'
  AND offer_id = (SELECT id FROM offers WHERE slug = 'finance');

-- Companies currently hiring (from Parallel)
SELECT name, domain, vertical
FROM companies
WHERE source_raw->'parallel_findall'->'output'->>'currently_hiring' = 'true'
  AND offer_id = (SELECT id FROM offers WHERE slug = 'finance');

-- Companies with high fit scores
SELECT name, domain, fit_score, fit_reasoning
FROM companies
WHERE fit_score >= 6
  AND offer_id = (SELECT id FROM offers WHERE slug = 'finance')
ORDER BY fit_score DESC;
```

### Method 3: Check Parallel Basis (Detailed Reasoning)

**See detailed reasoning from Parallel:**

```sql
SELECT 
  name,
  jsonb_pretty(source_raw->'parallel_findall'->'basis') as reasoning
FROM companies
WHERE source_tool = 'parallel_findall'
LIMIT 5;
```

This shows:
- Field-by-field reasoning
- Citations (sources Parallel used)
- Confidence levels
- Why each match condition passed/failed

---

## Signal Types Explained

### Maturity Signals (Readiness)

**What it means:** Company is ready for AI/data solutions

**Signals:**
- ✅ Has AI/data leadership (Head of AI, CDO, etc.)
- ✅ Using data infrastructure (Snowflake, Databricks, etc.)
- ✅ Technical leadership roles
- ✅ Recent tech hires

**Where stored:** `signals.parallel.signal_type = 'maturity'`

**Example companies:** Numerai, Jump Trading, DRW Trading

---

### Pain Signals (Problem)

**What it means:** Company has a problem we solve

**Signals:**
- ✅ Hiring manual research roles (Research Analyst)
- ✅ Hiring deal sourcing roles (Deal Sourcing Analyst)
- ✅ Hiring roles AI can replace/augment

**Where stored:** `signals.parallel.signal_type = 'pain'`

**Example companies:** Companies hiring Research Analysts, Deal Sourcing Analysts

---

## Fit Score Calculation

**Current scoring (from analysis script):**

- Parallel match conditions: +1-3 points each
- Verified finance type: +2 points
- Has contacts found: +1 point
- Found via Parallel FindAll: +1 point

**Score ranges:**
- 8-10: Excellent fit (strong signals)
- 5-7: Good fit (some signals)
- 3-4: Moderate fit (weak signals)
- 0-2: Low fit (needs review)

---

## What Parallel Provides vs What We Store

### Parallel FindAll Returns:

1. **Match Status** - Did company match all conditions?
2. **Output** - Structured match conditions (true/false)
3. **Basis** - Detailed reasoning with citations
4. **Citations** - Sources Parallel used (LinkedIn, company websites, etc.)

### We Store:

1. **Full raw response** → `source_raw.parallel_findall`
2. **Structured signals** → `signals.parallel`
3. **Match conditions** → `source_raw.parallel_findall.output`
4. **Reasoning** → `source_raw.parallel_findall.basis`

**Nothing is lost** - all Parallel data is preserved in `source_raw`.

---

## Recommendations for Better Visibility

### 1. Add Computed Columns (Views)

Create a view that extracts common signals:

```sql
CREATE VIEW company_signals_view AS
SELECT 
  id,
  name,
  domain,
  vertical,
  -- Extract Parallel signals
  source_raw->'parallel_findall'->'output'->>'currently_hiring' as is_hiring,
  source_raw->'parallel_findall'->'output'->>'ai_data_leadership' as has_ai_leadership,
  source_raw->'parallel_findall'->'output'->>'small_to_mid_size' as is_small_mid,
  -- Extract Sumble signals
  source_raw->>'matching_job_post_count' as job_post_count,
  -- Fit score
  fit_score,
  fit_reasoning
FROM companies;
```

### 2. Use Analysis Script Regularly

Run `analyze-company-fit-signals.ts` to get summaries:
- Top companies by fit
- Signal breakdown
- Companies needing attention

### 3. Review Parallel Basis

For companies you're unsure about, check `source_raw.parallel_findall.basis`:
- See exact reasoning
- Review citations
- Understand confidence levels

---

## Example: Why Numerai is a Good Fit

**From analysis script:**

```
Fit Score: 8
Fit Reasons:
  ✅ Has AI/data leadership (from Parallel)
  ✅ Small-to-mid sized firm (from Parallel)
  ✅ Located in target geography (from Parallel)
  ✅ hedge fund (verified type)
  ✅ Found via Parallel FindAll (AI-verified match)
```

**From Parallel basis:**
- "Numerai recently hired a former Meta AI researcher"
- "Assets under management have grown to $450M"
- "Allows thousands of data scientists to submit predictions"
- Citations: LinkedIn, company website, news articles

**Conclusion:** Strong fit - has AI leadership, right size, verified hedge fund.

---

## Next Steps

1. ✅ **Run analysis script** - See top companies by fit score
2. ✅ **Review Parallel basis** - Understand detailed reasoning
3. ✅ **Query by signals** - Find companies with specific signals
4. ✅ **Update fit scores** - Use analysis script to calculate scores
5. ✅ **Document fit reasoning** - Store in `fit_reasoning` column

---

## Questions?

- **"How do I see why a company is a good fit?"** → Run `analyze-company-fit-signals.ts`
- **"Where is Parallel's reasoning stored?"** → `source_raw.parallel_findall.basis`
- **"How do I find companies with specific signals?"** → Query `source_raw` JSONB fields
- **"What signals indicate hiring?"** → Check `output.currently_hiring` or `output.deal_sourcing_hiring`
