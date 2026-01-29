/**
 * Apply missing campaign columns via SQL.
 *
 * This uses a Postgres connection string from SUPABASE_DB_URL (or DATABASE_URL).
 * If not provided, it prints the SQL to run manually in Supabase SQL editor.
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sqlPath = resolve('scripts/apply-campaign-columns.sql')
const sql = readFileSync(sqlPath, 'utf8')

const DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL

async function main() {
  if (!DB_URL) {
    console.log('\n⚠️  SUPABASE_DB_URL not set. Please run this SQL in Supabase SQL editor:\n')
    console.log(sql)
    return
  }

  const { Client } = await import('pg')
  const client = new Client({ connectionString: DB_URL })
  await client.connect()
  await client.query(sql)
  await client.end()
  console.log('✅ Campaign columns applied successfully')
}

main().catch((err) => {
  console.error('❌ Failed to apply campaign columns:', err.message)
})
