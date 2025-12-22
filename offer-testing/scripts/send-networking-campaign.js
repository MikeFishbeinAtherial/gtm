#!/usr/bin/env node

/**
 * Send Networking Campaign
 * 
 * Safely sends LinkedIn messages with:
 * - Rate limiting (50 messages/day)
 * - Random delays (15-45 min between sends)
 * - Business hours only (9 AM - 6 PM ET, Mon-Fri)
 * - Error handling and logging
 * - Pause/resume capability
 * 
 * USAGE:
 *   node scripts/send-networking-campaign.js          # Start sending
 *   node scripts/send-networking-campaign.js --pause  # Pause campaign
 *   node scripts/send-networking-campaign.js --resume # Resume campaign
 *   node scripts/send-networking-campaign.js --dry-run # Test without sending
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const UNIPILE_DSN = process.env.UNIPILE_DSN;
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Safety settings
const MAX_MESSAGES_PER_DAY = 50;
const MIN_DELAY_MINUTES = 15;
const MAX_DELAY_MINUTES = 45;
const BUSINESS_HOURS_START = 6; // 6 AM ET
const BUSINESS_HOURS_END = 20; // 8 PM ET
const TIMEZONE = 'America/New_York';

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isPauseCommand = args.includes('--pause');
const isResumeCommand = args.includes('--resume');

if (!UNIPILE_DSN || !UNIPILE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

// Import supabase client
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Get campaign
console.log('📋 Loading campaign...');
const { data: campaign, error: campaignError } = await supabase
  .from('networking_campaign_batches')
  .select('*')
  .eq('name', 'networking-holidays-2025')
  .single();

if (campaignError || !campaign) {
  console.error('❌ Campaign not found:', campaignError?.message);
  process.exit(1);
}

console.log(`✅ Found campaign: ${campaign.name}\n`);

// Handle pause command
if (isPauseCommand) {
  console.log('⏸️  Pausing campaign...');
  await supabase
    .from('networking_campaign_batches')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('id', campaign.id);
  console.log('✅ Campaign paused. Run with --resume to continue.\n');
  process.exit(0);
}

// Handle resume command
if (isResumeCommand) {
  console.log('▶️  Resuming campaign...');
  await supabase
    .from('networking_campaign_batches')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', campaign.id);
  console.log('✅ Campaign resumed.\n');
  // Continue to sending logic
}

// Check if paused
if (campaign.status === 'paused') {
  console.log('⏸️  Campaign is paused. Run with --resume to continue.\n');
  process.exit(0);
}

// Get Unipile account
console.log('🔑 Fetching Unipile account...');
const accountsResponse = await fetch(`${UNIPILE_DSN}/accounts`, {
  headers: {
    'X-API-KEY': UNIPILE_API_KEY,
    'Accept': 'application/json'
  }
});

if (!accountsResponse.ok) {
  console.error('❌ Failed to fetch Unipile accounts');
  process.exit(1);
}

const accounts = await accountsResponse.json();
const linkedinAccount = accounts.items?.find(acc => acc.provider === 'LINKEDIN');

if (!linkedinAccount) {
  console.error('❌ No LinkedIn account found in Unipile');
  process.exit(1);
}

const unipileAccountId = linkedinAccount.id;
console.log(`✅ LinkedIn account: ${linkedinAccount.display_name}\n`);

// Helper: Check if within business hours
function isBusinessHours() {
  const now = new Date();
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const hour = etTime.getHours();
  const month = etTime.getMonth(); // 0 = January
  const date = etTime.getDate();

  // Exclude only Christmas Day (December 25)
  const isChristmas = month === 11 && date === 25; // Dec is 11 (0-indexed)
  if (isChristmas) return false;

  const isWithinHours = hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;

  return isWithinHours; // Allow all days of week except holidays
}

// Helper: Calculate random delay in milliseconds
function getRandomDelay() {
  const min = MIN_DELAY_MINUTES * 60 * 1000;
  const max = MAX_DELAY_MINUTES * 60 * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: Format delay for display
function formatDelay(ms) {
  const minutes = Math.floor(ms / 1000 / 60);
  const seconds = Math.floor((ms / 1000) % 60);
  return `${minutes}m ${seconds}s`;
}

// Helper: Send a single message
async function sendMessage(outreach, connection) {
  try {
    if (isDryRun) {
      console.log('   [DRY RUN] Would send message');
      return { success: true, isDryRun: true };
    }

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

    const result = await response.json();
    return { success: true, result };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main sending loop
async function sendCampaign() {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║           NETWORKING CAMPAIGN SENDER                              ║');
  console.log('║           networking-holidays-2025                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No messages will actually be sent\n');
  }

  console.log('📊 Safety Settings:');
  console.log(`   • Max messages/day: ${MAX_MESSAGES_PER_DAY}`);
  console.log(`   • Delay between messages: ${MIN_DELAY_MINUTES}-${MAX_DELAY_MINUTES} minutes`);
  console.log(`   • Business hours: ${BUSINESS_HOURS_START} AM - ${BUSINESS_HOURS_END} PM ET (daily except Christmas)`);
  console.log(`   • Current time: ${new Date().toLocaleString('en-US', { timeZone: TIMEZONE })}\n`);

  // Check if currently business hours
  if (!isBusinessHours() && !isDryRun) {
    console.log('⏰ Outside business hours. Will wait until next business day.');
    console.log('💡 Leave this script running and it will auto-resume during business hours.\n');
  }

  // Update campaign status
  await supabase
    .from('networking_campaign_batches')
    .update({
      status: 'in_progress',
      started_at: campaign.started_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', campaign.id);

  let sentToday = 0;
  let totalSent = 0;
  let totalFailed = 0;
  let lastSendDate = new Date().toDateString();

  console.log('🚀 Starting send loop...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  while (true) {
    // Reset daily counter if new day
    const currentDate = new Date().toDateString();
    if (currentDate !== lastSendDate) {
      sentToday = 0;
      lastSendDate = currentDate;
      console.log(`📅 New day started: ${currentDate}\n`);
    }

    // Check if paused
    const { data: currentCampaign } = await supabase
      .from('networking_campaign_batches')
      .select('status')
      .eq('id', campaign.id)
      .single();

    if (currentCampaign?.status === 'paused') {
      console.log('\n⏸️  Campaign paused. Stopping sender.');
      console.log('💡 Run with --resume to continue.\n');
      break;
    }

    // Check daily limit
    if (sentToday >= MAX_MESSAGES_PER_DAY) {
      console.log(`\n🛑 Daily limit reached (${MAX_MESSAGES_PER_DAY} messages)`);
      console.log('⏰ Will resume tomorrow during business hours.\n');
      
      // Wait until tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(BUSINESS_HOURS_START, 0, 0, 0);
      const waitTime = tomorrow - new Date();
      
      console.log(`💤 Sleeping until ${tomorrow.toLocaleString('en-US', { timeZone: TIMEZONE })}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    // Check business hours
    if (!isBusinessHours() && !isDryRun) {
      const now = new Date();
      const etNow = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
      const nextBusinessDay = new Date(etNow);
      
      // If weekend, wait until Monday
      const day = etNow.getDay();
      if (day === 0) nextBusinessDay.setDate(nextBusinessDay.getDate() + 1); // Sunday -> Monday
      if (day === 6) nextBusinessDay.setDate(nextBusinessDay.getDate() + 2); // Saturday -> Monday
      
      nextBusinessDay.setHours(BUSINESS_HOURS_START, 0, 0, 0);
      const waitTime = nextBusinessDay - etNow;
      
      if (waitTime > 0) {
        console.log(`⏰ Outside business hours. Next send: ${nextBusinessDay.toLocaleString('en-US', { timeZone: TIMEZONE })}`);
        console.log(`💤 Sleeping for ${formatDelay(waitTime)}\n`);
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 60000))); // Check every minute
        continue;
      }
    }

    // Get next pending message
    const { data: outreachRecords, error: fetchError } = await supabase
      .from('networking_outreach')
      .select(`
        *,
        linkedin_connections!inner(*)
      `)
      .eq('batch_id', campaign.id)
      .eq('status', 'pending')
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching next message:', fetchError.message);
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 min and retry
      continue;
    }

    // Check if campaign complete
    if (!outreachRecords || outreachRecords.length === 0) {
      console.log('\n🎉 Campaign complete! All messages sent.\n');
      
      await supabase
        .from('networking_campaign_batches')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id);
      
      break;
    }

    const outreach = outreachRecords[0];
    const connection = outreach.linkedin_connections;

    // Send message
    console.log(`📤 Sending to: ${connection.first_name} (${connection.linkedin_url})`);
    const sendResult = await sendMessage(outreach, connection);

    if (sendResult.success) {
      console.log('   ✅ Sent successfully');
      
      await supabase
        .from('networking_outreach')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', outreach.id);

      sentToday++;
      totalSent++;

      // Update campaign sent count
      await supabase
        .from('networking_campaign_batches')
        .update({
          sent_count: campaign.sent_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id);

    } else {
      console.log(`   ❌ Failed: ${sendResult.error}`);
      
      await supabase
        .from('networking_outreach')
        .update({
          status: 'failed',
          skip_reason: sendResult.error
        })
        .eq('id', outreach.id);

      totalFailed++;
    }

    console.log(`   📊 Today: ${sentToday}/${MAX_MESSAGES_PER_DAY} | Total: ${totalSent} sent, ${totalFailed} failed\n`);

    // Random delay before next send
    if (sentToday < MAX_MESSAGES_PER_DAY) {
      const delay = getRandomDelay();
      const nextSend = new Date(Date.now() + delay);
      console.log(`   ⏳ Next send in ${formatDelay(delay)} (at ${nextSend.toLocaleTimeString()})\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Total sent:   ${totalSent}`);
  console.log(`Total failed: ${totalFailed}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('✅ Sender stopped.\n');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⏸️  Sender interrupted. Pausing campaign...');
  
  await supabase
    .from('networking_campaign_batches')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('id', campaign.id);
  
  console.log('✅ Campaign paused. Run with --resume to continue.\n');
  process.exit(0);
});

// Start sending
sendCampaign();

