# /offer-campaign - Create a Campaign

Create a campaign for an existing offer with signals, messaging, and copy variations.

**This command defines HOW you'll reach your ICP: what signals to target and what message to send.**

---

## Prerequisites

- ✅ Offer must exist (run `/new-offer` first)
- ✅ Positioning canvas completed
- ✅ ICP defined

---

## Input Required

```
/offer-campaign {offer-slug}
```

**Optional parameters:**
- `--approach` - Messaging framework: `pvp` or `usecase` (default: ask)
- `--type` - Campaign type: `cold` or `networking` (default: ask)
- `--channel` - Channel: `email`, `linkedin`, or `multi` (default: ask)
- `--signal` - Primary signal (e.g., "hiring", "tech-stack", "funding") (default: ask)
- `--icp` - ICP target description (e.g., "pmre-companies", "hedge-funds") (default: ask)

**Examples:**
```
/offer-campaign roleplay --type cold --channel linkedin --signal hiring --icp pmre-companies
/offer-campaign roleplay --type networking --channel multi --signal hiring --icp hedge-funds
/offer-campaign roleplay
```

**Note:** Campaign name and slug will be auto-generated from the collected metadata in the format:
`{type}-{offer-slug}-{channel}-{signal}-{icp}-{account-slug}`

---

## Process

### Step 1: Load Offer Context & Create Campaign Folder

**Load positioning:**
Read `offers/{offer-slug}/{offer-slug}-positioning.md` and extract:
- **ICP:** Company profile + buyer profile
- **Problem:** What pain does the offer solve?
- **Benefits:** What outcomes does it deliver?

**Create campaign folder structure:**
```bash
mkdir -p "offers/{offer-slug}/campaigns/{campaign-slug}/copy"
```

**Folder structure created:**
```
offers/{offer-slug}/campaigns/{campaign-slug}/
├── {campaign-slug}-campaign-plan.md        ← Overview and strategy
├── {campaign-slug}-signals.md              ← Signal definitions
├── {campaign-slug}-strategy.md             ← Messaging framework details (pvp/usecase/problem)
└── copy/
    ├── {campaign-slug}-email-v1.md         ← Email variation 1
    ├── {campaign-slug}-email-v2.md         ← Email variation 2
    ├── {campaign-slug}-linkedin-connection.md  ← LinkedIn connection request
    └── {campaign-slug}-linkedin-followup.md    ← LinkedIn follow-up message
```

**Why include campaign-slug in filenames:**
- Easy to identify which campaign when multiple campaigns open in Cursor
- No filename conflicts between campaigns
- Clear context at a glance

Display summary:
```
📋 Creating campaign for: {Offer Name}
👥 ICP: {industry}, {size}, {geography}
🎯 Buyer: {titles}
💡 Problem: {short description}
```

### Step 2: Collect Campaign Metadata & Generate Parameters

**REQUIRED METADATA:** Every campaign must include the following information:

1. **Campaign Type** (`campaign_type`):
   - `cold` = Cold outreach to new prospects
   - `networking` = Networking campaign to existing connections
   - **Default:** Ask user if not provided

2. **Offer Association** (`offer_slug`):
   - Automatically extracted from command input
   - Used to link campaign to offer in database

3. **Channel** (`channel`):
   - `email` = Email only
   - `linkedin` = LinkedIn only  
   - `multi` = Both email and LinkedIn
   - **Recommendation:** Based on buyer profile
     - C-level buyers → LinkedIn
     - Multiple buyers → Multi-channel
     - IT/Technical → Email

4. **Account Names & IDs** (`account_ids`):
   - **REQUIRED:** Query Supabase `accounts` table to list available accounts
   - For email campaigns: Show email accounts (type='email')
   - For LinkedIn campaigns: Show LinkedIn accounts (type='linkedin')
   - For multi-channel: Show both types
   - User must select which account(s) to use
   - Store both account IDs and account names in campaign metadata
   - Format: `[{id: "...", name: "...", type: "email|linkedin"}, ...]`

5. **Signal** (`signal`):
   - Primary signal being targeted (e.g., "hiring", "tech-stack", "funding", "icp-match")
   - Used in campaign name generation
   - **Default:** Ask user if not provided

6. **ICP Target** (`icp_target`):
   - Specific ICP segment being targeted (e.g., "pmre-companies", "hedge-funds", "b2b-saas")
   - Used in campaign name generation
   - Extract from offer positioning if available
   - **Default:** Ask user if not provided

