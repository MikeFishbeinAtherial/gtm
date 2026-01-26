/**
 * Test Unipile email sending to diagnose 500 errors
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY
const UNIPILE_EMAIL_ACCOUNT_ID = process.env.UNIPILE_EMAIL_ACCOUNT_ID || 'eSaTTfPuRx6t131-4hjfSg'

async function testUnipileEmail() {
  console.log('\n🧪 Testing Unipile Email API\n')
  console.log(`Account ID: ${UNIPILE_EMAIL_ACCOUNT_ID}`)
  console.log(`API Key: ${UNIPILE_API_KEY ? 'Set' : 'Missing'}\n`)

  if (!UNIPILE_API_KEY) {
    console.error('❌ UNIPILE_API_KEY not set')
    return
  }

  // Test the /emails endpoint
  const testPayload = {
    account_id: UNIPILE_EMAIL_ACCOUNT_ID,
    to: [{ identifier: 'mfishbein1@gmail.com' }],
    subject: 'Test Email',
    body: 'This is a test email from Unipile API'
  }

  console.log('📤 Sending test email...')
  console.log('Payload:', JSON.stringify(testPayload, null, 2))
  console.log('')

  try {
    const response = await fetch('https://api.unipile.com/v1/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UNIPILE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })

    const responseText = await response.text()
    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log(`Response: ${responseText}`)

    if (response.ok) {
      const data = JSON.parse(responseText)
      console.log('\n✅ Email sent successfully!')
      console.log('Response:', JSON.stringify(data, null, 2))
    } else {
      console.log('\n❌ Email send failed')
      try {
        const error = JSON.parse(responseText)
        console.log('Error details:', JSON.stringify(error, null, 2))
      } catch {
        console.log('Raw error:', responseText)
      }
    }
  } catch (error: any) {
    console.error('❌ Request failed:', error.message)
  }
}

testUnipileEmail().catch(console.error)
