# 3-campaign-copy - Write Copy for Campaigns

Generate email and LinkedIn copy variations for existing campaigns.

**This command creates A/B test variations AFTER you've defined your campaign strategy.**

---

## Prerequisites

- ✅ Offer exists (`1-new-offer` completed)
- ✅ Campaign exists (`2-offer-campaigns` completed)
- ✅ Campaign has signals and framework defined
- ✅ Note: Copy creation does NOT enqueue messages (that happens in outreach step)

---

## Input Required

```
/campaign-copy {offer-slug} {campaign-slug}
```

**Optional parameters:**
- `--variants` - Number of variations to create (default: 2 per channel)
- `--channel` - Which channel: `email`, `linkedin`, or `both` (default: both)

**Examples:**
```
/campaign-copy sales-roleplay-trainer hiring-signal-q1
/campaign-copy sales-roleplay-trainer pvp-benchmarks --variants 3
/campaign-copy sales-roleplay-trainer tech-stack --channel email
```

---

## Process

### Step 1: Load Campaign Context

Read campaign files:
- `offers/{offer-slug}/campaigns/{campaign-slug}/campaign-plan.md` → Framework, approach
- `offers/{offer-slug}/campaigns/{campaign-slug}/signals.md` → Signal context
- `offers/{offer-slug}/positioning-canvas.md` → ICP, problem, benefits

Display summary:
```
📝 Writing copy for: {Campaign Name}
   Offer: {Offer Name}
   Approach: {PVP/Use Case/Problem}
   Signals: {Top 3 signals}
   Channel: {Email/LinkedIn/Both}
```

### Step 2: Generate Email Copy (if email channel)

#### Email Subject Lines (5 options)
```
Based on framework and signals, generate:

PVP approach:
- "[Specific Insight] for [Their Company Type]"
- "Quick benchmark: [Metric] at [Industry] companies"
- "[Surprising Finding] about [Their Problem]"

Use Case approach:
- "How [Similar Company] achieved [Result] with [Solution]"
- "[Result] in [Timeframe]: [Company] case study"
- "The exact playbook [Company] used for [Outcome]"

Problem approach:
- "Are you experiencing [Pain Point]?"
- "The hidden cost of [Problem]"
- "[Problem] → [Outcome]: Here's how"

Show user 5 options, let them pick favorites
```

#### Email Body (2-3 variations)

**PVP Template:**
```
Hook: Observation about their situation
Context: Brief research insight
Value: What you're giving them (no strings)
Delivery: How they get it (link, attachment, etc.)
Soft CTA: "Want this?" (not "want a meeting")
```

**Use Case Template:**
```
Hook: Specific situation that matches theirs
Problem: Pain point they feel
Solution: How [Similar Company] solved it
Implementation: 3-4 specific steps
Results: Quantified impact
Ask: "Does this apply to you?"
```

**Problem Template:**
```
Hook: Call out the pain directly
Agitate: What happens if unresolved
Evidence: Data or examples
Solution: How you solve it
Next Step: Low-friction ask
```

Generate 2-3 variations for each template, save to:
- `offers/{slug}/copy/{campaign-slug}/email-v1.md`
- `offers/{slug}/copy/{campaign-slug}/email-v2.md`
- `offers/{slug}/copy/{campaign-slug}/email-v3.md`

### Step 3: Generate LinkedIn Copy (if linkedin channel)

#### Connection Request (300 chars max)

**Formula:**
```
[Buyer Name], [Signal Observation] at [Company]. [One-line value]. Worth connecting?
```

**Examples:**
```
John, saw Acme is hiring 3 SDRs. We compiled benchmark data on rep ramp time at B2B SaaS companies. Worth connecting?

Sarah, noticed you're scaling the sales team at Beta. Have insights on training programs that cut onboarding time in half. Interested?
```

Generate 2-3 variations.

#### Follow-up Message (if already connected, 500 chars max)

Similar to email but shorter:
```
Hook (1 line)
Value (2-3 lines)
Ask (1 line)
```

Generate 2-3 variations, save to:
- `offers/{slug}/copy/{campaign-slug}/linkedin-connection-v1.md`
- `offers/{slug}/copy/{campaign-slug}/linkedin-connection-v2.md`
- `offers/{slug}/copy/{campaign-slug}/linkedin-message-v1.md`
- `offers/{slug}/copy/{campaign-slug}/linkedin-message-v2.md`

