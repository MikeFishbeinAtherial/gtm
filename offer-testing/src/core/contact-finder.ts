/**
 * Contact Finder
 * 
 * Find decision-makers at companies based on ICP buyer profile.
 * Uses Parallel for people search and Leadmagic for email enrichment.
 */

import { parallel } from '@/lib/clients/parallel'
import { leadmagic } from '@/lib/clients/leadmagic'
import { 
  createContacts, 
  getOffer, 
  listCompaniesForOffer,
  updateContact 
} from '@/lib/clients/supabase'
import type { 
  Contact, 
  CreateContactInput, 
  ICP, 
  Company,
  ContactSeniority 
} from '@/lib/types'

// ===========================================
// TYPES
// ===========================================

export interface FindContactsInput {
  offer_id: string
  company_ids?: string[]      // Specific companies, or all if not provided
  max_per_company?: number    // Max contacts per company (default: 3)
  enrich_emails?: boolean     // Whether to enrich with Leadmagic
}

export interface FindContactsResult {
  contacts: Contact[]
  total_found: number
  companies_processed: number
  emails_found: number
}

// ===========================================
// MAIN FUNCTION
// ===========================================

/**
 * Find contacts at companies matching the offer's ICP buyer profile.
 * 
 * @param input - Search parameters
 * @returns Found contacts
 */
export async function findContacts(input: FindContactsInput): Promise<FindContactsResult> {
  const { 
    offer_id, 
    company_ids, 
    max_per_company = 3,
    enrich_emails = true 
  } = input

  // Get offer and ICP
  const offer = await getOffer(offer_id)
  if (!offer) {
    throw new Error(`Offer not found: ${offer_id}`)
  }
  if (!offer.icp) {
    throw new Error('ICP is required to find contacts. Run /offer-icp first.')
  }

  const icp = offer.icp as ICP

  // Get companies to search
  let companies: Company[]
  if (company_ids?.length) {
    const allCompanies = await listCompaniesForOffer(offer_id)
    companies = allCompanies.filter(c => company_ids.includes(c.id))
  } else {
    companies = await listCompaniesForOffer(offer_id)
  }

  if (companies.length === 0) {
    throw new Error('No companies found. Run /offer-launch to find companies first.')
  }

  // Get target titles from ICP
  const targetTitles = [
    ...(icp.buyer_profile?.titles?.primary || []),
    ...(icp.buyer_profile?.titles?.secondary || []),
  ]

  if (targetTitles.length === 0) {
    throw new Error('No target titles defined in ICP')
  }

  // Find contacts at each company
  const allContactInputs: CreateContactInput[] = []
  let emailsFound = 0

  for (const company of companies) {
    try {
      const contacts = await findContactsAtCompany(
        company,
        offer_id,
        targetTitles,
        icp.buyer_profile?.seniority || [],
        max_per_company
      )
      allContactInputs.push(...contacts)
    } catch (error) {
      console.error(`Error finding contacts at ${company.name}:`, error)
    }
  }

  // Enrich with emails if requested
  if (enrich_emails && allContactInputs.length > 0) {
    const enriched = await enrichContactsWithEmails(allContactInputs)
    emailsFound = enriched.filter(c => c.email).length
    allContactInputs.splice(0, allContactInputs.length, ...enriched)
  }

  // Save to database
  const saved = await createContacts(allContactInputs)

  return {
    contacts: saved,
    total_found: allContactInputs.length,
    companies_processed: companies.length,
    emails_found: emailsFound,
  }
}

// ===========================================
// COMPANY CONTACT SEARCH
// ===========================================

async function findContactsAtCompany(
  company: Company,
  offerId: string,
  titles: string[],
  seniorities: string[],
  maxContacts: number
): Promise<CreateContactInput[]> {
  // Search for people at this company
  const response = await parallel.searchPeople({
    company_domain: company.domain || undefined,
    titles,
    seniority: seniorities.length > 0 ? seniorities : undefined,
    limit: maxContacts * 2, // Get extra to filter
  })

  // Filter and prioritize
  const prioritized = prioritizeContacts(response.results, titles, seniorities)
  const topContacts = prioritized.slice(0, maxContacts)

  // Map to our format
  return topContacts.map(person => ({
    company_id: company.id,
    offer_id: offerId,
    first_name: person.first_name,
    last_name: person.last_name,
    title: person.title,
    seniority: mapSeniority(person.title),
    email: person.email || undefined,
    email_verified: person.email_verified || false,
    email_source: person.email ? 'parallel' : undefined,
    linkedin_url: person.linkedin_url,
    source: 'parallel',
    raw_data: person.raw,
  }))
}

