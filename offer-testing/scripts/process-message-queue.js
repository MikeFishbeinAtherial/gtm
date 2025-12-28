#!/usr/bin/env node

/**
 * Process Message Queue - Railway Cron Job
 *
 * Runs every 5 minutes to process scheduled messages.
 * Only sends messages whose scheduled_at time has passed.
 *
 * USAGE:
 *   node scripts/process-message-queue.js
 *
 * This will:
 * - Query messages WHERE scheduled_at <= NOW() AND status = 'pending' LIMIT 3
 * - Send messages via Unipile API
 * - Update status and log activity
 * - Send N8N webhooks for notifications
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const UNIPILE_DSN = process.env.UNIPILE_DSN;
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'notifications@yourdomain.com';

if (!UNIPILE_DSN || !UNIPILE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: UNIPILE_DSN, UNIPILE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Helper functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// Unipile API helpers
async function unipileRequest(endpoint, method = 'GET', body = null) {
  const url = `${UNIPILE_DSN}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      'X-API-KEY': UNIPILE_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unipile API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function checkContactStatus(accountId, linkedinUrl) {
  try {
    const profile = await unipileRequest(`/linkedin/profile`, 'POST', {
      account_id: accountId,
      profile_url: linkedinUrl,
    });

    return {
      already_contacted: false, // This would need more complex logic
      connection_degree: profile.connection_degree,
      should_skip: profile.connection_degree === 1,
      skip_reason: profile.connection_degree === 1 ? '1st degree connection' : null,
    };
  } catch (error) {
    console.warn(`⚠️ Could not check contact status for ${linkedinUrl}:`, error.message);
    return {
      already_contacted: false,
      connection_degree: null,
      should_skip: false,
      skip_reason: null,
    };
  }
}

// Main processing functions
async function processDueMessages() {
  console.log(`🔍 Checking for due messages... (${new Date().toISOString()})`);

  try {
    // Check spacing across ALL message types (ensure 5+ minutes since last send)
    // Get most recent sent message from either table
    const [networkingLastSent, regularLastSent] = await Promise.all([
      supabase
        .from('networking_outreach')
        .select('sent_at')
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle(), // Use maybeSingle() instead of single() to handle no results
      supabase
        .from('messages')
        .select('sent_at')
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle() // Use maybeSingle() instead of single() to handle no results
    ]);

    // Find the most recent sent time across both tables
    let lastSentTime = null;
    if (networkingLastSent.data?.sent_at) {
      lastSentTime = new Date(networkingLastSent.data.sent_at);
    }
    if (regularLastSent.data?.sent_at) {
      const regularTime = new Date(regularLastSent.data.sent_at);
      if (!lastSentTime || regularTime > lastSentTime) {
        lastSentTime = regularTime;
      }
    }

    // Check spacing (5 minutes minimum between ANY message sends)
    if (lastSentTime) {
      const timeSinceLastSend = Date.now() - lastSentTime.getTime();
      const minIntervalMs = 5 * 60 * 1000; // 5 minutes minimum

      if (timeSinceLastSend < minIntervalMs) {
        const waitMinutes = Math.ceil((minIntervalMs - timeSinceLastSend) / 60000);
        const lastSentMinutes = Math.floor(timeSinceLastSend / 60000);
        console.log(`⏳ Too soon since last send (${lastSentMinutes}m ago). Need ${waitMinutes} more minutes for spacing.`);
        return; // Skip this run to maintain spacing
      }
    }

    // Process networking messages first (if any due)
    const networkingProcessed = await processNetworkingMessages();
    
    // If we processed a networking message, skip regular messages this run (spacing)
    if (networkingProcessed) {
      console.log('✅ Processed networking message. Skipping regular messages this run for spacing.');
      return;
    }

    // Then check regular messages table (only if no networking message was sent)
    const { data: dueMessages, error } = await supabase
      .from('messages')
      .select(`
        *,
        contact:contacts(*),
        campaign:campaigns(*),
        account:accounts(*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(1); // Safety cap - only 1 message per cron run

    if (error) {
      console.error('❌ Database query error:', error);
      return;
    }

    if (!dueMessages || dueMessages.length === 0) {
      console.log('✅ No regular messages due at this time');
      return;
    }

    console.log(`📤 Processing ${dueMessages.length} due message(s)`);

    // Process each message
    for (const message of dueMessages) {
      await processMessage(message);
      // No sleep needed - we only process 1 per run, spacing handled by cron frequency
    }

  } catch (error) {
    console.error('❌ Error in processDueMessages:', error);
  }
}

async function processNetworkingMessages() {
  try {
    console.log('🔍 Checking for due networking messages...');

    // Get Unipile account
    console.log(`📡 Fetching Unipile accounts from ${UNIPILE_DSN}/accounts`);
    const accountsResponse = await fetch(`${UNIPILE_DSN}/accounts`, {
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error(`❌ Unipile accounts API error: ${accountsResponse.status} - ${errorText}`);
      return false;
    }

    const accounts = await accountsResponse.json();
    console.log(`📊 Found ${accounts.items?.length || 0} Unipile accounts`);
    
    const linkedinAccount = accounts.items?.find(acc =>
      (acc.provider || acc.type || acc.platform || '').toUpperCase() === 'LINKEDIN'
    );

    if (!linkedinAccount) {
      console.error('❌ No LinkedIn account found in Unipile');
      console.log('Available accounts:', accounts.items?.map(a => ({ 
        id: a.id, 
        provider: a.provider || a.type || a.platform,
        name: a.name 
      })));
      return false;
    }

    const unipileAccountId = linkedinAccount.id;
    console.log(`✅ Using LinkedIn account: ${linkedinAccount.name || linkedinAccount.id} (${unipileAccountId})`);

    // Query due networking messages (only 1 per run for spacing)
    console.log('🔍 Querying for due networking messages...');
    const { data: networkingMessages, error } = await supabase
      .from('networking_outreach')
      .select(`
        *,
        linkedin_connections!inner(*)
      `)
      .eq('status', 'pending')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1); // Only 1 per cron run - spacing handled by cron frequency (5 min) + last_sent check

    if (error) {
      console.error('❌ Error fetching networking messages:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false;
    }

    if (!networkingMessages || networkingMessages.length === 0) {
      console.log('✅ No networking messages due at this time');
      return false;
    }

    console.log(`📤 Found ${networkingMessages.length} due networking message(s)`);
    console.log(`📝 Message ID: ${networkingMessages[0].id}`);

    // Only process first message (limit(1) ensures only 1 in array)
    const outreach = networkingMessages[0];
    const connection = outreach.linkedin_connections;

    if (!connection) {
      console.error(`❌ No connection found for outreach ${outreach.id}`);
      await supabase
        .from('networking_outreach')
        .update({
          status: 'failed',
          skip_reason: 'Connection not found'
        })
        .eq('id', outreach.id);
      return false;
    }

    console.log(`👤 Processing message for: ${connection.first_name} ${connection.last_name || ''}`);
    console.log(`🔗 LinkedIn ID: ${connection.linkedin_id || 'MISSING'}`);

    // Skip if no valid linkedin_id
    if (!connection.linkedin_id || connection.linkedin_id.startsWith('temp_')) {
      console.log(`⚠️  Skipping ${connection.first_name}: Invalid linkedin_id (${connection.linkedin_id})`);
      await supabase
        .from('networking_outreach')
        .update({
          status: 'skipped',
          skip_reason: `No valid linkedin_id: ${connection.linkedin_id || 'null'}`
        })
        .eq('id', outreach.id);
      return false; // Skipped, not processed
    }

    // Send via Unipile
    console.log(`📤 Sending message via Unipile API...`);
    console.log(`   Account ID: ${unipileAccountId}`);
    console.log(`   Attendee ID: ${connection.linkedin_id}`);
    console.log(`   Message length: ${outreach.personalized_message.length} chars`);
    
    try {
      const requestBody = {
        account_id: unipileAccountId,
        attendees_ids: [connection.linkedin_id],
        text: outreach.personalized_message,
      };
      
      console.log(`📡 POST ${UNIPILE_DSN}/chats`);
      const response = await fetch(`${UNIPILE_DSN}/chats`, {
        method: 'POST',
        headers: {
          'X-API-KEY': UNIPILE_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`📥 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorBody;
        try {
          errorBody = await response.json();
        } catch {
          try {
            errorBody = { text: await response.text() };
          } catch {
            errorBody = { text: 'Unknown error' };
          }
        }
        console.error(`❌ Unipile API error response:`, errorBody);
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorBody)}`);
      }

      const result = await response.json();
      console.log(`✅ Unipile API success:`, result);

      // Update status
      await supabase
        .from('networking_outreach')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', outreach.id);

      // Update campaign batch stats
      if (outreach.batch_id) {
        const { data: batch } = await supabase
          .from('networking_campaign_batches')
          .select('sent_count')
          .eq('id', outreach.batch_id)
          .single();

        if (batch) {
          await supabase
            .from('networking_campaign_batches')
            .update({
              sent_count: (batch.sent_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', outreach.batch_id);
        }
      }

      // Send success notification
      await sendNetworkingNotification(outreach, connection, { success: true, message_id: result.id });

      console.log(`✅ Networking message sent to ${connection.first_name} ${connection.last_name || ''}`);
      
      // Return true - we processed a message
      return true;

    } catch (error) {
      console.error(`❌ Failed to send networking message:`, error.message);

      // Update status to failed
      await supabase
        .from('networking_outreach')
        .update({
          status: 'failed',
          skip_reason: error.message
        })
        .eq('id', outreach.id);

      // Send failure notification
      await sendNetworkingNotification(outreach, connection, { success: false, error: error.message });
      
      // Return true - we attempted to process it (spacing still applies)
      return true;
    }

  } catch (error) {
    console.error('❌ Error processing networking messages:', error);
    return false;
  }
}

async function processMessage(message) {
  const startTime = Date.now();

  try {
    console.log(`📤 Processing message ${message.id} (${message.channel})`);

    // Route to appropriate sending method
    let sendResult;

    if (message.channel === 'linkedin') {
      sendResult = await sendLinkedInMessage(message);
    } else if (message.channel === 'email') {
      sendResult = await sendEmailMessage(message);
    } else {
      throw new Error(`Unsupported channel: ${message.channel}`);
    }

    const processingTime = Date.now() - startTime;

    // Update message status in Supabase
    const updateData = sendResult.success
      ? {
          status: 'sent',
          sent_at: new Date().toISOString(),
          external_id: sendResult.message_id
        }
      : {
          status: 'failed',
          error_message: sendResult.error
        };

    await supabase
      .from('messages')
      .update(updateData)
      .eq('id', message.id);

    // Log activity for rate limiting
    await supabase
      .from('account_activity')
      .insert({
        account_id: message.account_id,
        message_id: message.id,
        contact_id: message.contact_id,
        action_type: getActionType(message),
        status: sendResult.success ? 'success' : 'failed',
        error_message: sendResult.error,
        created_at: new Date().toISOString()
      });

    // Send email notification via Resend
    await notifyViaEmail(message, sendResult);

    console.log(`${sendResult.success ? '✅' : '❌'} Message ${message.id} ${sendResult.success ? 'sent' : 'failed'} (${formatDuration(processingTime)})`);

  } catch (error) {
    console.error(`❌ Failed to process message ${message.id}:`, error);

    // Mark as failed
    await supabase
      .from('messages')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', message.id);
  }
}

async function sendLinkedInMessage(message) {
  const contact = message.contact;
  const campaignType = message.campaign?.campaign_type || 'cold_outreach';

  try {
    // Check current connection status via Unipile
    const status = await checkContactStatus(
      message.account.unipile_account_id,
      contact.linkedin_url
    );

    // Apply safety rules based on campaign type
    if (status.should_skip) {
      return {
        success: false,
        error: status.skip_reason
      };
    }

    // For cold outreach: complex 1st degree logic
    if (campaignType === 'cold_outreach') {
      if (status.connection_degree === 1) {
        // Check if they became 1st degree during this campaign
        // (i.e., we sent them a connection request that they accepted)
        const becameFirstDegree = await checkIfBecameFirstDegreeDuringCampaign(
          message.campaign_id,
          contact.id
        );

        if (!becameFirstDegree) {
          // They were already 1st degree before campaign started - skip
          return {
            success: false,
            error: 'Cannot cold message existing 1st degree connections'
          };
        }
        // They became 1st degree during campaign - allow messaging
      }
    }
    // Networking campaigns: Allow all 1st degree connections

    // Choose sending method based on relationship
    if (status.already_contacted || status.connection_degree === 1) {
      // Send DM to existing conversation or 1st degree connection
      const result = await unipileRequest('/chats', 'POST', {
        account_id: message.account.unipile_account_id,
        attendees_ids: [contact.linkedin_id],
        text: message.body,
      });

      return {
        success: true,
        message_id: result.id
      };
    } else {
      // Send connection request with message to 2nd/3rd degree
      const result = await unipileRequest('/linkedin/connect', 'POST', {
        account_id: message.account.unipile_account_id,
        recipient_url: contact.linkedin_url,
        message: message.body,
      });

      return {
        success: true,
        message_id: result.id
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function checkIfBecameFirstDegreeDuringCampaign(campaignId, contactId) {
  try {
    // Check if we sent a connection request to this contact during the campaign
    // that resulted in them becoming a 1st degree connection
    const { data } = await supabase
      .from('messages')
      .select('id, sent_at')
      .eq('campaign_id', campaignId)
      .eq('contact_id', contactId)
      .eq('status', 'sent')
      .eq('action_type', 'connection_request')
      .order('sent_at')
      .limit(1);

    return data && data.length > 0;
  } catch (error) {
    console.warn('Error checking connection history:', error);
    return false; // Default to safe - don't send if unsure
  }
}

async function sendEmailMessage(message) {
  try {
    const result = await unipileRequest('/email/send', 'POST', {
      account_id: message.account.unipile_account_id,
      to: message.contact.email,
      subject: message.subject,
      body: message.body,
    });

    return {
      success: true,
      message_id: result.id
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function getActionType(message) {
  if (message.channel === 'email') {
    return 'email';
  }

  // For LinkedIn, check if this creates a connection request
  const contact = message.contact;
  if (contact.connection_degree !== 1 && !contact.already_contacted) {
    return 'connection_request'; // Will send message with connection
  } else {
    return 'message'; // DM to existing connection
  }
}

async function sendNetworkingNotification(outreach, connection, sendResult) {
  if (!RESEND_API_KEY || !NOTIFICATION_EMAIL) {
    console.log('⚠️  Notifications disabled (missing RESEND_API_KEY or NOTIFICATION_EMAIL)');
    return;
  }

  try {
    const subject = sendResult.success
      ? `✅ Networking Message Sent: ${connection.first_name} ${connection.last_name || ''}`
      : `❌ Networking Message Failed: ${connection.first_name} ${connection.last_name || ''}`;

    const body = `
Networking Message Details:
• Contact: ${connection.first_name} ${connection.last_name || ''}
• LinkedIn: ${connection.linkedin_url || 'N/A'}
• Scheduled: ${outreach.scheduled_at}
• Sent: ${new Date().toISOString()}
• Result: ${sendResult.success ? 'SUCCESS' : 'FAILED'}
${sendResult.error ? `• Error: ${sendResult.error}` : ''}
${sendResult.message_id ? `• Message ID: ${sendResult.message_id}` : ''}

Message Content:
${outreach.personalized_message}
    `.trim();

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'notifications@atherial.ai',
        to: [NOTIFICATION_EMAIL],
        subject: subject,
        text: body
      })
    });
  } catch (error) {
    console.warn('⚠️ Failed to send networking notification:', error.message);
  }
}

async function notifyViaEmail(message, sendResult) {
  if (!RESEND_API_KEY) return; // Optional

  try {
    const subject = sendResult.success
      ? `✅ Message Sent: ${message.contact?.first_name} ${message.contact?.last_name}`
      : `❌ Message Failed: ${message.contact?.first_name} ${message.contact?.last_name}`;

    const body = `
Message Details:
• Contact: ${message.contact ? `${message.contact.first_name} ${message.contact.last_name}` : 'Unknown'}
• Company: ${message.contact?.company_name || 'Unknown'}
• Campaign: ${message.campaign?.name || 'Unknown'}
• Channel: ${message.channel}
• Action Type: ${getActionType(message)}
• Scheduled: ${message.scheduled_at}
• Sent: ${new Date().toISOString()}
• Result: ${sendResult.success ? 'SUCCESS' : 'FAILED'}
${sendResult.error ? `• Error: ${sendResult.error}` : ''}

Message Content:
${message.body}
    `.trim();

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'notifications@atherial.ai',
        to: [NOTIFICATION_EMAIL],
        subject: subject,
        text: body
      })
    });
  } catch (error) {
    console.warn('⚠️ Failed to send email notification:', error.message);
  }
}

// Send test email notification every cron run
async function sendCronTestEmail() {
  if (!RESEND_API_KEY || !NOTIFICATION_EMAIL) {
    console.log('⚠️  Test email disabled (missing RESEND_API_KEY or NOTIFICATION_EMAIL)');
    return;
  }

  try {
    console.log('📧 Sending cron test notification email...');

    const subject = `🔄 Cron Run: ${new Date().toISOString()}`;

    // Check pending messages
    const [networkingResult, messagesResult] = await Promise.all([
      supabase.from('networking_outreach').select('id', { count: 'exact' }).eq('status', 'pending').lte('scheduled_at', new Date().toISOString()),
      supabase.from('messages').select('id', { count: 'exact' }).eq('status', 'pending').lte('scheduled_at', new Date().toISOString())
    ]);

    const networkingPending = networkingResult.count || 0;
    const messagesPending = messagesResult.count || 0;

    const body = `
🚀 Cron Execution Report
⏰ Time: ${new Date().toISOString()}

📊 Queue Status:
• Networking messages pending: ${networkingPending}
• Regular messages pending: ${messagesPending}

🔧 Environment Status:
• UNIPILE_DSN: ${UNIPILE_DSN ? '✅ SET' : '❌ MISSING'}
• UNIPILE_API_KEY: ${UNIPILE_API_KEY ? '✅ SET' : '❌ MISSING'}
• SUPABASE_URL: ${SUPABASE_URL ? '✅ SET' : '❌ MISSING'}
• SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? '✅ SET' : '❌ MISSING'}
• RESEND_API_KEY: ${RESEND_API_KEY ? '✅ SET' : '❌ MISSING'}

This email confirms the cron job ran successfully.
    `.trim();

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'notifications@atherial.ai',
        to: [NOTIFICATION_EMAIL],
        subject: subject,
        text: body
      })
    });

    if (response.ok) {
      console.log('✅ Cron test email sent successfully');
    } else {
      console.error('❌ Failed to send cron test email:', response.status, response.statusText);
    }
  } catch (error) {
    console.warn('⚠️ Failed to send cron test email:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 Message Queue Processor Starting...');
  console.log(`⏰ Current time: ${new Date().toISOString()}`);
  console.log(`🔧 Environment check:`);
  console.log(`   UNIPILE_DSN: ${UNIPILE_DSN ? 'SET' : 'MISSING'}`);
  console.log(`   UNIPILE_API_KEY: ${UNIPILE_API_KEY ? 'SET' : 'MISSING'}`);
  console.log(`   SUPABASE_URL: ${SUPABASE_URL ? 'SET' : 'MISSING'}`);
  console.log(`   SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING'}`);
  console.log(`   RESEND_API_KEY: ${RESEND_API_KEY ? 'SET' : 'MISSING'}`);
  console.log(`   NOTIFICATION_EMAIL: ${NOTIFICATION_EMAIL ? NOTIFICATION_EMAIL : 'MISSING'}`);

  // Always send test email to verify cron is running
  await sendCronTestEmail();

  try {
    await processDueMessages();
    console.log('✅ Processing complete');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Run once and exit (for Railway cron)
main().catch((error) => {
  console.error('❌ Unhandled error in main:', error);
  console.error('Error stack:', error.stack);
  process.exit(1);
});
