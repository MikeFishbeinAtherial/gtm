/**
 * Upsert Unipile email accounts into Supabase
 *
 * Usage:
 *   npx tsx scripts/upsert-unipile-accounts.ts
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

const UNIPILE_EMAIL_ACCOUNT_IDS = (() => {
  const direct =
    process.env.UNIPILE_EMAIL_ACCOUNT_IDS || process.env.UNIPILE_EMAIL_ACCOUNT_ID || ''
  const fromEnv = Object.entries(process.env)
    .filter(([key, value]) => key.startsWith('UNIPILE_EMAIL_ACCOUNT_ID_') && value)
    .map(([, value]) => String(value))
  return [
    ...direct.split(',').map((id) => id.trim()).filter(Boolean),
    ...fromEnv
  ]
})()

const UNIPILE_ACCOUNT_OWNER = process.env.UNIPILE_ACCOUNT_OWNER || 'mike'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

if (UNIPILE_EMAIL_ACCOUNT_IDS.length === 0) {
  console.error('❌ Missing UNIPILE_EMAIL_ACCOUNT_IDS or UNIPILE_EMAIL_ACCOUNT_ID')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  console.log('\n📧 Upserting Unipile Accounts\n')

  const labeledFromEnv = Object.entries(process.env)
    .filter(([key, value]) => key.startsWith('UNIPILE_EMAIL_ACCOUNT_ID_') && value)
    .map(([key, value]) => ({
      name: key.replace('UNIPILE_EMAIL_ACCOUNT_ID_', '').toLowerCase(),
      unipile_account_id: String(value)
    }))

  const accountsToInsert = UNIPILE_EMAIL_ACCOUNT_IDS.map((unipile_account_id) => {
    const labeled = labeledFromEnv.find((a) => a.unipile_account_id === unipile_account_id)
    return {
      name: labeled?.name || 'unipile-email',
      type: 'email',
      owner: UNIPILE_ACCOUNT_OWNER,
      provider: 'unipile',
      unipile_account_id,
      status: 'active',
      daily_limit_emails: 20
    }
  })

  const { data: existing } = await supabase
    .from('accounts')
    .select('id, name, unipile_account_id, status')
    .in('unipile_account_id', accountsToInsert.map((a) => a.unipile_account_id))

  const existingIds = new Set((existing || []).map((a) => a.unipile_account_id))
  const toInsert = accountsToInsert.filter((a) => !existingIds.has(a.unipile_account_id))

  if (toInsert.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('accounts')
      .insert(toInsert)
      .select('id, name, unipile_account_id, status')

    if (insertError) {
      console.error('❌ Failed to insert accounts:', insertError.message)
      process.exit(1)
    }

    console.log(`✅ Inserted ${inserted?.length || 0} accounts`)
    inserted?.forEach((a) => {
      console.log(`- ${a.name}: ${a.unipile_account_id} (${a.id}) [${a.status || 'unknown'}]`)
    })
  } else {
    console.log('✅ All Unipile accounts already exist')
  }

  if (existing && existing.length > 0) {
    console.log(`\nExisting accounts:`)
    existing.forEach((a) => {
      console.log(`- ${a.name}: ${a.unipile_account_id} (${a.id}) [${a.status || 'unknown'}]`)
    })
  }
}

main().catch(console.error)
