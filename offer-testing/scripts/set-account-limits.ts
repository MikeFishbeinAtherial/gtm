#!/usr/bin/env ts-node

/**
 * Set per-account daily limits for email + LinkedIn.
 *
 * Usage:
 *   npx ts-node scripts/set-account-limits.ts --account-id <UUID> --email 20 --linkedin-dm 50 --linkedin-connect 20
 *   npx ts-node scripts/set-account-limits.ts --unipile-id <UNIPILE_ID> --email 20 --linkedin-dm 50 --linkedin-connect 20
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// Simple argument parser (no external dependencies)
function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function toNumber(value: string | null) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function main() {
  const accountId = getArg('--account-id');
  const unipileId = getArg('--unipile-id');

  const emailLimit = toNumber(getArg('--email'));
  const linkedinDmLimit = toNumber(getArg('--linkedin-dm'));
  const linkedinConnectLimit = toNumber(getArg('--linkedin-connect'));

  if (!accountId && !unipileId) {
    console.error('❌ You must provide either --account-id or --unipile-id');
    process.exit(1);
  }

  if (emailLimit === null && linkedinDmLimit === null && linkedinConnectLimit === null) {
    console.error('❌ You must provide at least one limit: --email, --linkedin-dm, --linkedin-connect');
    process.exit(1);
  }

  // Build update payload (only include provided limits)
  const updates: Record<string, number> = {};
  if (emailLimit !== null) updates.daily_limit_email = emailLimit;
  if (linkedinDmLimit !== null) updates.daily_limit_linkedin_dm = linkedinDmLimit;
  if (linkedinConnectLimit !== null) updates.daily_limit_linkedin_connect = linkedinConnectLimit;

  let query = supabase.from('accounts').update(updates);
  if (accountId) {
    query = query.eq('id', accountId);
  } else if (unipileId) {
    query = query.eq('unipile_account_id', unipileId);
  }

  const { data, error } = await query.select('id, name, unipile_account_id, daily_limit_email, daily_limit_linkedin_dm, daily_limit_linkedin_connect');

  if (error) {
    console.error('❌ Failed to update account limits:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('❌ No account found to update.');
    process.exit(1);
  }

  const updated = data[0];
  console.log('✅ Updated account limits:');
  console.log(`   ID: ${updated.id}`);
  console.log(`   Name: ${updated.name || 'N/A'}`);
  console.log(`   Unipile ID: ${updated.unipile_account_id || 'N/A'}`);
  console.log(`   daily_limit_email: ${updated.daily_limit_email ?? 'null (uses default)'}`);
  console.log(`   daily_limit_linkedin_dm: ${updated.daily_limit_linkedin_dm ?? 'null (uses default)'}`);
  console.log(`   daily_limit_linkedin_connect: ${updated.daily_limit_linkedin_connect ?? 'null (uses default)'}`);
}

main();
