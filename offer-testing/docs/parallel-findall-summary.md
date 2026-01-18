# Parallel FindAll Results & Task API Explanation

## Summary: What Happened

**Cost Breakdown ($16.79):**
- **FindAll Filter:** $1.29 (found companies matching criteria)
- **Task API:** $15.50 (extracted structured data for ~73 companies)
- **Total:** $16.79

**Status:**
- ✅ Queries completed successfully
- ❌ Results not saved to database (scripts timed out)
- ⏳ Need to retrieve results using `findall_run_id`s

---

## What is Task API and Why $15.50?

### Task API = Deep Research & Data Extraction

**FindAll automatically uses Task API** in Stage 3 of its pipeline:

1. **Stage 1-2 (FindAll Filter - $1.29):** Finds companies matching your criteria
2. **Stage 3 (Task API - $15.50):** Extracts structured data for each matched company

### What Data Task API Extracts

For each matched company, Task API visits multiple sources and extracts:

**Core Company Data:**
- Company name, domain, website URL
- LinkedIn URL and LinkedIn company ID
- Employee count, employee range
- Location (city, state, country)
- Founded year, AUM (for finance firms)

**Company Descriptions:**
- Long description (from LinkedIn/website)
- SEO description
- About page content

**Match Evidence:**
- Reasoning for why company matched your criteria
- Citations linking to source material (LinkedIn, job boards, websites)
- Confidence score (high/medium/low)

**Example Output:**
```json
{
  "name": "Acme Capital Management",
  "domain": "acmecapital.com",
  "linkedin_url": "https://linkedin.com/company/acme-capital",
  "employee_count": 25,
  "location": "New York, NY",
  "match_reasoning": "Matches because: 1) LinkedIn shows 'hedge fund', 2) Job posting for 'Head of Data' 6 months ago, 3) Website mentions 'Snowflake'",
  "citations": [
    {
      "url": "https://linkedin.com/company/acme-capital",
      "excerpt": "Acme Capital is a quantitative hedge fund..."
    }
  ],
  "confidence_score": "high"
}
```

### Why It Costs So Much

**Task API does deep research per company:**
- Visits company website
- Checks LinkedIn page  
- Searches job boards
- Cross-references data
- Extracts structured information
- Provides citations

**Cost:** ~$0.21 per company ($15.50 / ~73 companies)

**Value:** You get verified, structured data ready for outreach - not just company names.

---

## How to Retrieve Your Results

### Step 1: Get Run IDs from Parallel Dashboard

1. Go to: https://platform.parallel.ai/
2. Check your API usage/logs for today (Jan 17, 2026)
3. Find the FindAll runs - they'll have IDs like: `findall_edf3c5902b584472982bcba2b0a15bb6`
4. Copy all the run IDs

### Step 2: Retrieve and Save Results

Run the retrieval script:

```bash
npx ts-node scripts/retrieve-parallel-results.ts --run-ids findall_xxx,findall_yyy,findall_zzz
```

The script will:
1. Fetch results from Parallel API
2. Process companies (dedupe, filter finance firms)
3. Save to Supabase `companies` table
4. Link to `finance-leadgen-1000` campaign
5. Save full raw data to JSON file
6. Show sample companies

---

## Focus: Getting More Companies with FindAll Only

### Current Setup (Using Core Generator)
- **Cost:** ~$0.23 per 1000 companies
- **With Task API:** ~$0.21 per company enrichment
- **Total:** ~$0.44 per company

### Better Approach: Use Base Generator
- **Cost:** ~$0.06 per 1000 companies (4x cheaper!)
- **With Task API:** Still ~$0.21 per company (can't disable)
- **Total:** ~$0.27 per company

**For $77 budget:**
- Core generator: ~175 companies
- Base generator: ~285 companies (63% more!)

### Updated Script Default

I've updated `find-finance-companies-parallel.ts` to use `base` generator by default:

```bash
# Uses base generator (cheaper, more companies)
npx ts-node scripts/find-finance-companies-parallel.ts --batch 200

# Or explicitly specify
npx ts-node scripts/find-finance-companies-parallel.ts --batch 200 --generator base
```

---

## What Data We're Getting (Task API Enrichments)

**For each matched company:**

✅ **Domain** - For email finding (FullEnrich)  
✅ **LinkedIn URL** - For LinkedIn outreach (Unipile)  
✅ **Employee Count** - For company sizing  
✅ **Location** - For geographic targeting  
✅ **Match Reasoning** - For personalized copy  
✅ **Citations** - For fact-checking  

**This is valuable data** - you're getting ready-to-use company information, not just names.

---

## Next Steps

1. **Retrieve existing results:** Get run IDs from dashboard and run retrieval script
2. **Run more queries:** Use `base` generator to get more companies for your $77 budget
3. **Review quality:** Check if companies match your ICP (hedge funds, PE firms with AI/data maturity)

**Estimated companies from $77 budget with base generator:** ~285 companies
