# Contact Finding + Company Enrichment Framework

Goal: reliably turn a **company list** into a **contact list** (decision-makers + email) without wasting API credits.

This framework is optimized for *value-first finance outreach* where we usually send **one email per contact**, and later potentially **one email per month** (not 5-step sequences).

---

## 1) Data Model (How We Store Everything)

### Canonical tables (single source of truth)
- `companies` (1 row per company per offer)
- `contacts` (1 row per person per offer, linked to a company)

### Campaign membership tables (many-to-many)
- `campaign_companies` (which companies are in a campaign + why)
- `campaign_contacts` (which contacts are in a campaign)

### Message history / future sends
- `messages` (what we sent / will send)

**Key principle:** avoid “tables per campaign”. Use canonical tables + join tables.

---

## 2) How to Know Which Companies Need Contacts (Free SQL)

Canonical approach (preferred):
```sql
SELECT co.id, co.name, co.domain
FROM companies co
LEFT JOIN contacts ct ON ct.company_id = co.id
WHERE ct.id IS NULL;
```

---

## 3) “Smart” Credit Strategy (Don’t Burn Credits)

### Step A (free): classify company type from its name/domain
Before any API calls, categorize by simple heuristics:
- Name contains **"Credit Union"** → `credit_union`
- Name contains **"Bank"** → `bank`
- Name contains **"Insurance"** → `insurance`
- Name contains **"Capital" / "Partners" / "Asset Management" / "Investment Management"** → `investment_firm` (likely closer to hedge fund / PE)

Store this as:
- `companies.vertical` (coarse label)
- `companies.signals.company_type` (more detailed + confidence + method)

### Step B (cheap): find people (LinkedIn URLs) with Exa
Use Exa to find **1–2 decision makers** per company.

### Step C (spend only on finalists): get/verify emails with FullEnrich
Once you have a specific person (first/last + domain + LinkedIn URL), use FullEnrich to find a work email (1 credit per contact, async with webhooks or polling).

---

## 4) Finance Decision-Maker Title Template

Use a small, stable title list (don’t go wide):

- **Investment / research**:
  - Chief Investment Officer
  - CIO
  - Head of Research
  - Portfolio Manager
  - Managing Partner
  - Partner
  - Managing Director
  - Principal

Default: pick **1–2 contacts per company**.

---

## 5) Exa Query Templates (Copy/Paste)

### Find decision makers (LinkedIn profiles)
```
("Chief Investment Officer" OR CIO OR "Head of Research" OR "Portfolio Manager" OR "Managing Partner" OR Partner OR "Managing Director" OR Principal)
("{COMPANY_NAME}" OR "{DOMAIN}")
site:linkedin.com/in
```

Output we expect from Exa:
- person name
- title (best-effort)
- LinkedIn URL
- score

We store Exa outputs in:
- `contacts.source_tool = 'exa'`
- `contacts.source_raw = { query, exa_result }`

---

## 6) FullEnrich Request Template (Email Finding)

Input:
- `firstname`
- `lastname`
- `domain` (or `company_name`)
- (optional but recommended) `linkedin_url` (improves success rate by 5-20%)

Output we expect:
- work emails (1 credit per contact)
- async results via webhook (recommended) or polling

We store FullEnrich outputs in:
- `contacts.source_raw = contacts.source_raw || { fullenrich: { enrichment_id, results } }`
- set `contacts.email` and `contacts.email_status`

**Note:** FullEnrich is asynchronous (30-90 seconds). Use webhooks for production, polling for scripts.

---

## 7) Dedupe Rules (Hard Safety)

We dedupe contacts within an offer:
- `(offer_id, lower(email))` unique (case-insensitive)
- `(offer_id, linkedin_url)` unique

This prevents messaging the same person twice across multiple campaigns.

