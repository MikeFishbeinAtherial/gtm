/**
 * Sumble API Client
 * 
 * Organization enrichment focused on technology usage and people discovery.
 * Use this to find which companies use specific technologies and discover people
 * who work with those technologies.
 * 
 * @see https://sumble.com/docs/api
 */

// ===========================================
// TYPES
// ===========================================

// Technology details for a company
export interface SumbleTechnology {
  name: string
  last_job_post?: string  // When they last posted a job requiring this tech
  jobs_count?: number      // Number of jobs requiring this tech
  jobs_data_url?: string   // URL to view job postings
  people_count?: number    // Number of people at company with this tech
  people_data_url?: string // URL to view people with this tech
  teams_count?: number     // Number of teams using this tech
  teams_data_url?: string  // URL to view teams
}

// Basic organization info from Sumble
export interface SumbleOrganization {
  id: number
  slug: string
  name: string
  domain: string
}

// Response from organization enrichment
export interface SumbleEnrichmentResponse {
  id: string  // Request ID
  credits_used: number
  credits_remaining: number
  organization: SumbleOrganization
  technologies_found?: string  // e.g., "Python, React"
  technologies_count?: number
  source_data_url?: string  // URL to view full data on Sumble.com
  technologies?: SumbleTechnology[]  // Detailed tech breakdown
}

// Parameters for enriching an organization with technology discovery
export interface SumbleEnrichParams {
  domain?: string
  name?: string
  linkedin_url?: string
  // Technologies to search for (REQUIRED by API)
  technologies: string[] // e.g., ["python", "aws", "react"]
}

// Job posting from Sumble
export interface SumbleJob {
  id: number
  organization_id: number
  organization_name: string
  organization_domain: string | null
  job_title: string
  datetime_pulled: string  // ISO datetime when job was scraped
  primary_job_function: string | null  // e.g., "Engineering", "Sales"
  location: string
  teams: string  // Teams mentioned in the job posting
  matched_projects: string | null  // Projects that match search criteria
  projects_description: string | null
  matched_technologies: string | null  // Technologies that matched your search
  matched_job_functions: string | null
  projects: string | null
  description: string  // Full job description
  url: string  // URL to the job posting
}

// Parameters for finding jobs
export interface SumbleFindJobsParams {
  // Optional: scope to a specific organization
  organization?: {
    domain?: string
    id?: number
    slug?: string
  }
  // Filters for the job search
  filters?: {
    technologies?: string[]  // e.g., ["python", "aws"]
    technology_categories?: string[]  // e.g., ["Backend", "Cloud"]
    countries?: string[]  // e.g., ["US", "CA"]
    since?: string  // Only jobs since this date (YYYY-MM-DD)
  }
  // OR use a natural language query instead of filters
  query?: string
  // Pagination
  limit?: number  // Max 100, default 10
  offset?: number  // Default 0
}

// Response from jobs search
export interface SumbleFindJobsResponse {
  id: string  // Request ID
  credits_used: number  // 3 credits per job returned
  credits_remaining: number
  jobs: SumbleJob[]
  total: number  // Total jobs matching the query
}

// ===========================================
// CLIENT
// ===========================================

export class SumbleClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string) {
    // API key can be passed directly or from environment variable
    this.apiKey = apiKey || process.env.SUMBLE_API_KEY || ''
    // Updated to v3 API as per documentation
    this.baseUrl = 'https://api.sumble.com/v3'
    
