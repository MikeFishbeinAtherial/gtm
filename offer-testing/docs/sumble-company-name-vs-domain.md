# Sumble: Company Name vs Domain

## The Question

**Does Sumble need a domain, or is company name enough?**

## Answer: Domain is Preferred, But Query Search Works with Company Name

### Sumble API Organization Search

According to the Sumble API docs, the `organization` parameter accepts:
- ✅ **Domain** (preferred) - `{ domain: "stripe.com" }`
- ✅ **ID** - `{ id: 12345 }`
- ✅ **Slug** - `{ slug: "stripe" }`
- ❌ **Name** - Company name alone is NOT directly supported

### Our Solution: Query Search

Since we only have company names from LinkedIn CSV, we use **query search** instead:

```typescript
await sumble.findJobs({
  filters: {
    query: "CompanyName (sales OR SDR OR BDR OR account executive)"
  },
  limit: 2
})
```

**How it works:**
1. Sumble searches all job postings
2. Filters by the query terms (company name + sales keywords)
3. Returns matching jobs
4. We then filter results to only include jobs from the target company

**Pros:**
- ✅ Works with company name (no domain needed)
- ✅ Still finds relevant jobs
- ✅ Flexible - can add more keywords

**Cons:**
- ⚠️ Might return jobs from similar company names
- ⚠️ Less precise than domain search
- ⚠️ We filter results to match company name

### Better Approach (Future Enhancement)

If you want more accuracy, you could:

1. **Enrich company names to domains** using Parallel API:
   ```typescript
   const company = await parallel.searchCompanies({ name: "Stripe" })
   const domain = company.domain // "stripe.com"
   ```

2. **Then use domain search in Sumble:**
   ```typescript
   await sumble.findJobs({
     organization: { domain: "stripe.com" },
     filters: { since: "2024-12-01" },
     limit: 2
   })
   ```

**For now:** Query search works fine and doesn't require additional API calls.

## Credit Usage

**Current setup:**
- Limit: 2 jobs per company
- Cost: 3 credits per job = **6 credits max per company**
- If 100 companies: ~600 credits max

**If we enriched with domains first:**
- Parallel enrichment: ~1 credit per company
- Sumble with domain: 6 credits per company
- Total: ~7 credits per company
- If 100 companies: ~700 credits

**Verdict:** Query search is actually more cost-effective for this use case!

## Current Implementation

The filter script (`filter-2025-connections.js`) uses query search:

```javascript
jobs = await sumbleFindJobs({
  filters: {
    query: `${companyName} (sales OR SDR OR BDR OR "account executive" OR "sales manager")`
  },
  limit: 2
})

// Filter to only this company's jobs
jobs.jobs = jobs.jobs.filter(job => 
  job.organization_name?.toLowerCase().includes(companyName.toLowerCase())
)
```

This works well and saves credits compared to enriching domains first.
