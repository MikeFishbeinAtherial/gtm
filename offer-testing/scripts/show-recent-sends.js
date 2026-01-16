#!/usr/bin/env node

/**
 * Show recent sends (from audit table + outreach)
 *
 * USAGE:
 *   node scripts/show-recent-sends.js
 *
 * OPTIONAL FLAGS:
 *   --limit=20
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
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 20;

async function main() {
  console.log(`📬 Recent send activity (limit ${limit})\n`);

  const { data: auditRows, error } = await supabase
    .from('message_send_audit')
    .select(`
      created_at,
      stage,
      status_before,
      status_after,
      status_update_success,
      linkedin_id,
      linkedin_url,
      unipile_message_id,
      unipile_chat_id,
      error_message
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Failed to load message_send_audit:', error.message);
    process.exit(1);
  }

  if (!auditRows || auditRows.length === 0) {
    console.log('No send activity recorded yet.');
    return;
  }

  auditRows.forEach((row, idx) => {
    console.log(`${idx + 1}) ${row.created_at}`);
    console.log(`   Stage: ${row.stage}`);
    console.log(`   Status: ${row.status_before || 'n/a'} → ${row.status_after || 'n/a'}`);
    console.log(`   DB update: ${row.status_update_success === null ? 'n/a' : (row.status_update_success ? 'yes' : 'no')}`);
    console.log(`   LinkedIn ID: ${row.linkedin_id || 'n/a'}`);
    console.log(`   URL: ${row.linkedin_url || 'n/a'}`);
    console.log(`   Unipile Msg ID: ${row.unipile_message_id || 'n/a'}`);
    console.log(`   Unipile Chat ID: ${row.unipile_chat_id || 'n/a'}`);
    if (row.error_message) {
      console.log(`   Error: ${row.error_message}`);
    }
    console.log('');
  });
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
