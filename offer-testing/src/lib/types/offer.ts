/**
 * Offer Types
 * 
 * Types for business offers being tested through outbound outreach.
 * Matches the Supabase schema in scripts/setup-db.sql
 */

// ===========================================
// OFFER
// ===========================================

export type OfferType = 'product' | 'service'

export type OfferOwnership = 'internal' | 'client'

export type OfferStatus =
  | 'draft'       // Initial state
  | 'ready'       // Ready to launch
  | 'active'      // Running outreach
  | 'paused'      // Temporarily stopped
  | 'completed'   // Campaign finished
  | 'killed'      // Abandoned

export interface Offer {
  id: string
  name: string
  slug: string | null
  
  // Classification
  type: OfferType
  ownership: OfferOwnership
  client_name: string | null
  
  // Description
  description: string
  problem_solved: string | null
  value_proposition: string | null
  price_range: string | null
  
  // Generated content (stored as JSON)
  icp: ICP | null
  email_templates: EmailSequence | null
  linkedin_templates: LinkedInTemplates | null
  
  // Status
  status: OfferStatus
  
  // Aggregate stats (denormalized for dashboard)
  total_companies: number
  total_contacts: number
  total_sent: number
  total_replies: number
  total_meetings: number
  
  created_at: string
  updated_at: string
}

// For creating a new offer
export interface CreateOfferInput {
  name: string
  slug?: string
  type: OfferType
  ownership: OfferOwnership
  client_name?: string
  description: string
  problem_solved?: string
  value_proposition?: string
  price_range?: string
}

// For updating an offer
export interface UpdateOfferInput {
  name?: string
  slug?: string
  type?: OfferType
  ownership?: OfferOwnership
  client_name?: string
  description?: string
  problem_solved?: string
  value_proposition?: string
  price_range?: string
  icp?: ICP
  email_templates?: EmailSequence
  linkedin_templates?: LinkedInTemplates
  status?: OfferStatus
}

// ===========================================
// ICP (Ideal Customer Profile)
// ===========================================

export interface ICP {
  company_profile: CompanyProfile
  buyer_profile: BuyerProfile
  search_queries: SearchQueries
  scoring_rubric?: ScoringRubric
}

export interface CompanyProfile {
  firmographics: {
    size_range: string           // e.g., "20-200"
    size_min?: number
    size_max?: number
    revenue_range?: string
    stage: string                // 'startup' | 'growth' | 'enterprise'
    geography: string[]
  }
  verticals: {
    primary: string[]
    adjacent: string[]
    excluded: string[]
  }
  signals: Array<{
    signal: string
    where_to_find: string
    why_it_matters: string
    priority: 'high' | 'medium' | 'low'
  }>
  disqualifiers: Array<{
    disqualifier: string
    reason: string
  }>
}

export interface BuyerProfile {
  titles: {
    primary: string[]            // Decision makers
    secondary: string[]          // Influencers
  }
  seniority: string[]            // ['c-level', 'vp', 'director']
  departments: string[]
  pain_points: string[]
  goals: string[]
  buying_process: {
    decision_type: 'solo' | 'committee'
    budget_range?: string
    typical_process?: string
    timeline?: string
  }
}

export interface SearchQueries {
  parallel?: {
    query: string
    type: 'company' | 'person'
    filters: Record<string, unknown>
  }
  theirstack?: {
    job_titles: string[]
    company_size?: { min?: number; max?: number }
    posted_within_days?: number
  }
  exa?: string
  linkedin?: {
    company_headcount?: string
    industry?: string
    geography?: string
    keywords?: string[]
  }
}

export interface ScoringRubric {
  '9-10': string
  '7-8': string
  '5-6': string
  '3-4': string
  '1-2': string
}

// ===========================================
// EMAIL TEMPLATES
// ===========================================

export interface EmailSequence {
  email_1: EmailTemplate  // Initial outreach (Day 0)
  email_2: EmailTemplate  // Follow-up (Day 3)
  email_3: EmailTemplate  // Break-up (Day 7)
}

export interface EmailTemplate {
  subject_lines: string[]
  body: string
  send_day: number
  notes?: string
}

// ===========================================
// LINKEDIN TEMPLATES
// ===========================================

export interface LinkedInTemplates {
  connection_request: {
    template: string
    variations?: string[]
    character_count?: number
  }
  follow_up_dm: {
    template: string
    variations?: string[]
    send_after_hours?: number
  }
  inmail?: {
    subject: string
    body: string
  }
}

// ===========================================
// PERSONALIZATION
// ===========================================

export interface PersonalizationVariables {
  first_name?: string
  last_name?: string
  company_name?: string
  title?: string
  signal?: string
  mutual_connection?: string
  recent_post?: string
  custom?: Record<string, string>
}
