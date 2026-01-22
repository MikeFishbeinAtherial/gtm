#!/usr/bin/env node

/**
 * Reschedule Atherial Campaign - Accelerated Schedule
 * 
 * Changes:
 * - Increase from 38 to 48 messages per day
 * - Add Saturday and Sunday sends
 * - Start earlier: 7-8 AM ET (instead of 9 AM)
 * - End earlier: 5-6 PM ET (instead of 6 PM)
 * - Keep 6-16 minute spacing between messages
 * 
 * This will significantly reduce campaign duration from ~20 weekdays to ~16 days (including weekends)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SECRET_KEY 
  || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// New schedule configuration
const MESSAGES_PER_DAY = 48; // Increased from 38
const MIN_INTERVAL_MINUTES = 6;
const MAX_INTERVAL_MINUTES = 16;
const BUSINESS_HOURS_START = 7; // 7 AM ET (earlier)
const BUSINESS_HOURS_END = 18; // 6 PM ET (earlier cutoff)
const SEND_DAYS = [0, 1, 2, 3, 4, 5, 6]; // All 7 days (added weekends)
const TIMEZONE = 'America/New_York';

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function getETDate(date) {
  return new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
}

function toUTC(etDate) {
  const utcString = etDate.toLocaleString('en-US', { timeZone: 'UTC' });
  return new Date(utcString);
}

function isWithinBusinessHours(etDate) {
  const hour = etDate.getHours();
  const day = etDate.getDay();
  return SEND_DAYS.includes(day) && hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
}

function getNextBusinessSlot(etDate) {
  let current = new Date(etDate);
  
  // If past business hours, move to next day's start
  if (current.getHours() >= BUSINESS_HOURS_END) {
    current.setDate(current.getDate() + 1);
    current.setHours(BUSINESS_HOURS_START, 0, 0, 0);
  }
  
  // If before business hours, move to start
  if (current.getHours() < BUSINESS_HOURS_START) {
    current.setHours(BUSINESS_HOURS_START, 0, 0, 0);
  }
  
  // Skip to next business day if needed (though we now send 7 days/week)
  let attempts = 0;
  while (!SEND_DAYS.includes(current.getDay()) && attempts < 7) {
    current.setDate(current.getDate() + 1);
    current.setHours(BUSINESS_HOURS_START, 0, 0, 0);
    attempts++;
  }
  
  return current;
}

async function main() {
  console.log('🚀 Reschedule Atherial Campaign - Accelerated\n');
  
  // Get campaign ID
  const { data: campaignData, error: campaignError } = await supabase
    .from('networking_campaign_batches')
    .select('id')
    .eq('slug', 'atherial-ai-roleplay-2025-q1')
    .single();
  
  if (campaignError || !campaignData) {
    console.error('❌ Error fetching campaign:', campaignError);
    process.exit(1);
  }
  
  // Get all pending messages
  const { data: pendingMessages, error } = await supabase
    .from('networking_outreach')
    .select('id, scheduled_at, personalization_notes')
    .eq('batch_id', campaignData.id)
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching messages:', error);
    process.exit(1);
  }
  
  console.log(`📊 Found ${pendingMessages.length} pending messages to reschedule\n`);
  
  // Calculate new schedule starting from now
  const now = new Date();
  const etNow = getETDate(now);
  let currentSlot = getNextBusinessSlot(etNow);
  
  // Add a small buffer (start 10 minutes from now)
  currentSlot = addMinutes(currentSlot, 10);
  
  console.log(`⏰ Starting schedule from: ${currentSlot.toLocaleString('en-US', { timeZone: TIMEZONE })} ET\n`);
  console.log(`📅 New schedule:`);
  console.log(`   • ${MESSAGES_PER_DAY} messages/day (up from 38)`);
  console.log(`   • Hours: ${BUSINESS_HOURS_START}AM - ${BUSINESS_HOURS_END}PM ET`);
  console.log(`   • Days: 7 days/week (including weekends)`);
  console.log(`   • Spacing: ${MIN_INTERVAL_MINUTES}-${MAX_INTERVAL_MINUTES} minutes\n`);
  
  // Track daily count
  let dailyCount = {};
  let updates = [];
  
  for (let i = 0; i < pendingMessages.length; i++) {
    const message = pendingMessages[i];
    
    // Check if we've hit daily limit for this date
    const dateKey = currentSlot.toISOString().split('T')[0];
    if (!dailyCount[dateKey]) {
      dailyCount[dateKey] = 0;
    }
    
    // If daily limit reached, move to next day
    if (dailyCount[dateKey] >= MESSAGES_PER_DAY) {
      currentSlot.setDate(currentSlot.getDate() + 1);
      currentSlot.setHours(BUSINESS_HOURS_START, 0, 0, 0);
      currentSlot = getNextBusinessSlot(currentSlot);
      const newDateKey = currentSlot.toISOString().split('T')[0];
      if (!dailyCount[newDateKey]) {
        dailyCount[newDateKey] = 0;
      }
    }
    
    // Ensure within business hours
    currentSlot = getNextBusinessSlot(currentSlot);
    
    // Convert to UTC for database
    const utcSlot = toUTC(currentSlot);
    
    updates.push({
      id: message.id,
      scheduled_at: utcSlot.toISOString()
    });
    
    dailyCount[dateKey]++;
    
    // Add random spacing (6-16 minutes)
    const spacing = getRandomInt(MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES);
    currentSlot = addMinutes(currentSlot, spacing);
    
    // Progress indicator
    if ((i + 1) % 50 === 0) {
      console.log(`   Scheduled ${i + 1}/${pendingMessages.length} messages...`);
    }
  }
  
  console.log(`\n📊 Schedule summary:`);
  const dates = Object.keys(dailyCount).sort();
  dates.slice(0, 20).forEach(date => {
    const etDate = getETDate(new Date(date));
    const dayName = etDate.toLocaleDateString('en-US', { weekday: 'short' });
    console.log(`   ${dayName} ${date}: ${dailyCount[date]} messages`);
  });
  
  if (dates.length > 20) {
    console.log(`   ... and ${dates.length - 20} more days`);
  }
  
  const lastDate = dates[dates.length - 1];
  console.log(`\n⏰ Campaign will complete by: ${lastDate}`);
  console.log(`   (Estimated ${dates.length} days, down from ~20 weekdays)\n`);
  
  // Ask for confirmation
  console.log(`⚠️  This will reschedule ${pendingMessages.length} messages.`);
  console.log(`   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n`);
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Update in batches
  console.log(`🔄 Updating messages in database...`);
  const batchSize = 100;
  let updated = 0;
  
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    for (const update of batch) {
      const { error } = await supabase
        .from('networking_outreach')
        .update({ scheduled_at: update.scheduled_at, updated_at: new Date().toISOString() })
        .eq('id', update.id);
      
      if (error) {
        console.error(`❌ Error updating message ${update.id}:`, error);
      } else {
        updated++;
      }
    }
    
    console.log(`   Updated ${updated}/${updates.length} messages...`);
  }
  
  console.log(`\n✅ Rescheduling complete!`);
  console.log(`   ${updated} messages rescheduled for accelerated delivery\n`);
}

main().catch(console.error);
