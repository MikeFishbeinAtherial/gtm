# /find-contacts-and-enrich-companies

Find decision-makers at a list of companies, enrich with emails, and categorize company type.

**Primary goal:** turn a company list into **contacts you can email**, while preserving:
- why each company/contact was added
- what campaign(s) they’re in
- what emails/messages we have sent or will send

This command is optimized for “email each contact once” (and later “once per month”), not 5-step sequences.

---

## Inputs

```
/find-contacts-and-enrich-companies {offer-slug} {campaign-name}
```

Suggested for Finance:
```
/find-contacts-and-enrich-companies finance finance-fi-company-enrichment
```

Optional flags:
- `--limit` (default 25): max companies to process this run
- `--max-per-company` (default 2): contacts per company
- `--only-fit` (default true): only process “investment firm-ish” companies
- `--skip-email` (default false): skip Leadmagic email finding
- `--skip-classify` (default false): skip company type classification
- `--dry-run` (default false): do everything except write to DB

---

## Workflow (What it does)

### Step 1: Ensure canonical rows exist (one-time)
1. Ensure `offers.slug = {offer-slug}` exists
2. Ensure `campaigns.name = {campaign-name}` exists
3. Ensure canonical `companies` exist (upsert) for this offer
4. Add companies to `campaign_companies` so we track “which campaign they’re in”

### Step 2: Identify companies missing contacts (free)
Query:
```sql
SELECT co.id, co.name, co.domain
FROM companies co
LEFT JOIN contacts ct ON ct.company_id = co.id
WHERE co.offer_id = '{offer_id}'
  AND ct.id IS NULL
LIMIT {limit};
```

### Step 3: Classify company type (cheap)
Use name/domain heuristics first (free), only fall back to Exa if needed.
Store into:
- `companies.vertical`
- `companies.signals.company_type`

### Step 4: Find contacts (Exa first)
Use Exa to find likely decision makers:
- 1–2 people per company
- capture LinkedIn URL + title + Exa score

Store into:
- `contacts` (deduped by (offer_id, lower(email)) and (offer_id, linkedin_url))
- `campaign_contacts` (so we know campaign membership)

### Step 5: Find email (Leadmagic) (only for finalists)
Only after choosing the 1–2 best contacts, call Leadmagic:
- store raw response in `contacts.source_raw`
- set `contacts.email` + `contacts.email_status`

---

## Outputs (What you get)

### In Supabase

- `campaign_companies` rows (why each company was added, status, source)
- `contacts` rows (deduped, with source_raw)
- `campaign_contacts` rows (which contacts are in the campaign)

### Later (message layer)
When you’re ready to send:
- create **one** `messages` row per contact for the month
- schedule via `scheduled_at`

---

## Reference

See: `context/frameworks/contact-finding-and-company-enrichment.md`

