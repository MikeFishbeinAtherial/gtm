# Offer Management Process & Context Engineering

## The Problem

Each new offer needs:
1. **General context** - Best practices that apply to ALL offers
2. **Offer-specific context** - ICP, positioning, copy, learnings for THIS offer
3. **Organized codebase** - Easy to find and update offer files
4. **Repeatable process** - Same steps every time, automated where possible

---

## Folder Structure

```
offer-testing/
├── .cursor/
│   ├── rules/
│   │   ├── project.mdc              # Always apply - project overview
│   │   ├── offer-management.mdc     # How to work with offers
│   │   └── ...
│   └── commands/
│       ├── new-offer.md             # /new-offer - Create new offer
│       ├── offer-research.md        # /offer-research - Research phase
│       ├── offer-icp.md             # /offer-icp - Generate ICP
│       ├── offer-copy.md            # /offer-copy - Generate copy
│       ├── offer-launch.md          # /offer-launch - Launch campaign
│       └── offer-review.md          # /offer-review - Review results
│
├── context/                          # GENERAL context (all offers)
│   ├── frameworks/
│   │   ├── positioning-canvas.md    # Template for positioning
│   │   ├── icp-framework.md         # How to define ICP
│   │   ├── signal-brainstorming.md  # How to find signals
│   │   └── permissionless-value.md  # Value-first framework
│   ├── copywriting/
│   │   ├── email-principles.md      # Cold email best practices
│   │   ├── linkedin-principles.md   # LinkedIn messaging best practices
│   │   ├── subject-lines.md         # Subject line formulas
│   │   └── cta-patterns.md          # Call-to-action patterns
│   ├── examples/
│   │   ├── good-icps/               # Examples of good ICPs
│   │   ├── good-emails/             # Examples of good emails
│   │   └── good-campaigns/          # Examples of successful campaigns
│   └── learnings/
│       ├── what-works.md            # Cross-offer learnings
│       └── mistakes-to-avoid.md     # Things that failed
│
├── offers/                           # OFFER-SPECIFIC context
│   ├── _template/                   # Template for new offers
│   │   ├── README.md
│   │   ├── positioning-canvas.md
│   │   ├── icp.md
│   │   ├── copy/
│   │   │   ├── email-sequence.md
│   │   │   └── linkedin-messages.md
│   │   ├── research/
│   │   │   └── notes.md
│   │   └── results/
│   │       └── learnings.md
│   │
│   ├── roleplay-trainer/            # Example: AI Roleplay Trainer
│   │   ├── README.md                # Offer overview & status
│   │   ├── positioning-canvas.md    # Filled positioning canvas
│   │   ├── icp.md                   # ICP definition
│   │   ├── copy/
│   │   │   ├── email-sequence.md    # Email templates
│   │   │   ├── linkedin-messages.md # LinkedIn templates
│   │   │   └── variations/          # A/B test variations
│   │   ├── research/
│   │   │   ├── competitors.md       # Competitor research
│   │   │   ├── market-size.md       # TAM/SAM/SOM
│   │   │   └── customer-interviews.md
│   │   └── results/
│   │       ├── campaign-1.md        # Results from first campaign
│   │       └── learnings.md         # What we learned
│   │
│   ├── redshift/                    # Example: Deepfake Detection
│   │   └── ...
│   │
│   └── hammer/                      # Example: Appointment Setter
│       └── ...
│
├── src/                             # Code
└── ui/                              # Frontend
```

---

## Context Engineering: How It Works

### Layer 1: Global Context (Always Available)

These are Cursor Rules that ALWAYS apply:

```
.cursor/rules/project.mdc         → Always on
.cursor/rules/offer-management.mdc → Always on
```

### Layer 2: Framework Context (Referenced When Needed)

General frameworks in `context/` that Cursor can reference:

```
When generating ICP → Read context/frameworks/icp-framework.md
When writing emails → Read context/copywriting/email-principles.md
When positioning    → Read context/frameworks/positioning-canvas.md
```

### Layer 3: Offer-Specific Context (Auto-Attached)

