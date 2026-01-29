# /offer-launch - Find Companies & Contacts

Launch a campaign by finding companies and contacts that match your offer's ICP and campaign signals.

**⚠️ This command spends API credits to find leads. Make sure your campaign plan is ready before running.**

**📦 Note:** This command has been converted to a **Skill** with reusable scripts. See `.cursor/skills/4-campaigns-leads/` for the skill version. This markdown file is kept for reference and backward compatibility.

---

## What This Command Does

1. **Reads offer positioning** → Extracts ICP
2. **Reads campaign signals** → Extracts what to look for
3. **Routes to correct APIs** → Based on signal type (THIS IS WHERE API LOGIC LIVES)
4. **Finds companies** → Matching ICP and signals
5. **Finds contacts** → Decision-makers at those companies
6. **Checks status** → Already contacted? Already connected?
7. **Saves to Supabase** → Ready for review and sending

---

## Prerequisites

Before running this command:
- ✅ Offer must exist with positioning (`/new-offer` completed)
- ✅ Campaign must exist with signals and copy (`/offer-campaign` completed)
- ✅ API keys set in `.env`: `PARALLEL_API_KEY`, `THEIRSTACK_API_KEY`, `EXA_API_KEY`
- ✅ You've reviewed campaign plan and approved spending credits

---

## Input Required

```
/offer-launch {offer-slug} {campaign-slug}
```

**Optional parameters:**
- `--limit` - Max companies to find (default: 50)
- `--skip-enrichment` - Skip company enrichment (faster, less data)
- `--signal-only` - Only find companies with signals (skip ICP-only fallback)

**Examples:**
```
/offer-launch sales-roleplay-trainer hiring-signal-q1
/offer-launch sales-roleplay-trainer pvp-benchmarks --limit 100
/offer-launch sales-roleplay-trainer tech-stack-targeting --signal-only
```

---

## Process

### Step 1: Load Offer + Campaign Context

Read two sources:
1. `offers/{offer-slug}/positioning-canvas.md` → ICP (company size, industry, buyer titles)
2. `offers/{offer-slug}/campaigns/{campaign-slug}/signals.md` → Signals (what to look for)

Display summary:
```
📋 Launching campaign: {Campaign Name}
   Offer: {Offer Name}

👥 ICP (from offer):
   • Company: {industry}, {size}, {geography}
   • Buyer: {titles} in {department}

📡 Signals (from campaign):
   1. {Signal 1} - Priority: high
   2. {Signal 2} - Priority: medium

💰 Cost Estimate:
   • Expected: ~{N} API calls (~${X})
   • Target: {limit} companies

Press Enter to proceed or Ctrl+C to cancel...
```

### Step 2: API Routing

**Based on signal type, determine which API to use:**

Reference: @file .cursor/rules/project.mdc (API Routing Logic section)

```typescript
// Determine primary API based on signal
if (signal.includes("hiring")) {
  primaryAPI = "TheirStack"  // Job posting signals
  secondaryAPI = "Parallel"   // Enrichment
} else if (signal.includes("tech stack")) {
  primaryAPI = "Parallel"     // Has tech filters
} else if (signal.includes("funding") || signal.includes("news")) {
  primaryAPI = "Exa"          // AI search
} else {
  primaryAPI = "Parallel"     // ICP-only search
}
```

**Display:**
```
🔀 API Routing:
   Primary: TheirStack (hiring signal detected)
   Enrichment: Parallel (firmographics)
   Contacts: Parallel (people search)
```

### Step 3: Find Companies

#### 3A: Signal-Based Discovery (TheirStack)

If signal = "hiring [role]":

```typescript
import { theirstackGetCompanies } from '@/lib/clients/theirstack'

// Extract job titles from signal
const jobTitles = extractJobTitles(signal) // ["SDR", "BDR", "AE"]

const results = await theirstackGetCompanies({
  hiring_for: jobTitles,
  posted_within_days: 30,
  min_openings: 2,
  company_size_min: icp.size_min,
  company_size_max: icp.size_max,
  location: icp.geography,
  limit: options.limit || 50
})

// Save initial results
const companies = results.map(job => ({
  name: job.company_name,
  domain: job.company_domain,
  source: 'theirstack',
  signals: {
    hiring_roles: job.job_titles,
    job_count: job.opening_count,
    posted_date: job.posted_date
  }
}))
```

