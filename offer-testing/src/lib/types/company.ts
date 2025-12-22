/**
 * Company Types
 * 
 * Types for companies discovered during offer testing.
 * Matches the Supabase schema in scripts/setup-db.sql
 */

// ===========================================
// COMPANY
// ===========================================

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+'

export type CompanyPriority = 'high' | 'medium' | 'low'

export type CompanyStatus =
  | 'new'           // Just discovered
  | 'qualified'     // Passed ICP check
  | 'disqualified'  // Failed ICP check
  | 'contacted'     // Outreach sent
  | 'responded'     // Got a reply
  | 'meeting'       // Meeting booked
  | 'converted'     // Became customer
  | 'rejected'      // Said no

export type SourceTool = 
  | 'parallel'
  | 'exa'
  | 'theirstack'
  | 'sumble'
  | 'manual'

export interface Company {
  id: string
  offer_id: string
  
  // Basic info
  name: string
  domain: string | null
  url: string | null
  description: string | null
  
  // Size
  size: CompanySize | null
  size_exact: number | null
  vertical: string | null
  industry: string | null
  
  // Location
  headquarters_city: string | null
  headquarters_state: string | null
  headquarters_country: string | null
  
  // Signals (flexible JSON)
  signals: CompanySignals
  
  // Scoring
  fit_score: number | null        // 1-10
  fit_reasoning: string | null
  priority: CompanyPriority | null
  
  // Source tracking
  source_tool: SourceTool
  source_query: string | null
  source_raw: Record<string, unknown> | null
  
  // Status
  status: CompanyStatus
  disqualification_reason: string | null
  
  created_at: string
  updated_at: string
}

// ===========================================
// COMPANY SIGNALS
// ===========================================

export interface CompanySignals {
  // Hiring signals
  hiring_sales?: boolean
  hiring_marketing?: boolean
  hiring_engineering?: boolean
  hiring_roles?: string[]
  
  // Tech signals
  tech_stack?: string[]
  using_competitor?: string
  
  // Funding signals
  recent_funding?: {
    amount?: string
    date?: string
    round?: string
  }
  
  // Growth signals
  headcount_growth?: number
  recent_news?: string[]
  
  // Custom signals
  [key: string]: unknown
}

// ===========================================
// INPUT TYPES
// ===========================================

export interface CreateCompanyInput {
  offer_id: string
  name: string
  domain?: string
  url?: string
  description?: string
  size?: CompanySize
  size_exact?: number
  vertical?: string
  industry?: string
  headquarters_city?: string
  headquarters_state?: string
  headquarters_country?: string
  signals?: CompanySignals
  fit_score?: number
  fit_reasoning?: string
  priority?: CompanyPriority
  source_tool: SourceTool
  source_query?: string
  source_raw?: Record<string, unknown>
}

export interface UpdateCompanyInput {
  name?: string
  domain?: string
  url?: string
  description?: string
  size?: CompanySize
  size_exact?: number
  vertical?: string
  industry?: string
  headquarters_city?: string
  headquarters_state?: string
  headquarters_country?: string
  signals?: CompanySignals
  fit_score?: number
  fit_reasoning?: string
  priority?: CompanyPriority
  status?: CompanyStatus
  disqualification_reason?: string
}
