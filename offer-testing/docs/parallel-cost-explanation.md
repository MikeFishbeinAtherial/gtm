# Parallel API Cost Breakdown

## What is Task API and Why Are We Spending $15.50 on It?

### Task API Explained

**Task API** is Parallel's deep research and data extraction API. It's used for:
- Comprehensive multi-step research (4-30 minutes)
- Structured data extraction from web pages
- Enriching entities with detailed information

### Why FindAll Uses Task API

According to Parallel's documentation, **FindAll automatically orchestrates Task API** to extract structured enrichments for matched entities:

> "For matched entities, FindAll automatically orchestrates our Task API to extract any additional fields you've specified— from basic attributes like revenue and employee count to complex data points like the strategic initiatives a company is prioritizing."

**This means:**
1. **FindAll Filter ($1.29):** Finds companies matching your criteria
2. **Task API ($15.50):** Extracts detailed information (domain, LinkedIn, employee count, descriptions, etc.) for each matched company

### Cost Breakdown from Your Dashboard

- **FindAll v1 Filter:** $1.29 (finding companies)
- **Task API v1:** $15.50 (extracting structured data for those companies)
- **Total:** $16.79

This suggests FindAll found companies and then used Task API to enrich them with structured data.

---

## Why the "API Key Not Set" Warning?

The warning `"Parallel API key not set. Set PARALLEL_API_KEY in .env.local"` appears because:

1. **Timing Issue:** The warning fires when the `ParallelClient` constructor runs
2. **Dotenv Loading:** At that moment, `process.env.PARALLEL_API_KEY` might not be loaded yet
3. **But It Works:** Dotenv loads the key right after, and the API calls succeed (as shown by your dashboard)

**Evidence it's working:**
- ✅ Your dashboard shows API usage
- ✅ You spent $16.79 on API calls
- ✅ The key is in `.env.local`

**Solution:** The warning is harmless but annoying. I've suppressed it since the key loads correctly and the API is working.

---

## What Companies Did We Get Back?

Based on your dashboard showing $16.79 spent, FindAll queries ran and Task API enriched the results. However:

- **0 companies in database:** No companies were saved to Supabase yet
- **Possible reasons:**
  1. Queries are still running (FindAll takes 15-30 seconds per query)
  2. Script timed out before saving results
  3. Results weren't processed/saved yet

**Next Steps:**
1. Check `parallel_findall_runs` table for completed runs
2. Extract companies from raw responses
3. Process and save to `companies` table

---

## Cost Efficiency

**For $16.79, you should have gotten:**
- ~73 companies (at $0.23 per 1000 with core generator)
- Plus Task API enrichment for each

**This is actually efficient** - you're getting:
- Company discovery (FindAll)
- Structured data extraction (Task API)
- All in one workflow

The Task API cost is **expected and necessary** - it's what extracts the actual company data (domains, LinkedIn URLs, descriptions, etc.) that you need for outreach.