**Display progress:**
```
🔍 TheirStack: Searching for companies hiring SDR/BDR/AE...
   ✓ Found 47 companies with 2+ openings in last 30 days
```

#### 3B: ICP-Based Discovery (Parallel)

If no specific signal OR as fallback:

```typescript
import { parallelSearchCompanies } from '@/lib/clients/parallel'

const results = await parallelSearchCompanies({
  size_min: icp.size_min,
  size_max: icp.size_max,
  industries: icp.industries,
  locations: icp.locations,
  limit: options.limit || 50
})

const companies = results.map(company => ({
  name: company.name,
  domain: company.domain,
  source: 'parallel',
  ...company
}))
```

**Display progress:**
```
🔍 Parallel: Searching for B2B SaaS companies (20-100 employees)...
   ✓ Found 52 companies matching ICP
```

### Step 4: Enrich Companies (via Parallel)

**For ALL companies (regardless of source), enrich with Parallel:**

Reference: @file context/api-guides/parallel-quick-reference.md (Company Enrichment section)

```typescript
import { parallelEnrichCompany } from '@/lib/clients/parallel'

const enrichedCompanies = []

for (const company of companies) {
  try {
    const enriched = await parallelEnrichCompany({
      domain: company.domain
    })
    
    // Verify ICP match
    const matches = verifyICP(enriched, icp)
    
    if (matches) {
      enrichedCompanies.push({
        ...company,
        ...enriched,
        icp_match: true
      })
    }
    
    // Rate limit: 1 req/sec
    await sleep(1000)
  } catch (error) {
    console.error(`⚠️  ${company.name} - enrichment failed`)
  }
}
```

**Display progress:**
```
🔄 Enriching companies with Parallel...
   ✓ 47/47 companies enriched
   ✓ 43 match ICP (4 filtered out)
```

### Step 5: Find Contacts (via Parallel)

**For each qualified company, find decision-makers:**

Reference: @file context/api-guides/parallel-quick-reference.md (People Search section)

```typescript
import { parallelSearchPeople } from '@/lib/clients/parallel'

const allContacts = []

// Get buyer titles from ICP
const buyerTitles = icp.buyer_titles // ["VP Sales", "Sales Director"]

for (const company of enrichedCompanies) {
  try {
    const contacts = await parallelSearchPeople({
      company_id: company.parallel_id,
      titles: buyerTitles,
      seniority: ['vp', 'director'],
      limit: 5 // Max 5 per company
    })
    
    allContacts.push(...contacts.map(contact => ({
      ...contact,
      company_id: company.id,
      company_name: company.name
    })))
    
    // Rate limit
    await sleep(1000)
  } catch (error) {
    console.error(`⚠️  ${company.name} - contact search failed`)
  }
}
```

**Display progress:**
```
👤 Finding decision-makers...
   ✓ Found 89 contacts at 43 companies
   ✓ Average: 2.1 contacts per company
```

### Step 5.5: Store API Results (CRITICAL)

**Before processing results, save run IDs and raw responses:**

Reference: @file docs/api-tool-results-storage.md

```typescript
// For async APIs (Parallel FindAll, Task API):
// 1. Save run ID immediately (before polling)
const findall = await parallel.findAll(...)
const runId = findall.findall_id

await supabase.from('parallel_findall_runs').insert({
  findall_run_id: runId,
  status: 'pending',
  offer_id: offerId,
  campaign_id: campaignId,
  // ... request details
})

// 2. Poll for results
const result = await waitForFindAllResult(runId)

// 3. Update with full response
await supabase.from('parallel_findall_runs')
  .update({
    status: 'completed',
    raw_response: result,  // Full API response
    items_count: result.output?.items?.length || 0
  })
  .eq('findall_run_id', runId)

// 4. Save JSON backup (even in dry-run mode)
fs.writeFileSync(
  `parallel-results-${runId}.json`,
  JSON.stringify(result, null, 2)
)

// For sync APIs (TheirStack, Exa):
// 1. Log automatically (via tool-usage-logger hook)
// 2. Store raw response in source_raw field
// 3. Save JSON backup
```

