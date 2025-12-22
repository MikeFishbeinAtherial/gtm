# /new-offer - Create a New Offer

Create a complete offer with positioning and ICP (Ideal Customer Profile).

**This command focuses on WHAT you're selling and WHO needs it, NOT how to reach them.**

---

## Context Management Strategy

**Why Each Offer Gets Its Own Folder:**

When working with multiple offers, we need to keep context isolated and organized:

- ✅ **Isolated context:** Each offer has `offers/{slug}/positioning-canvas.md` that other commands reference
- ✅ **No context pollution:** Creating a new offer doesn't pull in irrelevant info from other offers
- ✅ **Targeted context:** When launching a campaign, AI only loads that specific offer's positioning
- ✅ **Scalable:** Can manage 10, 20, 50+ offers without chaos

**How Other Commands Use This:**
```
/offer-campaign ai-sales-roleplay-trainer
  → Reads @offers/ai-sales-roleplay-trainer/ai-sales-roleplay-trainer-positioning.md
  → Creates campaigns/{slug}/ with signals and copy

/offer-launch ai-sales-roleplay-trainer hiring-signal
  → Reads @offers/ai-sales-roleplay-trainer/ai-sales-roleplay-trainer-positioning.md
  → Reads @offers/ai-sales-roleplay-trainer/campaigns/hiring-signal/
  → Finds companies matching ICP + signals
```

---

## Input Required

When you run `/new-offer`, provide:
- **Offer name** (e.g., "AI Sales Roleplay Trainer")
- **One-sentence description** (e.g., "AI bots that sales reps practice with 24/7")
- **Type**: `product` or `service`
- **Ownership**: `internal` or `client` (if client, which one?)

---

## Process

### Step 1: Create Offer Folder Structure

**Create the following directory structure:**

```
offers/{slug}/
├── {slug}-README.md                    ← Offer overview and status
├── {slug}-positioning.md               ← Positioning + ICP (STABLE attributes)
├── campaigns/                          ← Campaign strategies (created by 2-offer-campaigns)
├── copy/                               ← Email + LinkedIn copy (created by 3-campaign-copy)
├── leads/                              ← Companies + contacts CSV (created by 4-campaigns-leads)
└── results/                            ← Campaign learnings (created by 6-campaign-review)
```

**Where `{slug}` is:**  
The kebab-case version of the offer name (e.g., "AI Sales Roleplay Trainer" → "ai-sales-roleplay-trainer")

**Example for "AI Sales Roleplay Trainer":**
```
offers/ai-sales-roleplay-trainer/
├── ai-sales-roleplay-trainer-README.md
├── ai-sales-roleplay-trainer-positioning.md
├── campaigns/          (empty until 2-offer-campaigns)
├── copy/               (empty until 3-campaign-copy)
├── leads/              (empty until 4-campaigns-leads)
└── results/            (empty until 6-campaign-review)
```

**Command to create structure:**
```bash
mkdir -p "offers/{slug}/campaigns" "offers/{slug}/copy" "offers/{slug}/leads" "offers/{slug}/results"
```

**Why this structure matters:**
- **Each offer in its own folder** - Isolated context, no pollution
- **Filenames include offer slug** - Easy to identify in Cursor tabs when multiple offers open
- **No duplicate filenames** - Every file is uniquely named across all offers
- **Other slash commands reference** `@offers/{slug}/{slug}-positioning.md` for context
- **Scalable** - Manage 10, 20, 50+ offers without confusion

### Step 2: Positioning Canvas (AI-Generated with User Approval)

**Reference framework:** @file context/frameworks/positioning-canvas.md

**NEW APPROACH:** Generate intelligent defaults for ALL sections based on the offer description, then present the complete positioning canvas for user approval/editing.

#### Process:

1. **Analyze the offer description** to understand:
   - What problem it solves
   - Who would need this
   - What alternatives exist
   - Key differentiators

