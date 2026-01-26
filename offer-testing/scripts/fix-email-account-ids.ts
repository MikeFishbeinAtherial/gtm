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

const CORRECT_EMAIL_ACCOUNT_ID = process.env.UNIPILE_EMAIL_ACCOUNT_ID;
const DUMMY_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🔧 Fixing email account IDs in send_queue...\n');
  console.log(`Correct Email Account ID: ${CORRECT_EMAIL_ACCOUNT_ID}`);
  console.log(`Dummy Account ID to replace: ${DUMMY_ACCOUNT_ID}\n`);

  if (!CORRECT_EMAIL_ACCOUNT_ID) {
    console.error('❌ UNIPILE_EMAIL_ACCOUNT_ID not set in .env.local');
    process.exit(1);
  }

  // Find all messages with dummy account_id
  const { data: messages, error: fetchError } = await supabase
    .from('send_queue')
    .select('id, channel, status, account_id')
    .eq('channel', 'email')
    .eq('account_id', DUMMY_ACCOUNT_ID);

  if (fetchError) {
    console.error('Error fetching messages:', fetchError);
    return;
  }

  if (!messages || messages.length === 0) {
    console.log('✅ No messages with dummy account_id found!');
    return;
  }

  console.log(`Found ${messages.length} messages with dummy account_id\n`);

  // Update them
  const { data: updated, error: updateError } = await supabase
    .from('send_queue')
    .update({ account_id: CORRECT_EMAIL_ACCOUNT_ID })
    .eq('channel', 'email')
    .eq('account_id', DUMMY_ACCOUNT_ID)
    .select();

  if (updateError) {
    console.error('Error updating messages:', updateError);
    return;
  }

  console.log(`✅ Updated ${updated?.length || 0} messages with correct account_id`);
  console.log(`\nNew account_id: ${CORRECT_EMAIL_ACCOUNT_ID}`);
}

main();
