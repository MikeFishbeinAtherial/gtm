#!/usr/bin/env node

/**
 * Cleanup Temp Duplicate Connections
 * 
 * This script:
 * 1. Finds all duplicate connections (same LinkedIn URL, one with temp_ ID, one with real ID)
 * 2. For each duplicate pair:
 *    - Keeps the record with the real LinkedIn ID
 *    - Updates all networking_outreach records to point to the kept connection
 *    - Deletes the temp_ duplicate record
 * 3. Reports what was cleaned up
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

console.log('🧹 Cleaning Up Temp Duplicate Connections\n');
console.log('═══════════════════════════════════════\n');

// Step 1: Find all connections
console.log('📥 Loading all connections...');
const { data: allConnections, error: connectionsError } = await supabase
  .from('linkedin_connections')
  .select('*')
  .order('created_at', { ascending: true });

if (connectionsError) {
  console.error('❌ Error loading connections:', connectionsError);
  process.exit(1);
}

console.log(`✅ Loaded ${allConnections.length} connections\n`);

// Step 2: Group by LinkedIn URL to find duplicates
console.log('🔍 Finding duplicates by LinkedIn URL...\n');
const byUrl = {};

allConnections.forEach(conn => {
  if (conn.linkedin_url) {
    const normalizedUrl = conn.linkedin_url.toLowerCase().replace(/\/$/, '');
    if (!byUrl[normalizedUrl]) {
      byUrl[normalizedUrl] = [];
    }
    byUrl[normalizedUrl].push(conn);
  }
});

// Find duplicates (same URL, multiple records)
const duplicates = Object.entries(byUrl)
  .filter(([_, records]) => records.length > 1)
  .map(([url, records]) => ({
    url,
    records: records.sort((a, b) => {
      // Sort: real IDs first, then temp IDs
      const aIsTemp = a.linkedin_id?.startsWith('temp_');
      const bIsTemp = b.linkedin_id?.startsWith('temp_');
      if (aIsTemp && !bIsTemp) return 1;
      if (!aIsTemp && bIsTemp) return -1;
      return new Date(a.created_at) - new Date(b.created_at);
    })
  }));

console.log(`✅ Found ${duplicates.length} duplicate groups\n`);

// Step 3: Identify which to keep and which to delete
const toKeep = [];
const toDelete = [];
const toUpdate = [];

duplicates.forEach(({ url, records }) => {
  // Find the record with real LinkedIn ID (not temp_)
  const realIdRecord = records.find(r => r.linkedin_id && !r.linkedin_id.startsWith('temp_'));
  const tempRecords = records.filter(r => r.linkedin_id?.startsWith('temp_'));

  if (realIdRecord && tempRecords.length > 0) {
    // We have a real ID record and temp records - keep real, delete temps
    toKeep.push(realIdRecord);
    tempRecords.forEach(temp => {
      toDelete.push({
        tempRecord: temp,
        keepRecord: realIdRecord
      });
    });
  } else if (records.length > 1 && !realIdRecord) {
    // All are temp IDs - keep the first one, delete the rest
    toKeep.push(records[0]);
    records.slice(1).forEach(temp => {
      toDelete.push({
        tempRecord: temp,
        keepRecord: records[0]
      });
    });
  }
});

console.log(`📊 Cleanup Plan:`);
console.log(`   Records to keep: ${toKeep.length}`);
console.log(`   Records to delete: ${toDelete.length}\n`);

if (toDelete.length === 0) {
  console.log('✅ No temp duplicates to clean up!\n');
  process.exit(0);
}

// Step 4: Show sample of what will be deleted
console.log('📋 Sample of duplicates to clean up:\n');
toDelete.slice(0, 10).forEach(({ tempRecord, keepRecord }, idx) => {
  const tempName = tempRecord.full_name || `${tempRecord.first_name || ''} ${tempRecord.last_name || ''}`.trim();
  const keepName = keepRecord.full_name || `${keepRecord.first_name || ''} ${keepRecord.last_name || ''}`.trim();
  console.log(`${idx + 1}. ${tempName}`);
  console.log(`   DELETE: ${tempRecord.id} (${tempRecord.linkedin_id})`);
  console.log(`   KEEP:   ${keepRecord.id} (${keepRecord.linkedin_id})`);
  console.log(`   URL:    ${tempRecord.linkedin_url}\n`);
});

if (toDelete.length > 10) {
  console.log(`   ... and ${toDelete.length - 10} more\n`);
}

// Step 5: Check for outreach records that need to be updated (batch queries to avoid overflow)
console.log('🔍 Checking for outreach records that need updating...\n');
const tempIds = toDelete.map(d => d.tempRecord.id);
let outreachToUpdate = [];

// Batch queries in chunks of 100 to avoid headers overflow
const batchSize = 100;
for (let i = 0; i < tempIds.length; i += batchSize) {
  const batch = tempIds.slice(i, i + batchSize);
  const { data: batchResults, error: batchError } = await supabase
    .from('networking_outreach')
    .select('id, connection_id')
    .in('connection_id', batch);
  
  if (batchError) {
    console.error(`❌ Error checking batch ${Math.floor(i/batchSize) + 1}:`, batchError);
    continue;
  }
  
  if (batchResults) {
    outreachToUpdate = outreachToUpdate.concat(batchResults);
  }
  
  process.stdout.write(`\r   Checked: ${Math.min(i + batchSize, tempIds.length)} / ${tempIds.length}`);
}

console.log(`\n✅ Found ${outreachToUpdate.length} outreach records that need updating\n`);

// Step 6: Create mapping of temp ID -> keep ID
const connectionIdMap = {};
toDelete.forEach(({ tempRecord, keepRecord }) => {
  connectionIdMap[tempRecord.id] = keepRecord.id;
});

// Step 7: Update outreach records
if (outreachToUpdate.length > 0) {
  console.log('🔄 Updating outreach records...\n');
  
  let updated = 0;
  let errors = 0;
  
  for (const outreach of outreachToUpdate) {
    const newConnectionId = connectionIdMap[outreach.connection_id];
    if (!newConnectionId) {
      console.error(`⚠️  No mapping found for connection ${outreach.connection_id}`);
      errors++;
      continue;
    }
    
    const { error: updateError } = await supabase
      .from('networking_outreach')
      .update({
        connection_id: newConnectionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', outreach.id);
    
    if (updateError) {
      console.error(`❌ Error updating outreach ${outreach.id}:`, updateError.message);
      errors++;
    } else {
      updated++;
      if (updated % 10 === 0) {
        process.stdout.write(`\r   Updated: ${updated} / ${outreachToUpdate.length}`);
      }
    }
  }
  
  console.log(`\n✅ Updated ${updated} outreach records`);
  if (errors > 0) {
    console.log(`⚠️  ${errors} errors occurred`);
  }
  console.log('');
}

// Step 8: Delete temp duplicate connections
console.log('🗑️  Deleting temp duplicate connections...\n');

let deleted = 0;
let deleteErrors = 0;

for (const { tempRecord } of toDelete) {
  const { error: deleteError } = await supabase
    .from('linkedin_connections')
    .delete()
    .eq('id', tempRecord.id);
  
  if (deleteError) {
    console.error(`❌ Error deleting ${tempRecord.id}:`, deleteError.message);
    deleteErrors++;
  } else {
    deleted++;
    if (deleted % 10 === 0) {
      process.stdout.write(`\r   Deleted: ${deleted} / ${toDelete.length}`);
    }
  }
}

console.log(`\n✅ Deleted ${deleted} duplicate connections`);
if (deleteErrors > 0) {
  console.log(`⚠️  ${deleteErrors} errors occurred`);
}
console.log('');

// Step 9: Final summary
console.log('═══════════════════════════════════════');
console.log('📊 CLEANUP SUMMARY');
console.log('═══════════════════════════════════════\n');

console.log(`✅ Cleaned up ${deleted} temp duplicate connections`);
console.log(`✅ Updated ${outreachToUpdate.length} outreach records`);
console.log(`✅ Kept ${toKeep.length} unique connection records\n`);

// Verify cleanup
const { data: remainingConnections } = await supabase
  .from('linkedin_connections')
  .select('id', { count: 'exact', head: true });

console.log(`📊 Remaining connections: ${remainingConnections || 0}\n`);

console.log('✅ Cleanup complete!\n');
