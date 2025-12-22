# Signal Generation Guide (AI Context)

**Purpose:** This guide helps AI automatically generate high-quality signals from minimal offer context.

---

## Core Principle

**Problem → Symptoms → Signals → Detection**

Given an offer description, work backwards:
1. Infer the problem being solved
2. Determine what companies with this problem would be DOING
3. Identify observable signals that reveal these behaviors
4. Map signals to detection tools

---

## Signal Quality Criteria

Every generated signal MUST meet all four criteria:

### 1. ✅ Detectable
Can we actually find this with our tools?

**Our tools:**
- TheirStack → Job postings
- Parallel → Company/people search, enrichment
- Exa → AI-powered web search
- LinkedIn → Posts, job changes, company pages
- BuiltWith → Tech stack
- Crunchbase → Funding, company info

**✅ YES:** "Hiring SDRs" (TheirStack), "Uses Salesforce" (BuiltWith)
**❌ NO:** "Has budget issues", "CEO is frustrated", "Considering vendors"

### 2. ✅ Relevant
Does this signal actually correlate with the problem?

Ask: "If a company has THIS signal, would they likely have the PROBLEM?"

**Example for sales training:**
- ✅ "Hiring salespeople" → Relevant (need to train them)
- ✅ "Uses Gong" → Relevant (cares about call quality)
- ❌ "Has a blog" → Not relevant to sales training
- ❌ "Remote-first" → Not relevant to sales training

### 3. ✅ Timely
Does this indicate CURRENT need (not historical)?

**Add recency filters:**
- Job postings: Last 30 days
- Funding: Last 90-180 days
- New hires: Last 60-90 days
- Posts/activity: Last 30 days

### 4. ✅ Specific
Does this meaningfully narrow the audience?

**Too broad:**
- "B2B company"
- "Uses email"
- "Tech startup"

**Good specificity:**
- "Hiring 3+ sales roles"
- "Series A in last 6 months"
- "No Sales Enablement person on team"

---

## Signal Categories & Templates

When generating signals, use these proven categories:

### 1. Hiring Signals 🧑‍💼

**Pattern:** "If they need [SOLUTION], they'll be hiring [ROLE]"

**Example reasoning:**
- Sales training → Hiring SDRs, AEs, Sales Managers
- DevOps tool → Hiring SRE, Platform Engineers
- Marketing tool → Hiring Growth Marketers, Content Writers
- HR software → Rapid headcount growth

**Template signals:**
```json
{
  "type": "hiring",
  "signal": "Hiring [specific role]",
  "detection": "TheirStack",
  "filter": "posted_last_30_days",
  "reasoning": "Companies hiring [role] need [solution] because..."
}
```

### 2. Tech Stack Signals 🔧

**Pattern:** "They use [TOOL] → indicates [sophistication/gap]"

**Complementary tools:** Tools that pair well with your solution
**Competing tools:** Direct competitors (for migration plays)
**Gap signals:** Missing tools they should have

**Template signals:**
```json
{
  "type": "tech_stack",
  "signal": "Uses [tool name]",
  "detection": "BuiltWith or LinkedIn",
  "reasoning": "Companies using [tool] likely need [our solution] because..."
}
```

### 3. Funding Signals 💰

**Pattern:** Recent funding → budget available + scaling mindset

**Stage correlation:**
- Seed ($0-3M) → Cost-conscious, building foundation
- Series A ($5-15M) → Scaling, first real GTM investment
- Series B ($15-50M) → Rapid growth, multi-product
- Series C+ ($50M+) → Enterprise, long sales cycles

**Template signals:**
```json
{
  "type": "funding",
  "signal": "Series [stage] in last [timeframe]",
  "detection": "Crunchbase or LinkedIn announcements",
  "reasoning": "Companies at this stage typically..."
}
```

### 4. Growth & Change Signals 📈

**Pattern:** Change creates need

**Types:**
- New executive (new initiatives)
- Market expansion (new challenges)
- Product launch (need to sell it)
- Headcount growth (scaling pains)
- Company milestone (momentum + confidence)

**Template signals:**
```json
{
  "type": "change",
  "signal": "New [role] hired in last [timeframe]",
  "detection": "LinkedIn",
  "reasoning": "New [role] usually..."
}
```

### 5. Gap/Lacking Signals 🔍

**Pattern:** They DON'T have something they should

**Example:**
- Growing fast but NO enablement person
- Uses sales tools but NO conversation intelligence
- Large team but NO dedicated [role]

**Template signals:**
```json
{
  "type": "gap",
  "signal": "No [role/tool] despite [context]",
  "detection": "LinkedIn team search",
  "reasoning": "This gap means..."
}
```

