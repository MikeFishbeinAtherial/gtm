#!/usr/bin/env node

/**
 * Campaign Worker - Runs Continuously on Railway
 * 
 * This script runs continuously and checks for pending messages to send.
 * It respects rate limits, business hours, and can be paused via Supabase.
 * 
 * Designed to run as a long-running process on Railway.
 * 
 * USAGE:
 *   node scripts/campaign-worker.js
 * 
 * This will:
 * - Run continuously (never exits)
 * - Check for pending messages every minute
 * - Send messages respecting rate limits
 * - Auto-pause outside business hours
 * - Respect campaign pause status in Supabase
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Also load from Railway environment
dotenv.config();

const UNIPILE_DSN = process.env.UNIPILE_DSN;
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_SERVICE_KEY;

// Notification settings
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Track notification state
let dailyLimitNotified = false;

// Safety settings (same as send-networking-campaign.js)
const MAX_MESSAGES_PER_DAY = 50;
const MIN_DELAY_MINUTES = 15;
const MAX_DELAY_MINUTES = 45;
const BUSINESS_HOURS_START = 6; // 6 AM ET
const BUSINESS_HOURS_END = 20; // 8 PM ET
const TIMEZONE = 'America/New_York';
const CHECK_INTERVAL_MS = 60000; // Check every minute

if (!UNIPILE_DSN || !UNIPILE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Helper functions (same as send-networking-campaign.js)
function isBusinessHours() {
  const now = new Date();
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const hour = etTime.getHours();
  const month = etTime.getMonth();
  const date = etTime.getDate();

  const isChristmas = month === 11 && date === 25;
  if (isChristmas) return false;

  const isWithinHours = hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
  return isWithinHours;
}

function getRandomDelay() {
  const min = MIN_DELAY_MINUTES * 60 * 1000;
  const max = MAX_DELAY_MINUTES * 60 * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDelay(ms) {
  const minutes = Math.floor(ms / 1000 / 60);
  const seconds = Math.floor((ms / 1000) % 60);
  return `${minutes}m ${seconds}s`;
}

// Send email notification via Resend
async function sendNotification(subject, body) {
  if (!NOTIFICATION_EMAIL || !RESEND_API_KEY) {
    console.log('⚠️  Notifications disabled (missing NOTIFICATION_EMAIL or RESEND_API_KEY)');
    return;
  }

  try {
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

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.status}`);
    }

    console.log('📧 Notification sent successfully');
  } catch (error) {
    console.warn('⚠️  Failed to send notification:', error.message);
  }
}

async function sendMessage(outreach, connection, unipileAccountId) {
  try {
    const response = await fetch(`${UNIPILE_DSN}/chats`, {
      method: 'POST',
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        account_id: unipileAccountId,
        attendees_ids: [connection.linkedin_id],
        text: outreach.personalized_message,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorBody)}`);
    }

    return { success: true, result: await response.json() };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Main worker loop
async function runWorker() {
  console.log('🚀 Campaign Worker Starting...\n');
  console.log('📊 Safety Settings:');
  console.log(`   • Max messages/day: ${MAX_MESSAGES_PER_DAY}`);
  console.log(`   • Delay between messages: ${MIN_DELAY_MINUTES}-${MAX_DELAY_MINUTES} minutes`);
  console.log(`   • Business hours: ${BUSINESS_HOURS_START} AM - ${BUSINESS_HOURS_END} PM ET (daily except Christmas)`);
  console.log(`   • Check interval: ${CHECK_INTERVAL_MS / 1000} seconds\n`);

  // Send startup notification
  await sendNotification(
    '🚀 Campaign Worker Started',
    `Campaign worker has started successfully.\n\nSafety Settings:\n• Max messages/day: ${MAX_MESSAGES_PER_DAY}\n• Delay: ${MIN_DELAY_MINUTES}-${MAX_DELAY_MINUTES} minutes\n• Business hours: ${BUSINESS_HOURS_START} AM - ${BUSINESS_HOURS_END} PM ET\n• Check interval: ${CHECK_INTERVAL_MS / 1000} seconds`
  );

  // Get Unipile account
  const accountsResponse = await fetch(`${UNIPILE_DSN}/accounts`, {
    headers: {
      'X-API-KEY': UNIPILE_API_KEY,
      'Accept': 'application/json'
    }
  });

  const accounts = await accountsResponse.json();
  const linkedinAccount = accounts.items?.find(acc => 
    (acc.provider || acc.type || acc.platform || '').toUpperCase() === 'LINKEDIN'
  );

  if (!linkedinAccount) {
    console.error('❌ No LinkedIn account found');
    process.exit(1);
  }

  const unipileAccountId = linkedinAccount.id;
  console.log(`✅ LinkedIn account: ${linkedinAccount.name || linkedinAccount.id}\n`);

  // Get campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('networking_campaign_batches')
    .select('*')
    .eq('name', 'networking-holidays-2025')
    .single();

  if (campaignError || !campaign) {
    console.error('❌ Campaign not found:', campaignError?.message);
    process.exit(1);
  }

  let sentToday = 0;
  let lastSendDate = new Date().toDateString();
  let lastSendTime = 0;

  console.log('✅ Worker ready. Checking for messages...\n');

  // Main loop - runs continuously
  while (true) {
    try {
      // Reset daily counter if new day
      const currentDate = new Date().toDateString();
      if (currentDate !== lastSendDate) {
        sentToday = 0;
        lastSendDate = currentDate;
        dailyLimitNotified = false; // Reset notification flag for new day
        console.log(`📅 New day: ${currentDate} (counter reset)\n`);
      }

      // Check campaign status
      const { data: currentCampaign } = await supabase
        .from('networking_campaign_batches')
        .select('status')
        .eq('id', campaign.id)
        .single();

      if (currentCampaign?.status === 'paused') {
        console.log('⏸️  Campaign paused. Waiting...');
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
        continue;
      }

      if (currentCampaign?.status === 'completed') {
        console.log('✅ Campaign completed!');
        break;
      }

      // Check daily limit
      if (sentToday >= MAX_MESSAGES_PER_DAY) {
        console.log(`🛑 Daily limit reached (${sentToday}/${MAX_MESSAGES_PER_DAY})`);

        // Send daily limit notification (only once per day)
        if (!dailyLimitNotified) {
          await sendNotification(
            '🛑 Daily Message Limit Reached',
            `Campaign worker has reached the daily limit of ${MAX_MESSAGES_PER_DAY} messages.\n\nSent today: ${sentToday}\nCampaign will resume tomorrow.\n\nThe worker will continue checking but won't send new messages until the daily counter resets.`
          );
          dailyLimitNotified = true;
        }

        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
        continue;
      }

      // Check business hours
      if (!isBusinessHours()) {
        const now = new Date();
        const etNow = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
        console.log(`⏰ Outside business hours (${etNow.toLocaleTimeString('en-US', { timeZone: TIMEZONE })} ET)`);
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
        continue;
      }

      // Check if enough time has passed since last send
      const timeSinceLastSend = Date.now() - lastSendTime;
      if (lastSendTime > 0 && timeSinceLastSend < MIN_DELAY_MINUTES * 60 * 1000) {
        const waitTime = (MIN_DELAY_MINUTES * 60 * 1000) - timeSinceLastSend;
        console.log(`⏳ Waiting ${formatDelay(waitTime)} before next send...`);
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, CHECK_INTERVAL_MS)));
        continue;
      }

      // Get next pending message that's scheduled and due
      const { data: outreachRecords, error: fetchError } = await supabase
        .from('networking_outreach')
        .select(`
          *,
          linkedin_connections!inner(*)
        `)
        .eq('batch_id', campaign.id)
        .eq('status', 'pending')
        .not('scheduled_at', 'is', null)
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1);

      if (fetchError) {
        console.error('❌ Error fetching message:', fetchError.message);
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
        continue;
      }

      if (!outreachRecords || outreachRecords.length === 0) {
        console.log('✅ No pending messages. Campaign complete!');

        await supabase
          .from('networking_campaign_batches')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign.id);

        // Send completion notification
        await sendNotification(
          '✅ Campaign Completed Successfully',
          `Networking campaign "${campaign.name}" has completed!\n\nFinal Stats:\n• Total messages sent: ${campaign.sent_count}\n• Campaign completed at: ${new Date().toISOString()}\n\nThe worker will now stop.`
        );

        break;
      }

      const outreach = outreachRecords[0];
      const connection = outreach.linkedin_connections;

      // Skip if no valid member_id
      if (!connection.linkedin_id || connection.linkedin_id.startsWith('temp_')) {
        console.log(`⚠️  Skipping ${connection.first_name}: No valid member_id`);
        await supabase
          .from('networking_outreach')
          .update({
            status: 'skipped',
            skip_reason: 'No valid member_id'
          })
          .eq('id', outreach.id);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
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
        .eq('batch_id', campaign.id) // Same campaign
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
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
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
        .neq('batch_id', campaign.id) // Different campaign
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
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      console.log(`✅ No duplicate found - safe to send (no messages in this or other campaigns)`);

      // Send message
      console.log(`📤 Sending to: ${connection.first_name} ${connection.last_name || ''}`);
      const sendResult = await sendMessage(outreach, connection, unipileAccountId);

      if (sendResult.success) {
        console.log('   ✅ Sent successfully');
        
        await supabase
          .from('networking_outreach')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', outreach.id);

        await supabase
          .from('networking_campaign_batches')
          .update({
            sent_count: campaign.sent_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign.id);

        sentToday++;
        lastSendTime = Date.now();

        console.log(`   📊 Today: ${sentToday}/${MAX_MESSAGES_PER_DAY} | Total: ${campaign.sent_count + 1}\n`);

        // Random delay before next send
        const delay = getRandomDelay();
        const nextSend = new Date(Date.now() + delay);
        console.log(`   ⏳ Next send in ${formatDelay(delay)} (at ${nextSend.toLocaleTimeString()})\n`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.log(`   ❌ Failed: ${sendResult.error}`);

        await supabase
          .from('networking_outreach')
          .update({
            status: 'failed',
            skip_reason: sendResult.error
          })
          .eq('id', outreach.id);

        // Send failure notification
        await sendNotification(
          '❌ Message Send Failed',
          `Failed to send message to ${connection.first_name} ${connection.last_name}\n\nError: ${sendResult.error}\n\nMessage ID: ${outreach.id}\nRecipient: ${connection.linkedin_url}\n\nThe worker will continue with the next message.`
        );

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error in worker loop:', errorMessage);
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
    }
  }

  console.log('✅ Worker stopped.');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⏸️  Worker stopping gracefully...');
  await sendNotification(
    '⏸️ Campaign Worker Stopped',
    'Campaign worker was stopped manually (SIGINT).\n\nThe worker can be restarted to resume sending messages.'
  );
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n⏸️  Worker stopping gracefully...');
  await sendNotification(
    '⏸️ Campaign Worker Stopped',
    'Campaign worker was stopped (SIGTERM).\n\nThis usually happens when Railway restarts the service.'
  );
  process.exit(0);
});

// Start worker
runWorker().catch(async error => {
  console.error('❌ Fatal error:', error);
  await sendNotification(
    '❌ Campaign Worker Fatal Error',
    `Campaign worker encountered a fatal error and stopped.\n\nError: ${error.message}\n\nStack trace:\n${error.stack}\n\nManual intervention required to restart the worker.`
  );
  process.exit(1);
});

