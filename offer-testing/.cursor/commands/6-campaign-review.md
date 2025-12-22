# /offer-review - Review Campaign Results

Analyze results and capture learnings.

## Input Required

- **offer_slug**: Which offer (e.g., "roleplay-trainer")
- **campaign_id** (optional): Specific campaign to review

## Process

### Step 1: Pull Metrics from Supabase

Query campaign performance:

| Metric | Description |
|--------|-------------|
| Sent count | Total messages sent |
| Open rate | Emails opened / sent (if trackable) |
| Reply rate | Replies / sent |
| Positive reply rate | Interested replies / total replies |
| Meetings booked | Calls/demos scheduled |

### Step 2: Analyze Responses

Pull all replies from Supabase and categorize:

| Category | Description |
|----------|-------------|
| Positive | Interested, want to learn more |
| Negative | Not interested (capture reason) |
| Questions | Need more info before deciding |
| Not now | Bad timing, maybe later |
| Bounce | Email bounced |

### Step 3: Identify Patterns

**What worked:**
- Which subject lines got opens?
- Which messages got replies?
- What types of companies responded?
- What titles were most responsive?

**What didn't work:**
- Common objections
- Who ignored us completely
- What bounced

### Step 4: Document Learnings

Create/update `offers/{slug}/results/campaign-{n}.md`:
- Campaign dates
- Metrics summary
- What worked
- What didn't
- Hypotheses for next campaign

### Step 5: Update General Learnings

If learnings are broadly applicable, update:
- `context/learnings/what-works.md`
- `context/learnings/mistakes-to-avoid.md`

### Step 6: Recommendations

Based on results, suggest next steps:

| Signal | Recommendation |
|--------|----------------|
| <5% reply rate | Iterate messaging or try different ICP |
| 5-15% reply rate | Promising, refine and scale |
| >15% reply rate | Strong signal, scale up |
| Many "not now" | Good fit, bad timing - nurture list |
| Many objections | Address in copy or qualify out |

## Example Usage

```
/offer-review roleplay-trainer
```

## Output

- Campaign metrics summary
- Categorized responses
- Pattern analysis
- Documented learnings
- Recommendations for next steps
