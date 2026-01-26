/**
 * Debug FormData serialization to see if account_id is being sent correctly
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY
const UNIPILE_DSN = process.env.UNIPILE_DSN
const ACCOUNT_ID = process.env.UNIPILE_EMAIL_ACCOUNT_ID || '0pKp3VL5TGSAMQpg-eNC7A'

async function testFormDataDebug() {
  console.log('\n🧪 Testing FormData Serialization\n')
  console.log(`Account ID: ${ACCOUNT_ID}`)
  console.log(`Type: ${typeof ACCOUNT_ID}`)
  console.log(`Length: ${ACCOUNT_ID.length}\n`)

  const form = new FormData()
  form.append('account_id', ACCOUNT_ID)
  form.append('subject', 'Test Debug')
  form.append('body', 'Testing FormData serialization')
  form.append('to', JSON.stringify([{ 
    identifier: 'mfishbein1@gmail.com',
    display_name: 'Mike'
  }]))

  // Try to inspect FormData (Node.js doesn't support iteration, but we can check)
  console.log('FormData created with:')
  console.log(`  account_id: ${ACCOUNT_ID}`)
  console.log(`  subject: Test Debug`)
  console.log(`  body: Testing FormData serialization`)
  console.log(`  to: [{"identifier":"mfishbein1@gmail.com","display_name":"Mike"}]\n`)

  // Test with explicit string conversion
  console.log('Testing with explicit String() conversion...\n')
  
  const form2 = new FormData()
  form2.append('account_id', String(ACCOUNT_ID).trim())
  form2.append('subject', String('Test Debug'))
  form2.append('body', String('Testing FormData serialization'))
  form2.append('to', JSON.stringify([{ 
    identifier: String('mfishbein1@gmail.com'),
    display_name: String('Mike')
  }]))

  try {
    console.log('📤 Sending test email...\n')
    
    const response = await fetch(`${UNIPILE_DSN}/emails`, {
      method: 'POST',
      headers: {
        'X-API-KEY': UNIPILE_API_KEY
      },
      body: form2
    })

    const responseText = await response.text()
    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log(`Response: ${responseText}\n`)

    if (response.ok) {
      const data = JSON.parse(responseText)
      console.log('✅ Email sent successfully!')
      console.log('Response:', JSON.stringify(data, null, 2))
    } else {
      console.log('❌ Email send failed')
      try {
        const error = JSON.parse(responseText)
        console.log('Error details:', JSON.stringify(error, null, 2))
        
        if (error.detail?.includes('account_id')) {
          console.log('\n⚠️  ERROR: account_id field is missing!')
          console.log('This suggests FormData is not serializing account_id correctly')
          console.log('\nPossible causes:')
          console.log('1. FormData in Node.js might not be sending the field')
          console.log('2. The account_id value might be undefined/null')
          console.log('3. Unipile API might not be reading multipart/form-data correctly')
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

testFormDataDebug().catch(console.error)
