#!/usr/bin/env node

/**
 * Send Test Networking Message
 * 
 * Picks one contact from the campaign and sends a test message.
 * Looks up member_id via Unipile if needed.
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

if (!UNIPILE_DSN || !UNIPILE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🧪 Test Message Sender\n');

// Step 1: Get Unipile account first to fetch relations
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
console.log(`✅ Found LinkedIn account: ${linkedinAccount.name || linkedinAccount.id}\n`);

// Fetch ALL relations with pagination
console.log('🔍 Fetching ALL relations (with pagination)...');
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

console.log(`   ✅ Found ${relations.length} total relations\n`);

// Step 2: Get pending messages and try to match one
const { data: outreachList, error: fetchError } = await supabase
  .from('networking_outreach')
  .select(`
    *,
    linkedin_connections!inner(*)
  `)
  .eq('batch_id', 'd38eb9c1-5b9d-4c83-bda4-a1d5eeeb9ac8')
  .eq('status', 'pending')
  .limit(10);

if (fetchError || !outreachList || outreachList.length === 0) {
  console.error('❌ No pending messages found:', fetchError?.message);
  process.exit(1);
}

// Try to find a match
let outreach = null;
let matchedRelation = null;

console.log('🔍 Trying to match contacts...');
for (const out of outreachList.slice(0, 5)) {
  const conn = out.linkedin_connections;
  const csvUsername = extractUsername(conn.linkedin_url);
  console.log(`   Checking: ${conn.first_name} (${csvUsername})`);
  
  // Try to find in relations
  matchedRelation = relations.find(rel => {
    const relUsername = rel.public_identifier || extractUsername(rel.public_profile_url);
    if (!relUsername || !csvUsername) return false;
    
    // Normalize both usernames (remove numeric suffix, lowercase)
    const normalizedRel = relUsername.toLowerCase().replace(/-\d+$/, '');
    const normalizedCsv = csvUsername.toLowerCase();
    
    // Exact match or match without numeric suffix
    const matches = normalizedRel === normalizedCsv || 
           normalizedRel.replace(/-\d+$/, '') === normalizedCsv ||
           rel.public_profile_url?.toLowerCase().includes(csvUsername.toLowerCase());
    
    if (matches) {
      console.log(`      ✅ MATCH! Found: ${rel.first_name} ${rel.last_name} (${relUsername})`);
    }
    
    return matches;
  });
  
  if (matchedRelation) {
    outreach = out;
    console.log(`   ✅ Selected: ${conn.first_name}\n`);
    break;
  } else {
    console.log(`      ❌ No match found\n`);
  }
}

if (!outreach || !matchedRelation) {
  console.log(`⚠️  Could not find a match in ${relations.length} relations.`);
  console.log('   This suggests the CSV contacts may not be in your 1st-degree connections.');
  console.log('   Or the URLs/identifiers don\'t match exactly.\n');
  outreach = outreachList[0];
  matchedRelation = null;
} else {
  console.log(`✅ Found match in relations!\n`);
}

if (fetchError || !outreach) {
  console.error('❌ No pending messages found:', fetchError?.message);
  process.exit(1);
}

const connection = outreach.linkedin_connections;
console.log(`📧 Test Message:`);
console.log(`   To: ${connection.first_name} ${connection.last_name || ''}`);
console.log(`   URL: ${connection.linkedin_url}`);
console.log(`   Current linkedin_id: ${connection.linkedin_id}`);
console.log(`\n   Message:\n${outreach.personalized_message}\n`);

// Step 3: Get member_id
let memberId = connection.linkedin_id;

if (matchedRelation) {
  memberId = matchedRelation.member_id;
  console.log(`✅ Using member_id from relations: ${memberId}`);
  
  // Update Supabase with real member_id
  await supabase
    .from('linkedin_connections')
    .update({ linkedin_id: memberId })
    .eq('id', connection.id);
  
  console.log(`   Updated Supabase with real member_id\n`);
} else if (memberId.startsWith('temp_')) {
  console.error('❌ Cannot send: No member_id found and temp ID is invalid');
  console.log('   The contact may not be in your 1st-degree connections');
  console.log('   Or we need to fetch more relations (currently checking first 100)');
  process.exit(1);
}

// Step 4: Send message
console.log('\n📤 Sending message...');
console.log(`   Account ID: ${unipileAccountId}`);
console.log(`   Member ID: ${memberId}`);
console.log(`   Message length: ${outreach.personalized_message.length} chars\n`);

try {
  const sendResponse = await fetch(`${UNIPILE_DSN}/chats`, {
    method: 'POST',
    headers: {
      'X-API-KEY': UNIPILE_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      account_id: unipileAccountId,
      attendees_ids: [memberId],
      text: outreach.personalized_message,
    }),
  });

  if (!sendResponse.ok) {
    const errorBody = await sendResponse.json().catch(() => ({}));
    throw new Error(`HTTP ${sendResponse.status}: ${JSON.stringify(errorBody)}`);
  }

  const result = await sendResponse.json();
  console.log('✅ MESSAGE SENT SUCCESSFULLY!');
  console.log('   Response:', JSON.stringify(result, null, 2));
  
  // Update Supabase
  await supabase
    .from('networking_outreach')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString()
    })
    .eq('id', outreach.id);
  
  console.log('\n✅ Updated Supabase: status = sent');
  console.log('\n🎯 Next steps:');
  console.log('   1. Check your LinkedIn messages to verify it sent');
  console.log('   2. If successful, we can start the full campaign');
  console.log('   3. Run: node scripts/send-networking-campaign.js');

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  
  // Update Supabase with error
  await supabase
    .from('networking_outreach')
    .update({
      status: 'failed',
      skip_reason: error.message
    })
    .eq('id', outreach.id);
  
  process.exit(1);
}

function extractUsername(url) {
  if (!url) return null;
  const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
  return match ? match[1] : null;
}
