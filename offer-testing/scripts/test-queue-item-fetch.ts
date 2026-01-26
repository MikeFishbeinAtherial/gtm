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
  console.log('🔍 Testing send_queue item fetch with relations...\n');

  // Get a failed email message
  const { data: queueItems, error: fetchError } = await supabase
    .from('send_queue')
    .select(`
      *,
      contact:contacts(*),
      campaign:campaigns(*),
      campaign_contact:campaign_contacts(*),
      account:accounts(*)
    `)
    .eq('channel', 'email')
    .eq('status', 'failed')
    .limit(1);

  if (fetchError) {
    console.error('Error:', fetchError);
    return;
  }

  if (!queueItems || queueItems.length === 0) {
    console.log('No failed email messages found');
    return;
  }

  const item = queueItems[0];

  console.log('Queue Item:');
  console.log(`  ID: ${item.id}`);
  console.log(`  Channel: ${item.channel}`);
  console.log(`  Account ID (FK): ${item.account_id}`);
  console.log(`\nAccount Relation:`);
  console.log(`  Loaded: ${item.account ? 'YES ✅' : 'NO ❌'}`);
  
  if (item.account) {
    console.log(`  Account ID: ${item.account.id}`);
    console.log(`  Unipile Account ID: ${item.account.unipile_account_id}`);
    console.log(`  Name: ${item.account.name}`);
    console.log(`  Provider: ${item.account.provider}`);
  } else {
    console.log(`  ❌ Account relation is NULL!`);
    console.log(`\n  This means:`);
    console.log(`  - The foreign key points to account_id: ${item.account_id}`);
    console.log(`  - But no account with that ID exists, OR`);
    console.log(`  - The foreign key relationship is not set up correctly`);
  }

  console.log(`\nContact Relation:`);
  console.log(`  Loaded: ${item.contact ? 'YES ✅' : 'NO ❌'}`);
  if (item.contact) {
    console.log(`  Name: ${item.contact.first_name} ${item.contact.last_name}`);
    console.log(`  Email: ${item.contact.email}`);
  }
}

main();
