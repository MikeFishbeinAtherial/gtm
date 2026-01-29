/**
 * Check campaign + account setup for AI Sales Roleplay Trainer
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('\n🔎 Checking AI Sales Roleplay Trainer campaign setup\n');

  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('id, name, slug')
    .eq('slug', 'ai-sales-roleplay-trainer')
    .maybeSingle();

  if (offerError) {
    console.error('❌ Error fetching offer:', offerError.message);
    process.exit(1);
  }

  if (!offer) {
    console.log('❌ Offer not found for slug: ai-sales-roleplay-trainer');
    return;
  }

  console.log(`✅ Offer found: ${offer.name} (${offer.id})\n`);

  const { data: campaigns, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, name, status, offer_id')
    .eq('offer_id', offer.id);

  if (campaignError) {
    console.error('❌ Error fetching campaigns:', campaignError.message);
    process.exit(1);
  }

  if (!campaigns || campaigns.length === 0) {
    console.log('⚠️  No campaigns found for this offer.');
  } else {
    console.log('📋 Campaigns:');
    campaigns.forEach((c) => {
      console.log(`- ${c.name} (${c.id}) [${c.status || 'no status'}]`);
    });
  }

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, external_id, provider, status')
    .eq('provider', 'unipile');

  console.log('\n📧 Unipile Accounts:');
  if (!accounts || accounts.length === 0) {
    console.log('⚠️  No Unipile accounts found in Supabase.');
  } else {
    accounts.forEach((a) => {
      console.log(`- ${a.external_id} (${a.id}) [${a.status || 'unknown'}]`);
    });
  }
}

main().catch(console.error);
