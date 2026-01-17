# Skill: Campaign Leads Discovery

**Skill Name:** `4-campaigns-leads`  
**Type:** Advanced Skill (includes scripts + executables)  
**Version:** 1.0.0

---

## Overview

Launch a campaign by finding companies and contacts that match your offer's ICP and campaign signals.

**⚠️ This skill spends API credits to find leads. Make sure your campaign plan is ready before running.**

---

## What This Skill Does

1. **Reads offer positioning** → Extracts ICP
2. **Reads campaign signals** → Extracts what to look for
3. **Routes to correct APIs** → Based on signal type (via `scripts/route-apis.ts`)
4. **Validates ICP match** → Before enrichment (via `scripts/validate-icp.ts`)
5. **Finds companies** → Matching ICP and signals
6. **Finds contacts** → Decision-makers at those companies
7. **Checks status** → Already contacted? Already connected?
8. **Saves to Supabase** → Ready for review and sending (via `scripts/save-to-supabase.ts`)

---

## Prerequisites

Before running this skill:
- ✅ Offer must exist with positioning (`1-new-offer` completed)
- ✅ Campaign must exist with signals and copy (`2-offer-campaigns` completed)
- ✅ API keys set in `.env`: `PARALLEL_API_KEY`, `THEIRSTACK_API_KEY`, `EXA_API_KEY`
- ✅ You've reviewed campaign plan and approved spending credits

---

## Usage

### Via Cursor Chat

```
/offer-launch {offer-slug} {campaign-slug} [--limit N] [--skip-enrichment] [--signal-only]
```

**Examples:**
```
/offer-launch sales-roleplay-trainer hiring-signal-q1
/offer-launch sales-roleplay-trainer pvp-benchmarks --limit 100
/offer-launch sales-roleplay-trainer tech-stack-targeting --signal-only
```

### Optional Parameters

- `--limit` - Max companies to find (default: 50)
- `--skip-enrichment` - Skip company enrichment (faster, less data)
- `--signal-only` - Only find companies with signals (skip ICP-only fallback)

---

## Skill Structure

```
.cursor/skills/4-campaigns-leads/
├── README.md (this file)
├── scripts/
│   ├── validate-icp.ts          # ICP validation logic
│   ├── route-apis.ts            # API routing logic
│   ├── find-companies.ts        # Company discovery
│   ├── enrich-companies.ts      # Company enrichment
│   ├── find-contacts.ts         # Contact discovery
│   ├── check-status.ts          # LinkedIn status checks
│   └── save-to-supabase.ts      # Database operations
└── assets/
    └── api-routing-config.json  # API routing configuration
```

---

## How It Works

### Step 1: Load Context

The skill reads:
1. `offers/{offer-slug}/positioning-canvas.md` → ICP
2. `offers/{offer-slug}/campaigns/{campaign-slug}/signals.md` → Signals

### Step 2: Validate & Route

- **ICP Validation:** `scripts/validate-icp.ts` checks if companies match ICP before enrichment
- **API Routing:** `scripts/route-apis.ts` determines which APIs to use based on signal type

### Step 3: Execute Workflow

The skill orchestrates:
1. Company discovery (TheirStack/Parallel/Exa)
2. Company enrichment (Parallel)
3. Contact discovery (Parallel)
4. Status checks (Unipile)
5. Database save (Supabase)

### Step 4: Log Everything

All API calls are automatically logged to `tool_usage` table via hooks (see `.cursor/hooks/`).

---

## Benefits Over Command

**Command (old):**
- ❌ Just a markdown prompt
- ❌ AI follows instructions (non-deterministic)
- ❌ No reusable code
- ❌ Context bloated upfront

**Skill (new):**
- ✅ Includes actual TypeScript scripts
- ✅ Deterministic code execution
- ✅ Reusable, testable functions
- ✅ Only loads when used (no context bloat)
- ✅ Can be shared/distributed

---

## Related Files

- **Original Command:** `.cursor/commands/4-campaigns-leads.md` (kept for reference)
- **Positioning Framework:** `context/frameworks/positioning-canvas.md`
- **Signal Framework:** `context/frameworks/signal-brainstorming.md`
- **API Routing Rules:** `.cursor/rules/project.mdc` (API routing section)
- **Tool Usage Hooks:** `.cursor/hooks/tool-usage-logger.ts`

---

## Migration Notes

This skill is the evolution of the command at `.cursor/commands/4-campaigns-leads.md`.

**What changed:**
- Extracted reusable logic into TypeScript scripts
- Added deterministic ICP validation
- Integrated with hooks for automatic tool usage logging
- Better error handling and type safety

**What stayed the same:**
- Same workflow and outputs
- Same prerequisites
- Same user experience

---

## Future Enhancements

- [ ] Add parallel company research (sub-agents)
- [ ] Add caching layer for repeated queries
- [ ] Add cost estimation before execution
- [ ] Add progress tracking/resume capability
