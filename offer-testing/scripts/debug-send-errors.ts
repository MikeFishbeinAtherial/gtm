/**
 * Debug send errors - check account_id and message structure
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  console.log('\n🔍 Debugging Send Errors\n')

  // Get failed messages from send_queue
  const { data: failedMessages } = await supabase
    .from('send_queue')
    .select(`
      id,
      status,
      last_error,
      account_id,
      contact_id,
      subject,
      scheduled_for,
      accounts(id, unipile_account_id, email_address, name, type, provider),
      contacts(email, first_name, last_name)
    `)
    .eq('status', 'failed')
    .order('scheduled_for', { ascending: false })
    .limit(10)

  console.log(`Found ${failedMessages?.length || 0} failed messages:\n`)

  if (failedMessages && failedMessages.length > 0) {
    failedMessages.forEach((msg: any, idx) => {
      console.log(`${idx + 1}. ${msg.contacts?.first_name} ${msg.contacts?.last_name || ''} - ${msg.subject}`)
      console.log(`   Contact: ${msg.contacts?.email}`)
      console.log(`   Account ID (send_queue): ${msg.account_id}`)
      console.log(`   Unipile Account ID: ${msg.accounts?.unipile_account_id || 'MISSING'}`)
      console.log(`   Account Email: ${msg.accounts?.email_address || 'MISSING'}`)
      console.log(`   Account Type: ${msg.accounts?.type || 'MISSING'}`)
      console.log(`   Account Provider: ${msg.accounts?.provider || 'MISSING'}`)
      console.log(`   Error: ${msg.last_error}`)
      console.log('')
    })
  }

  // Check the accounts table
  console.log('\n📋 Checking Accounts Table:\n')
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (accounts && accounts.length > 0) {
    accounts.forEach((acc: any) => {
      console.log(`ID: ${acc.id}`)
      console.log(`  Unipile Account ID: ${acc.unipile_account_id || 'MISSING'}`)
      console.log(`  Email: ${acc.email_address || 'MISSING'}`)
      console.log(`  Type: ${acc.type || 'MISSING'}`)
      console.log(`  Provider: ${acc.provider || 'MISSING'}`)
      console.log('')
    })
  }

  // Check environment variable
  console.log('\n🔧 Environment Variables:\n')
  console.log(`UNIPILE_EMAIL_ACCOUNT_ID: ${process.env.UNIPILE_EMAIL_ACCOUNT_ID || 'NOT SET'}`)
  console.log(`UNIPILE_DSN: ${process.env.UNIPILE_DSN || 'NOT SET'}`)
  console.log(`UNIPILE_API_KEY: ${process.env.UNIPILE_API_KEY ? 'SET' : 'NOT SET'}`)
}

main().catch(console.error)
