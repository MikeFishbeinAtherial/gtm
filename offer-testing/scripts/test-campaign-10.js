#!/usr/bin/env node

/**
 * Test Campaign - Send 10 Messages Only
 * 
 * This script sends exactly 10 messages to test the campaign.
 * Perfect for verifying rate limits and spacing work correctly.
 * 
 * USAGE:
 *   node scripts/test-campaign-10.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const UNIPILE_DSN = process.env.UNIPILE_DSN;
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SECRET_KEY 
  || process.env.SUPABASE_SERVICE_KEY;

const TEST_LIMIT = 10; // Only send 10 messages
const MIN_DELAY_MINUTES = 15;
const MAX_DELAY_MINUTES = 45;

if (!UNIPILE_DSN || !UNIPILE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🧪 TEST CAMPAIGN - 10 Messages Only\n');
console.log('📊 Safety Settings:');
console.log(`   • Test limit: ${TEST_LIMIT} messages`);
console.log(`   • Delay between messages: ${MIN_DELAY_MINUTES}-${MAX_DELAY_MINUTES} minutes`);
console.log(`   • This will take approximately ${TEST_LIMIT * 30} minutes (${TEST_LIMIT * 30 / 60} hours)\n`);

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

console.log(`✅ Campaign: ${campaign.name}\n`);

// Helper functions
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

async function sendMessage(outreach, connection) {
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
    return { success: false, error: error.message };
  }
}

// Main test loop
console.log('🚀 Starting test send...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let sent = 0;
let failed = 0;
const startTime = Date.now();

while (sent < TEST_LIMIT) {
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
    console.error('❌ Error fetching message:', fetchError.message);
    break;
  }

  if (!outreachRecords || outreachRecords.length === 0) {
    console.log('✅ No more pending messages');
    break;
  }

  const outreach = outreachRecords[0];
  const connection = outreach.linkedin_connections;

  // Skip if no valid member_id - but keep looking for valid ones
  if (!connection.linkedin_id || connection.linkedin_id.startsWith('temp_')) {
    // Skip this one and continue to next
    await supabase
      .from('networking_outreach')
      .update({
        status: 'skipped',
        skip_reason: 'No valid member_id (test mode)'
      })
      .eq('id', outreach.id);
    continue; // Skip to next message
  }

  // Send message
  console.log(`📤 [${sent + 1}/${TEST_LIMIT}] Sending to: ${connection.first_name} ${connection.last_name || ''}`);
  console.log(`   URL: ${connection.linkedin_url}`);
  
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

    await supabase
      .from('networking_campaign_batches')
      .update({
        sent_count: campaign.sent_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaign.id);

    sent++;

    // Random delay before next send (except for last message)
    if (sent < TEST_LIMIT) {
      const delay = getRandomDelay();
      const nextSend = new Date(Date.now() + delay);
      console.log(`   ⏳ Next send in ${formatDelay(delay)} (at ${nextSend.toLocaleTimeString()})\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  } else {
    console.log(`   ❌ Failed: ${sendResult.error}`);
    
    await supabase
      .from('networking_outreach')
      .update({
        status: 'failed',
        skip_reason: sendResult.error
      })
      .eq('id', outreach.id);

    failed++;
    
    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
  }
}

const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('📊 TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`Messages sent:  ${sent}/${TEST_LIMIT}`);
console.log(`Failed:         ${failed}`);
console.log(`Time elapsed:   ${elapsed} minutes`);
console.log(`Average delay:  ${(elapsed / sent).toFixed(1)} minutes per message`);
console.log('═══════════════════════════════════════════════════════════════════\n');

if (sent === TEST_LIMIT) {
  console.log('✅ Test complete! All 10 messages sent.\n');
  console.log('🎯 Next steps:');
  console.log('   1. Check your LinkedIn messages to verify they sent');
  console.log('   2. Wait a few hours to see if LinkedIn flags anything');
  console.log('   3. If all looks good, start the full campaign');
  console.log('   4. Run: node scripts/campaign-worker.js (on Railway)');
} else {
  console.log('⚠️  Test incomplete. Check errors above.\n');
}

