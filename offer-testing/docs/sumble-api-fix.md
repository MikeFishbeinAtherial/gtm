# Sumble API Fix - Query Format

## The Problem

The Sumble API was returning 400 errors:
```
"Invalid query. Go to sumble.com, apply a filter and click on the API button to see the generated query."
```

## Root Cause

We were using the wrong format. According to Sumble API docs:

**Wrong:**
```json
{
  "filters": {
    "query": "company sales"
  }
}
```

**Correct:**
The `filters` field can be either:
1. **Filters object**: `{ technologies: [], countries: [], since: "..." }`
2. **Query object**: `{ query: "..." }`

But we need to pass the Query object directly as `filters`, not nested.

## Solution

Since we only have company names (not domains), we:

1. **Search broadly** for sales roles across all companies:
   ```json
   {
     "filters": {
       "query": "sales OR SDR OR BDR OR account executive"
     },
     "filters": {
       "since": "2024-12-01"
     },
     "limit": 50
   }
   ```

2. **Filter results** by company name in our code

3. **Limit to 2 jobs** per company to save credits

## Updated Approach

**Before:** Try to search by company name (doesn't work without domain)

**After:** 
- Search for all sales jobs (broader search)
- Filter results to match company name
- Group by company to avoid duplicate API calls
- Limit to 2 jobs per company

**Credit Usage:**
- One search for sales jobs: ~3 credits per job returned
- If we get 50 jobs back: ~150 credits
- Then filter to companies we care about
- Much more efficient than searching each company individually!

## API Format

```json
{
  "filters": {
    "query": "sales OR SDR OR BDR OR account executive OR sales manager"
  },
  "filters": {
    "since": "2024-12-01"
  },
  "limit": 50
}
```

Wait, that's wrong - we can't have `filters` twice. Let me check the API docs again...

Actually, looking at the Sumble API schema:
- `filters` can be **either** a Filters object OR a Query object
- Query object: `{ query: "..." }`
- Filters object: `{ technologies: [], countries: [], since: "..." }`

We can't combine them. So we use Query for text search.

## Final Implementation

```javascript
// Search for sales roles (text search)
const jobs = await sumbleFindJobs({
  query: 'sales OR SDR OR BDR OR "account executive" OR "sales manager"',
  filters: {
    since: '2024-12-01'  // This won't work - can't mix Query and Filters
  },
  limit: 50
})
```

Actually, we need to use Query format only:

```javascript
const jobs = await sumbleFindJobs({
  query: 'sales OR SDR OR BDR AND since:2024-12-01',  // Include date in query
  limit: 50
})
```

Or just search and filter by date in our code.
