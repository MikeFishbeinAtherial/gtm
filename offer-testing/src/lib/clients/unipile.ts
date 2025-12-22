/**
 * Unipile API Client
 * 
 * LinkedIn and Email inbox management, sending, and conversation tracking.
 * 
 * @see https://docs.unipile.com/
 */

// ===========================================
// TYPES
// ===========================================

export interface UnipileAccount {
  id: string
  provider: 'linkedin' | 'email'
  email?: string
  name?: string
  status: 'active' | 'disconnected' | 'error'
}

export interface UnipileProfile {
  linkedin_id: string
  linkedin_url: string
  first_name: string
  last_name: string
  headline?: string
  company?: string
  location?: string
  connection_degree: 1 | 2 | 3 | null
  is_connected: boolean
}

export interface UnipileConversation {
  id: string
  provider: 'linkedin' | 'email'
  participants: {
    id: string
    name: string
    linkedin_url?: string
    email?: string
  }[]
  last_message?: UnipileMessage
  unread_count: number
  created_at: string
  updated_at: string
}

export interface UnipileMessage {
  id: string
  conversation_id: string
  sender: {
    id: string
    name: string
    is_me: boolean
  }
  content: string
  created_at: string
  read: boolean
}

export interface UnipileSendMessageParams {
  account_id: string
  recipient_id?: string      // LinkedIn member ID
  recipient_url?: string     // LinkedIn profile URL
  recipient_email?: string   // For email
  message: string
  subject?: string           // For email/InMail
  type?: 'message' | 'inmail' | 'connection_request'
}

export interface UnipileSendResult {
  success: boolean
  message_id?: string
  error?: string
}

// ===========================================
// CLIENT
// ===========================================

export class UnipileClient {
  private apiKey: string
  private dsn: string
  private baseUrl: string

  constructor(apiKey?: string, dsn?: string) {
    this.apiKey = apiKey || process.env.UNIPILE_API_KEY || ''
    this.dsn = dsn || process.env.UNIPILE_DSN || ''
    this.baseUrl = this.dsn || 'https://api.unipile.com/v1'
    
    if (!this.apiKey) {
      console.warn('Unipile API key not set. Set UNIPILE_API_KEY in .env.local')
    }
  }

  /**
   * Make an authenticated request to the Unipile API.
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      method,
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Unipile API error (${response.status}): ${error}`)
    }

    return response.json()
  }

  // ===========================================
  // ACCOUNTS
  // ===========================================

  /**
   * List connected accounts.
   * 
   * @returns Connected accounts
   */
  async listAccounts(): Promise<UnipileAccount[]> {
    return this.request<UnipileAccount[]>('/accounts')
  }

  /**
   * Get a specific account.
   * 
   * @param accountId - Account ID
   * @returns Account details
   */
  async getAccount(accountId: string): Promise<UnipileAccount> {
    return this.request<UnipileAccount>(`/accounts/${accountId}`)
  }

  // ===========================================
  // PROFILES
  // ===========================================

  /**
   * Get LinkedIn profile information.
   * 
   * @param accountId - LinkedIn account ID
   * @param profileUrl - LinkedIn profile URL
   * @returns Profile information including connection degree
   */
  async getProfile(accountId: string, profileUrl: string): Promise<UnipileProfile> {
    return this.request<UnipileProfile>('/linkedin/profile', 'POST', {
      account_id: accountId,
      profile_url: profileUrl,
    })
  }

  /**
   * Check connection degree with a LinkedIn profile.
   * 
   * @param accountId - LinkedIn account ID
   * @param profileUrl - LinkedIn profile URL
   * @returns Connection degree (1, 2, 3, or null)
   */
  async getConnectionDegree(accountId: string, profileUrl: string): Promise<number | null> {
    const profile = await this.getProfile(accountId, profileUrl)
    return profile.connection_degree
  }

  /**
   * Check if we've already messaged someone.
   * 
   * @param accountId - LinkedIn account ID
   * @param profileUrl - LinkedIn profile URL
   * @returns True if we have an existing conversation
   */
  async hasConversation(accountId: string, profileUrl: string): Promise<boolean> {
    try {
      const conversations = await this.getConversations(accountId)
      // Check if any conversation has this profile URL as a participant
      return conversations.some(conv => 
        conv.participants.some(p => p.linkedin_url === profileUrl)
      )
    } catch {
      return false
    }
  }

  // ===========================================
  // CONVERSATIONS
  // ===========================================

  /**
   * Get conversations for an account.
   * 
   * @param accountId - Account ID
   * @param limit - Max conversations to return
   * @returns List of conversations
   */
  async getConversations(accountId: string, limit = 50): Promise<UnipileConversation[]> {
    return this.request<UnipileConversation[]>(
      `/accounts/${accountId}/conversations?limit=${limit}`
    )
  }

