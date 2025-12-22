# TheirStack API - Quick Reference

**Type:** Job Posting Signals  
**Website:** https://theirstack.com/  
**Docs:** https://theirstack.com/docs  
**Purpose:** Find companies by hiring signals (who's hiring what roles)

---

## When to Use TheirStack

| Use Case | Why TheirStack |
|----------|---------------|
| **Find companies hiring specific roles** | "Companies hiring SDRs" |
| **Detect growth signals** | Hiring velocity = growth |
| **Target based on hiring pain** | Hiring sales → need training |
| **Time-sensitive targeting** | Job posted this week = urgent |

**In your workflow:** TheirStack is for SIGNAL-BASED targeting - finding companies with hiring signals.

---

## Key Capabilities

### 1. Job Posting Search
Find companies with specific job openings.

**Best for:**
- Hiring signals ("hiring SDRs" = need sales training)
- Growth detection (many openings = scaling)
- Department expansion (adding to sales team)

**Example:** "Companies hiring 3+ SDR/BDR/AE roles in last 30 days"

### 2. Hiring Velocity
Track how fast companies are hiring.

**Best for:**
- Identifying fast-growing companies
- Prioritizing by hiring speed
- Detecting scaling phases

**Example:** "Companies that went from 2 → 10 sales people in 3 months"

### 3. Job Description Analysis
Extract details from job postings.

**Best for:**
- Understanding company needs
- Finding tech stack mentions
- Identifying pain points

**Example:** "Companies mentioning 'Salesforce' in SDR job descriptions"

---

## API Usage in Code

### Search by Job Title
```typescript
import { theirstackSearchJobs } from '@/lib/clients/theirstack'

const jobs = await theirstackSearchJobs({
  job_titles: ['SDR', 'BDR', 'Sales Development Rep'],
  posted_within_days: 30,
  min_openings: 2,
  company_size_min: 20,
  company_size_max: 200,
  location: 'United States'
})
```

### Find Companies Hiring
```typescript
import { theirstackGetCompanies } from '@/lib/clients/theirstack'

const companies = await theirstackGetCompanies({
  hiring_for: ['Sales Manager', 'Sales Enablement'],
  posted_within_days: 60,
  limit: 50
})
```

### Analyze Hiring Velocity
```typescript
import { theirstackHiringVelocity } from '@/lib/clients/theirstack'

const velocity = await theirstackHiringVelocity({
  company_id: 'company-123',
  timeframe_days: 90
})
```

---

## Signal → TheirStack Mapping

| Signal | TheirStack Query |
|--------|------------------|
| **Hiring sales reps** | job_titles: ['SDR', 'BDR', 'AE'] |
| **Scaling sales team** | min_openings: 3, department: 'sales' |
| **First sales hire** | job_titles: ['VP Sales'], team_size: 0 |
| **Sales enablement focus** | job_titles: ['Sales Enablement', 'Sales Training'] |
| **RevOps buildout** | job_titles: ['Revenue Operations', 'RevOps'] |

---

## Common Patterns

### Pattern 1: Hiring Signal Detection
```
Input: Signal from positioning (e.g., "hiring SDRs")
↓
1. Search TheirStack for SDR/BDR job postings
2. Filter by date (last 30 days = urgent)
3. Filter by company size (matches ICP)
4. Get company list
5. Enrich with Parallel
6. Save to Supabase
```

### Pattern 2: Growth Signal Detection
```
Input: Need fast-growing companies
↓
1. Search for multiple sales roles
2. Filter: min_openings >= 3
3. Check hiring velocity
4. Prioritize by growth rate
```

### Pattern 3: Job Description Intelligence
```
Input: Company from TheirStack
↓
1. Get full job description
2. Extract: required tools, pain points, team size
3. Use in PVP: "Saw you're hiring 3 SDRs..."
4. Personalize copy based on job details
```

---

## Integration with Other Tools

### TheirStack + Parallel
```
Flow: Signal-Based Discovery
1. TheirStack: Find companies hiring
   → "50 companies hiring SDRs"
2. Parallel: Enrich companies
   → Verify ICP match (size, industry)
3. Parallel: Find contacts
   → Get VP Sales, Sales Managers
4. Save: Companies + contacts to Supabase
```

### TheirStack + Exa
```
Flow: Deep Research on Hiring Companies
1. TheirStack: Find companies hiring
2. Exa: Research each company
   → "Why are they hiring?"
   → "Recent funding? New product?"
3. Use insights for PVP
```

### TheirStack + Supabase
```
Flow: Track Hiring Over Time
1. TheirStack: Get job postings
2. Save to Supabase with timestamp
3. Query: "Companies still hiring after 60 days"
   → Indicates persistent need
```

---

## Rate Limits & Costs

**Rate Limits:**
- 60 requests per minute (typical)
- Check your plan for exact limits

**Costs:**
- Pay per API call (credits system)
- Job search: ~2-5 credits per search
- Company hiring data: ~1 credit per company

**Best practices:**
- Search for multiple job titles in one query
- Cache results in Supabase
- Don't search same query within 24 hours (job data doesn't change that fast)

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Check THEIRSTACK_API_KEY in .env |
| `429 Too Many Requests` | Rate limit hit | Add delay between requests |
| `404 Not Found` | No jobs matching criteria | Normal - broaden search |
| `400 Bad Request` | Invalid job title | Check job_titles format |

