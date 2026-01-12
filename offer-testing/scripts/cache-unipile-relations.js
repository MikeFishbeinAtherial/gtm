#!/usr/bin/env node

/**
 * Cache Unipile Relations Locally
 * 
 * Fetches all LinkedIn connections from Unipile and stores them in Supabase
 * so we don't have to hit the API every time we need to look up member IDs.
 * 
 * This should be run periodically (daily/weekly) to keep the cache fresh.
 * 
 * USAGE:
 *   node scripts/cache-unipile-relations.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const UNIPILE_DSN = process.env.UNIPILE_DSN;
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_SERVICE_KEY;

if (!UNIPILE_DSN || !UNIPILE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Helper: Extract username from LinkedIn URL
function extractLinkedInUsername(url) {
  if (!url) return null;
  const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
  return match ? match[1] : null;
}

// Helper: Normalize LinkedIn URL
function normalizeLinkedInUrl(url) {
  if (!url) return null;
  return url.toLowerCase().replace(/\/$/, '').trim();
}

async function main() {
  console.log('💾 Caching Unipile Relations Locally\n');

  // Step 1: Get Unipile account
  console.log('📡 Fetching Unipile account...');
  const accountsResponse = await fetch(`${UNIPILE_DSN}/accounts`, {
    headers: {
      'X-API-KEY': UNIPILE_API_KEY,
      'Accept': 'application/json'
    }
  });

  if (!accountsResponse.ok) {
    console.error('❌ Failed to get Unipile accounts');
    process.exit(1);
  }

  const accounts = await accountsResponse.json();
  const linkedinAccount = accounts.items?.find(acc =>
    (acc.provider || acc.type || acc.platform || '').toUpperCase() === 'LINKEDIN'
  );

  if (!linkedinAccount) {
    console.error('❌ No LinkedIn account found');
    process.exit(1);
  }

  const unipileAccountId = linkedinAccount.id;
  console.log(`✅ Using LinkedIn account: ${linkedinAccount.name || linkedinAccount.id}\n`);

  // Step 2: Fetch all relations from Unipile
  console.log('📥 Fetching all LinkedIn connections from Unipile...');
  const relations = [];
  let cursor = null;
  let page = 1;

  while (true) {
    try {
      const url = cursor
        ? `${UNIPILE_DSN}/users/relations?account_id=${unipileAccountId}&cursor=${cursor}`
        : `${UNIPILE_DSN}/users/relations?account_id=${unipileAccountId}`;

      const response = await fetch(url, {
        headers: {
          'X-API-KEY': UNIPILE_API_KEY,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const pageRelations = data.items || data.relations || [];
      relations.push(...pageRelations);

      if (page % 50 === 0 || pageRelations.length === 0) {
        console.log(`   Page ${page}: ${relations.length} relations so far...`);
      }

      // Check for pagination
      cursor = data.cursor || data.next_cursor;
      if (!cursor || pageRelations.length === 0) {
        break;
      }

      page++;
    } catch (error) {
      console.error(`   ❌ Error fetching page ${page}:`, error.message);
      break;
    }
  }

  console.log(`✅ Fetched ${relations.length} total relations\n`);

  // Step 3: Store in Supabase
  console.log('💾 Storing relations in Supabase...');

  // First, clear old cache (optional - you might want to keep history)
  const { error: deleteError } = await supabase
    .from('unipile_relations_cache')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError && deleteError.code !== 'PGRST116') {
    console.warn('⚠️  Could not clear old cache:', deleteError.message);
  }

  // Insert relations
  let inserted = 0;
  let errors = 0;
  const batchSize = 100;

  for (let i = 0; i < relations.length; i += batchSize) {
    const batch = relations.slice(i, i + batchSize);
    
    const recordsToInsert = batch.map(rel => {
      const url = rel.public_profile_url || rel.public_url || rel.profile_url;
      const username = extractLinkedInUsername(url) || rel.public_identifier;
      
      return {
        unipile_account_id: unipileAccountId,
        member_id: rel.member_id || rel.id || rel.user_id,
        public_profile_url: url,
        public_identifier: username || rel.public_identifier,
        first_name: rel.first_name,
        last_name: rel.last_name,
        full_name: rel.name || `${rel.first_name || ''} ${rel.last_name || ''}`.trim(),
        headline: rel.headline,
        company: rel.company,
        title: rel.title,
        location: rel.location,
        profile_picture_url: rel.profile_picture_url || rel.avatar_url || rel.picture_url,
        raw_data: rel,
        cached_at: new Date().toISOString()
      };
    });

    const { error: insertError } = await supabase
      .from('unipile_relations_cache')
      .upsert(recordsToInsert, {
        onConflict: 'member_id,unipile_account_id',
        ignoreDuplicates: false
      });

    if (insertError) {
      console.error(`   ❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      if (inserted % 500 === 0) {
        console.log(`   ✅ Inserted ${inserted}/${relations.length} relations...`);
      }
    }
  }

  console.log(`\n✅ Cache complete!`);
  console.log(`   📊 Inserted: ${inserted}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📅 Cached at: ${new Date().toISOString()}\n`);

  console.log('💡 Next time you run fix-campaign-linkedin-ids.js, it will use this cache!');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
