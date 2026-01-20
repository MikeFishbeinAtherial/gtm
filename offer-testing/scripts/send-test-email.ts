/**
 * Send a test email via Unipile
 * 
 * Usage:
 *   npx ts-node scripts/send-test-email.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

const UNIPILE_DSN = process.env.UNIPILE_DSN
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY

if (!UNIPILE_DSN || !UNIPILE_API_KEY) {
  console.error('❌ Missing UNIPILE_DSN or UNIPILE_API_KEY')
  process.exit(1)
}

async function getEmailAccountId(): Promise<string> {
  // First, fetch accounts to verify env var is correct
  let accounts: any[] = []
  try {
    const response = await fetch(`${UNIPILE_DSN}/accounts`, {
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.status}`)
    }

    const data = await response.json()
    accounts = Array.isArray(data) ? data : data.items || []
    
    console.log(`\n📋 Found ${accounts.length} connected accounts:`)
    accounts.forEach((acc: any) => {
      const provider = acc.provider || acc.type || 'unknown'
      console.log(`   - ${provider}: ${acc.id} (${acc.name || acc.email || 'N/A'})`)
    })
  } catch (error: any) {
    console.warn(`⚠️  Could not fetch accounts: ${error.message}`)
    // Fall through to use env var if fetch fails
  }

  // Check if env var is set and verify it's actually an email account
  if (process.env.UNIPILE_EMAIL_ACCOUNT_ID) {
    const envAccountId = process.env.UNIPILE_EMAIL_ACCOUNT_ID
    const envAccount = accounts.find((acc: any) => acc.id === envAccountId)
    
    if (envAccount) {
      const provider = (envAccount.provider || envAccount.type || '').toUpperCase()
      const isEmailAccount = provider === 'GOOGLE_OAUTH' || 
                            provider === 'EMAIL' || 
                            provider === 'GMAIL' || 
                            provider === 'OUTLOOK'
      
      if (isEmailAccount) {
        console.log(`✅ Using email account ID from .env.local: ${envAccountId}`)
        return envAccountId
      } else {
        console.warn(`⚠️  UNIPILE_EMAIL_ACCOUNT_ID (${envAccountId}) is not an email account (it's ${provider})`)
        console.warn(`   Will find correct email account instead...`)
      }
    } else if (accounts.length > 0) {
      console.warn(`⚠️  UNIPILE_EMAIL_ACCOUNT_ID (${envAccountId}) not found in connected accounts`)
      console.warn(`   Will find correct email account instead...`)
    }
  }

  // Find email account from fetched accounts
  if (accounts.length > 0) {
    const emailAccount = accounts.find((acc: any) => {
      const provider = (acc.provider || acc.type || '').toUpperCase()
      return provider === 'GOOGLE_OAUTH' || 
             provider === 'EMAIL' || 
             provider === 'GMAIL' || 
             provider === 'OUTLOOK'
    })

    if (emailAccount) {
      console.log(`\n✅ Found email account: ${emailAccount.id} (${emailAccount.name || emailAccount.email || 'N/A'})`)
      console.log(`💡 Add to .env.local: UNIPILE_EMAIL_ACCOUNT_ID=${emailAccount.id}`)
      return emailAccount.id
    }
  }

  throw new Error('No email account found. Please connect an email account in Unipile dashboard.')
}

async function main() {
  let emailAccountId: string
  
  try {
    emailAccountId = await getEmailAccountId()
  } catch (error: any) {
    console.error(`❌ Could not get email account ID: ${error.message}`)
    console.error('\n💡 Add to .env.local:')
    console.error('   UNIPILE_EMAIL_ACCOUNT_ID=0pKp3VL5TGSAMQpg-eNC7A')
    process.exit(1)
  }

  const toEmail = 'mfishbein1@gmail.com'
  const subject = 'Test Email from Unipile'
  const body = `Hi Mike,

This is a test email sent via Unipile API.

If you're reading this, the email sending is working correctly!

Best,
Test Script`

  console.log('📧 Sending Test Email via Unipile\n')
  console.log(`From: Unipile Email Account (${emailAccountId})`)
  console.log(`To: ${toEmail}`)
  console.log(`Subject: ${subject}`)
  console.log(`\nBody:\n${body}\n`)

  // Based on Unipile API docs, use /emails endpoint
  // The API expects 'to' to be an array of objects with 'identifier' (email) and optional 'display_name'
  try {
    console.log(`\n🔍 Sending email via /emails endpoint`)
    
    // Try JSON first (most APIs use JSON)
    const payload = {
      account_id: emailAccountId,
      to: [{ identifier: toEmail }], // Array of objects with 'identifier' (email)
      subject: subject,
      body: body
    }

    console.log(`   Payload:`, JSON.stringify(payload, null, 2))

    const response = await fetch(`${UNIPILE_DSN}/emails`, {
      method: 'POST',
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      const result = await response.json()
      console.log('\n✅ EMAIL SENT SUCCESSFULLY!\n')
      console.log('Response from Unipile:')
      console.log(JSON.stringify(result, null, 2))
      console.log('\n🎯 Next steps:')
      console.log('1. Check your inbox (mfishbein1@gmail.com)')
      console.log('2. Check spam folder if not in inbox')
      console.log('3. If it looks good, we can start sending to contacts!')
      return
    } else {
      const errorText = await response.text()
      console.error(`\n❌ ${response.status}: ${errorText}`)
      
      // Try alternative endpoint formats as fallback
      console.log('\n🔍 Trying alternative endpoints...')
      const alternativeEndpoints = [
        { path: `/accounts/${emailAccountId}/emails`, method: 'POST' },
        { path: `/api/v1/emails`, method: 'POST' },
        { path: `/api/v1/accounts/${emailAccountId}/emails`, method: 'POST' },
      ]

      for (const { path, method } of alternativeEndpoints) {
        try {
          console.log(`   Trying: ${method} ${path}`)
          const altResponse = await fetch(`${UNIPILE_DSN}${path}`, {
            method,
            headers: {
              'X-API-KEY': UNIPILE_API_KEY,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          })

          if (altResponse.ok) {
            const result = await altResponse.json()
            console.log('\n✅ EMAIL SENT SUCCESSFULLY (via alternative endpoint)!\n')
            console.log('Response:', JSON.stringify(result, null, 2))
            return
          } else {
            const errorText = await altResponse.text()
            console.log(`   ❌ ${altResponse.status}: ${errorText.substring(0, 100)}`)
          }
        } catch (error: any) {
          console.log(`   ❌ Error: ${error.message}`)
        }
      }
    }
  } catch (error: any) {
    console.error(`\n❌ Error sending email: ${error.message}`)
  }

  console.error('\n❌ All endpoints failed.')
  console.error('\n💡 Possible solutions:')
  console.error('1. Check Unipile dashboard for correct API endpoint')
  console.error('2. Verify email account is properly connected')
  console.error('3. Check Unipile API documentation for latest endpoint')
  console.error('4. Contact Unipile support')
  console.error('\n📝 Your email account ID: ' + emailAccountId)
}

main().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
