# ICP (Ideal Customer Profile) Framework

## What is an ICP?

A precise description of:
1. The **COMPANY** most likely to buy
2. The **PERSON** at that company who decides

A good ICP helps you:
- Find the right companies faster
- Write more relevant copy
- Avoid wasting time on bad fits
- Improve conversion rates

---

## Company Profile

### Firmographics

| Field | Description | Example |
|-------|-------------|---------|
| **Size** | Employee count range | 20-200 employees |
| **Revenue** | Annual revenue (if relevant) | $5M-$50M ARR |
| **Stage** | Business maturity | Growth stage (Series A-C) |
| **Geography** | Where they're located | US, UK, Canada |

### Industry/Vertical

| Category | Industries |
|----------|------------|
| **Primary verticals** | (be specific - "B2B SaaS" not just "Tech") |
| **Adjacent verticals** | (might work, worth testing) |
| **Excluded verticals** | (definitely not a fit) |

### Signals (How to Find Them)

These indicate they likely have the problem:

| Signal | Where to Find | Why It Matters |
|--------|---------------|----------------|
| Hiring for X role | TheirStack, LinkedIn | Indicates growth/need |
| Using Y tool | BuiltWith, tech mentions | Shows sophistication |
| Recently funded | Crunchbase, news | Has budget to spend |
| Posted about Z | LinkedIn, blog | Pain is top of mind |
| Company event | News, PR | Trigger for outreach |

### Disqualifiers

These indicate they're NOT a fit:

| Disqualifier | Why |
|--------------|-----|
| Too small (<10 employees) | Can't afford / no need |
| Too large (>10,000 employees) | Sales cycle too long |
| No sales team | Don't have the problem |
| Using direct competitor | Hard to switch |
| Non-profit / Government | Different buying process |

---

## Buyer Profile

### Titles (Decision Makers)

**Primary titles** (can sign the check):
- [ ] Title 1
- [ ] Title 2
- [ ] Title 3

**Secondary titles** (influencers):
- [ ] Title 1
- [ ] Title 2

### Seniority Level

- [ ] C-Level (CEO, CRO, CMO)
- [ ] VP (VP Sales, VP Marketing)
- [ ] Director
- [ ] Manager
- [ ] Individual Contributor

### Department

- [ ] Sales
- [ ] Marketing
- [ ] Engineering
- [ ] Operations
- [ ] HR / People
- [ ] Finance
- [ ] Product

### Pain Points They Feel

What keeps them up at night:

1. [Pain point 1]
2. [Pain point 2]
3. [Pain point 3]

### Goals They Have

What they're trying to achieve:

1. [Goal 1]
2. [Goal 2]
3. [Goal 3]

### How They Buy

| Question | Answer |
|----------|--------|
| Solo decision or committee? | |
| Budget range | |
| Typical buying process | |
| Timeline (days to close) | |

---

## Search Queries

### Parallel API (Company Search)

```json
{
  "query": "B2B SaaS companies with sales teams hiring SDRs",
  "type": "company",
  "filters": {
    "employee_count": { "min": 20, "max": 200 },
    "industry": ["Software", "SaaS"],
    "location": ["United States"]
  }
}
```

### TheirStack (Job Posting Signals)

```json
{
  "job_titles": ["SDR", "Sales Development Representative", "BDR"],
  "company_size": { "min": 20, "max": 500 },
  "posted_within_days": 30
}
```

### Exa (AI-Powered Search)

```
"B2B SaaS companies Series A-C that are scaling their sales team"
```

### LinkedIn Sales Navigator Filters

| Filter | Value |
|--------|-------|
| Company headcount | 20-200 |
| Industry | Computer Software |
| Geography | United States |
| Keywords | [relevant terms] |

---

## ICP Scoring Rubric

Score each company 1-10 based on fit:

| Score | Description | Criteria |
|-------|-------------|----------|
| 9-10 | Perfect fit | All criteria match, strong signals |
| 7-8 | Great fit | Most criteria match, some signals |
| 5-6 | Okay fit | Some criteria match, worth trying |
| 3-4 | Weak fit | Few criteria match, low priority |
| 1-2 | Not a fit | Doesn't match, skip |

---

## Template Checklist

Before finalizing your ICP, verify:

- [ ] Company criteria are specific (not "tech companies")
- [ ] Signals are detectable (can actually find them)
- [ ] Disqualifiers are clear (saves time filtering)
- [ ] Buyer titles are decision-makers (not just users)
- [ ] Pain points are real (validated, not assumed)
- [ ] Search queries are testable (can run them today)

