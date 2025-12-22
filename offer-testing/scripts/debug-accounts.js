// Debug script to see full account details
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

async function getAccountDetails() {
  const env = loadEnv()
  const UNIPILE_API_KEY = env.UNIPILE_API_KEY
  const UNIPILE_DSN = env.UNIPILE_DSN

  console.log('🔍 Fetching full account details...\n')

  try {
    const response = await fetch(`${UNIPILE_DSN}/accounts`, {
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    
    console.log('📋 Full API Response:')
    console.log(JSON.stringify(data, null, 2))

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

getAccountDetails()

