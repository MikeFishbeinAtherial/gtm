/**
 * Networking Campaign Types
 * 
 * Types for the networking campaign that focuses on reaching out to
 * existing 1st-degree LinkedIn connections (different from cold outreach).
 */

// ===========================================
// LINKEDIN CONNECTION
// ===========================================

export type RelationshipStrength = 'close' | 'moderate' | 'weak' | 'unknown'

export type CampaignResponse = 'positive' | 'neutral' | 'negative' | 'no_response'

export type ConnectionPriority = 'high' | 'medium' | 'low'

export interface LinkedInConnection {
  // Identity
  id: string
  linkedin_id: string
  linkedin_url: string | null
  
  // Personal Info
  first_name: string | null
  last_name: string | null
  full_name: string | null
  headline: string | null
  
  // Professional Info
  current_company: string | null
  current_title: string | null
  location: string | null
  industry: string | null
  
  // Profile Details
  profile_picture_url: string | null
  num_connections: number | null
  
  // Connection Info
  connected_at: string | null
  connection_message: string | null
  
  // Relationship Status
  last_interaction_at: string | null
  interaction_count: number
  relationship_strength: RelationshipStrength | null
  
  // Campaign Status
  contacted_in_campaign: boolean
  last_campaign_contact_at: string | null
  campaign_response: CampaignResponse | null
  
  // Categorization
  tags: string[] | null
  notes: string | null
  priority: ConnectionPriority | null
  
  // Skip Logic
  skip_outreach: boolean
  skip_reason: string | null
  
  // Data Source
  raw_data: Record<string, any> | null
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface CreateLinkedInConnectionInput {
  linkedin_id: string
  linkedin_url?: string
  first_name?: string
  last_name?: string
  full_name?: string
  headline?: string
  current_company?: string
  current_title?: string
  location?: string
  industry?: string
  profile_picture_url?: string
  num_connections?: number
  connected_at?: string
  connection_message?: string
  relationship_strength?: RelationshipStrength
  tags?: string[]
  notes?: string
  priority?: ConnectionPriority
  raw_data?: Record<string, any>
}

export interface UpdateLinkedInConnectionInput {
  headline?: string
  current_company?: string
  current_title?: string
  location?: string
  industry?: string
  last_interaction_at?: string
  interaction_count?: number
  relationship_strength?: RelationshipStrength
  contacted_in_campaign?: boolean
  last_campaign_contact_at?: string
  campaign_response?: CampaignResponse
  tags?: string[]
  notes?: string
  priority?: ConnectionPriority
  skip_outreach?: boolean
  skip_reason?: string
}

// ===========================================
// LINKEDIN CONVERSATION
// ===========================================

export interface LinkedInConversation {
  // Identity
  id: string
  unipile_chat_id: string
  
  // Participants
  connection_id: string | null
  linkedin_id: string
  
  // Conversation Info
  participant_names: string[] | null
  is_group_chat: boolean
  
  // Status
  unread_count: number
  last_message_preview: string | null
  last_message_at: string | null
  last_message_from: string | null
  
  // Data
  raw_data: Record<string, any> | null
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface CreateLinkedInConversationInput {
  unipile_chat_id: string
  connection_id?: string
  linkedin_id: string
  participant_names?: string[]
  is_group_chat?: boolean
  unread_count?: number
  last_message_preview?: string
  last_message_at?: string
  last_message_from?: string
  raw_data?: Record<string, any>
}

// ===========================================
// LINKEDIN MESSAGE
// ===========================================

export type MessageType = 'text' | 'image' | 'file' | 'voice'

export interface LinkedInMessage {
  // Identity
  id: string
  conversation_id: string
  connection_id: string | null
  
  // Unipile Info
  unipile_message_id: string
  
  // Message Details
  sender_linkedin_id: string
  sender_name: string | null
  is_from_me: boolean
  
  // Content
  message_text: string
  message_type: MessageType
  
  // Attachments
  attachments: Record<string, any>[] | null
  
  // Status
  read_status: boolean
  sent_at: string
  
  // Campaign Tracking
  sent_via_campaign: boolean
  campaign_batch_id: string | null
  
