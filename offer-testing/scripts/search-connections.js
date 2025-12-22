// Search for Eugene with fuzzy matching
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

async function searchConnections() {
  const env = loadEnv()
  const UNIPILE_API_KEY = env.UNIPILE_API_KEY
  const UNIPILE_DSN = env.UNIPILE_DSN
  const ACCOUNT_ID = 'eSaTTfPuRx6t131-4hjfSg'

  console.log('🔍 Searching your 7672 connections...\n')

  try {
    // Get all connections
    let allConnections = []
    let cursor = null
    
    do {
      const url = cursor 
        ? `${UNIPILE_DSN}/users/relations?account_id=${ACCOUNT_ID}&limit=100&cursor=${cursor}`
        : `${UNIPILE_DSN}/users/relations?account_id=${ACCOUNT_ID}&limit=100`
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': UNIPILE_API_KEY,
          'accept': 'application/json'
        }
      })

      const data = await response.json()
      const relations = data.items || []
      
      allConnections = allConnections.concat(relations)
      cursor = data.cursor
      
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
    } while (cursor)

    console.log(`✅ Loaded ${allConnections.length} connections\n`)

    // Search for variations
    const searchTerms = ['eugene', 'leychen', 'leichen']
    let matches = []
    
    for (const term of searchTerms) {
      const found = allConnections.filter(conn => 
        conn.name?.toLowerCase().includes(term)
      )
      matches = matches.concat(found)
    }
    
    // Remove duplicates
    matches = [...new Map(matches.map(m => [m.id, m])).values()]
    
    if (matches.length > 0) {
      console.log(`📋 Found ${matches.length} possible matches:\n`)
      matches.slice(0, 20).forEach((conn, i) => {
        console.log(`${i + 1}. ${conn.name}`)
        console.log(`   LinkedIn ID: ${conn.id}`)
        console.log(`   Headline: ${conn.headline || 'N/A'}`)
        console.log(`   Company: ${conn.company || 'N/A'}`)
        console.log('')
      })
    } else {
      console.log('❌ No matches found\n')
      console.log('💡 Let me show you the first 10 connections so you can pick someone:')
      allConnections.slice(0, 10).forEach((conn, i) => {
        console.log(`\n${i + 1}. ${conn.name}`)
        console.log(`   ID: ${conn.id}`)
        console.log(`   Headline: ${conn.headline || 'N/A'}`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

searchConnections()