**Generate Campaign Name & Slug:**

Format: `{type}-{offer-slug}-{channel}-{signal}-{icp}-{account-slug}`

Example: `cold-roleplay-linkedin-hiring-pmre-mike-atherial`

**Rules:**
- All components must be URL-friendly (lowercase, hyphens only)
- Account slug = first part of account name/email (e.g., "mike" from "mike@atherial.ai")
- If multiple accounts, use primary account slug
- Signal should be short (1-2 words max)
- ICP target should be short (1-2 words max)

**Other Parameters:**

**Goal:** Auto-suggest based on strongest signal (e.g., "Target companies hiring sales reps")

**Target Size:** Recommend based on signal specificity
- Narrow signal (very specific) → Small (20-50)
- Medium signal → Medium (50-100)
- Broad signal → Large (100-200)

**Timeline:** Recommend based on target size
- Small → Sprint (1-2 weeks)
- Medium → Standard (3-4 weeks)
- Large → Extended (4-8 weeks)

Present all parameters for user approval/editing.

### Step 3: Generate Signal Strategy

**NEW APPROACH:** Auto-generate complete signal strategy using the problem → symptom → signal chain.

**Reference framework:** @file context/frameworks/signal-brainstorming.md

Use the framework to generate:

1. **Problem statement** (from positioning)
2. **Symptoms** (observable behaviors from the problem)
3. **Signals** (detectable data points) with:
   - Signal description
   - Type (HIRING/USING/SAYING/EXPERIENCING/LACKING)
   - Quality filter
   - Priority (HIGH/MEDIUM/LOW)
   - Detection method (which tool)

4. **Signal stacks** (2-3 combinations of signals that indicate high intent)

**Example output:**
```
PRIMARY STACK: "Scaling Sales Team"
- Hiring 2+ sales roles (last 30 days)
- No Sales Enablement person
- Under 100 employees
→ Indicates: Growing team, training burden on managers

SECONDARY STACK: "New Sales Leader"  
- New VP Sales (last 90 days)
- Uses call recording tools
- Hiring sales roles
→ Indicates: New leader wants quick wins
```

**Do NOT map to APIs yet** - that's `/offer-launch`'s job. Just capture WHAT to look for.

Save signals to `offers/{offer-slug}/campaigns/{campaign-slug}/{campaign-slug}-signals.md`

### Step 4: Select & Generate Messaging Framework

**NEW APPROACH:** Auto-select the best messaging framework based on the offer characteristics, then generate complete strategy.

**Selection logic:**
- **Use Case-Driven:** If offer has clear ROI metrics and implementation steps (most common)
- **PVP:** If breaking into new market, need trust-building, or TAM is small
- **Problem-Focused:** If problem is urgent and widely acknowledged

**Generate complete messaging strategy** based on selected framework:

**For Use Case-Driven:**
- 1-2 specific use cases with situation/implementation/impact/proof
- Quantified outcomes
- Specific implementation details

**For PVP:**
- 4-Phase framework completed (Identify/Investigate/Calculate/Construct)
- Specific asset to deliver
- Data sources identified

**For Problem-Focused:**
- Pain point articulation
- Agitation strategy
- Solution positioning

Present framework + strategy for approval, user can request different approach.

Save to `offers/{offer-slug}/campaigns/{campaign-slug}/{campaign-slug}-strategy.md`

### Step 5: Generate Copy Variations

**NEW APPROACH:** Auto-generate all copy variations based on the messaging framework, then present for approval/editing.

Generate 2-3 variations each for:

#### Email Subject Lines (3-5 options)
Based on framework, generate:
- **PVP:** "[Specific Insight] for [Their Company]"
- **Use Case:** "How [Similar Company] achieved [Result]"
- **Problem:** "Are you experiencing [Pain Point]?"

#### Email Body (2 variations)
Structure based on framework:

**Use Case Template:**
- Hook: Specific situation they're in (based on signal)
- Implementation: How it works (3-4 steps)
- Impact: Quantified results
- Ask: "Does this apply to you?"

**PVP Template:**
- Hook: Insight about their situation
- Value: What you're giving them
- Ask: "Want this?" (not "want a meeting")

**Problem Template:**
- Hook: Call out the pain
- Agitate: What happens if unresolved
- Solution: How you solve it
- Ask: Next step

#### LinkedIn Messages (2 variations)
- **Connection Request:** Max 300 chars, reference signal + value
- **Follow-up Message:** Max 500 chars, similar to email but shorter

