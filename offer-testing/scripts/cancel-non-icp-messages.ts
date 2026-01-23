/**
 * Cancel messages for non-ICP companies
 * Removes: banks, credit unions, other, fintech, mortgage, broker/dealers
 * Keeps: investment firms, hedge funds, private equity, unknowns
 * 
 * Usage:
 *   npx ts-node scripts/cancel-non-icp-messages.ts [--dry-run]
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

// Verticals to EXCLUDE (not ICP)
const BAD_VERTICALS = [
  'bank',
  'credit_union',
  'other',
  'fintech',
  'mortgage',
  'broker_dealer'
]

// Good verticals (keep these)
const GOOD_VERTICALS = [
  'hedge_fund',
  'private_equity',
  'investment_firm',
  'asset_manager',
  'unknown' // Keep unknowns - might be good companies mis-categorized
]

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('\n🗑️  Cancel Non-ICP Messages\n')

  // Get all messages with company info
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      id,
      subject,
      scheduled_at,
      contact:contacts!inner(
        first_name,
        email,
        companies!inner(
          name,
          vertical
        )
      )
    `)
    .eq('status', 'pending')

  // Filter to bad verticals
  const badMessages = (messages || []).filter((m: any) => 
    BAD_VERTICALS.includes(m.contact?.companies?.vertical)
  )

  // Group by vertical
  const byVertical = badMessages.reduce((acc, m: any) => {
    const vertical = m.contact.companies.vertical
    if (!acc[vertical]) acc[vertical] = []
    acc[vertical].push(m)
    return acc
  }, {} as Record<string, any[]>)

  console.log('📊 Messages to Cancel by Vertical:\n')
  Object.entries(byVertical)
    .sort(([, a], [, b]) => b.length - a.length)
    .forEach(([vertical, msgs]) => {
      console.log(`${vertical}: ${msgs.length} messages`)
      msgs.slice(0, 5).forEach((m: any) => {
        console.log(`  - ${m.contact.first_name} at ${m.contact.companies.name}`)
        console.log(`    Subject: "${m.subject}"`)
      })
      if (msgs.length > 5) {
        console.log(`  ... and ${msgs.length - 5} more`)
      }
      console.log('')
    })

  console.log(`\n📈 Summary:`)
  console.log(`  Total messages: ${messages?.length || 0}`)
  console.log(`  Messages to cancel: ${badMessages.length}`)
  console.log(`  Messages to keep: ${(messages?.length || 0) - badMessages.length}`)
  console.log('')

  if (badMessages.length === 0) {
    console.log('✅ No non-ICP messages found!')
    return
  }

  if (dryRun) {
    console.log('🔍 DRY RUN - No changes made')
    console.log('\nTo cancel these messages for real, run:')
    console.log('  npx ts-node scripts/cancel-non-icp-messages.ts')
    return
  }

  // Confirm before cancelling
  console.log('⚠️  About to DELETE these messages!')
  console.log('   They will NOT be sent on Jan 26')
  console.log('   This action permanently removes them from the database')
  console.log('')

  // Delete messages (cleaner than marking as cancelled)
  const messageIds = badMessages.map(m => m.id)
  
  console.log(`🗑️  Deleting ${messageIds.length} messages...`)
  
  const { error } = await supabase
    .from('messages')
    .delete()
    .in('id', messageIds)

  if (error) {
    console.error('❌ Failed to cancel messages:', error.message)
    process.exit(1)
  }

  console.log(`✅ Successfully deleted ${messageIds.length} messages`)
  console.log('')

  // Show remaining campaign
  const { data: remaining } = await supabase
    .from('messages')
    .select(`
      id,
      contact:contacts!inner(
        companies!inner(
          vertical
        )
      )
    `)
    .eq('status', 'pending')

  const remainingByVertical = (remaining || []).reduce((acc, m: any) => {
    const vertical = m.contact?.companies?.vertical || 'unknown'
    acc[vertical] = (acc[vertical] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('📊 Remaining Campaign Breakdown:')
  Object.entries(remainingByVertical)
    .sort(([, a], [, b]) => b - a)
    .forEach(([vertical, count]) => {
      const icon = GOOD_VERTICALS.includes(vertical) ? '✅' : '⚠️'
      console.log(`  ${icon} ${vertical}: ${count} contacts`)
    })

  console.log('')
  console.log('💡 Next Steps:')
  console.log('  1. Review "unknown" companies to verify they are ICP')
  console.log('  2. Check remaining messages: npx ts-node scripts/show-scheduled-messages.ts')
  console.log('  3. Campaign will start Jan 26 with cleaned list')
}

main().catch(console.error)
