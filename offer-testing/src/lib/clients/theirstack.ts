/**
 * TheirStack API Client
 * 
 * Job posting signals - find companies that are hiring for specific roles.
 * 
 * @see https://api.theirstack.com/
 */

// ===========================================
// TYPES - Based on TheirStack API v1
// ===========================================

/**
 * Employment status types
 */
export type EmploymentStatus = 'full_time' | 'part_time' | 'temporary' | 'internship' | 'contract'

/**
 * Job seniority levels
 */
export type JobSeniority = 'c_level' | 'staff' | 'senior' | 'junior' | 'mid_level'

/**
 * Hiring team member from job posting
 */
export interface HiringTeamMember {
  first_name: string
  full_name: string
  image_url?: string
  linkedin_url?: string
  role?: string
  thumbnail_url?: string
}

/**
 * Job location information
 */
export interface JobLocation {
  admin1_code?: string
  admin1_name?: string
  admin2_code?: string
  admin2_name?: string
  continent?: string
  country_code?: string
  country_name?: string
  display_name?: string
  feature_code?: string
  id?: number
  latitude?: number
  longitude?: number
  name?: string
  state?: string
  state_code?: string
  type?: string
}

/**
 * Company information from TheirStack
 */
export interface TheirStackCompanyObject {
  id: string
  name: string
  domain?: string
  industry?: string
  country?: string
  country_code?: string
  employee_count?: number
  logo?: string
  num_jobs?: number
  num_technologies?: number
  possible_domains?: string[]
  url?: string
  industry_id?: number
  linkedin_url?: string
  num_jobs_last_30_days?: number
  num_jobs_found?: number
  yc_batch?: string
  apollo_id?: string
  linkedin_id?: string
  url_source?: string
  is_recruiting_agency?: boolean
  founded_year?: number
  annual_revenue_usd?: number
  annual_revenue_usd_readable?: string
  total_funding_usd?: number
  last_funding_round_date?: string
  last_funding_round_amount_readable?: string
  employee_count_range?: string
  long_description?: string
  seo_description?: string
  city?: string
  postal_code?: string
  company_keywords?: string[]
  alexa_ranking?: number
  publicly_traded_symbol?: string
  publicly_traded_exchange?: string
  investors?: string[]
  funding_stage?: string
  has_blurred_data?: boolean
  technology_slugs?: string[]
}

/**
 * Individual job from TheirStack
 */
export interface TheirStackJob {
  id: number
  job_title: string
  url?: string
  date_posted?: string
  has_blurred_data: boolean
  final_url?: string
  source_url?: string
  remote?: boolean
  hybrid?: boolean
  salary_string?: string
  min_annual_salary?: number
  min_annual_salary_usd?: number
  max_annual_salary?: number
  max_annual_salary_usd?: number
  avg_annual_salary_usd?: number
  salary_currency?: string
  seniority?: JobSeniority
  discovered_at?: string
  company_domain?: string
  hiring_team?: HiringTeamMember[]
  reposted?: boolean
  date_reposted?: string
  employment_statuses?: EmploymentStatus[]
  easy_apply?: boolean
  technology_slugs?: string[]
  description?: string
  company_object?: TheirStackCompanyObject
  locations?: JobLocation[]
  normalized_title?: string
  manager_roles?: string[]
  matching_phrases?: string[]
  matching_words?: string[]
}

/**
 * Metadata from job search response
 */
export interface TheirStackMetadata {
  total_results?: number
  truncated_results?: number
  truncated_companies?: number
  total_companies?: number
}

/**
 * Response from job search endpoint
 */
export interface TheirStackJobSearchResponse {
  metadata: TheirStackMetadata
  data: TheirStackJob[]
}

/**
 * Parameters for job search
 */
export interface TheirStackSearchParams {
  // Pagination
  page?: number
  limit?: number
  offset?: number
  
  // Job title filters
  job_title_or?: string[]
  job_title_not?: string[]
  job_title_pattern_and?: string[]
  job_title_pattern_or?: string[]
  job_title_pattern_not?: string[]
  
  // Location filters
  job_country_code_or?: string[]
  job_country_code_not?: string[]
  job_location_pattern_or?: string[]
  job_location_pattern_not?: string[]
  
  // Date filters (at least one required)
  posted_at_max_age_days?: number
  posted_at_gte?: string  // ISO date: yyyy-mm-dd
  posted_at_lte?: string  // ISO date: yyyy-mm-dd
  discovered_at_max_age_days?: number
  discovered_at_min_age_days?: number
  discovered_at_gte?: string  // ISO datetime or date
  discovered_at_lte?: string  // ISO datetime or date
  
  // Job description filters
  job_description_pattern_or?: string[]
  job_description_pattern_not?: string[]
  job_description_contains_or?: string[]
  job_description_contains_not?: string[]
  job_description_pattern_case_sensitive_or?: string[]
  