### 6. Content & Intent Signals 🗣️

**Pattern:** What they say reveals what they're thinking

**Types:**
- Posts about [problem]
- Asks for recommendations
- Shares competitor content
- Speaks at events
- Complains about current solution

**Template signals:**
```json
{
  "type": "content",
  "signal": "Posted about [topic] on LinkedIn",
  "detection": "LinkedIn (manual or API)",
  "reasoning": "Posting about this shows..."
}
```

---

## Signal Stacking Strategy

**Don't just generate individual signals. Create 2-3 "signal stacks".**

A signal stack = 2-4 signals that together paint a clear picture.

### Stack Patterns

#### Pattern 1: Scaling Stack
- Funding signal + Hiring signal + Gap signal
- Example: "Series A + Hiring 5+ SDRs + No enablement person"
- Story: Growing fast, training is becoming chaos

#### Pattern 2: Change Stack  
- Leadership signal + Tech signal + Content signal
- Example: "New VP Sales + Uses Gong + Posted about rep performance"
- Story: New leader improving team performance

#### Pattern 3: Sophistication Stack
- Tech stack + Tech stack + Company size
- Example: "Uses Salesforce + Outreach + 50-200 employees"
- Story: Has budget, established process, missing [our solution]

#### Pattern 4: Intent Stack
- Content signal + Hiring signal + Recent activity
- Example: "Asked for CRM recs + Hiring RevOps + Posted job 2 weeks ago"
- Story: Actively shopping, high intent

### Stack Template

```json
{
  "stack_name": "[Descriptive name]",
  "signals": [
    {"type": "...", "signal": "...", "detection": "..."},
    {"type": "...", "signal": "...", "detection": "..."},
    {"type": "...", "signal": "...", "detection": "..."}
  ],
  "story": "This combination means...",
  "priority": "high/medium/low",
  "expected_quality": "15-25% reply rate" or "10-15% reply rate"
}
```

---

## Generation Process (AI Instructions)

When given an offer description, follow this process:

### Step 1: Infer the Problem (5 seconds)
- What problem does this solve?
- Who feels this problem? (titles)
- What are they doing today? (status quo)

### Step 2: Brainstorm Symptoms (15 seconds)
Ask: "If a company has this problem, they would be..."
- Hiring: [what roles?]
- Using: [what tools?]
- Lacking: [what gaps?]
- Experiencing: [what events?]
- Saying: [what topics?]

### Step 3: Convert to Signals (20 seconds)
For each symptom, identify:
- Observable signal
- Detection method (which tool)
- Recency filter
- Quality/specificity

### Step 4: Score & Prioritize (15 seconds)
Rate each signal (1-5) on:
- Detectable
- Relevant
- Timely
- Specific

Keep only signals scoring 15+ total.

### Step 5: Create Signal Stacks (20 seconds)
Combine top signals into 2-3 stacks that tell a story.

### Step 6: Output Structure (10 seconds)
Return JSON with all signals + stacks.

---

## Examples of Good Signal Generation

### Example 1: Sales Call Roleplay Trainer

**Input:** "AI bots that sales reps can practice with 24/7"

**AI reasoning:**
- Problem: Reps aren't prepared for live calls
- Who: Companies with sales teams, especially growing ones
- Status quo: Shadow senior reps, expensive training

**Generated signals:**

```json
{
  "individual_signals": [
    {
      "type": "hiring",
      "signal": "Hiring SDR or BDR roles",
      "detection": "TheirStack",
      "filter": "posted_last_30_days",
      "reasoning": "Companies hiring sales reps need to train them"
    },
    {
      "type": "hiring",
      "signal": "Hiring Sales Manager or Sales Enablement",
      "detection": "TheirStack",
      "filter": "posted_last_60_days",
      "reasoning": "Dedicated training leadership = investing in rep performance"
    },
    {
      "type": "tech_stack",
      "signal": "Uses Gong or Chorus",
      "detection": "BuiltWith or LinkedIn",
      "reasoning": "Cares about call quality, likely reviews but no practice"
    },
    {
      "type": "gap",
      "signal": "No Sales Enablement person on team",
      "detection": "LinkedIn team search",
      "reasoning": "Training falls on managers, they're stretched thin"
    },
    {
      "type": "funding",
      "signal": "Series A or B in last 6 months",
      "detection": "Crunchbase",
      "reasoning": "Scaling sales team, budget for training tools"
    },
    {
      "type": "change",
      "signal": "New VP Sales in last 90 days",
      "detection": "LinkedIn",
      "reasoning": "New leaders often invest in training/enablement"
    }
  ],
  "signal_stacks": [
    {
      "name": "Rapid Scaling Stack",
      "signals": ["Series A/B funding", "Hiring 3+ sales roles", "No enablement person"],
      "story": "Growing fast, training is falling on managers, becoming chaos",
      "priority": "high"
    },
    {
      "name": "New Leader Stack",
      "signals": ["New VP Sales", "Uses Gong", "Posted about rep performance"],
      "story": "New sales leader improving team, likely has budget",
      "priority": "high"
    },
    {
      "name": "Sophistication Stack",
      "signals": ["Uses Salesforce", "Uses Gong", "50-200 employees"],
      "story": "Established process, invests in sales tools, missing practice layer",
      "priority": "medium"
    }
  ]
}
```

