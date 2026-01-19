# Parallel FindAll Refined Queries - Small-to-Medium Finance Firms

## Problem with Previous Queries

**Issue:** Previous queries returned large firms like KKR (too big for our ICP)
- KKR has $500B+ AUM (we target $10M-$500M hedge funds, $100M-$2B PE firms)
- Need better filtering to exclude mega-firms

## Strategy: Use FindAll Match Conditions to Filter Size

**Key Insight:** Use FindAll's match conditions to filter by:
1. **Company size signals** (employee count, AUM mentions)
2. **Hiring activity** (active job postings)
3. **AI/data leadership** (people with AI titles)
4. **Growth signals** (recent hiring, expansion)

**Cost:** Core generator ($2 + $0.15/match) or Pro ($10 + $1/match)
**Budget:** $37 remaining

---

## Query 1: Small-to-Mid Hedge Funds with Active Hiring + AI Leadership

**Objective:**
```
Find all small-to-mid hedge funds ($10M-$500M AUM) in the United States that are currently hiring and have AI/data leadership on staff
```

**Match Conditions:**
1. **Hedge Fund Type**
   - Description: "Company must be a hedge fund, alternative investment fund, or investment management firm. Look for keywords: 'hedge fund', 'alternative investment', 'investment management'. Exclude banks, credit unions, insurance companies, venture capital firms, and private equity firms."

2. **Small-to-Mid Size**
   - Description: "Company must be small-to-mid sized. Look for evidence: employee count 5-100, AUM between $10M-$500M, or descriptions like 'small fund', 'mid-sized fund', 'boutique'. Exclude large firms: if AUM mentioned is over $500M, employee count over 200, or descriptions like 'global', 'multi-billion', 'largest'."

3. **Currently Hiring**
   - Description: "Company must have active job postings listed publicly. Look for: LinkedIn job postings from past 90 days, company career page with open positions, job board listings. Evidence should show they are actively recruiting."

4. **AI/Data Leadership**
   - Description: "Company must have at least one person on staff with AI/data leadership title. Look for: 'Head of AI', 'Head of Data', 'Chief Data Officer', 'CDO', 'Director of Data', 'VP Data', 'AI Engineer', 'Machine Learning Engineer', 'Data Scientist' in LinkedIn profiles, team pages, or job descriptions."

5. **US Location**
   - Description: "Company headquarters must be in the United States."

**Expected Matches:** 20-50 hedge funds
**Cost Estimate (Core):** $2 + ($0.15 × 35) = ~$7.25
**Cost Estimate (Pro):** $10 + ($1 × 35) = $45 (over budget)

**Recommendation:** Use **Core** generator

---

## Query 2: Mid-Market PE Firms with Active Hiring + Technical Roles

**Objective:**
```
Find all mid-market private equity firms ($100M-$2B AUM) in the United States that are currently hiring for technical or data roles
```

**Match Conditions:**
1. **PE Firm Type**
   - Description: "Company must be a private equity firm, buyout firm, or growth equity firm. Look for keywords: 'private equity', 'buyout', 'growth equity', 'PE firm'. Exclude venture capital firms, hedge funds, banks, and credit unions."

2. **Mid-Market Size**
   - Description: "Company must be mid-market sized. Look for evidence: employee count 10-150, AUM between $100M-$2B, or descriptions like 'mid-market', 'middle market', 'boutique PE'. Exclude mega-firms: if AUM mentioned is over $2B, employee count over 200, or descriptions like 'global', 'multi-billion', 'largest PE firm'."

3. **Currently Hiring Technical Roles**
   - Description: "Company must have active job postings for technical or data roles. Look for: job titles like 'Data Engineer', 'Platform Engineer', 'Automation Engineer', 'Technology Analyst', 'IT Manager', 'Data Analyst', 'Software Engineer', 'CTO', 'Head of Technology' posted in past 90 days on LinkedIn, company career pages, or job boards."

4. **US Location**
   - Description: "Company headquarters must be in the United States."

**Expected Matches:** 15-40 PE firms
**Cost Estimate (Core):** $2 + ($0.15 × 25) = ~$5.75
**Cost Estimate (Pro):** $10 + ($1 × 25) = $35 (within budget but tight)

**Recommendation:** Use **Core** generator

---

## Query 3: Hedge Funds Hiring Research Analysts (Pain Signal)

**Objective:**
```
Find all small-to-mid hedge funds ($10M-$500M AUM) in the United States that are currently hiring research analysts or investment analysts
```

**Match Conditions:**
1. **Hedge Fund Type**
   - Description: "Company must be a hedge fund, alternative investment fund, or investment management firm. Exclude banks, credit unions, insurance companies, venture capital firms, and private equity firms."

2. **Small-to-Mid Size**
   - Description: "Company must be small-to-mid sized. Look for: employee count 5-100, AUM $10M-$500M, or 'small fund', 'mid-sized fund', 'boutique'. Exclude large firms with AUM over $500M or employee count over 200."

