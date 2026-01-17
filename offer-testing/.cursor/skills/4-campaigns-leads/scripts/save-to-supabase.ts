/**
 * Save to Supabase Script
 * 
 * Saves companies, contacts, and campaign links to Supabase.
 * Used by: 4-campaigns-leads skill
 * 
 * Location: .cursor/skills/4-campaigns-leads/scripts/save-to-supabase.ts
 * 
 * Note: This is a skill script. For application code, see src/lib/clients/supabase.ts
 * 
 * When used in Cursor, the AI will use MCP Supabase server or direct client calls
 * based on what's available.
 */

// Note: In Cursor context, use MCP Supabase server when available
// Fallback to direct import if MCP not available
// import { supabaseAdmin } from '@/lib/clients/supabase'

export interface Company {
  id?: string
  offer_id: string
  name: string
  domain?: string
  // ... other company fields
  [key: string]: unknown
}

export interface Contact {
  id?: string
  company_id?: string
  linkedin_url: string
  // ... other contact fields
  skip_reason?: string
  [key: string]: unknown
}

export interface SaveResult {
  companies: Company[]
  contacts: Contact[]
  campaignContacts: Array<{
    campaign_id: string
    contact_id: string
    company_id: string
    status: string
    skip_reason?: string
  }>
}

/**
 * Saves companies, contacts, and campaign links to Supabase.
 * 
 * @param params - Save parameters
 * @returns Saved data with IDs
 */
export async function saveToSupabase(params: {
  campaignId: string
  offerId: string
  companies: Company[]
  contacts: Contact[]
}): Promise<SaveResult> {
  const { campaignId, offerId, companies, contacts } = params

  // Insert companies
  const companiesToInsert = companies.map(c => ({
    ...c,
    offer_id: offerId
  }))

  const { data: insertedCompanies, error: companiesError } = await supabaseAdmin
    .from('companies')
    .upsert(companiesToInsert, { onConflict: 'domain' })
    .select()

  if (companiesError) {
    throw new Error(`Failed to save companies: ${companiesError.message}`)
  }

  // Insert contacts
  const contactsToInsert = contacts.map(c => ({
    ...c,
    offer_id: offerId
  }))

  const { data: insertedContacts, error: contactsError } = await supabaseAdmin
    .from('contacts')
    .upsert(contactsToInsert, { onConflict: 'linkedin_url' })
    .select()

  if (contactsError) {
    throw new Error(`Failed to save contacts: ${contactsError.message}`)
  }

  // Update campaign with results
  const readyContacts = insertedContacts.filter(c => !c.skip_reason)
  
  const { error: campaignError } = await supabaseAdmin
    .from('campaigns')
    .update({
      status: 'ready', // Change from 'draft' to 'ready'
      total_contacts: readyContacts.length,
      contacts_remaining: readyContacts.length
    })
    .eq('id', campaignId)

  if (campaignError) {
    throw new Error(`Failed to update campaign: ${campaignError.message}`)
  }

  // Link contacts to campaign
  const campaignContacts = insertedContacts.map(contact => ({
    campaign_id: campaignId,
    contact_id: contact.id!,
    company_id: contact.company_id || null,
    status: contact.skip_reason ? 'skipped' : 'queued',
    skip_reason: contact.skip_reason || null
  }))

  const { error: linksError } = await supabaseAdmin
    .from('campaign_contacts')
    .insert(campaignContacts)

  if (linksError) {
    throw new Error(`Failed to link contacts to campaign: ${linksError.message}`)
  }

  return {
    companies: insertedCompanies || [],
    contacts: insertedContacts || [],
    campaignContacts
  }
}
