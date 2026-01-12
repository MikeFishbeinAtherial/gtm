#!/usr/bin/env node

/**
 * Investigate Duplicate Messages
 * 
 * This script helps diagnose why duplicate messages were sent.
 * It checks:
 * 1. All records for a specific person (Liza Adams)
 * 2. Duplicate records in networking_outreach
 * 3. Messages sent to the same connection_id multiple times
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

console.log('🔍 Investigating Duplicate Messages\n');
console.log('═══════════════════════════════════════\n');

// Step 1: Find Liza Adams
console.log('📋 Step 1: Finding Liza Adams in linkedin_connections...\n');
const { data: lizaConnections, error: lizaError } = await supabase
  .from('linkedin_connections')
  .select('*')
  .or('first_name.ilike.%liza%,last_name.ilike.%adams%,full_name.ilike.%liza%adams%');

if (lizaError) {
  console.error('❌ Error finding Liza:', lizaError);
  process.exit(1);
}

if (!lizaConnections || lizaConnections.length === 0) {
  console.log('⚠️  No records found for Liza Adams');
  console.log('💡 Trying case-insensitive search...\n');
  
  // Try broader search
  const { data: allConnections } = await supabase
    .from('linkedin_connections')
    .select('id, first_name, last_name, full_name, linkedin_id, linkedin_url')
    .limit(1000);
  
  const matches = allConnections?.filter(c => 
    (c.first_name?.toLowerCase().includes('liza') || c.last_name?.toLowerCase().includes('adams') ||
     c.full_name?.toLowerCase().includes('liza') || c.full_name?.toLowerCase().includes('adams'))
  ) || [];
  
  if (matches.length > 0) {
    console.log(`✅ Found ${matches.length} potential match(es):\n`);
    matches.forEach(c => {
      console.log(`   - ${c.full_name || `${c.first_name} ${c.last_name}`}`);
      console.log(`     ID: ${c.id}`);
      console.log(`     LinkedIn ID: ${c.linkedin_id}`);
      console.log(`     URL: ${c.linkedin_url || 'N/A'}\n`);
    });
  } else {
    console.log('❌ Still no matches found');
  }
} else {
  console.log(`✅ Found ${lizaConnections.length} record(s) for Liza Adams:\n`);
  lizaConnections.forEach(conn => {
    console.log(`   Name: ${conn.full_name || `${conn.first_name} ${conn.last_name}`}`);
    console.log(`   ID: ${conn.id}`);
    console.log(`   LinkedIn ID: ${conn.linkedin_id}`);
    console.log(`   URL: ${conn.linkedin_url || 'N/A'}\n`);
  });

  // Step 2: Find all networking_outreach records for Liza
  for (const liza of lizaConnections) {
    console.log(`\n📨 Step 2: Finding all messages for ${liza.full_name || `${liza.first_name} ${liza.last_name}`}...\n`);
    
    const { data: outreachRecords, error: outreachError } = await supabase
      .from('networking_outreach')
      .select(`
        *,
        batch:networking_campaign_batches(name, id)
      `)
      .eq('connection_id', liza.id)
      .order('created_at', { ascending: false });

    if (outreachError) {
      console.error('❌ Error fetching outreach records:', outreachError);
      continue;
    }

    if (!outreachRecords || outreachRecords.length === 0) {
      console.log('   ⚠️  No outreach records found');
    } else {
      console.log(`   ✅ Found ${outreachRecords.length} outreach record(s):\n`);
      outreachRecords.forEach((record, idx) => {
        console.log(`   Record ${idx + 1}:`);
        console.log(`     ID: ${record.id}`);
        console.log(`     Batch: ${record.batch?.name || record.batch_id || 'N/A'}`);
        console.log(`     Status: ${record.status}`);
        console.log(`     Created: ${record.created_at}`);
        console.log(`     Scheduled: ${record.scheduled_at || 'N/A'}`);
        console.log(`     Sent: ${record.sent_at || 'N/A'}`);
        console.log(`     Message preview: ${record.personalized_message?.substring(0, 80)}...`);
        console.log('');
      });

      // Check for duplicates
      if (outreachRecords.length > 1) {
        console.log('   ⚠️  DUPLICATE DETECTED: Multiple records for same connection!\n');
        
        // Group by batch_id to see if they're from different batches
        const byBatch = {};
        outreachRecords.forEach(r => {
          const batchId = r.batch_id || 'no-batch';
          if (!byBatch[batchId]) {
            byBatch[batchId] = [];
          }
          byBatch[batchId].push(r);
        });

        console.log('   📊 Breakdown by batch:');
        Object.entries(byBatch).forEach(([batchId, records]) => {
          console.log(`     Batch ${batchId}: ${records.length} record(s)`);
          if (records.length > 1) {
            console.log(`       ⚠️  DUPLICATE IN SAME BATCH!`);
          }
        });
        console.log('');
      }
    }
  }
}

// Step 3: Check for duplicates across all networking_outreach
console.log('\n═══════════════════════════════════════');
console.log('📊 Step 3: Checking for duplicates in networking_outreach...\n');

// Get total count
const { count: totalCount } = await supabase
  .from('networking_outreach')
  .select('*', { count: 'exact', head: true });

console.log(`   Total records in networking_outreach: ${totalCount || 0}\n`);

// Find duplicates: same connection_id with multiple records
const { data: allOutreach, error: allError } = await supabase
  .from('networking_outreach')
  .select(`
    id,
    connection_id,
    batch_id,
    status,
    sent_at,
    created_at,
    linkedin_connections!inner(id, first_name, last_name, full_name, linkedin_id)
  `)
  .order('connection_id')
  .order('created_at', { ascending: false });

if (allError) {
  console.error('❌ Error fetching all outreach:', allError);
  process.exit(1);
}

// Group by connection_id
const byConnection = {};
allOutreach?.forEach(record => {
  const connId = record.connection_id;
  if (!byConnection[connId]) {
    byConnection[connId] = [];
  }
  byConnection[connId].push(record);
});

// Find connections with multiple records
const duplicates = Object.entries(byConnection)
  .filter(([_, records]) => records.length > 1)
  .sort(([_, a], [__, b]) => b.length - a.length); // Sort by count descending

console.log(`   Connections with multiple records: ${duplicates.length}\n`);

if (duplicates.length > 0) {
  console.log('   ⚠️  TOP 10 DUPLICATES:\n');
  duplicates.slice(0, 10).forEach(([connId, records]) => {
    const connection = records[0].linkedin_connections;
    const name = connection?.full_name || `${connection?.first_name || ''} ${connection?.last_name || ''}`.trim() || 'Unknown';
    console.log(`   ${name} (${connection?.linkedin_id || 'N/A'}):`);
    console.log(`     Connection ID: ${connId}`);
    console.log(`     Total records: ${records.length}`);
    
    // Group by batch
    const byBatch = {};
    records.forEach(r => {
      const batchId = r.batch_id || 'no-batch';
      if (!byBatch[batchId]) {
        byBatch[batchId] = [];
      }
      byBatch[batchId].push(r);
    });

    Object.entries(byBatch).forEach(([batchId, batchRecords]) => {
      console.log(`       Batch ${batchId}: ${batchRecords.length} record(s)`);
      if (batchRecords.length > 1) {
        console.log(`         ⚠️  DUPLICATE IN SAME BATCH!`);
        batchRecords.forEach(r => {
          console.log(`           - ${r.id} | ${r.status} | Created: ${r.created_at} | Sent: ${r.sent_at || 'N/A'}`);
        });
      }
    });
    console.log('');
  });

  // Check for same connection_id + batch_id duplicates (true duplicates)
  console.log('\n   🔍 Checking for same connection_id + batch_id duplicates...\n');
  const sameBatchDuplicates = duplicates.filter(([_, records]) => {
    const byBatch = {};
    records.forEach(r => {
      const batchId = r.batch_id || 'no-batch';
      byBatch[batchId] = (byBatch[batchId] || 0) + 1;
    });
    return Object.values(byBatch).some(count => count > 1);
  });

  if (sameBatchDuplicates.length > 0) {
    console.log(`   ⚠️  Found ${sameBatchDuplicates.length} connection(s) with duplicates in the SAME batch:\n`);
    sameBatchDuplicates.slice(0, 5).forEach(([connId, records]) => {
      const connection = records[0].linkedin_connections;
      const name = connection?.full_name || `${connection?.first_name || ''} ${connection?.last_name || ''}`.trim() || 'Unknown';
      console.log(`   ${name}:`);
      
      const byBatch = {};
      records.forEach(r => {
        const batchId = r.batch_id || 'no-batch';
        if (!byBatch[batchId]) {
          byBatch[batchId] = [];
        }
        byBatch[batchId].push(r);
      });

      Object.entries(byBatch).forEach(([batchId, batchRecords]) => {
        if (batchRecords.length > 1) {
          console.log(`     Batch ${batchId}: ${batchRecords.length} DUPLICATE records`);
          batchRecords.forEach(r => {
            console.log(`       - ${r.id} | ${r.status} | Created: ${r.created_at} | Sent: ${r.sent_at || 'N/A'}`);
          });
        }
      });
      console.log('');
    });
  } else {
    console.log('   ✅ No duplicates found in the same batch (different batches are OK)\n');
  }
} else {
  console.log('   ✅ No duplicates found!\n');
}

// Step 4: Check for sent messages to same connection
console.log('\n═══════════════════════════════════════');
console.log('📤 Step 4: Checking for multiple SENT messages to same connection...\n');

const sentDuplicates = Object.entries(byConnection)
  .filter(([_, records]) => {
    const sentRecords = records.filter(r => r.status === 'sent' && r.sent_at);
    return sentRecords.length > 1;
  })
  .sort(([_, a], [__, b]) => {
    const aSent = a.filter(r => r.status === 'sent').length;
    const bSent = b.filter(r => r.status === 'sent').length;
    return bSent - aSent;
  });

if (sentDuplicates.length > 0) {
  console.log(`   ⚠️  Found ${sentDuplicates.length} connection(s) with multiple SENT messages:\n`);
  sentDuplicates.slice(0, 10).forEach(([connId, records]) => {
    const connection = records[0].linkedin_connections;
    const name = connection?.full_name || `${connection?.first_name || ''} ${connection?.last_name || ''}`.trim() || 'Unknown';
    const sentRecords = records.filter(r => r.status === 'sent' && r.sent_at);
    
    console.log(`   ${name} (${connection?.linkedin_id || 'N/A'}):`);
    console.log(`     Connection ID: ${connId}`);
    console.log(`     Total sent: ${sentRecords.length}`);
    sentRecords.forEach(r => {
      console.log(`       - ${r.id} | Sent: ${r.sent_at} | Batch: ${r.batch_id || 'N/A'}`);
    });
    console.log('');
  });
} else {
  console.log('   ✅ No duplicate sent messages found!\n');
}

console.log('═══════════════════════════════════════');
console.log('✅ Investigation complete!\n');
