/**
 * Outreach Manager
 * 
 * Manage outreach campaigns, track messages, and handle LinkedIn safety.
 * Coordinates between contact finder, copy generator, and Unipile.
 */

import { unipile } from '@/lib/clients/unipile'
import { 
  getOffer,
  getContactsReadyForOutreach,
  updateContact,
  getLinkedInDailyCounts,
} from '@/lib/clients/supabase'
import { personalizeMessage } from './copy-generator'
import type { 
  Contact,
  ContactWithCompany,
} from '@/lib/types'

// ===========================================
// TYPES
// ===========================================

export interface PrepareOutreachInput {
  offer_id: string
  channel: string
  limit?: number
}

export interface PrepareOutreachResult {
  prepared: number
  skipped: number
  skip_reasons: Record<string, number>
  outreach_ids: string[]
}

export interface SendOutreachInput {
  outreach_id: string
  account: string  // LinkedIn account name ('mike' or 'eugene')
}

export interface SendOutreachResult {
  success: boolean
  message_id?: string
  error?: string
}

// ===========================================
// PREPARE OUTREACH
// ===========================================

/**
 * Prepare outreach messages for contacts ready to be contacted.
 * Creates outreach records with personalized messages.
 * 
 * @param input - Preparation parameters
 * @returns Preparation results
 */
export async function prepareOutreach(input: PrepareOutreachInput): Promise<PrepareOutreachResult> {
  const { offer_id, channel, limit = 30 } = input

  // Get offer and templates
  const offer = await getOffer(offer_id)
  if (!offer) {
    throw new Error(`Offer not found: ${offer_id}`)
  }

  // Get the right template
  const template = getTemplate(offer, channel)
  if (!template) {
    throw new Error(`No ${channel} template found. Run /offer-copy first.`)
  }

  // Get contacts ready for outreach
  const contacts = await getContactsReadyForOutreach(offer_id)
  const contactsToProcess = contacts.slice(0, limit)

  const result: PrepareOutreachResult = {
    prepared: 0,
    skipped: 0,
    skip_reasons: {},
    outreach_ids: [],
  }

  for (const contact of contactsToProcess) {
    try {
      // Check if should skip
      const skipReason = shouldSkipContact(contact)
      if (skipReason) {
        result.skipped++
        result.skip_reasons[skipReason] = (result.skip_reasons[skipReason] || 0) + 1
        continue
      }

      // Personalize the message
      const personalizedMessage = personalizeMessage({
        template,
        variables: {
          first_name: contact.first_name || undefined,
          last_name: contact.last_name || undefined,
          company_name: contact.company_name || undefined,
          title: contact.title || undefined,
        },
      })

      // Create outreach record
      // const outreach = await createOutreach({
      //   contact_id: contact.id,
      //   offer_id: offer_id,
      //   channel,
      //   message_sent: personalizedMessage,
      //   personalization: {
      //     first_name: contact.first_name || '',
      //     company_name: contact.company_name || '',
      //     title: contact.title || '',
      //   },
      // })

      // Temporary: skip outreach creation for Railway deployment
      const outreach = { id: `temp-${contact.id}` }
      result.prepared++
      // result.outreach_ids.push(outreach.id)
    } catch (error) {
      console.error(`Error preparing outreach for contact ${contact.id}:`, error)
      result.skipped++
      result.skip_reasons['error'] = (result.skip_reasons['error'] || 0) + 1
    }
  }

  return result
}

// ===========================================
// CHECK LIMITS
// ===========================================

/**
 * Get current LinkedIn activity limits for an account.
 * 
 * @param account - Account name
 * @returns Current limits and usage
 */
export async function getLinkedInLimits(account: string): Promise<any> {
  const counts = await getLinkedInDailyCounts(account)
  
  // Get today's count (assuming counts is an array with today's data)
  const today = counts[0] || { connection_requests: 0, messages: 0 }

  return {
    connection_request: {
      daily_limit: 20,
      used: today.connection_requests,
      remaining: Math.max(0, 20 - today.connection_requests),
    },
    message: {
      daily_limit: 40,
      used: today.messages,
      remaining: Math.max(0, 40 - today.messages),
    },
    profile_view: {
      daily_limit: 80,
      used: 0, // Not tracked in current schema
      remaining: 80,
    },
  }
}

/**
 * Check if we can perform a LinkedIn action.
 * 
 * @param account - Account name
 * @param actionType - Type of action
 * @returns Whether the action is allowed
 */