Each offer folder has its own context that auto-attaches:

```
.cursor/rules/offers/roleplay-trainer.mdc  → Auto-attach for offers/roleplay-trainer/*
```

This rule would contain:
- Quick summary of the offer
- Link to positioning canvas
- Link to ICP
- Any special instructions

---

## Cursor Rules for Offer Management

### `.cursor/rules/offer-management.mdc`

```mdc
---
description: How to manage offers and their context
globs: ["offers/**/*"]
alwaysApply: false
---

# Offer Management

## Folder Structure
Each offer lives in `offers/{offer-slug}/` with this structure:
- README.md - Overview and current status
- positioning-canvas.md - Positioning decisions
- icp.md - Ideal Customer Profile
- copy/ - Email and LinkedIn templates
- research/ - Market research and notes
- results/ - Campaign results and learnings

## Creating New Offers
Use the /new-offer command. This will:
1. Create the folder structure from template
2. Guide you through positioning canvas
3. Generate initial ICP
4. Create draft copy

## Context References
When working on an offer, always reference:
1. The offer's own files (positioning, ICP)
2. General frameworks from context/frameworks/
3. Relevant examples from context/examples/

## Updating Learnings
After each campaign, update:
1. offers/{slug}/results/learnings.md - What we learned
2. context/learnings/what-works.md - If broadly applicable
```

---

## Slash Commands

### `/new-offer` - Create New Offer

```markdown
# /new-offer - Create a New Offer

Create a complete offer folder with all necessary context files.

## Input Required
When you run this command, provide:
- Offer name (e.g., "AI Roleplay Trainer")
- One-sentence description
- Is this a product or service?
- Is this internal or for a client?

## Process

### Step 1: Create Folder Structure
Copy `offers/_template/` to `offers/{slug}/`

### Step 2: Positioning Canvas
Read `context/frameworks/positioning-canvas.md` for the template.
Walk the user through each section:
1. Target Customer
2. Problem/Pain
3. Current Solutions
4. Our Solution
5. Key Differentiators
6. Proof Points
7. One-Line Pitch

Save to `offers/{slug}/positioning-canvas.md`

### Step 3: Create README
Generate `offers/{slug}/README.md` with:
- Offer name and description
- Type (product/service)
- Owner (internal/client)
- Current status: "positioning"
- Created date
- Links to key files

### Step 4: Create Cursor Rule (Optional)
Ask if user wants auto-context for this offer.
If yes, create `.cursor/rules/offers/{slug}.mdc`

### Step 5: Next Steps
Tell user to run:
- /offer-research {slug} - Do market research
- /offer-icp {slug} - Generate ICP
- /offer-copy {slug} - Generate copy

## Example Usage
```
/new-offer

Name: AI Roleplay Trainer
Description: AI bots that sales reps can practice with 24/7
Type: service
Owner: internal
```
```

### `/offer-research` - Research Phase

```markdown
# /offer-research - Research an Offer

Gather market intelligence before defining ICP.

## Input
- offer_slug: Which offer to research

## Process

### Step 1: Load Context
Read `offers/{slug}/positioning-canvas.md` to understand the offer.

### Step 2: Competitor Research
Search for competitors using web search.
Document in `offers/{slug}/research/competitors.md`:
- Direct competitors
- Indirect competitors  
- How they position
- Their pricing
- Their weaknesses

### Step 3: Market Size
Estimate TAM/SAM/SOM.
Document in `offers/{slug}/research/market-size.md`

### Step 4: Signal Ideas
Read `context/frameworks/signal-brainstorming.md`
Brainstorm signals that indicate a company needs this.
Add to `offers/{slug}/research/notes.md`

### Step 5: Update Status
Update `offers/{slug}/README.md` status to "researched"

## Example Usage
```
/offer-research roleplay-trainer
```
```

### `/offer-icp` - Generate ICP

