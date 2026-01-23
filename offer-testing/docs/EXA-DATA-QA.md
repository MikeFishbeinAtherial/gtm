# Exa Data Q&A

## Answers to Your Questions

### 1. Are the 53 companies from both searches?
**Yes.** The script ran TWO searches:
- "hedge fund with 10-100 employees in East Coast United States" (50 results)
- "investment management firm with 10-100 employees in East Coast United States" (50 results)

Then deduplicated by URL → 53 unique companies.

**But:** You only want hedge funds, so I've updated the script to search ONLY hedge funds now.

---

### 2. Table Name
**All companies go into ONE table:** `companies`

- Companies from Parallel → `companies` table (source_tool = 'parallel')
- Companies from Exa → `companies` table (source_tool = 'exa')
- Companies from TheirStack → `companies` table (source_tool = 'theirstack')
- Companies from CSV → `companies` table (source_tool = 'csv')

**All contacts go into:** `contacts` table
- Links to companies via `company_id`
- Links to offers via `offer_id`

---

### 3. LinkedIn Profiles
**✅ YES - All 104 contacts have LinkedIn URLs!**

Every contact found via Exa has a `linkedin_url` field populated. Perfect for LinkedIn outreach.

---

### 4. "East Coast Companies With More Than 100 Employees"?
**This was a BAD result** - it's a Crunchbase list page, not an actual company.

**Why it happened:** Exa's search returned a Crunchbase page that matched the query. The filtering wasn't strict enough.

**Fixed:** Updated the script to filter out:
- Crunchbase pages
- List pages
- Non-finance companies (audiology, contracting, etc.)
- Generic names like "Hedge Fund Management"

---

### 5. Only Hedge Funds
**Updated:** The script now searches ONLY for hedge funds (not investment management firms).

**New query:**
- "hedge fund with 10-100 employees in East Coast United States"

**Filtering:**
- Only saves companies with `vertical = 'hedge_fund'`
- Excludes bad keywords (lists, non-finance, etc.)

---

### 6. Examples of Good Companies
From the original 53, here are some that looked legitimate:

**Hedge Funds:**
- Cross Shore Capital Management, LLC
- Eagle Capital Management, LLC
- Stevens Capital Management LP
- Westfield Capital Management
- Millstreet Capital Management

**But many were mis-categorized** as `investment_firm` when they should be `hedge_fund`.

---

## What Happened

1. ✅ Found 53 companies (from 2 searches)
2. ✅ Found 104 contacts (all have LinkedIn URLs)
3. ❌ Many were NOT hedge funds (investment firms, non-finance companies)
4. ❌ Some contacts were noisy (LinkedIn posts, job descriptions)
5. ✅ Cleaned up - deleted all bad data
6. ✅ Re-running search with hedge funds ONLY

---

## Next Steps

1. **Re-run search** - Now searching ONLY hedge funds
2. **Better filtering** - Only save actual hedge fund companies
3. **Find contacts** - Use "Head of Research" + other finance titles
4. **Clean contacts** - Filter out LinkedIn posts, job descriptions
5. **Verify LinkedIn** - All contacts should have LinkedIn URLs (they do!)

---

## Table Structure

**`companies` table:**
- `id` (UUID)
- `offer_id` (links to finance offer)
- `name` (company name)
- `domain` (website domain)
- `url` (full website URL)
- `vertical` ('hedge_fund', 'private_equity', 'investment_firm', etc.)
- `source_tool` ('exa', 'parallel', 'theirstack', 'csv')
- `source_raw` (JSONB - raw data from API)
- `fit_score` (1-10)

**`contacts` table:**
- `id` (UUID)
- `offer_id` (links to finance offer)
- `company_id` (links to company)
- `first_name`
- `last_name`
- `title`
- `linkedin_url` ✅ (all Exa contacts have this!)
- `email` (null until enriched)
- `source_tool` ('exa', 'parallel', etc.)
- `source_raw` (JSONB - raw data from API)
