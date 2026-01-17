# Perplexity API - Complete Guide

## What Perplexity Does

Perplexity is an **AI-powered web search and research API**. It provides:

1. **Real-time Web Search** - Search the web with AI-powered understanding
2. **Company Research** - Get information about companies, their products, and recent news
3. **Contact Research** - Find background information about people and contacts
4. **General Research** - Answer questions with citations from current web sources

## When to Use Perplexity

### ✅ USE Perplexity For:

1. **Company Research** 🔥
   - "What does [Company Name] do?"
   - "Find recent news about [Company]"
   - "What products does [Company] offer?"
   - "Research [Company]'s market position and competitors"
   - **Why:** Gets current, accurate information from the web with citations

2. **Contact/Person Research**
   - "Find information about [Person Name] at [Company]"
   - "What is [Person]'s background and experience?"
   - "Research [Person]'s recent activity or posts"
   - **Why:** Helps personalize outreach with current information

3. **Industry and Market Research**
   - "What are the latest trends in [industry]?"
   - "Find companies in [industry] that are [doing X]"
   - "Research [topic] and find examples"
   - **Why:** AI understands context and finds relevant information

4. **Competitive Intelligence**
   - "What are [Competitor]'s main features?"
   - "Find companies similar to [Company]"
   - "Research [Competitor]'s pricing and positioning"
   - **Why:** Comprehensive research with multiple sources

5. **General Web Search**
   - Any question that requires current web information
   - Finding examples, case studies, or data points
   - Researching topics for content creation
   - **Why:** More reliable than static knowledge bases

### ❌ DON'T Use Perplexity For:

1. **Finding Email Addresses**
   - Use FullEnrich or Leadmagic for email finding
   - Perplexity searches the web, doesn't have email databases

2. **Structured Data Enrichment**
   - Use Parallel for: revenue, employee count, funding data
   - Use Sumble for: tech stack, hiring signals
   - Perplexity is for research, not structured databases

3. **Sending Messages**
   - Use Unipile for LinkedIn/email outreach
   - Perplexity is read-only research

4. **Real-time Data Queries**
   - Use specialized APIs for: stock prices, weather, live data
   - Perplexity searches web content, not real-time feeds

5. **Large-Scale Bulk Operations**
   - Perplexity is best for individual research queries
   - For bulk enrichment, use Parallel, Sumble, or FullEnrich

## Setup

### Environment Variables

Add to `.env.local`:
```bash
PERPLEXITY_API_KEY=your_api_key_here
```

Get your API key at: https://www.perplexity.ai/settings/api

### Client Import

```typescript
// Note: Client implementation would go in src/lib/clients/perplexity.ts
// For now, use direct API calls or create the client following the pattern
// from other clients like sumble.ts or unipile.ts
```

## API Usage

### Basic Search Query

Perplexity's API allows you to send natural language queries and get AI-powered responses with citations:

```typescript
// Example API call structure
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'pplx-70b-online', // or 'pplx-7b-online' for faster/cheaper
    messages: [
      {
        role: 'user',
        content: 'What does Stripe do and what are their main products?'
      }
    ]
  })
})
```

### Model Options

- **`pplx-70b-online`** - More accurate, better for complex research (slower, more expensive)
- **`pplx-7b-online`** - Faster, cheaper, good for simple queries

## Best Practices

1. **Be Specific in Queries**
   - ✅ Good: "What are the main features of Salesforce CRM?"
   - ❌ Bad: "Tell me about Salesforce"

2. **Use for Current Information**
   - Perplexity excels at finding recent information
   - Use it when you need up-to-date data

3. **Combine with Other Tools**
   - Use Perplexity for research → Parallel/Sumble for structured data
   - Research first, then enrich with specialized APIs

4. **Cost Considerations**
   - Perplexity charges per API call
   - Use for high-value research, not bulk operations
   - Cache results when possible

## Integration Points

### Typical Workflow

1. **Discovery** - Use Perplexity to research companies/people
2. **Enrichment** - Use Parallel/Sumble for structured data
3. **Personalization** - Use Perplexity research for outreach copy
4. **Outreach** - Use Unipile to send messages

### Example: Company Research Pipeline

```typescript
// 1. Research company with Perplexity
const companyInfo = await perplexity.search('What does Acme Corp do?')

// 2. Enrich with structured data from Parallel
const enrichment = await parallel.enrichCompany({ domain: 'acme.com' })

// 3. Find contacts with Exa or Parallel
const contacts = await exa.findPeople('VP Sales at Acme Corp')

// 4. Research contacts with Perplexity
const contactInfo = await perplexity.search('John Doe VP Sales Acme Corp')

// 5. Send personalized outreach with Unipile
```

## Cost & Rate Limits

- **Pricing:** Pay-per-use based on API calls
- **Rate Limits:** Check Perplexity documentation for current limits
- **Optimization:** Cache research results, batch similar queries

## Troubleshooting

### Common Issues

1. **API Key Not Found**
   - Ensure `PERPLEXITY_API_KEY` is in `.env.local`
   - Restart your dev server after adding env vars

2. **Rate Limit Errors**
   - Implement retry logic with exponential backoff
   - Cache results to avoid duplicate queries

3. **Incomplete Results**
   - Try rephrasing your query
   - Use the more powerful `pplx-70b-online` model for complex queries

## See Also

- **For structured company data:** [Parallel](../api-guides/parallel-quick-reference.md)
- **For hiring signals:** [Sumble](./sumble-tool-guide.md)
- **For email finding:** [FullEnrich](./fullenrich-tool-guide.md) or Leadmagic
- **For outreach:** [Unipile](./unipile-tool-guide.md)
