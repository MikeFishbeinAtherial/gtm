// Look up Eugene by LinkedIn URL and send message
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

async function sendToEugene() {
  const env = loadEnv()
  const UNIPILE_API_KEY = env.UNIPILE_API_KEY
  const UNIPILE_DSN = env.UNIPILE_DSN
  const ACCOUNT_ID = 'eSaTTfPuRx6t131-4hjfSg'

  const LINKEDIN_URL = 'https://www.linkedin.com/in/eugene-leychenko'
  const PUBLIC_IDENTIFIER = 'eugene-leychenko' // Extracted from URL
  
  const MESSAGE = `Happy holidays Eugene! What's in store for you in 2026? 

Let me know if I can be a resource to anyone in your network who wants to implement custom AI agents or internal tools. Here are demo videos of some of what we've shipped to production: https://www.atherial.ai/work. Happy to share lessons and best practices.`

  console.log('🔍 Step 1: Finding Eugene Leychenko in your connections...\n')

  try {
    // Search through connections for Eugene
    let found = false
    let eugeneData = null
    let cursor = null
    let page = 0
    
    do {
      page++
      if (page % 10 === 0) {
        console.log(`   Searched ${page * 100} connections...`)
      }
      
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
      
      // Look for Eugene by public_identifier
      eugeneData = relations.find(r => r.public_identifier === PUBLIC_IDENTIFIER)
      
      if (eugeneData) {
        found = true
        break
      }
      
      cursor = data.cursor
      
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
    } while (cursor && !found)

    if (!found) {
      console.log('❌ Eugene Leychenko not found in your connections')
      console.log('\nPossible reasons:')
      console.log('1. Not connected yet on LinkedIn')
      console.log('2. Different LinkedIn URL')
      console.log('3. Name changed on LinkedIn')
      console.log('\n💡 Please verify:')
      console.log(`   - Go to ${LINKEDIN_URL}`)
      console.log('   - Check if you\'re connected (should say "Message" not "Connect")')
      return
    }

    console.log('✅ Found Eugene!\n')
    console.log('Details:')
    console.log(`   Name: ${eugeneData.first_name} ${eugeneData.last_name}`)
    console.log(`   Headline: ${eugeneData.headline}`)
    console.log(`   Member ID: ${eugeneData.member_id}`)
    console.log(`   Profile: ${eugeneData.public_profile_url}`)
    console.log('')

    console.log('=' .repeat(70))
    console.log('⚠️  ABOUT TO SEND MESSAGE')
    console.log('=' .repeat(70))
    console.log(`From: Mike Fishbein`)
    console.log(`To: ${eugeneData.first_name} ${eugeneData.last_name}`)
    console.log('')
    console.log('Message:')
    console.log(MESSAGE)
    console.log('=' .repeat(70))
    console.log('')
    console.log('Sending in 5 seconds... (Ctrl+C to cancel)')
    
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Send the message
    console.log('\n📤 Sending message via Unipile API...\n')
    
    // Use multipart/form-data format
    const FormData = require('form-data')
    const form = new FormData()
    
    form.append('account_id', ACCOUNT_ID)
    form.append('text', MESSAGE)
    form.append('attendees_ids', eugeneData.member_id)
    form.append('linkedin[api]', 'classic')
    
    const sendResponse = await fetch(`${UNIPILE_DSN}/chats`, {
      method: 'POST',
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        ...form.getHeaders()
      },
      body: form.getBuffer()
    })

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text()
      throw new Error(`HTTP ${sendResponse.status}: ${errorText}`)
    }

    const result = await sendResponse.json()
    
    console.log('✅ MESSAGE SENT SUCCESSFULLY!')
    console.log('')
    console.log('Response:')
    console.log(JSON.stringify(result, null, 2))
    console.log('')
    console.log('🎯 Next steps:')
    console.log('1. Check your LinkedIn messages to verify it sent')
    console.log('2. Wait for Eugene to respond')
    console.log('3. If successful, we can set up the 500-person campaign')

  } catch (error) {
    console.error('❌ ERROR:', error.message)
  }
}

// Check dependencies
try {
  require('form-data')
  sendToEugene()
} catch (e) {
  console.error('❌ Missing dependency: form-data')
  console.error('Installing it now...')
  require('child_process').execSync('npm install form-data', { stdio: 'inherit' })
  console.log('\nNow run the script again: node scripts/send-to-eugene.js')
}