```markdown
# /offer-icp - Generate ICP for an Offer

Create Ideal Customer Profile based on positioning and research.

## Input
- offer_slug: Which offer

## Process

### Step 1: Load Context
Read these files:
- `offers/{slug}/positioning-canvas.md`
- `offers/{slug}/research/notes.md` (if exists)
- `context/frameworks/icp-framework.md`

### Step 2: Generate ICP
Create ICP with these sections:

**Company Profile**
- Verticals (industries)
- Size range (employees)
- Stage (startup, growth, enterprise)
- Geography
- Signals (what indicates they need this)
- Disqualifiers (what indicates they DON'T need this)

**Buyer Profile**
- Titles (decision makers)
- Departments
- Seniority level
- Pain points they feel
- Goals they have
- Objections they might raise

**Search Queries**
- Parallel API queries to find companies
- TheirStack queries (job postings)
- LinkedIn search filters

### Step 3: Save ICP
Save to `offers/{slug}/icp.md`

### Step 4: Update Supabase
Create or update offer record with ICP JSON.

### Step 5: Update Status
Update `offers/{slug}/README.md` status to "icp_defined"

## Example Usage
```
/offer-icp roleplay-trainer
```
```

### `/offer-copy` - Generate Copy

```markdown
# /offer-copy - Generate Outreach Copy

Create email and LinkedIn templates for an offer.

## Input
- offer_slug: Which offer
- Optional: specific focus (email, linkedin, both)

## Process

### Step 1: Load Context
Read these files:
- `offers/{slug}/positioning-canvas.md`
- `offers/{slug}/icp.md`
- `context/copywriting/email-principles.md`
- `context/copywriting/linkedin-principles.md`
- `context/examples/good-emails/` (pick 2-3 relevant examples)

### Step 2: Generate Email Sequence
Create 3-email sequence:
- Email 1: Initial outreach (day 0)
- Email 2: Follow-up with value (day 3)
- Email 3: Break-up email (day 7)

Include:
- Subject line options (3 per email)
- Body with {{personalization}} variables
- Reasoning for approach

Save to `offers/{slug}/copy/email-sequence.md`

### Step 3: Generate LinkedIn Messages
Create:
- Connection request (under 300 chars)
- Follow-up DM (after accepted)
- InMail version (if needed)

Save to `offers/{slug}/copy/linkedin-messages.md`

### Step 4: Update Supabase
Update offer record with copy templates.

### Step 5: Update Status
Update `offers/{slug}/README.md` status to "copy_ready"

## Example Usage
```
/offer-copy roleplay-trainer
```
```

### `/offer-launch` - Launch Campaign

```markdown
# /offer-launch - Launch a Campaign for an Offer

Find companies, contacts, and prepare outreach.

## Input
- offer_slug: Which offer
- limit: How many companies (default: 30)
- account: Which account to use (mike/eugene)

## Process

### Step 1: Verify Readiness
Check that these exist:
- `offers/{slug}/icp.md`
- `offers/{slug}/copy/email-sequence.md`
- `offers/{slug}/copy/linkedin-messages.md`

If missing, tell user to run /offer-icp or /offer-copy first.

### Step 2: Create Campaign in Supabase
Create campaign record linked to offer.

### Step 3: Find Companies
Read ICP for search queries.
Use Parallel API to find companies.
Save to Supabase companies table.

### Step 4: Find Contacts
Use ICP buyer titles.
Use Parallel API to find people.
Save to Supabase contacts table.

### Step 5: Check Status
Use Unipile to check each contact:
- Already messaged?
- Connection degree?
Skip 1st degree connections.

### Step 6: Generate Personalized Copy
For each contact, personalize templates.
Save to Supabase messages table (status: pending).

### Step 7: Update Status
Update `offers/{slug}/README.md` status to "campaign_active"

### Step 8: Summary
Show:
- Companies found
- Contacts found
- Contacts to skip (with reasons)
- Contacts ready
- Next steps

## Example Usage
```
/offer-launch roleplay-trainer --limit 30 --account mike
```
```

### `/offer-review` - Review Results

