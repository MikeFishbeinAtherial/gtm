# Task API Enrichment - What Data We're Getting

## Overview

When FindAll finds a matched company, it **automatically uses Task API** to extract structured enrichments. This is why Task API costs $15.50 vs FindAll Filter's $1.29.

---

## What Data Task API Extracts

### 1. **Basic Company Information**
```json
{
  "name": "Acme Capital Management",
  "domain": "acmecapital.com",
  "website": "https://acmecapital.com",
  "linkedin_url": "https://linkedin.com/company/acme-capital",
  "linkedin_id": "123456"
}
```

### 2. **Company Metrics**
```json
{
  "employee_count": 25,
  "employee_range": "11-50",
  "annual_revenue_usd": null,  // If available
  "aum": "150000000",  // Assets Under Management (for finance firms)
  "founded_year": 2015
}
```

### 3. **Location Data**
```json
{
  "location": "New York, NY",
  "city": "New York",
  "state": "NY",
  "country": "United States",
  "country_code": "US",
  "headquarters": "New York, NY"
}
```

### 4. **Company Descriptions**
```json
{
  "description": "Acme Capital is a quantitative hedge fund specializing in...",
  "about": "Full company about page content...",
  "long_description": "Detailed company description from LinkedIn or website...",
  "seo_description": "SEO-optimized description..."
}
```

### 5. **Match Evidence & Reasoning**
```json
{
  "match_reasoning": "Company matches criteria because:\n1) LinkedIn description contains 'hedge fund'\n2) Job posting from 6 months ago for 'Head of Data'\n3) Company website mentions 'Snowflake' in tech stack",
  "match_status": "matched",
  "confidence_score": "high",
  "citations": [
    {
      "url": "https://linkedin.com/company/acme-capital",
      "title": "Acme Capital Management | LinkedIn",
      "excerpt": "Acme Capital is a quantitative hedge fund...",
      "publish_date": "2024-01-15"
    },
    {
      "url": "https://acmecapital.com/careers",
      "title": "Careers - Acme Capital",
      "excerpt": "We're hiring a Head of Data to lead our AI initiatives...",
      "publish_date": "2024-07-20"
    }
  ]
}
```

### 6. **Technology Stack Mentions** (if found)
```json
{
  "technologies_mentioned": [
    "Snowflake",
    "Python",
    "Machine Learning"
  ],
  "tech_stack_evidence": "Job description mentions 'Snowflake' and 'Python'"
}
```

### 7. **Job Posting Signals** (if found)
```json
{
  "recent_jobs": [
    {
      "title": "Head of Data",
      "posted_date": "2024-07-20",
      "url": "https://acmecapital.com/careers/head-of-data"
    }
  ],
  "hiring_signals": "Currently hiring for data leadership roles"
}
```

---

## Why This Costs $15.50 (Task API)

**Task API does deep research** for each matched company:

1. **Visits company website** - Extracts full content
2. **Checks LinkedIn page** - Gets company profile, employee count, description
3. **Searches job boards** - Finds relevant job postings
4. **Extracts structured data** - Parses and structures information
5. **Validates across sources** - Cross-references data for accuracy
6. **Provides citations** - Links back to source material
7. **Generates reasoning** - Explains why company matched

**Cost per company:** ~$0.21 ($15.50 / ~73 companies)

**Value:** You get verified, structured data ready for outreach - not just company names.

---

## What We're NOT Getting (That We Could)

Task API can extract more if we specify `enrich_fields`:

- **Key people** (founders, executives)
- **Recent news/press releases**
- **Funding information**
- **Technology stack details**
- **Competitive intelligence**

But we're not requesting these, so we're only getting the **default enrichments** (domain, LinkedIn, basic company info, match reasoning).

---

## How to Get More Companies for Less Cost

### Option 1: Use Base Generator (Recommended)
- **Cost:** ~$0.06 per 1000 companies (vs $0.23 for core)
- **Enrichment:** Still uses Task API but less comprehensive
- **Result:** ~4x more companies for the same budget

### Option 2: Accept Less Enrichment
- Task API will still run, but with `base` generator it does less deep research
- Still gets: Domain, LinkedIn, basic company data
- Less: Detailed reasoning, extensive citations

### Option 3: Can't Disable Task API
**FindAll always uses Task API** for matched entities. There's no way to disable enrichment - it's part of the FindAll pipeline.

---

## Current Data Quality

Based on $16.79 spent:
- **~73 companies found**
- **Each enriched with:**
  - ✅ Domain (for email finding)
  - ✅ LinkedIn URL (for outreach)
  - ✅ Employee count (for sizing)
  - ✅ Location (for targeting)
  - ✅ Match reasoning (for personalization)
  - ✅ Citations (for verification)

**This is actually good value** - you're getting ready-to-use company data, not just names.