  // Job attributes
  remote?: boolean
  easy_apply?: boolean
  employment_statuses_or?: EmploymentStatus[]
  job_seniority_or?: JobSeniority[]
  
  // Salary filters
  min_salary_usd?: number
  max_salary_usd?: number
  
  // Technology filters
  job_technology_slug_or?: string[]
  job_technology_slug_not?: string[]
  job_technology_slug_and?: string[]
  
  // Job ID filters
  job_id_or?: number[]
  job_id_not?: number[]
  
  // Company filters (at least one required if no date filter)
  company_name_or?: string[]
  company_name_case_insensitive_or?: string[]
  company_name_not?: string[]
  company_name_partial_match_or?: string[]
  company_name_partial_match_not?: string[]
  company_id_or?: string[]
  company_domain_or?: string[]
  company_domain_not?: string[]
  company_linkedin_url_or?: string[]
  
  // Company attributes
  company_description_pattern_or?: string[]
  company_description_pattern_not?: string[]
  company_description_pattern_accent_insensitive?: boolean
  min_revenue_usd?: number
  max_revenue_usd?: number
  min_employee_count?: number
  max_employee_count?: number
  min_employee_count_or_null?: number
  max_employee_count_or_null?: number
  min_funding_usd?: number
  max_funding_usd?: number
  funding_stage_or?: string[]
  industry_id_or?: number[]
  industry_id_not?: number[]
  company_tags_or?: string[]
  company_type?: 'recruiting_agency' | 'direct_employer' | 'all'
  company_investors_or?: string[]
  company_investors_partial_match_or?: string[]
  company_technology_slug_or?: string[]
  company_technology_slug_and?: string[]
  company_technology_slug_not?: string[]
  only_yc_companies?: boolean
  company_location_pattern_or?: string[]
  company_country_code_or?: string[]
  company_country_code_not?: string[]
  company_list_id_or?: string[]
  company_list_id_not?: string[]
  last_funding_round_date_lte?: string
  last_funding_round_date_gte?: string
  
  // URL filters
  url_domain_or?: string[]
  url_domain_not?: string[]
  
  // Property existence checks
  property_exists_or?: string[]
  property_exists_and?: string[]
  
  // Preview mode (doesn't consume credits but blurs data)
  blur_company_data?: boolean
  
  // Performance
  include_total_results?: boolean
}

// ===========================================
// CLIENT
// ===========================================