### Error Handling Pattern
```typescript
try {
  const jobs = await theirstackSearchJobs(params)
} catch (error) {
  if (error.status === 429) {
    // Rate limited - wait and retry
    await sleep(60000)
    return theirstackSearchJobs(params)
  } else if (error.status === 404) {
    // No results - normal, return empty
    return []
  } else {
    console.error('TheirStack error:', error)
    throw error
  }
}
```

---

## Example Use Cases

### Use Case 1: Sales Training Offer
**Positioning:** Help companies train new sales reps  
**Signal:** Hiring SDRs/BDRs

**TheirStack Query:**
```typescript
const companies = await theirstackGetCompanies({
  hiring_for: ['SDR', 'BDR', 'Sales Development Rep'],
  posted_within_days: 30,
  min_openings: 2,  // At least 2 openings = need training
  company_size_min: 20,
  company_size_max: 200
})
```

**Result:** "Found 37 companies hiring 2+ SDRs in last 30 days"

### Use Case 2: DevOps Tool
**Positioning:** Help engineering teams with deployment  
**Signal:** Hiring DevOps engineers

**TheirStack Query:**
```typescript
const companies = await theirstackGetCompanies({
  hiring_for: ['DevOps Engineer', 'Platform Engineer', 'SRE'],
  posted_within_days: 60,
  min_openings: 1
})
```

### Use Case 3: Sales Enablement Service
**Positioning:** Build sales enablement programs  
**Signal:** First sales enablement hire

**TheirStack Query:**
```typescript
const companies = await theirstackGetCompanies({
  hiring_for: ['Sales Enablement', 'Sales Training', 'Sales Ops'],
  posted_within_days: 90,
  min_openings: 1
})
```

---

## When NOT to Use TheirStack

| Don't Use For | Use Instead |
|---------------|-------------|
| General company search | Parallel (broader search) |
| Company research/background | Exa (AI search) |
| Finding contacts | Parallel (people search) |
| Tech stack detection | Parallel or BuiltWith |
| Funding/financial data | Crunchbase (via Exa) |

**TheirStack is ONLY for hiring signals.**

---

## Related Files

- **Client:** `src/lib/clients/theirstack.ts`
- **Types:** `src/lib/types/company.ts` (signals field)
- **Command:** `.cursor/commands/offer-launch.md` (uses TheirStack)
- **Framework:** `context/frameworks/signal-brainstorming.md` (hiring signals section)
- **Other APIs:** Compare with `parallel-quick-reference.md`, `exa-quick-reference.md`

