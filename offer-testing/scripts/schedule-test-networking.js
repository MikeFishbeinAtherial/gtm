#!/usr/bin/env node

/**
 * Schedule Test Networking Messages - Simple Version
 *
 * Schedules 10 networking messages for testing with 5-minute intervals.
 *
 * USAGE:
 *   node scripts/schedule-test-networking.js
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

async function scheduleTestNetworking() {
  console.log('🔄 Scheduling 10 test networking messages...\n');

  try {
    // Get 10 pending networking outreach messages for testing
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

    console.log(`📝 Found ${outreachRecords.length} unscheduled networking messages for testing`);

    // Simple scheduling: space messages 5 minutes apart starting from 10 minutes from now
    const startTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    console.log(`⏰ Scheduling ${outreachRecords.length} test messages with 5-minute intervals...`);
    console.log(`📅 Starting from: ${startTime.toLocaleString()}`);
    console.log('');

    // Schedule each message with 5-minute intervals
    for (let i = 0; i < outreachRecords.length; i++) {
      const scheduledTime = new Date(startTime.getTime() + (i * 5 * 60 * 1000)); // 5 minutes apart

      await supabase
        .from('networking_outreach')
        .update({
          scheduled_at: scheduledTime.toISOString(),
          status: 'pending' // Ensure status is still pending
        })
        .eq('id', outreachRecords[i].id);

      console.log(`✅ Message ${i + 1}: ${scheduledTime.toLocaleString()}`);
      console.log(`   To: ${outreachRecords[i].linkedin_connections.first_name} ${outreachRecords[i].linkedin_connections.last_name}`);
      console.log(`   "${outreachRecords[i].personalized_message.substring(0, 60)}..."`);
      console.log('');
    }

    console.log(`✅ Successfully scheduled ${outreachRecords.length} test networking messages!`);

    // Show summary of what was scheduled
    const { data: scheduled } = await supabase
      .from('networking_outreach')
      .select('id, scheduled_at')
      .not('scheduled_at', 'is', null)
      .order('scheduled_at')
      .limit(10);

    console.log('\n📅 Summary - Next 10 scheduled messages:');
    scheduled?.forEach((msg, index) => {
      const time = new Date(msg.scheduled_at).toLocaleString();
      console.log(`${index + 1}. ${time}`);
    });

    console.log('\n🚀 Railway cron will start sending at the scheduled times!');
    console.log('📧 You will receive email notifications for each message sent.');

  } catch (error) {
    console.error('❌ Error scheduling networking messages:', error);
  }
}

// Run the script
scheduleTestNetworking().catch(console.error);
