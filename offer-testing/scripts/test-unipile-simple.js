// Simple test script for Unipile connection
// Run with: node scripts/test-unipile-simple.js
// Make sure you have .env.local set up with UNIPILE_API_KEY and UNIPILE_DSN

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: resolve(__dirname, '../.env.local') })

const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY
const UNIPILE_DSN = process.env.UNIPILE_DSN

if (!UNIPILE_API_KEY || !UNIPILE_DSN) {
  console.error('❌ Missing environment variables!')
  console.error('Make sure .env.local has:')
  console.error('  UNIPILE_API_KEY=your-key')
  console.error('  UNIPILE_DSN=your-dsn')
  process.exit(1)
}

async function testUnipile() {
  console.log('🔌 Testing Unipile Connection...\n')

  try {
    // Test 1: List accounts
    console.log('1️⃣ Fetching connected accounts...')
    
    const response = await fetch(`${UNIPILE_DSN}/accounts`, {
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const accounts = await response.json()
    
    if (accounts.length === 0) {
      console.log('❌ No accounts connected!')
      console.log('Go to your Unipile dashboard to connect your LinkedIn account.')
      return
    }

    console.log(`✅ Found ${accounts.length} connected account(s):\n`)
    
    accounts.forEach((account, index) => {
      console.log(`Account ${index + 1}:`)
      console.log(`  - ID: ${account.id || account.account_id}`)
      console.log(`  - Provider: ${account.provider}`)
      console.log(`  - Email: ${account.email || 'N/A'}`)
      console.log(`  - Name: ${account.name || 'N/A'}`)
      console.log(`  - Status: ${account.status}`)
      console.log('')
    })

    // Test 2: Get conversations for LinkedIn account
    const linkedinAccount = accounts.find(a => a.provider === 'LINKEDIN' || a.provider === 'linkedin')
    if (linkedinAccount) {
      const accountId = linkedinAccount.id || linkedinAccount.account_id
      console.log('2️⃣ Fetching recent conversations...')
      
      const convResponse = await fetch(`${UNIPILE_DSN}/accounts/${accountId}/messages?limit=10`, {
        headers: {
          'X-API-KEY': UNIPILE_API_KEY,
          'accept': 'application/json'
        }
      })

      if (convResponse.ok) {
        const conversations = await convResponse.json()
        console.log(`✅ Found ${conversations.items?.length || conversations.length || 0} recent conversations\n`)
      } else {
        console.log(`⚠️ Could not fetch conversations (this is OK for a new account)\n`)
      }
    }

    console.log('✅ All tests passed! Your Unipile connection is working.')
    console.log('\n📝 Save these values to your .env.local file:')
    console.log(`UNIPILE_API_KEY=${UNIPILE_API_KEY}`)
    console.log(`UNIPILE_DSN=${UNIPILE_DSN}`)
    
    if (linkedinAccount) {
      const accountId = linkedinAccount.id || linkedinAccount.account_id
      console.log(`\n💡 Your LinkedIn account ID is: ${accountId}`)
    }

  } catch (error) {
    console.error('❌ Error testing Unipile:', error.message)
    console.error('\nFull error:', error)
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n💡 Tip: Check that your API key is correct')
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Tip: Check that your DSN URL is correct')
    } else if (error.cause) {
      console.log('\n💡 Cause:', error.cause.message || error.cause)
    }
  }
}

// Run the test
testUnipile()

