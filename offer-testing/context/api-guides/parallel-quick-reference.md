# Parallel API - Quick Reference

**Type:** Company Search + People Search  
**Website:** https://parallel.ai/  
**Docs:** https://docs.parallel.ai/  
**Purpose:** Primary source for finding companies and contacts

---

## When to Use Parallel

| Use Case | Why Parallel |
|----------|-------------|
| **Find companies by ICP** | Search by size, industry, geography |
| **Find decision-makers** | Search for people by title at companies |
| **Enrich company data** | Get firmographics, tech stack, contacts |
| **Verify contact info** | Get emails, LinkedIn profiles |

**In your workflow:** Parallel is the MAIN tool for `/offer-launch` - finding companies and contacts.

---

## Key Capabilities

### 1. Company Search
Find companies matching firmographics (size, industry, location).

**Best for:**
- Broad ICP matching
- Finding companies by vertical
- Geographic filtering

**Example:** "B2B SaaS companies with 20-100 employees in United States"

### 2. People Search
Find decision-makers by title, department, seniority.

**Best for:**
- Finding VPs, Directors, Managers
- Department-specific contacts (Sales, Marketing, Ops)
- Multi-role targeting (decision maker + influencers)

**Example:** "VP Sales OR Sales Director at companies using Salesforce"

### 3. Company Enrichment
Get detailed data about a specific company.

**Best for:**
- Getting employee count, revenue, tech stack
- Finding company LinkedIn, website, description
- Checking if company matches ICP

### 4. Contact Enrichment
Get contact details for a specific person.

**Best for:**
- Finding email addresses
- Getting LinkedIn profiles
- Verifying contact data

---

## API Usage in Code

### Company Search
```typescript
import { parallelSearchCompanies } from '@/lib/clients/parallel'

const companies = await parallelSearchCompanies({
  size_min: 20,
  size_max: 100,
  industries: ['B2B SaaS', 'Software'],
  locations: ['United States'],
  limit: 50
})
```

### People Search
```typescript
import { parallelSearchPeople } from '@/lib/clients/parallel'

const contacts = await parallelSearchPeople({
  titles: ['VP Sales', 'Head of Sales', 'Sales Director'],
  company_ids: companyIds,
  seniority: ['vp', 'director'],
  limit: 100
})
```

### Company Enrichment
```typescript
import { parallelEnrichCompany } from '@/lib/clients/parallel'

const enriched = await parallelEnrichCompany({
  domain: 'acmecorp.com'
})
```

---

## Signal → Parallel Mapping

| Signal Type | How Parallel Helps |
|-------------|-------------------|
| **ICP Firmographics** | Direct search filters (size, industry, location) |
| **Company growth** | Employee count trends (requires multiple lookups) |
| **Tech stack** | Some tech stack data available in enrichment |
| **Department size** | Can search for "number of sales people" |

**Note:** Parallel is good for FINDING companies, but NOT for:
- Job postings (use TheirStack)
- Deep research (use Exa)
- Web scraping (use Firecrawl)

---

## Common Patterns

### Pattern 1: ICP-Based Discovery
```
Input: Positioning canvas (ICP section)
↓
1. Extract size, industry, geography from ICP
2. Call parallelSearchCompanies()
3. Get 50-100 companies
4. Save to Supabase companies table
```

### Pattern 2: Contact Discovery
```
Input: Companies from Pattern 1
↓
1. Extract buyer titles from ICP
2. Call parallelSearchPeople() for each company
3. Get 2-5 contacts per company
4. Save to Supabase contacts table
```

### Pattern 3: Enrichment Pipeline
```
Input: Company domain (e.g., from Exa or TheirStack)
↓
1. Call parallelEnrichCompany(domain)
2. Verify company matches ICP
3. If yes → find contacts
4. If no → mark as disqualified
```

---

## Rate Limits & Costs

**Rate Limits:**
- 100 requests per minute (typical)
- Check your plan for exact limits

**Costs:**
- Pay per API call (credits system)
- Company search: ~1-2 credits per search
- People search: ~1-2 credits per search
- Enrichment: ~1 credit per company

**Best practices:**
- Batch requests where possible
- Cache results in Supabase
- Don't re-enrich same company within 30 days

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Check PARALLEL_API_KEY in .env |
| `429 Too Many Requests` | Rate limit hit | Add delay between requests |
| `404 Not Found` | Company/person doesn't exist | Normal - not all companies are in DB |
| `400 Bad Request` | Invalid parameters | Check query format |

### Error Handling Pattern
```typescript
try {
  const companies = await parallelSearchCompanies(params)
} catch (error) {
  if (error.status === 429) {
    // Rate limited - wait and retry
    await sleep(60000) // 1 minute
    return parallelSearchCompanies(params)
  } else if (error.status === 404) {
    // Not found - normal, return empty
    return []
  } else {
    // Real error - log and throw
    console.error('Parallel error:', error)
    throw error
  }
}
```

---

## Integration with Other Tools

### Parallel + Exa
```
1. Exa: Find companies via AI search
   → Get company names and websites
2. Parallel: Enrich with firmographics
   → Verify ICP match
3. Parallel: Find contacts
   → Get decision-makers
```

### Parallel + TheirStack
```
1. TheirStack: Find companies with job postings
   → Get companies hiring
2. Parallel: Get company details
   → Verify size, industry
3. Parallel: Find contacts
   → Get hiring managers
```

### Parallel + Supabase
```
1. Parallel: Find companies
2. Save to companies table
3. Parallel: Find contacts
4. Save to contacts table
5. Use Supabase for deduplication and filtering
```

---

## Related Files

- **Client:** `src/lib/clients/parallel.ts`
- **Types:** `src/lib/types/company.ts`, `src/lib/types/contact.ts`
- **Command:** `.cursor/commands/offer-launch.md` (uses Parallel)
- **Other APIs:** Compare with `exa-quick-reference.md`, `theirstack-quick-reference.md`