### Example 2: DevOps Monitoring Tool

**Input:** "Real-time infrastructure monitoring with AI incident prediction"

**Generated signals:**

```json
{
  "individual_signals": [
    {
      "type": "hiring",
      "signal": "Hiring SRE, DevOps Engineer, or Platform Engineer",
      "detection": "TheirStack",
      "filter": "posted_last_30_days",
      "reasoning": "Growing infrastructure team = need better tooling"
    },
    {
      "type": "tech_stack",
      "signal": "Uses AWS or GCP",
      "detection": "BuiltWith",
      "reasoning": "Cloud infrastructure = need monitoring"
    },
    {
      "type": "tech_stack",
      "signal": "Uses Datadog or New Relic",
      "detection": "BuiltWith",
      "reasoning": "Already monitoring, might want AI upgrade"
    },
    {
      "type": "change",
      "signal": "Posted about downtime or incident on LinkedIn",
      "detection": "LinkedIn",
      "filter": "last_60_days",
      "reasoning": "Recent pain = open to better solution"
    },
    {
      "type": "funding",
      "signal": "Series B+ ($20M+)",
      "detection": "Crunchbase",
      "reasoning": "Infrastructure at scale = monitoring critical"
    }
  ],
  "signal_stacks": [
    {
      "name": "Scaling Infrastructure Stack",
      "signals": ["Hiring 2+ platform engineers", "Series B", "Uses AWS"],
      "story": "Infrastructure scaling, need proactive monitoring",
      "priority": "high"
    },
    {
      "name": "Pain Point Stack",
      "signals": ["Posted about downtime", "Uses basic monitoring", "50+ employees"],
      "story": "Recent incident, looking to upgrade monitoring",
      "priority": "high"
    }
  ]
}
```

---

## Disqualifying Signals (What to Avoid)

Also generate "negative signals" - who NOT to target:

```json
{
  "disqualifying_signals": [
    "Too small (< 10 employees) - no dedicated sales team yet",
    "Enterprise (1000+ employees) - needs enterprise solution",
    "Already uses direct competitor - low switching likelihood",
    "Non-technical founder - might not value the solution"
  ]
}
```

---

## Output Format

Always return signals in this JSON structure:

```json
{
  "problem_inferred": "What problem this offer solves",
  "target_buyer_titles": ["VP Sales", "Sales Manager"],
  "individual_signals": [
    {
      "type": "hiring|tech_stack|funding|change|gap|content",
      "signal": "Clear, specific signal description",
      "detection": "Tool or method to detect",
      "filter": "Recency or quality filter",
      "reasoning": "Why this matters",
      "score": {
        "detectable": 5,
        "relevant": 5,
        "timely": 4,
        "specific": 5,
        "total": 19
      }
    }
  ],
  "signal_stacks": [
    {
      "name": "Stack name",
      "signals": ["Signal 1", "Signal 2", "Signal 3"],
      "story": "What this combination means",
      "priority": "high|medium|low",
      "expected_reply_rate": "15-25%"
    }
  ],
  "disqualifying_signals": [
    "Reason to exclude..."
  ]
}
```

---

## Quality Checklist

Before finalizing signals, verify:

- [ ] Each signal is detectable with our current tools
- [ ] Each signal is relevant to the specific problem
- [ ] Each signal has a recency/quality filter
- [ ] Signal stacks tell a clear story
- [ ] We have 2-3 high-quality stacks
- [ ] We've identified disqualifying signals
- [ ] Total of 5-8 individual signals (not too many)

---

## Related Context Files

- Positioning Canvas: `context/frameworks/positioning-canvas.md`
- Signal Brainstorming (detailed): `context/frameworks/signal-brainstorming.md`
- ICP Framework: `context/frameworks/icp-framework.md`

