# Finance Company Enrichment - Data Storage Guide

## 📊 Where All Output Data Gets Stored in Supabase

When you run `enrich-finance-companies.ts`, here's exactly where everything gets saved:

### 1. **Company Classification** → `companies` table

**What gets stored:**
- `companies.vertical` → Coarse label (`investment_firm`, `bank`, `credit_union`, etc.)
- `companies.signals` → Detailed metadata:
  ```json
  {
    "company_type": "investment_firm",
    "company_type_confidence": "medium",
    "company_type_method": "heuristic",
    "finance_fit": true
  }
  ```

**When:** Happens for every company processed (unless `--skip-classify` is set)

---

### 2. **Contact Records** → `contacts` table

**What gets stored:**
- `contacts.first_name`, `contacts.last_name`, `contacts.full_name`
- `contacts.title` (from Exa result)
- `contacts.linkedin_url` (from Exa)
- `contacts.email` (from FullEnrich, if found)
- `contacts.email_status` (`'valid'` or `'unknown'`)
- `contacts.company_id` → Links to the company
- `contacts.offer_id` → Links to the "finance" offer
- `contacts.source_tool` → `'exa'` (the tool that found the person)
- `contacts.source_raw` → Full API responses:
  ```json
  {
    "exa": {
      "query": "CIO \"Acme Capital\" site:linkedin.com/in",
      "result": { /* Exa person object */ }
    },
    "fullenrich": {
      "enrichment_id": "abc123...",
      "results": [ /* FullEnrich results */ ]
    },
    "company_type": "investment_firm"
  }
  ```
- `contacts.status` → `'ready'` (if email found) or `'enriched'` (LinkedIn only)

**Deduplication:** 
- Unique constraint on `(offer_id, lower(email))` - prevents duplicate emails
- Unique constraint on `(offer_id, linkedin_url)` - prevents duplicate LinkedIn profiles

---

### 3. **Campaign Membership** → `campaign_contacts` table

**What gets stored:**
- `campaign_contacts.campaign_id` → Links to the campaign (`finance-fi-company-enrichment`)
- `campaign_contacts.contact_id` → Links to the contact
- `campaign_contacts.status` → `'queued'` (ready for outreach)

**Purpose:** Tracks which contacts belong to which campaigns. One contact can be in multiple campaigns.

---

## 🔍 How We Know Which Companies Don't Have Contacts (Free SQL)

The script uses this query to find companies missing contacts:

```sql
SELECT co.id, co.name, co.domain
FROM companies co
LEFT JOIN contacts ct ON ct.company_id = co.id
WHERE ct.id IS NULL
  AND co.offer_id = <finance_offer_id>
  AND co.domain IS NOT NULL;
```

This is **free** - no API calls needed. It's a simple database join.

---

## 💰 How Company Classification Works for Free

The classification happens **entirely in code** - no API calls, no credits spent.

### The Logic (in `classifyCompanyName` function):

```typescript
function classifyCompanyName(name: string, domain: string | null): CompanyType {
  const n = name.toLowerCase()
  const d = domain?.toLowerCase() || ''
  
  // Simple string matching - completely free!
  if (n.includes('credit union') || d.includes('fcu')) 
    return 'credit_union'
  if (n.includes('bank') || d.endsWith('.bank')) 
    return 'bank'
  if (n.includes('capital') || n.includes('partners') || 
      n.includes('asset management') || n.includes('investment management'))
    return 'investment_firm'  // ← This is what we target!
  // ... etc
}
```

### Why It's Free:
- **No API calls** - just JavaScript string operations
- **No database lookups** - pure in-memory logic
- **Instant** - runs in milliseconds

### Accuracy:
- **High confidence** for obvious cases: "First National Bank" → `bank`
- **Medium confidence** for investment firms: "Acme Capital Partners" → `investment_firm`
- **Low confidence** for ambiguous: "Acme Financial Services" → `unknown`

The script then filters to only process companies where `isFitForFinanceOffer(type)` returns `true`:
- `investment_firm` ✅
- `broker_dealer` ✅  
- `fintech` ✅
- `bank`, `credit_union`, `insurance` ❌ (skipped with `--only-fit true`)

---

## 📈 Data Flow Summary

```
1. Load companies from `companies` table
   ↓
2. Find companies WITHOUT contacts (free SQL join)
   ↓
3. Classify company type (free string matching)
   ↓
4. Filter to "fit" companies (if --only-fit=true)
   ↓
5. For each company:
   a. Update `companies.signals` + `companies.vertical` (free)
   b. Use Exa to find 1-2 decision-makers (costs Exa credits)
   c. For each person found:
      - Use FullEnrich to find email (costs 1 FullEnrich credit, async)
      - Insert into `contacts` table (deduped automatically)
      - Link to campaign via `campaign_contacts`
```

---

## 🎯 Example: What Gets Created for One Company

**Input:** Company "Acme Capital Partners" (domain: `acmecap.com`)

**Output:**

1. **`companies` table update:**
   ```json
   {
     "vertical": "investment_firm",
     "signals": {
       "company_type": "investment_firm",
       "company_type_confidence": "medium",
       "finance_fit": true
     }
   }
   ```

2. **`contacts` table (new row):**
   ```json
   {
     "first_name": "John",
     "last_name": "Smith",
     "title": "Chief Investment Officer",
     "linkedin_url": "https://linkedin.com/in/johnsmith",
     "email": "john.smith@acmecap.com",
     "email_status": "unknown",
     "company_id": "abc123",
     "offer_id": "finance_offer_id",
     "source_tool": "exa",
     "status": "ready"
   }
   ```

3. **`campaign_contacts` table (new row):**
   ```json
   {
     "campaign_id": "finance-fi-company-enrichment",
     "contact_id": "contact_abc123",
     "status": "queued"
   }
   ```

---

## 🔄 Running in Batches

When you run:
```bash
npx ts-node scripts/enrich-finance-companies.ts --limit 25 --max-per-company 1 --skip-email false
```

**What happens:**
- Processes **25 companies** at a time
- Finds **1 contact per company** (via Exa)
- Finds **emails for all contacts** (via FullEnrich, async with polling)
- Stores everything in the tables above
- **Deduplication prevents duplicates** if you run it multiple times

**Next batch:** Run again with the same command - it will automatically skip companies that already have contacts.
