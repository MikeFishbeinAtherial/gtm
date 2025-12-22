# Signal Brainstorming Framework

## The Core Insight

**You can't see problems, but you can see symptoms.**

A company won't have a sign on their door saying "We need sales training." But they WILL:
- Post job listings for salespeople (symptom: growing team)
- Have a new VP Sales (symptom: leadership change)
- Have raised funding (symptom: scaling mode)

**Signals are observable symptoms that indicate a company is likely experiencing your problem.**

---

## Why Signals Matter

| Approach | Quality | Response Rate | Feel |
|----------|---------|---------------|------|
| Random companies | Low | 1-2% | Spam |
| Firmographic match only | Medium | 3-5% | Cold |
| Firmographic + 1 signal | High | 8-12% | Relevant |
| Firmographic + 2+ signals | Very High | 15-25% | "How did you know?" |

**The difference between spam and relevance is SIGNALS.**

---

## Signal Quality Framework

Good signals have four properties:

### 1. Detectable
Can you actually find this signal with available tools?

| ✅ Detectable | ❌ Not Detectable |
|--------------|------------------|
| Job postings (TheirStack) | Internal discussions |
| Tech stack (BuiltWith) | Budget availability |
| Funding rounds (Crunchbase) | Strategic priorities |
| LinkedIn posts (public) | Private pain |

### 2. Relevant
Does this signal actually correlate with your problem?

| Problem | ✅ Relevant Signal | ❌ Irrelevant Signal |
|---------|-------------------|---------------------|
| Sales training | Hiring salespeople | Office expansion |
| DevOps tools | Hiring engineers | Hiring marketers |
| HR software | Growing headcount | Product launch |

### 3. Timely
Does this signal indicate CURRENT need?

| ✅ Timely | ❌ Stale |
|----------|---------|
| Job posted this week | Job posted 6 months ago |
| Funding in last 90 days | Funding 2 years ago |
| New exec hired last month | Exec hired years ago |

### 4. Specific
Does this signal narrow down the audience meaningfully?

| ✅ Specific | ❌ Too Broad |
|------------|-------------|
| Hiring "Sales Enablement Manager" | Uses Salesforce |
| Raised Series A ($5-15M) | Is a tech company |
| VP Sales joined from [competitor user] | B2B company |

---

## The Problem → Symptom → Signal Chain

Start with the problem and work backwards to signals:

```
PROBLEM (What hurts)
    ↓
SYMPTOMS (What behaviors result from the problem)
    ↓
SIGNALS (Observable data points that reveal symptoms)
    ↓
DETECTION (Tools and methods to find signals)
```

### Example: Sales Role Play Trainer

```
PROBLEM: New sales reps take too long to ramp and miss quota

SYMPTOMS:
├── They hire salespeople (need to train them)
├── They don't have dedicated enablement (managers do training)
├── They use call recording tools (trying to learn from calls)
├── They just raised money (scaling the team)
└── New sales leader joined (changing approach)

SIGNALS:
├── Job postings: SDR, BDR, AE, Sales Manager
├── No "Sales Enablement" on LinkedIn
├── Uses Gong, Chorus, or Outreach
├── Series A/B in last 6 months
└── VP Sales changed in last 90 days

DETECTION:
├── TheirStack for job postings
├── LinkedIn for team composition
├── BuiltWith for tech stack
├── Crunchbase for funding
└── LinkedIn for job changes
```

---

## Signal Categories

### 1. Hiring Signals 🧑‍💼

**The logic:** What they're hiring for reveals what they're building.

| Hiring For | What It Suggests |
|------------|------------------|
| First SDR/BDR | Starting outbound, need process/training |
| Sales Manager | Scaling team, need coaching tools |
| Sales Enablement | Investing in rep performance |
| RevOps | Systematizing sales process |
| First [ROLE] | Greenfield opportunity |
| Many [ROLE] | Scaling, budget available |
| [ROLE] replacement | Previous approach didn't work |

**Detection:** TheirStack, LinkedIn Jobs, company careers page

**Quality questions:**
- Posted in last 30 days? (timely)
- First hire or scaling? (different needs)
- Replacement or new? (urgency level)

### 2. Tech Stack Signals 🔧

**The logic:** Tools they use reveal sophistication and gaps.

| Tech Stack | What It Suggests |
|------------|------------------|
| Salesforce | Has budget, established sales process |
| HubSpot | Growth stage, marketing-forward |
| Outreach/Salesloft | Does outbound, invests in it |
| Gong/Chorus | Cares about call quality |
| No sales engagement tool | Gap to fill |
| Uses competitor | Might be unhappy, need migration story |
| Uses complementary tool | Natural pairing |

**Detection:** BuiltWith, Wappalyzer, LinkedIn company page

**Quality questions:**
- Is this tool actually used or just installed?
- Do they use the complementary tools too?
- How long have they had it?

### 3. Funding & Financial Signals 💰

**The logic:** Money changes behavior.

| Event | What It Suggests |
|-------|------------------|
| Seed round | Building foundation, cost-sensitive |
| Series A ($5-15M) | Scaling sales, has budget |
| Series B ($15-50M) | Rapid growth, lots of hiring |
| Series C+ | Enterprise-ready, long sales cycles |
| Raised in last 90 days | Actively investing proceeds |
| Profitable bootstrapped | Conservative but has money |