2. **Generate complete positioning canvas** with:

   **2.1 Category Definition**
   - Identify the category (new/subcategory/alternative/reframe)
   - Explain the differentiation

   **2.2 Target Customer (ICP)**
   - Company Profile: Size, industry, stage, geography, revenue
   - Buyer Profile: Primary titles, department, seniority
   - **IMPORTANT:** ICP is about STABLE attributes (size, industry, titles), NOT observable signals

   **2.3 Customer Problem**
   - Specific problem being solved
   - Who feels it most (by title)
   - Consequences of not solving
   - How they describe it (their words)

   **2.4 Benefits & Outcomes**
   - Immediate benefit (Week 1)
   - Short-term outcome (30-90 days)
   - Long-term outcome (6-12 months)
   - Quantified when possible

   **2.5 Current Alternatives**
   - List 3-5 alternatives
   - Pros/cons of each

   **2.6 One-Line Positioning**
   - Generate 3 versions using formulas:
     1. "We help [TARGET] who struggle with [PROBLEM] by providing [SOLUTION], so they can [OUTCOME]."
     2. "Unlike [ALTERNATIVE], [YOUR PRODUCT] [KEY DIFFERENTIATOR] for [TARGET] who need [OUTCOME]."
     3. "[TARGET] use [YOUR PRODUCT] to [PRIMARY BENEFIT] without [PAIN OF ALTERNATIVE]."
   - Recommend the strongest version

3. **Present complete canvas** to user with:
   - "Here's your complete positioning canvas. Review and let me know if you want any changes, or approve to continue."
   - User can approve as-is, or request specific edits

**Why this approach:**
- Faster workflow (one review vs. many questions)
- User maintains control (can edit anything)
- AI leverages pattern recognition to generate smart defaults
- Better for users who know their offer well

### Step 3: Save All Files

Create 4 files in the offer folder (all filenames include the slug for easy identification):

#### 3.1: `{slug}-positioning.md`
Save the complete positioning canvas generated in Step 2.

**File:** `offers/{slug}/{slug}-positioning.md`

**Structure:**
```markdown
# Positioning Canvas: {Offer Name}

> Created: {date}  
> Last Updated: {date}

## 1. Category Definition
[Category type and differentiation]

## 2. Target Customer (ICP)

### Company Profile
- Size: [e.g., Under 100 employees]
- Industry: [e.g., B2B SaaS, or "industry-agnostic"]
- Stage: [e.g., Any stage]
- Geography: [e.g., United States]
- Revenue: [optional]
- Key Requirement: [any must-have attributes]

### Buyer Profile
- Primary Buyers: [list of titles]
- Department: [e.g., Sales, Revenue, GTM]
- Seniority: [e.g., C-level, VP, Director]

## 3. Customer Problem
- The Problem: [description]
- Who Feels It Most: [by role]
- What Happens If They Don't Solve It: [consequences]
- How They Describe It (Their Words): [bullet list]

## 4. Benefits & Outcomes
- Immediate (Week 1): [answer]
- Short-term (30-90 days): [answer]
- Long-term (6-12 months): [answer]

## 5. Current Alternatives
[Table with Alternative | Pros | Cons]

Why Current Solutions Aren't Good Enough: [explanation]

## 6. One-Line Positioning
Selected Version: [chosen version]

Alternative Versions:
- [version 2]
- [version 3]

## 7. Key Differentiators
[Table with Differentiator | Why It Matters]

## 8. Proof Points
[Table with Proof Type | Details]

## Notes
[Type, ownership, best signals, etc.]
```

#### 3.2: `{slug}-README.md`
Create offer overview with status and next steps.

**File:** `offers/{slug}/{slug}-README.md`

**Template:**
```markdown
# {Offer Name}

**Description:** {one-sentence description}
**Type:** {product/service}
**Owner:** {internal/client}

## Status
- ✅ Positioning: Complete
- 📝 Campaigns: None yet
- 🚀 Active Campaigns: 0

## Created
{date}

## Quick Summary
[Brief overview of what/who/problem/differentiator]

## Next Steps
1. Run `/offer-campaign {slug}` to create campaign ideas
2. Create 3-5 different campaigns
3. Choose best 1-2 to launch

## Files
- {slug}-positioning.md
- {slug}-README.md
- campaigns/
- research/{slug}-research.md
- results/{slug}-learnings.md

## Campaign Ideas to Test
[Potential campaign directions]
```