  // Data
  raw_data: Record<string, any> | null
  
  // Timestamps
  created_at: string
}

export interface CreateLinkedInMessageInput {
  conversation_id: string
  connection_id?: string
  unipile_message_id: string
  sender_linkedin_id: string
  sender_name?: string
  is_from_me: boolean
  message_text: string
  message_type?: MessageType
  attachments?: Record<string, any>[]
  read_status?: boolean
  sent_at: string
  sent_via_campaign?: boolean
  campaign_batch_id?: string
  raw_data?: Record<string, any>
}

// ===========================================
// NETWORKING CAMPAIGN BATCH
// ===========================================

export type NetworkingBatchStatus = 'draft' | 'ready' | 'in_progress' | 'completed' | 'paused'

export interface NetworkingTargetFilters {
  relationship_strength?: RelationshipStrength[]
  last_interaction_before?: string
  exclude_tags?: string[]
  min_priority?: ConnectionPriority
  industries?: string[]
  companies?: string[]
}

export interface NetworkingCampaignBatch {
  // Identity
  id: string
  
  // Campaign Info
  name: string
  description: string | null
  
  // Message Template
  message_template: string
  personalization_instructions: string | null
  
  // Targeting
  target_filters: NetworkingTargetFilters | null
  
  // Status
  status: NetworkingBatchStatus
  
  // Progress
  total_target_count: number
  sent_count: number
  reply_count: number
  positive_reply_count: number
  
  // Timing
  started_at: string | null
  completed_at: string | null
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface CreateNetworkingBatchInput {
  name: string
  description?: string
  message_template: string
  personalization_instructions?: string
  target_filters?: NetworkingTargetFilters
  status?: NetworkingBatchStatus
}

export interface UpdateNetworkingBatchInput {
  name?: string
  description?: string
  message_template?: string
  personalization_instructions?: string
  target_filters?: NetworkingTargetFilters
  status?: NetworkingBatchStatus
  total_target_count?: number
  sent_count?: number
  reply_count?: number
  positive_reply_count?: number
  started_at?: string
  completed_at?: string
}

// ===========================================
// NETWORKING OUTREACH
// ===========================================

export type NetworkingOutreachStatus = 
  | 'pending'
  | 'approved'
  | 'sent'
  | 'failed'
  | 'replied'
  | 'skipped'

export type ReplySentiment = 'positive' | 'neutral' | 'negative'

export interface NetworkingOutreach {
  // Identity
  id: string
  
  // Relationships
  batch_id: string
  connection_id: string
  message_id: string | null
  
  // Message
  personalized_message: string
  personalization_notes: string | null
  
  // Status
  status: NetworkingOutreachStatus
  skip_reason: string | null
  
  // Response Tracking
  replied_at: string | null
  reply_text: string | null
  reply_sentiment: ReplySentiment | null
  
  // Follow-up
  needs_follow_up: boolean
  follow_up_notes: string | null
  
  // Timestamps
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateNetworkingOutreachInput {
  batch_id: string
  connection_id: string
  personalized_message: string
  personalization_notes?: string
  status?: NetworkingOutreachStatus
  scheduled_at?: string
}

export interface UpdateNetworkingOutreachInput {
  status?: NetworkingOutreachStatus
  skip_reason?: string
  message_id?: string
  replied_at?: string
  reply_text?: string
  reply_sentiment?: ReplySentiment
  needs_follow_up?: boolean
  follow_up_notes?: string
  sent_at?: string
}

// ===========================================
// VIEWS
// ===========================================

export type RecencyCategory = 'never_messaged' | 'very_stale' | 'stale' | 'moderate' | 'recent'

export interface NetworkingContactReady extends LinkedInConnection {
  last_interaction: string | null
  total_messages: number
  recency_category: RecencyCategory
}

export interface NetworkingBatchPerformance {
  id: string
  name: string
  status: NetworkingBatchStatus
  total_target_count: number
  sent_count: number
  reply_count: number
  positive_reply_count: number
  reply_rate: number
  positive_rate: number
  created_at: string
  started_at: string | null
  completed_at: string | null
}

