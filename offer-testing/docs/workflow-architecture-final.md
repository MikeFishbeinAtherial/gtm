# Workflow Architecture - Final Summary

**Date:** December 20, 2024  
**Status:** ✅ Complete and aligned with database

---

## 🎯 **The Clean 4-Phase Workflow**

### **Phase 1: `/new-offer` - Define WHAT You're Selling**

**Purpose:** Create offer positioning and ICP (strategy only, no execution)

**Inputs:**
- Offer name & description
- Type (product/service)
- Ownership (internal/client)

**Process:**
1. Category definition
2. **Target Customer (ICP)** - Stable attributes
   - Company: size, industry, geography, stage
   - Buyer: titles, department, seniority
3. Customer problem
4. Benefits & outcomes
5. Current alternatives
6. One-line positioning

**Outputs:**
- File: `offers/{slug}/positioning-canvas.md`
- Database: `offers` table record
- Cost: **FREE** (no API calls)

**What it does NOT do:**
- ❌ No signals (that's campaign-specific)
- ❌ No messaging
- ❌ No API knowledge

---

### **Phase 2: `/offer-campaign` - Plan HOW to Reach Them**

**Purpose:** Create campaign with signals, messaging framework, and copy variants

**Inputs:**
- Offer slug (from Phase 1)
- Campaign name
- Approach (optional: pvp/usecase/problem)

**Process:**
1. Load offer context (ICP, problem, benefits)
2. Campaign planning (goal, size, channel, timeline)
3. **Signal brainstorming** - Observable behaviors (WHAT to look for, not HOW)
   - Hiring roles?
   - Using tech?
   - Recent events?
   - Quality filters
4. **Choose messaging framework:**
   - PVP (Permissionless Value)
   - Use Case-Driven
   - Problem-Focused
   - Hybrid
5. Execute framework (4-phase PVP, use case, etc.)
6. **Generate copy variations:**
   - Email subject lines (3-5)
   - Email body (2-3 variants)
   - LinkedIn messages (2-3 variants)

**Outputs:**
- Files:
  - `campaigns/{slug}/campaign-plan.md`
  - `campaigns/{slug}/signals.md` (WHAT to find, not HOW)
  - `campaigns/{slug}/pvp-strategy.md` (if PVP)
  - `campaigns/{slug}/copy/email-v1.md`
  - `campaigns/{slug}/copy/email-v2.md`
  - `campaigns/{slug}/copy/linkedin-v1.md`
- Database: `campaigns` table record (status = 'draft')
- Cost: **FREE** (no API calls)

**Key insight:** Create 3-5 campaign IDEAS, then pick the best 1-2 to launch.

---

### **Phase 3: `/offer-launch` - Find Companies & Contacts**

**Purpose:** Execute search using APIs to build target list

**⚠️ THIS IS WHERE YOU SPEND API CREDITS**

**Inputs:**
- Offer slug
- Campaign slug
- Optional: --limit, --skip-enrichment, --signal-only

**Process:**
1. Load offer context (ICP from `positioning-canvas.md`)
2. Load campaign context (signals from `campaigns/{slug}/signals.md`)
3. **API ROUTING** (This is where API logic lives!)
   ```
   Signal: "Hiring SDRs" → TheirStack
   Signal: "Using Salesforce" → Parallel (tech filter)
   Signal: "Recent funding" → Exa (AI search)
   No signal → Parallel (ICP only)
   ```
4. Find companies matching signals
5. Enrich with Parallel (verify ICP match)
6. Find contacts (Parallel people search)
7. Check status (Unipile - already contacted?)
8. Save everything to database

**Outputs:**
- Database:
  - `companies` table (enriched company data)
  - `contacts` table (decision-makers with LinkedIn URLs)
  - `campaign_contacts` table (links campaign → contacts, status = 'queued')
  - `tool_usage` table (API call logs for cost tracking)
  - Campaign status updated: 'draft' → 'ready'
- Cost: **💰 API CREDITS**
  - TheirStack: ~1-5 credits per search
  - Parallel: ~1-2 credits per enrichment/search
  - Exa: ~1-2 credits per search
  - Unipile: ~1 credit per status check

**What it does NOT do:**
- ❌ No messaging (copy already exists from Phase 2)
- ❌ No sending (just builds the list)

---

### **Phase 4: `/offer-send` - Review & Send**

**Purpose:** Personalize, review, and send messages via Unipile

**Status:** 🚧 **NOT YET IMPLEMENTED** (V2)

**Inputs:**
- Offer slug
- Campaign slug
- Optional: --batch, --dry-run

**Proposed Process:**
1. Load campaign queue (contacts with status = 'queued')
2. For each contact:
   - Select copy variant (A/B testing)
   - Personalize with signal context
   - Show preview to user
3. User reviews → Approve/Edit/Skip
4. Send approved via Unipile
   - Respects rate limits (20 conn req, 40 msg/day)
   - Random delays (2-5 min)
   - Business hours only
   - Log everything
5. Track results

**Outputs:**
- Database:
  - `messages` table (sent messages)
  - `account_activity` table (rate limit tracking)
  - `campaign_contacts` status: 'queued' → 'in_progress' → 'completed'
  - Campaign status: 'ready' → 'active'
- Unipile: Actual messages sent
- Cost: **FREE** (Unipile included in API plan)

---

## 📊 **Data Flow Summary**

```
/new-offer
├─ User input: Offer details
├─ Process: Positioning canvas (WHAT + WHO)
└─ Output: positioning-canvas.md, offers table

↓ (User creates multiple campaign ideas)

/offer-campaign (x3-5 times)
├─ Reads: positioning-canvas.md (ICP)
├─ User input: Signals + Messaging approach
├─ Process: Signal brainstorming, framework execution, copy generation
└─ Output: campaigns/{slug}/ folder, campaigns table

↓ (User picks best 1-2 campaigns to launch)

/offer-launch (x1-2 times)
├─ Reads: positioning-canvas.md (ICP) + campaigns/{slug}/signals.md
├─ Process: API routing, company search, enrichment, contact finding
└─ Output: companies, contacts, campaign_contacts tables

↓ (User reviews leads)

/offer-send (future)
├─ Reads: campaign queue, copy variants
├─ Process: Personalize, user review, send via Unipile
└─ Output: messages, account_activity tables
```

---

## 🔑 **Key Architectural Decisions**

### 1. **Separation of Concerns**

| Phase | Concern | Knowledge |
|-------|---------|-----------|
| `/new-offer` | Strategy | Positioning + ICP (stable attributes) |
| `/offer-campaign` | Planning | Signals (WHAT to find) + Messaging |
| `/offer-launch` | Execution | APIs (HOW to find) + Search |
| `/offer-send` | Delivery | Rate limits + Safety + Tracking |

### 2. **Where Things Live**

| Element | Command | Why |
|---------|---------|-----|
| **ICP** | `/new-offer` | Stable attributes (size, industry, titles) - same for all campaigns |
| **Signals** | `/offer-campaign` | Observable behaviors - varies by campaign |
| **API Mapping** | `/offer-launch` | Execution detail - not relevant to strategy |
| **Copy** | `/offer-campaign` | Messaging - varies by campaign approach |

### 3. **Why Multiple Campaigns Per Offer?**

**One offer can have multiple campaigns with different:**
- Signals (hiring vs tech stack vs funding)
- Messaging (PVP vs Use Case vs Problem)
- Target sizes (small test vs large scale)
- Channels (LinkedIn vs Email vs Both)

**Example:** Sales Roleplay Trainer offer
```
├─ Campaign 1: "hiring-signal-q1"
│  └─ Signal: Hiring SDRs, Messaging: PVP
├─ Campaign 2: "tech-stack-targeting"
│  └─ Signal: Using Salesforce, Messaging: Use Case
├─ Campaign 3: "problem-focused-urgent"
│  └─ Signal: Recent funding, Messaging: Problem
└─ User picks Campaign 1 to launch first
```

### 4. **Cost Control**

**Free (unlimited):**
- Phase 1: `/new-offer` (strategy)
- Phase 2: `/offer-campaign` (planning)

**Paid (use wisely):**
- Phase 3: `/offer-launch` (finding)

**Free (included):**
- Phase 4: `/offer-send` (sending)

**Strategy:** Create 5 campaign ideas (free), test best 2 (paid), learn, iterate.

---

## 🗄️ **Database Alignment**

### Offers Table
```sql
offers
├─ id, name, slug, type, ownership
├─ description, problem_solved, value_proposition
├─ icp JSONB (company + buyer profile)
└─ status: draft/ready/active/paused/completed
```

Created by: `/new-offer`  
Used by: `/offer-campaign`, `/offer-launch`

### Campaigns Table
```sql
campaigns
├─ id, name, offer_id
├─ channel (email/linkedin/multi)
├─ target_criteria JSONB (signals, target_count)
├─ sequence_config JSONB (approach, copy_variants)
├─ status: draft/ready/active/paused/completed
└─ performance metrics
```

Created by: `/offer-campaign`  
Updated by: `/offer-launch` (draft → ready), `/offer-send` (ready → active)

### Companies Table
```sql
companies
├─ id, offer_id, name, domain, url
├─ size, vertical, industry, location
├─ signals JSONB (hiring_roles, tech_stack, etc.)
├─ fit_score, priority
├─ source_tool (theirstack/parallel/exa)
└─ status: new/qualified/disqualified/contacted
```

Created by: `/offer-launch`  
Used by: `/offer-send`

### Contacts Table
```sql
contacts
├─ id, company_id, name, title
├─ linkedin_url, email, phone
├─ connection_degree, last_contacted_at
└─ status: new/contacted/responded/meeting
```

Created by: `/offer-launch`  
Used by: `/offer-send`

### Campaign_Contacts Table (Junction)
```sql
campaign_contacts
├─ id, campaign_id, contact_id, company_id
├─ current_step, max_step
├─ status: queued/in_progress/completed/replied
└─ engagement metrics
```

Created by: `/offer-launch`  
Updated by: `/offer-send`

### Messages Table
```sql
messages
├─ id, campaign_id, contact_id, company_id, account_id
├─ channel, message_type, subject, body
├─ copy_variant (which A/B test version)
├─ status: pending/sent/delivered/opened/replied
└─ sent_at, delivered_at, replied_at
```

Created by: `/offer-send`

---

## 📝 **Files Created/Updated**

### Commands
- ✅ `.cursor/commands/new-offer.md` (rewritten - no signals, no APIs)
- ✅ `.cursor/commands/offer-campaign.md` (NEW - signals + messaging)
- ✅ `.cursor/commands/offer-launch.md` (updated - reads offer + campaign)
- ✅ `.cursor/commands/offer-send.md` (NEW - stub for V2)

### Rules
- ✅ `.cursor/rules/project.mdc` (updated - 4-phase workflow)

### Documentation
- ✅ `docs/workflow-architecture-final.md` (this file)

---

## ✅ **Next Steps for You**

### Option 1: Test the Workflow (Recommended)
```bash
# Phase 1: Create offer (free)
/new-offer

# Phase 2: Create 3 campaign ideas (free)
/offer-campaign sales-roleplay-trainer hiring-signal-q1
/offer-campaign sales-roleplay-trainer tech-stack-targeting
/offer-campaign sales-roleplay-trainer pvp-benchmarks

# Pick the best one, then:

# Phase 3: Find companies (costs API credits)
/offer-launch sales-roleplay-trainer hiring-signal-q1
```

### Option 2: Implement API Clients
Before `/offer-launch` can work, you need:
1. **Parallel client** (company/people search) - CRITICAL
2. **TheirStack client** (hiring signals)
3. **Unipile client** (status checking)

### Option 3: Implement `/offer-send`
Build the review + send workflow for V2.

---

## 🎓 **What You Learned**

### Clean Separation
- **Strategy** (positioning) ≠ **Planning** (signals) ≠ **Execution** (APIs)
- Each phase has clear inputs/outputs
- No mixed concerns

### Multiple Campaigns
- One offer = multiple campaign approaches
- Create many ideas (free), launch few (paid)
- Different signals, messaging, targets per campaign

### Cost Control
- Free: Strategy + Planning (unlimited iterations)
- Paid: Execution (use wisely)
- User reviews before spending credits

### Database-Aligned
- Commands map directly to database tables
- Clear data flow between phases
- No duplicate or contradictory data

---

## ❓ **FAQ**

**Q: Why not put signals in `/new-offer`?**  
A: Different campaigns target different signals. Same offer, different approaches.

**Q: Why not generate copy in `/offer-launch`?**  
A: You want to review messaging BEFORE spending credits to find companies.

**Q: Can I skip `/offer-campaign` and go straight to `/offer-launch`?**  
A: No. `/offer-launch` needs signals from campaign to know what to search for.

**Q: Can I have multiple campaigns active at once?**  
A: Yes! Each campaign is independent. Run 3 campaigns simultaneously.

**Q: Do I need to create all API clients before testing?**  
A: No. You can test `/new-offer` and `/offer-campaign` right now (no APIs needed). Only `/offer-launch` needs API clients.

---

**You're ready to build! 🚀**

