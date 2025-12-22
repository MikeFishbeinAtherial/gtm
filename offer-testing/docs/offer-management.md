# Offer Management Guide

This guide explains how to manage offers using the Cursor slash commands and context system.

## Quick Start

1. Run `/new-offer` to create a new offer
2. Run `/offer-research {slug}` to research the market
3. Run `/offer-icp {slug}` to generate ICP
4. Run `/offer-copy {slug}` to generate outreach copy
5. Run `/offer-launch {slug}` to find companies and contacts
6. Send messages manually (V1)
7. Run `/offer-review {slug}` to analyze results

---

## Commands Reference

### /new-offer

Creates a new offer folder with all necessary files.

**Input:**
- Offer name (e.g., "AI Roleplay Trainer")
- One-sentence description
- Type: product or service
- Owner: internal or client name

**Output:**
- Creates `offers/{slug}/` folder
- Walks through positioning canvas
- Creates README with status tracking

**Example:**
```
/new-offer

Name: AI Roleplay Trainer
Description: AI bots that sales reps can practice with 24/7
Type: service
Owner: internal
```

---

### /offer-research

Gathers market intelligence before defining ICP.

**Input:**
- offer_slug (e.g., "roleplay-trainer")

**Process:**
1. Research competitors
2. Estimate market size (TAM/SAM/SOM)
3. Brainstorm signals
4. Update status to "researched"

**Output:**
- `research/competitors.md`
- `research/market-size.md`
- `research/notes.md`

---

### /offer-icp

Generates Ideal Customer Profile from positioning.

**Input:**
- offer_slug

**Process:**
1. Read positioning canvas
2. Generate company profile (size, vertical, signals)
3. Generate buyer profile (titles, pain points)
4. Create search queries
5. Save to Supabase
6. Update status to "icp_defined"

**Output:**
- `icp.md` file
- ICP JSON in Supabase offers table

---

### /offer-copy

Generates outreach copy templates.

**Input:**
- offer_slug
- Optional: focus (email, linkedin, both)

**Process:**
1. Read positioning and ICP
2. Generate 3-email sequence
3. Generate LinkedIn messages
4. Save to Supabase
5. Update status to "copy_ready"

**Output:**
- `copy/email-sequence.md`
- `copy/linkedin-messages.md`
- Templates in Supabase offers table

---

### /offer-launch

Finds companies and contacts, prepares outreach.

**Input:**
- offer_slug
- limit (default: 30)
- account (mike or eugene)

**Process:**
1. Find companies matching ICP
2. Find contacts at companies
3. Check LinkedIn status
4. Skip 1st degree and already contacted
5. Generate personalized messages
6. Save to Supabase
7. Update status to "campaign_active"

**Output:**
- Companies in Supabase
- Contacts in Supabase
- Pending outreach in Supabase
- Summary of what's ready

---

### /offer-review

Analyzes results and captures learnings.

**Input:**
- offer_slug
- Optional: campaign_id

**Process:**
1. Pull metrics from Supabase
2. Categorize responses
3. Identify patterns
4. Document learnings
5. Update general learnings if applicable
6. Recommend next steps

**Output:**
- Campaign results summary
- `results/learnings.md` updated
- Recommendations

---

## Folder Structure

Each offer lives in `offers/{slug}/`:

```
offers/roleplay-trainer/
├── README.md              # Overview, status, metrics
├── positioning-canvas.md  # Positioning decisions
├── icp.md                 # Ideal Customer Profile
├── copy/
│   ├── email-sequence.md  # Email templates
│   └── linkedin-messages.md
├── research/
│   ├── competitors.md
│   ├── market-size.md
│   └── notes.md
└── results/
    └── learnings.md
```

---

## Status Flow

```
positioning → researched → icp_defined → copy_ready → campaign_active
                                                           │
                                              ┌────────────┼────────────┐
                                              ▼            ▼            ▼
                                           paused     completed      killed
```

---

## Context System

### Layer 1: Global Context (Always On)

These Cursor rules always apply:
- `.cursor/rules/project.mdc` - Project overview
- `.cursor/rules/offer-management.mdc` - How to work with offers

### Layer 2: Framework Context (Referenced)

General frameworks Cursor can reference:
- `context/frameworks/positioning-canvas.md`
- `context/frameworks/icp-framework.md`
- `context/frameworks/signal-brainstorming.md`
- `context/copywriting/email-principles.md`
- `context/copywriting/linkedin-principles.md`

### Layer 3: Offer Context (Auto-Attached)

When working in an offer folder, these are automatically included:
- `offers/{slug}/positioning-canvas.md`
- `offers/{slug}/icp.md`
- `offers/{slug}/results/learnings.md`

---

## Best Practices

### 1. Complete Positioning First

Don't skip to ICP or copy without a solid positioning canvas. It's the foundation for everything else.

### 2. Be Specific in ICP

Generic ICPs lead to poor results. Be specific about:
- Company size (exact range)
- Verticals (specific industries, not "tech")
- Signals (how to actually find them)
- Disqualifiers (who to avoid)

### 3. Test Small, Learn Fast

Start with 30 contacts, not 300. Learn what works before scaling.

### 4. Document Everything

After each campaign:
- What subject lines worked?
- Which titles responded?
- What objections came up?
- What should we do differently?

### 5. Update General Learnings

If something works (or fails) across multiple offers, add it to:
- `context/learnings/what-works.md`
- `context/learnings/mistakes-to-avoid.md`

---

## LinkedIn Safety

**Daily Limits:**
- Max 20 connection requests/day
- Max 40 messages/day
- Business hours only (9am-6pm recipient time)

**Skip These:**
- 1st degree connections (don't cold message)
- People you've already messaged
- Contacts marked "do not contact"

The system tracks all activity in `linkedin_activity` table and enforces limits automatically.

---

## Troubleshooting

### "ICP is required"

Run `/offer-icp {slug}` first.

### "No companies found"

- Check your ICP search queries
- Try different data sources (parallel, exa, theirstack)
- Broaden your criteria

### "All contacts skipped"

Common reasons:
- All are 1st degree connections
- All have been contacted before
- No LinkedIn URLs found

Check `do_not_contact_reason` in contacts table.

### "Rate limit reached"

Wait until tomorrow. Limits reset at midnight UTC.

Check current usage:
```sql
SELECT * FROM linkedin_daily_counts WHERE account = 'mike';
```