// ===========================================
// EMAIL ENRICHMENT
// ===========================================

async function enrichContactsWithEmails(
  contacts: CreateContactInput[]
): Promise<CreateContactInput[]> {
  // Filter contacts that need email enrichment
  const needsEmail = contacts.filter(c => 
    !c.email && c.first_name && c.last_name
  )

  if (needsEmail.length === 0) {
    return contacts
  }

  // Prepare enrichment requests
  const enrichRequests = needsEmail.map(c => ({
    contact: c,
    request: {
      first_name: c.first_name!,
      last_name: c.last_name!,
      domain: extractDomainFromCompany(c),
    },
  }))

  // Enrich in batches
  const enriched = await leadmagic.bulkFindEmails(
    enrichRequests.map(r => r.request)
  )

  // Merge results back
  enriched.forEach((result, index) => {
    const { contact } = enrichRequests[index]
    if (result.emails?.length > 0) {
      const bestEmail = result.emails.find(e => e.verified) || result.emails[0]
      contact.email = bestEmail.email
      contact.email_verified = bestEmail.verified
      contact.email_source = 'leadmagic'
    }
  })

  return contacts
}

// ===========================================
// HELPERS
// ===========================================

/**
 * Prioritize contacts based on title match and seniority.
 */
function prioritizeContacts(
  contacts: Array<{
    first_name: string
    last_name: string
    title: string
    linkedin_url?: string
    email?: string
    email_verified?: boolean
    raw: Record<string, unknown>
  }>,
  targetTitles: string[],
  targetSeniorities: string[]
): typeof contacts {
  return contacts.sort((a, b) => {
    // Score based on title match
    const aScore = scoreTitle(a.title, targetTitles, targetSeniorities)
    const bScore = scoreTitle(b.title, targetTitles, targetSeniorities)
    return bScore - aScore
  })
}

function scoreTitle(
  title: string,
  targetTitles: string[],
  targetSeniorities: string[]
): number {
  let score = 0
  const lowerTitle = title.toLowerCase()

  // Exact title match
  if (targetTitles.some(t => lowerTitle.includes(t.toLowerCase()))) {
    score += 10
  }

  // Seniority match
  const seniority = mapSeniority(title)
  if (seniority && targetSeniorities.includes(seniority)) {
    score += 5
  }

  // Bonus for decision-maker indicators
  if (/\b(vp|vice president|director|head|chief|cxo)\b/i.test(title)) {
    score += 3
  }

  return score
}

function mapSeniority(title: string): ContactSeniority | undefined {
  const lower = title.toLowerCase()
  
  if (/\b(ceo|cto|cfo|coo|cro|cmo|chief|founder|co-founder)\b/.test(lower)) {
    return 'c-level'
  }
  if (/\b(vp|vice president)\b/.test(lower)) {
    return 'vp'
  }
  if (/\b(director)\b/.test(lower)) {
    return 'director'
  }
  if (/\b(manager|lead|head)\b/.test(lower)) {
    return 'manager'
  }
  return 'ic'
}

function extractDomainFromCompany(contact: CreateContactInput): string {
  // This would need the company domain - for now return empty
  // In practice, you'd join with company data
  return ''
}

// ===========================================
// STATUS CHECK
// ===========================================

/**
 * Update contact's connection status from Unipile.
 * This should be called separately after contacts are found.
 */
export async function updateContactStatus(
  contactId: string,
  status: {
    connection_degree?: number | null
    already_contacted?: boolean
    do_not_contact?: boolean
    do_not_contact_reason?: string
  }
): Promise<Contact> {
  return updateContact(contactId, status)
}

