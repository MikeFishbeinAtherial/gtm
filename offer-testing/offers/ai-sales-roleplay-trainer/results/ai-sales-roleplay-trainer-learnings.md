# Campaign Results & Learnings: AI Sales Roleplay Trainer

> This file tracks what works and what doesn't across all campaigns for this offer.

---

## Campaign Performance Summary

*Update this after each campaign launch*

| Campaign | Status | Companies Found | Response Rate | Meetings Booked | Key Learnings |
|----------|--------|----------------|---------------|----------------|---------------|
| Atherial AI Roleplay Training - 2025 Q1 | Paused (restart prep) | - | - | - | Scheduling + duplicate-prevention fixes needed before restart |

---

## What's Working

### Messaging
- *Track which messaging angles get responses*
- *Track which pain points resonate*

### Signals
- *Track which signals lead to qualified leads*
- *Track which signals are too broad/narrow*

### ICP Refinement
- *Track which company profiles convert best*
- *Track which buyer titles respond*

---

## What's NOT Working

### Messaging Misses
- *Track messages that get ignored or negative responses*

### Signal Mistakes
- *Track signals that lead to unqualified leads*

### ICP Adjustments Needed
- *Track companies that don't fit despite matching ICP*

---

## Key Insights

### Buyer Behavior
- *How do they respond?*
- *What questions do they ask?*
- *What objections come up?*

### Market Feedback
- *What are they currently using?*
- *What would make them switch?*
- *Price sensitivity?*

---

## Action Items

- [ ] *Add action items based on learnings*
- [ ] *ICP adjustments to make*
- [ ] *New campaigns to test*
- [ ] *Positioning refinements*

---

## Notes
### 2026-01-16 — Campaign restart prep
- Messages were sent via Unipile but DB status did not update in some cases, which could allow re-sends.
- Added stronger safeguards: atomic lock, duplicate checks, do-not-message list, daily caps, and send window enforcement.
- Rescheduling needed because backlog built up while paused.

