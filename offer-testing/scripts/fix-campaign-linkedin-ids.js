#!/usr/bin/env node

/**
 * Fix LinkedIn IDs for ANY Campaign
 * 
 * This script finds ALL connections in a specified campaign that have
 * invalid LinkedIn IDs (username, temp IDs, or missing) and gets the
 * real member IDs from Unipile.
 * 
 * USAGE:
 *   node scripts/fix-campaign-linkedin-ids.js <campaign-name-or-id>
 * 
 * EXAMPLES:
 *   node scripts/fix-campaign-linkedin-ids.js networking-holidays-2025
 *   node scripts/fix-campaign-linkedin-ids.js sales-roleplay-trainer-2025
 *   node scripts/fix-campaign-linkedin-ids.js d38eb9c1-5b9d-4c83-bda4-a1d5eeeb9ac8
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

// Helper: Get relations from cache or Unipile API
async function getAllUnipileRelations(accountId) {
  // First, try to get from cache
  console.log('💾 Checking local cache...');
  
  // Fetch all cached relations (Supabase default limit is 1000, so we need to paginate)
  let allCachedRelations = [];
  let cachedPage = 0;
  const pageSize = 1000;
  let cacheError = null;
  
  while (true) {
    const { data: cachedPageData, error: pageError } = await supabase
      .from('unipile_relations_cache')
      .select('*')
      .eq('unipile_account_id', accountId)
      .order('cached_at', { ascending: false })
      .range(cachedPage * pageSize, (cachedPage + 1) * pageSize - 1);
    
    if (pageError) {
      cacheError = pageError;
      break;
    }
    
    if (!cachedPageData || cachedPageData.length === 0) {
      break;
    }
    
    allCachedRelations.push(...cachedPageData);
    
    if (cachedPageData.length < pageSize) {
      break; // Last page
    }
    
    cachedPage++;
  }
  
  const cachedRelations = allCachedRelations;

  if (!cacheError && cachedRelations && cachedRelations.length > 0) {
    const cacheAge = new Date() - new Date(cachedRelations[0].cached_at);
    const cacheAgeHours = Math.floor(cacheAge / (1000 * 60 * 60));
    
    console.log(`✅ Found ${cachedRelations.length} relations in cache (${cacheAgeHours} hours old)`);
    
    // Use cache if less than 7 days old
    if (cacheAgeHours < 24 * 7) {
      console.log('   ✅ Using cached relations (cache is fresh)\n');
      return cachedRelations.map(rel => ({
        member_id: rel.member_id,
        id: rel.member_id,
        user_id: rel.member_id,
        public_profile_url: rel.public_profile_url,
        public_url: rel.public_profile_url,
        profile_url: rel.public_profile_url,
        public_identifier: rel.public_identifier,
        first_name: rel.first_name,
        last_name: rel.last_name,
        name: rel.full_name,
        headline: rel.headline,
        company: rel.company,
        title: rel.title,
        location: rel.location,
        profile_picture_url: rel.profile_picture_url,
        avatar_url: rel.profile_picture_url,
        picture_url: rel.profile_picture_url,
        ...rel.raw_data
      }));
    } else {
      console.log(`   ⚠️  Cache is stale (${cacheAgeHours} hours old), fetching from Unipile...`);
    }
  } else {
    console.log('   ⚠️  No cache found, fetching from Unipile...');
  }

  // Fetch from Unipile API
  const relations = [];
  let cursor = null;
  let page = 1;

  console.log('📥 Fetching all LinkedIn connections from Unipile API...');

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

  console.log(`✅ Fetched ${relations.length} total relations from Unipile\n`);
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
  const campaignIdentifier = process.argv[2];

  if (!campaignIdentifier) {
    console.error('❌ Please provide a campaign name or ID');
    console.error('\nUsage:');
    console.error('  node scripts/fix-campaign-linkedin-ids.js <campaign-name-or-id>');
    console.error('\nExamples:');
    console.error('  node scripts/fix-campaign-linkedin-ids.js networking-holidays-2025');
    console.error('  node scripts/fix-campaign-linkedin-ids.js sales-roleplay-trainer-2025');
    process.exit(1);
  }

  console.log(`🔧 Fixing LinkedIn IDs for Campaign: ${campaignIdentifier}\n`);

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

  // Step 2: Get campaign (by name or ID)
  console.log(`📋 Finding campaign: ${campaignIdentifier}...`);
  let campaign;
  
  // Try by ID first (UUID format)
  if (campaignIdentifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    const { data, error } = await supabase
      .from('networking_campaign_batches')
      .select('*')
      .eq('id', campaignIdentifier)
      .single();
    
    if (error || !data) {
      console.error('❌ Campaign not found by ID:', error?.message);
      process.exit(1);
    }
    campaign = data;
  } else {
    // Try by name
    const { data, error } = await supabase
      .from('networking_campaign_batches')
      .select('*')
      .eq('name', campaignIdentifier)
      .single();
    
    if (error || !data) {
      console.error('❌ Campaign not found by name:', error?.message);
      console.error('\n💡 Available campaigns:');
      const { data: allCampaigns } = await supabase
        .from('networking_campaign_batches')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (allCampaigns) {
        allCampaigns.forEach(c => {
          console.error(`   - ${c.name} (${c.id})`);
        });
      }
      process.exit(1);
    }
    campaign = data;
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
  const total = connectionsNeedingFix.length;
  const startTime = Date.now();

  console.log(`\n🔧 Processing ${total} connections...\n`);

  for (let i = 0; i < connectionsNeedingFix.length; i++) {
    const connection = connectionsNeedingFix[i];
    const progress = i + 1;
    const percent = Math.round((progress / total) * 100);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const avgTime = elapsed / progress;
    const remaining = Math.round((total - progress) * avgTime);
    
    console.log(`[${progress}/${total}] (${percent}%) - ${elapsed}s elapsed, ~${remaining}s remaining`);
    console.log(`👤 ${connection.first_name} ${connection.last_name || ''}`);
    console.log(`   URL: ${connection.linkedin_url}`);
    console.log(`   Current ID: ${connection.linkedin_id || 'MISSING'}`);

    // Try to find in Unipile relations
    // Try multiple URL variations
    const urlVariations = [
      connection.linkedin_url,
      connection.linkedin_url?.replace(/\/$/, ''), // Remove trailing slash
      connection.linkedin_url?.replace(/^https?:\/\//, ''), // Remove protocol
      connection.linkedin_url?.replace(/^https?:\/\/(www\.)?/, ''), // Remove protocol and www
    ].filter(Boolean);
    
    let match = null;
    
    // Try URL matching first
    for (const url of urlVariations) {
      const normalized = normalizeLinkedInUrl(url);
      if (normalized) {
        match = mapByUrl.get(normalized);
        if (match) break;
      }
    }
    
    // Try username matching if URL didn't work
    if (!match) {
      const username = extractLinkedInUsername(connection.linkedin_url);
      if (username) {
        // Try exact match
        match = mapByUsername.get(username.toLowerCase());
        
        // Try without trailing numbers
        if (!match) {
          const normalizedUsername = username.toLowerCase().replace(/-\d+$/, '');
          match = mapByUsername.get(normalizedUsername);
        }
        
        // Try with www prefix variations
        if (!match) {
          match = mapByUsername.get(username.toLowerCase().replace(/^www\./, ''));
        }
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
    console.log(`   📊 Progress: ${fixed} fixed, ${notFound} not found, ${duplicates} duplicates\n`);
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
