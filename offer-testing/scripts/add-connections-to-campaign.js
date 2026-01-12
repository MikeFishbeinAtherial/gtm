#!/usr/bin/env node

/**
 * Add Connections to Campaign
 * 
 * Links connections to a campaign batch so you can track
 * which connections are in which campaigns.
 * 
 * Usage:
 *   node scripts/add-connections-to-campaign.js <campaign-slug> [connection-ids...]
 * 
 * Or to add all 2025 connections:
 *   node scripts/add-connections-to-campaign.js atherial-ai-roleplay-2025-q1 --all-2025
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SECRET_KEY 
  || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.error('❌ Usage: node scripts/add-connections-to-campaign.js <campaign-slug> [connection-ids...]')
    console.error('   Or: node scripts/add-connections-to-campaign.js <campaign-slug> --all-2025')
    process.exit(1)
  }

  const campaignSlug = args[0]
  const addAll2025 = args.includes('--all-2025')
  const connectionIds = args.filter(arg => arg !== '--all-2025' && arg !== campaignSlug)

  console.log(`🔗 Adding Connections to Campaign\n`)
  console.log(`   Campaign Slug: ${campaignSlug}`)

  // Step 1: Get campaign batch
  const { data: campaign, error: campaignError } = await supabase
    .from('networking_campaign_batches')
    .select('id, name, slug')
    .eq('slug', campaignSlug)
    .single()

  if (campaignError || !campaign) {
    console.error(`❌ Campaign not found: ${campaignSlug}`)
    console.error(`   Error: ${campaignError?.message || 'Not found'}`)
    process.exit(1)
  }

  console.log(`   Campaign: ${campaign.name} (${campaign.id})\n`)

  // Step 2: Get connections to add
  let connectionsToAdd = []

  if (addAll2025) {
    console.log('📋 Finding all 2025 connections...')
    const { data: connections2025, error } = await supabase
      .from('linkedin_connections')
      .select('id, full_name, current_company, connected_at')
      .gte('connected_at', '2025-01-01')
      .lt('connected_at', '2026-01-01')
      .eq('skip_outreach', false)

    if (error) {
      console.error(`❌ Error fetching connections: ${error.message}`)
      process.exit(1)
    }

    connectionsToAdd = connections2025 || []
    console.log(`   ✅ Found ${connectionsToAdd.length} connections from 2025\n`)
  } else if (connectionIds.length > 0) {
    console.log(`📋 Fetching ${connectionIds.length} connections...`)
    const { data: connections, error } = await supabase
      .from('linkedin_connections')
      .select('id, full_name, current_company')
      .in('id', connectionIds)

    if (error) {
      console.error(`❌ Error fetching connections: ${error.message}`)
      process.exit(1)
    }

    connectionsToAdd = connections || []
    console.log(`   ✅ Found ${connectionsToAdd.length} connections\n`)
  } else {
    console.error('❌ No connections specified. Use --all-2025 or provide connection IDs.')
    process.exit(1)
  }

  // Step 3: Check which are already in this campaign
  console.log('🔍 Checking existing campaign memberships...')
  const { data: existing } = await supabase
    .from('connection_campaigns')
    .select('connection_id')
    .eq('campaign_batch_id', campaign.id)
    .in('connection_id', connectionsToAdd.map(c => c.id))

  const existingIds = new Set(existing?.map(e => e.connection_id) || [])
  const newConnections = connectionsToAdd.filter(c => !existingIds.has(c.id))
  const alreadyInCampaign = connectionsToAdd.filter(c => existingIds.has(c.id))

  console.log(`   ✅ ${newConnections.length} new connections to add`)
  console.log(`   ⏭️  ${alreadyInCampaign.length} already in campaign\n`)

  if (newConnections.length === 0) {
    console.log('✅ All connections are already in this campaign!')
    return
  }

  // Step 4: Add connections to campaign
  console.log('➕ Adding connections to campaign...')
  
  const recordsToInsert = newConnections.map(conn => ({
    connection_id: conn.id,
    campaign_batch_id: campaign.id,
    status: 'added',
    added_at: new Date().toISOString()
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('connection_campaigns')
    .insert(recordsToInsert)
    .select()

  if (insertError) {
    console.error(`❌ Error adding connections: ${insertError.message}`)
    process.exit(1)
  }

  console.log(`\n✅ Successfully added ${inserted.length} connections to campaign!`)
  console.log(`\n📊 Summary:`)
  console.log(`   Campaign: ${campaign.name}`)
  console.log(`   New connections added: ${inserted.length}`)
  console.log(`   Already in campaign: ${alreadyInCampaign.length}`)
  console.log(`   Total in campaign: ${(existing?.length || 0) + inserted.length}`)
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
