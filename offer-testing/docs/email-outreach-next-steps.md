# Email Outreach - Next Steps Summary

## What We've Done So Far

### 1. Company Discovery & Building Lead List
- **Found 331 companies** matching finance ICP (hedge funds, PE firms, asset managers)
- Used **Parallel FindAll** (171 companies) and **Sumble/CSV imports** (160 companies)
- Companies segmented by vertical: 51 hedge funds, 94 PE firms, 22 investment firms, etc.
- All companies linked to `finance-leadgen-1000` campaign
- **Target:** 1000 companies (669 remaining)

### 2. Lead Source Tracking & Data Persistence
- Implemented robust data storage with `lead_source` tracking (`parallel_findall`, `sumble`, `csv`)
- Created immediate JSON backups for all API runs (prevents data loss)
- All companies stored in Supabase with deduplication by `(offer_id, domain)`

### 3. API Integration & Cost Management
- Integrated Parallel FindAll API for company discovery
- Used Core generator ($2 + $0.15/match) - cost-effective for bulk discovery
- Tracked API usage and credits ($10 remaining)
- Created scripts for different query angles (Family Offices, Credit Funds, Alternative Investments)

---

## Key Metrics

### Companies
- **Total Companies:** 331
- **Target:** 1000
- **Remaining:** 669
- **In Campaign:** 331 (100%)

**By Source:**
- Parallel FindAll: 171 (52%)
- Sumble/CSV: 160 (48%)

**By Vertical:**
- Private Equity: 94 (28%)
- Hedge Funds: 51 (15%)
- Investment Firms: 22 (7%)
- Unknown/Other: 164 (50%) - *needs classification*

### Contacts
- **Total Contacts:** TBD (need to run enrichment)
- **Contacts with Email:** TBD
- **Contacts Ready for Outreach:** TBD

---

## Next Steps for Email Outreach

### Step 1: Find Decision Makers (Exa) ⚠️ **CRITICAL FIRST STEP**

**Goal:** Find 1-2 decision-makers per company

**Script:** `scripts/enrich-finance-companies.ts` (already exists!)

**Run:**
```bash
cd "/Users/mikefishbein/Desktop/Vibe Coding/gtm/offer-testing"
npx ts-node scripts/enrich-finance-companies.ts --limit 50 --max-per-company 2
```

**What it does:**
1. Finds companies missing contacts (free SQL query)
2. Uses **Exa** to find decision-makers at each company:
   - Titles: CIO, Head of Research, Portfolio Manager, Managing Partner, Partner, Managing Director, Principal
   - Searches LinkedIn profiles
   - Gets LinkedIn URL + title + Exa score
3. Saves contacts to `contacts` table
4. Links contacts to `campaign_contacts`

**Cost:** ~$0.01-0.05 per contact (Exa search)

**Expected:** ~50-100 contacts from 50 companies (1-2 per company)

---

### Step 2: Get Email Addresses (FullEnrich) ⚠️ **REQUIRED FOR EMAIL**

**Goal:** Find work email addresses for all contacts

**Script:** Already integrated in `enrich-finance-companies.ts` (use `--skip-email false`)

**Run:**
```bash
# If contacts already exist, enrich emails only:
npx ts-node scripts/enrich-finance-companies.ts --limit 100 --skip-classify true
```

**What it does:**
1. For each contact with `first_name`, `last_name`, `domain`:
   - Submits FullEnrich request (async)
   - Waits for results (30-90 seconds)
   - Gets work email address
2. Updates `contacts.email` and `contacts.email_status`
3. Stores FullEnrich results in `contacts.source_raw.fullenrich`

**Cost:** 1 credit per contact (~$0.01-0.02 per email)

**Expected:** 60-80% success rate (higher with LinkedIn URL)

---

### Step 3: Company Enrichment & Fit Verification (Optional but Recommended)

**Goal:** Verify companies are good fit, enrich with additional data

**Script:** `scripts/enrich-finance-companies.ts` (already includes classification)

**Run:**
```bash
npx ts-node scripts/enrich-finance-companies.ts --limit 100 --only-fit true
```

**What it does:**
1. Classifies company type (free heuristics first):
   - Checks name/domain for keywords
   - Falls back to Exa if needed
2. Updates `companies.vertical` and `companies.signals.company_type`
3. Filters out non-fit companies (banks, credit unions, insurance)

**Cost:** Minimal (mostly free heuristics, Exa only if needed)

---

### Step 4: Connect Email Accounts to Unipile ⚠️ **REQUIRED FOR SENDING**

**Goal:** Connect your email accounts so Unipile can send emails

**Steps:**

1. **Get Unipile Account ID:**
   - Go to Unipile dashboard
   - Find your email account
   - Copy the `account_id`

2. **Add to Environment:**
   ```bash
   # Add to .env.local
   UNIPILE_EMAIL_ACCOUNT_ID=your_account_id_here
   ```

3. **Verify Connection:**
   ```bash
   # Test script (create if needed)
   npx ts-node scripts/test-unipile-email.ts
   ```

