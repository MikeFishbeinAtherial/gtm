# FullEnrich API - Complete Guide

## What FullEnrich Does

FullEnrich is a **contact enrichment API** that helps you find contact information at scale. It provides:

1. **Email Finding** - Work email addresses (1 credit)
2. **Phone Numbers** - Mobile phone numbers (10 credits)
3. **Personal Emails** - Personal email addresses (3 credits)
4. **Contact Profiles** - Full contact and company profiles when LinkedIn URL is provided
5. **Bulk Enrichment** - Process up to 100 contacts at once

## When to Use FullEnrich

### ✅ USE FullEnrich For:

1. **Finding Work Email Addresses** 🔥
   - "Find the email for John Doe at Acme Corp"
   - Bulk email finding for outreach campaigns
   - Enrich contacts from LinkedIn or CRM
   - **Why:** Reliable email finding with good coverage

2. **Contact Enrichment**
   - Get mobile phone numbers for contacts
   - Find personal email addresses
   - Enrich contact profiles with job title, location, etc.
   - **Why:** Comprehensive contact data from 20+ providers

3. **Bulk Operations**
   - Enrich 100 contacts at once
   - Process large contact lists efficiently
   - **Why:** Designed for scale with async processing

4. **LinkedIn-Based Enrichment**
   - Provide LinkedIn URL for better results
   - Get full contact and company profiles
   - **Why:** LinkedIn URL improves enrichment rates by 5-20% for emails, 10-60% for phones

### ❌ DON'T Use FullEnrich For:

1. **Company Research**
   - Use Parallel, Sumble, or Perplexity for company data
   - FullEnrich focuses on contact information

2. **Finding Contacts (Discovery)**
   - Use Exa or Parallel to find people first
   - FullEnrich enriches contacts you already have

3. **Real-time Synchronous Lookups**
   - FullEnrich is asynchronous (30-90 seconds)
   - Use Leadmagic for instant email verification if needed

4. **General Web Search**
   - Use Perplexity or Exa for research
   - FullEnrich is for contact data only

## Setup

### Environment Variables

Add to `.env.local`:
```bash
FULLENRICH_API_KEY=your_api_key_here
```

Get your API key at: https://app.fullenrich.com/

### API Endpoint

Base URL: `https://app.fullenrich.com/api/v1`

### Client Import

```typescript
// Note: Client implementation would go in src/lib/clients/fullenrich.ts
// For now, use direct API calls or create the client following the pattern
// from other clients like sumble.ts or unipile.ts
```

## How FullEnrich Works

### Asynchronous Model

**Important:** FullEnrich is **asynchronous by design**. You send enrichment requests and receive results via webhooks when they're ready. Most enrichments take 30-90 seconds.

### Two Ways to Get Results

#### 1. Webhooks (Recommended - Fastest Method) ✅

Webhooks are notifications sent directly to your server when results are ready. This is the **recommended** and fastest way to get enrichment results.

**Why use webhooks:**
- Fastest delivery method
- No need to poll or keep connections open
- Automatic retry (5 attempts if delivery fails)
- Reliable by design

**How to implement:**
1. Provide a `webhook_url` when creating enrichment
2. FullEnrich POSTs results to your URL when ready
3. Use `custom` parameter to track which enrichment belongs to which request

**Example webhook payload:**
```json
{
  "enrichment_id": "2db5ea61-1752-42cf-8ea1-ab1da060cd0a",
  "status": "completed",
  "results": [...],
  "custom": {
    "user_id": "12584"
  }
}
```

#### 2. Polling (Not Recommended) ❌

Polling means repeatedly checking an endpoint to see if enrichment is finished.

**Why NOT to use polling:**
- Consumes rate limit quota without benefit
- Slower than webhooks
- More complex to implement

**If you must poll:**
- Don't poll more than once every 5-10 minutes
- Never poll every few seconds

## API Methods

### 1. Start Bulk Enrichment

**Endpoint:** `POST /contact/enrich/bulk`

**Use this to:** Find contact information for multiple contacts at once (up to 100)

**Input Requirements:**
You must provide **either**:
- `firstname` + `lastname` & `company` (domain or company_name)
- `linkedin_url`

**Best Results:** Provide as much information as possible. Including a LinkedIn URL improves enrichment rates:
- +5-20% for emails
- +10-60% for mobile phone numbers

**Credit Costs:**
- Work email: 1 credit
- Mobile phone: 10 credits
- Personal email: 3 credits

**Example Request:**
```typescript
const response = await fetch('https://app.fullenrich.com/api/v1/contact/enrich/bulk', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.FULLENRICH_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Sales Outreach Campaign - Jan 2025',
    datas: [
      {
        firstname: 'John',
        lastname: 'Doe',
        domain: 'acme.com',
        company_name: 'Acme Corp',
        linkedin_url: 'https://www.linkedin.com/in/johndoe', // Optional but recommended
        enrich_fields: ['contact.emails'], // What to find
        custom: {
          contact_id: '12345', // Your internal ID
          campaign_id: 'campaign_001'
        }
      }
    ],
    webhook_url: 'https://your-app.com/webhooks/fullenrich' // Recommended
  })
})

const { enrichment_id } = await response.json()
```

