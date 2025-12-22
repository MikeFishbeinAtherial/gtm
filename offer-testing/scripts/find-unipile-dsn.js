// Helper script to test different Unipile DSN formats
// Run with: node scripts/find-unipile-dsn.js

const API_KEY = '2HdAnLfuG.8z5MjY+YB9oo3jxLmwpWbHTcvsJ6anI4dQj2uDG3XKo='

// Different DSN formats to try
const DSN_FORMATS = [
  'https://api.unipile.com/v1',
  'https://api.unipile.com:13421/api/v1',
  'https://api24.unipile.com/v1',
  'https://api24.unipile.com:13421/api/v1',
  'https://1api24.unipile.com/api/v1',
  'https://1api24.unipile.com:15421/api/v1',
  'https://api.unipile.com/api/v1',
]

async function testDSN(dsn) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000) // 5s timeout

    const response = await fetch(`${dsn}/accounts`, {
      headers: {
        'X-API-KEY': API_KEY,
        'accept': 'application/json'
      },
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()
      return { success: true, data }
    } else {
      return { success: false, status: response.status, error: response.statusText }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Timeout (5s)' }
    }
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🔍 Testing different Unipile DSN formats...\n')
  console.log('This will try common URL patterns to find the correct one.\n')

  let foundWorking = false

  for (const dsn of DSN_FORMATS) {
    process.stdout.write(`Testing: ${dsn} ... `)
    
    const result = await testDSN(dsn)
    
    if (result.success) {
      console.log('✅ SUCCESS!')
      console.log('\n' + '='.repeat(60))
      console.log('🎉 FOUND WORKING DSN!')
      console.log('='.repeat(60))
      console.log(`\nYour DSN is: ${dsn}`)
      console.log('\nAdd this to your .env.local file:')
      console.log(`UNIPILE_DSN=${dsn}`)
      
      if (result.data && result.data.length > 0) {
        console.log('\nConnected accounts:')
        result.data.forEach((account, i) => {
          console.log(`  ${i + 1}. ${account.provider} - ${account.email || account.name || 'N/A'}`)
        })
      }
      console.log('='.repeat(60))
      foundWorking = true
      break
    } else {
      console.log(`❌ ${result.error || `HTTP ${result.status}`}`)
    }
  }

  if (!foundWorking) {
    console.log('\n' + '='.repeat(60))
    console.log('❌ No working DSN found')
    console.log('='.repeat(60))
    console.log('\nPossible reasons:')
    console.log('1. Your DSN uses a custom format not in the list above')
    console.log('2. Your API key is incorrect')
    console.log('3. Your Unipile account uses a different API version')
    console.log('4. There are network/firewall issues')
    console.log('\nNext steps:')
    console.log('1. Check your Unipile dashboard for the exact DSN')
    console.log('2. Contact Unipile support: support@unipile.com')
    console.log('3. Check their documentation: https://docs.unipile.com')
    console.log('\nTip: The DSN should be on your dashboard homepage')
    console.log('     It might be called "API Endpoint" or "Base URL"')
  }
}

main()