### Step 4: Add Personalization Placeholders

For each copy variant, add placeholders:
```
{{company_name}}
{{contact_first_name}}
{{contact_title}}
{{signal_observation}}
{{industry}}
{{company_size}}
```

Example:
```
Hi {{contact_first_name}},

Saw {{company_name}} is {{signal_observation}}. We researched 50 {{industry}} companies...
```

These will be filled in by `5-leads-outreach` when sending.

---

## Messages vs Send Queue (Important)

- **Copy creation** only writes templates/files.
- **Message creation** writes rows to `messages` (content + schedule).
- **Sending** only happens from `send_queue` (execution queue).
- If a message only exists in `messages`, it will **not** send until it is enqueued.

### Step 5: Save Copy Index

Create `offers/{slug}/copy/{campaign-slug}/README.md`:

```markdown
# Copy for: {Campaign Name}

**Campaign:** {campaign-slug}
**Offer:** {offer-slug}
**Approach:** {PVP/Use Case/Problem}
**Created:** {date}

## Variations

### Email
- `email-v1.md` - {Brief description}
- `email-v2.md` - {Brief description}
- `email-v3.md` - {Brief description}

### LinkedIn
- `linkedin-connection-v1.md` - {Brief description}
- `linkedin-connection-v2.md` - {Brief description}
- `linkedin-message-v1.md` - {Brief description}
- `linkedin-message-v2.md` - {Brief description}

## Personalization Variables
- {{company_name}}
- {{contact_first_name}}
- {{contact_title}}
- {{signal_observation}}
- {{industry}}
- {{company_size}}

## A/B Test Plan
- Primary: email-v1, linkedin-connection-v1
- Secondary: email-v2, linkedin-connection-v2
- Split: 50/50 initially, adjust based on results

## Next Steps
1. Review all variations
2. Edit as needed
3. Run `4-campaigns-leads {offer-slug} {campaign-slug}` to find companies
4. Run `5-leads-outreach {offer-slug} {campaign-slug}` to send
```

### Step 6: Summary

```
✅ Copy Created for: {Campaign Name}

📝 Email Copy:
   • 5 subject line options
   • 3 body variations
   • Saved to: copy/{campaign-slug}/

💬 LinkedIn Copy:
   • 2 connection request variations
   • 2 follow-up message variations
   • Saved to: copy/{campaign-slug}/

🔄 Personalization:
   • 6 variables ready for merge
   • Will be filled when sending

⏭️  Next Steps:
   1. Review copy in: offers/{slug}/copy/{campaign-slug}/
   2. Edit any variations
   3. When ready: Run `4-campaigns-leads {offer-slug} {campaign-slug}`

💡 Tip: Test multiple subject lines - they make the biggest difference!
```

---

## What This Command Does NOT Do

- ❌ Does NOT find companies (that's `4-campaigns-leads`)
- ❌ Does NOT send messages (that's `5-leads-outreach`)
- ❌ Does NOT personalize yet (placeholders only)

**This is pure copywriting.** You're creating variations to test.

---

## Example Usage

```
User: /campaign-copy sales-roleplay-trainer hiring-signal-q1

Cursor:
📝 Writing copy for: Hiring Signal Q1
   Approach: Permissionless Value
   Signals: Hiring 2+ SDRs, Sales team growth
   
Generated:
✓ 5 email subject lines
✓ 3 email body variations (PVP approach)
✓ 2 LinkedIn connection requests
✓ 2 LinkedIn follow-up messages

Files created in: offers/sales-roleplay-trainer/copy/hiring-signal-q1/

Next: Review copy, then run /campaigns-leads
```

---

## Related Files

- **Campaign Plan:** `offers/{slug}/campaigns/{campaign-slug}/campaign-plan.md` (framework source)
- **Positioning:** `offers/{slug}/positioning-canvas.md` (ICP, problem, benefits)
- **Signals:** `offers/{slug}/campaigns/{campaign-slug}/signals.md` (context for hooks)
- **Frameworks:**
  - `context/frameworks/permissionless-value.md`
  - `context/frameworks/use-case-driven-outreach.md`
- **Copywriting Principles:**
  - `context/copywriting/email-principles.md`
  - `context/copywriting/linkedin-principles.md`
- **Previous Command:** `.cursor/commands/2-offer-campaigns.md`
- **Next Command:** `.cursor/commands/4-campaigns-leads.md`