export class TheirStackClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.THEIRSTACK_API_KEY || ''
    this.baseUrl = 'https://api.theirstack.com'
    
    if (!this.apiKey) {
      console.warn('TheirStack API key not set. Set THEIRSTACK_API_KEY in .env.local')
    }
  }

  /**
   * Make an authenticated request to the TheirStack API.
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`TheirStack API error (${response.status}): ${error}`)
    }

    return response.json()
  }

  /**
   * Search for jobs using the TheirStack API.
   * 
   * Note: You MUST include at least one of these filters:
   * - posted_at_max_age_days
   * - posted_at_gte
   * - posted_at_lte
   * - company_domain_or
   * - company_linkedin_url_or
   * - company_name_or
   * 
   * @param params - Search parameters
   * @returns Job search response with jobs and metadata
   * 
   * @example
   * // Find sales jobs posted in the last 7 days in the US
   * const jobs = await client.searchJobs({
   *   job_title_pattern_or: ['sales', 'SDR', 'BDR'],
   *   job_country_code_or: ['US'],
   *   posted_at_max_age_days: 7,
   *   limit: 25
   * })
   */
  async searchJobs(params: TheirStackSearchParams): Promise<TheirStackJobSearchResponse> {
    // Validate required filters
    const hasRequiredFilter = 
      params.posted_at_max_age_days !== undefined ||
      params.posted_at_gte !== undefined ||
      params.posted_at_lte !== undefined ||
      params.company_domain_or?.length ||
      params.company_linkedin_url_or?.length ||
      params.company_name_or?.length

    if (!hasRequiredFilter) {
      throw new Error(
        'TheirStack requires at least one of: posted_at_max_age_days, posted_at_gte, posted_at_lte, ' +
        'company_domain_or, company_linkedin_url_or, or company_name_or'
      )
    }

    return this.request<TheirStackJobSearchResponse>('/v1/jobs/search', 'POST', params)
  }

  /**
   * Find companies hiring for sales roles (SDR, BDR, AE, etc.)
   * Perfect for finding companies that need sales training/enablement.
   * 
   * @param options - Optional filters
   * @returns Job search response
   * 
   * @example
   * // Find US companies hiring sales reps in the last 14 days
   * const jobs = await client.findCompaniesHiringSales({
   *   country_codes: ['US'],
   *   posted_within_days: 14,
   *   min_employee_count: 50,
   *   max_employee_count: 500
   * })
   */
  async findCompaniesHiringSales(options?: {
    country_codes?: string[]
    posted_within_days?: number
    min_employee_count?: number
    max_employee_count?: number
    limit?: number
  }): Promise<TheirStackJobSearchResponse> {
    return this.searchJobs({
      // Look for sales-related job titles
      job_title_pattern_or: [
        'SDR',
        'BDR',
        'Sales Development',
        'Business Development',
        'Account Executive',
        'Sales Representative',
      ],
      // Filter by country
      job_country_code_or: options?.country_codes,
      // Date filter (required)
      posted_at_max_age_days: options?.posted_within_days || 30,
      // Company size filters
      min_employee_count: options?.min_employee_count,
      max_employee_count: options?.max_employee_count,
      // Pagination
      limit: options?.limit || 25,
    })
  }

  /**
   * Find companies hiring for specific departments.
   * 
   * @param department - Department to search for
   * @param options - Optional filters
   * @returns Job search response
   * 
   * @example
   * // Find companies hiring engineers
   * const jobs = await client.findCompaniesHiringForDepartment('engineering', {
   *   country_codes: ['US'],
   *   posted_within_days: 7
   * })
   */
  async findCompaniesHiringForDepartment(
    department: 'sales' | 'marketing' | 'engineering' | 'product' | 'customer_success',
    options?: {
      country_codes?: string[]
      posted_within_days?: number
      min_employee_count?: number
      max_employee_count?: number
      limit?: number
    }
  ): Promise<TheirStackJobSearchResponse> {
    const departmentPatterns: Record<string, string[]> = {
      sales: ['SDR', 'BDR', 'Account Executive', 'Sales', 'Business Development'],
      marketing: ['Marketing', 'Content', 'Demand Generation', 'Growth'],
      engineering: ['Engineer', 'Developer', 'Software', 'Technical'],
      product: ['Product Manager', 'Product Designer', 'UX', 'UI'],
      customer_success: ['Customer Success', 'Account Manager', 'Support', 'CSM'],
    }

    return this.searchJobs({
      job_title_pattern_or: departmentPatterns[department] || [],
      job_country_code_or: options?.country_codes,
      posted_at_max_age_days: options?.posted_within_days || 30,
      min_employee_count: options?.min_employee_count,
      max_employee_count: options?.max_employee_count,
      limit: options?.limit || 25,
    })
  }

  /**
   * Find companies using specific technologies.
   * 
   * @param technology_slugs - Technology slugs to search for
   * @param options - Optional filters
   * @returns Job search response
   * 
   * @example
   * // Find companies using React that are hiring
   * const jobs = await client.findCompaniesByTechnology(
   *   ['react', 'typescript'],
   *   { posted_within_days: 14 }
   * )
   */
  async findCompaniesByTechnology(
    technology_slugs: string[],
    options?: {
      country_codes?: string[]
      posted_within_days?: number
      min_employee_count?: number
      max_employee_count?: number
      limit?: number
    }
  ): Promise<TheirStackJobSearchResponse> {
    return this.searchJobs({
      company_technology_slug_or: technology_slugs,
      job_country_code_or: options?.country_codes,
      posted_at_max_age_days: options?.posted_within_days || 30,
      min_employee_count: options?.min_employee_count,
      max_employee_count: options?.max_employee_count,
      limit: options?.limit || 25,
    })
  }

  /**
   * Search jobs with custom description patterns.
   * Useful for finding very specific signals in job descriptions.
   * 
   * @param patterns - Regex patterns to match in job descriptions
   * @param options - Optional filters
   * @returns Job search response
   * 
   * @example
   * // Find jobs mentioning "AI" or "machine learning"
   * const jobs = await client.searchByDescription(
   *   ['AI', 'machine learning', 'LLM'],
   *   { posted_within_days: 7 }
   * )
   */
  async searchByDescription(
    patterns: string[],
    options?: {
      country_codes?: string[]
      posted_within_days?: number
      min_employee_count?: number
      max_employee_count?: number
      limit?: number
    }
  ): Promise<TheirStackJobSearchResponse> {
    return this.searchJobs({
      job_description_pattern_or: patterns,
      job_country_code_or: options?.country_codes,
      posted_at_max_age_days: options?.posted_within_days || 30,
      min_employee_count: options?.min_employee_count,
      max_employee_count: options?.max_employee_count,
      limit: options?.limit || 25,
    })
  }

  /**
   * Test the API connection with a minimal query.
   * 
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.searchJobs({
        job_title_pattern_or: ['engineer'],
        posted_at_max_age_days: 1,
        limit: 1,
      })
      return response.data.length >= 0 // Just check we got a valid response
    } catch (error) {
      console.error('TheirStack connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const theirstack = new TheirStackClient()

