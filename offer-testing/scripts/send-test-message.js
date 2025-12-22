// Send a test LinkedIn message via Unipile API
// SAFETY: This will send ONE real message - use with caution!

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

async function sendTestMessage() {
  const env = loadEnv()
  const UNIPILE_API_KEY = env.UNIPILE_API_KEY
  const UNIPILE_DSN = env.UNIPILE_DSN
  const ACCOUNT_ID = 'eSaTTfPuRx6t131-4hjfSg'

  // =================================================================
  // CONFIGURATION - UPDATE THESE VALUES
  // =================================================================
  
  const RECIPIENT_LINKEDIN_ID = 'PASTE_LINKEDIN_ID_HERE' // We need to find this
  
  const MESSAGE = `Happy holidays Eugene! What's in store for you in 2026? 

Let me know if I can be a resource to anyone in your network who's wants to implement custom AI agents or internal tools. Here are demo videos of some of what we've shipped to production: https://www.atherial.ai/work. Happy to share lessons and best practices.`

  // =================================================================
  // SAFETY CHECKS
  // =================================================================
  
  if (RECIPIENT_LINKEDIN_ID === 'PASTE_LINKEDIN_ID_HERE') {
    console.error('❌ ERROR: You need to set RECIPIENT_LINKEDIN_ID')
    console.error('')
    console.error('Options to find the ID:')
    console.error('1. Search your connections: node scripts/search-connections.js')
    console.error('2. Or provide LinkedIn profile URL and we\'ll look it up')
    console.error('3. Or pick from recent connections')
    process.exit(1)
  }

  console.log('⚠️  WARNING: This will send a REAL LinkedIn message!')
  console.log('='.repeat(60))
  console.log('From: Mike Fishbein')
  console.log(`To: LinkedIn ID ${RECIPIENT_LINKEDIN_ID}`)
  console.log('')
  console.log('Message:')
  console.log(MESSAGE)
  console.log('='.repeat(60))
  console.log('')
  console.log('🔒 SAFETY NOTE: This message will be logged in LinkedIn')
  console.log('   Make sure this is someone you actually want to message!')
  console.log('')
  
  // Give user time to read
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  console.log('Sending message in 3 seconds...')
  await new Promise(resolve => setTimeout(resolve, 1000))
  console.log('2...')
  await new Promise(resolve => setTimeout(resolve, 1000))
  console.log('1...')
  await new Promise(resolve => setTimeout(resolve, 1000))
  console.log('')

  try {
    console.log('📤 Sending message via Unipile API...\n')
    
    // Create FormData for the request
    const FormData = require('form-data')
    const form = new FormData()
    
    form.append('account_id', ACCOUNT_ID)
    form.append('text', MESSAGE)
    form.append('attendees_ids', RECIPIENT_LINKEDIN_ID)
    form.append('linkedin[api]', 'classic')
    // Note: Not using inmail since this is to a 1st degree connection
    
    const response = await fetch(`${UNIPILE_DSN}/chats`, {
      method: 'POST',
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'accept': 'application/json',
        ...form.getHeaders()
      },
      body: form
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    
    console.log('✅ MESSAGE SENT SUCCESSFULLY!')
    console.log('')
    console.log('Response from Unipile:')
    console.log(JSON.stringify(result, null, 2))
    console.log('')
    console.log('🎯 Next steps:')
    console.log('1. Check your LinkedIn to verify the message sent')
    console.log('2. If it looks good, we can scale this approach')
    console.log('3. Always use delays between messages (2-5 minutes)')

  } catch (error) {
    console.error('❌ ERROR sending message:', error.message)
    console.error('')
    console.error('Common issues:')
    console.error('- Recipient is not a 1st degree connection')
    console.error('- LinkedIn ID is incorrect')
    console.error('- Rate limit reached')
    console.error('- Account authentication expired')
  }
}

// Check if form-data is installed
try {
  require('form-data')
  sendTestMessage()
} catch (e) {
  console.error('❌ Missing dependency: form-data')
  console.error('Run: npm install form-data')
  console.error('Then try again')
}