**Response:**
```json
{
  "enrichment_id": "2db5ea61-1752-42cf-8ea1-ab1da060cd0a"
}
```

### 2. Get Enrichment Result

**Endpoint:** `GET /bulk/{enrichment_id}`

**Use this to:** Check enrichment status (if not using webhooks)

**Note:** This is for checking status, not recommended for regular use. Use webhooks instead.

### 3. Credits Left

**Endpoint:** `GET /credits`

**Use this to:** Check your remaining API credits

### 4. Reverse Contact Lookup

**Endpoint:** `POST /contact/reverse`

**Use this to:** Find contact information when you only have an email address

## Best Practices

### 1. Always Use Webhooks

Webhooks are faster, more reliable, and don't consume rate limits. Set up a webhook endpoint in your application.

### 2. Provide LinkedIn URLs

Including LinkedIn URLs significantly improves enrichment rates:
- Emails: +5-20% better
- Mobile phones: +10-60% better
- Also returns full contact and company profiles

### 3. Use Custom Parameters

Use the `custom` field to track enrichments:
```typescript
custom: {
  contact_id: '12345',
  campaign_id: 'campaign_001',
  user_id: 'user_789'
}
```

This helps you match webhook results to your internal data.

### 4. Name Your Enrichments

Use readable names for enrichments:
- ✅ Good: "John Doe - Acme Corp"
- ✅ Good: "Sales Outreach Campaign - Jan 2025"
- ❌ Bad: "enrichment_001"

This makes it easier to search through enrichments in your dashboard.

### 5. Batch Similar Requests

You can enrich up to 100 contacts in one request. Batch similar contacts together for efficiency.

### 6. Handle Webhook Failures

FullEnrich automatically retries webhook delivery 5 times if your server returns a non-2xx status code. Still, implement proper error handling in your webhook endpoint.

## Integration Points

### Typical Workflow

1. **Discovery** - Use Exa or Parallel to find contacts
2. **Enrichment** - Use FullEnrich to get email addresses
3. **Verification** - Optionally verify emails with Leadmagic
4. **Research** - Use Perplexity to research contacts/companies
5. **Outreach** - Use Unipile to send emails

### Example: Complete Contact Enrichment Pipeline

```typescript
// 1. Find contacts with Exa or Parallel
const contacts = await exa.findPeople('VP Sales at SaaS companies')

// 2. Enrich with FullEnrich
const enrichment = await fullenrich.enrichBulk({
  name: 'VP Sales Enrichment',
  contacts: contacts.map(c => ({
    firstname: c.firstName,
    lastname: c.lastName,
    domain: c.companyDomain,
    linkedin_url: c.linkedinUrl,
    enrich_fields: ['contact.emails']
  })),
  webhook_url: 'https://your-app.com/webhooks/fullenrich'
})

// 3. Receive results via webhook
// 4. Research contacts with Perplexity
// 5. Send outreach with Unipile
```

## Cost & Rate Limits

- **Work Email:** 1 credit per contact
- **Mobile Phone:** 10 credits per contact
- **Personal Email:** 3 credits per contact
- **Rate Limits:** Check FullEnrich documentation for current limits
- **Queue Retention:** No limit on queued contacts, jobs don't expire

## Queue Retention

- No limit on number of queued contacts
- Jobs don't expire or timeout
- If a provider is down, system automatically skips to next provider
- Very high uptime: https://status.fullenrich.com/

## Troubleshooting

### Common Issues

1. **API Key Not Found**
   - Ensure `FULLENRICH_API_KEY` is in `.env.local`
   - Restart your dev server after adding env vars

2. **Webhook Not Receiving Results**
   - Check that your webhook URL is publicly accessible
   - Ensure your server returns 2xx status codes
   - Check FullEnrich dashboard for delivery logs

3. **Missing Required Fields**
   - Must provide: `firstname` + `lastname` & `company` OR `linkedin_url`
   - Check that all required fields are included

4. **Low Enrichment Rates**
   - Include LinkedIn URLs for better results
   - Provide as much information as possible
   - Check that company domain/name is correct

## See Also

- **For finding contacts:** [Exa](../api-guides/exa-usage-guide.md) or [Parallel](../api-guides/parallel-quick-reference.md)
- **For email verification:** Leadmagic
- **For company research:** [Perplexity](./perplexity-tool-guide.md) or [Parallel](../api-guides/parallel-quick-reference.md)
- **For outreach:** [Unipile](./unipile-tool-guide.md)
