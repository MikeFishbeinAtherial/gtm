# Codebase Guide - Understanding the System

## Overview

This codebase is an **AI-powered outreach system** that helps you test business offers through LinkedIn and email campaigns. It's designed to be thoughtful, relationship-first, and avoid spam.

---

## Key Concepts

### 1. **Offers** (`offers/` folder)

**What it is:** A product or service you're testing through outreach.

**Structure:**
```
offers/{offer-slug}/
├── README.md                    # Overview and status
├── positioning-canvas.md        # Who you're targeting and why
├── icp.md                        # Ideal Customer Profile (derived from positioning)
├── campaigns/                   # Different outreach strategies
│   └── {campaign-slug}/
│       ├── signals.md           # What to look for (hiring, tech stack, etc.)
│       └── strategy.md          # Messaging approach
├── copy/                        # Email/LinkedIn templates
└── results/                     # What worked, what didn't
```

**Example:** `offers/ai-sales-roleplay-trainer/` - An app that helps sales reps practice calls

**How I use it:**
- When you say "create a campaign for X offer", I look in `offers/{slug}/` for context
- I read `positioning-canvas.md` to understand your ICP
- I read `campaigns/{campaign-slug}/signals.md` to know what to search for
- I use this context to route API calls correctly

---

### 2. **Commands** (`.cursor/commands/` folder)

**What it is:** Pre-built workflows that guide you through complex tasks step-by-step.

**Available Commands:**
- `1-new-offer` - Create a new offer with positioning canvas
- `2-offer-campaigns` - Plan campaign strategies with signals
- `3-campaign-copy` - Write email + LinkedIn copy
- `4-campaigns-leads` - Find companies & contacts (spends API credits)
- `5-leads-outreach` - Review & send messages (V2 - not built yet)
- `6-campaign-review` - Analyze results (V2 - not built yet)

**How I use it:**
- When you run `/1-new-offer`, I follow the steps in `.cursor/commands/1-new-offer.md`
- Commands are like recipes - they tell me what to do, in what order
- They help ensure consistency and completeness

**Why they exist:**
- Complex workflows need structure (positioning → ICP → signals → copy → leads → send)
- Prevents skipping steps
- Makes it easier for me to help you systematically

---

### 3. **Networking Campaigns** (Separate from Offer Campaigns)

**What it is:** A different type of campaign focused on **existing 1st-degree LinkedIn connections** (not cold outreach).

**Key Difference:**
| Aspect | Offer Campaigns | Networking Campaigns |
|--------|-----------------|---------------------|
| **Source** | Discover new companies (Parallel, TheirStack) | Your existing LinkedIn connections |
| **Tables** | `companies`, `contacts`, `campaigns` | `linkedin_connections`, `networking_campaign_batches` |
| **Purpose** | Test product-market fit | Reconnect with your network |
| **Volume** | High (100s-1000s) | Lower (50-100) |

**Database Tables:**
- `linkedin_connections` - Your 1st-degree connections
- `linkedin_conversations` - Message threads
- `linkedin_messages` - Individual messages
- `networking_campaign_batches` - Campaign batches (like "Happy New Year 2025")
- `networking_outreach` - Individual outreach attempts

**Files to know:**
- `src/lib/networking/linkedin-sync.ts` - Syncs connections/messages from Unipile
- `scripts/sync-linkedin.ts` - Script to run the sync
- `scripts/generate-networking-messages.js` - Creates personalized messages
- `scripts/process-message-queue.js` - Sends messages (respects rate limits)

---

## API Tools & Where They're Documented

### Current Documentation Structure

**API Guides:** `context/api-guides/`
- `parallel-quick-reference.md` - Company/people search
- `theirstack-quick-reference.md` - Job posting signals
- `exa-quick-reference.md` - AI-powered web search
- `sumble.md` - Hiring signals & tech stack validation
- `firecrawl-quick-reference.md` - Web scraping

