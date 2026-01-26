/**
 * Test Unipile email sending with multipart/form-data
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

// Use native FormData (Node.js 18+)

const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY
const UNIPILE_DSN = process.env.UNIPILE_DSN
const UNIPILE_EMAIL_ACCOUNT_ID = process.env.UNIPILE_EMAIL_ACCOUNT_ID || 'eSaTTfPuRx6t131-4hjfSg'

async function testUnipileEmail() {
  console.log('\n🧪 Testing Unipile Email API with multipart/form-data\n')
  console.log(`DSN: ${UNIPILE_DSN}`)
  console.log(`Account ID: ${UNIPILE_EMAIL_ACCOUNT_ID}\n`)

  if (!UNIPILE_API_KEY || !UNIPILE_DSN) {
    console.error('❌ Missing UNIPILE_API_KEY or UNIPILE_DSN')
    return
  }

  const form = new FormData()
  form.append('account_id', UNIPILE_EMAIL_ACCOUNT_ID)
  form.append('subject', 'Test Email - Fixed Format')
  form.append('body', 'This is a test email using multipart/form-data')
  form.append('to', JSON.stringify([{ 
    identifier: 'mfishbein1@gmail.com',
    display_name: 'Mike'
  }]))

  console.log('📤 Sending test email...')
  console.log('Using native FormData (multipart/form-data)\n')

  try {
    const response = await fetch(`${UNIPILE_DSN}/emails`, {
      method: 'POST',
      headers: {
        'X-API-KEY': UNIPILE_API_KEY
        // Don't set Content-Type - fetch will add it automatically
      },
      body: form
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
    console.error(error.stack)
  }
}

testUnipileEmail().catch(console.error)
