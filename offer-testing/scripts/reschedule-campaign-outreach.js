#!/usr/bin/env node

/**
 * Reschedule Networking Outreach Messages for a Campaign
 *
 * USAGE:
 *   node scripts/reschedule-campaign-outreach.js "Atherial AI Roleplay Training - 2025 Q1"
 *
 * OPTIONAL FLAGS:
 *   --start-date=2026-01-16        (default: today in ET)
 *   --start-hour=9                 (default: 9)
 *   --end-hour=18                  (default: 18)
 *   --max-per-day=38               (default: 38)
 *   --timezone=America/New_York    (default: America/New_York)
 *   --reset-skipped=true           (default: true)
 *
 * What it does:
 * - Ensures each LinkedIn ID is only scheduled once (dedupe)
 * - Skips records missing linkedin_id
 * - Reschedules pending (and optionally skipped) messages into business hours
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

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

const args = process.argv.slice(2);
const campaignName = args[0];

function getArgValue(prefix, defaultValue) {
  const arg = args.find(a => a.startsWith(`${prefix}=`));
  if (!arg) return defaultValue;
  return arg.split('=').slice(1).join('=');
}

if (!campaignName) {
  console.error('❌ Campaign name required');
  console.error('Usage: node scripts/reschedule-campaign-outreach.js "Campaign Name"');
  process.exit(1);
}

const TIMEZONE = getArgValue('--timezone', 'America/New_York');
const START_DATE = getArgValue('--start-date', null);
const START_HOUR = parseInt(getArgValue('--start-hour', '9'), 10);
const END_HOUR = parseInt(getArgValue('--end-hour', '18'), 10);
const MAX_PER_DAY = parseInt(getArgValue('--max-per-day', '38'), 10);
const RESET_SKIPPED = getArgValue('--reset-skipped', 'true') === 'true';

const SEND_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

function getNowInTimeZone() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

function getNextSendDay(dateInTz) {
  const next = new Date(dateInTz);
  next.setDate(next.getDate() + 1);
  while (!SEND_DAYS.includes(next.getDay())) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(0, 0, 0, 0);
  return next;
}

function toUtcIso(dateInTz) {
  // Convert ET-local date to UTC using current offset (safe for near-term scheduling).
  const offsetMs = Date.now() - getNowInTimeZone().getTime();
  return new Date(dateInTz.getTime() + offsetMs).toISOString();
}

function parseStartDate() {
  if (!START_DATE) return null;
  const [yyyy, mm, dd] = START_DATE.split('-').map(n => parseInt(n, 10));
  if (!yyyy || !mm || !dd) return null;
  const start = new Date();
  start.setFullYear(yyyy);
  start.setMonth(mm - 1);
  start.setDate(dd);
  start.setHours(START_HOUR, 0, 0, 0);
  return start;
}

async function main() {
  console.log(`🔄 Rescheduling campaign: "${campaignName}"`);
  console.log(`   Timezone: ${TIMEZONE}`);
  console.log(`   Window: ${START_HOUR}:00 - ${END_HOUR}:00 (Mon-Fri)`);
  console.log(`   Max per day: ${MAX_PER_DAY}`);
  console.log(`   Reset skipped: ${RESET_SKIPPED}\n`);

  const { data: campaign, error: campaignError } = await supabase
    .from('networking_campaign_batches')
    .select('id, name')
    .eq('name', campaignName)
    .single();

  if (campaignError || !campaign) {
    console.error('❌ Campaign not found:', campaignError?.message);
    process.exit(1);
  }

  const statuses = RESET_SKIPPED ? ['pending', 'skipped'] : ['pending'];

  const { data: outreachRecords, error } = await supabase
    .from('networking_outreach')
    .select(`
      id,
      status,
      skip_reason,
      created_at,
      linkedin_connections!inner(id, linkedin_id, linkedin_url, first_name, last_name)
    `)
    .eq('batch_id', campaign.id)
    .in('status', statuses);

  if (error) {
    console.error('❌ Failed to load outreach records:', error.message);
    process.exit(1);
  }

  if (!outreachRecords || outreachRecords.length === 0) {
    console.log('✅ No outreach records to reschedule.');
    return;
  }

  console.log(`📦 Loaded ${outreachRecords.length} outreach records`);

  // Filter invalid LinkedIn IDs
  const validRecords = [];
  const invalidRecords = [];

  for (const record of outreachRecords) {
    const lid = record.linkedin_connections?.linkedin_id;
    if (!lid || lid.startsWith('temp_')) {
      invalidRecords.push(record);
    } else {
      validRecords.push(record);
    }
  }

  // Mark invalid records as skipped
  for (const record of invalidRecords) {
    await supabase
      .from('networking_outreach')
      .update({
        status: 'skipped',
        skip_reason: 'No valid linkedin_id'
      })
      .eq('id', record.id);
  }

  if (invalidRecords.length > 0) {
    console.log(`⚠️  Skipped ${invalidRecords.length} records with invalid linkedin_id`);
  }

  // Deduplicate by LinkedIn ID (keep earliest created_at)
  const byLinkedInId = new Map();
  const duplicates = [];

  for (const record of validRecords) {
    const lid = record.linkedin_connections.linkedin_id;
    const existing = byLinkedInId.get(lid);
    if (!existing) {
      byLinkedInId.set(lid, record);
    } else {
      const existingDate = new Date(existing.created_at);
      const currentDate = new Date(record.created_at);
      if (currentDate < existingDate) {
        duplicates.push(existing);
        byLinkedInId.set(lid, record);
      } else {
        duplicates.push(record);
      }
    }
  }

  for (const dup of duplicates) {
    await supabase
      .from('networking_outreach')
      .update({
        status: 'skipped',
        skip_reason: 'Duplicate LinkedIn ID in campaign'
      })
      .eq('id', dup.id);
  }

  if (duplicates.length > 0) {
    console.log(`⚠️  Skipped ${duplicates.length} duplicate records`);
  }

  const recordsToSchedule = Array.from(byLinkedInId.values());
  console.log(`✅ Scheduling ${recordsToSchedule.length} unique recipients\n`);

  const minutesBetween = Math.floor(((END_HOUR - START_HOUR) * 60) / MAX_PER_DAY);
  const jitterMax = Math.max(1, Math.min(3, Math.floor(minutesBetween / 4)));

  let currentTz = parseStartDate() || getNowInTimeZone();

  // If we start outside window, move to next valid send day at start hour
  const startMinutes = START_HOUR * 60;
  const endMinutes = END_HOUR * 60;
  const currentMinutes = currentTz.getHours() * 60 + currentTz.getMinutes();
  const isWeekday = SEND_DAYS.includes(currentTz.getDay());

  if (!isWeekday || currentMinutes >= endMinutes) {
    currentTz = getNextSendDay(currentTz);
    currentTz.setHours(START_HOUR, 0, 0, 0);
  } else if (currentMinutes < startMinutes) {
    currentTz.setHours(START_HOUR, 0, 0, 0);
  }

  let slotIndex = Math.max(0, Math.ceil((currentMinutes - startMinutes) / minutesBetween));
  let scheduledCount = 0;

  for (const record of recordsToSchedule) {
    if (slotIndex >= MAX_PER_DAY) {
      currentTz = getNextSendDay(currentTz);
      currentTz.setHours(START_HOUR, 0, 0, 0);
      slotIndex = 0;
    }

    const baseMinutes = startMinutes + slotIndex * minutesBetween;
    const jitter = Math.floor(Math.random() * (jitterMax + 1));
    const totalMinutes = baseMinutes + jitter;

    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    if (hour >= END_HOUR) {
      currentTz = getNextSendDay(currentTz);
      currentTz.setHours(START_HOUR, 0, 0, 0);
      slotIndex = 0;
      continue;
    }

    const scheduledTz = new Date(currentTz);
    scheduledTz.setHours(hour, minute, 0, 0);

    await supabase
      .from('networking_outreach')
      .update({
        status: 'pending',
        scheduled_at: toUtcIso(scheduledTz),
        skip_reason: null
      })
      .eq('id', record.id);

    scheduledCount += 1;
    slotIndex += 1;
  }

  console.log(`✅ Rescheduled ${scheduledCount} messages`);
  console.log('   Next step: set campaign status to "in_progress" when ready to send.');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
