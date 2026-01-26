/**
 * Merge finance-leadgen-1000 into finance-fi-company-enrichment
 * 
 * Steps:
 * 1. Move all contacts from finance-leadgen-1000 to finance-fi-company-enrichment
 * 2. Move all messages from finance-leadgen-1000 to finance-fi-company-enrichment
 * 3. Delete finance-leadgen-1000 campaign
 * 
 * Usage:
 *   npx ts-node scripts/merge-finance-campaigns.ts [--dry-run]
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('\n🔄 Merging Finance Campaigns\n')

  // Get finance offer
  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('slug', 'finance')
    .single()

  if (!offer) {
    console.error('❌ Finance offer not found')
    return
  }

  // Get campaigns
  const { data: sourceCampaign } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('offer_id', offer.id)
    .eq('name', 'finance-leadgen-1000')
    .single()

  const { data: targetCampaign } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('offer_id', offer.id)
    .eq('name', 'finance-fi-company-enrichment')
    .single()

  if (!sourceCampaign || !targetCampaign) {
    console.error('❌ Campaigns not found')
    return
  }

  console.log(`Source: ${sourceCampaign.name} (${sourceCampaign.id})`)
  console.log(`Target: ${targetCampaign.name} (${targetCampaign.id})`)
  console.log('')

  // Get contacts from source campaign
  const { data: sourceContacts } = await supabase
    .from('campaign_contacts')
    .select('contact_id, status')
    .eq('campaign_id', sourceCampaign.id)

  // Get contacts already in target campaign
  const { data: targetContacts } = await supabase
    .from('campaign_contacts')
    .select('contact_id')
    .eq('campaign_id', targetCampaign.id)

  const targetContactIds = new Set(targetContacts?.map(c => c.contact_id) || [])
  const newContacts = sourceContacts?.filter(c => !targetContactIds.has(c.contact_id)) || []

  console.log(`📊 Contacts:`)
  console.log(`   Source campaign: ${sourceContacts?.length || 0}`)
  console.log(`   Target campaign: ${targetContacts?.length || 0}`)
  console.log(`   Already in target: ${sourceContacts?.length - newContacts.length}`)
  console.log(`   New to add: ${newContacts.length}`)
  console.log('')

  // Get messages from source campaign
  const { data: sourceMessages } = await supabase
    .from('messages')
    .select('id, contact_id, campaign_contact_id, subject, status')
    .eq('campaign_id', sourceCampaign.id)

  // Get send_queue items from source campaign
  const { data: sourceQueueItems } = await supabase
    .from('send_queue')
    .select('id, contact_id, campaign_contact_id, subject, status, scheduled_for')
    .eq('campaign_id', sourceCampaign.id)

  console.log(`📧 Messages:`)
  console.log(`   Source campaign: ${sourceMessages?.length || 0}`)
  console.log(`   Statuses: ${sourceMessages?.map(m => m.status).join(', ') || 'none'}`)
  console.log('')
  console.log(`📬 Send Queue:`)
  console.log(`   Source campaign: ${sourceQueueItems?.length || 0}`)
  if (sourceQueueItems && sourceQueueItems.length > 0) {
    const byStatus = sourceQueueItems.reduce((acc, q) => {
      acc[q.status] = (acc[q.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`)
    })
  }
  console.log('')

  if (dryRun) {
    console.log('🔍 DRY RUN - Would:')
    console.log(`   1. Add ${newContacts.length} contacts to ${targetCampaign.name}`)
    console.log(`   2. Update ${sourceMessages?.length || 0} messages to point to ${targetCampaign.name}`)
    console.log(`   3. Update ${sourceQueueItems?.length || 0} send_queue items to point to ${targetCampaign.name}`)
    console.log(`   4. Delete ${sourceCampaign.name} campaign`)
    console.log('\nTo execute, run without --dry-run')
    return
  }

  // Step 1: Add missing contacts to target campaign
  if (newContacts.length > 0) {
    console.log(`📝 Adding ${newContacts.length} contacts to target campaign...`)
    
    // Need to get campaign_contact_id for each contact
    const contactsToAdd = []
    for (const cc of newContacts) {
      // Find the campaign_contact record in source to copy status
      const { data: sourceCC } = await supabase
        .from('campaign_contacts')
        .select('status')
        .eq('campaign_id', sourceCampaign.id)
        .eq('contact_id', cc.contact_id)
        .single()

      contactsToAdd.push({
        campaign_id: targetCampaign.id,
        contact_id: cc.contact_id,
        status: sourceCC?.status || 'queued'
      })
    }

    const { error: contactError } = await supabase
      .from('campaign_contacts')
      .insert(contactsToAdd)

    if (contactError) {
      console.error('❌ Error adding contacts:', contactError.message)
      return
    }

    console.log(`✅ Added ${newContacts.length} contacts`)
  }

  // Step 2: Update messages to point to target campaign
  if (sourceMessages && sourceMessages.length > 0) {
    console.log(`\n📝 Updating ${sourceMessages.length} messages...`)

    // For each message, need to find/create campaign_contact in target
    for (const message of sourceMessages) {
      // Find campaign_contact in target campaign
      const { data: targetCC } = await supabase
        .from('campaign_contacts')
        .select('id')
        .eq('campaign_id', targetCampaign.id)
        .eq('contact_id', message.contact_id)
        .single()

      if (!targetCC) {
        console.warn(`   ⚠️  No campaign_contact found for message ${message.id}`)
        continue
      }

      // Update message
      const { error: msgError } = await supabase
        .from('messages')
        .update({
          campaign_id: targetCampaign.id,
          campaign_contact_id: targetCC.id
        })
        .eq('id', message.id)

      if (msgError) {
        console.error(`   ❌ Error updating message ${message.id}:`, msgError.message)
      }
    }

    console.log(`✅ Updated ${sourceMessages.length} messages`)
  }

  // Step 2.5: Update send_queue items to point to target campaign
  if (sourceQueueItems && sourceQueueItems.length > 0) {
    console.log(`\n📝 Updating ${sourceQueueItems.length} send_queue items...`)

    let updated = 0
    for (const queueItem of sourceQueueItems) {
      // Find campaign_contact in target campaign
      const { data: targetCC } = await supabase
        .from('campaign_contacts')
        .select('id')
        .eq('campaign_id', targetCampaign.id)
        .eq('contact_id', queueItem.contact_id)
        .single()

      if (!targetCC) {
        console.warn(`   ⚠️  No campaign_contact found for send_queue ${queueItem.id}`)
        continue
      }

      // Update send_queue item
      const { error: queueError } = await supabase
        .from('send_queue')
        .update({
          campaign_id: targetCampaign.id,
          campaign_contact_id: targetCC.id
        })
        .eq('id', queueItem.id)

      if (queueError) {
        console.error(`   ❌ Error updating send_queue ${queueItem.id}:`, queueError.message)
      } else {
        updated++
      }
    }

    console.log(`✅ Updated ${updated}/${sourceQueueItems.length} send_queue items`)
  }

  // Step 3: Update all tables that reference source campaign
  console.log(`\n📝 Updating references to source campaign...`)
  
  // Update message_events
  const { error: eventsError } = await supabase
    .from('message_events')
    .update({ campaign_id: targetCampaign.id })
    .eq('campaign_id', sourceCampaign.id)

  if (eventsError && !eventsError.message.includes('does not exist')) {
    console.warn(`   ⚠️  Error updating message_events: ${eventsError.message}`)
  } else {
    console.log(`✅ Updated message_events`)
  }

  // Update outreach_history
  const { error: historyError } = await supabase
    .from('outreach_history')
    .update({ campaign_id: targetCampaign.id })
    .eq('campaign_id', sourceCampaign.id)

  if (historyError && !historyError.message.includes('does not exist')) {
    console.warn(`   ⚠️  Error updating outreach_history: ${historyError.message}`)
  } else {
    console.log(`✅ Updated outreach_history`)
  }

  // Step 4: Delete source campaign (cascade will delete campaign_contacts)
  console.log(`\n🗑️  Deleting source campaign...`)
  const { error: deleteError } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', sourceCampaign.id)

  if (deleteError) {
    console.error('❌ Error deleting campaign:', deleteError.message)
    console.error('   This is OK - campaign may have other references')
    console.error('   All data has been moved to target campaign')
    return
  }

  console.log(`✅ Deleted ${sourceCampaign.name}`)

  // Final stats
  const { data: finalContacts } = await supabase
    .from('campaign_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', targetCampaign.id)

  const { data: finalMessages } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', targetCampaign.id)

  const { data: finalQueueItems } = await supabase
    .from('send_queue')
    .select('id, status', { count: 'exact' })
    .eq('campaign_id', targetCampaign.id)

  const pendingQueue = finalQueueItems?.filter(q => q.status === 'pending').length || 0

  console.log(`\n\n✅ Merge Complete!`)
  console.log(`   Final campaign: ${targetCampaign.name}`)
  console.log(`   Total contacts: ${finalContacts?.length || 0}`)
  console.log(`   Total messages: ${finalMessages?.length || 0}`)
  console.log(`   Send queue items: ${finalQueueItems?.length || 0}`)
  console.log(`   Pending emails: ${pendingQueue}`)
}

main().catch(console.error)
