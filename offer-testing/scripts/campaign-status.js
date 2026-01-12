#!/usr/bin/env node

/**
 * Campaign Status Report
 * 
 * Shows:
 * - Total unique people in the campaign
 * - How many have been messaged
 * - How many still need to be messaged
 * - Breakdown by status
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

console.log('📊 Campaign Status Report\n');
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
  console.log('💡 Available campaigns:');
  const { data: allCampaigns } = await supabase
    .from('networking_campaign_batches')
    .select('id, name, status')
    .limit(10);
  allCampaigns?.forEach(c => {
    console.log(`   - ${c.name} (${c.status})`);
  });
  process.exit(1);
}

console.log(`✅ Found campaign: ${campaign.name} (${campaign.id})\n`);

// Step 2: Get all outreach records for this campaign
console.log('📥 Loading outreach records...');
const { data: allOutreach, error: outreachError } = await supabase
  .from('networking_outreach')
  .select(`
    id,
    connection_id,
    status,
    sent_at,
    created_at,
    scheduled_at,
    linkedin_connections!inner(
      id,
      linkedin_id,
      linkedin_url,
      first_name,
      last_name,
      full_name
    )
  `)
  .eq('batch_id', campaign.id)
  .order('created_at', { ascending: false });

if (outreachError) {
  console.error('❌ Error loading outreach:', outreachError);
  process.exit(1);
}

console.log(`✅ Loaded ${allOutreach.length} outreach records\n`);

// Step 3: Count unique people (by LinkedIn URL to handle duplicates)
console.log('🔍 Analyzing unique people...\n');

const uniquePeopleByUrl = new Map();
const uniquePeopleById = new Map();
const statusCounts = {
  pending: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  replied: 0,
  approved: 0
};

allOutreach.forEach(record => {
  const connection = record.linkedin_connections;
  const linkedinUrl = connection?.linkedin_url;
  const linkedinId = connection?.linkedin_id;
  
  // Count by status
  statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;
  
  // Track unique people by URL (most reliable)
  if (linkedinUrl) {
    const normalizedUrl = linkedinUrl.toLowerCase().replace(/\/$/, '');
    if (!uniquePeopleByUrl.has(normalizedUrl)) {
      uniquePeopleByUrl.set(normalizedUrl, {
        connection_id: connection.id,
        linkedin_id: linkedinId,
        linkedin_url: linkedinUrl,
        name: connection?.full_name || `${connection?.first_name || ''} ${connection?.last_name || ''}`.trim(),
        records: [],
        statuses: new Set()
      });
    }
    const person = uniquePeopleByUrl.get(normalizedUrl);
    person.records.push(record);
    person.statuses.add(record.status);
  }
  
  // Also track by LinkedIn ID (for non-temp IDs)
  if (linkedinId && !linkedinId.startsWith('temp_')) {
    if (!uniquePeopleById.has(linkedinId)) {
      uniquePeopleById.set(linkedinId, {
        connection_id: connection.id,
        linkedin_id: linkedinId,
        linkedin_url: linkedinUrl,
        name: connection?.full_name || `${connection?.first_name || ''} ${connection?.last_name || ''}`.trim(),
        records: [],
        statuses: new Set()
      });
    }
    const person = uniquePeopleById.get(linkedinId);
    person.records.push(record);
    person.statuses.add(record.status);
  }
});

const uniquePeopleCount = uniquePeopleByUrl.size;
const uniquePeopleByIdCount = uniquePeopleById.size;

// Step 4: Count how many unique people have been sent messages
let uniquePeopleSent = 0;
let uniquePeoplePending = 0;
let uniquePeopleFailed = 0;
let uniquePeopleSkipped = 0;
let uniquePeopleReplied = 0;

uniquePeopleByUrl.forEach((person, url) => {
  const hasSent = person.statuses.has('sent');
  const hasPending = person.statuses.has('pending');
  const hasFailed = person.statuses.has('failed');
  const hasSkipped = person.statuses.has('skipped');
  const hasReplied = person.statuses.has('replied');
  
  if (hasSent) uniquePeopleSent++;
  if (hasPending && !hasSent) uniquePeoplePending++;
  if (hasFailed && !hasSent) uniquePeopleFailed++;
  if (hasSkipped && !hasSent) uniquePeopleSkipped++;
  if (hasReplied) uniquePeopleReplied++;
});

// Step 5: Find duplicates (people with multiple records)
const duplicates = [];
uniquePeopleByUrl.forEach((person, url) => {
  if (person.records.length > 1) {
    duplicates.push({
      name: person.name,
      url: url,
      linkedin_id: person.linkedin_id,
      recordCount: person.records.length,
      statuses: Array.from(person.statuses),
      records: person.records.map(r => ({
        id: r.id,
        status: r.status,
        sent_at: r.sent_at,
        created_at: r.created_at
      }))
    });
  }
});

// Step 6: Display report
console.log('═══════════════════════════════════════');
console.log('📊 CAMPAIGN STATUS SUMMARY');
console.log('═══════════════════════════════════════\n');

console.log('👥 UNIQUE PEOPLE:');
console.log(`   Total unique people (by LinkedIn URL): ${uniquePeopleCount}`);
console.log(`   Total unique people (by LinkedIn ID, non-temp): ${uniquePeopleByIdCount}\n`);

console.log('📨 MESSAGE STATUS:');
console.log(`   ✅ Sent: ${uniquePeopleSent} unique people`);
console.log(`   ⏳ Pending: ${uniquePeoplePending} unique people`);
console.log(`   ❌ Failed: ${uniquePeopleFailed} unique people`);
console.log(`   ⏭️  Skipped: ${uniquePeopleSkipped} unique people`);
console.log(`   💬 Replied: ${uniquePeopleReplied} unique people\n`);

console.log('📊 BY RECORD COUNT (includes duplicates):');
console.log(`   Total outreach records: ${allOutreach.length}`);
console.log(`   Pending records: ${statusCounts.pending || 0}`);
console.log(`   Sent records: ${statusCounts.sent || 0}`);
console.log(`   Failed records: ${statusCounts.failed || 0}`);
console.log(`   Skipped records: ${statusCounts.skipped || 0}`);
console.log(`   Replied records: ${statusCounts.replied || 0}\n`);

console.log('🎯 STILL NEED TO MESSAGE:');
const stillNeedToMessage = uniquePeopleCount - uniquePeopleSent - uniquePeopleSkipped;
console.log(`   ${stillNeedToMessage} unique people still need messages\n`);

if (duplicates.length > 0) {
  console.log('⚠️  DUPLICATES DETECTED:');
  console.log(`   ${duplicates.length} people have multiple records\n`);
  
  // Show people with multiple sent messages
  const duplicatesWithMultipleSends = duplicates.filter(d => 
    d.statuses.includes('sent') && d.records.filter(r => r.status === 'sent').length > 1
  );
  
  if (duplicatesWithMultipleSends.length > 0) {
    console.log(`   ⚠️  ${duplicatesWithMultipleSends.length} people received MULTIPLE messages:\n`);
    duplicatesWithMultipleSends.slice(0, 10).forEach(dup => {
      const sentCount = dup.records.filter(r => r.status === 'sent').length;
      console.log(`   - ${dup.name}: ${sentCount} messages sent`);
      dup.records.filter(r => r.status === 'sent').forEach(r => {
        console.log(`     • ${r.id} | Sent: ${r.sent_at || 'N/A'}`);
      });
    });
    if (duplicatesWithMultipleSends.length > 10) {
      console.log(`   ... and ${duplicatesWithMultipleSends.length - 10} more\n`);
    }
  }
}

// Step 7: Show breakdown by status
console.log('\n═══════════════════════════════════════');
console.log('📈 DETAILED BREAKDOWN\n');

const statusBreakdown = {};
uniquePeopleByUrl.forEach((person, url) => {
  const primaryStatus = person.statuses.has('sent') ? 'sent' :
                       person.statuses.has('replied') ? 'replied' :
                       person.statuses.has('pending') ? 'pending' :
                       person.statuses.has('failed') ? 'failed' :
                       person.statuses.has('skipped') ? 'skipped' : 'unknown';
  
  statusBreakdown[primaryStatus] = (statusBreakdown[primaryStatus] || 0) + 1;
});

console.log('Unique people by primary status:');
Object.entries(statusBreakdown).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
  const emoji = status === 'sent' ? '✅' : 
                status === 'pending' ? '⏳' : 
                status === 'failed' ? '❌' : 
                status === 'skipped' ? '⏭️' : 
                status === 'replied' ? '💬' : '❓';
  console.log(`   ${emoji} ${status}: ${count}`);
});

console.log('\n═══════════════════════════════════════');
console.log('✅ Report complete!\n');
