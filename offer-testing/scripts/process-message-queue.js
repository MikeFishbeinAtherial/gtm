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

// Sending window + safety limits (LinkedIn safety rules)
const TIMEZONE = 'America/New_York';
const BUSINESS_HOURS_START = 9; // 9 AM ET
const BUSINESS_HOURS_END = 18; // 6 PM ET
const SEND_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri
const MAX_MESSAGES_PER_DAY = 38; // Safety cap (<= 40/day)
const JITTER_MIN_SECONDS = 15;
const JITTER_MAX_SECONDS = 120;

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

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function applyCronJitter() {
  const delaySeconds = getRandomInt(JITTER_MIN_SECONDS, JITTER_MAX_SECONDS);
  console.log(`⏳ Adding random delay: ${delaySeconds}s (to avoid detection patterns)`);
  await sleep(delaySeconds * 1000);
  console.log(`✅ Delay complete, starting message processing...`);
}

async function updateOutreachStatusWithRetry(outreachId, expectedStatus, updates, label) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await supabase
      .from('networking_outreach')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', outreachId)
      .eq('status', expectedStatus);

    if (!error) {
      return true;
    }

    console.warn(`⚠️  Failed to update outreach (${label}) attempt ${attempt}/${maxAttempts}:`, error.message);
    await sleep(500 * attempt);
  }

  console.error(`❌ Could not update outreach (${label}) after ${maxAttempts} attempts`);
  return false;
}

function getNowInTimeZone() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

function isWithinSendWindow(dateInTz) {
  const day = dateInTz.getDay();
  const hour = dateInTz.getHours();
  const isWeekday = SEND_DAYS.includes(day);
  const isWithinHours = hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
  return isWeekday && isWithinHours;
}

