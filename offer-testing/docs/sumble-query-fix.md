# Sumble Query Format Fix

## Issue

Sumble API was returning 400 errors: "Invalid query. Go to sumble.com, apply a filter and click on the API button to see the generated query."

## Root Cause

The query format was too complex. Sumble's query filter expects simple text, not complex boolean operators like `(sales OR SDR OR BDR)`.

## Solution

Use a simpler query format:

**Before (❌ Invalid):**
```javascript
filters: {
  query: "CompanyName (sales OR SDR OR BDR OR account executive)"
}
```

**After (✅ Valid):**
```javascript
filters: {
  query: "CompanyName sales"
}
```

Then filter the results in code to match sales job titles.

## Updated Implementation

The filter script now:
1. Uses simple query: `"CompanyName sales"`
2. Gets up to 2 jobs (saves credits)
3. Filters results in JavaScript to match sales job titles
4. Saves only sales-related jobs to database

This approach:
- ✅ Works with Sumble's API
- ✅ Still finds sales jobs
- ✅ Limits to 2 jobs per company (6 credits max)
- ✅ More reliable than complex queries
