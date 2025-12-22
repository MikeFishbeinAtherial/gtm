# New Offer Creation Guide - Automated Approach

## Overview

The `/new-offer` command has been completely redesigned to **auto-generate everything from minimal input**. You provide 4 inputs (30 seconds), AI generates positioning, signals, ICP, and all files (2 minutes).

---

## What Changed

### Old Approach ❌
- User answered 20+ questions interactively
- Manual signal brainstorming
- 30-60 minute process
- Required deep understanding of frameworks

### New Approach ✅
- User provides 4 inputs only
- AI auto-generates positioning & signals
- 2-3 minute generation
- Can refine anything via chat afterward

---

## Usage

### Step 1: Run Command (30 seconds)

```
/new-offer

Name: [Your offer name]
Description: [One sentence what it does]
Type: product or service
Owner: internal or client (client name if client)
```

**Example:**
```
/new-offer

Name: AI Roleplay Trainer
Description: AI bots that sales reps can practice objection handling with 24/7
Type: service
Owner: internal
```

### Step 2: AI Auto-Generates (2 minutes)

AI will automatically create:

1. **Positioning Canvas**
   - Category & positioning angle
   - Core problem (in customer language)
   - Target buyer titles
   - Problem symptoms
   - Outcomes (immediate, short-term, long-term)
   - Current alternatives
   - One-line positioning statement

