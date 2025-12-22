/**
 * Campaign & Outreach Types
 * 
 * Types for campaigns, messages, accounts, and activity tracking.
 * Matches the Supabase schema in scripts/setup-db.sql
 */

// ===========================================
// ACCOUNTS
// ===========================================

export type AccountType = 'linkedin' | 'email'

export type AccountStatus = 
  | 'active'       // Ready to use
  | 'warming'      // Being warmed up
  | 'paused'       // Manually paused
  | 'limited'      // Hit rate limits
  | 'disconnected' // Connection lost
  | 'banned'       // Account banned

export interface Account {
  id: string
  name: string
  
  type: AccountType
  owner: string
  
  email_address: string | null
  linkedin_url: string | null
  
  // Unipile integration
  unipile_account_id: string | null
  provider: string | null
  
  status: AccountStatus
  
  // Limits (LinkedIn safety!)
  daily_limit_connections: number
  daily_limit_messages: number
  daily_limit_emails: number
  hourly_limit: number
  
  // Warming period
  warming_week: number
  warming_started_at: string | null
  
  // Today's usage (reset daily)
  today_connections: number
  today_messages: number
  today_emails: number
  today_last_action_at: string | null
  
  // Lifetime stats
  total_sent: number
  total_delivered: number
  total_bounced: number
  total_replies: number
  
  // Health metrics
  bounce_rate: number | null
  reply_rate: number | null
  last_health_check: string | null
  
  connected_at: string | null
  created_at: string
  updated_at: string
}

// ===========================================
// CAMPAIGNS
// ===========================================

export type CampaignChannel = 'email' | 'linkedin' | 'multi'

export type CampaignStatus =
  | 'draft'      // Being set up
  | 'ready'      // Ready to launch
  | 'active'     // Running
  | 'paused'     // Temporarily stopped
  | 'completed'  // Finished
  | 'cancelled'  // Abandoned

export interface Campaign {
  id: string
  name: string
  offer_id: string
  
  channel: CampaignChannel
  account_id: string | null
  
  // Configuration (JSON)
  target_criteria: Record<string, unknown> | null
  sequence_config: SequenceConfig | null
  
  status: CampaignStatus
  
  // Schedule
  send_window_start: string  // Time like "09:00"
  send_window_end: string    // Time like "17:00"
  send_days: number[]        // 1=Mon, 7=Sun
  timezone: string
  
  // Progress
  total_contacts: number
  contacts_sent: number
  contacts_remaining: number
  
  // Performance
  total_sent: number
  total_delivered: number
  total_opened: number
  total_clicked: number
  total_replied: number
  total_positive_replies: number
  total_meetings: number
  
  // Rates
  open_rate: number | null
  reply_rate: number | null
  positive_reply_rate: number | null
  meeting_rate: number | null
  
  first_send_at: string | null
  last_send_at: string | null
  created_at: string
  updated_at: string
}

export interface SequenceConfig {
  steps: SequenceStep[]
  stop_on_reply?: boolean
  stop_on_meeting?: boolean
}

export interface SequenceStep {
  step_number: number
  channel: MessageChannel
  delay_days: number
  template_key: string  // e.g., "email_1", "connection_request"
}

// ===========================================
// CAMPAIGN CONTACTS (Junction)
// ===========================================

export type CampaignContactStatus =
  | 'queued'       // Waiting to start
  | 'in_progress'  // Currently being processed
  | 'waiting'      // Waiting for next step
  | 'paused'       // Manually paused
  | 'completed'    // Finished sequence
  | 'replied'      // Got a reply
  | 'meeting'      // Meeting booked
  | 'bounced'      // Message bounced
  | 'unsubscribed' // Opted out
  | 'failed'       // Error occurred

export type ReplySentiment = 'positive' | 'negative' | 'neutral' | 'question' | 'ooo'

export interface CampaignContact {
  id: string
  campaign_id: string
  contact_id: string
  
  // Sequence tracking
  current_step: number
  max_step: number | null
  
  status: CampaignContactStatus
  
  // Engagement
  opened: boolean
  clicked: boolean
  replied: boolean
  reply_sentiment: ReplySentiment | null
  meeting_booked: boolean
  
  // Timestamps
  added_at: string
  started_at: string | null
  next_step_at: string | null
  completed_at: string | null
}

// ===========================================
// MESSAGES
// ===========================================

export type MessageChannel = 
  | 'email'
  | 'linkedin_connect'
  | 'linkedin_dm'
  | 'linkedin_inmail'

export type MessageStatus =
  | 'pending'    // Not yet scheduled
  | 'queued'     // Scheduled to send
  | 'sending'    // Currently sending
  | 'sent'       // Sent successfully
  | 'delivered'  // Confirmed delivered
  | 'opened'     // Opened by recipient
  | 'clicked'    // Link clicked
  | 'replied'    // Got a reply
  | 'bounced'    // Failed to deliver
  | 'failed'     // Error sending

export interface Message {
  id: string
  campaign_contact_id: string
  contact_id: string
  account_id: string
  
  channel: MessageChannel
  sequence_step: number
  
  // Content
  subject: string | null
  body: string
  personalization_used: Record<string, string> | null
  
  // External tracking (from Unipile)
  external_id: string | null
  thread_id: string | null
  
  status: MessageStatus
  error_message: string | null
  
  // Engagement timestamps
  opened_at: string | null
  clicked_at: string | null
  replied_at: string | null
  
  // Reply tracking
  reply_text: string | null
  reply_sentiment: ReplySentiment | null
  
  // Scheduling
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
}

// ===========================================
// ACCOUNT ACTIVITY
// ===========================================

export type ActivityAction = 
  | 'connection_request'
  | 'message'
  | 'email'
  | 'inmail'
  | 'profile_view'

export type ActivityStatus = 'success' | 'failed' | 'rate_limited'

export interface AccountActivity {
  id: string
  account_id: string
  message_id: string | null
  contact_id: string | null
  
  action_type: ActivityAction
  status: ActivityStatus
  error_message: string | null
  
  created_at: string
}

// ===========================================
// INPUT TYPES
// ===========================================

export interface CreateCampaignInput {
  name: string
  offer_id: string
  channel: CampaignChannel
  account_id?: string
  target_criteria?: Record<string, unknown>
  sequence_config?: SequenceConfig
  send_window_start?: string
  send_window_end?: string
  send_days?: number[]
  timezone?: string
}

export interface CreateCampaignContactInput {
  campaign_id: string
  contact_id: string
  max_step?: number
}

export interface CreateMessageInput {
  campaign_contact_id: string
  contact_id: string
  account_id: string
  channel: MessageChannel
  sequence_step: number
  subject?: string
  body: string
  personalization_used?: Record<string, string>
  scheduled_at?: string
}

export interface CreateAccountActivityInput {
  account_id: string
  message_id?: string
  contact_id?: string
  action_type: ActivityAction
  status: ActivityStatus
  error_message?: string
}

// ===========================================
// LINKEDIN DAILY COUNTS (for rate limiting)
// ===========================================

export interface LinkedInDailyCount {
  account: string
  date: string
  connection_requests: number
  messages: number
}
