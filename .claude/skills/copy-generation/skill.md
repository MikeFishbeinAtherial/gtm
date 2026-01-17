# Copy Generation

Generate email and LinkedIn message variants for campaigns.

## Description

Create personalized outreach copy based on the campaign's messaging framework. Generates multiple variants for A/B testing, including email sequences and LinkedIn connection requests/messages.

## When to Use

- User wants to "write copy" for a campaign
- User asks to generate "email" or "LinkedIn" messages
- User wants to create "outreach templates"
- User references phase 3 of the workflow

## Prerequisites

- Offer exists with positioning (`offers/{slug}/{slug}-positioning.md`)
- Campaign exists with strategy (`offers/{slug}/campaigns/{campaign}/strategy.md`)

## Instructions

### Step 1: Load Context

Read these files:
1. `offers/{slug}/{slug}-positioning.md` - ICP, problem, benefits
2. `offers/{slug}/campaigns/{campaign}/strategy.md` - Signals, messaging framework

### Step 2: Apply Messaging Framework

Based on campaign strategy, generate copy using the chosen framework:

**If PVP (Permissionless Value):**
- Lead with insight/value, not pitch
- Show you've done research
- Give something useful upfront
- Reference: `context/frameworks/permissionless-value.md`

**If Use Case-Driven:**
- Start with specific implementation
- Quantify impact with numbers
- Show you understand their exact situation
- Reference: `context/frameworks/use-case-driven-outreach.md`

**If Problem-Focused:**
- Lead with the pain point
- Agitate consequences
- Position solution as relief

### Step 3: Generate Email Variants

Create 2-3 variants of:
- **Subject lines** (test different hooks)
- **Opening line** (personalization placeholder)
- **Body** (value prop, social proof)
- **CTA** (low-friction ask)

Format:
```markdown
## Email Variant A: [Hook Type]

**Subject:** [Subject line]

[Email body with {company}, {first_name}, {signal} placeholders]
```

### Step 4: Generate LinkedIn Variants

Create 2-3 variants of:
- **Connection request** (300 char limit)
- **Follow-up message** (after connection accepted)

Format:
```markdown
## LinkedIn Variant A: [Hook Type]

**Connection Request:**
[Message with placeholders]

**Follow-up (Day 2):**
[Message with placeholders]
```

### Step 5: Save Copy Files

```
offers/{slug}/copy/{campaign-slug}/
├── email-variants.md      # Email sequences
└── linkedin-variants.md   # LinkedIn messages
```

### Step 6: Show Summary

```
Created copy for {campaign-name}:
- 3 email variants (Subject A, B, C)
- 2 LinkedIn variants (Direct, Value-first)

Personalization placeholders:
- {first_name}, {company}, {title}
- {signal_detail} (e.g., "hiring 3 SDRs")
- {specific_insight} (company-specific)

Next: Run lead discovery for {campaign-slug} to find companies
Warning: Phase 4 spends API credits
```

## Output Files

- `offers/{slug}/copy/{campaign}/email-variants.md`
- `offers/{slug}/copy/{campaign}/linkedin-variants.md`

## Cost

Free - no API calls. This is copywriting only.

## Related Files

- Copywriting Guide: `offer-testing/context/copywriting/`
- PVP Framework: `offer-testing/context/frameworks/permissionless-value.md`
- Email Examples: `offer-testing/docs/examples/`
