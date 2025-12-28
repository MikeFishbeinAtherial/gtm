#!/usr/bin/env node

/**
 * Schedule Existing Networking Messages
 *
 * Takes existing networking_outreach records and assigns scheduled_at times
 * using the MessageScheduler service.
 *
 * USAGE:
 *   node scripts/schedule-existing-networking.js
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
  console.error('❌ Missing Supabase credentials');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Simple scheduling without complex service dependencies

async function scheduleExistingNetworking() {
  console.log('🔄 Scheduling existing networking messages...\n');

  try {
    // First, ensure we have a campaigns table entry for networking
    await ensureNetworkingCampaignExists();

    // Get ONLY 10 pending networking outreach messages for testing
    const { data: outreachRecords, error } = await supabase
      .from('networking_outreach')
      .select(`
        id,
        connection_id,
        personalized_message,
        linkedin_connections!inner(
          id,
          linkedin_url,
          first_name,
          last_name
        )
      `)
      .eq('status', 'pending')
      .is('scheduled_at', null) // Only unscheduled messages
      .limit(10); // TEST: Only schedule 10 messages

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    if (!outreachRecords || outreachRecords.length === 0) {
      console.log('✅ No unscheduled networking messages found');
      return;
    }

    console.log(`📝 Found ${outreachRecords.length} unscheduled networking messages (limited to 10 for testing)`);

    // Get the networking campaign ID
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('name', 'networking-holidays-2025')
      .single();

    if (!campaign) {
      console.error('❌ Could not find networking campaign');
      return;
    }

    // Convert to the format expected by scheduleNewMessages
    const messagesToSchedule = outreachRecords.map(record => ({
      id: record.id,
      campaign_id: campaign.id,
      contact_id: record.connection_id,
      channel: 'linkedin',
      subject: null,
      body: record.personalized_message,
      account_id: 'default', // We'll need to set this properly
      scheduled_at: undefined // Will be set by scheduler
    }));

    console.log(`⏰ Scheduling ${messagesToSchedule.length} test messages with smart spacing...`);

    // Schedule the messages using the new scheduler
    await scheduleNewMessages(campaign.id, messagesToSchedule);

    // Now update the networking_outreach table with the scheduled times
    for (const msg of messagesToSchedule) {
      if (msg.scheduled_at) {
        await supabase
          .from('networking_outreach')
          .update({ scheduled_at: msg.scheduled_at })
          .eq('id', msg.id);
      }
    }

    console.log(`✅ Successfully scheduled ${messagesToSchedule.length} test networking messages!`);

    // Show what was scheduled
    const { data: scheduled } = await supabase
      .from('networking_outreach')
      .select('id, scheduled_at')
      .not('scheduled_at', 'is', null)
      .order('scheduled_at')
      .limit(10);

    console.log('\n📅 First 10 scheduled messages:');
    scheduled?.forEach(msg => {
      console.log(`• ${msg.id}: ${new Date(msg.scheduled_at).toLocaleString()}`);
    });

  } catch (error) {
    console.error('❌ Error scheduling networking messages:', error);
  }
}

async function ensureNetworkingCampaignExists() {
  console.log('🔍 Checking for networking campaign...');

  // Check if campaign already exists
  const { data: existing } = await supabase
    .from('campaigns')
    .select('id')
    .eq('name', 'networking-holidays-2025')
    .single();

  if (existing) {
    console.log('✅ Networking campaign already exists');
    return;
  }

  // Get the offer ID for Atherial
  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('name', 'Atherial')
    .single();

  if (!offer) {
    console.error('❌ Could not find Atherial offer');
    return;
  }

  // Create the campaign
  const { error } = await supabase
    .from('campaigns')
    .insert({
      name: 'networking-holidays-2025',
      offer_id: offer.id,
      channel: 'linkedin',
      campaign_type: 'networking',
      status: 'ready',
      scheduling_config: {
        daily_limit: 40,
        min_interval_minutes: 5,
        max_interval_minutes: 10,
        business_hours_start: 8,
        business_hours_end: 19,
        send_days: [0, 1, 2, 3, 4, 5, 6]
      }
    });

  if (error) {
    console.error('❌ Failed to create networking campaign:', error);
  } else {
    console.log('✅ Created networking campaign');
  }
}

// Run the script
scheduleExistingNetworking().catch(console.error);
