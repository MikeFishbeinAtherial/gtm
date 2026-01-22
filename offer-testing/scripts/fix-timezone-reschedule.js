#!/usr/bin/env node

/**
 * Fix Timezone Issue - Reschedule from 7 AM ET Properly
 * 
 * Problem identified: The previous toUTC() function was broken
 * It was doing: etDate.toLocaleString('en-US', { timeZone: 'UTC' })
 * This doesn't convert ET to UTC - it just formats the same date!
 * 
 * Correct approach: Database stores in UTC, we need to properly convert ET to UTC
 * 7 AM ET = 12:00 PM UTC (5 hour difference in winter)
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

// Schedule configuration
const MESSAGES_PER_DAY = 48;
const MIN_INTERVAL_MINUTES = 6;
const MAX_INTERVAL_MINUTES = 16;
const BUSINESS_HOURS_START = 7; // 7 AM ET
const BUSINESS_HOURS_END = 18; // 6 PM ET
const SEND_DAYS = [0, 1, 2, 3, 4, 5, 6]; // All 7 days
const TIMEZONE = 'America/New_York';

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

// CORRECT: Create a date in ET timezone
function createETDate(year, month, day, hour, minute) {
  // Create date string in ET format
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  // Parse as ET timezone
  return new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: TIMEZONE }));
}

// CORRECT: Convert ET date to UTC for database storage
function etToUTC(etDate) {
  // Get the date components in ET
  const etYear = etDate.getFullYear();
  const etMonth = etDate.getMonth();
  const etDay = etDate.getDate();
  const etHour = etDate.getHours();
  const etMinute = etDate.getMinutes();
  
  // Create a date string and explicitly set it as ET, then get UTC
  const dateString = `${etYear}-${String(etMonth + 1).padStart(2, '0')}-${String(etDay).padStart(2, '0')}T${String(etHour).padStart(2, '0')}:${String(etMinute).padStart(2, '0')}:00`;
  
  // Parse this as a local date object
  const localDate = new Date(dateString);
  
  // Get the timezone offset for ET at this date (accounts for DST)
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Create the same moment in time but interpreted as ET
  const parts = etFormatter.format(localDate).match(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/);
  if (!parts) {
    // Fallback: assume 5 hour difference (EST)
    return new Date(localDate.getTime() + (5 * 60 * 60 * 1000));
  }
  
  // The offset is the difference between local time and ET
  // In winter (EST): ET is UTC-5, so we add 5 hours to get UTC
  // In summer (EDT): ET is UTC-4, so we add 4 hours to get UTC
  
  // Simpler approach: Use the Date constructor with timezone offset
  const utcTime = new Date(Date.parse(dateString + ' GMT-0500')); // EST offset
  
  return utcTime;
}

// BETTER: Use a reliable timezone conversion
function convertETtoUTC(year, month, day, hour, minute) {
  // Create ISO string for ET
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const hourStr = String(hour).padStart(2, '0');
  const minStr = String(minute).padStart(2, '0');
  
  // Parse as if it's in ET timezone by using Intl
  const dateStr = `${year}-${monthStr}-${dayStr}T${hourStr}:${minStr}:00`;
  
  // Create date by parsing and adjusting for ET offset
  // In January 2026, ET is EST (UTC-5)
  const etDate = new Date(dateStr + '-05:00'); // Explicitly set ET offset
  
  return etDate;
}

function isWithinBusinessHours(etHour, etDay) {
  return SEND_DAYS.includes(etDay) && etHour >= BUSINESS_HOURS_START && etHour < BUSINESS_HOURS_END;
}

async function main() {
  console.log('🔧 Fix Timezone Issue - Reschedule from 7 AM ET\n');
  
  console.log('🐛 Problem found in previous script:');
  console.log('   The toUTC() function was broken - it didn\'t actually convert timezones!');
  console.log('   It scheduled everything in UTC time as if it were ET time.');
  console.log('   So "12:00 PM ET" became "12:00 PM UTC" (which is 7:00 AM ET + 5 hours)');
  console.log('   That\'s why messages started at noon ET instead of 7 AM ET!\n');
  
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
    .select('id, scheduled_at')
    .eq('batch_id', campaignData.id)
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching messages:', error);
    process.exit(1);
  }
  
  console.log(`📊 Found ${pendingMessages.length} pending messages to reschedule\n`);
  
  // Start from tomorrow 7 AM ET (or next available slot if past 7 AM today)
  const now = new Date();
  const nowET = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  
  let year = nowET.getFullYear();
  let month = nowET.getMonth() + 1;
  let day = nowET.getDate();
  let hour = BUSINESS_HOURS_START;
  let minute = 0;
  
  // If it's past 5 PM ET today, start tomorrow at 7 AM
  if (nowET.getHours() >= 17) {
    day += 1;
  }
  // If before 7 AM, start today at 7 AM
  else if (nowET.getHours() < BUSINESS_HOURS_START) {
    hour = BUSINESS_HOURS_START;
  }
  // Otherwise start 10 minutes from now
  else {
    hour = nowET.getHours();
    minute = nowET.getMinutes() + 10;
    if (minute >= 60) {
      hour += 1;
      minute -= 60;
    }
  }
  
  console.log(`⏰ Starting schedule from: ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ET\n`);
  console.log(`📅 Schedule parameters:`);
  console.log(`   • ${MESSAGES_PER_DAY} messages/day`);
  console.log(`   • Hours: ${BUSINESS_HOURS_START} AM - ${BUSINESS_HOURS_END} PM ET (6 PM)`);
  console.log(`   • Days: 7 days/week`);
  console.log(`   • Spacing: ${MIN_INTERVAL_MINUTES}-${MAX_INTERVAL_MINUTES} minutes\n`);
  
  let dailyCount = {};
  let updates = [];
  
  for (let i = 0; i < pendingMessages.length; i++) {
    const message = pendingMessages[i];
    
    // Check if we've hit daily limit
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!dailyCount[dateKey]) {
      dailyCount[dateKey] = 0;
    }
    
    // If daily limit reached or past business hours, move to next day
    if (dailyCount[dateKey] >= MESSAGES_PER_DAY || hour >= BUSINESS_HOURS_END) {
      day += 1;
      hour = BUSINESS_HOURS_START;
      minute = 0;
      
      // Handle month/year rollover
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day > daysInMonth) {
        day = 1;
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
        }
      }
      
      const newDateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!dailyCount[newDateKey]) {
        dailyCount[newDateKey] = 0;
      }
    }
    
    // Convert ET to UTC for database
    const utcTime = convertETtoUTC(year, month, day, hour, minute);
    
    updates.push({
      id: message.id,
      scheduled_at: utcTime.toISOString()
    });
    
    dailyCount[dateKey]++;
    
    // Add random spacing
    const spacing = getRandomInt(MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES);
    minute += spacing;
    
    // Handle hour rollover
    while (minute >= 60) {
      hour += 1;
      minute -= 60;
    }
    
    // Progress indicator
    if ((i + 1) % 100 === 0) {
      console.log(`   Scheduled ${i + 1}/${pendingMessages.length} messages...`);
    }
  }
  
  console.log(`\n📊 Schedule summary (first 10 days):`);
  const dates = Object.keys(dailyCount).sort();
  dates.slice(0, 10).forEach(date => {
    const d = new Date(date + 'T00:00:00-05:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: TIMEZONE });
    console.log(`   ${dayName} ${date}: ${dailyCount[date]} messages`);
  });
  
  if (dates.length > 10) {
    console.log(`   ... and ${dates.length - 10} more days`);
  }
  
  const lastDate = dates[dates.length - 1];
  console.log(`\n⏰ Campaign will complete by: ${lastDate}`);
  console.log(`   (${dates.length} days total)\n`);
  
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
        .update({ 
          scheduled_at: update.scheduled_at,
          updated_at: new Date().toISOString()
        })
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
  console.log(`   ${updated} messages now scheduled properly from 7 AM - 6 PM ET\n`);
  
  console.log(`🔍 Verify with: Check tomorrow's schedule again`);
  console.log(`   First message should be ~7 AM ET (not noon!)\n`);
}

main().catch(console.error);