function getDayBoundsUtc(dateInTz) {
  const startInTz = new Date(dateInTz);
  startInTz.setHours(0, 0, 0, 0);

  const endInTz = new Date(startInTz);
  endInTz.setDate(endInTz.getDate() + 1);

  const offsetMs = Date.now() - getNowInTimeZone().getTime();
  const startUtc = new Date(startInTz.getTime() + offsetMs);
  const endUtc = new Date(endInTz.getTime() + offsetMs);

  return { startUtc, endUtc };
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
    // Note: messages -> campaign_contacts -> campaigns (not direct relationship)
    const { data: dueMessages, error } = await supabase
      .from('messages')
      .select(`
        *,
        contact:contacts(*),
        campaign_contact:campaign_contacts(*, campaign:campaigns(*)),
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

    const nowInTz = getNowInTimeZone();
    if (!isWithinSendWindow(nowInTz)) {
      console.log(`⏰ Outside send window (${nowInTz.toLocaleString('en-US', { timeZone: TIMEZONE })} ET)`);
      console.log(`   Allowed: Mon-Fri, ${BUSINESS_HOURS_START}am-${BUSINESS_HOURS_END}pm ET`);
      return false;
    }

    // Daily safety cap (global across networking_outreach)
    const { startUtc, endUtc } = getDayBoundsUtc(nowInTz);
    const { count: sentToday, error: sentCountError } = await supabase
      .from('networking_outreach')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', startUtc.toISOString())
      .lt('sent_at', endUtc.toISOString());

    if (sentCountError) {
      console.warn('⚠️  Could not check daily send count:', sentCountError.message);
    } else if ((sentToday || 0) >= MAX_MESSAGES_PER_DAY) {
      console.log(`🛑 Daily limit reached (${sentToday}/${MAX_MESSAGES_PER_DAY}) - skipping send`);
      return false;
    }

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
      
      // Add Unipile error to digest queue
      if (RESEND_API_KEY && NOTIFICATION_EMAIL) {
        try {
          await supabase
            .from('notification_digest_queue')
            .insert({
              notification_type: 'unipile_error',
              contact_name: null,
              contact_linkedin_url: null,
              message_content: `Unipile Connection Issue - LinkedIn Session Expired

Error: ${accountsResponse.status} - ${errorText}

Action Required:
1. Go to your Unipile dashboard
2. Find your LinkedIn account
3. Click "Reconnect" to re-authenticate

The cron job will automatically resume processing once reconnected.`,
              scheduled_at: null,
              sent_at: null,
              result: 'ERROR',
              error_message: `${accountsResponse.status} - ${errorText}`,
              message_id: null
            });
          console.log('📝 Added Unipile error notification to digest queue');
        } catch (emailError) {
          console.warn('⚠️ Failed to add Unipile error notification to queue:', emailError.message);
        }
      }
      
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
    // IMPORTANT: Only from ACTIVE campaigns (not paused, draft, or completed)
    console.log('🔍 Querying for due networking messages from IN_PROGRESS campaigns...');
    const { data: networkingMessages, error } = await supabase
      .from('networking_outreach')
      .select(`
        *,
        linkedin_connections!inner(*),
        networking_campaign_batches!inner(id, name, status)
      `)
      .eq('status', 'pending')
      .eq('networking_campaign_batches.status', 'in_progress')  // CRITICAL: Only in-progress campaigns!
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
    console.log(`📋 Campaign: ${networkingMessages[0].networking_campaign_batches?.name || 'Unknown'}`);
    console.log(`   Campaign Status: ${networkingMessages[0].networking_campaign_batches?.status || 'Unknown'}`);

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

    // Respect do_not_message list (manual block list)
    const orFilters = [`linkedin_id.eq.${connection.linkedin_id}`];
    if (connection.linkedin_url) {
      orFilters.push(`linkedin_url.eq.${connection.linkedin_url}`);
    }

    const { data: blockedList, error: blockedError } = await supabase
      .from('do_not_message')
      .select('id, reason')
      .or(orFilters.join(','))
      .limit(1);

    if (blockedError) {
      console.warn('⚠️  Could not check do_not_message list:', blockedError.message);
    } else if (blockedList && blockedList.length > 0) {
      const reason = blockedList[0].reason || 'Do not message';
      console.log(`⛔ Skipping ${connection.first_name}: ${reason}`);
      await supabase
        .from('networking_outreach')
        .update({
          status: 'skipped',
          skip_reason: `Do not message: ${reason}`
        })
        .eq('id', outreach.id);
      return false; // Skipped due to block list
    }

    // CRITICAL: Check if we've already sent a message to this LinkedIn ID
    // This prevents duplicates when:
    // 1. Same person has multiple connection records (data quality issue)
    // 2. Multiple workers/crons are running simultaneously (race condition)
    // 3. Already sent in THIS campaign (duplicate in same campaign)
    // 4. Already sent in ANOTHER campaign (don't spam across campaigns)
    //
    // NOTE: Manual messages (sent outside campaigns) are NOT tracked in networking_outreach,
    // so they won't block sending. Only campaign messages block.
    console.log(`🔍 Checking for duplicate messages to LinkedIn ID: ${connection.linkedin_id}`);
    
    // Get the campaign ID from the outreach record
    const currentCampaignId = outreach.batch_id;
    
    // Check 1: Same campaign duplicate (most important - prevents sending twice in same campaign)
    const { data: sameCampaignSent, error: sameCampaignError } = await supabase
      .from('networking_outreach')
      .select(`
        id,
        status,
        sent_at,
        batch_id,
        linkedin_connections!inner(linkedin_id)
      `)
      .eq('status', 'sent')
      .not('sent_at', 'is', null)
      .eq('batch_id', currentCampaignId) // Same campaign
      .eq('linkedin_connections.linkedin_id', connection.linkedin_id);

    if (sameCampaignError) {
      console.error(`⚠️  Error checking for same-campaign duplicates:`, sameCampaignError);
    } else if (sameCampaignSent && sameCampaignSent.length > 0) {
      const existingRecord = sameCampaignSent[0];
      console.log(`⚠️  DUPLICATE DETECTED: Already sent message in THIS campaign to LinkedIn ID ${connection.linkedin_id}`);
      console.log(`   Previous message ID: ${existingRecord.id}`);
      console.log(`   Previous sent at: ${existingRecord.sent_at}`);
      console.log(`   Skipping this message to prevent duplicate in same campaign`);
      
      await supabase
        .from('networking_outreach')
        .update({
          status: 'skipped',
          skip_reason: `Duplicate: Already sent in this campaign to LinkedIn ID ${connection.linkedin_id} (previous: ${existingRecord.id})`
        })
        .eq('id', outreach.id);
      
      return false; // Skipped due to duplicate
    }

    // Check 2: Different campaign (prevent sending across multiple campaigns)
    const { data: otherCampaignSent, error: otherCampaignError } = await supabase
      .from('networking_outreach')
      .select(`
        id,
        status,
        sent_at,
        batch_id,
        linkedin_connections!inner(linkedin_id),
        networking_campaign_batches!inner(name)
      `)
      .eq('status', 'sent')
      .not('sent_at', 'is', null)
      .neq('batch_id', currentCampaignId) // Different campaign
      .eq('linkedin_connections.linkedin_id', connection.linkedin_id);

    if (otherCampaignError) {
      console.error(`⚠️  Error checking for other-campaign duplicates:`, otherCampaignError);
      // Continue anyway - better to log the error than block sending
    } else if (otherCampaignSent && otherCampaignSent.length > 0) {
      const existingRecord = otherCampaignSent[0];
      const campaignName = existingRecord.networking_campaign_batches?.name || 'Unknown Campaign';
      console.log(`⚠️  CROSS-CAMPAIGN DETECTED: Already sent message in ANOTHER campaign to LinkedIn ID ${connection.linkedin_id}`);
      console.log(`   Previous campaign: ${campaignName}`);
      console.log(`   Previous message ID: ${existingRecord.id}`);
      console.log(`   Previous sent at: ${existingRecord.sent_at}`);
      console.log(`   Skipping this message to avoid spamming across campaigns`);
      
      await supabase
        .from('networking_outreach')
        .update({
          status: 'skipped',
          skip_reason: `Cross-campaign: Already sent in "${campaignName}" campaign to LinkedIn ID ${connection.linkedin_id} (previous: ${existingRecord.id})`
        })
        .eq('id', outreach.id);
      
      return false; // Skipped due to cross-campaign
    }

    console.log(`✅ No duplicate found - safe to send (no messages in this or other campaigns)`);

    // ATOMIC LOCK: Mark as 'sending' to prevent race conditions
    // This ensures only one process can send to this person
    console.log(`🔒 Acquiring lock (setting status to 'sending')...`);
    const { data: lockResult, error: lockError } = await supabase
      .from('networking_outreach')
      .update({
        status: 'sending',
        updated_at: new Date().toISOString()
      })
      .eq('id', outreach.id)
      .eq('status', 'pending')  // Only if still pending (atomic check)
      .select();

    if (lockError || !lockResult || lockResult.length === 0) {
      console.log(`⚠️  Failed to acquire lock - another process may have taken this message`);
      console.log(`   Lock error: ${lockError?.message || 'No rows updated (status changed)'}`);
      return false; // Skip - another process is handling this
    }
    console.log(`✅ Lock acquired - proceeding with send`);


    await logSendAudit({
      outreach,
      connection,
      stage: 'about_to_send',
      statusBefore: 'pending',
      statusAfter: 'sending',
      statusUpdateSuccess: true
    });

    // Immediate email notifications disabled - using 3x daily digest instead
    // await sendNetworkingLifecycleEmail({
    //   stage: 'about_to_send',
    //   outreach,
    //   connection,
    //   campaignName: outreach.networking_campaign_batches?.name,
    //   statusUpdated: true
    // });

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

      // Extract message ID and chat ID from Unipile response
      // Unipile returns: { id: "message_id", conversation_id: "chat_id", ... }
      const unipileMessageId = result.id || result.message_id;
      const unipileChatId = result.conversation_id || result.chat_id || result.conversationId;

      // Update status with Unipile tracking IDs for webhook matching
      // Only update if we still hold the lock (status = 'sending')
      const sentUpdated = await updateOutreachStatusWithRetry(
        outreach.id,
        'sending',
        {
          status: 'sent',
          sent_at: new Date().toISOString(),
          unipile_message_id: unipileMessageId || null,
          unipile_chat_id: unipileChatId || null
        },
        'mark sent'
      );

      if (!sentUpdated) {
        console.warn(`⚠️  Message was sent but DB update failed for outreach ${outreach.id}`);
      }

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

      await logSendAudit({
        outreach,
        connection,
        stage: 'sent',
        statusBefore: 'sending',
        statusAfter: 'sent',
        statusUpdateSuccess: sentUpdated,
        unipileMessageId,
        unipileChatId
      });

      // Immediate email notifications disabled - using 3x daily digest instead
      // await sendNetworkingLifecycleEmail({
      //   stage: 'sent',
      //   outreach,
      //   connection,
      //   campaignName: outreach.networking_campaign_batches?.name,
      //   statusUpdated: sentUpdated,
      //   unipileMessageId,
      //   unipileChatId
      // });

      // Send success notification (digest queue)
      await sendNetworkingNotification(outreach, connection, { success: true, message_id: result.id });

      console.log(`✅ Networking message sent to ${connection.first_name} ${connection.last_name || ''}`);
      
      // Return true - we processed a message
      return true;

    } catch (error) {
      console.error(`❌ Failed to send networking message:`, error.message);

      // Update status to failed (only if we still hold the lock)
      const failedUpdated = await updateOutreachStatusWithRetry(
        outreach.id,
        'sending',
        {
          status: 'failed',
          skip_reason: error.message
        },
        'mark failed'
      );

      await logSendAudit({
        outreach,
        connection,
        stage: 'failed',
        statusBefore: 'sending',
        statusAfter: 'failed',
        statusUpdateSuccess: failedUpdated,
        errorMessage: error.message
      });

      // Immediate email notifications disabled - using 3x daily digest instead
      // await sendNetworkingLifecycleEmail({
      //   stage: 'failed',
      //   outreach,
      //   connection,
      //   campaignName: outreach.networking_campaign_batches?.name,
      //   statusUpdated: failedUpdated,
      //   error: error.message
      // });

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
  // Access campaign through campaign_contact relationship
  const campaign = message.campaign_contact?.campaign;
  const campaignType = campaign?.campaign_type || 'cold_outreach';

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
          campaign?.id,
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
    // Unipile API expects /emails endpoint with 'to' as array of objects
    const result = await unipileRequest('/emails', 'POST', {
      account_id: message.account.unipile_account_id,
      to: [{ identifier: message.contact.email }], // Array format required
      subject: message.subject,
      body: message.body,
    });

    return {
      success: true,
      message_id: result.tracking_id || result.id || result.provider_id
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

  // Add to digest queue instead of sending immediately
  try {
    await supabase
      .from('notification_digest_queue')
      .insert({
        notification_type: sendResult.success ? 'networking_success' : 'networking_failed',
        contact_name: `${connection.first_name} ${connection.last_name || ''}`.trim(),
        contact_linkedin_url: connection.linkedin_url || null,
        message_content: outreach.personalized_message,
        scheduled_at: outreach.scheduled_at,
        sent_at: sendResult.success ? new Date().toISOString() : null,
        result: sendResult.success ? 'SUCCESS' : 'FAILED',
        error_message: sendResult.error || null,
        message_id: sendResult.message_id || null
      });
    
    console.log(`📝 Added ${sendResult.success ? 'success' : 'failure'} notification to digest queue`);
  } catch (error) {
    console.warn('⚠️ Failed to add notification to digest queue:', error.message);
  }
}

// Build recipient list from NOTIFICATION_EMAIL (comma-separated)
function getNotificationRecipients() {
  return (NOTIFICATION_EMAIL || '')
    .split(',')
    .map(email => email.trim())
    .filter(Boolean);
}

// Send an immediate Resend email (pre-send and post-send alerts)
async function sendImmediateEmail(subject, body) {
  if (!RESEND_API_KEY || !NOTIFICATION_EMAIL) return;

  const recipients = getNotificationRecipients();
  if (recipients.length === 0) return;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'notifications@atherial.ai',
        to: recipients,
        subject,
        text: body
      })
    });

    if (!response.ok) {
      console.warn('⚠️  Resend email failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.warn('⚠️  Resend email error:', error.message);
  }
}

async function logSendAudit({
  outreach,
  connection,
  stage,
  statusBefore,
  statusAfter,
  statusUpdateSuccess,
  unipileMessageId,
  unipileChatId,
  errorMessage,
  metadata
}) {
  try {
    await supabase
      .from('message_send_audit')
      .insert({
        outreach_id: outreach?.id || null,
        campaign_id: outreach?.batch_id || null,
        linkedin_id: connection?.linkedin_id || null,
        linkedin_url: connection?.linkedin_url || null,
        unipile_message_id: unipileMessageId || null,
        unipile_chat_id: unipileChatId || null,
        status_before: statusBefore || null,
        status_after: statusAfter || null,
        stage,
        status_update_success: statusUpdateSuccess ?? null,
        error_message: errorMessage || null,
        metadata: metadata || null
      });
  } catch (error) {
    console.warn('⚠️  Failed to write message_send_audit:', error.message);
  }
}

// Send detailed lifecycle notifications for networking outreach
async function sendNetworkingLifecycleEmail({ stage, outreach, connection, campaignName, statusUpdated, unipileMessageId, unipileChatId, error }) {
  if (!RESEND_API_KEY || !NOTIFICATION_EMAIL) return;

  const stageLabel = stage === 'about_to_send' ? 'ABOUT TO SEND' : stage.toUpperCase();
  const subject = `📨 ${stageLabel}: ${connection.first_name} ${connection.last_name || ''}`.trim();

  const lines = [
    `Stage: ${stageLabel}`,
    `Time (UTC): ${new Date().toISOString()}`,
    `Campaign: ${campaignName || 'Unknown'}`,
    `Outreach ID: ${outreach.id}`,
    `Recipient: ${connection.first_name} ${connection.last_name || ''}`.trim(),
    `LinkedIn ID: ${connection.linkedin_id || 'MISSING'}`,
    `LinkedIn URL: ${connection.linkedin_url || 'MISSING'}`,
    `Scheduled At: ${outreach.scheduled_at || 'MISSING'}`,
    `DB Status Updated: ${statusUpdated === undefined ? 'N/A' : (statusUpdated ? 'YES' : 'NO')}`,
    unipileMessageId ? `Unipile Message ID: ${unipileMessageId}` : null,
    unipileChatId ? `Unipile Chat ID: ${unipileChatId}` : null,
    error ? `Error: ${error}` : null,
    '',
    'Message Preview:',
    (outreach.personalized_message || '').slice(0, 600)
  ].filter(Boolean);

  await sendImmediateEmail(subject, lines.join('\n'));
}

async function notifyViaEmail(message, sendResult) {
  if (!RESEND_API_KEY || !NOTIFICATION_EMAIL) return; // Optional

  // Add to digest queue instead of sending immediately
  try {
    const campaign = message.campaign_contact?.campaign;
    await supabase
      .from('notification_digest_queue')
      .insert({
        notification_type: sendResult.success ? 'message_success' : 'message_failed',
        contact_name: message.contact ? `${message.contact.first_name} ${message.contact.last_name}`.trim() : 'Unknown',
        contact_linkedin_url: message.contact?.linkedin_url || null,
        message_content: message.body,
        scheduled_at: message.scheduled_at,
        sent_at: sendResult.success ? new Date().toISOString() : null,
        result: sendResult.success ? 'SUCCESS' : 'FAILED',
        error_message: sendResult.error || null,
        message_id: sendResult.message_id || null
      });
    
    console.log(`📝 Added ${sendResult.success ? 'success' : 'failure'} notification to digest queue`);
  } catch (error) {
    console.warn('⚠️ Failed to add notification to digest queue:', error.message);
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

// Check if it's time to send digest email (every 3 hours: 9am, 12pm, 3pm, 6pm, 9pm ET on weekdays)
async function shouldSendDigest() {
  try {
    // Get current time in ET
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const etHour = etTime.getHours();
    const etMinute = etTime.getMinutes();
    const etDay = etTime.getDay();

    // Weekdays only (Mon-Fri)
    if (![1, 2, 3, 4, 5].includes(etDay)) {
      return false;
    }
    
    // Define digest slots (every 3 hours: 9am, 12pm, 3pm, 6pm, 9pm ET)
    const digestSlots = [
      { hour: 9, minute: 0 },
      { hour: 12, minute: 0 },
      { hour: 15, minute: 0 },  // 3pm ET
      { hour: 18, minute: 0 },
      { hour: 21, minute: 0 }
    ];

    // Send within 5-minute window of each slot
    const nowTotalMinutes = etHour * 60 + etMinute;
    const isWithinAnySlotWindow = digestSlots.some(s => {
      const slotMinutes = s.hour * 60 + s.minute;
      return nowTotalMinutes >= slotMinutes && nowTotalMinutes < slotMinutes + 5;
    });

    if (!isWithinAnySlotWindow) {
      return false;
    }
    
    // Check if we already sent a digest for this hour today
    const { data: metadata } = await supabase
      .from('notification_digest_metadata')
      .select('last_digest_sent_at')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (!metadata) {
      // Initialize metadata if it doesn't exist
      await supabase
        .from('notification_digest_metadata')
        .insert({
          id: '00000000-0000-0000-0000-000000000001',
          last_digest_sent_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
          digest_interval_hours: 3 // Updated to 3 hours
        });
      return true; // Send first digest
    }

    const lastDigestTime = new Date(metadata.last_digest_sent_at);
    const lastDigestET = new Date(lastDigestTime.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    // Check if we already sent today in this same digest window
    const sameDay = lastDigestET.getDate() === etTime.getDate() && 
                   lastDigestET.getMonth() === etTime.getMonth() &&
                   lastDigestET.getFullYear() === etTime.getFullYear();
    const sameMinuteBucket = Math.floor(lastDigestET.getMinutes() / 5) === Math.floor(etMinute / 5);
    const sameHour = lastDigestET.getHours() === etHour;
    
    if (sameDay && sameHour && sameMinuteBucket) {
      return false; // Already sent in this window
    }
    
    return true; // Time to send!
  } catch (error) {
    console.warn('⚠️ Error checking digest schedule:', error.message);
    return false; // Don't send if we can't check
  }
}

// Send digest email with all queued notifications
async function sendDigestEmail() {
  if (!RESEND_API_KEY || !NOTIFICATION_EMAIL) {
    console.log('⚠️  Digest email disabled (missing RESEND_API_KEY or NOTIFICATION_EMAIL)');
    return;
  }

  try {
    // Only include notifications since last digest
    const { data: metadata } = await supabase
      .from('notification_digest_metadata')
      .select('last_digest_sent_at')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    const lastDigestSentAt = metadata?.last_digest_sent_at
      ? new Date(metadata.last_digest_sent_at).toISOString()
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // fallback: last 24h

    // Get queued notifications since last digest
    const { data: notifications, error } = await supabase
      .from('notification_digest_queue')
      .select('*')
      .gte('created_at', lastDigestSentAt)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching digest queue:', error);
      return;
    }

    if (!notifications || notifications.length === 0) {
      console.log('📭 No notifications in digest queue');
      return;
    }

    // Group notifications by type
    const networkingSuccess = notifications.filter(n => n.notification_type === 'networking_success');
    const networkingFailed = notifications.filter(n => n.notification_type === 'networking_failed');
    const messageSuccess = notifications.filter(n => n.notification_type === 'message_success');
    const messageFailed = notifications.filter(n => n.notification_type === 'message_failed');
    const unipileErrors = notifications.filter(n => n.notification_type === 'unipile_error');

    const totalCount = notifications.length;
    const successCount = networkingSuccess.length + messageSuccess.length;
    const failedCount = networkingFailed.length + messageFailed.length;
    const errorCount = unipileErrors.length;

    // Get daily stats (messages sent today, remaining, last scheduled)
    const nowInTz = getNowInTimeZone();
    const { startUtc, endUtc } = getDayBoundsUtc(nowInTz);
    
    // Count messages sent today
    const { count: sentToday, error: sentTodayError } = await supabase
      .from('networking_outreach')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', startUtc.toISOString())
      .lt('sent_at', endUtc.toISOString());
    
    // Count pending messages scheduled for today
    const { count: pendingToday, error: pendingTodayError } = await supabase
      .from('networking_outreach')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', startUtc.toISOString())
      .lt('scheduled_at', endUtc.toISOString());
    
    // Get last scheduled message time today
    const { data: lastScheduled, error: lastScheduledError } = await supabase
      .from('networking_outreach')
      .select('scheduled_at')
      .eq('status', 'pending')
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', startUtc.toISOString())
      .lt('scheduled_at', endUtc.toISOString())
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const lastMessageTime = lastScheduled?.scheduled_at 
      ? new Date(lastScheduled.scheduled_at).toLocaleString('en-US', { 
          timeZone: 'America/New_York', 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }) + ' ET'
      : 'No more messages scheduled today';

    // Build digest email body
    const now = new Date();
    const generatedTimeET = now.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'short' });
    
    let body = `📊 Message Digest Report\n`;
    body += `⏰ Period: Since last digest (every 3 hours)\n`;
    body += `📅 Generated: ${generatedTimeET} ET\n\n`;
    
    // Daily stats section
    body += `📈 Today's Progress (${nowInTz.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}):\n`;
    body += `• Messages sent today: ${sentToday || 0}\n`;
    body += `• Messages remaining today: ${pendingToday || 0}\n`;
    body += `• Last message scheduled: ${lastMessageTime}\n\n`;
    
    body += `📊 This Digest Period:\n`;
    body += `• Total notifications: ${totalCount}\n`;
    body += `• ✅ Successful sends: ${successCount}\n`;
    body += `• ❌ Failed sends: ${failedCount}\n`;
    body += `• ⚠️  Errors: ${errorCount}\n\n`;

    if (networkingSuccess.length > 0) {
      body += `\n✅ Networking Messages Sent (${networkingSuccess.length}):\n`;
      body += '─'.repeat(60) + '\n';
      networkingSuccess.forEach((n, i) => {
        body += `${i + 1}. ${n.contact_name || 'Unknown'}\n`;
        if (n.sent_at) {
          // Format timestamp in local timezone (not UTC)
          const sentDate = new Date(n.sent_at);
          body += `   Sent: ${sentDate.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'short' })} ET\n`;
        } else {
          body += `   Sent: N/A\n`;
        }
        if (n.contact_linkedin_url) {
          body += `   LinkedIn: ${n.contact_linkedin_url}\n`;
        }
        body += '\n';
      });
    }

    if (networkingFailed.length > 0) {
      body += `\n❌ Networking Messages Failed (${networkingFailed.length}):\n`;
      body += '─'.repeat(60) + '\n';
      networkingFailed.forEach((n, i) => {
        body += `${i + 1}. ${n.contact_name || 'Unknown'}\n`;
        body += `   Error: ${n.error_message || 'Unknown error'}\n`;
        if (n.contact_linkedin_url) {
          body += `   LinkedIn: ${n.contact_linkedin_url}\n`;
        }
        body += '\n';
      });
    }

    if (messageSuccess.length > 0) {
      body += `\n✅ Regular Messages Sent (${messageSuccess.length}):\n`;
      body += '─'.repeat(60) + '\n';
      messageSuccess.forEach((n, i) => {
        body += `${i + 1}. ${n.contact_name || 'Unknown'}\n`;
        if (n.sent_at) {
          const sentDate = new Date(n.sent_at);
          body += `   Sent: ${sentDate.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'short' })} ET\n`;
        } else {
          body += `   Sent: N/A\n`;
        }
        body += '\n';
      });
    }

    if (messageFailed.length > 0) {
      body += `\n❌ Regular Messages Failed (${messageFailed.length}):\n`;
      body += '─'.repeat(60) + '\n';
      messageFailed.forEach((n, i) => {
        body += `${i + 1}. ${n.contact_name || 'Unknown'}\n`;
        body += `   Error: ${n.error_message || 'Unknown error'}\n\n`;
      });
    }

    if (unipileErrors.length > 0) {
      body += `\n⚠️  Unipile Connection Errors (${unipileErrors.length}):\n`;
      body += '─'.repeat(60) + '\n';
      unipileErrors.forEach((n, i) => {
        body += `${i + 1}. ${n.error_message || 'Unknown error'}\n`;
        const errorDate = new Date(n.created_at);
        body += `   Time: ${errorDate.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'short' })} ET\n\n`;
      });
    }

    body += '\n─'.repeat(60) + '\n';
    body += 'This is a digest email sent every 3 hours on weekdays (9am, 12pm, 3pm, 6pm, 9pm ET).\n';
    body += 'Individual notifications are batched to reduce email volume.\n';

    // Send digest email
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'notifications@atherial.ai',
        to: [NOTIFICATION_EMAIL],
        subject: `📊 Message Digest: ${successCount} sent, ${failedCount} failed`,
        text: body
      })
    });

    if (response.ok) {
      console.log(`✅ Digest email sent with ${totalCount} notifications`);
      
      // Clear only the notifications included in this digest
      const idsToDelete = notifications.map(n => n.id).filter(Boolean);
      if (idsToDelete.length > 0) {
        await supabase
          .from('notification_digest_queue')
          .delete()
          .in('id', idsToDelete);
      }

      // Update last digest sent time
      await supabase
        .from('notification_digest_metadata')
        .update({
          last_digest_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');
    } else {
      console.error('❌ Failed to send digest email:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error sending digest email:', error.message);
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

  // Add random delay (15-120 seconds) to avoid predictable send patterns
  // This prevents LinkedIn from detecting automation based on exact timing
  await applyCronJitter();

  // Cron test email disabled - only send notifications when messages are actually sent
  // await sendCronTestEmail();

  try {
    await processDueMessages();
    console.log('✅ Processing complete');
    
    // Check if it's time to send digest email (every 3 hours: 9am, 12pm, 3pm, 6pm, 9pm ET on weekdays)
    if (await shouldSendDigest()) {
      console.log('📧 Time to send digest email...');
      await sendDigestEmail();
    } else {
      // Show next digest time
      const now = new Date();
      const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const etHour = etTime.getHours();
      const etMinute = etTime.getMinutes();
      
      // Find next digest time: 9am, 12pm, 3pm, 6pm, 9pm ET (weekdays, every 3 hours)
      const digestSlots = [
        { hour: 9, minute: 0 },
        { hour: 12, minute: 0 },
        { hour: 15, minute: 0 },  // 3pm ET
        { hour: 18, minute: 0 },
        { hour: 21, minute: 0 }
      ];

      const nowMinutes = etHour * 60 + etMinute;
      let next = digestSlots.find(s => (s.hour * 60 + s.minute) > nowMinutes);

      if (!next) {
        // Next is tomorrow at 9am
        next = digestSlots[0];
        etTime.setDate(etTime.getDate() + 1);
      }

      etTime.setHours(next.hour, next.minute, 0, 0);
      
      const nextDigestET = etTime.toLocaleString('en-US', { 
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      console.log(`📭 Next digest email will be sent at: ${nextDigestET} ET`);
    }
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
