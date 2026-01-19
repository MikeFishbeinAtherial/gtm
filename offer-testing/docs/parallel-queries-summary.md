# Parallel FindAll Queries Summary

## Current Status
- **Total Companies:** 331
- **Target:** 1000
- **Remaining:** 669
- **Budget Remaining:** $10

---

## Queries Run So Far

### 1. Refined Queries (5 queries) - Very Strict
**Goal:** Find small-to-mid finance firms with specific signals (AI leadership, active hiring, etc.)

| Query Name | Matched | Total Candidates | Status |
|------------|---------|------------------|--------|
| hedge_funds_active_hiring_ai_leadership | 0 | ~16-43 | Too strict - no matches |
| pe_firms_active_hiring_technical | 0 | ~84 | Too strict - no matches |
| hedge_funds_hiring_research_analysts | 0 | ~25 | Too strict - no matches |
| pe_firms_hiring_deal_sourcing | 2 | ~51 | Found 2 companies |
| hedge_funds_active_hiring_ai_leadership (duplicate) | 0 | ~16 | Too strict - no matches |

**Total from refined queries:** 2 companies

**Why so few matches?**
- Multiple strict conditions (size + location + hiring + AI leadership) were too restrictive
- Many candidates generated but didn't match all conditions
- Example: KPMG was found but excluded (too large, not PE firm)

---

### 2. Broader Queries (1 query completed)
**Goal:** Find hedge funds and PE firms on East Coast with simpler criteria

| Query Name | Matched | Total Candidates | New Companies Added |
|------------|---------|------------------|---------------------|
| hedge_funds_broad | 100 | 143 | 4 |

**Why only 4 new companies?**
- 96 out of 100 were duplicates (already in database from previous queries)
- Filtered out non-finance firms
- Most companies were already found in earlier runs

**Script Status:** The `find-more-finance-companies.ts` script was supposed to run 3 queries but only completed 1 before stopping.

---

## Total Results from Parallel FindAll
- **Companies from Parallel:** 171 total
- **Companies from Sumble/CSV:** 160 total
- **Grand Total:** 331 companies

---

## What We've Learned

### What Works:
✅ **Broader queries** find more companies (100 matched vs 0-2)
✅ **Simple criteria** (firm type + location) is more effective
✅ **East Coast focus** is good (NY/PA preference)

### What Doesn't Work:
❌ **Too many conditions** (size + hiring + AI leadership + location) = 0 matches
❌ **Strict size filters** exclude too many companies
❌ **Duplicate problem** - many companies already in database

---

## Next Steps with $10 Budget

**Strategy:** Use different angles to find NEW companies (avoid duplicates)

### Option 1: Different Geography
- West Coast finance firms (CA, WA, OR)
- Midwest finance firms (IL, OH, MI)
- South finance firms (TX, FL, GA)

### Option 2: Different Firm Types
- Credit funds
- Real estate investment firms
- Family offices
- Fund of funds

### Option 3: Different Signals
- Recently funded companies (Series A/B)
- Companies with recent growth (headcount increase)
- Companies using specific tools (Snowflake, Databricks mentions)

### Option 4: Broader Nationwide Search
- Remove location restriction entirely
- Focus on firm type only
- Filter by size manually later

**Recommended:** Use Option 1 (different geography) + Option 2 (different firm types) to maximize new companies found.