**Why:** If scripts fail/timeout, you can recover data using run IDs.

### Step 6: Check Status (Unipile)

**Check if we've already contacted these people:**

Reference: @file src/lib/utils/linkedin-safety.ts

```typescript
import { unipileCheckConnection } from '@/lib/clients/unipile'

for (const contact of allContacts) {
  // Check LinkedIn connection status
  const status = await unipileCheckConnection({
    linkedin_url: contact.linkedin_url
  })
  
  contact.connection_degree = status.connection_degree
  contact.already_contacted = status.has_conversation
  
  // Filter based on LinkedIn safety rules
  if (status.connection_degree === 1) {
    contact.skip_reason = '1st degree connection'
  } else if (status.has_conversation) {
    contact.skip_reason = 'Already contacted'
  }
  
  await sleep(2000) // Slow for LinkedIn safety
}
```

**Display:**
```
✅ Status check complete:
   • 89 total contacts
   • 12 already connected (skip)
   • 8 already contacted (skip)
   • 69 ready for outreach ✓
```

### Step 7: Save to Supabase

**Save companies, contacts, and link to campaign:**

```typescript
import { supabaseAdmin } from '@/lib/clients/supabase'

// Insert companies
const { data: insertedCompanies } = await supabaseAdmin
  .from('companies')
  .upsert(enrichedCompanies, { onConflict: 'domain' })
  .select()

// Insert contacts
const { data: insertedContacts } = await supabaseAdmin
  .from('contacts')
  .upsert(allContacts, { onConflict: 'linkedin_url' })
  .select()

// Update campaign with results
await supabaseAdmin
  .from('campaigns')
  .update({
    status: 'ready', // Change from 'draft' to 'ready'
    total_contacts: insertedContacts.filter(c => !c.skip_reason).length,
    contacts_remaining: insertedContacts.filter(c => !c.skip_reason).length
  })
  .eq('id', campaign.id)

// Link contacts to campaign
const campaignContacts = insertedContacts.map(contact => ({
  campaign_id: campaign.id,
  contact_id: contact.id,
  company_id: contact.company_id,
  status: contact.skip_reason ? 'skipped' : 'queued',
  skip_reason: contact.skip_reason
}))

await supabaseAdmin
  .from('campaign_contacts')
  .insert(campaignContacts)
```

**Display:**
```
💾 Saved to Supabase:
   • Campaign: "{Campaign Name}" (status: draft → ready)
   • 43 companies
   • 69 contacts ready for outreach
   • 21 contacts skipped
```

### Step 8: Summary & Next Steps

**Show final summary:**

```
🎉 Campaign Launch Complete!

📊 Results:
   Campaign: {Campaign Name}
   Companies Found: 43
   Contacts Found: 89
   Ready for Outreach: 69
   Skipped: 21 (12 already connected, 8 already contacted, 1 no contact info)
   
📡 Signal Performance:
   Primary Signal: Hiring SDR/BDR/AE
   Companies with Signal: 47
   ICP Match Rate: 91% (43/47)
   Avg Contacts/Company: 2.1
   
💰 API Usage:
   TheirStack: 1 search
   Parallel: 43 enrichments + 43 people searches
   Unipile: 89 status checks
   Total Cost: ~${X estimated}
   
⏭️  Next Steps:
   1. Review leads in database or (future) UI
   2. Run `/offer-send {offer-slug} {campaign-slug}` to create messages
   3. **Enqueue messages** into `send_queue` (see below)
   4. Railway cron will automatically send from `send_queue`
   
💡 Tip: Companies are sorted by signal strength. Focus on top 20 first.

---

## Messages vs Send Queue (Important)

After creating messages, you **must enqueue them** for sending:

**How It Works:**
- `messages` table = **source of truth** (what we plan to send, content + schedule)
- `send_queue` table = **execution queue** (what Railway cron actually reads)
- Railway cron **only reads `send_queue`**, not `messages`

**Why Two Tables?**
- Allows editing messages before sending (iterating on copy)
- Separation of planning (`messages`) vs execution (`send_queue`)
- Audit trail: `messages` keeps permanent record, `send_queue` tracks execution state
- Retry logic: failed sends stay in `send_queue` for retry without duplicating `messages`

**Enqueue After Message Creation:**
```sql
INSERT INTO send_queue (
  campaign_id,
  campaign_contact_id,
  contact_id,
  account_id,
  channel,
  sequence_step,
  subject,
  body,
  scheduled_for,
  priority,
  status,
  external_message_id
)
SELECT
  m.campaign_id,
  m.campaign_contact_id,
  m.contact_id,
  m.account_id,
  m.channel,
  m.sequence_step,
  m.subject,
  m.body,
  m.scheduled_at,
  5,
  'pending',
  m.id::text
