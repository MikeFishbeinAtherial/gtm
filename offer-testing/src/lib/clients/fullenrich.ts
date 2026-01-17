/**
 * FullEnrich API Client
 * 
 * Contact enrichment API for finding emails and phone numbers.
 * FullEnrich is asynchronous - results come via webhooks (recommended) or polling.
 * 
 * @see https://app.fullenrich.com/
 * @see offer-testing/context/api-tools/fullenrich/fullenrich-tool-guide.md
 */

// ===========================================
// TYPES
// ===========================================

export interface FullenrichEmail {
  email: string
  type: 'work' | 'personal'
  verified?: boolean
}

export interface FullenrichContact {
  firstname: string
  lastname: string
  domain?: string
  company_name?: string
  linkedin_url?: string
  enrich_fields?: string[]
  custom?: Record<string, unknown>
}

export interface FullenrichBulkRequest {
  name: string
  datas: FullenrichContact[]
  webhook_url?: string
}

export interface FullenrichBulkResponse {
  enrichment_id: string
  id?: string // API also returns 'id' field
}

export interface FullenrichContactData {
  custom?: Record<string, unknown>
  contact?: {
    firstname?: string
    lastname?: string
    domain?: string
    most_probable_email?: string
    most_probable_email_status?: string
    emails?: Array<{
      email: string
      status?: string
      type?: 'work' | 'personal'
    }>
    phones?: Array<{
      number: string
      region?: string
    }>
    social_medias?: Array<{
      url: string
      type?: string
    }>
    profile?: {
      linkedin_url?: string
      headline?: string
    }
  }
}

export interface FullenrichBulkStatus {
  id: string // enrichment_id
  name?: string
  status: 'CREATED' | 'IN_PROGRESS' | 'CANCELED' | 'CREDITS_INSUFFICIENT' | 'FINISHED' | 'RATE_LIMIT' | 'UNKNOWN'
  datas?: FullenrichContactData[]
  cost?: {
    credits?: number
  }
}

export interface FullenrichCredits {
  credits_left: number
}

// ===========================================
// CLIENT
// ===========================================

export class FullenrichClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FULLENRICH_API_KEY || ''
    this.baseUrl = 'https://app.fullenrich.com/api/v1'
    
    if (!this.apiKey) {
      console.warn('FullEnrich API key not set. Set FULLENRICH_API_KEY in .env.local')
    }
  }

  /**
   * Make an authenticated request to the FullEnrich API.
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
      throw new Error(`FullEnrich API error (${response.status}): ${error}`)
    }

    return response.json()
  }

  /**
   * Start bulk enrichment (up to 100 contacts).
   * 
   * FullEnrich is asynchronous - results come via webhook or polling.
   * 
   * @param request - Bulk enrichment request
   * @returns Enrichment ID to track progress
   */
  async enrichBulk(request: FullenrichBulkRequest): Promise<FullenrichBulkResponse> {
    if (request.datas.length > 100) {
      throw new Error('Maximum 100 contacts per enrichment request')
    }

    const response = await this.request<{ enrichment_id?: string; id?: string }>('/contact/enrich/bulk', 'POST', request as unknown as Record<string, unknown>)
    
    // Handle both 'enrichment_id' and 'id' response formats
    return {
      enrichment_id: response.enrichment_id || response.id || '',
      id: response.id || response.enrichment_id,
    }
  }

  /**
   * Check enrichment status (polling method).
   * 
   * Note: Webhooks are recommended over polling.
   * Only poll if webhooks aren't available.
   * 
   * @param enrichmentId - Enrichment ID from enrichBulk
   * @param forceResults - If true, return partial results even if not finished
   * @returns Current status and results (if completed)
   */
  async getBulkStatus(enrichmentId: string, forceResults: boolean = false): Promise<FullenrichBulkStatus> {
    const query = forceResults ? '?forceResults=true' : ''
    return this.request<FullenrichBulkStatus>(`/contact/enrich/bulk/${enrichmentId}${query}`, 'GET')
  }

  /**
   * Check remaining API credits.
   * 
   * @returns Credits remaining
   */
  async getCredits(): Promise<FullenrichCredits> {
    return this.request<FullenrichCredits>('/credits', 'GET')
  }

  /**
   * Enrich a single contact (convenience method).
   * 
   * @param contact - Contact to enrich
   * @param enrichmentName - Name for this enrichment
   * @param webhookUrl - Optional webhook URL for results
   * @returns Enrichment ID
   */
  async enrichContact(
    contact: FullenrichContact,
    enrichmentName?: string,
    webhookUrl?: string
  ): Promise<FullenrichBulkResponse> {
    return this.enrichBulk({
      name: enrichmentName || `${contact.firstname} ${contact.lastname} - ${contact.domain || contact.company_name || 'enrichment'}`,
      datas: [contact],
      webhook_url: webhookUrl,
    })
  }

  /**
   * Wait for enrichment to complete (polling helper).
   * 
   * ⚠️ WARNING: Polling consumes rate limits. Use webhooks instead when possible.
   * 
   * @param enrichmentId - Enrichment ID
   * @param maxWaitSeconds - Maximum time to wait (default: 300 = 5 minutes)
   * @param pollIntervalSeconds - How often to check (default: 10 seconds)
   * @returns Status response when complete, or null if timeout
   */
  async waitForCompletion(
    enrichmentId: string,
    maxWaitSeconds: number = 300,
    pollIntervalSeconds: number = 10
  ): Promise<FullenrichBulkStatus | null> {
    const startTime = Date.now()
    const maxWaitMs = maxWaitSeconds * 1000
    const pollIntervalMs = pollIntervalSeconds * 1000

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getBulkStatus(enrichmentId)
      
      if (status.status === 'FINISHED') {
        return status
      }
      
      if (status.status === 'CANCELED' || status.status === 'CREDITS_INSUFFICIENT') {
        throw new Error(`FullEnrich enrichment ${status.status.toLowerCase()}: ${enrichmentId}`)
      }

      // Wait before next poll (don't poll too frequently - API recommends 5-10 min intervals)
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }

    return null // Timeout
  }

  /**
   * Get the best work email from enrichment status response.
   * 
   * @param status - FullEnrich bulk status response
   * @returns Best email or null
   */
  getBestEmail(status: FullenrichBulkStatus): string | null {
    if (!status.datas || status.datas.length === 0) {
      return null
    }

    // Get the first contact's data (since we're enriching one at a time)
    const contactData = status.datas[0]?.contact
    if (!contactData) {
      return null
    }

    // Prefer most_probable_email if available
    if (contactData.most_probable_email) {
      return contactData.most_probable_email
    }

    // Fall back to emails array
    if (contactData.emails && contactData.emails.length > 0) {
      // Prefer emails with DELIVERABLE status
      const deliverable = contactData.emails.find(e => e.status === 'DELIVERABLE')
      if (deliverable) return deliverable.email
      
      // Fall back to first email
      return contactData.emails[0].email
    }

    return null
  }

  /**
   * Test the API connection.
   * 
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getCredits()
      return true
    } catch (error) {
      console.error('FullEnrich connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const fullenrich = new FullenrichClient()
