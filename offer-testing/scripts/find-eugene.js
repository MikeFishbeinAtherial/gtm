// Find Eugene Leychenko's LinkedIn ID
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

async function findEugene() {
  const env = loadEnv()
  const UNIPILE_API_KEY = env.UNIPILE_API_KEY
  const UNIPILE_DSN = env.UNIPILE_DSN
  const ACCOUNT_ID = 'eSaTTfPuRx6t131-4hjfSg'

  console.log('🔍 Searching for Eugene Leychenko in your connections...\n')

  try {
    // Get all connections (we'll paginate through them)
    let allConnections = []
    let cursor = null
    let page = 1
    
    do {
      console.log(`Fetching page ${page}...`)
      
      const url = cursor 
        ? `${UNIPILE_DSN}/users/relations?account_id=${ACCOUNT_ID}&limit=100&cursor=${cursor}`
        : `${UNIPILE_DSN}/users/relations?account_id=${ACCOUNT_ID}&limit=100`
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': UNIPILE_API_KEY,
          'accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const relations = data.items || []
      
      allConnections = allConnections.concat(relations)
      cursor = data.cursor
      page++
      
      // Small delay between pages
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
    } while (cursor)

    console.log(`\n✅ Found ${allConnections.length} total connections\n`)

    // Search for Eugene
    const eugene = allConnections.find(conn => 
      conn.name?.toLowerCase().includes('eugene') && 
      conn.name?.toLowerCase().includes('leychenko')
    )

    if (eugene) {
      console.log('🎯 FOUND EUGENE LEYCHENKO!\n')
      console.log('Full Details:')
      console.log(JSON.stringify(eugene, null, 2))
      console.log('\n' + '='.repeat(60))
      console.log('📋 Key Information for Sending Message:')
      console.log('='.repeat(60))
      console.log(`Name: ${eugene.name}`)
      console.log(`LinkedIn ID: ${eugene.id}`)
      console.log(`Profile URL: ${eugene.public_identifier ? 'https://linkedin.com/in/' + eugene.public_identifier : 'N/A'}`)
      console.log(`Headline: ${eugene.headline || 'N/A'}`)
      console.log(`Company: ${eugene.company || 'N/A'}`)
      console.log('='.repeat(60))
    } else {
      console.log('❌ Eugene Leychenko not found in your connections')
      console.log('\n📋 Here are some connections with "Eugene" in the name:')
      
      const eugenes = allConnections.filter(conn => 
        conn.name?.toLowerCase().includes('eugene')
      )
      
      if (eugenes.length > 0) {
        eugenes.forEach(e => {
          console.log(`  - ${e.name} (${e.headline || 'No headline'})`)
        })
      } else {
        console.log('  No connections with "Eugene" found')
      }
      
      console.log('\n📋 Here are some connections with "Leychenko" in the name:')
      const leychenkos = allConnections.filter(conn => 
        conn.name?.toLowerCase().includes('leychenko')
      )
      
      if (leychenkos.length > 0) {
        leychenkos.forEach(l => {
          console.log(`  - ${l.name} (${l.headline || 'No headline'})`)
        })
      } else {
        console.log('  No connections with "Leychenko" found')
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

findEugene()

