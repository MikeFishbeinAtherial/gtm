# Sumble Strategy Update

## The Problem

1. **Sumble API Format**: We were using wrong format - got 400 errors
2. **Company Name vs Domain**: Sumble needs domain for organization search, but we only have company names
3. **Credit Efficiency**: Searching each company individually is expensive

## The Solution

### New Strategy: Broad Search + Filter

Instead of searching each company individually:

1. **One broad search** for all sales roles:
   ```json
   {
     "filters": {
       "query": "sales OR SDR OR BDR OR account executive OR sales manager"
     },
     "limit": 100
   }
   ```

2. **Filter results** in our code:
   - Match by company name
   - Filter by date (last 2 months)
   - Limit to 2 jobs per company

3. **Group by company** to avoid duplicate API calls:
   - Check each unique company once
   - Apply results to all connections from that company

### Why This Works Better

**Old Approach:**
- 910 companies × 1 API call each = 910 calls
- Each call might return 0-2 jobs = 0-1820 credits
- Very expensive!

**New Approach:**
- 1 broad search = 1 API call
- Returns up to 100 jobs = ~300 credits
- Filter in code = free
- Much more efficient!

### Credit Usage

**Before:** Up to 910 × 6 credits = 5,460 credits max

**After:** 1 search × ~300 credits = ~300 credits total

**Savings:** ~95% reduction in API costs!

## API Format (Correct)

```json
{
  "filters": {
    "query": "sales OR SDR OR BDR OR account executive"
  },
  "limit": 100
}
```

**Note:** Can't combine Query with Filters (technologies, since, etc.). We filter by date in our code instead.

## Implementation

The filter script now:
1. Groups connections by company
2. Makes ONE broad search for sales roles
3. Filters results by:
   - Company name match
   - Date (last 2 months)
   - Sales role keywords
4. Limits to 2 jobs per company
5. Saves to database for all connections from that company

## Date Handling

LinkedIn CSV includes both:
- "31 Dec 2025" 
- "01 Jan 2026"

The script now searches for connections from 2025-01-01 to 2026-12-31 to catch both.