**Unipile Setup:**
- Connect Gmail/Outlook account via OAuth
- Unipile handles email sending via their API
- Supports rate limiting and deliverability

---

### Step 5: Create Email Messages & Send

**Goal:** Create personalized messages and send via Unipile

**Script:** `scripts/process-message-queue.js` (already exists!)

**Workflow:**

1. **Create Messages:**
   ```sql
   -- Insert messages for contacts ready to send
   INSERT INTO messages (
     campaign_id,
     contact_id,
     subject,
     body,
     channel,
     status
   )
   SELECT 
     cc.campaign_id,
     c.id,
     'Subject here',
     'Email body here',
     'email',
     'pending'
   FROM contacts c
   JOIN campaign_contacts cc ON cc.contact_id = c.id
   WHERE c.email IS NOT NULL
     AND c.email_status = 'verified'
     AND cc.status = 'queued'
   ```

2. **Send Messages:**
   ```bash
   # Process message queue
   node scripts/process-message-queue.js
   ```

**What it does:**
- Reads `messages` table with `status = 'pending'`
- Sends via Unipile API (`/email/send`)
- Updates `messages.status` to `sent` or `failed`
- Tracks send history

**Rate Limits:**
- Unipile: ~50-100 emails/day per account (check your plan)
- Add delays: 2-5 minutes between sends

---

## Recommended Execution Order

### Phase 1: Contact Discovery (This Week)
1. ✅ **Run contact finding:** `enrich-finance-companies.ts --limit 50`
   - Finds decision-makers with Exa
   - Expected: 50-100 contacts

2. ✅ **Get emails:** Same script (auto-enriches emails)
   - Gets work emails with FullEnrich
   - Expected: 30-80 emails (60-80% success)

3. ✅ **Verify fit:** Review contacts, filter non-fit companies
   - Check `companies.vertical` and `companies.signals`
   - Remove banks, credit unions, insurance

### Phase 2: Email Setup (This Week)
4. ✅ **Connect Unipile:** Add email account to Unipile
   - Get `UNIPILE_EMAIL_ACCOUNT_ID`
   - Test connection

5. ✅ **Create messages:** Write email templates
   - Subject lines
   - Email body (personalized)
   - Store in `messages` table

### Phase 3: Send & Scale (Next Week)
6. ✅ **Send test batch:** 10-20 emails first
   - Verify deliverability
   - Check open rates
   - Adjust messaging

7. ✅ **Scale up:** Send remaining emails
   - Process queue daily
   - Monitor bounce rates
   - Track responses

8. ✅ **Continue discovery:** Find more companies to reach 1000
   - Run more Parallel queries
   - Find more contacts
   - Build pipeline

---

## Cost Estimates

### Contact Discovery (50 companies)
- Exa searches: 50 × $0.01 = **$0.50**
- FullEnrich emails: 50 × $0.015 = **$0.75**
- **Total: ~$1.25**

### Full Scale (331 companies)
- Exa searches: 331 × $0.01 = **$3.31**
- FullEnrich emails: 331 × $0.015 = **$4.97**
- **Total: ~$8.28**

### Email Sending (Unipile)
- Check your Unipile plan pricing
- Usually: $0.01-0.05 per email sent

---

## Key Files & Scripts

### Contact Finding & Enrichment
- `scripts/enrich-finance-companies.ts` - Main script for finding contacts + emails
- `src/lib/clients/exa.ts` - Exa API client
- `src/lib/clients/fullenrich.ts` - FullEnrich API client

### Email Sending
- `scripts/process-message-queue.js` - Processes and sends messages
- `src/lib/clients/unipile.ts` - Unipile API client

### Documentation
- `.cursor/commands/7-find-contacts-and-enrich-companies.md` - Contact finding guide
- `context/frameworks/contact-finding-and-company-enrichment.md` - Framework
- `context/api-tools/fullenrich/fullenrich-tool-guide.md` - FullEnrich guide

---

## Quick Start Command

**To start finding contacts RIGHT NOW:**

```bash
cd "/Users/mikefishbein/Desktop/Vibe Coding/gtm/offer-testing"
npx ts-node scripts/enrich-finance-companies.ts \
  --limit 50 \
  --max-per-company 2 \
  --only-fit true
```

This will:
1. Find 50 companies missing contacts
2. Find 1-2 decision-makers per company (Exa)
3. Get their email addresses (FullEnrich)
4. Classify company types
5. Save everything to Supabase

**Expected time:** 15-30 minutes
**Expected cost:** ~$1-2
**Expected contacts:** 50-100 with emails

---

## Questions?

- **"How do I check contact count?"** → Run `check-company-count.ts` (modify to include contacts)
- **"How do I test email sending?"** → Use `send-test-message.js` (modify for email)
- **"What if FullEnrich fails?"** → Contacts saved without email, can retry later
- **"How do I personalize emails?"** → Use company/contact data from Supabase in message templates
