#!/usr/bin/env node

/**
 * Find and Report Duplicate LinkedIn Connections
 * 
 * This script identifies duplicate records in linkedin_connections
 * where the same person appears multiple times (same LinkedIn URL or similar name).
 * 
 * It does NOT automatically merge them - it just reports them so you can review.
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

console.log('🔍 Finding Duplicate LinkedIn Connections\n');
console.log('═══════════════════════════════════════\n');

// Get all connections
console.log('📥 Loading all connections...');
const { data: allConnections, error } = await supabase
  .from('linkedin_connections')
  .select('*')
  .order('created_at', { ascending: false });

if (error) {
  console.error('❌ Error loading connections:', error);
  process.exit(1);
}

console.log(`✅ Loaded ${allConnections.length} connections\n`);

// Group by LinkedIn URL (most reliable identifier)
console.log('🔍 Grouping by LinkedIn URL...\n');
const byUrl = {};
const byLinkedInId = {};
const byName = {};

allConnections.forEach(conn => {
  // Group by URL
  if (conn.linkedin_url) {
    // Normalize URL (remove trailing slash, convert to lowercase)
    const normalizedUrl = conn.linkedin_url.toLowerCase().replace(/\/$/, '');
    if (!byUrl[normalizedUrl]) {
      byUrl[normalizedUrl] = [];
    }
    byUrl[normalizedUrl].push(conn);
  }

  // Group by LinkedIn ID (if not temp)
  if (conn.linkedin_id && !conn.linkedin_id.startsWith('temp_')) {
    if (!byLinkedInId[conn.linkedin_id]) {
      byLinkedInId[conn.linkedin_id] = [];
    }
    byLinkedInId[conn.linkedin_id].push(conn);
  }

  // Group by name (for fuzzy matching)
  const fullName = (conn.full_name || `${conn.first_name || ''} ${conn.last_name || ''}`).trim().toLowerCase();
  if (fullName && fullName.length > 3) {
    if (!byName[fullName]) {
      byName[fullName] = [];
    }
    byName[fullName].push(conn);
  }
});

// Find duplicates by URL
const urlDuplicates = Object.entries(byUrl)
  .filter(([_, records]) => records.length > 1)
  .sort(([_, a], [__, b]) => b.length - a.length);

// Find duplicates by LinkedIn ID
const idDuplicates = Object.entries(byLinkedInId)
  .filter(([_, records]) => records.length > 1)
  .sort(([_, a], [__, b]) => b.length - a.length);

// Find duplicates by name
const nameDuplicates = Object.entries(byName)
  .filter(([_, records]) => records.length > 1)
  .sort(([_, a], [__, b]) => b.length - a.length);

console.log('═══════════════════════════════════════');
console.log('📊 DUPLICATE SUMMARY\n');
console.log(`   Duplicates by LinkedIn URL: ${urlDuplicates.length}`);
console.log(`   Duplicates by LinkedIn ID: ${idDuplicates.length}`);
console.log(`   Potential duplicates by name: ${nameDuplicates.length}\n`);

// Report URL duplicates (most reliable)
if (urlDuplicates.length > 0) {
  console.log('═══════════════════════════════════════');
  console.log('🔗 DUPLICATES BY LINKEDIN URL (Most Reliable)\n');
  
  urlDuplicates.slice(0, 20).forEach(([url, records]) => {
    console.log(`\n📌 ${url}`);
    console.log(`   Found ${records.length} record(s):\n`);
    
    records.forEach((record, idx) => {
      const name = record.full_name || `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Unknown';
      console.log(`   ${idx + 1}. ${name}`);
      console.log(`      ID: ${record.id}`);
      console.log(`      LinkedIn ID: ${record.linkedin_id || 'N/A'}`);
      console.log(`      Created: ${record.created_at}`);
      
      // Check if any messages were sent to this connection
      // (We'll check this separately to avoid complex joins)
    });
  });

  if (urlDuplicates.length > 20) {
    console.log(`\n   ... and ${urlDuplicates.length - 20} more duplicate groups\n`);
  }
}

// Report ID duplicates
if (idDuplicates.length > 0) {
  console.log('\n═══════════════════════════════════════');
  console.log('🆔 DUPLICATES BY LINKEDIN ID\n');
  
  idDuplicates.slice(0, 10).forEach(([linkedinId, records]) => {
    console.log(`\n📌 LinkedIn ID: ${linkedinId}`);
    console.log(`   Found ${records.length} record(s):\n`);
    
    records.forEach((record, idx) => {
      const name = record.full_name || `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Unknown';
      console.log(`   ${idx + 1}. ${name}`);
      console.log(`      ID: ${record.id}`);
      console.log(`      URL: ${record.linkedin_url || 'N/A'}`);
      console.log(`      Created: ${record.created_at}`);
    });
  });

  if (idDuplicates.length > 10) {
    console.log(`\n   ... and ${idDuplicates.length - 10} more duplicate groups\n`);
  }
}

// Check which duplicates have sent messages
console.log('\n═══════════════════════════════════════');
console.log('📨 Checking for sent messages to duplicates...\n');

const allDuplicateIds = new Set();
urlDuplicates.forEach(([_, records]) => {
  records.forEach(r => allDuplicateIds.add(r.id));
});
idDuplicates.forEach(([_, records]) => {
  records.forEach(r => allDuplicateIds.add(r.id));
});

if (allDuplicateIds.size > 0) {
  const { data: sentMessages } = await supabase
    .from('networking_outreach')
    .select(`
      id,
      connection_id,
      status,
      sent_at,
      linkedin_connections!inner(id, linkedin_id, linkedin_url, full_name)
    `)
    .eq('status', 'sent')
    .not('sent_at', 'is', null)
    .in('connection_id', Array.from(allDuplicateIds));

  if (sentMessages && sentMessages.length > 0) {
    console.log(`⚠️  Found ${sentMessages.length} SENT message(s) to duplicate connections:\n`);
    
    // Group by connection
    const byConnection = {};
    sentMessages.forEach(msg => {
      const connId = msg.connection_id;
      if (!byConnection[connId]) {
        byConnection[connId] = [];
      }
      byConnection[connId].push(msg);
    });

    Object.entries(byConnection).forEach(([connId, messages]) => {
      const connection = messages[0].linkedin_connections;
      const name = connection?.full_name || 'Unknown';
      console.log(`   ${name} (${connection?.linkedin_id || 'N/A'}):`);
      console.log(`      Connection ID: ${connId}`);
      console.log(`      Messages sent: ${messages.length}`);
      messages.forEach(m => {
        console.log(`         - ${m.id} | Sent: ${m.sent_at}`);
      });
      console.log('');
    });
  } else {
    console.log('✅ No sent messages found for duplicate connections\n');
  }
}

console.log('═══════════════════════════════════════');
console.log('✅ Analysis complete!\n');
console.log('💡 Next steps:');
console.log('   1. Review the duplicates above');
console.log('   2. Decide which record to keep (usually the one with most complete data)');
console.log('   3. Update networking_outreach records to point to the kept connection');
console.log('   4. Delete the duplicate connection records');
console.log('   5. Consider running a merge script (to be created) to automate this\n');