**Save all copy to:**
- `offers/{offer-slug}/campaigns/{campaign-slug}/copy/{campaign-slug}-email-v1.md`
- `offers/{offer-slug}/campaigns/{campaign-slug}/copy/{campaign-slug}-email-v2.md`
- `offers/{offer-slug}/campaigns/{campaign-slug}/copy/{campaign-slug}-linkedin-connection.md`
- `offers/{offer-slug}/campaigns/{campaign-slug}/copy/{campaign-slug}-linkedin-followup.md`

### Step 6: Create Campaign Plan Summary

Compile everything into a campaign plan document:

**File:** `offers/{offer-slug}/campaigns/{campaign-slug}/{campaign-slug}-campaign-plan.md`

**Template:**
```markdown
# Campaign Plan: {Campaign Name}

## Campaign Metadata

**Campaign Slug:** `{campaign-slug}`  
**Campaign Type:** {cold/networking}  
**Offer:** {offer name} ({offer-slug})  
**Channel:** {email/linkedin/multi}  
**Primary Signal:** {signal}  
**ICP Target:** {icp-target}  

**Sending Accounts:**
- {Account Name} ({Account Type}) - ID: {account-id}
- {Account Name} ({Account Type}) - ID: {account-id}

## Overview
- **Goal:** {campaign goal}
- **Target:** {target size} companies
- **Timeline:** {sprint/standard/extended}
- **Approach:** {PVP/Use Case/Problem}

## ICP (from Offer)
- Company: {size}, {industry}, {geography}
- Buyer: {titles} in {department}
- **Target Segment:** {icp-target}

## Signals
1. {Signal 1} - Priority: {high/medium/low}
2. {Signal 2} - Priority: {high/medium/low}
3. {Signal 3} - Priority: {high/medium/low}

## Messaging Strategy
{Summary of chosen framework and key angles}

## Files
- {campaign-slug}-campaign-plan.md (this file)
- {campaign-slug}-signals.md
- {campaign-slug}-strategy.md
- copy/{campaign-slug}-email-v1.md
- copy/{campaign-slug}-email-v2.md
- copy/{campaign-slug}-linkedin-connection.md
- copy/{campaign-slug}-linkedin-followup.md

## Expected Results
- Target: {N} companies
- Expected response rate: {X}%
- Expected meetings: {Y}

## Next Steps
1. Review and approve campaign plan
2. Run `/offer-launch {offer-slug} {campaign-slug}` to find companies
3. Review leads
4. Run `/offer-send` to execute

## Created
{date}
```

Save to `offers/{offer-slug}/campaigns/{campaign-slug}/{campaign-slug}-campaign-plan.md`

### Step 7: Summary & Next Steps

```
✅ Campaign Created: {Campaign Name}

📋 Campaign Summary:
   • Approach: {PVP/Use Case/Problem}
   • Signals: {top 3 signals}
   • Target: {N} companies
   • Channel: {LinkedIn/Email/Multi}
   • Copy variants: {X} email, {Y} LinkedIn

📁 Files Created:
   • campaigns/{campaign-slug}/{campaign-slug}-campaign-plan.md
   • campaigns/{campaign-slug}/{campaign-slug}-signals.md
   • campaigns/{campaign-slug}/{campaign-slug}-strategy.md
   • campaigns/{campaign-slug}/copy/{campaign-slug}-email-v1.md
   • campaigns/{campaign-slug}/copy/{campaign-slug}-email-v2.md
   • campaigns/{campaign-slug}/copy/{campaign-slug}-linkedin-connection.md
   • campaigns/{campaign-slug}/copy/{campaign-slug}-linkedin-followup.md

💾 Database:
   • Campaign saved with ID: {uuid}
   • Status: draft
   • Linked to offer: {offer name}
   • Campaign type: {cold/networking}
   • Channel: {email/linkedin/multi}
   • Accounts: {account names and IDs}
   • Signal: {signal}
   • ICP Target: {icp-target}
   • Campaign slug: {campaign-slug}

⏭️  Next Steps:
   1. Review campaign plan and copy variations
   2. Edit if needed (files are in campaigns/ folder)
   3. When ready: `/offer-launch {offer-slug} {campaign-slug}`
      ⚠️  This will spend API credits to find companies
   4. Review leads
   5. `/offer-send {offer-slug} {campaign-slug}` to send messages

💡 Tips:
   • Create 3-5 campaign ideas before launching any
   • Compare signals and messaging angles
   • Pick the strongest 1-2 to launch first
   • You can always come back and launch more later

🎯 Want to create another campaign idea?
   Run: /offer-campaign {offer-slug} {new-campaign-name}
```

