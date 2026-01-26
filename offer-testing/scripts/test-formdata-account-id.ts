/**
 * Test FormData with account_id to see if it's being sent correctly
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY
const UNIPILE_DSN = process.env.UNIPILE_DSN
const ACCOUNT_ID = '0pKp3VL5TGSAMQpg-eNC7A'

async function testFormData() {
  console.log('\n🧪 Testing FormData with account_id\n')
  console.log(`Account ID: ${ACCOUNT_ID}`)
  console.log(`Type: ${typeof ACCOUNT_ID}`)
  console.log(`Length: ${ACCOUNT_ID.length}\n`)

  const form = new FormData()
  form.append('account_id', ACCOUNT_ID)
  form.append('subject', 'Test Account ID')
  form.append('body', 'Testing if account_id is sent correctly')
  form.append('to', JSON.stringify([{ 
    identifier: 'mfishbein1@gmail.com',
    display_name: 'Mike'
  }]))

  // Log what we're appending
  console.log('FormData entries:')
  // Note: FormData doesn't have a way to iterate in Node.js, but we can check the values
  console.log(`  account_id: ${ACCOUNT_ID}`)
  console.log(`  subject: Test Account ID`)
  console.log(`  body: Testing if account_id is sent correctly`)
  console.log(`  to: ${JSON.stringify([{ identifier: 'mfishbein1@gmail.com', display_name: 'Mike' }])}`)
  console.log('')

  try {
    const response = await fetch(`${UNIPILE_DSN}/emails`, {
      method: 'POST',
      headers: {
        'X-API-KEY': UNIPILE_API_KEY
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
        
        if (error.detail?.includes('account_id')) {
          console.log('\n⚠️  ERROR: account_id field is missing or invalid!')
          console.log('This suggests FormData is not serializing account_id correctly')
        }
      } catch {
        console.log('Raw error:', responseText)
      }
    }
  } catch (error: any) {
    console.error('❌ Request failed:', error.message)
    console.error(error.stack)
  }
}

testFormData().catch(console.error)
