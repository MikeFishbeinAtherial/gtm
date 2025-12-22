# Exa Quick Reference

## Common Use Cases

### Find Companies
```typescript
const companies = await exaFindCompanies({
  industry: 'B2B SaaS',
  size: '50-200 employees',
  geography: 'United States',
  signals: ['hiring salespeople'],
  limit: 50
})
```

### Find People
```typescript
const people = await exaSearchPeople({
  query: 'CMO at B2B SaaS company',
  num_results: 20
})
```

### Find Contacts at Company
```typescript
const contacts = await exaFindContacts({
  company: 'Acme Corp',
  titles: ['VP Sales', 'CRO', 'Head of Sales'],
  limit: 10
})
```

### Research Company
```typescript
const research = await exaResearchCompany('Acme Corp', {
  include_news: true,
  days_back: 90,
  get_summary: true
})
```

### Industry Research
```typescript
const insights = await exaIndustryResearch(
  'cosmetics manufacturing',
  'compliance challenges',
  { days_back: 365, limit: 20 }
)
```

### Search with Content (Efficient)
```typescript
const results = await exaSearchAndContents({
  query: 'AI trends 2024',
  num_results: 10,
  summary: true,
  highlights: true
})
```

## Criteria vs Enrichments

**Criteria** = Filters (must match)
- Use for deal-breakers
- Included in base cost
- Binary (yes/no)

**Enrichments** = Data extraction
- Use for nice-to-haves
- Additional cost per result
- Doesn't affect filtering

**Example:**
- Criteria: "VP Sales at B2B SaaS company" (must match)
- Enrichment: Email, LinkedIn URL (extract from matches)

## Best Practices

✅ **Do:**
- Use natural language queries
- Start broad, filter manually
- Use `use_autoprompt: true`
- Use `searchAndContents()` for efficiency
- Filter by category when relevant

❌ **Don't:**
- Over-constrain with too many criteria
- Keyword stuff queries
- Extract full text when summary works
- Make optional preferences into criteria

## Example Queries

**Companies:**
- "B2B SaaS companies with 50-200 employees that recently raised Series A"
- "Marketing agencies in the US with less than 30 employees"
- "Startups that raised a series B in 2024 and have a head of people"

**People:**
- "Heads of Sales at companies with less than 500 employees, based in Europe"
- "Engineering managers at Fortune 500 companies in traditional industries"
- "CMOs at B2B SaaS companies with strong product-led growth"

**Research:**
- "[Company name] news announcements funding hiring product launches"
- "[Industry] trends challenges risks 2024"
- "Companies similar to [example company]"

## When to Use Exa

✅ **Use Exa for:**
- Finding companies by qualitative criteria
- Finding people by role and context
- Company research and news
- Industry insights
- Competitive intelligence

❌ **Use other tools for:**
- Employee counts, revenue → Parallel, Sumble
- Email addresses → Leadmagic
- Job postings → TheirStack
- LinkedIn messaging → Unipile

## Cost Optimization

1. Use `searchAndContents()` (one call vs two)
2. Extract only summaries, skip full text
3. Search once, filter manually
4. Use category filters to reduce noise
5. Cache results, don't re-search

---

**Full Guide:** See `context/api-guides/exa-usage-guide.md`