---

## What This Command Does NOT Do

- ❌ Does NOT find companies (that's `/offer-launch`)
- ❌ Does NOT call any APIs (no credits spent)
- ❌ Does NOT send messages (that's `/offer-send`)

**This is pure planning.** You're defining the campaign strategy and preparing copy.

---

## Example Usage

```
User: /offer-campaign roleplay

Cursor:
📋 Creating campaign for: AI Sales Roleplay Trainer
👥 ICP: B2B SaaS, 20-100 employees, United States
🎯 Buyer: VP Sales, Sales Director

Campaign type? (cold/networking)
User: cold

Channel? (email/linkedin/multi)
User: linkedin

Primary signal? (e.g., hiring, tech-stack, funding, icp-match)
User: hiring

ICP target segment? (e.g., pmre-companies, hedge-funds, b2b-saas)
User: pmre-companies

Available LinkedIn accounts:
1. Mike Fishbein (linkedin) - ID: eSaTTfPuRx6t131-4hjfSg
2. [Other LinkedIn account] - ID: ...

Which account(s) to use?
User: 1

Campaign goal?
User: Target companies hiring sales reps

Cursor: Target size?
User: Medium (50-100 companies)

[Walks through signal brainstorming...]

Cursor: Found signals:
1. Hiring 2+ SDR/BDR/AE roles in last 30 days
2. Sales team growing 50%+ in 6 months

Which outreach approach?
User: PVP

[Walks through PVP 4-phase framework...]

Cursor: Generated 2 email variations and 2 LinkedIn variations

✅ Campaign Created: cold-roleplay-linkedin-hiring-pmre-mike
📋 Campaign Slug: cold-roleplay-linkedin-hiring-pmre-mike
💾 Database ID: {uuid}
📧 Account: Mike Fishbein (eSaTTfPuRx6t131-4hjfSg)

Next: /offer-launch roleplay cold-roleplay-linkedin-hiring-pmre-mike
```

---

## Campaign Naming Convention

**REQUIRED:** Every campaign must follow this structured naming format:

**Format:** `{type}-{offer-slug}-{channel}-{signal}-{icp}-{account-slug}`

**Components:**
- `{type}` - Campaign type: `cold` or `networking`
- `{offer-slug}` - Offer identifier (from command input)
- `{channel}` - Channel: `email`, `linkedin`, or `multi`
- `{signal}` - Primary signal (1-2 words, e.g., `hiring`, `tech-stack`, `funding`)
- `{icp}` - ICP target segment (1-2 words, e.g., `pmre-companies`, `hedge-funds`)
- `{account-slug}` - Account identifier (first part of account name/email)

**Examples:**
- `cold-roleplay-linkedin-hiring-pmre-mike`
- `networking-finance-email-funding-hedge-funds-mike-atherial`
- `cold-roleplay-multi-hiring-b2b-saas-mike`

**Why This Format:**
- Easy to identify campaign type, offer, channel, and targeting at a glance
- Prevents naming conflicts
- Makes it easy to filter/search campaigns
- All metadata visible in filename

## Database Storage

When creating a campaign, the following metadata is stored in Supabase:

**Campaigns Table:**
- `campaign_slug` (TEXT, UNIQUE) - The structured campaign slug
- `account_ids` (JSONB) - Array of account objects: `[{"id": "...", "name": "...", "type": "email|linkedin"}, ...]`
- `target_criteria` (JSONB) - Includes `signal` and `icp_target` fields:
  ```json
  {
    "signal": "hiring",
    "icp_target": "pmre-companies",
    "signals": [...],
    ...
  }
  ```

**Migration Required:** Run `scripts/add-campaign-metadata-fields.sql` to add new columns to existing databases.

## Related Files

- **Signal Framework:** `context/frameworks/signal-brainstorming.md`
- **PVP Framework:** `context/frameworks/permissionless-value.md`
- **Use Case Framework:** `context/frameworks/use-case-driven-outreach.md`
- **Previous Command:** `.cursor/commands/new-offer.md`
- **Next Command:** `.cursor/commands/offer-launch.md`
- **Database Schema:** `scripts/setup-db.sql` (campaigns table)
- **Migration Script:** `scripts/add-campaign-metadata-fields.sql`
- **Types:** `src/lib/types/campaign.ts`