FROM messages m
WHERE m.campaign_id = 'YOUR_CAMPAIGN_ID'
  AND m.status IN ('pending', 'queued')
  AND NOT EXISTS (
    SELECT 1 FROM send_queue sq WHERE sq.external_message_id = m.id::text
  );
```

**What Happens After Sending:**
- Railway cron picks up `send_queue` items where `scheduled_for <= NOW()` and `status = 'pending'`
- Sends via Unipile API
- Updates `send_queue.status` to `sent` (or `failed` if error)
- Updates `messages.status` to `sent` (linked via `external_message_id`)
- **Rows are NOT deleted** - kept for audit trail
- Timestamps recorded: `send_queue.sent_at`, `messages.sent_at`

**Check if messages are enqueued:**
```sql
SELECT COUNT(*) FROM send_queue 
WHERE campaign_id = 'YOUR_CAMPAIGN_ID';
```
```

---

## Cost Tracking

All API calls are logged to `tool_usage` table for cost tracking:

```typescript
await supabaseAdmin.from('tool_usage').insert({
  tool_id: tool.id,
  offer_id: offer.id,
  campaign_id: campaign.id,
  company_id: company?.id,
  action: 'company_search',
  request_params: { query, limit },
  status: 'success',
  response_summary: { found: results.length },
  credits_used: 5,
  created_at: new Date()
})
```

---

## Error Handling

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No companies found | Signal too specific | Broaden search (increase date range, fewer filters) |
| No contacts found | Titles too specific | Add more title variations to ICP |
| Rate limit errors | Too fast | Command already has delays - just wait |
| API key errors | Missing env vars | Check `.env` for all API keys |

### Partial Success

If some APIs fail:
```
⚠️  Warning: TheirStack returned 0 results
✓ Falling back to Parallel (ICP-only search)
✓ Found 28 companies via Parallel
```

Command should gracefully degrade and still deliver results.

---

## Related Files

- **Positioning Framework:** `context/frameworks/positioning-canvas.md` (ICP source)
- **Signal Framework:** `context/frameworks/signal-brainstorming.md` (signal source)
- **API Routing:** `.cursor/rules/project.mdc` (API routing section)
- **API Guides:**
  - `context/api-guides/parallel-quick-reference.md`
  - `context/api-guides/theirstack-quick-reference.md`
  - `context/api-guides/exa-quick-reference.md`
- **API Clients:**
  - `src/lib/clients/parallel.ts`
  - `src/lib/clients/theirstack.ts`
  - `src/lib/clients/exa.ts`
  - `src/lib/clients/unipile.ts`
- **LinkedIn Safety:** `src/lib/utils/linkedin-safety.ts`
- **Types:** `src/lib/types/company.ts`, `src/lib/types/contact.ts`, `src/lib/types/campaign.ts`
- **Previous Command:** `.cursor/commands/offer-campaign.md` (creates signals)
- **Next Command:** `.cursor/commands/offer-send.md` (sends messages)
