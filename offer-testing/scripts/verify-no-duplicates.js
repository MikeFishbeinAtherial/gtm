#!/usr/bin/env node

/**
 * Verify No Duplicate Messages
 * 
 * Run this script to check if there are any duplicate sent messages
 * in the networking_outreach table.
 * 
 * USAGE:
 *   node scripts/verify-no-duplicates.js
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
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🔍 Verifying no duplicate messages...\n');

  // Check 1: Count totals
  const { data: stats, error: statsError } = await supabase
    .from('networking_outreach')
    .select('id, status, connection_id, linkedin_connections!inner(linkedin_id)')
    .eq('status', 'sent');

  if (statsError) {
    console.error('❌ Error fetching stats:', statsError);
    process.exit(1);
  }

  const totalSent = stats.length;
  const uniqueConnectionIds = new Set(stats.map(s => s.connection_id)).size;
  const uniqueLinkedInIds = new Set(stats.map(s => s.linkedin_connections.linkedin_id)).size;

  console.log('📊 Sent Message Statistics:');
  console.log(`   Total sent:          ${totalSent}`);
  console.log(`   Unique connections:  ${uniqueConnectionIds}`);
  console.log(`   Unique LinkedIn IDs: ${uniqueLinkedInIds}`);
  console.log('');

  // Check 2: Find duplicates by LinkedIn ID
  const linkedInIdCounts = {};
  stats.forEach(s => {
    const lid = s.linkedin_connections.linkedin_id;
    if (!linkedInIdCounts[lid]) {
      linkedInIdCounts[lid] = [];
    }
    linkedInIdCounts[lid].push(s.id);
  });

  const duplicates = Object.entries(linkedInIdCounts)
    .filter(([_, ids]) => ids.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ NO DUPLICATES FOUND');
    console.log('   All sent messages are to unique LinkedIn IDs.');
  } else {
    console.log('❌ DUPLICATES FOUND:');
    for (const [linkedInId, outreachIds] of duplicates) {
      console.log(`\n   LinkedIn ID: ${linkedInId}`);
      console.log(`   Sent ${outreachIds.length} times:`);
      outreachIds.forEach(id => console.log(`     - ${id}`));
    }
  }

  // Check 3: Overall status
  const { data: statusCounts } = await supabase
    .from('networking_outreach')
    .select('status')
    .then(result => {
      const counts = {};
      result.data.forEach(r => {
        counts[r.status] = (counts[r.status] || 0) + 1;
      });
      return { data: counts };
    });

  console.log('\n📈 Overall Status Breakdown:');
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`   ${status}: ${count}`);
  }

  console.log('\n✅ Verification complete.');
  process.exit(duplicates.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
