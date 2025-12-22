// Show recent connections you can message
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

async function showRecentConnections() {
  const env = loadEnv()
  const UNIPILE_API_KEY = env.UNIPILE_API_KEY
  const UNIPILE_DSN = env.UNIPILE_DSN
  const ACCOUNT_ID = 'eSaTTfPuRx6t131-4hjfSg'

  console.log('📋 Showing your 20 most recent connections...\n')
  console.log('Pick someone you want to send a test message to.\n')

  try {
    const response = await fetch(
      `${UNIPILE_DSN}/users/relations?account_id=${ACCOUNT_ID}&limit=20`,
      {
        headers: {
          'X-API-KEY': UNIPILE_API_KEY,
          'accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const connections = data.items || []

    console.log('='.repeat(70))
    connections.forEach((conn, i) => {
      console.log(`\n${i + 1}. ${conn.name}`)
      console.log(`   LinkedIn ID: ${conn.id}`)
      console.log(`   Headline: ${conn.headline || 'N/A'}`)
      console.log(`   Company: ${conn.company || 'N/A'}`)
      const connDate = conn.connected_at ? new Date(conn.connected_at).toLocaleDateString() : 'Unknown'
      console.log(`   Connected: ${connDate}`)
    })
    console.log('\n' + '='.repeat(70))
    
    console.log('\n💡 To send a message to one of these people:')
    console.log('1. Copy their LinkedIn ID from above')
    console.log('2. Open scripts/send-test-message.js')
    console.log('3. Replace RECIPIENT_LINKEDIN_ID with their ID')
    console.log('4. Run: node scripts/send-test-message.js')
    
    console.log('\n🔍 Or search for Eugene by name:')
    console.log('   Can you double-check the spelling? Try:')
    console.log('   - Eugene Leychenko')
    console.log('   - Eugene Leychen')
    console.log('   - Yevgeny (Russian spelling?)')
    console.log('   - Or provide his LinkedIn URL')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

showRecentConnections()