3. **Hiring Research Analysts**
   - Description: "Company must have active job postings for research or investment analyst roles. Look for: 'Research Analyst', 'Investment Analyst', 'Equity Research Analyst', 'Research Associate', 'Investment Research', 'Credit Analyst' posted in past 90 days on LinkedIn, company career pages, or job boards."

4. **US Location**
   - Description: "Company headquarters must be in the United States."

**Expected Matches:** 30-60 hedge funds
**Cost Estimate (Core):** $2 + ($0.15 × 45) = ~$8.75
**Cost Estimate (Pro):** $10 + ($1 × 45) = $55 (over budget)

**Recommendation:** Use **Core** generator

---

## Query 4: PE Firms Hiring Deal Sourcing Roles (Pain Signal)

**Objective:**
```
Find all mid-market private equity firms ($100M-$2B AUM) in the United States that are currently hiring deal sourcing or business development roles
```

**Match Conditions:**
1. **PE Firm Type**
   - Description: "Company must be a private equity firm, buyout firm, or growth equity firm. Exclude venture capital firms, hedge funds, banks, and credit unions."

2. **Mid-Market Size**
   - Description: "Company must be mid-market sized. Look for: employee count 10-150, AUM $100M-$2B, or 'mid-market', 'middle market', 'boutique PE'. Exclude mega-firms with AUM over $2B or employee count over 200."

3. **Hiring Deal Sourcing**
   - Description: "Company must have active job postings for deal sourcing or business development roles. Look for: 'Deal Sourcing', 'Sourcing Analyst', 'Business Development', 'Deal Origination', 'Investment Sourcing', 'Deal Flow' posted in past 90 days on LinkedIn, company career pages, or job boards."

4. **US Location**
   - Description: "Company headquarters must be in the United States."

**Expected Matches:** 20-50 PE firms
**Cost Estimate (Core):** $2 + ($0.15 × 35) = ~$7.25
**Cost Estimate (Pro):** $10 + ($1 × 35) = $45 (over budget)

**Recommendation:** Use **Core** generator

---

## Query 5: Finance Firms with Recent Growth (Headcount Expansion)

**Objective:**
```
Find all small-to-mid hedge funds and mid-market PE firms in the United States that have been growing recently (hiring multiple roles in past 6 months)
```

**Match Conditions:**
1. **Finance Firm Type**
   - Description: "Company must be a hedge fund, private equity firm, alternative investment fund, or investment management firm. Exclude banks, credit unions, insurance companies, and venture capital firms."

2. **Small-to-Mid Size**
   - Description: "Company must be small-to-mid sized. For hedge funds: employee count 5-100, AUM $10M-$500M. For PE firms: employee count 10-150, AUM $100M-$2B. Exclude large firms with AUM over $500M (hedge funds) or $2B (PE firms), or employee count over 200."

3. **Recent Growth Signal**
   - Description: "Company must show evidence of recent growth. Look for: multiple job postings (3+ roles) posted in past 6 months, LinkedIn company updates about hiring, team expansion announcements, new office openings, or descriptions like 'growing', 'expanding', 'hiring'."

4. **US Location**
   - Description: "Company headquarters must be in the United States."

**Expected Matches:** 25-50 firms
**Cost Estimate (Core):** $2 + ($0.15 × 35) = ~$7.25
**Cost Estimate (Pro):** $10 + ($1 × 35) = $45 (over budget)

**Recommendation:** Use **Core** generator

---

## Total Cost Estimate

**Using Core Generator:**
- Query 1: ~$7.25
- Query 2: ~$5.75
- Query 3: ~$8.75
- Query 4: ~$7.25
- Query 5: ~$7.25
- **Total: ~$36.25** (within $37 budget)

**Using Pro Generator:**
- Would cost $45-55+ (over budget)

**Recommendation:** Use **Core** generator for all queries

---

## Key Improvements Over Previous Queries

1. **Better Size Filtering**
   - Explicitly excludes large firms (KKR, mega-funds)
   - Focuses on employee count ranges
   - Checks AUM ranges more carefully

2. **Active Hiring Signal**
   - Requires current job postings (past 90 days)
   - Shows they're actively growing/recruiting
   - Better signal than just "has hired in past"

3. **Specific Role Targeting**
   - AI/data leadership roles (maturity signal)
   - Research analyst roles (pain signal)
   - Deal sourcing roles (pain signal)

4. **Recent Growth Signal**
   - Multiple hires in past 6 months
   - Shows active expansion
   - Better than one-off hires

5. **Cost Efficiency**
   - Uses Core generator (cheaper)
   - Stays within $37 budget
   - Focuses on quality matches over quantity

---

## Next Steps

1. **Review these queries** - Do they match your ICP?
2. **Adjust match conditions** - Any changes needed?
3. **Run queries** - Execute with Core generator
4. **Review results** - Check company sizes, verify they're good fits
5. **Save to Supabase** - Link to finance-leadgen-1000 campaign
