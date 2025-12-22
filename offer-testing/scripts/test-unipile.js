// Simple test script for Unipile connection
// This loads .env.local and tests your Unipile API
// Run with: node scripts/test-unipile.js

const fs = require('fs')
const path = require('path')

// Load .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local')
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found!')
    console.error('Create it at: /Users/mikefishbein/Desktop/Vibe Coding/gtm/offer-testing/.env.local')
    console.error('\nIt should contain:')
    console.error('UNIPILE_API_KEY=your-key')
    console.error('UNIPILE_DSN=your-dsn')
    process.exit(1)
  }

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

async function testUnipile() {
  console.log('🔌 Testing Unipile Connection...\n')

  // Load environment
  const env = loadEnv()
  const UNIPILE_API_KEY = env.UNIPILE_API_KEY
  const UNIPILE_DSN = env.UNIPILE_DSN

  if (!UNIPILE_API_KEY || !UNIPILE_DSN) {
    console.error('❌ Missing environment variables in .env.local!')
    console.error('\nMake sure your .env.local has:')
    console.error('UNIPILE_API_KEY=your-key')
    console.error('UNIPILE_DSN=your-dsn')
    process.exit(1)
  }

  console.log('✓ Found UNIPILE_API_KEY:', UNIPILE_API_KEY.substring(0, 10) + '...')
  console.log('✓ Found UNIPILE_DSN:', UNIPILE_DSN)
  console.log('')

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
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    let accounts = await response.json()
    
    if (!Array.isArray(accounts) && accounts.items) {
      // Sometimes the response is wrapped in an items array
      accounts = accounts.items
    }
    
    if (!accounts || accounts.length === 0) {
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
    const linkedinAccount = accounts.find(a => 
      a.provider === 'LINKEDIN' || a.provider === 'linkedin'
    )
    
    if (linkedinAccount) {
      const accountId = linkedinAccount.id || linkedinAccount.account_id
      console.log('2️⃣ Fetching recent conversations...')
      
      const convResponse = await fetch(
        `${UNIPILE_DSN}/accounts/${accountId}/messages?limit=10`,
        {
          headers: {
            'X-API-KEY': UNIPILE_API_KEY,
            'accept': 'application/json'
          }
        }
      )

      if (convResponse.ok) {
        const conversations = await convResponse.json()
        const count = conversations.items?.length || conversations.length || 0
        console.log(`✅ Found ${count} recent conversations\n`)
      } else {
        console.log(`⚠️ Could not fetch conversations (this is OK for a new account)\n`)
      }
      
      console.log('=' .repeat(60))
      console.log('✅ ALL TESTS PASSED! Your Unipile connection is working.')
      console.log('=' .repeat(60))
      console.log('\n💡 Your LinkedIn account ID is:', accountId)
      console.log('\n📝 Next steps:')
      console.log('   1. Set up your Supabase tables (run setup-networking-schema.sql)')
      console.log('   2. Sync your LinkedIn data: npx ts-node --esm scripts/sync-linkedin.ts')
    } else {
      console.log('⚠️ No LinkedIn account found in your Unipile accounts')
      console.log('Make sure you connected your LinkedIn account in the Unipile dashboard')
    }

  } catch (error) {
    console.error('❌ Error testing Unipile:', error.message)
    
    if (error.cause) {
      console.error('💡 Cause:', error.cause.message || error.cause)
    }
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n💡 Tip: Check that your API key is correct in .env.local')
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Tip: Check that your DSN URL is correct in .env.local')
      console.log('   The DSN should look like: https://api.unipile.com/v1')
      console.log('   or similar. Check your Unipile dashboard for the exact URL.')
    } else if (error.cause && error.cause.code === 'ENOTFOUND') {
      console.log('\n💡 The DSN hostname cannot be found.')
      console.log('   Current DSN:', UNIPILE_DSN)
      console.log('\n   Possible issues:')
      console.log('   1. The hostname is incorrect')
      console.log('   2. You need to use a different API endpoint')
      console.log('\n   Check your Unipile dashboard for the correct API endpoint.')
      console.log('   Contact support@unipile.com if you\'re unsure.')
    }
    
    process.exit(1)
  }
}

// Run the test
testUnipile()

