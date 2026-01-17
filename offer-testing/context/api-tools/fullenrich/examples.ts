/**
 * FullEnrich API Examples
 * 
 * Real-world examples of using FullEnrich for contact enrichment.
 */

// ===========================================
// EXAMPLE 1: Enrich Single Contact
// ===========================================

export async function enrichSingleContact(
  firstName: string,
  lastName: string,
  companyDomain: string,
  linkedinUrl?: string
) {
  const response = await fetch('https://app.fullenrich.com/api/v1/contact/enrich/bulk', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.FULLENRICH_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `${firstName} ${lastName} - ${companyDomain}`,
      datas: [
        {
          firstname: firstName,
          lastname: lastName,
          domain: companyDomain,
          linkedin_url: linkedinUrl, // Optional but recommended
          enrich_fields: ['contact.emails'], // Work email (1 credit)
          custom: {
            contact_id: `${firstName}_${lastName}_${companyDomain}`
          }
        }
      ],
      webhook_url: process.env.FULLENRICH_WEBHOOK_URL // Your webhook endpoint
    })
  })

  const data = await response.json()
  return {
    enrichment_id: data.enrichment_id,
    contact: `${firstName} ${lastName}`,
    company: companyDomain,
    // Results will come via webhook
    // Check status with: GET /bulk/{enrichment_id}
  }
}

// ===========================================
// EXAMPLE 2: Bulk Enrichment (Multiple Contacts)
// ===========================================

interface ContactToEnrich {
  firstName: string
  lastName: string
  companyDomain: string
  companyName?: string
  linkedinUrl?: string
  contactId?: string
}

export async function enrichBulkContacts(
  contacts: ContactToEnrich[],
  enrichmentName: string
) {
  // FullEnrich allows up to 100 contacts per request
  if (contacts.length > 100) {
    throw new Error('Maximum 100 contacts per enrichment request')
  }

  const response = await fetch('https://app.fullenrich.com/api/v1/contact/enrich/bulk', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.FULLENRICH_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: enrichmentName,
      datas: contacts.map(contact => ({
        firstname: contact.firstName,
        lastname: contact.lastName,
        domain: contact.companyDomain,
        company_name: contact.companyName,
        linkedin_url: contact.linkedinUrl, // Recommended for better results
        enrich_fields: ['contact.emails'], // Work email (1 credit each)
        custom: {
          contact_id: contact.contactId || `${contact.firstName}_${contact.lastName}`,
          campaign: enrichmentName
        }
      })),
      webhook_url: process.env.FULLENRICH_WEBHOOK_URL
    })
  })

  const data = await response.json()
  return {
    enrichment_id: data.enrichment_id,
    contact_count: contacts.length,
    // Results will come via webhook
  }
}

// ===========================================
// EXAMPLE 3: Enrich with Multiple Fields
// ===========================================

export async function enrichContactComprehensive(
  firstName: string,
  lastName: string,
  companyDomain: string,
  linkedinUrl: string
) {
  const response = await fetch('https://app.fullenrich.com/api/v1/contact/enrich/bulk', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.FULLENRICH_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `${firstName} ${lastName} - Comprehensive`,
      datas: [
        {
          firstname: firstName,
          lastname: lastName,
          domain: companyDomain,
          linkedin_url: linkedinUrl, // Required for best results
          enrich_fields: [
            'contact.emails',        // Work email (1 credit)
            'contact.mobile_phone',  // Mobile phone (10 credits)
            'contact.personal_email'  // Personal email (3 credits)
          ],
          custom: {
            contact_id: `${firstName}_${lastName}`,
            enrichment_type: 'comprehensive'
          }
        }
      ],
      webhook_url: process.env.FULLENRICH_WEBHOOK_URL
    })
  })

  const data = await response.json()
  return {
    enrichment_id: data.enrichment_id,
    // Total cost: 1 + 10 + 3 = 14 credits per contact
    // Results will come via webhook
  }
}

// ===========================================
// EXAMPLE 4: Check Enrichment Status
// ===========================================

export async function checkEnrichmentStatus(enrichmentId: string) {
  const response = await fetch(
    `https://app.fullenrich.com/api/v1/bulk/${enrichmentId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.FULLENRICH_API_KEY}`
      }
    }
  )

  const data = await response.json()
  return {
    enrichment_id: enrichmentId,
    status: data.status, // 'pending', 'processing', 'completed', 'failed'
    results: data.results,
    // Note: Use webhooks instead of polling when possible
  }
}

// ===========================================
// EXAMPLE 5: Check Credits
// ===========================================

export async function checkCredits() {
  const response = await fetch('https://app.fullenrich.com/api/v1/credits', {
    headers: {
      'Authorization': `Bearer ${process.env.FULLENRICH_API_KEY}`
    }
  })

  const data = await response.json()
  return {
    credits_left: data.credits_left,
    // Use this to check if you have enough credits before starting enrichment
  }
}

// ===========================================
// EXAMPLE 6: Enrich from LinkedIn Connections
// ===========================================

interface LinkedInConnection {
  firstName: string
  lastName: string
  company?: string
  companyDomain?: string
  linkedinUrl: string
  connectionId: string
}

export async function enrichLinkedInConnections(
  connections: LinkedInConnection[],
  campaignName: string
) {
  // Filter to contacts with company info
  const enrichable = connections.filter(c => 
    c.companyDomain || c.company
  )

  // Split into batches of 100 (FullEnrich limit)
  const batches = []
  for (let i = 0; i < enrichable.length; i += 100) {
    batches.push(enrichable.slice(i, i + 100))
  }

  const enrichmentIds = []

  for (const batch of batches) {
    const response = await fetch('https://app.fullenrich.com/api/v1/contact/enrich/bulk', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FULLENRICH_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `${campaignName} - Batch ${enrichmentIds.length + 1}`,
        datas: batch.map(conn => ({
          firstname: conn.firstName,
          lastname: conn.lastName,
          domain: conn.companyDomain,
          company_name: conn.company,
          linkedin_url: conn.linkedinUrl, // LinkedIn URL improves results significantly
          enrich_fields: ['contact.emails'],
          custom: {
            connection_id: conn.connectionId,
            campaign: campaignName
          }
        })),
        webhook_url: process.env.FULLENRICH_WEBHOOK_URL
      })
    })

    const data = await response.json()
    enrichmentIds.push(data.enrichment_id)

    // Small delay between batches to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return {
    total_contacts: enrichable.length,
    batches: batches.length,
    enrichment_ids: enrichmentIds,
    // Results will come via webhooks
  }
}

// ===========================================
// EXAMPLE 7: Webhook Handler (Express/Next.js)
// ===========================================

/**
 * Example webhook handler for receiving FullEnrich results
 * 
 * This would be implemented in your API route (e.g., Next.js API route)
 */
export async function handleFullEnrichWebhook(request: Request) {
  const payload = await request.json()

  // FullEnrich sends results when enrichment is complete
  const {
    enrichment_id,
    status,
    results,
    custom
  } = payload

  // Use custom data to match results to your internal records
  const contactId = custom?.contact_id
  const campaignId = custom?.campaign_id

  // Process each result
  for (const result of results) {
    const email = result.emails?.[0]?.email
    const phone = result.mobile_phone
    const personalEmail = result.personal_email

    // Update your database with enriched data
    // await updateContact(contactId, { email, phone, personalEmail })

    console.log(`Enriched ${contactId}:`, {
      email,
      phone,
      personalEmail
    })
  }

  // Always return 2xx status to acknowledge receipt
  // FullEnrich will retry if you return non-2xx
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
