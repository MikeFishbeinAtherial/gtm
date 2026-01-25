/**
 * Contact Types
 * 
 * Types for contacts (people) at companies.
 * Matches the Supabase schema in scripts/setup-db.sql
 */

// ===========================================
// CONTACT
// ===========================================

export type ConnectionDegree = 1 | 2 | 3

export type Seniority = 'c_level' | 'vp' | 'director' | 'manager' | 'individual'

export type EmailStatus = 'unknown' | 'valid' | 'invalid' | 'risky' | 'failed'

export type ContactPriority = 'high' | 'medium' | 'low'

export type ContactStatus =
  | 'new'           // Just discovered
  | 'enriched'      // Data enriched
  | 'ready'         // Ready for outreach
  | 'skip'          // Should not contact
  | 'queued'        // In campaign queue
  | 'contacted'     // Outreach sent
  | 'replied'       // Got a reply
  | 'meeting'       // Meeting booked
  | 'converted'     // Became customer
  | 'unsubscribed'  // Opted out
  | 'bounced'       // Email bounced

export interface Contact {
  id: string
  company_id: string
  offer_id: string
  
  // Name
  first_name: string | null
  last_name: string | null
  full_name: string | null
  
  // Role
  title: string | null
  title_normalized: string | null
  department: string | null
  seniority: Seniority | null
  
  // Contact info
  email: string | null
  email_status: EmailStatus | null
  email_verification_source: string | null
  email_verified: boolean | null
  phone: string | null
  
  // LinkedIn
  linkedin_url: string | null
  linkedin_id: string | null
  connection_degree: ConnectionDegree | null  // 1 = connected, 2 = 2nd degree, 3 = 3rd+
  
  // Previous contact tracking
  already_contacted: boolean
  last_contacted_at: string | null
  contact_count: number

  // Global outreach tracking (cross-offer)
  global_last_contacted_at: string | null
  global_contact_count: number
  global_last_reply_at: string | null
  global_status: 'available' | 'cooling_off' | 'do_not_contact' | 'replied'
  eligible_for_outreach: boolean
  
  // Scoring
  buyer_fit_score: number | null   // 1-10
  priority: ContactPriority | null
  
  // Source
  source_tool: string
  source_raw: Record<string, unknown> | null
  
  // Status
  status: ContactStatus
  skip_reason: string | null
  notes: string | null
  
  created_at: string
  updated_at: string
}

// Contact with company info joined
export interface ContactWithCompany extends Contact {
  company_name: string
  company_domain: string | null
  company_fit_score: number | null
  offer_name: string
}

// ===========================================
// INPUT TYPES
// ===========================================

export interface CreateContactInput {
  company_id: string
  offer_id: string
  first_name?: string
  last_name?: string
  full_name?: string
  title?: string
  title_normalized?: string
  department?: string
  seniority?: Seniority
  email?: string
  email_status?: EmailStatus
  email_verification_source?: string
  phone?: string
  linkedin_url?: string
  linkedin_id?: string
  connection_degree?: ConnectionDegree
  buyer_fit_score?: number
  priority?: ContactPriority
  source_tool: string
  source_raw?: Record<string, unknown>
}

export interface UpdateContactInput {
  first_name?: string
  last_name?: string
  full_name?: string
  title?: string
  title_normalized?: string
  department?: string
  seniority?: Seniority
  email?: string
  email_status?: EmailStatus
  email_verification_source?: string
  phone?: string
  linkedin_url?: string
  linkedin_id?: string
  connection_degree?: ConnectionDegree
  already_contacted?: boolean
  last_contacted_at?: string
  contact_count?: number
  global_last_contacted_at?: string
  global_contact_count?: number
  global_last_reply_at?: string
  global_status?: 'available' | 'cooling_off' | 'do_not_contact' | 'replied'
  eligible_for_outreach?: boolean
  buyer_fit_score?: number
  priority?: ContactPriority
  status?: ContactStatus
  skip_reason?: string
  notes?: string
}
