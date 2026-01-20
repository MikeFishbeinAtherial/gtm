# Exa Data Summary

## What We've Gotten from Exa (240 Searches)

### Contacts Found
- **Total Contacts:** 274 (all from Exa)
- **Contacts with Email:** 210 (76.6% success rate)
- **Contacts without Email:** 64

### Companies Covered
- **Companies with contacts:** 217 (66% of 331 total)
- **Companies without contacts:** 114 (34% remaining)

### What Exa Provides Per Contact

**From Exa searches, we get:**
1. **Person name** - First name, last name, full name
2. **Title** - Job title (when available)
3. **LinkedIn URL** - Profile URL for research/outreach
4. **Company association** - Which company they work for
5. **Exa score** - Relevance score from Exa

**Stored in `contacts` table:**
- `first_name`, `last_name`, `full_name`
- `title` (from Exa result)
- `linkedin_url` (from Exa)
- `source_tool = 'exa'`
- `source_raw.exa` - Full Exa response with query used

### Sample Exa Contacts

1. **Stephen Davis** - Banneker Partners
   - Email: sdavis@bannekerpartners.com ✅
   - Query: "Chief Investment Officer OR CIO OR Head of Research..." at Banneker Partners

2. **Lilli Gruendl** - Dartmouth Partners
   - Email: lilli.gruendl@dartmouthpartners.com ✅
   - Title: PE Recruitment

3. **Albert Koh** - H.I.G. Growth Partners
   - Email: akoh@higgrowth.com ✅
   - Title: Managing Director

4. **Kenneth Lau** - Centre Lane Partners
   - Email: klau@centrelanepartners.com ✅
   - Title: Managing Director

### Exa Query Pattern

**What Exa searches for:**
```
("Chief Investment Officer" OR CIO OR "Head of Research" OR 
 "Portfolio Manager" OR "Managing Partner" OR Partner OR 
 "Managing Director" OR Principal) 
("{COMPANY_NAME}" OR "{DOMAIN}") 
site:linkedin.com/in
```

**Now includes AI titles:**
- Head of AI
- Head of Data
- Chief Data Officer (CDO)
- Director of Data
- VP Data
- AI Engineer
- Machine Learning Engineer
- Data Scientist

---

## Cost Analysis

- **Exa searches:** 240 searches
- **Budget remaining:** $8
- **Cost per search:** ~$0.01-0.05 (varies by query complexity)
- **Estimated cost so far:** ~$2-12

**With $8 remaining:**
- Can do ~160-800 more searches
- Enough for remaining 114 companies (1-2 contacts each = 114-228 searches)

---

## What We Still Need

### Companies Without Contacts: 114

**Breakdown:**
- Total companies: 331
- Companies with contacts: 217
- Companies without contacts: 114

**Next steps:** Continue contact discovery for these 114 companies

---

## FullEnrich Email Enrichment Results

### Credits Used
- **Used:** 229 credits
- **Remaining:** 271 credits
- **Success rate:** 76.6% (210 emails from 274 contacts)

### What FullEnrich Provides

**For each contact:**
- Work email address (1 credit per contact)
- Email status (valid/unknown)
- LinkedIn URL validation
- Company domain matching

**Stored in `contacts` table:**
- `email` - Work email address
- `email_status` - 'valid' or 'unknown'
- `source_raw.fullenrich` - Full enrichment response

### Progress Made
- **Before:** 103 contacts with email
- **After:** 210 contacts with email
- **New emails found:** +107 emails ✅

---

## Updated Script: AI Titles Included

✅ **Updated `enrich-finance-companies.ts`** to include AI/data titles:

```typescript
const FINANCE_TITLES = [
  'Chief Investment Officer',
  'CIO',
  'Head of Research',
  'Portfolio Manager',
  'Managing Partner',
  'Partner',
  'Managing Director',
  'Principal',
  // NEW: AI/Data titles
  'Head of AI',
  'Head of Data',
  'Chief Data Officer',
  'CDO',
  'Director of Data',
  'VP Data',
  'AI Engineer',
  'Machine Learning Engineer',
  'Data Scientist',
]
```

**Why this matters:**
- Companies with AI/data leadership are better fits (maturity signal)
- These contacts are more likely to be interested in AI solutions
- Better targeting = higher response rates

---

## Next Steps

### 1. Continue Contact Discovery (114 companies remaining)

**Running now in smaller batches (25 companies at a time):**
```bash
npx ts-node scripts/enrich-finance-companies.ts --limit 25 --max-per-company 2
```

**Expected:** +114-228 more contacts (1-2 per company)

**Budget:** $8 remaining should be enough (~$2-6 needed)

---

### 2. Get Emails for Remaining Contacts (64 contacts)

**After contact discovery finishes:**
```bash
npx ts-node scripts/enrich-finance-companies.ts --enrich-existing true --skip-classify true
```

**Expected:** +40-50 more emails (60-75% success rate)

**Budget:** 64 credits needed (you have 271 remaining ✅)

---

### 3. Unipile Setup

**Email account:** ✅ Added `UNIPILE_EMAIL_ACCOUNT_ID` to `.env.local`

**LinkedIn account:** Scripts automatically fetch LinkedIn account from Unipile API:
```javascript
const accounts = await fetch(`${UNIPILE_DSN}/accounts`)
const linkedinAccount = accounts.items.find(acc => acc.provider === 'LINKEDIN')
const unipileAccountId = linkedinAccount.id
```

**You don't need to store LinkedIn account ID** - scripts fetch it automatically from Unipile API.

**To verify your accounts:**
```bash
# Check what accounts you have connected
node -e "const { createClient } = require('@supabase/supabase-js'); require('dotenv').config({ path: '.env.local' }); const fetch = require('node-fetch'); (async () => { const response = await fetch(process.env.UNIPILE_DSN + '/accounts', { headers: { 'X-API-KEY': process.env.UNIPILE_API_KEY } }); const accounts = await response.json(); console.log('Connected accounts:'); accounts.items?.forEach(acc => { console.log(\`  - \${acc.provider || acc.type}: \${acc.id} (\${acc.name || acc.display_name || 'N/A'})\`); }); })()"
```

---

## Summary

### Exa Data (240 searches)
- ✅ **274 contacts found** (all from Exa)
- ✅ **210 emails found** (76.6% success rate)
- ✅ **217 companies have contacts** (66% coverage)
- ✅ **AI titles now included** in search queries

### FullEnrich Results
- ✅ **229 credits used** (271 remaining)
- ✅ **+107 new emails found** (210 total)
- ✅ **76.6% email success rate**

### What's Left
- ⏭️ **114 companies** still need contacts (running now in batches)
- ⏭️ **64 contacts** still need emails (can enrich after contact discovery)

### Unipile Setup
- ✅ **Email account ID** added to `.env.local`
- ✅ **LinkedIn account** - Scripts fetch automatically (no need to store)

**Contact discovery is running now in smaller batches (25 companies) to avoid timeouts!**