**Detection:** Crunchbase, news, LinkedIn announcements

**Quality questions:**
- How recent was the raise?
- What did they say they'd use it for?
- Have they started hiring post-raise?

### 4. Growth & Change Signals 📈

**The logic:** Change creates need.

| Signal | What It Suggests |
|--------|------------------|
| Headcount growth >20% | Scaling mode |
| New office/market | Expansion needs |
| New product launch | Need to sell it |
| Leadership change | New initiatives coming |
| Company milestone | Confidence + momentum |
| Announced targets | Pressure to perform |

**Detection:** LinkedIn, news, press releases, earnings

### 5. Content & Social Signals 🗣️

**The logic:** What they say reveals what they're thinking.

| Signal | What It Suggests |
|--------|------------------|
| Posts about [problem] | Top of mind |
| Asks for recommendations | Actively shopping |
| Shares competitor content | Evaluating alternatives |
| Speaks at events | Thought leader, influential |
| Comments on your content | Already aware of you |
| Complains about current solution | Open to switching |

**Detection:** LinkedIn, podcasts, company blog

### 6. Relationship Signals 🤝

**The logic:** Warm > Cold.

| Signal | What It Suggests |
|--------|------------------|
| 1st degree connection | DON'T MESSAGE (already connected) |
| 2nd degree connection | Warm intro possible |
| Mutual connections (3+) | Strong intro path |
| Same alumni network | Shared identity |
| Same previous company | Strong bond |
| Engaged with your content | Already warm |

**Detection:** LinkedIn, Unipile

---

## Signal Combination Strategy

**Single signals are good. Combined signals are powerful.**

### Stacking Signals

| Stack Type | Signals Combined | Expected Quality |
|------------|------------------|------------------|
| Timing + Problem | Just raised A + Hiring SDRs | 🔥 High intent |
| Problem + Problem | Hiring sales + No enablement | 🔥 Clear gap |
| Event + Authority | New VP Sales + Has budget | 🔥 Decision maker with need |
| Social + Problem | Posted about topic + Has job open | 🔥 Aware + acting |

### Example Stacks

**For Sales Training Tool:**
```
Stack 1: SCALING SIGNAL
- Series A in last 6 months
- Hiring 3+ sales roles
- No Sales Enablement person
→ Growing fast, training is a pain

Stack 2: CHANGE SIGNAL  
- New VP Sales in last 90 days
- Uses Gong/Chorus
- Posted about "rep performance"
→ New leader improving team

Stack 3: TECH GAP SIGNAL
- Uses Salesforce + Outreach
- No conversation intelligence
- 20-100 employees
→ Has stack, missing piece we fill
```

---

## Brainstorming Exercise

### Step 1: Start with the Problem

> What problem does your offer solve? Write it in customer language.

[YOUR PROBLEM HERE]

### Step 2: List Problem Symptoms

> If a company has this problem, what would they be doing?

| Symptom Type | They Would Be... |
|--------------|------------------|
| Hiring | |
| Using/Buying | |
| Saying/Posting | |
| Experiencing (events) | |
| Lacking/Missing | |
| Struggling with | |

### Step 3: Convert Symptoms to Signals

For each symptom, what's the OBSERVABLE signal?

| Symptom | Signal | How to Detect |
|---------|--------|---------------|
| | | |
| | | |
| | | |
| | | |
| | | |

### Step 4: Score Your Signals

| Signal | Detectable (1-5) | Relevant (1-5) | Timely (1-5) | Specific (1-5) | TOTAL |
|--------|------------------|----------------|--------------|----------------|-------|
| | | | | | |
| | | | | | |
| | | | | | |

### Step 5: Create Signal Stacks

Combine your top signals into 2-3 "stacks":

**Stack 1: [NAME]**
- Signal:
- Signal:
- Signal:
- What it means:

**Stack 2: [NAME]**
- Signal:
- Signal:
- Signal:
- What it means:

---

## Detection Tools Quick Reference

| Tool | Best For | What You Get |
|------|----------|--------------|
| **TheirStack** | Job postings | Companies hiring specific roles |
| **Parallel** | Company + people search | Comprehensive company/contact data |
| **Exa** | AI web search | Find companies by description |
| **BuiltWith** | Tech stack | What tools companies use |
| **Crunchbase** | Funding | Investment history, amounts |
| **LinkedIn** | Everything else | Posts, job changes, connections |
| **Unipile** | Relationship status | Connection degree, past messages |

---

## Common Mistakes

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| Too broad signals | Everyone matches | Add specificity |
| Undetectable signals | Can't act on them | Stick to observable |
| Old signals | No longer relevant | Add recency filter |
| Single signal only | Low quality | Stack 2-3 signals |
| Ignoring negatives | Waste outreach | Add disqualifying signals |

---

## Related Files

- **Positioning (problem definition)**: `context/frameworks/positioning-canvas.md`
- **ICP (who to target)**: `context/frameworks/icp-framework.md`
- **Copy (what to say)**: `context/copywriting/email-principles.md`
