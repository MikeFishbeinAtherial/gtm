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

const UNIPILE_EMAIL_ACCOUNT_IDS = (process.env.UNIPILE_EMAIL_ACCOUNT_IDS ||
  process.env.UNIPILE_EMAIL_ACCOUNT_ID ||
  '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

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

  const accountsToInsert = UNIPILE_EMAIL_ACCOUNT_IDS.map((external_id) => ({
    provider: 'unipile',
    external_id,
    status: 'active'
  }))

  const { data, error } = await supabase
    .from('accounts')
    .upsert(accountsToInsert, { onConflict: 'external_id' })
    .select('id, external_id, status')

  if (error) {
    console.error('❌ Failed to upsert accounts:', error.message)
    process.exit(1)
  }

  console.log(`✅ Upserted ${data?.length || 0} accounts`)
  data?.forEach((a) => {
    console.log(`- ${a.external_id} (${a.id}) [${a.status || 'unknown'}]`)
  })
}

main().catch(console.error)
