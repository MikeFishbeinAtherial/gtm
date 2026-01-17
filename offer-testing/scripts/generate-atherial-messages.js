#!/usr/bin/env node

/**
 * Generate Atherial AI Roleplay Campaign Messages
 * 
 * For connections from companies NOT hiring sales:
 * 1. Fill in message template with first name
 * 2. Randomly assign one of 4 variants
 * 3. Create entry in networking_outreach table
 * 4. Schedule send times 6-16 minutes apart
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SECRET_KEY 
  || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🚀 Starting Atherial AI Roleplay Message Generation\n');

// Import supabase client
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Message templates (4 variants)
const MESSAGE_TEMPLATES = [
  `Hey {{firstname}}, hope your 2026 is going well! 

Do you know anyone hiring for sales/gtm who'd want to cut ramp time and boost win rates?

We build custom AI role play trainers where new hires practice calls with AI prospects that act like their real prospects. Then they get personalized feedback from an AI coach trained on the company's winning scripts and playbooks. Watch demo video here: https://www.atherial.ai/ai-sales-role-play

Happy for intros to sales leaders or business owners who'd find this useful. I'll create an AI prospect of their ICP so they can experience how real the calls are. Thanks and let me know if there's anything I can do for you!`,

  `Hey {{firstname}}, hope your 2026 is off to a good start!

Do you know anyone hiring for sales/gtm who'd want to cut ramp time and boost win rates?

We build custom AI role play trainers where new hires practice calls with AI prospects that act like their real prospects. They get unlimited reps before touching actual leads, plus tailored coaching based on what actually works.

One recent client is already seeing an 18% improvement in cold call conversion rates after just a few weeks.

Happy for intros if you know a sales leader or business owner who'd find this useful. Thanks and let me know if there's any way I can help you!`,

  `Hey {{firstname}}, hope your 2026 is off to a good start!

Do you know anyone who's growing their sales/gtm team and wants to get them onboarded and winning more deals faster? 

We build custom AI role play trainers where new hires practice against AI prospects that act like their real prospects. Then they get feedback from an AI sales coach trained on the company's playbooks. Watch demo video here: https://www.atherial.ai/ai-sales-role-play

Let me know if you know a sales leader or business owner who'd find this useful. Happy to set up free practice calls with their ICP so they can see how realistic it feels.

Thanks and let me know if there's any way I can help you!`,

  `Hey {{firstname}}, hope your 2026 is going well! 

Do you know any business owners with sales teams or sales/gtm leaders who want to improve their team's win rate?

We build custom AI role play trainers where reps do practice calls with AI prospects that act like their real prospects. They get unlimited reps before touching real leads, plus tailored coaching based on the company's winning scripts. 

One recent client is already seeing an 18% improvement in cold call conversion rates after just a few weeks.

Let me know if you know someone who'd find this useful. Happy to set up free practice calls with their ICP so they can see how real the calls are. Thanks and let me know if there's any way I can help you!`,

  `Hey {{firstname}}, hope your 2026 is going great! 

Do you know any gtm leaders or business owners who are working on improving win rate? 

We build custom AI roleplay trainers for clients in 3 weeks. Reps practice calls with AI prospects trained on their real objections and scenarios. Then reps get feedback from an AI coach that's trained on what the company's top performers do. Here's a demo video: https://www.atherial.ai/ai-sales-role-play

One recent client is already seeing an 18% improvement in cold call conversion rates after just a few weeks.

Let me know if you know someone who'd find this useful. Happy to set up free practice calls with their ICP so they can test it free. Thanks and please update me on what you're working on this year!`
];

// Helper function to replace template variables
function personalizeMessage(template, variables) {
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'gi');
    message = message.replace(regex, value || '');
  }
  return message;
}

// Helper function to get random variant
function getRandomVariant() {
  return MESSAGE_TEMPLATES[Math.floor(Math.random() * MESSAGE_TEMPLATES.length)];
}

// Helper function to generate random delay between 6-16 minutes
function getRandomDelay() {
  return Math.floor(Math.random() * (16 - 6 + 1) + 6) * 60 * 1000; // Convert to milliseconds
}

async function main() {
  try {
    // Step 1: Get or create the campaign batch
    console.log('📋 Finding or creating campaign batch...');
    let { data: campaign, error: campaignError } = await supabase
      .from('networking_campaign_batches')
      .select('*')
      .eq('slug', 'atherial-ai-roleplay-2025-q1')
      .single();

    if (campaignError || !campaign) {
      console.log('   Campaign not found, creating it...');
      const { data: newCampaign, error: createError } = await supabase
        .from('networking_campaign_batches')
        .insert({
          name: 'Atherial AI Roleplay Training - 2025 Q1',
          slug: 'atherial-ai-roleplay-2025-q1',
          description: 'Outreach to 2025-2026 LinkedIn connections for Atherial AI roleplay training offer',
          message_template: MESSAGE_TEMPLATES[0], // Use first variant as base template
          status: 'draft'
        })
        .select()
        .single();

      if (createError || !newCampaign) {
        console.error('❌ Failed to create campaign:', createError?.message);
        process.exit(1);
      }
      campaign = newCampaign;
      console.log(`✅ Created campaign: ${campaign.name} (${campaign.id})\n`);
    } else {
      console.log(`✅ Found campaign: ${campaign.name} (${campaign.id})\n`);
    }

    // Step 2: Get all connections from companies NOT hiring sales
    console.log('👥 Loading connections from companies NOT hiring sales...');
    
    // First, get the do_not_message list
    const { data: doNotMessage, error: dnmError } = await supabase
      .from('do_not_message')
      .select('linkedin_url, linkedin_id, email');
    
    if (dnmError) {
      console.warn('⚠️  Could not load do_not_message list:', dnmError.message);
    }
    
    const blockedUrls = new Set((doNotMessage || []).map(d => d.linkedin_url).filter(Boolean));
    const blockedIds = new Set((doNotMessage || []).map(d => d.linkedin_id).filter(Boolean));
    const blockedEmails = new Set((doNotMessage || []).map(d => d.email).filter(Boolean));
    
    console.log(`   🚫 Excluding ${blockedUrls.size} people from do_not_message list`);
    
    const { data: connections, error: connectionsError } = await supabase
      .from('linkedin_connections')
      .select('*')
      .eq('is_hiring_sales', false)
      .not('sumble_checked_at', 'is', null)  // Only checked companies
      .eq('skip_outreach', false)
      .gte('connected_at', '2025-01-01')
      .lt('connected_at', '2027-01-01')
      .order('current_company', { ascending: true })
      .order('full_name', { ascending: true });

    if (connectionsError) {
      throw new Error(`Database error: ${connectionsError.message}`);
    }

    if (!connections || connections.length === 0) {
      console.error('❌ No connections found');
      process.exit(1);
    }

    console.log(`✅ Found ${connections.length} connections ready for messaging\n`);

    // Step 3: Generate personalized messages with scheduled times
    console.log('✍️  Generating personalized messages...\n');

    let generated = 0;
    let skipped = 0;
    let errors = 0;

    // Start scheduling from now + 1 minute
    let currentScheduledTime = new Date(Date.now() + 60 * 1000); // Start 1 minute from now

    for (const connection of connections) {
      try {
        // Check if person is in do_not_message list
        const isBlocked = blockedUrls.has(connection.linkedin_url) ||
                         blockedIds.has(connection.linkedin_id) ||
                         (connection.email && blockedEmails.has(connection.email));
        
        if (isBlocked) {
          skipped++;
          process.stdout.write(`\rGenerated: ${generated} | Skipped: ${skipped} (blocked) | Errors: ${errors}`);
          continue;
        }
        
        // Check if message already exists for this contact in this campaign
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

        // Extract first name
        const firstname = connection.full_name ? connection.full_name.split(' ')[0] : 'there';

        // Get random variant
        const template = getRandomVariant();
        const variantIndex = MESSAGE_TEMPLATES.indexOf(template) + 1;

        // Personalize message
        const personalizedMessage = personalizeMessage(template, { firstname });

        // Calculate scheduled time (6-16 minutes apart)
        const delay = getRandomDelay();
        currentScheduledTime = new Date(currentScheduledTime.getTime() + delay);

        // Create outreach record
        const { error: insertError } = await supabase
          .from('networking_outreach')
          .insert({
            batch_id: campaign.id,
            connection_id: connection.id,
            personalized_message: personalizedMessage,
            personalization_notes: `Variant ${variantIndex}, firstname: ${firstname}`,
            status: 'pending',
            scheduled_at: currentScheduledTime.toISOString()
          });

        if (insertError) {
          console.error(`\n❌ Error creating message for ${connection.full_name}: ${insertError.message}`);
          errors++;
        } else {
          generated++;
          process.stdout.write(`\rGenerated: ${generated} | Skipped: ${skipped} | Errors: ${errors} | Next: ${currentScheduledTime.toLocaleTimeString()}`);
        }

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 10));

      } catch (error) {
        console.error(`\n❌ Error processing ${connection.full_name}: ${error.message}`);
        errors++;
      }
    }

    console.log('\n\n✅ Message generation complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   Generated: ${generated} messages`);
    console.log(`   Skipped: ${skipped} (already exist)`);
    console.log(`   Errors: ${errors}`);
    console.log(`\n⏰ Scheduling:`);
    console.log(`   First message: ${new Date(Date.now() + 60 * 1000).toLocaleString()}`);
    console.log(`   Last message: ${currentScheduledTime.toLocaleString()}`);
    console.log(`   Total duration: ~${Math.round((currentScheduledTime.getTime() - Date.now() - 60000) / 1000 / 60)} minutes`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review messages in Supabase (networking_outreach table)`);
    console.log(`   2. Run process-message-queue.js to send messages`);
    console.log(`   3. Or use the Unipile API to send manually`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
