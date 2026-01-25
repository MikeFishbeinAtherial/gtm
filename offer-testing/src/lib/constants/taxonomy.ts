/**
 * Taxonomy constants
 *
 * Single source of truth for labels used across UI and database.
 * Keep these in sync with scripts/setup-db.sql.
 */

export const CAMPAIGN_TYPES = ['cold_outreach', 'networking'] as const
export const CAMPAIGN_CHANNELS = ['email', 'linkedin', 'multi'] as const

export const MESSAGE_CHANNELS = [
  'email',
  'linkedin_connect',
  'linkedin_dm',
  'linkedin_inmail',
] as const

export const SEND_QUEUE_STATUSES = [
  'pending',
  'scheduled',
  'processing',
  'sent',
  'delivered',
  'failed',
  'bounced',
  'cancelled',
  'skipped',
] as const

export const MESSAGE_EVENT_TYPES = [
  'queued',
  'scheduled',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'replied',
  'bounced',
  'spam',
  'unsubscribed',
  'failed',
  'skipped',
] as const

export const GLOBAL_CONTACT_STATUSES = [
  'available',
  'cooling_off',
  'do_not_contact',
  'replied',
] as const

export const TOOL_TYPES = [
  'company_search',
  'people_search',
  'enrichment',
  'email_finding',
  'email_verification',
  'sending',
  'inbox',
] as const
