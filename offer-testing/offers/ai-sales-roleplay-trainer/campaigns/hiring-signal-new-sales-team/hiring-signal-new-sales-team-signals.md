# Signal Strategy: Hiring Signal - New Sales Team

> **Campaign:** hiring-signal-new-sales-team  
> **Offer:** AI Sales Roleplay Trainer  
> **Created:** December 20, 2024

---

## Problem → Symptom → Signal Chain

###

 Problem
**Sales reps aren't getting enough quality practice before real customer calls**

This leads to:
- Long ramp times (3-6+ months to quota)
- Lost deals due to poor call execution
- Wasted manager time coaching basics repeatedly
- High rep turnover from lack of confidence

### Symptoms (Observable Behaviors)

If a company has this problem, they would be:

| Symptom Type | What We'd Observe |
|--------------|-------------------|
| **HIRING** | Actively hiring salespeople (need to train them) |
| **LACKING** | No dedicated Sales Enablement team (managers do training) |
| **USING** | Have call recording tools but no practice tools (reactive, not proactive) |
| **EXPERIENCING** | Sales team growing rapidly (scaling pain) |
| **EXPERIENCING** | New sales leadership (trying to improve performance) |

### Signals (Detectable Data Points)

| Signal | Type | Quality Filter | Detection Method |
|--------|------|----------------|------------------|
| **Hiring 2+ sales roles** | HIRING | Posted in last 30 days, titles: SDR/BDR/AE/Sales Manager | TheirStack job search |
| **No Sales Enablement role** | LACKING | Company <100 employees, no "Enablement" or "Sales Training" titles | LinkedIn employee search |
| **Uses Gong/Chorus/Outreach** | USING | Active tech stack, indicates investment in sales | BuiltWith, company website |
| **Sales team grew 30%+ in 6 months** | EXPERIENCING | LinkedIn headcount analysis | Parallel company growth data |
| **New VP Sales in last 90 days** | EXPERIENCING | Recent job change announcement | LinkedIn job changes |

---

## Signal Stacks (Combinations)

### Primary Stack: "Scaling Sales Team"

**Signals Combined:**
1. ✅ Hiring 2+ sales roles (last 30 days)
2. ✅ No Sales Enablement person on team
3. ✅ Company under 100 employees

**What This Indicates:**
- Growing sales function (hiring multiple reps)
- Training burden falls on managers (no enablement team)
- Small enough to be budget-conscious but growing fast
- **Pain Level:** 🔥 HIGH - Managers feeling overwhelmed

**Expected Quality:** Very High - Clear, immediate need

**Why It Works:**
- Hiring = definite training need
- No enablement = gap we fill
- Small company = our target ICP

---

### Secondary Stack: "New Sales Leader"

**Signals Combined:**
1. New VP Sales hired (last 90 days)
2. Uses Gong/Chorus (cares about call quality)
3. Hiring sales roles

**What This Indicates:**
- New leader wants to make impact quickly
- Already invests in sales tools (has budget)
- Building/scaling team (hiring)
- **Pain Level:** 🟡 MEDIUM - Looking for quick wins

**Expected Quality:** High - Leader with authority and motivation

**Why It Works:**
- New leaders have mandate for change
- Already tech-savvy (uses conversation intelligence)
- Opportunity to be part of their "first 90 days wins"

---

## Signal Scoring

| Signal | Detectable | Relevant | Timely | Specific | TOTAL | Priority |
|--------|-----------|----------|--------|----------|-------|----------|
| Hiring 2+ sales roles (30d) | 5 | 5 | 5 | 4 | 19/20 | 🔥 HIGH |
| No Sales Enablement person | 4 | 5 | 5 | 3 | 17/20 | 🔥 HIGH |
| Under 100 employees | 5 | 4 | 5 | 3 | 17/20 | 🔥 HIGH |
| Uses Gong/Chorus | 3 | 4 | 3 | 4 | 14/20 | 🟡 MEDIUM |
| Sales team growth 30%+ | 3 | 4 | 4 | 3 | 14/20 | 🟡 MEDIUM |
| New VP Sales (90d) | 4 | 4 | 4 | 4 | 16/20 | 🟡 MEDIUM |

---

## Detection Strategy (for `/offer-launch`)

When running `/offer-launch`, use these APIs:

### Step 1: Find Companies with Hiring Signal
**Tool:** TheirStack  
**Search:** 
- Job titles: "SDR", "BDR", "Account Executive", "Sales Development", "Sales Manager"
- Posted: Last 30 days
- Number of openings: 2+
- Location: United States
- Result: List of company domains

### Step 2: Filter by Company Size
**Tool:** Parallel (company enrichment)  
**Filter:**
- Employee count: 1-100
- Location: United States
- Remove companies from results that don't match

### Step 3: Check for Enablement Team (Negative Signal)
**Tool:** LinkedIn or Parallel (employee search)  
**Filter:**
- Search for titles containing "Enablement", "Sales Training", "Sales Operations"
- If found → deprioritize (they already have solution)
- If NOT found → keep (gap we fill)

### Step 4: Enrich with Tech Stack (Optional Boost)
**Tool:** BuiltWith or similar  
**Look for:**
- Gong, Chorus, Outreach, Salesloft
- If present → boost priority (indicates budget + care about sales performance)

### Step 5: Find Decision Makers
**Tool:** Parallel (people search)  
**Titles:**
- CRO, Chief Revenue Officer
- VP Sales, VP of Sales
- Head of Sales, Head of GTM
- Director of Sales, Director of Revenue
- CEO, Founder (if <50 employees)

---

## Quality Filters

### Minimum Requirements (Must Have)
- ✅ Hiring at least 1 sales role (posted last 30 days)
- ✅ Under 100 employees
- ✅ Located in United States
- ✅ B2B company (has sales team)

### Disqualifying Factors (Remove if Present)
- ❌ Already has Sales Enablement team (3+ people)
- ❌ Uses competing AI roleplay tool (Second Nature, Quantified, etc.)
- ❌ Company over 100 employees (outside ICP)
- ❌ B2C or non-sales company

### Boost Factors (Nice to Have)
- ⬆️ Hiring 3+ sales roles (higher urgency)
- ⬆️ New VP Sales in last 90 days (change agent)
- ⬆️ Uses Gong/Chorus (already invests in sales tools)
- ⬆️ Posted about "sales training" or "rep performance" on LinkedIn

---

## Expected TAM for This Campaign

**Estimate:**
- US companies with <100 employees: ~6M
- B2B companies with sales teams: ~600K (10%)
- Hiring 2+ sales roles in last 30 days: ~6K (1%)
- **Target for this campaign:** 50-75 companies (tight filter)

**Why so selective:**
- First campaign - want high quality over quantity
- Test messaging with strongest signal
- Can expand later if it works

---

## Alternative Signal Ideas (Future Campaigns)

If this campaign works, try these variations:

1. **Tech Stack Gap Campaign**
   - Uses Gong/Chorus but no training tool
   - Shows they care about call quality but missing practice piece

2. **Rapid Growth Campaign**
   - Series A/B funding in last 6 months
   - Headcount growth 50%+
   - Indicates scaling mode, budget available

3. **Founder-Led Sales Transition**
   - First sales hire (transitioning from founder-led)
   - Desperate for process and training

4. **New VP Sales - Fresh Start**
   - Focus ONLY on new VP Sales (90 days)
   - Angle: Help them get quick wins in first quarter

---

## Notes

- **Strengths:** Very specific, high-quality signal, clear need
- **Weaknesses:** Small TAM, may be too narrow
- **Next iteration:** Could expand to 1+ roles instead of 2+, or remove size constraint