  /**
   * Get messages in a conversation.
   * 
   * @param accountId - Account ID
   * @param conversationId - Conversation ID
   * @returns Messages in the conversation
   */
  async getMessages(accountId: string, conversationId: string): Promise<UnipileMessage[]> {
    return this.request<UnipileMessage[]>(
      `/accounts/${accountId}/conversations/${conversationId}/messages`
    )
  }

  // ===========================================
  // SENDING
  // ===========================================

  /**
   * Send a LinkedIn message.
   * 
   * @param params - Message parameters
   * @returns Send result
   */
  async sendMessage(params: UnipileSendMessageParams): Promise<UnipileSendResult> {
    const endpoint = params.type === 'connection_request'
      ? '/linkedin/connect'
      : params.type === 'inmail'
      ? '/linkedin/inmail'
      : '/linkedin/message'

    return this.request<UnipileSendResult>(endpoint, 'POST', {
      account_id: params.account_id,
      recipient_id: params.recipient_id,
      recipient_url: params.recipient_url,
      message: params.message,
      subject: params.subject,
    })
  }

  /**
   * Send a LinkedIn connection request.
   * 
   * @param accountId - LinkedIn account ID
   * @param profileUrl - Recipient's LinkedIn profile URL
   * @param message - Connection request message (max 300 chars)
   * @returns Send result
   */
  async sendConnectionRequest(
    accountId: string,
    profileUrl: string,
    message: string
  ): Promise<UnipileSendResult> {
    if (message.length > 300) {
      throw new Error('Connection request message must be 300 characters or less')
    }

    return this.sendMessage({
      account_id: accountId,
      recipient_url: profileUrl,
      message,
      type: 'connection_request',
    })
  }

  /**
   * Send a LinkedIn direct message (to connected users).
   * 
   * @param accountId - LinkedIn account ID
   * @param profileUrl - Recipient's LinkedIn profile URL
   * @param message - Message content
   * @returns Send result
   */
  async sendDM(
    accountId: string,
    profileUrl: string,
    message: string
  ): Promise<UnipileSendResult> {
    return this.sendMessage({
      account_id: accountId,
      recipient_url: profileUrl,
      message,
      type: 'message',
    })
  }

  /**
   * Send a LinkedIn InMail.
   * 
   * @param accountId - LinkedIn account ID
   * @param profileUrl - Recipient's LinkedIn profile URL
   * @param subject - InMail subject
   * @param message - Message content
   * @returns Send result
   */
  async sendInMail(
    accountId: string,
    profileUrl: string,
    subject: string,
    message: string
  ): Promise<UnipileSendResult> {
    return this.sendMessage({
      account_id: accountId,
      recipient_url: profileUrl,
      subject,
      message,
      type: 'inmail',
    })
  }

  /**
   * Send an email.
   * 
   * @param accountId - Email account ID
   * @param to - Recipient email
   * @param subject - Email subject
   * @param body - Email body
   * @returns Send result
   */
  async sendEmail(
    accountId: string,
    to: string,
    subject: string,
    body: string
  ): Promise<UnipileSendResult> {
    return this.request<UnipileSendResult>('/email/send', 'POST', {
      account_id: accountId,
      to,
      subject,
      body,
    })
  }

  // ===========================================
  // UTILITIES
  // ===========================================

  /**
   * Check contact status - whether they've been contacted and their connection degree.
   * 
   * @param accountId - LinkedIn account ID
   * @param profileUrl - LinkedIn profile URL
   * @returns Status information
   */
  async checkContactStatus(accountId: string, profileUrl: string): Promise<{
    already_contacted: boolean
    connection_degree: number | null
    has_conversation: boolean
    should_skip: boolean
    skip_reason?: string
  }> {
    const [profile, hasConvo] = await Promise.all([
      this.getProfile(accountId, profileUrl).catch(() => null),
      this.hasConversation(accountId, profileUrl),
    ])

    const connectionDegree = profile?.connection_degree ?? null
    const shouldSkip = connectionDegree === 1 || hasConvo

    return {
      already_contacted: hasConvo,
      connection_degree: connectionDegree,
      has_conversation: hasConvo,
      should_skip: shouldSkip,
      skip_reason: connectionDegree === 1 
        ? 'Already 1st degree connection' 
        : hasConvo 
        ? 'Already has conversation' 
        : undefined,
    }
  }

  /**
   * Test the API connection.
   * 
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listAccounts()
      return true
    } catch (error) {
      console.error('Unipile connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const unipile = new UnipileClient()