**Template:**
```markdown
# Research Notes: {Offer Name}

## Competitive Landscape
[Competitors and positioning]

## Market Insights
[Trends and stats]

## Buyer Research
[Pain points by role]

## Use Cases to Highlight
[Numbered list]

## Research Questions to Answer
[Checkbox list]

## Notes
[Add research findings]
```

#### 3.4: `results/{slug}-learnings.md`
Create placeholder for campaign results.

**File:** `offers/{slug}/results/{slug}-learnings.md`

**Template:**
```markdown
# Campaign Results & Learnings: {Offer Name}

## Campaign Performance Summary
[Table tracking all campaigns]

## What's Working
[Messaging, signals, ICP insights]

## What's NOT Working
[Misses and mistakes]

## Key Insights
[Buyer behavior, market feedback]

## Action Items
[Checkbox list]

## Notes
[Qualitative feedback]
```

### Step 4: Create Database Entry

Insert a new record into the `offers` table in Supabase:

```typescript
import { supabaseAdmin } from '@/lib/clients/supabase'

const { data: offer } = await supabaseAdmin
  .from('offers')
  .insert({
    name: offerName,
    slug: slug,
    type: type, // 'product' or 'service'
    ownership: ownership, // 'internal' or 'client'
    client_name: clientName, // if client
    description: description,
    problem_solved: customerProblem,
    value_proposition: oneLinePositioning,
    icp: {
      company: {
        size: companySize,
        industry: industry,
        stage: stage,
        geography: geography,
        revenue: revenue
      },
      buyer: {
        primary: primaryBuyer,
        influencers: influencers,
        department: department,
        seniority: seniority
      }
    },
    status: 'draft'
  })
  .select()
  .single()
```

### Step 5: Summary & Next Steps

**Show final summary:**

```
✅ Offer Created: {Offer Name}

📋 Positioning Complete:
   • ICP: {industry} companies with {size} in {geography}
   • Buyer: {titles} in {department}
   • Problem: {short description}
   • One-liner: {positioning statement}

📁 Files Created:
   • offers/{slug}/{slug}-README.md
   • offers/{slug}/{slug}-positioning.md
   • offers/{slug}/results/{slug}-learnings.md

💾 Database:
   • Offer saved with ID: {uuid}
   • Status: draft

⏭️  Next Steps:
   1. Run `/offer-campaign {slug}` to brainstorm campaign ideas
   2. You can create multiple campaigns with different:
      - Target signals (hiring, tech stack, etc.)
      - Messaging angles (PVP, use case, problem-focused)
   3. Choose which campaigns to launch

💡 Tip: Create 3-5 campaign ideas, then pick the best 1-2 to launch.
```

---

## What This Command Does NOT Do

- ❌ Does NOT define signals (that's in `/offer-campaign`)
- ❌ Does NOT create messaging (that's in `/offer-campaign`)
- ❌ Does NOT find companies (that's in `/offer-launch`)
- ❌ Does NOT use any APIs (no credits spent)

**This is pure strategy.** You're defining the foundation.

---

## Example Usage

```
User: @.cursor/commands/new-offer.md create sales roleplay trainer

Cursor: 
What's the offer name?
User: AI Sales Roleplay Trainer

Cursor:
One-sentence description?
User: AI bots that sales reps can practice with 24/7

Cursor:
Type?
User: product

Cursor:
Ownership?
User: internal

[Cursor walks through positioning canvas...]

Cursor:
✅ Offer Created: AI Sales Roleplay Trainer

📋 Positioning Complete:
   • ICP: B2B SaaS companies with 20-100 employees in United States
   • Buyer: VP Sales, Sales Director in Sales department
   • Problem: Sales reps lack practice before real customer calls
   • One-liner: We help B2B SaaS sales teams who struggle with rep ramp time by providing AI role-play bots for 24/7 practice, so they can cut onboarding time in half.

⏭️  Next: /offer-campaign sales-roleplay-trainer
```

---

## Related Files

- **Positioning Framework:** `context/frameworks/positioning-canvas.md`
- **Next Command:** `.cursor/commands/offer-campaign.md`
- **Database Schema:** `scripts/setup-db.sql` (offers table)
- **Types:** `src/lib/types/offer.ts`
