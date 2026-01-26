/**
 * Check Unipile account status
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY
const UNIPILE_DSN = process.env.UNIPILE_DSN
const UNIPILE_EMAIL_ACCOUNT_ID = process.env.UNIPILE_EMAIL_ACCOUNT_ID

async function checkAccount() {
  console.log('\n🔍 Checking Unipile Account\n')
  console.log(`DSN: ${UNIPILE_DSN}`)
  console.log(`Email Account ID: ${UNIPILE_EMAIL_ACCOUNT_ID}\n`)

  if (!UNIPILE_API_KEY || !UNIPILE_DSN) {
    console.error('❌ Missing UNIPILE_API_KEY or UNIPILE_DSN')
    return
  }

  try {
    // Fetch all accounts
    const response = await fetch(`${UNIPILE_DSN}/accounts`, {
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Failed to fetch accounts: ${response.status}`)
      console.error(errorText)
      return
    }

    const data = await response.json()
    const accounts = Array.isArray(data) ? data : data.items || []

    console.log(`📋 Found ${accounts.length} connected accounts:\n`)

    accounts.forEach((acc: any) => {
      const provider = acc.provider || acc.type || 'unknown'
      const isEmail = provider === 'GOOGLE_OAUTH' || provider === 'EMAIL' || provider === 'GMAIL' || provider === 'OUTLOOK'
      const isMatch = acc.id === UNIPILE_EMAIL_ACCOUNT_ID
      
      console.log(`${isMatch ? '✅' : '  '} ${provider}: ${acc.id}`)
      console.log(`   Name: ${acc.name || acc.email || 'N/A'}`)
      console.log(`   Status: ${acc.status || 'unknown'}`)
      if (isEmail) {
        console.log(`   📧 Email account`)
      }
      if (isMatch) {
        console.log(`   ⭐ This is the configured email account`)
        if (acc.status !== 'connected' && acc.status !== 'active') {
          console.log(`   ⚠️  WARNING: Account status is "${acc.status}" - may need reconnection`)
        }
      }
      console.log('')
    })

    const emailAccount = accounts.find((acc: any) => acc.id === UNIPILE_EMAIL_ACCOUNT_ID)
    if (!emailAccount) {
      console.log(`\n⚠️  Configured account ID (${UNIPILE_EMAIL_ACCOUNT_ID}) not found in connected accounts`)
      console.log(`   Please check UNIPILE_EMAIL_ACCOUNT_ID in .env.local`)
    } else {
      const provider = emailAccount.provider || emailAccount.type || 'unknown'
      const isEmail = provider === 'GOOGLE_OAUTH' || provider === 'EMAIL' || provider === 'GMAIL' || provider === 'OUTLOOK'
      if (!isEmail) {
        console.log(`\n⚠️  Configured account is not an email account (it's ${provider})`)
      }
    }

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
  }
}

checkAccount().catch(console.error)