2. **Signals** (5-8 high-quality signals)
   - Hiring signals (what roles they're hiring)
   - Tech stack signals (what tools they use)
   - Funding signals (recent raises)
   - Change signals (new execs, expansions)
   - Gap signals (missing roles/tools)
   - Content signals (what they post about)

3. **Signal Stacks** (2-3 combinations)
   - Rapid Scaling Stack (funding + hiring + gap)
   - New Leader Stack (new exec + tech + content)
   - Sophistication Stack (tech + size + maturity)

4. **ICP Outline**
   - Company size range
   - Verticals/industries
   - Buyer titles & departments
   - Disqualifying criteria

5. **File Structure**
   - `offers/{slug}/positioning-canvas.md`
   - `offers/{slug}/signals.md`
   - `offers/{slug}/icp.md`
   - `offers/{slug}/README.md`
   - Plus copy/ and permissionless-value/ folders

6. **Database Entry**
   - Complete offer record in Supabase
   - All positioning stored in `positioning` JSONB column

### Step 3: Review & Refine (optional)

If you want to change anything, just chat:

```
"Make signals more specific to companies under 100 employees"
"Change target buyer to Head of Engineering"
"Add a signal for companies using Salesforce"
"Make the positioning statement shorter"
```

AI will update files and database automatically.

---

## What Gets Generated

### Example Output

For "AI Roleplay Trainer" input, AI generates:

#### Positioning
- **Category**: AI Sales Coach
- **Problem**: New sales reps take 6+ months to hit quota due to lack of practice
- **Buyers**: VP Sales, Sales Managers, Sales Enablement
- **Positioning**: "We help B2B SaaS sales teams cut ramp time in half by giving reps unlimited AI practice before real calls"

#### Signals (Auto-Generated)
1. **Hiring SDR/BDR roles** (TheirStack, last 30 days) - Growing teams need training
2. **Hiring Sales Manager** (TheirStack, last 60 days) - Investing in coaching
3. **Uses Gong or Chorus** (BuiltWith) - Cares about call quality, missing practice layer
4. **No Sales Enablement person** (LinkedIn) - Training falls on managers
5. **Series A/B funding in last 6 months** (Crunchbase) - Scaling + budget
6. **New VP Sales in last 90 days** (LinkedIn) - New leader = new initiatives

#### Signal Stacks
- **Rapid Scaling**: Series A + Hiring 3+ sales roles + No enablement → Growing fast, training chaos
- **New Leader**: New VP Sales + Uses Gong + Posted about performance → New leader improving team
- **Sophistication**: Salesforce + Gong + 50-200 employees → Has budget, missing piece

---

## How Signal Generation Works

AI follows this process automatically:

1. **Infer Problem** → What problem does the offer solve?
2. **Identify Symptoms** → What would companies with this problem be DOING?
3. **Convert to Signals** → What observable data reveals these symptoms?
4. **Map to Tools** → Which of our tools can detect each signal?
5. **Add Filters** → Add recency (last 30 days) and quality filters
6. **Score Quality** → Rate each signal on: Detectable, Relevant, Timely, Specific
7. **Create Stacks** → Combine signals into 2-3 high-quality stacks

**Quality Criteria** (all signals must meet):
- ✅ **Detectable** - Can find with our tools (TheirStack, Parallel, Exa, LinkedIn, BuiltWith)
- ✅ **Relevant** - Correlates with the problem
- ✅ **Timely** - Includes recency filter
- ✅ **Specific** - Meaningfully narrows audience

**Reference**: See `context/frameworks/signal-generation-guide.md` for full details.

---

## Database Structure

### New Column Added: `positioning` (JSONB)

Stores complete positioning canvas:

```json
{
  "category": {
    "name": "AI Sales Coach",
    "competing_with": "Sales Training Platforms",
    "differentiator": "Real-time AI practice vs recorded videos"
  },
  "problem": {
    "core_problem": "New sales reps take 6+ months to hit quota",
    "who_feels_it": ["VP Sales", "Sales Managers"],
    "business_impact": "Longer ramp time, missed revenue",
    "customer_language": "Our reps aren't ready for live calls",
    "awareness_level": "pain_point"
  },
  "symptoms": [
    {
      "type": "hiring",
      "signal": "Posting SDR/BDR jobs",
      "detection": "TheirStack",
      "filter": "last_30_days",
      "reasoning": "Growing teams need training",
      "score": {
        "detectable": 5,
        "relevant": 5,
        "timely": 5,
        "specific": 5,
        "total": 20
      }
    }
  ],
  "outcomes": {
    "immediate": "Reps practice without manager time",
    "short_term": "Cut ramp time 50%",
    "long_term": "$150K+ revenue per rep faster",
    "emotional": "Confidence before first call"
  },
  "alternatives": [
    {
      "name": "Status quo (shadow senior reps)",
      "cons": "Doesn't scale, inconsistent"
    }
  ],
  "positioning_statement": "We help B2B SaaS sales teams...",
  "signal_stacks": [
    {
      "name": "Rapid Scaling Stack",
      "signals": ["Series A/B", "Hiring 3+ sales", "No enablement"],
      "story": "Growing fast, training chaos",
      "priority": "high",
      "expected_reply_rate": "15-25%"
    }
  ],
  "disqualifying_signals": [
    "Too small (< 10 employees)",
    "Enterprise (1000+ employees)"
  ]
}
```

### Querying Positioning

```sql
-- Find offers targeting VP Sales
SELECT name, positioning->'problem'->'who_feels_it' as buyers
FROM offers 
WHERE positioning->'problem'->'who_feels_it' ? 'VP Sales';

-- Find offers with high-priority signal stacks
SELECT name, 
       jsonb_array_elements(positioning->'signal_stacks') as stacks
FROM offers
WHERE positioning->'signal_stacks' @> '[{"priority": "high"}]';

-- Find offers in sales category
SELECT name, positioning->'category'->>'name' as category
FROM offers
WHERE positioning->'category'->>'name' ILIKE '%sales%';
```

---

## Next Steps After Creation

Once offer is created, run these commands in sequence:

1. **`/offer-copy {slug}`** → Generate email and LinkedIn outreach copy
2. **`/offer-launch {slug}`** → Find companies matching signals
3. **Review queue** → Approve/edit messages before sending
4. **`/offer-review {slug}`** → Analyze results after campaign

---

## Files Created

Each offer gets this structure:

```
offers/{slug}/
├── README.md                    # Status, summary, next steps
├── positioning-canvas.md        # Complete positioning
├── signals.md                   # Signals + stacks + detection
├── icp.md                       # Target company & buyer criteria
├── copy/
│   ├── email-sequence.md        # (Created by /offer-copy)
│   └── linkedin-messages.md     # (Created by /offer-copy)
├── permissionless-value/
│   └── README.md                # PVP ideas (created by /offer-copy)
├── research/
│   └── notes.md                 # Competitor research
└── results/
    └── learnings.md             # What worked/didn't work
```

---

## Key Context Files

AI uses these files to generate offers:

- **`context/frameworks/signal-generation-guide.md`** - Signal generation logic (NEW!)
- **`context/frameworks/positioning-canvas.md`** - Positioning structure
- **`context/frameworks/signal-brainstorming.md`** - Signal examples
- **`context/frameworks/permissionless-value.md`** - PVP framework
- **`context/frameworks/use-case-driven-outreach.md`** - Use case approach

---

## Migration: Adding positioning Column

Run this SQL in Supabase to add the new column:

```bash
# From offer-testing/ directory
supabase db push scripts/add-positioning-column.sql
```

Or manually in Supabase SQL Editor:

```sql
ALTER TABLE offers ADD COLUMN positioning JSONB;
CREATE INDEX idx_offers_positioning_category ON offers USING GIN ((positioning -> 'category'));
CREATE INDEX idx_offers_positioning_problem ON offers USING GIN ((positioning -> 'problem'));
```

---

## Tips for Best Results

### Give Good Descriptions
- ❌ "Sales tool" (too vague)
- ✅ "AI bots that sales reps practice objection handling with 24/7" (specific)

### Trust the AI, Then Refine
- Let AI generate first pass
- Review signals - do they make sense?
- Refine via chat if needed

### Check Signal Quality
Good signals are:
- **Detectable** (we have tools for this)
- **Relevant** (correlates with problem)
- **Timely** (recent = better)
- **Specific** (narrows audience)

### Use Signal Stacks
- Single signals = good (8-12% reply rate)
- Signal stacks = great (15-25% reply rate)
- Stacks tell a story → more relevance

---

## Common Refinements

After generation, you might want to:

```
"Make this target smaller companies (20-100 employees)"
→ Updates signals, ICP, positioning

"Add a signal for companies using Salesforce"
→ Adds tech stack signal, updates stacks

"Change positioning to emphasize speed over cost"
→ Updates positioning statement, outcomes

"Make signals more aggressive (target all hiring, not just recent)"
→ Loosens filters, increases TAM

"Make signals more conservative (only very recent activity)"
→ Tightens filters, increases quality
```

---

## Troubleshooting

### "Signals seem too broad"
→ Ask: "Make signals more specific - add size constraints and tighter recency filters"

### "Not enough companies will match these signals"
→ Ask: "Expand signals to include broader criteria - loosen filters slightly"

### "Positioning doesn't match my vision"
→ Just say what you want: "Actually, I want to position this as X, targeting Y, because Z"

### "Need to add custom signal"
→ "Add a signal for companies that [specific criteria]"

---

## Example Session

```
You: /new-offer

Name: DevOps Monitoring Tool
Description: Real-time infrastructure monitoring with AI incident prediction
Type: product
Owner: internal

AI: ✅ Offer Created: DevOps Monitoring Tool

📍 Positioning Summary:
- Category: AI Infrastructure Monitoring
- Problem: Teams spend too much time reacting to incidents vs preventing them
- Target: DevOps Engineers, SREs, Platform Engineers, VPs of Engineering

🎯 Top Signals Generated:
1. Hiring SRE/Platform/DevOps Engineers (TheirStack, last 30 days)
2. Uses AWS or GCP (BuiltWith)
3. Posted about downtime on LinkedIn (last 60 days)
4. Series B+ funding ($20M+, last 6 months)
5. Uses basic monitoring (Datadog/New Relic) - upgrade opportunity

📊 Signal Stacks:
- Scaling Infrastructure: Hiring 2+ platform engineers + Series B + Uses AWS
- Recent Pain: Posted about downtime + Uses basic monitoring + 50+ employees

You: Make signals target smaller companies - Series A is fine

AI: ✅ Updated positioning
- Changed funding signal: Series A+ ($5M+)
- Adjusted company size: 20-200 employees
- Updated signal stacks

You: Perfect! Now run /offer-copy devops-monitoring-tool

[Continues to copy generation...]
```

---

## Summary

**Before:** 30-60 minutes of manual work, deep framework knowledge required

**Now:** 4 inputs + 2 minutes → complete offer with positioning, signals, ICP, files, database entry

**Result:** Same quality, 90% less time, can refine anything via chat

🚀 Ready to create your first offer? Just run `/new-offer`!

