# Campaign Lead Discovery

Find companies and contacts matching your offer's ICP and campaign signals.

## Description

Launch a campaign by discovering companies that exhibit specific signals (hiring, tech usage, funding) and finding decision-maker contacts at those companies. Routes to the appropriate APIs based on signal type, validates ICP match before spending credits, and saves results to Supabase.

## When to Use

- User asks to "find leads" or "discover companies" for a campaign
- User wants to "launch" or "execute" a campaign
- User asks to find contacts matching an ICP
- User references phase 4 of the workflow

## Prerequisites

- Offer exists with positioning (`offers/{slug}/{slug}-positioning.md`)
- Campaign exists with signals (`offers/{slug}/campaigns/{campaign}/strategy.md`)
- API keys configured: `PARALLEL_API_KEY`, `THEIRSTACK_API_KEY`, `EXA_API_KEY`

## Instructions

### Step 1: Load Context

Read these files to understand what to find:
1. `offer-testing/offers/{offer-slug}/{slug}-positioning.md` - Extract ICP (company size, industry, buyer titles)
2. `offer-testing/offers/{offer-slug}/campaigns/{campaign-slug}/strategy.md` - Extract signals

### Step 2: Route to APIs

Based on signal type, determine primary API:

| Signal Type | Primary API | Purpose |
|-------------|-------------|---------|
| "Hiring [role]" | TheirStack | Job posting detection |
| "Using [tech]" | Parallel | Tech stack filtering |
| "Company growth" | Parallel | Employee count trends |
| "Recent funding" | Exa | News/funding search |
| No specific signal | Parallel | ICP firmographics only |

### Step 3: Execute Discovery

1. **Find Companies** - Query primary API with signal + ICP filters
2. **Validate ICP** - Before enrichment, verify company matches ICP criteria
3. **Enrich Companies** - Use Parallel for firmographic data
4. **Find Contacts** - Use Parallel people search for buyer titles
5. **Check Status** - Use Unipile to check LinkedIn connection/conversation status
6. **Save to Supabase** - Insert to companies, contacts, campaign_contacts tables

### Step 4: Apply LinkedIn Safety Rules

Before saving contacts, filter based on:
- Skip 1st degree connections
- Skip already contacted
- Skip if no valid contact method

### Step 5: Report Results

Show summary with:
- Companies found and ICP match rate
- Contacts found and ready for outreach
- Signal performance metrics
- API usage and estimated cost

## API Clients

Located in `offer-testing/src/lib/clients/`:
- `parallel.ts` - Company/people search, enrichment
- `theirstack.ts` - Job posting signals
- `exa.ts` - AI-powered web search
- `unipile.ts` - LinkedIn status checks
- `supabase.ts` - Database operations

## Database Tables

- `companies` - Discovered companies
- `contacts` - Decision-makers
- `campaign_contacts` - Links contacts to campaigns with status

## Cost Warning

This skill spends API credits. Always:
1. Confirm campaign plan is ready before running
2. Show cost estimate before execution
3. Log all API calls to `tool_usage` table

## Related Files

- ICP Framework: `offer-testing/context/frameworks/positioning-canvas.md`
- Signal Framework: `offer-testing/context/frameworks/signal-brainstorming.md`
- LinkedIn Safety: `offer-testing/src/lib/utils/linkedin-safety.ts`
- API Guides: `offer-testing/docs/api-guides/`
