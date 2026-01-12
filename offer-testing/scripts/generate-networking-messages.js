#!/usr/bin/env node

/**
 * Generate Networking Messages
 * 
 * For each imported contact in linkedin_connections:
 * 1. Fill in message template with first name
 * 2. Create entry in networking_outreach table
 * 3. Link to campaign batch
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Check for Supabase service key with multiple possible names
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SECRET_KEY 
  || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🚀 Starting Message Generation\n');

// Import supabase client
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Message template
const MESSAGE_TEMPLATE = `Happy holidays {{firstname}}! What's in store for you in 2026? 

Let me know if I can be a resource to anyone in your network who wants to implement custom AI agents or internal tools. Here are demo videos of some of what we've shipped to production: https://www.atherial.ai/work. Happy to share lessons and best practices.`;

// Step 1: Get the campaign batch
console.log('📋 Finding campaign batch...');
const { data: campaign, error: campaignError } = await supabase
  .from('networking_campaign_batches')
  .select('*')
  .eq('name', 'networking-holidays-2025')
  .single();

if (campaignError || !campaign) {
  console.error('❌ Campaign not found:', campaignError?.message);
  console.log('💡 Make sure the campaign was created in Supabase');
  process.exit(1);
}

console.log(`✅ Found campaign: ${campaign.name} (${campaign.id})\n`);

// Step 2: Get all imported contacts
console.log('👥 Loading imported contacts...');
const { data: connections, error: connectionsError } = await supabase
  .from('linkedin_connections')
  .select('*')
  .not('linkedin_id', 'is', null);

if (connectionsError || !connections || connections.length === 0) {
  console.error('❌ No contacts found:', connectionsError?.message);
  console.log('💡 Run import-networking-contacts.js first');
  process.exit(1);
}

console.log(`✅ Found ${connections.length} contacts\n`);

// Step 3: Generate personalized messages
console.log('✍️  Generating personalized messages...\n');

let generated = 0;
let skipped = 0;
let errors = 0;

for (const connection of connections) {
  try {
    // Check if message already exists for this contact in this campaign
    // First check by connection_id (same record)
    const { data: existing } = await supabase
      .from('networking_outreach')
      .select('id')
      .eq('batch_id', campaign.id)
      .eq('connection_id', connection.id)
      .single();

    if (existing) {
      skipped++;
      process.stdout.write(`\rGenerated: ${generated} | Skipped: ${skipped} | Errors: ${errors}`);
      continue;
    }

    // CRITICAL: Also check by LinkedIn ID/URL to prevent duplicates
    // This catches cases where the same person has multiple connection records
    if (connection.linkedin_id && !connection.linkedin_id.startsWith('temp_')) {
      const { data: existingByLinkedInId } = await supabase
        .from('networking_outreach')
        .select(`
          id,
          linkedin_connections!inner(linkedin_id)
        `)
        .eq('batch_id', campaign.id)
        .eq('linkedin_connections.linkedin_id', connection.linkedin_id);

      if (existingByLinkedInId && existingByLinkedInId.length > 0) {
        skipped++;
        process.stdout.write(`\rGenerated: ${generated} | Skipped: ${skipped} | Errors: ${errors}`);
        continue;
      }
    }

    // Also check by LinkedIn URL if available
    if (connection.linkedin_url) {
      const { data: existingByUrl } = await supabase
        .from('networking_outreach')
        .select(`
          id,
          linkedin_connections!inner(linkedin_url)
        `)
        .eq('batch_id', campaign.id)
        .eq('linkedin_connections.linkedin_url', connection.linkedin_url);

      if (existingByUrl && existingByUrl.length > 0) {
        skipped++;
        process.stdout.write(`\rGenerated: ${generated} | Skipped: ${skipped} | Errors: ${errors}`);
        continue;
      }
    }

    // Personalize message
    const firstName = connection.first_name || 'there';
    const personalizedMessage = MESSAGE_TEMPLATE.replace('{{firstname}}', firstName);

    // Insert into networking_outreach
    const { error: insertError } = await supabase
      .from('networking_outreach')
      .insert({
        batch_id: campaign.id,
        connection_id: connection.id,
        personalized_message: personalizedMessage,
        personalization_notes: `First name: ${firstName}`,
        status: 'pending'
      });

    if (insertError) {
      console.error(`\n❌ Error for ${connection.first_name}:`, insertError.message);
      errors++;
    } else {
      generated++;
    }

    process.stdout.write(`\rGenerated: ${generated} | Skipped: ${skipped} | Errors: ${errors}`);

  } catch (err) {
    console.error(`\n❌ Exception for ${connection.first_name}:`, err.message);
    errors++;
  }

  // Small delay
  await new Promise(resolve => setTimeout(resolve, 50));
}

console.log('\n');

// Step 4: Update campaign batch with total count
const { error: updateError } = await supabase
  .from('networking_campaign_batches')
  .update({
    total_target_count: generated + skipped,
    status: 'ready',
    updated_at: new Date().toISOString()
  })
  .eq('id', campaign.id);

if (updateError) {
  console.error('⚠️  Failed to update campaign count:', updateError.message);
}

// Summary
console.log('═══════════════════════════════════════');
console.log('📊 MESSAGE GENERATION SUMMARY');
console.log('═══════════════════════════════════════');
console.log(`Total contacts:     ${connections.length}`);
console.log(`Messages generated: ${generated}`);
console.log(`Already existed:    ${skipped}`);
console.log(`Errors:             ${errors}`);
console.log('═══════════════════════════════════════\n');

// Show sample messages
if (generated > 0) {
  console.log('📝 Sample Messages:\n');
  
  const { data: samples } = await supabase
    .from('networking_outreach')
    .select(`
      personalized_message,
      linkedin_connections!inner(first_name, linkedin_url)
    `)
    .eq('batch_id', campaign.id)
    .limit(3);

  if (samples && samples.length > 0) {
    samples.forEach((sample, i) => {
      console.log(`Sample ${i + 1}:`);
      console.log(`To: ${sample.linkedin_connections.first_name}`);
      console.log(`URL: ${sample.linkedin_connections.linkedin_url}`);
      console.log(`Message:\n${sample.personalized_message}`);
      console.log('─────────────────────────────────────\n');
    });
  }
}

if (errors === 0 && generated > 0) {
  console.log('✅ Message generation complete!\n');
  console.log('⏭️  Next steps:');
  console.log('   1. Review messages in Supabase (optional)');
  console.log('   2. Run: node scripts/monitor-networking-campaign.js (in separate terminal)');
  console.log('   3. Run: node scripts/send-networking-campaign.js (when ready to send)');
} else if (errors > 0) {
  console.log('⚠️  Generation completed with errors. Check logs above.\n');
} else if (generated === 0 && skipped > 0) {
  console.log('ℹ️  All messages already generated. Ready to send!\n');
  console.log('⏭️  Next steps:');
  console.log('   1. Run: node scripts/monitor-networking-campaign.js (in separate terminal)');
  console.log('   2. Run: node scripts/send-networking-campaign.js');
}

