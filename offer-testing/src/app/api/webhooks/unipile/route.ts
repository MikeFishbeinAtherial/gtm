import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Webhook authentication secret
const WEBHOOK_SECRET = process.env.UNIPILE_WEBHOOK_SECRET

// Types based on Unipile webhook payload
interface UnipileWebhookPayload {
  account_id: string
  account_type: 'LINKEDIN' | 'INSTAGRAM' | 'WHATSAPP' | 'TELEGRAM'
  account_info?: {
    type: 'LINKEDIN' | 'INSTAGRAM'
    feature: 'organization' | 'sales_navigator' | 'recruiter' | 'classic'
    user_id: string
  }
  event: 'message_reaction' | 'message_read' | 'message_received' | 'message_edited' | 'message_deleted' | 'message_delivered' | 'message_failed'
  chat_id: string
  timestamp: string
  webhook_name: string
  message_id: string
  message?: string
  sender?: {
    attendee_id: string
    attendee_name: string
    attendee_provider_id: string
    attendee_profile_url: string
  }
  attendees?: Array<{
    attendee_id: string
    attendee_name: string
    attendee_provider_id: string
    attendee_profile_url: string
  }>
  attachments?: {
    id: string
    size?: {
      height: string
      width: string
    }
    sticker?: string
    unavailable?: string
    mimetype?: string
    type?: string
    url?: string
  }
  reaction?: string
  reaction_sender?: {
    attendee_id: string
    attendee_name: string
    attendee_provider_id: string
    attendee_profile_url: string
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authentication
    const authHeader = request.headers.get('unipile-auth')
    if (WEBHOOK_SECRET && authHeader !== WEBHOOK_SECRET) {
      console.error('❌ Webhook authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse webhook payload
    const payload: UnipileWebhookPayload = await request.json()

    console.log(`📨 Unipile webhook received: ${payload.event} for message ${payload.message_id}`)

    // Handle different event types
    switch (payload.event) {
      case 'message_delivered':
        await handleMessageDelivered(payload)
        break

      case 'message_received':
        await handleMessageReceived(payload)
        break

      case 'message_failed':
        await handleMessageFailed(payload)
        break

      case 'message_read':
        await handleMessageRead(payload)
        break

      case 'message_reaction':
        await handleMessageReaction(payload)
        break

      default:
        console.log(`ℹ️ Unhandled event type: ${payload.event}`)
    }

    // Always return success to Unipile
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    // Still return 200 to prevent Unipile retries for our code errors
    return NextResponse.json({ success: true })
  }
}

async function handleMessageDelivered(payload: UnipileWebhookPayload) {
  console.log(`✅ Message delivered: ${payload.message_id}`)

  // Update networking outreach record if this was an outgoing message
  const { error } = await supabase
    .from('networking_outreach')
    .update({
      status: 'delivered',
      delivered_at: payload.timestamp,
      unipile_message_id: payload.message_id,
      unipile_chat_id: payload.chat_id,
      updated_at: new Date().toISOString()
    })
    .eq('unipile_message_id', payload.message_id)

  if (error && error.code !== 'PGRST116') { // Ignore "not found" errors
    console.error('Error updating delivered message:', error)
  }

  // Also try to match by chat_id if message_id doesn't match
  if (error?.code === 'PGRST116') {
    const { error: chatError } = await supabase
      .from('networking_outreach')
      .update({
        status: 'delivered',
        delivered_at: payload.timestamp,
        unipile_message_id: payload.message_id,
        unipile_chat_id: payload.chat_id,
        updated_at: new Date().toISOString()
      })
      .eq('unipile_chat_id', payload.chat_id)
      .eq('status', 'sent') // Only update messages that were sent but not yet delivered

    if (chatError && chatError.code !== 'PGRST116') {
      console.error('Error updating delivered message by chat_id:', chatError)
    }
  }
}

async function handleMessageReceived(payload: UnipileWebhookPayload) {
  console.log(`💬 Message received: ${payload.message_id} from ${payload.sender?.attendee_name}`)

  // This is an incoming message (reply or new conversation)
  // Store in a replies/conversations table or update existing outreach record

  const replyData = {
    unipile_message_id: payload.message_id,
    unipile_chat_id: payload.chat_id,
    sender_name: payload.sender?.attendee_name,
    sender_profile_url: payload.sender?.attendee_profile_url,
    sender_provider_id: payload.sender?.attendee_provider_id,
    message_content: payload.message,
    received_at: payload.timestamp,
    attachments: payload.attachments,
    created_at: new Date().toISOString()
  }

  // Insert into replies table (you might want to create this table)
  const { error } = await supabase
    .from('networking_replies') // Assuming you create this table
    .insert(replyData)

  if (error) {
    console.error('Error storing reply:', error)
    // Fallback: store in a JSON field in the outreach record
    await supabase
      .from('networking_outreach')
      .update({
        has_reply: true,
        last_reply_at: payload.timestamp,
        last_reply_content: payload.message,
        updated_at: new Date().toISOString()
      })
      .eq('unipile_chat_id', payload.chat_id)
  } else {
    // Update the outreach record to mark as replied
    await supabase
      .from('networking_outreach')
      .update({
        status: 'replied',
        last_reply_at: payload.timestamp,
        updated_at: new Date().toISOString()
      })
      .eq('unipile_chat_id', payload.chat_id)
  }
}

async function handleMessageFailed(payload: UnipileWebhookPayload) {
  console.log(`❌ Message failed: ${payload.message_id}`)

  // Update outreach record to failed status
  const { error } = await supabase
    .from('networking_outreach')
    .update({
      status: 'failed',
      skip_reason: `Unipile delivery failed: ${payload.event}`,
      failed_at: payload.timestamp,
      updated_at: new Date().toISOString()
    })
    .eq('unipile_message_id', payload.message_id)

  if (error && error.code !== 'PGRST116') {
    console.error('Error updating failed message:', error)
  }
}

async function handleMessageRead(payload: UnipileWebhookPayload) {
  console.log(`👀 Message read: ${payload.message_id}`)

  // Update outreach record to mark as read
  const { error } = await supabase
    .from('networking_outreach')
    .update({
      status: 'read',
      read_at: payload.timestamp,
      updated_at: new Date().toISOString()
    })
    .eq('unipile_message_id', payload.message_id)

  if (error && error.code !== 'PGRST116') {
    console.error('Error updating read message:', error)
  }
}

async function handleMessageReaction(payload: UnipileWebhookPayload) {
  console.log(`😄 Message reaction: ${payload.reaction} on ${payload.message_id}`)

  // Store reaction in replies or update outreach record
  const reactionData = {
    unipile_message_id: payload.message_id,
    reaction: payload.reaction,
    reaction_sender: payload.reaction_sender?.attendee_name,
    reacted_at: payload.timestamp,
    created_at: new Date().toISOString()
  }

  // You might want to create a reactions table or store in outreach record
  await supabase
    .from('networking_outreach')
    .update({
      has_reaction: true,
      last_reaction: payload.reaction,
      last_reaction_at: payload.timestamp,
      updated_at: new Date().toISOString()
    })
    .eq('unipile_message_id', payload.message_id)
}

// Optional: GET endpoint for webhook verification
export async function GET() {
  return NextResponse.json({
    message: 'Unipile webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}