**API Clients:** `src/lib/clients/`
- `parallel.ts` - Company/people search & enrichment
- `theirstack.ts` - Job posting search
- `exa.ts` - AI web search
- `sumble.ts` - Hiring signals & tech validation
- `unipile.ts` - LinkedIn/email sending & inbox
- `leadmagic.ts` - Email finding/verification
- `firecrawl.ts` - Web scraping

### Recommendation: Add API Tool Folders

**YES, we should add better organization!** Here's what I recommend:

```
context/
├── api-guides/              # Keep existing (quick references)
│   ├── README.md            # Overview of all APIs
│   ├── parallel-quick-reference.md
│   ├── sumble.md
│   └── ...
└── api-tools/               # NEW: Detailed docs per tool
    ├── unipile/
    │   ├── README.md        # What it does, when to use
    │   ├── setup.md         # How to connect
    │   ├── connections.md   # How to get connections
    │   ├── messages.md      # How to get/send messages
    │   └── examples.ts      # Code examples
    ├── sumble/
    │   ├── README.md
    │   ├── hiring-signals.md
    │   ├── tech-validation.md
    │   └── examples.ts
    ├── parallel/
    │   ├── README.md
    │   ├── company-search.md
    │   ├── people-search.md
    │   └── examples.ts
    └── ...
```

**Why this helps:**
- **For you:** Easier to find "how do I get LinkedIn connections?"
- **For me:** Clearer context about what each API can do
- **For future:** Easier to add new APIs

---

## Key Files to Know

### For LinkedIn Connections & Messages

1. **`src/lib/networking/linkedin-sync.ts`**
   - `syncLinkedInConnections()` - Pulls all 1st-degree connections from Unipile
   - `syncLinkedInMessages()` - Pulls all conversations and messages
   - Maps Unipile data to our Supabase schema

2. **`scripts/sync-linkedin.ts`**
   - Script you run to sync data
   - Usage: `npx ts-node --esm scripts/sync-linkedin.ts`

3. **`scripts/setup-networking-schema.sql`**
   - Database schema for networking campaigns
   - Tables: `linkedin_connections`, `linkedin_conversations`, `linkedin_messages`, etc.

### For Campaign Management

1. **`src/lib/clients/unipile.ts`**
   - `listAccounts()` - Get your LinkedIn account ID
   - `getConversations()` - Get all conversations
   - `getMessages()` - Get messages in a conversation
   - `sendMessage()` - Send a LinkedIn message

2. **`src/lib/clients/sumble.ts`**
   - `findJobs()` - Find companies hiring for specific roles
   - `enrichOrganization()` - Check if company uses specific tech

3. **`scripts/generate-networking-messages.js`**
   - Creates personalized messages for a campaign batch
   - Filters out people already messaged

### For Duplicate Prevention

1. **`scripts/process-message-queue.js`**
   - Checks for duplicate messages before sending
   - Lines 333-360: LinkedIn ID duplicate check
   - Prevents sending to same person twice

2. **`scripts/generate-networking-messages.js`**
   - Lines 99-134: Checks for existing messages by connection_id, LinkedIn ID, and URL

---

## How to Use This System

### For a New Networking Campaign (Your Current Task)

**Step 1: Sync LinkedIn Data**
```bash
npx ts-node --esm scripts/sync-linkedin.ts
```
This pulls all connections and message history from Unipile → Supabase.

**Step 2: Filter Connections**
Query `linkedin_connections` table:
- Filter by `connected_at >= '2025-01-01'` (connected in 2025)
- Filter out people messaged in last 30 days (check `linkedin_messages`)

**Step 3: Get Company Insights (Sumble)**
For each connection's company:
- Use `sumble.findJobs()` to see if they're hiring salespeople
- Use `sumble.enrichOrganization()` to get tech stack insights

**Step 4: Create Campaign Batch**
Insert into `networking_campaign_batches` table with:
- Campaign name
- Message template
- Target filters

**Step 5: Generate Messages**
Run `scripts/generate-networking-messages.js` to create personalized messages.

