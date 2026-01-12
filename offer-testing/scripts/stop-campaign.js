#!/usr/bin/env node

/**
 * Stop Campaign - Cancel All Pending Messages
 * 
 * This script:
 * 1. Finds all pending messages in the campaign
 * 2. Marks them as 'skipped' with reason 'Campaign stopped'
 * 3. Clears their scheduled_at times
 * 4. Ensures Railway cron won't send them
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SECRET_KEY 
  || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🛑 Stopping Campaign - Canceling All Pending Messages\n');
console.log('═══════════════════════════════════════\n');

// Step 1: Get campaign batch
console.log('🔍 Finding campaign batch...');
const { data: campaign, error: campaignError } = await supabase
  .from('networking_campaign_batches')
  .select('*')
  .eq('name', 'networking-holidays-2025')
  .single();

if (campaignError || !campaign) {
  console.error('❌ Campaign not found:', campaignError?.message);
  process.exit(1);
}

console.log(`✅ Found campaign: ${campaign.name} (${campaign.id})\n`);

// Step 2: Find all pending messages
console.log('📥 Finding all pending messages...');
const { data: pendingMessages, error: pendingError } = await supabase
  .from('networking_outreach')
  .select(`
    id,
    status,
    scheduled_at,
    created_at,
    linkedin_connections!inner(
      first_name,
      last_name,
      full_name,
      linkedin_id
    )
  `)
  .eq('batch_id', campaign.id)
  .eq('status', 'pending');

if (pendingError) {
  console.error('❌ Error loading pending messages:', pendingError);
  process.exit(1);
}

console.log(`✅ Found ${pendingMessages.length} pending messages\n`);

// Step 3: Find all skipped messages (in case we need to ensure they stay skipped)
console.log('📥 Finding all skipped messages...');
const { data: skippedMessages, error: skippedError } = await supabase
  .from('networking_outreach')
  .select('id, status, skip_reason')
  .eq('batch_id', campaign.id)
  .eq('status', 'skipped');

if (skippedError) {
  console.error('❌ Error loading skipped messages:', skippedError);
  process.exit(1);
}

console.log(`✅ Found ${skippedMessages.length} skipped messages\n`);

// Step 4: Show what we're about to cancel
if (pendingMessages.length > 0) {
  console.log('📋 Messages to be canceled:\n');
  pendingMessages.slice(0, 10).forEach((msg, idx) => {
    const connection = msg.linkedin_connections;
    const name = connection?.full_name || `${connection?.first_name || ''} ${connection?.last_name || ''}`.trim() || 'Unknown';
    console.log(`   ${idx + 1}. ${name}`);
    console.log(`      ID: ${msg.id}`);
    console.log(`      Scheduled: ${msg.scheduled_at || 'N/A'}`);
    console.log(`      Created: ${msg.created_at}`);
  });
  if (pendingMessages.length > 10) {
    console.log(`   ... and ${pendingMessages.length - 10} more\n`);
  }
}

// Step 5: Confirm (in production, you might want to add a confirmation prompt)
console.log('\n⚠️  About to cancel ALL pending messages...\n');
console.log('This will:');
console.log('   - Mark all pending messages as "skipped"');
console.log('   - Clear their scheduled_at times');
console.log('   - Prevent Railway cron from sending them\n');

// Step 6: Update all pending messages to skipped
console.log('🔄 Updating pending messages...');
const pendingIds = pendingMessages.map(m => m.id);

if (pendingIds.length > 0) {
  const { data: updated, error: updateError } = await supabase
    .from('networking_outreach')
    .update({
      status: 'skipped',
      skip_reason: 'Campaign stopped - no more messages to be sent',
      scheduled_at: null, // Clear scheduled time to ensure cron doesn't pick it up
      updated_at: new Date().toISOString()
    })
    .in('id', pendingIds);

  if (updateError) {
    console.error('❌ Error updating messages:', updateError);
    process.exit(1);
  }

  console.log(`✅ Updated ${pendingIds.length} messages to 'skipped'\n`);
} else {
  console.log('ℹ️  No pending messages to update\n');
}

// Step 7: Verify no pending messages remain
console.log('🔍 Verifying no pending messages remain...');
const { data: remainingPending, error: verifyError } = await supabase
  .from('networking_outreach')
  .select('id')
  .eq('batch_id', campaign.id)
  .eq('status', 'pending');

if (verifyError) {
  console.error('❌ Error verifying:', verifyError);
  process.exit(1);
}

if (remainingPending && remainingPending.length > 0) {
  console.error(`⚠️  WARNING: ${remainingPending.length} pending messages still remain!`);
  console.error('   This should not happen. Please check manually.');
} else {
  console.log('✅ Verified: No pending messages remain\n');
}

// Step 8: Update campaign batch status
console.log('🔄 Updating campaign batch status...');
const { error: campaignUpdateError } = await supabase
  .from('networking_campaign_batches')
  .update({
    status: 'paused',
    updated_at: new Date().toISOString()
  })
  .eq('id', campaign.id);

if (campaignUpdateError) {
  console.error('⚠️  Error updating campaign status:', campaignUpdateError);
} else {
  console.log('✅ Campaign batch status set to "paused"\n');
}

// Step 9: Final summary
console.log('═══════════════════════════════════════');
console.log('📊 FINAL SUMMARY');
console.log('═══════════════════════════════════════\n');

const { data: finalStats } = await supabase
  .from('networking_outreach')
  .select('status')
  .eq('batch_id', campaign.id);

const stats = {};
finalStats?.forEach(r => {
  stats[r.status] = (stats[r.status] || 0) + 1;
});

console.log('Campaign message status:');
Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
  const emoji = status === 'sent' ? '✅' : 
                status === 'skipped' ? '⏭️' : 
                status === 'pending' ? '⏳' : 
                status === 'failed' ? '❌' : '❓';
  console.log(`   ${emoji} ${status}: ${count}`);
});

console.log('\n✅ Campaign stopped successfully!');
console.log('   All pending messages have been canceled.');
console.log('   Railway cron will not send any more messages.\n');