    if (!this.apiKey) {
      console.warn('⚠️  Sumble API key not set. Add SUMBLE_API_KEY to .env.local')
    }
  }

  /**
   * Make an authenticated request to the Sumble API.
   * 
   * All requests require the API key as a Bearer token in the Authorization header.
   * Rate limit: 10 requests per second (aggregated across all endpoints).
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`, // Bearer token authentication
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    // Handle rate limiting (429 status code)
    if (response.status === 429) {
      throw new Error('Sumble API rate limit exceeded (10 req/sec). Please wait and retry.')
    }

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Sumble API error (${response.status}): ${error}`)
    }

    return response.json()
  }

  /**
   * Enrich organization data with technology discovery.
   * 
   * This endpoint discovers which people/teams at a company use specific technologies.
   * IMPORTANT: You MUST provide at least one technology to search for.
   * 
   * Example:
   * ```typescript
   * const result = await sumble.enrichOrganization({
   *   domain: 'anthropic.com',
   *   technologies: ['python', 'aws', 'react']
   * })
   * // Returns: Which people at Anthropic use Python, AWS, React
   * ```
   * 
   * @param params - Must include domain/name/linkedin_url AND technologies array
   * @returns Enrichment data including people count, job postings, teams per technology
   */
  async enrichOrganization(params: SumbleEnrichParams): Promise<SumbleEnrichmentResponse> {
    if (!params.domain && !params.name && !params.linkedin_url) {
      throw new Error('At least one of domain, name, or linkedin_url is required')
    }

    if (!params.technologies || params.technologies.length === 0) {
      throw new Error('At least one technology is required in the technologies array')
    }

    // Build the request body according to v3 API structure
    const requestBody = {
      organization: {
        ...(params.domain && { domain: params.domain }),
        ...(params.name && { name: params.name }),
        ...(params.linkedin_url && { linkedin_url: params.linkedin_url }),
      },
      filters: {
        technologies: params.technologies
      }
    }

    return this.request<SumbleEnrichmentResponse>('/organizations/enrich', 'POST', requestBody)
  }

  /**
   * Bulk enrich multiple organizations with technology discovery.
   * 
   * Processes domains in batches to respect rate limits (10 req/sec).
   * 
   * @param domains - List of domains to enrich
   * @param technologies - Technologies to search for at each company
   * @returns Enrichment results (nulls filtered out for failed requests)
   */
  async bulkEnrich(
    domains: string[], 
    technologies: string[]
  ): Promise<SumbleEnrichmentResponse[]> {
    const results: SumbleEnrichmentResponse[] = []
    
    // Process in batches to avoid rate limits (10 req/sec)
    const batchSize = 8 // Stay under limit
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(domain => 
          this.enrichOrganization({ domain, technologies }).catch(() => null)
        )
      )
      results.push(...batchResults.filter((r): r is SumbleEnrichmentResponse => r !== null))
      
      // Small delay between batches (to stay under rate limit)
      if (i + batchSize < domains.length) {
        await new Promise(resolve => setTimeout(resolve, 150))
      }
    }
    
    return results
  }

  /**
   * Find job postings matching specific criteria.
   * 
   * This is perfect for discovering hiring signals! Each job costs 3 credits.
   * 
   * Examples:
   * 
   * 1. Find all Python jobs at a specific company:
   * ```typescript
   * const result = await sumble.findJobs({
   *   organization: { domain: 'stripe.com' },
   *   filters: { technologies: ['python'] }
   * })
   * ```
   * 
   * 2. Find all React jobs across all companies in the US:
   * ```typescript
   * const result = await sumble.findJobs({
   *   filters: { 
   *     technologies: ['react'],
   *     countries: ['US']
   *   },
   *   limit: 50
   * })
   * ```
   * 
   * 3. Find recent engineering jobs at a company:
   * ```typescript
   * const result = await sumble.findJobs({
   *   organization: { domain: 'anthropic.com' },
   *   filters: { since: '2024-01-01' },
   *   limit: 20
   * })
   * ```
   * 
   * 4. Use natural language query:
   * ```typescript
   * const result = await sumble.findJobs({
   *   query: 'Senior Python Engineer with AWS experience'
   * })
   * ```
   * 
   * @param params - Search parameters (filters OR query required)
   * @returns Job listings with full details
   */
  async findJobs(params: SumbleFindJobsParams): Promise<SumbleFindJobsResponse> {
    // Validate that either filters or query is provided
    if (!params.filters && !params.query) {
      throw new Error('Either filters or query is required for job search')
    }

    // Build the request body
    const requestBody: Record<string, unknown> = {
      limit: params.limit || 10,
      offset: params.offset || 0
    }

    // Add organization if specified
    if (params.organization) {
      requestBody.organization = params.organization
    }

    // Add filters OR query (API accepts one or the other)
    if (params.query) {
      requestBody.filters = { query: params.query }
    } else if (params.filters) {
      requestBody.filters = params.filters
    }

    return this.request<SumbleFindJobsResponse>('/jobs/find', 'POST', requestBody)
  }

  /**
   * Test the API connection with a simple enrichment request.
   * 
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with Sumble's own domain
      await this.enrichOrganization({ 
        domain: 'sumble.com', 
        technologies: ['python'] 
      })
      return true
    } catch (error) {
      console.error('Sumble connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const sumble = new SumbleClient()

