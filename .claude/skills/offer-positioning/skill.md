# Offer Positioning

Create a new offer with complete positioning canvas and ICP definition.

## Description

Define what you're selling and who needs it. Generates a complete positioning canvas including category definition, target customer (ICP), customer problem, benefits, alternatives analysis, and one-line positioning statements. Creates the offer folder structure for campaigns.

## When to Use

- User wants to create a "new offer"
- User asks to define "positioning" for a product/service
- User wants to create an "ICP" (Ideal Customer Profile)
- User references phase 1 of the workflow

## Prerequisites

None - this is the starting point for new offers.

## Instructions

### Step 1: Gather Input

Ask for:
- **Offer name** (e.g., "AI Sales Roleplay Trainer")
- **One-sentence description** (e.g., "AI bots that sales reps practice with 24/7")
- **Type**: product or service
- **Ownership**: internal or client

### Step 2: Generate Positioning Canvas

Create complete positioning based on offer description:

1. **Category Definition** - New category, subcategory, alternative, or reframe
2. **Target Customer (ICP)**
   - Company Profile: Size, industry, stage, geography, revenue
   - Buyer Profile: Primary titles, department, seniority
   - Note: ICP = STABLE attributes, not observable signals
3. **Customer Problem** - What problem, who feels it, consequences
4. **Benefits & Outcomes** - Week 1, 30-90 days, 6-12 months
5. **Current Alternatives** - 3-5 alternatives with pros/cons
6. **One-Line Positioning** - Generate 3 versions:
   - "We help [TARGET] who struggle with [PROBLEM] by providing [SOLUTION], so they can [OUTCOME]."
   - "Unlike [ALTERNATIVE], [PRODUCT] [DIFFERENTIATOR] for [TARGET] who need [OUTCOME]."
   - "[TARGET] use [PRODUCT] to [BENEFIT] without [PAIN OF ALTERNATIVE]."

### Step 3: Create Folder Structure

```
offers/{slug}/
├── {slug}-README.md           # Offer overview
├── {slug}-positioning.md      # Positioning canvas + ICP
├── campaigns/                 # Empty (for phase 2)
├── copy/                      # Empty (for phase 3)
├── leads/                     # Empty (for phase 4)
└── results/                   # Empty (for phase 6)
```

### Step 4: Save to Database

Insert to Supabase `offers` table with:
- name, slug, type, ownership
- description, problem_solved, value_proposition
- icp (JSON with company and buyer profiles)
- status: 'draft'

### Step 5: Show Next Steps

```
Next: Run campaign planning for {slug} to create campaign ideas
Tip: Create 3-5 campaign ideas, then pick the best 1-2 to launch
```

## Output Files

- `offers/{slug}/{slug}-positioning.md` - Complete positioning canvas
- `offers/{slug}/{slug}-README.md` - Offer overview and status

## Cost

Free - no API calls. This is pure strategy.

## Related Files

- Positioning Framework: `offer-testing/context/frameworks/positioning-canvas.md`
- Offer Template: `offer-testing/offers/_template/`