**Step 6: Review & Send**
- Review messages in `networking_outreach` table
- Approve/edit each one
- Send via `scripts/process-message-queue.js` (respects rate limits)

---

## What Updates Should We Make?

### 1. **Better API Documentation** ✅ (Recommended above)

Create `context/api-tools/` with detailed docs per API tool.

### 2. **Connection Filtering Helper**

Create a script: `scripts/filter-connections.js`
- Takes filters (date range, exclude recent messages, etc.)
- Returns filtered connection IDs
- Makes it easier to create campaign batches

### 3. **Sumble Integration for Networking**

Create: `scripts/enrich-connections-with-sumble.js`
- Takes connection IDs
- Gets their companies
- Checks Sumble for hiring signals
- Saves insights to database

### 4. **Message History Context**

Enhance `linkedin_messages` table or create a view:
- `connection_message_history` view that shows full thread
- Makes it easier to see context before messaging

### 5. **Campaign Comparison**

Add a function to check:
- "Who was in the Happy New Year campaign?"
- "Don't message them again for 30 days"
- Prevents over-messaging

---

## Database Schema Quick Reference

### Networking Tables

**`linkedin_connections`**
- Your 1st-degree connections
- Fields: `linkedin_id`, `full_name`, `current_company`, `connected_at`, `last_interaction_at`

**`linkedin_conversations`**
- Message threads
- Links to `linkedin_connections`

**`linkedin_messages`**
- Individual messages
- Fields: `message_text`, `sent_at`, `is_from_me`, `connection_id`

**`networking_campaign_batches`**
- Campaign batches (e.g., "Happy New Year 2025")
- Fields: `name`, `message_template`, `target_filters`, `status`

**`networking_outreach`**
- Individual outreach attempts
- Fields: `batch_id`, `connection_id`, `personalized_message`, `status`, `sent_at`

### Offer Campaign Tables (Different System)

**`offers`** - Products/services you're testing
**`companies`** - Companies discovered for offers
**`contacts`** - People at those companies
**`campaigns`** - Outreach campaigns for offers
**`campaign_contacts`** - Links contacts to campaigns
**`messages`** - Messages sent in offer campaigns

---

## Common Questions

### Q: What's the difference between "offers" and "networking campaigns"?

**A:** 
- **Offers** = Testing a product/service with cold outreach to new companies
- **Networking** = Reconnecting with existing LinkedIn connections

They use different database tables and workflows.

### Q: How do I avoid messaging the same person twice?

**A:** The system checks:
1. `linkedin_messages` table - Have we messaged them before?
2. `networking_outreach` table - Are they in another campaign?
3. Unipile API - Do we have an existing conversation?

See `scripts/process-message-queue.js` lines 333-360 for the duplicate check.

### Q: How do I filter connections by date?

**A:** Query `linkedin_connections`:
```sql
SELECT * FROM linkedin_connections
WHERE connected_at >= '2025-01-01'
AND connected_at < '2026-01-01';
```

### Q: How do I exclude people messaged in last 30 days?

**A:** Join with `linkedin_messages`:
```sql
SELECT lc.*
FROM linkedin_connections lc
LEFT JOIN linkedin_messages lm ON lm.connection_id = lc.id
WHERE lm.sent_at IS NULL 
   OR lm.sent_at < NOW() - INTERVAL '30 days';
```

---

## Next Steps for Your Campaign

1. ✅ **Read this guide** (you're doing it!)
2. 🔄 **Sync LinkedIn data** - Run `sync-linkedin.ts`
3. 📊 **Filter connections** - Find 2025 connections, exclude recent messages
4. 🔍 **Enrich with Sumble** - Check which companies are hiring
5. 📝 **Create campaign batch** - Set up the new campaign
6. ✉️ **Generate messages** - Create personalized messages
7. 👀 **Review & send** - Approve each message before sending

Let me know when you're ready to start, and I'll help you with each step!