```markdown
# /offer-review - Review Campaign Results

Analyze results and capture learnings.

## Input
- offer_slug: Which offer
- campaign_id: Optional, specific campaign

## Process

### Step 1: Pull Metrics from Supabase
Query campaign performance:
- Sent count
- Open rate
- Reply rate
- Positive reply rate
- Meetings booked

### Step 2: Analyze Responses
Pull all replies.
Categorize:
- Positive (interested)
- Negative (not interested, with reason)
- Questions (need more info)
- Not now (timing)

### Step 3: Identify Patterns
What worked:
- Which subject lines got opens?
- Which messages got replies?
- What types of companies responded?
- What titles were most responsive?

What didn't work:
- Common objections
- Who ignored us
- What bounced

### Step 4: Document Learnings
Create/update `offers/{slug}/results/campaign-{n}.md`:
- Metrics summary
- What worked
- What didn't
- Hypotheses for next campaign

### Step 5: Update General Learnings
If broadly applicable, update:
- `context/learnings/what-works.md`
- `context/learnings/mistakes-to-avoid.md`

### Step 6: Recommendations
Suggest next steps:
- Kill the offer?
- Iterate messaging?
- Try different ICP?
- Scale up?

## Example Usage
```
/offer-review roleplay-trainer
```
```

---

## Context Framework Files

### `context/frameworks/positioning-canvas.md`

```markdown
# Positioning Canvas Template

Use this template to define positioning for any offer.

---

## 1. Target Customer

**Who is this for?**
- Company type:
- Company size:
- Industry/vertical:
- Stage:

**Who is the buyer?**
- Title:
- Department:
- What they care about:

---

## 2. Problem / Pain

**What problem do they have?**
[Describe the core problem]

**Why does it hurt?**
- Business impact:
- Emotional impact:
- Frequency:

**What triggers the pain?**
- Events that make it urgent:
- Signals we can detect:

---

## 3. Current Solutions

**How do they solve this today?**
| Solution | Pros | Cons |
|----------|------|------|
| DIY | | |
| Competitor A | | |
| Competitor B | | |
| Do nothing | | |

**Why aren't current solutions good enough?**

---

## 4. Our Solution

**What do we offer?**
[One paragraph description]

**How does it work?**
1. Step 1
2. Step 2
3. Step 3

**What's the outcome?**
- Immediate benefit:
- Long-term benefit:

---

## 5. Key Differentiators

**Why us over alternatives?**

| Differentiator | Why It Matters |
|----------------|----------------|
| | |
| | |
| | |

**What can we do that others can't?**

---

## 6. Proof Points

**Why should they believe us?**

- Case study:
- Testimonial:
- Data point:
- Credential:

---

## 7. One-Line Pitch

**Complete this sentence:**
"We help [TARGET CUSTOMER] [SOLVE PROBLEM] by [HOW], so they can [OUTCOME]."

**Variations:**
- Problem-led:
- Solution-led:
- Outcome-led:

---

## 8. Objection Handling

| Objection | Response |
|-----------|----------|
| "Too expensive" | |
| "We already have X" | |
| "Not a priority" | |
| "Need to think about it" | |
```

### `context/frameworks/icp-framework.md`

```markdown
# ICP (Ideal Customer Profile) Framework

## What is an ICP?

A precise description of:
1. The COMPANY most likely to buy
2. The PERSON at that company who decides

## Company Profile

### Firmographics
- **Size**: Employee count range (e.g., 20-200)
- **Revenue**: If relevant
- **Stage**: Startup, growth, mature, enterprise
- **Geography**: Where they're located

### Industry/Vertical
- Primary verticals (be specific)
- Adjacent verticals (might work)
- Excluded verticals (definitely not)

### Signals (How to Find Them)
These indicate they likely have the problem:

| Signal | Where to Find | Why It Matters |
|--------|---------------|----------------|
| Hiring for X role | TheirStack | Indicates growth/need |
| Using Y tool | BuiltWith | Shows sophistication |
| Recently funded | Crunchbase | Has budget |
| Posted about Z | LinkedIn | Pain is top of mind |

### Disqualifiers
These indicate they're NOT a fit:

| Disqualifier | Why |
|--------------|-----|
| Enterprise only | Sales cycle too long |
| No sales team | Don't have the problem |
| Using competitor | Hard to switch |

## Buyer Profile

### Titles (Decision Makers)
Primary titles who can buy:
- 
- 
- 

Secondary titles (influencers):
-
-

### Seniority
- [ ] C-Level
- [ ] VP
- [ ] Director
- [ ] Manager
- [ ] Individual Contributor

### Department
- [ ] Sales
- [ ] Marketing
- [ ] Engineering
- [ ] Operations
- [ ] HR
- [ ] Finance

### Pain Points They Feel
What keeps them up at night:
1. 
2.
3.

### Goals They Have
What they're trying to achieve:
1.
2.
3.

### How They Buy
- Solo decision or committee?
- Budget range:
- Buying process:
- Timeline:

## Search Queries

### Parallel API
```
{
  "query": "...",
  "type": "company",
  "filters": {...}
}
```

### TheirStack (Job Postings)
```
{
  "job_titles": ["..."],
  "company_size": {...}
}
```

### LinkedIn Sales Navigator
- Industry:
- Company size:
- Keywords:
```

