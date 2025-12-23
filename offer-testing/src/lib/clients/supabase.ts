/**
 * Supabase Client
 * 
 * Database operations for the Offer Testing System.
 * Uses Supabase for Postgres database with real-time capabilities.
 * 
 * @see https://supabase.com/docs
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { 
  Offer, CreateOfferInput, UpdateOfferInput,
  Company, CreateCompanyInput, UpdateCompanyInput,
  Contact, CreateContactInput, UpdateContactInput, ContactWithCompany,
  Campaign, CreateCampaignInput,
  LinkedInDailyCount
} from '@/lib/types'

// ===========================================
// CLIENT INITIALIZATION
// ===========================================

// Get environment variables (support both new and legacy key formats)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

// New format keys (preferred)
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
const secretKey = process.env.SUPABASE_SECRET_KEY

// Legacy format keys (backwards compatibility)
const legacyAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const legacyServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Use new keys if available, fall back to legacy
const clientKey = publishableKey || legacyAnonKey
const serverKey = secretKey || legacyServiceKey

// Validate environment variables
if (!supabaseUrl) {
  console.warn('NEXT_PUBLIC_SUPABASE_URL not set in .env.local')
}
if (!clientKey) {
  console.warn(
    'Supabase API key not set. ' +
    'Set SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  )
}

// Create Supabase client (singleton) - uses publishable/anon key for client-side
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  clientKey || 'placeholder-key'
)

// Create Supabase admin client for server-side operations (uses secret/service key)
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  serverKey || clientKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// ===========================================
// OFFERS
// ===========================================

export async function createOffer(input: CreateOfferInput): Promise<Offer> {
  const { data, error } = await supabase
    .from('offers')
    .insert(input)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create offer: ${error.message}`)
  return data
}

export async function getOffer(id: string): Promise<Offer | null> {
  const { data, error } = await supabase
    .from('offers')
    .select()
    .eq('id', id)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get offer: ${error.message}`)
  }
  return data
}

export async function getOfferBySlug(slug: string): Promise<Offer | null> {
  const { data, error } = await supabase
    .from('offers')
    .select()
    .eq('slug', slug)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get offer: ${error.message}`)
  }
  return data
}

export async function listOffers(): Promise<Offer[]> {
  const { data, error } = await supabase
    .from('offers')
    .select()
    .order('created_at', { ascending: false })
  
  if (error) throw new Error(`Failed to list offers: ${error.message}`)
  return data || []
}

export async function updateOffer(id: string, input: UpdateOfferInput): Promise<Offer> {
  const { data, error } = await supabase
    .from('offers')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update offer: ${error.message}`)
  return data
}

export async function deleteOffer(id: string): Promise<void> {
  const { error } = await supabase
    .from('offers')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete offer: ${error.message}`)
}

// ===========================================
// COMPANIES
// ===========================================

export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .insert(input)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create company: ${error.message}`)
  return data
}

export async function createCompanies(inputs: CreateCompanyInput[]): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .insert(inputs)
    .select()
  
  if (error) throw new Error(`Failed to create companies: ${error.message}`)
  return data || []
}

export async function getCompany(id: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select()
    .eq('id', id)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get company: ${error.message}`)
  }
  return data
}

export async function listCompaniesForOffer(offerId: string): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select()
    .eq('offer_id', offerId)
    .order('fit_score', { ascending: false, nullsFirst: false })
  
  if (error) throw new Error(`Failed to list companies: ${error.message}`)
  return data || []
}

export async function updateCompany(id: string, input: UpdateCompanyInput): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update company: ${error.message}`)
  return data
}

// ===========================================
// CONTACTS
// ===========================================

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .insert(input)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create contact: ${error.message}`)
  return data
}

export async function createContacts(inputs: CreateContactInput[]): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .insert(inputs)
    .select()
  
  if (error) throw new Error(`Failed to create contacts: ${error.message}`)
  return data || []
}

export async function getContact(id: string): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select()
    .eq('id', id)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get contact: ${error.message}`)
  }
  return data
}

export async function listContactsForOffer(offerId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select()
    .eq('offer_id', offerId)
    .order('created_at', { ascending: false })
  
  if (error) throw new Error(`Failed to list contacts: ${error.message}`)
  return data || []
}

export async function listContactsForCompany(companyId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select()
    .eq('company_id', companyId)
  
  if (error) throw new Error(`Failed to list contacts: ${error.message}`)
  return data || []
}

export async function getContactsReadyForOutreach(offerId: string): Promise<ContactWithCompany[]> {
  const { data, error } = await supabase
    .from('contacts_ready_for_outreach')
    .select()
    .eq('offer_id', offerId)
  
  if (error) throw new Error(`Failed to get contacts ready for outreach: ${error.message}`)
  return data || []
}

export async function updateContact(id: string, input: UpdateContactInput): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update contact: ${error.message}`)
  return data
}

// ===========================================
// OUTREACH
// ===========================================

// export async function createOutreach(input: CreateOutreachInput): Promise<Outreach> {
//   const { data, error } = await supabase
//     .from('outreach')
//     .insert(input)
//     .select()
//     .single()
  
//   if (error) throw new Error(`Failed to create outreach: ${error.message}`)
//   return data
// }

// export async function getOutreach(id: string): Promise<Outreach | null> {
//   const { data, error } = await supabase
//     .from('outreach')
//     .select()
//     .eq('id', id)
//     .single()
  
//   if (error && error.code !== 'PGRST116') {
//     throw new Error(`Failed to get outreach: ${error.message}`)
//   }
//   return data
// }

// export async function listOutreachForOffer(offerId: string): Promise<Outreach[]> {
//   const { data, error } = await supabase
//     .from('outreach')
//     .select()
//     .eq('offer_id', offerId)
//     .order('created_at', { ascending: false })
  
//   if (error) throw new Error(`Failed to list outreach: ${error.message}`)
//   return data || []
// }

// export async function listPendingOutreach(offerId: string): Promise<Outreach[]> {
//   const { data, error } = await supabase
//     .from('outreach')
//     .select()
//     .eq('offer_id', offerId)
//     .eq('status', 'pending')
  
//   if (error) throw new Error(`Failed to list pending outreach: ${error.message}`)
//   return data || []
// }

// export async function updateOutreach(id: string, input: UpdateOutreachInput): Promise<Outreach> {
//   const { data, error } = await supabase
//     .from('outreach')
//     .update(input)
//     .eq('id', id)
//     .select()
//     .single()
  
//   if (error) throw new Error(`Failed to update outreach: ${error.message}`)
//   return data
// }

// ===========================================
// CAMPAIGNS
// ===========================================

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert(input)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create campaign: ${error.message}`)
  return data
}

export async function listCampaignsForOffer(offerId: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select()
    .eq('offer_id', offerId)
    .order('created_at', { ascending: false })
  
  if (error) throw new Error(`Failed to list campaigns: ${error.message}`)
  return data || []
}

// ===========================================
// LINKEDIN ACTIVITY
// ===========================================

// export async function logLinkedInActivity(input: CreateLinkedInActivityInput): Promise<LinkedInActivity> {
//   const { data, error } = await supabase
//     .from('linkedin_activity')
//     .insert(input)
//     .select()
//     .single()
  
//   if (error) throw new Error(`Failed to log LinkedIn activity: ${error.message}`)
//   return data
// }

export async function getLinkedInDailyCounts(account: string): Promise<LinkedInDailyCount[]> {
  const { data, error } = await supabase
    .from('linkedin_daily_counts')
    .select()
    .eq('account', account)
  
  if (error) throw new Error(`Failed to get LinkedIn daily counts: ${error.message}`)
  return data || []
}

// ===========================================
// STATS
// ===========================================

export async function getOfferStats(offerId: string) {
  const { data, error } = await supabase
    .from('offer_stats')
    .select()
    .eq('offer_id', offerId)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get offer stats: ${error.message}`)
  }
  return data
}

