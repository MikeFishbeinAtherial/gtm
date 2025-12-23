/**
 * LinkedIn Data Sync
 * 
 * Functions to pull LinkedIn connections and messages from Unipile
 * and sync them to Supabase for the networking campaign.
 */

import { unipile } from '../clients/unipile.js'
import { supabase } from '../clients/supabase.js'
import type {
  LinkedInConnection,
  CreateLinkedInConnectionInput,
  LinkedInConversation,
  CreateLinkedInConversationInput,
  LinkedInMessage,
  CreateLinkedInMessageInput,
} from '../types/networking.js'

// ===========================================
// SYNC CONNECTIONS
// ===========================================

/**
 * Fetch all LinkedIn connections from Unipile and sync to Supabase.
 * 
 * This pulls your 1st-degree connections and stores them in the
 * linkedin_connections table.
 * 
 * @param accountId - Unipile LinkedIn account ID
 * @returns Object with sync results
 */
export async function syncLinkedInConnections(accountId: string): Promise<{
  total: number
  new: number
  updated: number
  errors: string[]
}> {
  console.log('🔄 Syncing LinkedIn connections...')
  
  const results = {
    total: 0,
    new: 0,
    updated: 0,
    errors: [] as string[],
  }

  try {
    // Get all connections from Unipile
    // Note: Unipile's endpoint is /users/relations for LinkedIn connections
    const response = await fetch(
      `${unipile['baseUrl']}/users/relations?account_id=${accountId}`,
      {
        headers: {
          'X-API-KEY': unipile['apiKey'],
          'accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Unipile API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const connections = data.items || data.relations || []
    
    results.total = connections.length
    console.log(`📥 Found ${results.total} connections`)

    // Process each connection
    for (const conn of connections) {
      try {
        // Map Unipile data to our schema
        const connectionData: CreateLinkedInConnectionInput = {
          linkedin_id: conn.id || conn.linkedin_id || conn.user_id,
          linkedin_url: conn.public_url || conn.profile_url,
          first_name: conn.first_name,
          last_name: conn.last_name,
          full_name: conn.name || `${conn.first_name || ''} ${conn.last_name || ''}`.trim(),
          headline: conn.headline,
          current_company: conn.company,
          current_title: conn.title,
          location: conn.location,
          industry: conn.industry,
          profile_picture_url: conn.avatar || conn.profile_picture,
          num_connections: conn.connections_count,
          connected_at: conn.connected_at || conn.created_at,
          raw_data: conn,
        }

        // Check if connection already exists
        const { data: existing } = await supabase
          .from('linkedin_connections')
          .select('id')
          .eq('linkedin_id', connectionData.linkedin_id)
          .single()

        if (existing) {
          // Update existing connection
          const { error } = await supabase
            .from('linkedin_connections')
            .update({
              headline: connectionData.headline,
              current_company: connectionData.current_company,
              current_title: connectionData.current_title,
              location: connectionData.location,
              industry: connectionData.industry,
              profile_picture_url: connectionData.profile_picture_url,
              num_connections: connectionData.num_connections,
              raw_data: connectionData.raw_data,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)

          if (error) {
            results.errors.push(`Error updating ${connectionData.full_name}: ${error.message}`)
          } else {
            results.updated++
          }
        } else {
          // Insert new connection
          const { error } = await supabase
            .from('linkedin_connections')
            .insert(connectionData)

          if (error) {
            results.errors.push(`Error inserting ${connectionData.full_name}: ${error.message}`)
          } else {
            results.new++
          }
        }
      } catch (error) {
        const err = error as Error
        results.errors.push(`Error processing connection: ${err.message}`)
      }
    }

    console.log(`✅ Sync complete: ${results.new} new, ${results.updated} updated`)
    if (results.errors.length > 0) {
      console.warn(`⚠️ ${results.errors.length} errors occurred`)
    }

    return results

  } catch (error) {
    const err = error as Error
    console.error('❌ Error syncing connections:', err.message)
    results.errors.push(err.message)
    return results
  }
}

// ===========================================
// SYNC CONVERSATIONS & MESSAGES
// ===========================================

/**
 * Fetch all LinkedIn conversations and messages from Unipile and sync to Supabase.
 * 
 * @param accountId - Unipile LinkedIn account ID
 * @param limit - Max conversations to sync (default 50)
 * @returns Object with sync results
 */
export async function syncLinkedInMessages(
  accountId: string,
  limit = 50
): Promise<{
  conversations: number
  messages: number
  errors: string[]
}> {
  console.log('💬 Syncing LinkedIn conversations...')
  
  const results = {
    conversations: 0,
    messages: 0,
    errors: [] as string[],
  }

  try {
    // Get all conversations from Unipile
    const conversations = await unipile.getConversations(accountId, limit)
    
    console.log(`📥 Found ${conversations.length} conversations`)

    // Process each conversation
    for (const conv of conversations) {
      try {
        // Extract the LinkedIn ID of the other person
        const otherParticipant = conv.participants.find(
          (p: any) => !p.is_me && p.linkedin_url
        )
        
        if (!otherParticipant) {
          results.errors.push(`Conversation ${conv.id} has no valid participant`)
          continue
        }

        // Try to find the connection in our database
        const { data: connection } = await supabase
          .from('linkedin_connections')
          .select('id')
          .eq('linkedin_url', otherParticipant.linkedin_url)
          .single()

        // Create or update conversation
        const conversationData: CreateLinkedInConversationInput = {
          unipile_chat_id: conv.id,
          connection_id: connection?.id,
          linkedin_id: otherParticipant.id || (otherParticipant as any).linkedin_id,
          participant_names: conv.participants.map((p: any) => p.name),
          is_group_chat: conv.participants.length > 2,
          unread_count: conv.unread_count || 0,
          last_message_preview: conv.last_message?.content?.substring(0, 200),
          last_message_at: conv.last_message?.created_at || conv.updated_at,
          last_message_from: conv.last_message?.sender?.is_me ? 'me' : 'them',
          raw_data: conv,
        }

        // Upsert conversation
        const { data: conversationRecord, error: convError } = await supabase
          .from('linkedin_conversations')
          .upsert(conversationData, {
            onConflict: 'unipile_chat_id',
          })
          .select()
          .single()

        if (convError) {
          results.errors.push(`Error upserting conversation: ${convError.message}`)
          continue
        }

        results.conversations++

        // Get messages for this conversation
        const messages = await unipile.getMessages(accountId, conv.id)
        
        // Insert messages
        for (const msg of messages) {
          try {
            const messageData: CreateLinkedInMessageInput = {
              conversation_id: conversationRecord.id,
              connection_id: connection?.id,
              unipile_message_id: msg.id,
              sender_linkedin_id: msg.sender.id,
              sender_name: msg.sender.name,
              is_from_me: msg.sender.is_me,
              message_text: msg.content,
              message_type: 'text',
              read_status: msg.read || false,
              sent_at: msg.created_at,
              raw_data: msg,
            }

            // Insert message (skip if already exists)
            const { error: msgError } = await supabase
              .from('linkedin_messages')
              .upsert(messageData, {
                onConflict: 'unipile_message_id',
                ignoreDuplicates: true,
              })

            if (msgError && !msgError.message.includes('duplicate')) {
              results.errors.push(`Error inserting message: ${msgError.message}`)
            } else if (!msgError) {
              results.messages++
            }
          } catch (error) {
            const err = error as Error
            results.errors.push(`Error processing message: ${err.message}`)
          }
        }

      } catch (error) {
        const err = error as Error
        results.errors.push(`Error processing conversation ${conv.id}: ${err.message}`)
      }
    }

    console.log(`✅ Sync complete: ${results.conversations} conversations, ${results.messages} messages`)
    if (results.errors.length > 0) {
      console.warn(`⚠️ ${results.errors.length} errors occurred`)
    }

    return results

  } catch (error) {
    const err = error as Error
    console.error('❌ Error syncing messages:', err.message)
    results.errors.push(err.message)
    return results
  }
}

// ===========================================
// FULL SYNC
// ===========================================

/**
 * Perform a full sync of LinkedIn data (connections + messages).
 * 
 * @param accountId - Unipile LinkedIn account ID
 * @returns Combined sync results
 */
export async function fullLinkedInSync(accountId: string) {
  console.log('🚀 Starting full LinkedIn sync...\n')
  
  const start = Date.now()
  
  // Sync connections first
  const connectionsResult = await syncLinkedInConnections(accountId)
  
  console.log('') // Empty line for readability
  
  // Then sync messages
  const messagesResult = await syncLinkedInMessages(accountId)
  
  const duration = ((Date.now() - start) / 1000).toFixed(1)
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 SYNC SUMMARY')
  console.log('='.repeat(50))
  console.log(`⏱️  Duration: ${duration}s`)
  console.log(`👥 Connections: ${connectionsResult.new} new, ${connectionsResult.updated} updated (${connectionsResult.total} total)`)
  console.log(`💬 Conversations: ${messagesResult.conversations}`)
  console.log(`📨 Messages: ${messagesResult.messages}`)
  
  const totalErrors = connectionsResult.errors.length + messagesResult.errors.length
  if (totalErrors > 0) {
    console.log(`⚠️  Errors: ${totalErrors}`)
    console.log('\nFirst 5 errors:')
    const allErrors = [...connectionsResult.errors, ...messagesResult.errors]
    allErrors.slice(0, 5).forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`)
    })
  }
  console.log('='.repeat(50))
  
  return {
    connections: connectionsResult,
    messages: messagesResult,
    duration,
  }
}

// ===========================================
// ANALYSIS HELPERS
// ===========================================

/**
 * Analyze your connections to identify who to reach out to.
 * 
 * @returns Array of connections ready for outreach
 */
export async function getConnectionsReadyForOutreach() {
  const { data, error } = await supabase
    .from('networking_contacts_ready')
    .select('*')
    .order('last_interaction', { ascending: true })
    .limit(100)

  if (error) {
    console.error('Error fetching ready connections:', error)
    return []
  }

  return data
}

/**
 * Get statistics about your connections.
 */
export async function getConnectionStats() {
  const { data: connections } = await supabase
    .from('linkedin_connections')
    .select('*')

  if (!connections) return null

  const stats = {
    total: connections.length,
    contacted: connections.filter(c => c.contacted_in_campaign).length,
    skipped: connections.filter(c => c.skip_outreach).length,
    ready: connections.filter(c => !c.contacted_in_campaign && !c.skip_outreach).length,
    by_recency: {
      never_messaged: 0,
      very_stale: 0,
      stale: 0,
      moderate: 0,
      recent: 0,
    },
    by_priority: {
      high: connections.filter(c => c.priority === 'high').length,
      medium: connections.filter(c => c.priority === 'medium').length,
      low: connections.filter(c => c.priority === 'low').length,
      unset: connections.filter(c => !c.priority).length,
    },
  }

  return stats
}

