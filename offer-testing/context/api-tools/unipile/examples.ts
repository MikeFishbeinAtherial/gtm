/**
 * Unipile API Examples
 * 
 * Real-world examples of using Unipile for LinkedIn outreach.
 */

import { unipile } from '@/lib/clients/unipile'
import { syncLinkedInConnections, syncLinkedInMessages } from '@/lib/networking/linkedin-sync'

// ===========================================
// EXAMPLE 1: Full LinkedIn Sync
// ===========================================

export async function syncAllLinkedInData() {
  // Get LinkedIn account
  const accounts = await unipile.listAccounts()
  const linkedinAccount = accounts.find(a => a.provider === 'linkedin')

  if (!linkedinAccount) {
    throw new Error('No LinkedIn account found')
  }

  // Sync connections
  console.log('Syncing connections...')
  const connResults = await syncLinkedInConnections(linkedinAccount.id)
  console.log(`Synced ${connResults.total} connections`)

  // Sync messages
  console.log('Syncing messages...')
  const msgResults = await syncLinkedInMessages(linkedinAccount.id, 100)
  console.log(`Synced ${msgResults.conversations} conversations, ${msgResults.messages} messages`)

  return {
    connections: connResults,
    messages: msgResults
  }
}

// ===========================================
// EXAMPLE 2: Send Personalized Message
// ===========================================

export async function sendPersonalizedMessage(
  accountId: string,
  profileUrl: string,
  firstName: string,
  company: string,
  hiringSignal?: string
) {
  // Build personalized message
  let message = `Hey ${firstName}!`

  if (hiringSignal) {
    message += ` I noticed ${company} is hiring for ${hiringSignal} - exciting growth!`
  } else {
    message += ` Hope you're doing well at ${company}!`
  }

  message += ` Would love to reconnect and see how I can help.`

  // Send via Unipile
  const result = await unipile.sendDM(accountId, profileUrl, message)

  if (result.success) {
    console.log(`Message sent to ${firstName}`)
  } else {
    console.error(`Failed to send: ${result.error}`)
  }

  return result
}

// ===========================================
// EXAMPLE 3: Check Connection Status
// ===========================================

export async function checkConnectionStatus(
  accountId: string,
  profileUrl: string
) {
  const status = await unipile.checkContactStatus(accountId, profileUrl)

  return {
    connection_degree: status.connection_degree,
    already_contacted: status.already_contacted,
    has_conversation: status.has_conversation,
    should_skip: status.should_skip,
    skip_reason: status.skip_reason
  }
}

// ===========================================
// EXAMPLE 4: Get Message History
// ===========================================

export async function getMessageHistory(accountId: string) {
  const conversations = await unipile.getConversations(accountId, 50)

  const history = []

  for (const conv of conversations) {
    const messages = await unipile.getMessages(accountId, conv.id)

    history.push({
      conversation_id: conv.id,
      participant: conv.participants.find(p => !p.is_me) || conv.participants[0],
      message_count: messages.length,
      last_message: messages[messages.length - 1],
      unread_count: conv.unread_count
    })

    // Rate limit: small delay
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return history
}

// ===========================================
// EXAMPLE 5: Batch Send with Rate Limiting
// ===========================================

export async function batchSendMessages(
  accountId: string,
  recipients: Array<{ profileUrl: string; message: string }>,
  options: {
    maxPerDay?: number
    delayMs?: number
  } = {}
) {
  const maxPerDay = options.maxPerDay || 20
  const delayMs = options.delayMs || 120000 // 2 minutes

  const results = []
  let sentToday = 0

  for (const recipient of recipients) {
    if (sentToday >= maxPerDay) {
      console.log('Daily limit reached. Stopping.')
      break
    }

    try {
      const result = await unipile.sendDM(
        accountId,
        recipient.profileUrl,
        recipient.message
      )

      results.push({
        profileUrl: recipient.profileUrl,
        success: result.success,
        error: result.error
      })

      if (result.success) {
        sentToday++
      }

      // Rate limit delay
      await new Promise(resolve => setTimeout(resolve, delayMs))
    } catch (error) {
      results.push({
        profileUrl: recipient.profileUrl,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
}
