#!/usr/bin/env node

/**
 * Regenerate Networking Messages with Variations
 * 
 * 1. Looks up member_ids from Unipile for skipped contacts
 * 2. Generates messages with variations A, B, C
 * 3. Schedules messages 6-16 minutes apart
 * 4. Resets skipped contacts to pending
 * 
 * USAGE:
 *   node scripts/regenerate-networking-messages.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config(); // Also load Railway env

const UNIPILE_DSN = process.env.UNIPILE_DSN;
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SECRET_KEY 
  || process.env.SUPABASE_SERVICE_KEY;

if (!UNIPILE_DSN || !UNIPILE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Message variations
const MESSAGE_VARIANTS = {
  A: `Happy holidays {{firstname}}! What's in store for you in 2026? 

Let me know if I can be a resource to anyone in your network who wants to implement custom AI agents or internal tools. Here are demo videos of some of what we've shipped to production: https://www.atherial.ai/work. Happy to share lessons and best practices.`,

  B: `Happy holidays {{firstname}}! What's in store for you in 2026? 

We're building free AI prototypes in Jan for anyone referred by our networks. Let me know if we can be a resource to anyone you know who wants to implement custom agents or internal tools. Here are demo videos of some of what we've shipped to production: https://www.atherial.ai/work.`,

  C: `Happy new year {{firstname}}! What's in store for you in 2026? 

We're building free AI prototypes in Jan for business owners and gtm leaders who want to become AI native. 

Do you know anyone who wants to implement custom agents or internal tools? 

Here are demo videos of some of what we've shipped to production: https://www.atherial.ai/work.`
};

// Scheduling: 6-16 minutes apart
const MIN_DELAY_MINUTES = 6;
const MAX_DELAY_MINUTES = 16;

// Daily limit: 50 messages per day
const MAX_MESSAGES_PER_DAY = 50;
const BUSINESS_HOURS_START = 6; // 6 AM ET
const BUSINESS_HOURS_END = 20; // 8 PM ET
const TIMEZONE = 'America/New_York';

console.log('🚀 Regenerating Networking Messages\n');
console.log('📋 Steps:');
console.log('   1. Fetch all Unipile relations');
console.log('   2. Look up member_ids for skipped contacts');
console.log('   3. Generate messages with variations A, B, C');
console.log('   4. Schedule messages 6-16 minutes apart');
console.log('   5. Reset skipped contacts to pending\n');

// Step 1: Get Unipile account
console.log('📥 Step 1: Fetching Unipile account...');
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
console.log(`   ✅ Found LinkedIn account: ${linkedinAccount.name || linkedinAccount.id}\n`);

// Step 2: Fetch ALL relations from Unipile (with pagination)
console.log('📥 Step 2: Fetching ALL LinkedIn relations from Unipile...');
let relations = [];
let cursor = null;
let page = 1;

do {
  const url = cursor 
    ? `${UNIPILE_DSN}/users/relations?account_id=${unipileAccountId}&limit=100&cursor=${cursor}`
    : `${UNIPILE_DSN}/users/relations?account_id=${unipileAccountId}&limit=100`;
  
  const relationsResponse = await fetch(url, {
    headers: {
      'X-API-KEY': UNIPILE_API_KEY,
      'Accept': 'application/json'
    }
  });

  if (!relationsResponse.ok) {
    throw new Error(`HTTP ${relationsResponse.status}`);
  }

  const relationsData = await relationsResponse.json();
  const pageRelations = relationsData.items || [];
  relations = relations.concat(pageRelations);
  
  cursor = relationsData.cursor;
  console.log(`   Page ${page}: ${pageRelations.length} relations (total: ${relations.length})`);
  
  page++;
  
  if (cursor) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
} while (cursor);

console.log(`   ✅ Fetched ${relations.length} total relations\n`);

// Helper: Normalize LinkedIn URL
function normalizeLinkedInUrl(url) {
  if (!url) return null;
  // Remove protocol, www, trailing slashes
  let normalized = url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  // Remove query params
  normalized = normalized.split('?')[0];
  // Remove numeric IDs from URLs (e.g., /in/name-123456789/)
  normalized = normalized.replace(/\/in\/[^\/]+-\d+\/?$/, (match) => {
    return match.replace(/-\d+/, '');
  });
  return normalized.toLowerCase();
}

// Helper: Extract LinkedIn username
function extractLinkedInUsername(url) {
  if (!url) return null;
  const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
  if (match) {
    // Remove numeric suffix if present
    return match[1].replace(/-\d+$/, '').toLowerCase();
  }
  return null;
}

// Step 3: Get campaign
console.log('📋 Step 3: Finding campaign...');
const { data: campaign, error: campaignError } = await supabase
  .from('networking_campaign_batches')
  .select('*')
  .eq('name', 'networking-holidays-2025')
  .single();

if (campaignError || !campaign) {
  console.error('❌ Campaign not found:', campaignError?.message);
  process.exit(1);
}

console.log(`   ✅ Found campaign: ${campaign.name}\n`);

// Step 4: Get skipped contacts that need member_id lookup
console.log('🔍 Step 4: Finding skipped contacts...');
const { data: skippedOutreach, error: skippedError } = await supabase
  .from('networking_outreach')
  .select(`
    *,
    linkedin_connections!inner(*)
  `)
  .eq('batch_id', campaign.id)
  .eq('status', 'skipped')
  .like('skip_reason', '%No valid member_id%');

if (skippedError) {
  console.error('❌ Error fetching skipped contacts:', skippedError.message);
  process.exit(1);
}

console.log(`   ✅ Found ${skippedOutreach.length} skipped contacts\n`);

// Step 5: Create lookup map from Unipile relations
console.log('🔗 Step 5: Creating lookup map from Unipile relations...');
const relationMapByUrl = new Map();
const relationMapByUsername = new Map();
const relationMapByIdentifier = new Map();

relations.forEach(rel => {
  const url = rel.public_profile_url || rel.linkedin_url || rel.url || rel.profile_url || rel.linkedin_profile_url;
  if (url) {
    const normalized = normalizeLinkedInUrl(url);
    if (normalized) {
      relationMapByUrl.set(normalized, rel);
    }

    const username = extractLinkedInUsername(url);
    if (username) {
      relationMapByUsername.set(username, rel);
    }
  }

  if (rel.public_identifier) {
    relationMapByIdentifier.set(rel.public_identifier.toLowerCase(), rel);
  }
});

console.log(`   ✅ Created lookup maps (${relationMapByUrl.size} URLs, ${relationMapByUsername.size} usernames, ${relationMapByIdentifier.size} identifiers)\n`);

// Step 6: Match skipped contacts and update member_ids
console.log('🔄 Step 6: Matching contacts and updating member_ids...');
let matched = 0;
let unmatched = 0;
const contactsToUpdate = [];

for (const outreach of skippedOutreach) {
  const connection = outreach.linkedin_connections;
  const linkedinUrl = connection.linkedin_url;
  
  if (!linkedinUrl) {
    unmatched++;
    continue;
  }

  const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
  const username = extractLinkedInUsername(linkedinUrl);
  
  let match = null;
  
  // Try URL match first
  if (normalizedUrl) {
    match = relationMapByUrl.get(normalizedUrl);
  }
  
  // Try username match
  if (!match && username) {
    match = relationMapByUsername.get(username);
  }
  
  // Try identifier match
  if (!match && connection.linkedin_id && !connection.linkedin_id.startsWith('temp_')) {
    match = relationMapByIdentifier.get(connection.linkedin_id.toLowerCase());
  }

  if (match && match.member_id) {
    contactsToUpdate.push({
      connectionId: connection.id,
      memberId: match.member_id,
      outreachId: outreach.id
    });
    matched++;
  } else {
    unmatched++;
  }
}

console.log(`   ✅ Matched: ${matched}, Unmatched: ${unmatched}\n`);

// Step 7: Update member_ids in linkedin_connections
console.log('💾 Step 7: Updating member_ids...');
let memberIdsUpdated = 0;
for (const { connectionId, memberId } of contactsToUpdate) {
  const { error } = await supabase
    .from('linkedin_connections')
    .update({
      linkedin_id: memberId,
      updated_at: new Date().toISOString()
    })
    .eq('id', connectionId);

  if (!error) {
    memberIdsUpdated++;
  }
}

console.log(`   ✅ Updated ${memberIdsUpdated} member_ids\n`);

// Step 8: Generate messages with variations and schedule
console.log('📝 Step 8: Generating messages with variations...');

// Get all contacts that should get messages (matched + already have valid IDs)
const { data: allContacts, error: contactsError } = await supabase
  .from('linkedin_connections')
  .select('*')
  .not('linkedin_id', 'like', 'temp_%')
  .not('linkedin_id', 'is', null);

if (contactsError) {
  console.error('❌ Error fetching contacts:', contactsError.message);
  process.exit(1);
}

// Get already sent contacts (don't regenerate for them)
const { data: sentOutreach } = await supabase
  .from('networking_outreach')
  .select('connection_id')
  .eq('batch_id', campaign.id)
  .eq('status', 'sent');

const sentConnectionIds = new Set(sentOutreach.map(o => o.connection_id));

// Filter contacts: exclude already sent, include matched + existing valid
const contactsToMessage = allContacts.filter(conn => 
  !sentConnectionIds.has(conn.id) &&
  (contactsToUpdate.some(u => u.connectionId === conn.id) || 
   conn.linkedin_id && !conn.linkedin_id.startsWith('temp_'))
);

console.log(`   ✅ Found ${contactsToMessage.length} contacts to message\n`);

// Helper: Check if time is within business hours
function isBusinessHours(date) {
  const etTime = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const hour = etTime.getHours();
  const month = etTime.getMonth();
  const dateNum = etTime.getDate();

  // Exclude Christmas Day (December 25)
  const isChristmas = month === 11 && dateNum === 25;
  if (isChristmas) return false;

  return hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
}

// Helper: Move to next business hour if outside hours
function moveToNextBusinessHour(date) {
  const etTime = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const hour = etTime.getHours();
  const month = etTime.getMonth();
  const dateNum = etTime.getDate();

  // If Christmas Day, move to next day
  if (month === 11 && dateNum === 25) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(BUSINESS_HOURS_START, 0, 0, 0);
    return nextDay;
  }

  // If before business hours, move to start of business hours
  if (hour < BUSINESS_HOURS_START) {
    const nextStart = new Date(date);
    nextStart.setHours(BUSINESS_HOURS_START, 0, 0, 0);
    return nextStart;
  }

  // If after business hours, move to start of next day
  if (hour >= BUSINESS_HOURS_END) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(BUSINESS_HOURS_START, 0, 0, 0);
    return nextDay;
  }

  return date;
}

// Step 9: Generate messages with random variations and schedule
console.log('📅 Step 9: Scheduling messages (50/day max, 6-16 min apart, business hours only)...');

const variantKeys = Object.keys(MESSAGE_VARIANTS);
let scheduledTime = new Date();
scheduledTime.setMinutes(scheduledTime.getMinutes() + MIN_DELAY_MINUTES); // Start in 6 minutes

// Ensure we start in business hours
scheduledTime = moveToNextBusinessHour(scheduledTime);

let created = 0;
let updated = 0;
let messagesToday = 0;
let currentDay = scheduledTime.toDateString();
let firstScheduledTime = scheduledTime;
let lastScheduledTime = scheduledTime;

for (const contact of contactsToMessage) {
  // Check if we've hit daily limit
  const scheduledDay = scheduledTime.toDateString();
  if (scheduledDay !== currentDay) {
    // New day - reset counter
    messagesToday = 0;
    currentDay = scheduledDay;
  }

  if (messagesToday >= MAX_MESSAGES_PER_DAY) {
    // Move to next day, start of business hours
    scheduledTime = new Date(scheduledTime);
    scheduledTime.setDate(scheduledTime.getDate() + 1);
    scheduledTime.setHours(BUSINESS_HOURS_START, 0, 0, 0);
    scheduledTime = moveToNextBusinessHour(scheduledTime);
    messagesToday = 0;
    currentDay = scheduledTime.toDateString();
    console.log(`   📅 Daily limit reached, moving to ${scheduledTime.toLocaleDateString()} ${scheduledTime.toLocaleTimeString()}`);
  }

  // Ensure we're in business hours
  if (!isBusinessHours(scheduledTime)) {
    scheduledTime = moveToNextBusinessHour(scheduledTime);
  }

  // Randomly assign variant
  const variantKey = variantKeys[Math.floor(Math.random() * variantKeys.length)];
  const template = MESSAGE_VARIANTS[variantKey];
  const personalizedMessage = template.replace(/\{\{firstname\}\}/gi, contact.first_name || 'there');

  // Check if outreach record already exists
  const { data: existingOutreach } = await supabase
    .from('networking_outreach')
    .select('id')
    .eq('batch_id', campaign.id)
    .eq('connection_id', contact.id)
    .single();

  if (existingOutreach) {
    // Update existing record
    const { error } = await supabase
      .from('networking_outreach')
      .update({
        personalized_message: personalizedMessage,
        status: 'pending',
        skip_reason: null,
        scheduled_at: scheduledTime.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingOutreach.id);

    if (!error) {
      updated++;
      messagesToday++;
      lastScheduledTime = scheduledTime;
    }
  } else {
    // Create new record
    const { error } = await supabase
      .from('networking_outreach')
      .insert({
        batch_id: campaign.id,
        connection_id: contact.id,
        personalized_message: personalizedMessage,
        status: 'pending',
        scheduled_at: scheduledTime.toISOString()
      });

    if (!error) {
      created++;
      messagesToday++;
      lastScheduledTime = scheduledTime;
    }
  }

  // Calculate next scheduled time (6-16 minutes from previous)
  const delayMinutes = MIN_DELAY_MINUTES + Math.random() * (MAX_DELAY_MINUTES - MIN_DELAY_MINUTES);
  scheduledTime = new Date(scheduledTime.getTime() + delayMinutes * 60 * 1000);
  
  // Ensure next time is in business hours
  if (!isBusinessHours(scheduledTime)) {
    scheduledTime = moveToNextBusinessHour(scheduledTime);
  }
}

const totalDays = Math.ceil((lastScheduledTime - firstScheduledTime) / (1000 * 60 * 60 * 24));
const avgMessagesPerDay = Math.round((created + updated) / totalDays);

console.log(`   ✅ Created ${created} new messages`);
console.log(`   ✅ Updated ${updated} existing messages`);
console.log(`   ✅ Scheduled from ${firstScheduledTime.toLocaleString('en-US', { timeZone: TIMEZONE })} ET`);
console.log(`   ✅ Scheduled until ${lastScheduledTime.toLocaleString('en-US', { timeZone: TIMEZONE })} ET`);
console.log(`   ✅ Total days: ${totalDays} days`);
console.log(`   ✅ Average: ~${avgMessagesPerDay} messages/day (max ${MAX_MESSAGES_PER_DAY})\n`);

// Step 10: Update campaign stats
console.log('📊 Step 10: Updating campaign stats...');
const { error: updateError } = await supabase
  .from('networking_campaign_batches')
  .update({
    total_target_count: contactsToMessage.length,
    updated_at: new Date().toISOString()
  })
  .eq('id', campaign.id);

if (updateError) {
  console.error('⚠️  Error updating campaign:', updateError.message);
} else {
  console.log('   ✅ Campaign stats updated\n');
}

console.log('═══════════════════════════════════════════════════════════════════');
console.log('📊 SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`Unipile relations fetched: ${relations.length}`);
console.log(`Skipped contacts found: ${skippedOutreach.length}`);
console.log(`Member IDs matched: ${matched}`);
console.log(`Member IDs updated: ${memberIdsUpdated}`);
console.log(`Contacts to message: ${contactsToMessage.length}`);
console.log(`New messages created: ${created}`);
console.log(`Messages updated: ${updated}`);
const totalDaysFinal = Math.ceil((lastScheduledTime - firstScheduledTime) / (1000 * 60 * 60 * 24));
const avgPerDay = Math.round((created + updated) / totalDaysFinal);

console.log(`Scheduled from: ${firstScheduledTime.toLocaleString('en-US', { timeZone: TIMEZONE })} ET`);
console.log(`Scheduled until: ${lastScheduledTime.toLocaleString('en-US', { timeZone: TIMEZONE })} ET`);
console.log(`Total days: ${totalDaysFinal} days`);
console.log(`Average messages/day: ~${avgPerDay} (max ${MAX_MESSAGES_PER_DAY})`);
console.log(`Business hours: ${BUSINESS_HOURS_START} AM - ${BUSINESS_HOURS_END} PM ET`);
console.log('═══════════════════════════════════════════════════════════════════\n');

console.log('✅ Done! Messages are scheduled and ready to send.');
console.log('🚀 The Railway cron job will pick them up automatically.\n');

