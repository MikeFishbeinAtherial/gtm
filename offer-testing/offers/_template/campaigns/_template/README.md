# Campaign Template

This template is used by `/offer-campaign` to create new campaign folders.

## What Gets Created by `/offer-campaign`

```
offers/{slug}/campaigns/{campaign-slug}/
├── campaign-plan.md             ← Overview, goal, timeline, approach
├── signals.md                   ← WHAT to look for (hiring, tech, events)
├── copy/
│   ├── email-v1.md             ← Email variation 1 (A/B test)
│   ├── email-v2.md             ← Email variation 2
│   ├── linkedin-v1.md          ← LinkedIn variation 1
│   └── linkedin-v2.md          ← LinkedIn variation 2
└── {framework}/                 ← Depends on chosen approach
    ├── permissionless-value/   ← If PVP approach chosen
    │   └── pvp-strategy.md
    ├── use-case/               ← If Use Case approach chosen
    │   └── use-case-strategy.md
    └── problem-focused/        ← If Problem approach chosen
        └── problem-strategy.md
```

## Campaign-Specific vs Offer-Wide

| Element | Location | Why |
|---------|----------|-----|
| **ICP** (stable) | `offers/{slug}/positioning-canvas.md` | Same for all campaigns |
| **Signals** (observable) | `campaigns/{slug}/signals.md` | Different per campaign |
| **Copy** | `campaigns/{slug}/copy/` | Different per campaign |
| **Framework** | `campaigns/{slug}/{framework}/` | Different per campaign |

## Example: One Offer, Multiple Campaigns

```
offers/sales-roleplay-trainer/
├── positioning-canvas.md        ← Shared by all campaigns
└── campaigns/
    ├── hiring-signal-q1/
    │   ├── signals.md          ← Target: Companies hiring SDRs
    │   ├── copy/               ← PVP messaging
    │   └── permissionless-value/
    ├── tech-stack-targeting/
    │   ├── signals.md          ← Target: Companies using Salesforce
    │   ├── copy/               ← Use Case messaging
    │   └── use-case/
    └── problem-focused-urgent/
        ├── signals.md          ← Target: Recent funding rounds
        ├── copy/               ← Problem-focused messaging
        └── problem-focused/
```

---

## Files in This Folder

### `campaign-plan.md`
**Created by:** `/offer-campaign`  
**Contains:** Goal, target size, channel, timeline, approach, expected results  
**Used by:** You (to decide which campaign to launch)

### `signals.md`
**Created by:** `/offer-campaign`  
**Contains:** Observable behaviors that indicate need (WHAT to find, not HOW)  
**Used by:** `/offer-launch` (to route to correct APIs)

### `copy/` (folder)
**Created by:** `/offer-campaign`  
**Contains:** Email + LinkedIn variations for A/B testing  
**Used by:** `/offer-send` (to personalize and send)

### `{framework}/` (folder)
**Created by:** `/offer-campaign` (based on chosen approach)  
**Contains:** Strategy details for PVP, Use Case, or Problem-focused  
**Used by:** `/offer-send` (to personalize messages)

