# Campaign Planning

Create campaign strategies with signals and messaging frameworks.

## Description

Plan outbound campaigns by brainstorming signals (observable behaviors indicating a company has the problem) and choosing messaging frameworks. Creates multiple campaign ideas so you can test different approaches.

## When to Use

- User wants to create a "campaign" for an offer
- User asks to brainstorm "signals" for targeting
- User wants to plan "outreach strategy"
- User references phase 2 of the workflow

## Prerequisites

- Offer must exist with positioning (`offers/{slug}/{slug}-positioning.md`)

## Instructions

### Step 1: Load Offer Context

Read `offers/{offer-slug}/{slug}-positioning.md` to understand:
- ICP (who to target)
- Customer problem (what they're experiencing)
- Benefits (what outcomes to highlight)

### Step 2: Brainstorm Signals

Signals are observable behaviors that indicate a company is experiencing the problem. Generate 5-10 signal ideas:

| Signal Type | Example | Detection Method |
|-------------|---------|------------------|
| Hiring | "Hiring 3+ SDRs" | TheirStack job search |
| Tech Stack | "Using Salesforce" | Parallel tech filters |
| Growth | "50%+ headcount growth" | Parallel employee trends |
| Funding | "Series B in last 6 months" | Exa news search |
| Content | "Posted about [topic]" | Exa content search |

**Key insight:** Quality depends on signals. Random companies = spam. Companies experiencing the problem = relevant.

### Step 3: Choose Messaging Framework

Select framework based on offer type:

1. **Permissionless Value (PVP)** - Give value before asking
   - Best for: Breaking into new accounts, building trust
   - Reference: `context/frameworks/permissionless-value.md`

2. **Use Case-Driven** - Show exact implementation
   - Best for: Clear product-market fit, quantifiable impact
   - Reference: `context/frameworks/use-case-driven-outreach.md`

3. **Problem-Focused** - Lead with the pain point
   - Best for: Urgent problems, clear consequences

### Step 4: Collect Campaign Metadata

**REQUIRED:** Every campaign must include:

1. **Campaign Type:** `cold` or `networking`
2. **Offer Slug:** From command input
3. **Channel:** `email`, `linkedin`, or `multi`
4. **Account IDs & Names:** Query Supabase `accounts` table to list available accounts
   - For email: Show email accounts (type='email')
   - For LinkedIn: Show LinkedIn accounts (type='linkedin')
   - For multi: Show both types
   - User selects which account(s) to use
   - Store as: `[{"id": "...", "name": "...", "type": "email|linkedin"}, ...]`
5. **Primary Signal:** Short description (e.g., "hiring", "tech-stack", "funding")
6. **ICP Target:** Specific segment (e.g., "pmre-companies", "hedge-funds")

### Step 5: Generate Campaign Name & Slug

**Format:** `{type}-{offer-slug}-{channel}-{signal}-{icp}-{account-slug}`

**Example:** `cold-roleplay-linkedin-hiring-pmre-mike`

**Rules:**
- All components URL-friendly (lowercase, hyphens only)
- Account slug = first part of account name/email
- Signal = 1-2 words max
- ICP target = 1-2 words max

### Step 6: Create Campaign Strategy

For each campaign idea, document:
- Campaign name and slug (using structured format above)
- Campaign type (cold/networking)
- Channel (email/linkedin/multi)
- Account IDs and names
- Primary signal (how to find companies)
- ICP target segment
- Secondary signals (additional filters)
- Messaging framework choice
- Key hooks/angles to test

### Step 7: Save Campaign Files

```
offers/{offer-slug}/campaigns/{campaign-slug}/
├── {campaign-slug}-campaign-plan.md    # Full campaign metadata + overview
├── {campaign-slug}-signals.md          # Signal definitions
└── {campaign-slug}-strategy.md          # Messaging framework details
```

**File naming:** All files must include the full campaign-slug in their names to ensure uniqueness and easy identification.

### Step 6: Recommend Next Steps

```
Created {N} campaign ideas for {offer-name}

Recommended to launch first:
1. {campaign-1} - {reason}
2. {campaign-2} - {reason}

Next: Run copy generation for {campaign-slug} to create email/LinkedIn variants
```

## Output Files

- `offers/{slug}/campaigns/{campaign-slug}/strategy.md` - Campaign strategy

## Cost

Free - no API calls. This is planning only.

## Related Files

- Signal Framework: `offer-testing/context/frameworks/signal-brainstorming.md`
- PVP Framework: `offer-testing/context/frameworks/permissionless-value.md`
- Use Case Framework: `offer-testing/context/frameworks/use-case-driven-outreach.md`
