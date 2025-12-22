/**
 * Test Unipile Connection
 * 
 * This script tests your Unipile API connection and displays your connected accounts.
 */

import { unipile } from '../src/lib/clients/unipile.js'

async function testUnipile() {
  console.log('🔌 Testing Unipile Connection...\n')

  try {
    // Test 1: List accounts
    console.log('1️⃣ Fetching connected accounts...')
    const accounts = await unipile.listAccounts()
    
    if (accounts.length === 0) {
      console.log('❌ No accounts connected!')
      console.log('Go to your Unipile dashboard to connect your LinkedIn account.')
      return
    }

    console.log(`✅ Found ${accounts.length} connected account(s):\n`)
    
    accounts.forEach((account, index) => {
      console.log(`Account ${index + 1}:`)
      console.log(`  - ID: ${account.id}`)
      console.log(`  - Provider: ${account.provider}`)
      console.log(`  - Email: ${account.email || 'N/A'}`)
      console.log(`  - Name: ${account.name || 'N/A'}`)
      console.log(`  - Status: ${account.status}`)
      console.log('')
    })

    // Test 2: Get conversations count for LinkedIn account
    const linkedinAccount = accounts.find(a => a.provider === 'linkedin')
    if (linkedinAccount) {
      console.log('2️⃣ Fetching conversations...')
      const conversations = await unipile.getConversations(linkedinAccount.id, 10)
      console.log(`✅ Found ${conversations.length} recent conversations\n`)
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