---

## Offer README Template

### `offers/_template/README.md`

```markdown
# {Offer Name}

## Overview
- **Type**: Product / Service
- **Owner**: Internal / Client ({client name})
- **Status**: `positioning` | `researched` | `icp_defined` | `copy_ready` | `campaign_active` | `paused` | `completed` | `killed`
- **Created**: {date}
- **Last Updated**: {date}

## One-Line Pitch
{Complete the positioning canvas first}

## Quick Links
- [Positioning Canvas](./positioning-canvas.md)
- [ICP](./icp.md)
- [Email Copy](./copy/email-sequence.md)
- [LinkedIn Copy](./copy/linkedin-messages.md)
- [Research Notes](./research/notes.md)
- [Learnings](./results/learnings.md)

## Current Campaigns

| Campaign | Status | Sent | Replies | Meetings |
|----------|--------|------|---------|----------|
| | | | | |

## Key Metrics
- Total companies: 
- Total contacts:
- Total sent:
- Reply rate:
- Meeting rate:

## Learnings So Far
{Updated after each campaign}

## Next Steps
- [ ] 
- [ ] 
```

---

## The Complete Workflow

### Starting a New Offer

```
1. /new-offer
   → Creates offers/{slug}/ folder
   → Walks through positioning canvas
   → Creates README

2. /offer-research {slug}
   → Researches competitors
   → Estimates market size
   → Brainstorms signals

3. /offer-icp {slug}
   → Generates ICP from positioning + research
   → Saves to offers/{slug}/icp.md
   → Updates Supabase

4. /offer-copy {slug}
   → Generates email sequence
   → Generates LinkedIn messages
   → Saves to offers/{slug}/copy/

5. /offer-launch {slug} --limit 30 --account mike
   → Finds companies (Parallel)
   → Finds contacts (Parallel)
   → Checks status (Unipile)
   → Prepares messages
   → Ready to send

6. [Manual or automated sending]

7. /offer-review {slug}
   → Analyzes results
   → Documents learnings
   → Recommends next steps
```

### Context Flow

```
General Context (always available)
    │
    ├── context/frameworks/           ← Templates and methods
    ├── context/copywriting/          ← Writing principles
    ├── context/examples/             ← Good examples to reference
    └── context/learnings/            ← Cross-offer learnings
    
         │
         ▼
         
Offer-Specific Context (per offer)
    │
    ├── offers/{slug}/positioning-canvas.md
    ├── offers/{slug}/icp.md
    ├── offers/{slug}/copy/
    └── offers/{slug}/results/learnings.md
    
         │
         ▼
         
Cursor Rules (auto-attach)
    │
    └── .cursor/rules/offers/{slug}.mdc
        (Summarizes offer, links to key files)
```

---

## Benefits of This Approach

1. **Repeatable**: Same process for every offer
2. **Organized**: Easy to find any offer's context
3. **Learnable**: Learnings accumulate over time
4. **Contextual**: Cursor always has relevant context
5. **Auditable**: Can see history of each offer
6. **Shareable**: Could add Eugene to the repo
