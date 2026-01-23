# Email Segmentation Plan - Finance Campaign

**Date:** January 18, 2026  
**Total Contacts with Email:** 210  
**Total Email Variations:** 3

---

## Current Status

- Total Companies: 331
- Companies with Contacts: 255
- Total Contacts: 348
- Contacts with Email: 210 (60.3% success rate)

---

## Email Variations

### Email V1: Custom Report Offer (Competitive Angle)
**Subject:** "earnings call edge"  
**Offer:** Free earnings call analysis on any stock ticker  
**Best For:** Hedge funds actively trading public equities

### Email V2: Flexible Choice (Custom Report or DIY Guide)
**Subject:** "AI for earnings"  
**Offer:** Choose between custom report OR DIY guide for portfolio  
**Best For:** Mixed audience, testing offer preference

### Email V3: DIY Guide (Build It Yourself)
**Subject:** "build earnings AI"  
**Offer:** Guide to build portfolio-wide earnings analysis system  
**Best For:** Larger funds, technical buyers, DIY-oriented

---

## Segmentation Strategy

### Segment 1: Hedge Funds → Email V1 (Custom Report)
**Target Segments:**
- `hedge_fund` (35 companies)
- `asset_manager` (1 company)

**Why:** These funds actively trade public equities and need earnings analysis. Custom report shows immediate value for their current positions.

**Expected Contacts:** ~70-80 contacts (if 2 contacts per company)

---

### Segment 2: Investment Firms (Unknown) → Email V2 (Flexible)
**Target Segments:**
- `investment_firm` (99 companies)
- `unknown` (93 companies)

**Why:** We're not 100% sure these are all hedge funds. Flexible offer lets them choose what's more relevant (report for traders, guide for researchers).

**Expected Contacts:** ~70-80 contacts (split of the 192 companies)

**Filter:** Only send to companies where vertical suggests finance (not credit unions, banks, etc.)

---

### Segment 3: Larger/Technical Buyers → Email V3 (DIY Guide)
**Target Segments:**
- `hedge_fund` with signals of technical capability (AI leadership, data team, etc.)
- `investment_firm` with larger AUM or technical signals

**Why:** Larger, more technical funds want to build in-house. DIY guide appeals to their independence and shows you understand their scale needs.

**Expected Contacts:** ~50-60 contacts

---

## Recommended Split

Based on 210 contacts with email:

| Segment | Email | Target | Expected Count |
|---------|-------|--------|----------------|
| Hedge Funds | V1 (Custom Report) | hedge_fund, asset_manager | ~70 |
| Investment Firms | V2 (Flexible) | investment_firm, unknown (finance-focused) | ~80 |
| Technical/Large | V3 (DIY Guide) | Funds with technical signals | ~60 |

---

## SQL Queries for Segmentation

### Query 1: Hedge Funds (Email V1)
```sql
SELECT 
  c.id as contact_id,
  c.first_name,
  c.email,
  co.name as company_name,
  co.vertical
FROM contacts c
JOIN companies co ON c.company_id = co.id
WHERE co.offer_id = (SELECT id FROM offers WHERE slug = 'finance')
  AND c.email IS NOT NULL
  AND c.email_status != 'failed'
  AND co.vertical IN ('hedge_fund', 'asset_manager')
ORDER BY co.name, c.first_name;
```

### Query 2: Investment Firms (Email V2)
```sql
SELECT 
  c.id as contact_id,
  c.first_name,
  c.email,
  co.name as company_name,
  co.vertical
FROM contacts c
JOIN companies co ON c.company_id = co.id
WHERE co.offer_id = (SELECT id FROM offers WHERE slug = 'finance')
  AND c.email IS NOT NULL
  AND c.email_status != 'failed'
  AND co.vertical IN ('investment_firm', 'unknown')
  -- Exclude non-finance companies
  AND co.vertical NOT IN ('credit_union', 'bank', 'insurance', 'broker_dealer', 'mortgage')
ORDER BY co.name, c.first_name;
```

