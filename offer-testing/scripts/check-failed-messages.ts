#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

async function main() {
  console.log('🔍 Checking recent failed messages...\n');
  
  const { data, error } = await supabase
    .from('send_queue')
    .select('id, channel, status, account_id, last_error, scheduled_for, contacts(email, first_name, last_name)')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('✅ No failed messages found!');
    return;
  }

  console.log(`Found ${data.length} failed messages:\n`);
  
  data.forEach((m: any, i: number) => {
    console.log(`${i + 1}. ${m.contacts?.first_name} ${m.contacts?.last_name}`);
    console.log(`   Email: ${m.contacts?.email}`);
    console.log(`   Channel: ${m.channel}`);
    console.log(`   Account ID: ${m.account_id || '❌ NULL'}`);
    console.log(`   Scheduled: ${m.scheduled_for}`);
    console.log(`   Error: ${m.last_error?.substring(0, 150)}`);
    console.log('');
  });
  
  // Check if account_id is NULL
  const nullAccountIds = data.filter((m: any) => !m.account_id);
  if (nullAccountIds.length > 0) {
    console.log(`\n⚠️  ${nullAccountIds.length} messages have NULL account_id!`);
    console.log('This is why you\'re getting the 400 error.\n');
  }
}

main();
