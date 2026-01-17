# Results Analysis

Analyze campaign performance and capture learnings.

## Description

Pull metrics from sent campaigns, analyze what messaging and signals worked best, and document learnings for future campaigns. Identifies patterns across multiple campaigns to improve targeting and copy.

## When to Use

- User wants to "analyze" or "review" campaign results
- User asks "what worked" or "what didn't work"
- User wants to capture "learnings" from a campaign
- User references phase 6 of the workflow

## Prerequisites

- Campaign has sent messages (`campaign_contacts` with status = 'sent')
- Some time has passed for responses (recommended: 1+ week)

## Instructions

### Step 1: Pull Metrics

Query campaign performance data:

```sql
-- Response rates
SELECT
  status,
  COUNT(*) as count
FROM campaign_contacts
WHERE campaign_id = {id}
GROUP BY status

-- Message performance
SELECT
  copy_variant,
  COUNT(*) as sent,
  SUM(CASE WHEN replied THEN 1 ELSE 0 END) as replies
FROM messages
WHERE campaign_id = {id}
GROUP BY copy_variant
```

### Step 2: Calculate KPIs

| Metric | Formula |
|--------|---------|
| Response Rate | Replies / Sent |
| Connection Accept Rate | Accepted / Requests |
| Positive Response Rate | Positive / Total Replies |
| Meeting Book Rate | Meetings / Sent |

### Step 3: Analyze by Segment

Break down performance by:
- **Signal type** - Which signals produced best responses?
- **Company size** - Did smaller or larger companies respond better?
- **Title** - Which buyer titles engaged most?
- **Copy variant** - Which messaging approach won?

### Step 4: Identify Patterns

Look for:
- **What worked:** Top performing segments, copy, signals
- **What didn't work:** Low performers, common objections
- **Surprises:** Unexpected results worth investigating
- **Hypotheses:** Ideas for next campaign

### Step 5: Document Learnings

Create structured learnings document:

```markdown
# Campaign Results: {Campaign Name}

## Performance Summary
| Metric | Value | Benchmark |
|--------|-------|-----------|
| Response Rate | X% | 5-10% |
| Meeting Rate | X% | 1-3% |

## What Worked
- Signal: {best signal} - {why}
- Copy: {winning variant} - {why}
- Segment: {best segment} - {why}

## What Didn't Work
- {thing} - {hypothesis why}

## Key Learnings
1. {learning 1}
2. {learning 2}

## Recommendations for Next Campaign
- {recommendation 1}
- {recommendation 2}
```

### Step 6: Save Results

```
offers/{slug}/results/{campaign-slug}-learnings.md
```

### Step 7: Update Offer-Level Learnings

Append key insights to `offers/{slug}/results/{slug}-learnings.md` for cross-campaign patterns.

## Output Files

- `offers/{slug}/results/{campaign}-learnings.md` - Campaign-specific results
- `offers/{slug}/results/{slug}-learnings.md` - Cross-campaign patterns

## Cost

Free - reads from existing data.

## Status: In Development

This skill is V2 - core workflow defined but not fully implemented yet.

## Related Files

- Results Template: `offer-testing/offers/_template/results/`
- Cross-offer Learnings: `offer-testing/context/learnings/`
