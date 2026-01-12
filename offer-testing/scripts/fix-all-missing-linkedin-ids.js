#!/usr/bin/env node

/**
 * Fix All Missing LinkedIn IDs - Get from Unipile
 * 
 * This script finds ALL connections in the networking-holidays-2025 campaign
 * that have invalid LinkedIn IDs (username, temp IDs, or missing) and
 * gets the real member IDs from Unipile.
 * 
 * USAGE:
 *   node scripts/fix-all-missing-linkedin-ids.js
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

// Helper: Get all relations from Unipile
async function getAllUnipileRelations(accountId) {
  const relations = [];
  let cursor = null;
  let page = 1;

  console.log('📥 Fetching all LinkedIn connections from Unipile...');

  while (true) {
    try {
      const url = cursor
        ? `${UNIPILE_DSN}/users/relations?account_id=${accountId}&cursor=${cursor}`
        : `${UNIPILE_DSN}/users/relations?account_id=${accountId}`;

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

      console.log(`   Page ${page}: ${pageRelations.length} relations (total: ${relations.length})`);

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
  return relations;
}

// Helper: Create lookup maps
function createLookupMaps(relations) {
  const mapByUrl = new Map();
  const mapByUsername = new Map();

  relations.forEach(rel => {
    const url = rel.public_profile_url || rel.public_url || rel.profile_url;
    if (url) {
      const normalized = normalizeLinkedInUrl(url);
      if (normalized) {
        mapByUrl.set(normalized, rel);
      }

      const username = extractLinkedInUsername(url) || rel.public_identifier;
      if (username) {
        const normalizedUsername = username.toLowerCase().replace(/-\d+$/, '');
        mapByUsername.set(normalizedUsername, rel);
      }
    }
  });

  return { mapByUrl, mapByUsername };
}

// Helper: Check if LinkedIn ID is invalid
function isInvalidLinkedInId(linkedinId) {
  if (!linkedinId) return true;
  if (linkedinId.startsWith('temp_')) return true;
  // If it looks like a username (no special characters, just lowercase/numbers/hyphens)
  // and doesn't start with 'urn:', it's probably a username
  if (!linkedinId.startsWith('urn:') && /^[a-z0-9-]+$/.test(linkedinId)) {
    return true;
  }
  return false;
}

async function main() {
  console.log('🔧 Fixing All Missing LinkedIn IDs - Getting from Unipile\n');

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

  // Step 2: Get campaign
  console.log('📋 Finding networking-holidays-2025 campaign...');
  const { data: campaign, error: campaignError } = await supabase
    .from('networking_campaign_batches')
    .select('*')
    .eq('name', 'networking-holidays-2025')
    .single();

  if (campaignError || !campaign) {
    console.error('❌ Campaign not found:', campaignError?.message);
    process.exit(1);
  }

  console.log(`✅ Found campaign: ${campaign.name} (${campaign.id})\n`);

  // Step 3: Get all connections in this campaign
  console.log('🔍 Finding all connections in campaign...');
  const { data: outreachList, error: outreachError } = await supabase
    .from('networking_outreach')
    .select(`
      *,
      linkedin_connections!inner(*)
    `)
    .eq('batch_id', campaign.id);

  if (outreachError) {
    console.error('❌ Error fetching outreach:', outreachError);
    process.exit(1);
  }

  if (!outreachList || outreachList.length === 0) {
    console.log('✅ No messages found in campaign');
    process.exit(0);
  }

  console.log(`📊 Found ${outreachList.length} message(s) in campaign\n`);

  // Step 4: Filter connections with invalid LinkedIn IDs
  const connectionsNeedingFix = [];
  const uniqueConnections = new Map();

  outreachList.forEach(outreach => {
    const conn = outreach.linkedin_connections;
    if (!uniqueConnections.has(conn.id)) {
      uniqueConnections.set(conn.id, conn);
      
      if (isInvalidLinkedInId(conn.linkedin_id) && conn.linkedin_url) {
        connectionsNeedingFix.push(conn);
      }
    }
  });

  console.log(`🔍 Found ${connectionsNeedingFix.length} connection(s) with invalid LinkedIn IDs\n`);

  if (connectionsNeedingFix.length === 0) {
    console.log('✅ All connections have valid LinkedIn IDs!');
    process.exit(0);
  }

  // Step 5: Get all Unipile relations
  const relations = await getAllUnipileRelations(unipileAccountId);
  const { mapByUrl, mapByUsername } = createLookupMaps(relations);

  // Step 6: Fix each connection
  let fixed = 0;
  let notFound = 0;
  let duplicates = 0;

  for (const connection of connectionsNeedingFix) {
    console.log(`\n👤 Processing: ${connection.first_name} ${connection.last_name || ''}`);
    console.log(`   URL: ${connection.linkedin_url}`);
    console.log(`   Current ID: ${connection.linkedin_id || 'MISSING'}`);

    // Try to find in Unipile relations
    const normalizedUrl = normalizeLinkedInUrl(connection.linkedin_url);
    let match = mapByUrl.get(normalizedUrl);

    if (!match) {
      const username = extractLinkedInUsername(connection.linkedin_url);
      if (username) {
        const normalizedUsername = username.toLowerCase().replace(/-\d+$/, '');
        match = mapByUsername.get(normalizedUsername);
      }
    }

    if (!match) {
      console.log(`   ❌ Not found in Unipile relations`);
      notFound++;
      continue;
    }

    const memberId = match.member_id || match.id || match.user_id;
    if (!memberId) {
      console.log(`   ❌ No member_id in Unipile relation`);
      notFound++;
      continue;
    }

    console.log(`   ✅ Found member ID: ${memberId}`);

    // Check if this LinkedIn ID already exists for another connection
    const { data: existingConnection } = await supabase
      .from('linkedin_connections')
      .select('id, first_name, last_name')
      .eq('linkedin_id', memberId)
      .neq('id', connection.id)
      .maybeSingle();

    if (existingConnection) {
      console.log(`   ⚠️  LinkedIn ID already exists for: ${existingConnection.first_name} ${existingConnection.last_name || ''}`);
      console.log(`   💡 This connection (${connection.id}) might be a duplicate`);
      console.log(`   ✅ Skipping update to avoid duplicate - existing connection has correct ID`);
      duplicates++;
      continue;
    }

    // Update database
    const { error: updateError } = await supabase
      .from('linkedin_connections')
      .update({
        linkedin_id: memberId,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id);

    if (updateError) {
      console.log(`   ❌ Failed to update: ${updateError.message}`);
      notFound++;
      continue;
    }

    console.log(`   ✅ Updated linkedin_id in database`);
    fixed++;
  }

  // Summary
  console.log(`\n\n📊 Summary:`);
  console.log(`   ✅ Fixed: ${fixed}`);
  console.log(`   ⚠️  Duplicates (ID already exists): ${duplicates}`);
  console.log(`   ❌ Not found: ${notFound}`);
  console.log(`   📊 Total processed: ${connectionsNeedingFix.length}\n`);

  if (fixed > 0) {
    console.log(`✅ Successfully updated ${fixed} LinkedIn ID(s)!`);
    console.log(`\n💡 Next step: Reset any failed messages to pending:`);
    console.log(`   UPDATE networking_outreach`);
    console.log(`   SET status = 'pending', scheduled_at = NOW() + INTERVAL '1 day'`);
    console.log(`   WHERE status = 'failed' AND batch_id = '${campaign.id}';`);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
