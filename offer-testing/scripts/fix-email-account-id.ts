/**
 * Update Supabase accounts table with correct email account ID
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

const CORRECT_EMAIL_ACCOUNT_ID = '0pKp3VL5TGSAMQpg-eNC7A' // mike@atherial.ai

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  console.log('\n🔧 Fixing Email Account ID in Supabase\n')
  console.log(`Correct Email Account ID: ${CORRECT_EMAIL_ACCOUNT_ID}\n`)

  // Find the account record
  const { data: account, error: fetchError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single()

  if (fetchError || !account) {
    console.error('❌ Account not found:', fetchError?.message)
    return
  }

  console.log('Current account:')
  console.log(`  ID: ${account.id}`)
  console.log(`  Unipile Account ID: ${account.unipile_account_id}`)
  console.log(`  Email: ${account.email_address}`)
  console.log('')

  // Update with correct email account ID
  const { error: updateError } = await supabase
    .from('accounts')
    .update({
      unipile_account_id: CORRECT_EMAIL_ACCOUNT_ID,
      email_address: 'mike@atherial.ai',
      name: 'mike@atherial.ai',
      type: 'email',
      provider: 'GOOGLE_OAUTH'
    })
    .eq('id', '00000000-0000-0000-0000-000000000001')

  if (updateError) {
    console.error('❌ Failed to update:', updateError.message)
    return
  }

  console.log('✅ Account updated successfully!')
  console.log(`   New Unipile Account ID: ${CORRECT_EMAIL_ACCOUNT_ID}`)
  console.log('')
  console.log('⚠️  IMPORTANT: Also update Railway environment variable:')
  console.log(`   UNIPILE_EMAIL_ACCOUNT_ID=${CORRECT_EMAIL_ACCOUNT_ID}`)
}

main().catch(console.error)
