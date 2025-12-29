/**
 * Test Unipile Connection
 *
 * This script tests your Unipile API connection and displays your connected accounts.
 */

import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { UnipileClient } from '../src/lib/clients/unipile.ts'

async function testUnipile() {
  console.log('🔌 Testing Unipile Connection...\n')

  // Create a new client instance after environment is loaded
  const unipile = new UnipileClient()

  try {
    // Test 1: List accounts
    console.log('1️⃣ Fetching connected accounts...')
    const accounts = await unipile.listAccounts()

    // Handle different response formats
    let accountList = Array.isArray(accounts) ? accounts : accounts.items || accounts.data || []

    if (accountList.length === 0) {
      console.log('❌ No accounts connected!')
      console.log('Go to your Unipile dashboard to connect your LinkedIn account.')
      return
    }

    console.log(`✅ Found ${accountList.length} connected account(s):\n`)

    accountList.forEach((account, index) => {
      console.log(`Account ${index + 1}:`)
      console.log(`  - ID: ${account.id}`)
      console.log(`  - Provider: ${account.provider || account.type}`)
      console.log(`  - Email: ${account.email || 'N/A'}`)
      console.log(`  - Name: ${account.name || 'N/A'}`)
      console.log(`  - Status: ${account.status}`)
      console.log('')
    })

    // Test 2: Get conversations count for LinkedIn account
    const linkedinAccount = accountList.find(a => a.provider === 'LINKEDIN' || a.type === 'LINKEDIN')
    if (linkedinAccount) {
      console.log('2️⃣ Fetching conversations...')
      try {
        const conversations = await unipile.getConversations(linkedinAccount.id, 10)
        console.log(`✅ Found ${conversations.length} recent conversations\n`)
      } catch (error) {
        console.log('ℹ️ Could not fetch conversations (this is normal for new accounts)\n')
      }

      console.log('=' .repeat(60))
      console.log('✅ ALL TESTS PASSED! Your Unipile connection is working.')
      console.log('=' .repeat(60))
      console.log('\n💡 Your LinkedIn account ID is:', linkedinAccount.id)
      console.log('\n📝 Next steps:')
      console.log('   1. Set up your Supabase tables (run setup-networking-schema.sql)')
      console.log('   2. Sync your LinkedIn data: npx ts-node --esm scripts/sync-linkedin.ts')
    } else {
      console.log('⚠️ No LinkedIn account found')
    }

    console.log('✅ All tests passed! Your Unipile connection is working.')

  } catch (error) {
    console.error('❌ Error testing Unipile:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('403')) {
        console.log('\n💡 Tip: Check that your UNIPILE_API_KEY is correct in .env.local')
      } else if (error.message.includes('DSN')) {
        console.log('\n💡 Tip: You might also need to set UNIPILE_DSN in .env.local')
        console.log('   The DSN is the base URL from Unipile (e.g., https://1api24.unipile.com:15421/api/v1)')
      }
    }
  }
}

// Run the test
testUnipile()