### Query 3: Technical/Large Funds (Email V3)
```sql
-- Option A: Use signals data
SELECT 
  c.id as contact_id,
  c.first_name,
  c.email,
  co.name as company_name,
  co.vertical,
  co.signals
FROM contacts c
JOIN companies co ON c.company_id = co.id
WHERE co.offer_id = (SELECT id FROM offers WHERE slug = 'finance')
  AND c.email IS NOT NULL
  AND c.email_status != 'failed'
  AND co.vertical IN ('hedge_fund', 'investment_firm')
  -- Has AI/data leadership signals
  AND (
    co.signals->>'maturity_tier' IN ('high', 'mature')
    OR co.signals->'parallel'->>'signal_type' = 'maturity'
    OR c.job_title ILIKE '%AI%' 
    OR c.job_title ILIKE '%Data%'
  )
ORDER BY co.name, c.first_name;

-- Option B: Split by contact title
SELECT 
  c.id as contact_id,
  c.first_name,
  c.email,
  c.job_title,
  co.name as company_name,
  co.vertical
FROM contacts c
JOIN companies co ON c.company_id = co.id
WHERE co.offer_id = (SELECT id FROM offers WHERE slug = 'finance')
  AND c.email IS NOT NULL
  AND c.email_status != 'failed'
  AND co.vertical IN ('hedge_fund', 'investment_firm', 'asset_manager')
  -- Technical/senior titles
  AND (
    c.job_title ILIKE '%CIO%'
    OR c.job_title ILIKE '%Chief Investment Officer%'
    OR c.job_title ILIKE '%Head of Research%'
    OR c.job_title ILIKE '%AI%'
    OR c.job_title ILIKE '%Data%'
  )
ORDER BY co.name, c.first_name;
```

---

## Execution Steps

### Step 1: Run Segmentation Queries
```bash
# Create a script that exports contact lists by segment
npx ts-node scripts/segment-contacts-for-email.ts
```

This should output 3 CSV files:
- `segment-1-hedge-funds.csv` (Email V1)
- `segment-2-investment-firms.csv` (Email V2)
- `segment-3-technical-buyers.csv` (Email V3)

### Step 2: Link Contacts to Campaign
```bash
# Link all contacts with emails to campaign
npx ts-node scripts/link-contacts-to-campaign.ts
```

### Step 3: Create Messages by Segment
```bash
# Create messages using segment-specific templates
npx ts-node scripts/create-email-messages-segmented.ts \
  --segment-1-file segment-1-hedge-funds.csv \
  --segment-1-template v1 \
  --segment-2-file segment-2-investment-firms.csv \
  --segment-2-template v2 \
  --segment-3-file segment-3-technical-buyers.csv \
  --segment-3-template v3
```

---

## Alternative: Simpler Segmentation

If the technical segmentation is too complex, use a simpler approach:

### Simple Option 1: Split by Company Vertical Only
- Hedge Funds (hedge_fund, asset_manager) → V1
- Investment Firms (investment_firm) → V2
- Unknown (unknown) → V2

### Simple Option 2: Random A/B/C Test
- Randomly assign 1/3 of contacts to each email variation
- Track performance by template
- Winner gets sent to remaining list

### Simple Option 3: Sequential Test
- Send V2 (Flexible) to first 70 contacts
- Measure reply rate after 5 days
- If > 10% reply rate, continue with V2
- If < 10%, switch to V1 or V3

---

## Recommended Approach

**For first send, I recommend Simple Option 1:**

1. **Hedge Funds (35 companies, ~70 contacts) → Email V1**
   - Clear segment
   - Custom report fits their trading needs
   - Easy to measure performance

2. **Investment Firms (99 companies, ~80 contacts) → Email V2**
   - Flexible offer tests what resonates
   - Good for less certain segment
   - Tracks report vs. guide preference

3. **Unknown (93 companies, ~60 contacts) → Email V2**
   - Same flexible offer
   - We're unsure of their exact focus
   - Let them choose what's relevant

**Why this works:**
- Simple to execute
- Each segment gets appropriate offer
- Tests flexible offer (V2) on largest group
- Can adjust future sends based on results

---

## Next Steps

1. Create segmentation script (or run SQL queries manually)
2. Link contacts to campaign
3. Create messages with segment-specific templates
4. Review sample messages in Supabase
5. Start with small test batch (20-30 emails)
6. Monitor results and adjust

---

## Success Metrics by Segment

### Email V1 (Custom Report)
- Expected Reply Rate: 10-15%
- Expected Report Requests: 60-80% of replies
- Best Case: They request analysis and reply with ticker

### Email V2 (Flexible)
- Expected Reply Rate: 12-18%
- Expected Report vs. Guide: Track which they choose
- Best Case: They engage and tell us what they need

### Email V3 (DIY Guide)
- Expected Reply Rate: 15-20% (educational offers often perform well)
- Expected Guide Requests: 70-90% of replies
- Best Case: They request guide and come back later for custom build
