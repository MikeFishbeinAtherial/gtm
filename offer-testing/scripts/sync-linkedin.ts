/**
 * Sync LinkedIn Data Script
 * 
 * This script pulls your LinkedIn connections and messages from Unipile
 * and stores them in Supabase.
 * 
 * Usage:
 *   npx ts-node scripts/sync-linkedin.ts
 */

import { fullLinkedInSync, getConnectionStats } from '../src/lib/networking/linkedin-sync.js'
import { unipile } from '../src/lib/clients/unipile.js'

async function main() {
  console.log('🔗 LinkedIn Data Sync\n')

  try {
    // Step 1: Get LinkedIn account from Unipile
    console.log('1️⃣  Fetching your Unipile accounts...')
    const accounts = await unipile.listAccounts()
    
    const linkedinAccount = accounts.find(
      a => a.provider === 'linkedin' || a.provider === 'LINKEDIN'
    )

    if (!linkedinAccount) {
      console.error('❌ No LinkedIn account found in Unipile.')
      console.log('\n💡 Make sure you:')
      console.log('   1. Connected your LinkedIn account in the Unipile dashboard')
      console.log('   2. Set UNIPILE_API_KEY and UNIPILE_DSN in .env.local')
      process.exit(1)
    }

    console.log(`✅ Found LinkedIn account: ${linkedinAccount.name || linkedinAccount.email}`)
    console.log(`   Account ID: ${linkedinAccount.id}\n`)

    // Step 2: Sync all data
    const results = await fullLinkedInSync(linkedinAccount.id)

    // Step 3: Show summary stats
    console.log('\n📈 Getting connection statistics...')
    const stats = await getConnectionStats()
    
    if (stats) {
      console.log('\n' + '='.repeat(50))
      console.log('📊 YOUR NETWORK')
      console.log('='.repeat(50))
      console.log(`Total Connections: ${stats.total}`)
      console.log(`Ready for Outreach: ${stats.ready}`)
      console.log(`Already Contacted: ${stats.contacted}`)
      console.log(`Skipped: ${stats.skipped}`)
      console.log('')
      console.log('Priority Distribution:')
      console.log(`  High:   ${stats.by_priority.high}`)
      console.log(`  Medium: ${stats.by_priority.medium}`)
      console.log(`  Low:    ${stats.by_priority.low}`)
      console.log(`  Unset:  ${stats.by_priority.unset}`)
      console.log('='.repeat(50))
    }

    console.log('\n✅ Sync complete!')
    console.log('\n💡 Next steps:')
    console.log('   1. Review your connections in Supabase')
    console.log('   2. Tag/categorize connections (family, close friends, etc.)')
    console.log('   3. Set priority levels for who to contact first')
    console.log('   4. Create your networking campaign batch')

  } catch (error) {
    console.error('\n❌ Sync failed:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('UNIPILE')) {
        console.log('\n💡 Make sure your .env.local has:')
        console.log('   UNIPILE_API_KEY=your-key')
        console.log('   UNIPILE_DSN=your-dsn')
      } else if (error.message.includes('SUPABASE')) {
        console.log('\n💡 Make sure your .env.local has:')
        console.log('   NEXT_PUBLIC_SUPABASE_URL=your-url')
        console.log('   SUPABASE_SERVICE_ROLE_KEY=your-key')
      }
    }
    
    process.exit(1)
  }
}

main()