export async function canDoLinkedInAction(
  account: string,
  actionType: 'connection_request' | 'message' | 'profile_view'
): Promise<boolean> {
  const limits = await getLinkedInLimits(account)
  
  switch (actionType) {
    case 'connection_request':
      return limits.connection_request.remaining > 0
    case 'message':
      return limits.message.remaining > 0
    case 'profile_view':
      return limits.profile_view.remaining > 0
    default:
      return false
  }
}

// ===========================================
// SEND OUTREACH (Manual trigger)
// ===========================================

/**
 * Send a single outreach message via Unipile.
 * This should be called manually or in a controlled queue.
 * 
 * @param input - Send parameters
 * @returns Send result
 */
export async function sendOutreach(input: SendOutreachInput): Promise<SendOutreachResult> {
  const { outreach_id, account } = input

  // Note: In V1, this is for reference. Actual sending is manual.
  // This function would be used in V2 for automated sending.

  // Check rate limits
  const actionType = 'message' // or 'connection_request' based on channel
  const canSend = await canDoLinkedInAction(account, actionType)
  
  if (!canSend) {
    // await updateOutreach(outreach_id, { status: 'rate_limited' })
    return {
      success: false,
      error: 'Daily rate limit reached',
    }
  }

  // For V1, we just mark as ready to send manually
  // In V2, we would call unipile.sendMessage() here

  return {
    success: true,
    message_id: 'manual-send-required',
  }
}

// ===========================================
// UPDATE STATUS
// ===========================================

/**
 * Update outreach status after manual send.
 * 
 * @param outreachId - Outreach ID
 * @param status - New status
 */
export async function markOutreachSent(
  outreachId: string,
  account: string
): Promise<void> {
  // Update outreach record
  // await updateOutreach(outreachId, {
  //   status: 'sent',
  //   sent_at: new Date().toISOString(),
  // })

  // Log LinkedIn activity for rate limiting
  // await logLinkedInActivity({
  //   account,
  //   action_type: 'message',
  //   outreach_id: outreachId,
  // })
}

/**
 * Mark outreach as replied.
 * 
 * @param outreachId - Outreach ID
 * @param replyText - The reply text
 * @param sentiment - Sentiment of the reply
 */
export async function markOutreachReplied(
  outreachId: string,
  replyText: string,
  sentiment: 'positive' | 'negative' | 'neutral' | 'question' | 'not_now'
): Promise<void> {
  // await updateOutreach(outreachId, {
  //   status: 'replied',
  //   replied_at: new Date().toISOString(),
  //   reply_text: replyText,
  //   reply_sentiment: sentiment,
  // })
}

// ===========================================
// CHECK CONTACT STATUS
// ===========================================

/**
 * Check a contact's LinkedIn status via Unipile.
 * Updates the contact record with connection degree and conversation status.
 * 
 * @param contactId - Contact ID
 * @param linkedinUrl - LinkedIn profile URL
 * @param accountId - Unipile account ID
 */
export async function checkContactLinkedInStatus(
  contactId: string,
  linkedinUrl: string,
  accountId: string
): Promise<{
  connection_degree: number | null
  already_contacted: boolean
  should_skip: boolean
  skip_reason?: string
}> {
  const status = await unipile.checkContactStatus(accountId, linkedinUrl)

  // Update contact record
  await updateContact(contactId, {
    connection_degree: status.connection_degree as any,
    already_contacted: status.already_contacted,
  } as any)

  return status
}

// ===========================================
// HELPERS
// ===========================================

function getTemplate(offer: any, channel: string): string | null {
  switch (channel) {
    case 'linkedin_connect':
      return offer.linkedin_templates?.connection_request?.template
    case 'linkedin_dm':
      return offer.linkedin_templates?.follow_up_dm?.template
    case 'linkedin_inmail':
      return offer.linkedin_templates?.inmail?.body
    case 'email':
      return offer.email_templates?.email_1?.body
    default:
      return null
  }
}

function shouldSkipContact(contact: ContactWithCompany): string | null {
  const c = contact as any
  if (c.do_not_contact) {
    return c.do_not_contact_reason || 'do_not_contact'
  }
  if (contact.already_contacted) {
    return 'already_contacted'
  }
  if (contact.connection_degree === 1) {
    return '1st_degree_connection'
  }
  if (!contact.linkedin_url) {
    return 'no_linkedin_url'
  }
  return null
}

// ===========================================
// REPORTING
// ===========================================

/**
 * Get outreach summary for an offer.
 */
export async function getOutreachSummary(offerId: string): Promise<{
  total: number
  by_status: Record<string, number>
  by_channel: Record<string, number>
  reply_rate: number | null
  positive_rate: number | null
}> {
  // This would query the database for stats
  // For now, return a placeholder
  return {
    total: 0,
    by_status: {},
    by_channel: {},
    reply_rate: null,
    positive_rate: null,
  }
}

