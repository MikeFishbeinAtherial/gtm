/**
 * Check what Unipile accounts you have connected
 * 
 * Usage:
 *   npx ts-node scripts/check-unipile-accounts.ts
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

async function main() {
  try {
    const response = await fetch(`${UNIPILE_DSN}/accounts`, {
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const accounts = Array.isArray(data) ? data : data.items || []

    console.log(`\n📊 Connected Unipile Accounts (${accounts.length})\n`)

    if (accounts.length === 0) {
      console.log('⚠️  No accounts found. Go to Unipile dashboard to connect accounts.')
      return
    }

    accounts.forEach((acc: any, idx: number) => {
      const provider = acc.provider || acc.type || acc.platform || 'unknown'
      const name = acc.name || acc.display_name || acc.email || 'N/A'
      
      console.log(`${idx + 1}. ${provider.toUpperCase()}`)
      console.log(`   Name: ${name}`)
      console.log(`   Account ID: ${acc.id}`)
      console.log(`   Status: ${acc.status || 'active'}`)
      
      if (provider.toLowerCase() === 'linkedin') {
        console.log(`   ✅ Use this ID for LinkedIn messages`)
      }
      if (provider.toLowerCase() === 'email' || provider.toLowerCase() === 'gmail' || provider.toLowerCase() === 'outlook') {
        console.log(`   ✅ Use this ID for email sending`)
        console.log(`   💡 Add to .env.local: UNIPILE_EMAIL_ACCOUNT_ID=${acc.id}`)
      }
      console.log('')
    })

    // Check if email account ID matches
    const emailAccountId = process.env.UNIPILE_EMAIL_ACCOUNT_ID
    if (emailAccountId) {
      const emailAccount = accounts.find((acc: any) => acc.id === emailAccountId)
      if (emailAccount) {
        console.log(`✅ UNIPILE_EMAIL_ACCOUNT_ID matches account: ${emailAccount.name || emailAccount.id}`)
      } else {
        console.log(`⚠️  UNIPILE_EMAIL_ACCOUNT_ID (${emailAccountId}) not found in connected accounts`)
      }
    } else {
      console.log(`ℹ️  UNIPILE_EMAIL_ACCOUNT_ID not set in .env.local`)
    }

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  }
}

main()
