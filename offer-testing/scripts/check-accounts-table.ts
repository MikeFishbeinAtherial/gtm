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
  console.log('🔍 Checking accounts table...\n');

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!accounts || accounts.length === 0) {
    console.log('❌ No accounts found in database!');
    console.log('\nYou need to create account records that map to your Unipile accounts.');
    return;
  }

  console.log(`Found ${accounts.length} accounts:\n`);
  
  accounts.forEach((acc: any, i: number) => {
    console.log(`${i + 1}. ${acc.name || 'Unnamed'}`);
    console.log(`   ID: ${acc.id}`);
    console.log(`   Unipile Account ID: ${acc.unipile_account_id || '❌ NOT SET'}`);
    console.log(`   Type: ${acc.account_type || 'N/A'}`);
    console.log(`   Provider: ${acc.provider || 'N/A'}`);
    console.log('');
  });

  // Check for email accounts
  const emailAccounts = accounts.filter((a: any) => 
    a.account_type === 'email' || a.provider === 'email' || a.provider === 'google'
  );

  if (emailAccounts.length === 0) {
    console.log('⚠️  No email accounts found!');
    console.log('You need to create an email account record with unipile_account_id = "0pKp3VL5TGSAMQpg-eNC7A"');
  } else {
    console.log(`✅ Found ${emailAccounts.length} email account(s)`);
  }
}

main();
