/**
 * Networking Campaign Setup
 * 
 * Creates the "Atherial" offer and "networking-holidays-2025" campaign
 * in Supabase for tracking.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local')
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const env = {}
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim()
      }
    }
  })
  
  return env
}

async function setupCampaign() {
  const env = loadEnv()
  
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('🚀 Setting up Networking Campaign...\n')

  try {
    // Step 1: Create or get the Networking Campaign Batch
    console.log('1️⃣  Creating campaign batch...')
    
    const messageTemplate = `Happy holidays {first_name}! What's in store for you in 2026? 

Let me know if I can be a resource to anyone in your network who wants to implement custom AI agents or internal tools. Here are demo videos of some of what we've shipped to production: https://www.atherial.ai/work. Happy to share lessons and best practices.`

    const { data: batch, error: batchError } = await supabase
      .from('networking_campaign_batches')
      .upsert({
        name: 'networking-holidays-2025',
        description: 'Holiday outreach to 1st-degree connections - reconnect and offer AI development services',
        message_template: messageTemplate,
        personalization_instructions: 'Replace {first_name} with recipient\'s first name',
        target_filters: {
          connection_degree: [1],
          min_priority: 'medium'
        },
        status: 'draft',
        total_target_count: 539
      }, {
        onConflict: 'name'
      })
      .select()
      .single()

    if (batchError) throw new Error(`Batch creation failed: ${batchError.message}`)

    console.log(`✅ Campaign batch created: ${batch.id}`)
    console.log(`   Name: ${batch.name}`)
    console.log(`   Status: ${batch.status}`)
    console.log(`   Targets: ${batch.total_target_count} contacts`)
    console.log('')

    // Step 2: Save batch ID for next scripts
    const configPath = path.join(__dirname, '../data/networking-campaign-config.json')
    fs.writeFileSync(configPath, JSON.stringify({
      batch_id: batch.id,
      batch_name: batch.name,
      created_at: new Date().toISOString(),
      unipile_account_id: 'eSaTTfPuRx6t131-4hjfSg',
      message_template: messageTemplate
    }, null, 2))

    console.log('💾 Campaign config saved')
    console.log(`   File: ${configPath}`)
    console.log('')

    console.log('=' .repeat(60))
    console.log('✅ CAMPAIGN SETUP COMPLETE')
    console.log('=' .repeat(60))
    console.log('')
    console.log('📋 Campaign Details:')
    console.log(`   ID: ${batch.id}`)
    console.log(`   Name: ${batch.name}`)
    console.log(`   Targets: 539 contacts`)
    console.log(`   Status: Draft (ready for import)`)
    console.log('')
    console.log('🎯 Next steps:')
    console.log('   1. Run: node scripts/import-networking-contacts.js')
    console.log('   2. Then: node scripts/campaign-monitor.js')
    console.log('   3. Finally: node scripts/campaign-send.js')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

setupCampaign()

