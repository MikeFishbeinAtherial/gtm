#!/usr/bin/env node

/**
 * Check Today's Message Stats
 * 
 * Shows:
 * - Messages sent today
 * - Messages remaining today
 * - Last scheduled message time
 * - Next digest email time
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

const TIMEZONE = 'America/New_York';

function getNowInTimeZone() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
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

async function main() {
  const nowInTz = getNowInTimeZone();
  const { startUtc, endUtc } = getDayBoundsUtc(nowInTz);
  
  console.log(`\n📊 Today's Message Stats`);
  console.log(`📅 Date: ${nowInTz.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`);
  console.log(`⏰ Current Time: ${nowInTz.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} ET\n`);
  
  // Count messages sent today
  const { count: sentToday, error: sentTodayError } = await supabase
    .from('networking_outreach')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', startUtc.toISOString())
    .lt('sent_at', endUtc.toISOString());
  
  if (sentTodayError) {
    console.error('❌ Error counting sent messages:', sentTodayError);
  } else {
    console.log(`✅ Messages sent today: ${sentToday || 0}`);
  }
  
  // Count pending messages scheduled for today
  const { count: pendingToday, error: pendingTodayError } = await supabase
    .from('networking_outreach')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .not('scheduled_at', 'is', null)
    .gte('scheduled_at', startUtc.toISOString())
    .lt('scheduled_at', endUtc.toISOString());
  
  if (pendingTodayError) {
    console.error('❌ Error counting pending messages:', pendingTodayError);
  } else {
    console.log(`📋 Messages remaining today: ${pendingToday || 0}`);
  }
  
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
  
  if (lastScheduledError) {
    console.error('❌ Error getting last scheduled message:', lastScheduledError);
  } else if (lastScheduled?.scheduled_at) {
    const lastMessageTime = new Date(lastScheduled.scheduled_at).toLocaleString('en-US', { 
      timeZone: 'America/New_York', 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    console.log(`⏰ Last message scheduled: ${lastMessageTime} ET`);
  } else {
    console.log(`⏰ Last message scheduled: No more messages scheduled today`);
  }
  
  // Get next digest time
  const etTime = getNowInTimeZone();
  const etHour = etTime.getHours();
  const etMinute = etTime.getMinutes();
  
  const digestSlots = [
    { hour: 9, minute: 0 },
    { hour: 12, minute: 0 },
    { hour: 15, minute: 0 },
    { hour: 18, minute: 0 },
    { hour: 21, minute: 0 }
  ];
  
  const nowMinutes = etHour * 60 + etMinute;
  let next = digestSlots.find(s => (s.hour * 60 + s.minute) > nowMinutes);
  
  if (!next) {
    next = digestSlots[0];
    etTime.setDate(etTime.getDate() + 1);
  } else {
    etTime.setHours(next.hour, next.minute, 0, 0);
  }
  
  const nextDigestET = etTime.toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  console.log(`\n📧 Next digest email: ${nextDigestET} ET`);
  console.log(`   (Digest emails sent every 3 hours: 9am, 12pm, 3pm, 6pm, 9pm ET on weekdays)\n`);
}

main().catch(console.error);
