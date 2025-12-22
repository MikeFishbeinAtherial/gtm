/**
 * Leadmagic API Client
 * 
 * Email finding and verification.
 * 
 * @see https://docs.leadmagic.io/
 */

// ===========================================
// TYPES
// ===========================================

export interface LeadmagicEmail {
  email: string
  confidence: 'high' | 'medium' | 'low'
  verified: boolean
  source?: string
}

export interface LeadmagicPerson {
  first_name?: string
  last_name?: string
  full_name?: string
  title?: string
  company?: string
  domain?: string
  linkedin_url?: string
  emails: LeadmagicEmail[]
  phone?: string
}

export interface LeadmagicFindParams {
  first_name: string
  last_name: string
  domain: string
  company?: string
  linkedin_url?: string
}

export interface LeadmagicVerifyResult {
  email: string
  is_valid: boolean
  is_deliverable: boolean
  is_catch_all: boolean
  is_disposable: boolean
  is_role_account: boolean
  provider?: string
  smtp_check?: boolean
  risk_level: 'low' | 'medium' | 'high' | 'unknown'
}

export interface LeadmagicEnrichResult {
  person: LeadmagicPerson
  company?: {
    name: string
    domain: string
    industry?: string
    employee_count?: number
  }
}

// ===========================================
// CLIENT
// ===========================================

export class LeadmagicClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.LEADMAGIC_API_KEY || ''
    this.baseUrl = 'https://api.leadmagic.io/v1'
    
    if (!this.apiKey) {
      console.warn('Leadmagic API key not set. Set LEADMAGIC_API_KEY in .env.local')
    }
  }

  /**
   * Make an authenticated request to the Leadmagic API.
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
      throw new Error(`Leadmagic API error (${response.status}): ${error}`)
    }

    return response.json()
  }

  /**
   * Find email for a person at a company.
   * 
   * @param params - Person and company info
   * @returns Person with found emails
   */
  async findEmail(params: LeadmagicFindParams): Promise<LeadmagicPerson> {
    return this.request<LeadmagicPerson>('/find', 'POST', {
      first_name: params.first_name,
      last_name: params.last_name,
      domain: params.domain,
      company: params.company,
      linkedin_url: params.linkedin_url,
    })
  }

  /**
   * Verify an email address.
   * 
   * @param email - Email to verify
   * @returns Verification result
   */
  async verifyEmail(email: string): Promise<LeadmagicVerifyResult> {
    return this.request<LeadmagicVerifyResult>('/verify', 'POST', { email })
  }

  /**
   * Bulk verify multiple emails.
   * 
   * @param emails - Emails to verify
   * @returns Verification results
   */
  async bulkVerify(emails: string[]): Promise<LeadmagicVerifyResult[]> {
    return this.request<LeadmagicVerifyResult[]>('/verify/bulk', 'POST', { emails })
  }

  /**
   * Enrich person data from LinkedIn URL.
   * 
   * @param linkedinUrl - LinkedIn profile URL
   * @returns Enriched person data
   */
  async enrichFromLinkedIn(linkedinUrl: string): Promise<LeadmagicEnrichResult> {
    return this.request<LeadmagicEnrichResult>('/enrich', 'POST', {
      linkedin_url: linkedinUrl,
    })
  }

  /**
   * Enrich person data from email.
   * 
   * @param email - Email address
   * @returns Enriched person data
   */
  async enrichFromEmail(email: string): Promise<LeadmagicEnrichResult> {
    return this.request<LeadmagicEnrichResult>('/enrich', 'POST', { email })
  }

  /**
   * Find emails for multiple people (batch).
   * 
   * @param people - List of people to find emails for
   * @returns People with found emails
   */
  async bulkFindEmails(people: LeadmagicFindParams[]): Promise<LeadmagicPerson[]> {
    const results: LeadmagicPerson[] = []
    
    // Process in batches to avoid rate limits
    const batchSize = 5
    for (let i = 0; i < people.length; i += batchSize) {
      const batch = people.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(person => 
          this.findEmail(person).catch(() => ({
            first_name: person.first_name,
            last_name: person.last_name,
            emails: [],
          }))
        )
      )
      results.push(...batchResults)
      
      // Small delay between batches
      if (i + batchSize < people.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    return results
  }

  /**
   * Get the best email for a person (highest confidence, verified).
   * 
   * @param params - Person and company info
   * @returns Best email found or null
   */
  async getBestEmail(params: LeadmagicFindParams): Promise<string | null> {
    const result = await this.findEmail(params)
    
    if (!result.emails || result.emails.length === 0) {
      return null
    }

    // Sort by confidence and verification status
    const sorted = [...result.emails].sort((a, b) => {
      // Verified emails first
      if (a.verified && !b.verified) return -1
      if (!a.verified && b.verified) return 1
      
      // Then by confidence
      const confidenceOrder = { high: 0, medium: 1, low: 2 }
      return confidenceOrder[a.confidence] - confidenceOrder[b.confidence]
    })

    return sorted[0].email
  }

  /**
   * Test the API connection.
   * 
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to verify a known good email format
      await this.verifyEmail('test@example.com')
      return true
    } catch (error) {
      console.error('Leadmagic connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const leadmagic = new LeadmagicClient()

