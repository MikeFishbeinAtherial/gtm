#!/usr/bin/env node

/**
 * Fix Failed Messages - Get LinkedIn IDs from Unipile
 * 
 * This script:
 * 1. Finds failed messages from the networking-holidays-2025 campaign
 * 2. Gets LinkedIn IDs from Unipile API using LinkedIn URLs
 * 3. Updates linkedin_connections with correct IDs
 * 4. Resets failed messages to pending with new scheduled_at
 * 
 * USAGE:
 *   node scripts/fix-failed-messages-linkedin-ids.js
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

// Helper: Get LinkedIn profile from Unipile
async function getLinkedInProfileFromUnipile(accountId, profileUrl) {
  try {
    const response = await fetch(`${UNIPILE_DSN}/linkedin/profile`, {
      method: 'POST',
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        account_id: accountId,
        profile_url: profileUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `HTTP ${response.status}: ${errorText}` };
    }

    const profile = await response.json();
    return { success: true, profile };
  } catch (error) {
    return { error: error.message };
  }
}

// Helper: Get LinkedIn member ID from Unipile relations
async function getMemberIdFromUnipileRelations(accountId, profileUrl) {
  try {
    // Get all relations from Unipile
    const response = await fetch(`${UNIPILE_DSN}/users/relations?account_id=${accountId}`, {
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const relations = data.items || data.relations || [];

    // Extract username from URL
    const username = extractLinkedInUsername(profileUrl);
    if (!username) {
      return { error: 'Could not extract username from URL' };
    }

    // Normalize username (remove numeric suffix)
    const normalizedUsername = username.toLowerCase().replace(/-\d+$/, '');

    // Find matching relation
    const match = relations.find(rel => {
      const relUrl = rel.public_profile_url || rel.public_url || rel.profile_url;
      const relUsername = extractLinkedInUsername(relUrl) || rel.public_identifier;
      if (!relUsername) return false;

      const normalizedRel = relUsername.toLowerCase().replace(/-\d+$/, '');
      return normalizedRel === normalizedUsername || 
             relUrl?.toLowerCase().includes(username.toLowerCase());
    });

    if (match) {
      return { 
        success: true, 
        member_id: match.member_id || match.id || match.user_id,
        relation: match 
      };
    }

    return { error: 'No matching relation found' };
  } catch (error) {
    return { error: error.message };
  }
}

async function main() {
  console.log('🔧 Fixing Failed Messages - Getting LinkedIn IDs from Unipile\n');

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

  // Step 3: Find failed messages
  console.log('🔍 Finding failed messages...');
  const { data: failedMessages, error: fetchError } = await supabase
    .from('networking_outreach')
    .select(`
      *,
      linkedin_connections!inner(*)
    `)
    .eq('batch_id', campaign.id)
    .eq('status', 'failed')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching failed messages:', fetchError);
    process.exit(1);
  }

  if (!failedMessages || failedMessages.length === 0) {
    console.log('✅ No failed messages found. All good!');
    process.exit(0);
  }

  console.log(`📊 Found ${failedMessages.length} failed message(s)\n`);

  // Step 4: Process each failed message
  let fixed = 0;
  let stillFailed = 0;
  let skipped = 0;

  for (const outreach of failedMessages) {
    const connection = outreach.linkedin_connections;
    console.log(`\n👤 Processing: ${connection.first_name} ${connection.last_name || ''}`);
    console.log(`   URL: ${connection.linkedin_url || 'MISSING'}`);
    console.log(`   Current ID: ${connection.linkedin_id || 'MISSING'}`);
    console.log(`   Error: ${outreach.skip_reason || 'Unknown'}`);

    // Skip if no LinkedIn URL
    if (!connection.linkedin_url) {
      console.log(`   ⚠️  Skipping: No LinkedIn URL`);
      skipped++;
      continue;
    }

    // Try to get member ID from Unipile relations first (faster)
    console.log(`   🔍 Trying to get member ID from Unipile relations...`);
    const relationResult = await getMemberIdFromUnipileRelations(
      unipileAccountId,
      connection.linkedin_url
    );

    let memberId = null;

    if (relationResult.success) {
      memberId = relationResult.member_id;
      console.log(`   ✅ Found member ID from relations: ${memberId}`);
    } else {
      // Try profile endpoint as fallback
      console.log(`   🔍 Trying profile endpoint...`);
      const profileResult = await getLinkedInProfileFromUnipile(
        unipileAccountId,
        connection.linkedin_url
      );

      if (profileResult.success && profileResult.profile?.id) {
        memberId = profileResult.profile.id;
        console.log(`   ✅ Found member ID from profile: ${memberId}`);
      } else {
        console.log(`   ❌ Could not get member ID: ${relationResult.error || profileResult.error}`);
        stillFailed++;
        continue;
      }
    }

    // Update linkedin_connections with correct ID
    console.log(`   📝 Updating linkedin_id in database...`);
    const { error: updateError } = await supabase
      .from('linkedin_connections')
      .update({
        linkedin_id: memberId,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id);

    if (updateError) {
      console.log(`   ❌ Failed to update: ${updateError.message}`);
      stillFailed++;
      continue;
    }

    console.log(`   ✅ Updated linkedin_id to: ${memberId}`);

    // Reset message to pending with new scheduled_at (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow

    console.log(`   📅 Rescheduling to: ${tomorrow.toISOString()}`);
    const { error: resetError } = await supabase
      .from('networking_outreach')
      .update({
        status: 'pending',
        scheduled_at: tomorrow.toISOString(),
        skip_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', outreach.id);

    if (resetError) {
      console.log(`   ❌ Failed to reset message: ${resetError.message}`);
      stillFailed++;
      continue;
    }

    console.log(`   ✅ Message reset to pending and rescheduled`);
    fixed++;

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log(`\n\n📊 Summary:`);
  console.log(`   ✅ Fixed and rescheduled: ${fixed}`);
  console.log(`   ❌ Still failed: ${stillFailed}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📊 Total processed: ${failedMessages.length}\n`);

  if (fixed > 0) {
    console.log(`✅ Successfully fixed ${fixed} message(s). They will be retried tomorrow at 9 AM.`);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
