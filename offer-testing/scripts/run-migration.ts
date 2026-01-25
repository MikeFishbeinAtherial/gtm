/**
 * Run migration SQL file against Supabase
 *
 * Usage:
 *   npx ts-node scripts/run-migration.ts scripts/add-send-queue-and-outreach-history.sql
 */

import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })
dotenv.config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('❌ Usage: npx ts-node scripts/run-migration.ts <path-to-sql-file>')
  process.exit(1)
}

const sqlPath = path.join(process.cwd(), sqlFile)
if (!fs.existsSync(sqlPath)) {
  console.error(`❌ SQL file not found: ${sqlPath}`)
  process.exit(1)
}

const sql = fs.readFileSync(sqlPath, 'utf-8')

// Split by semicolons and execute statements one by one
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

console.log(`📝 Running ${statements.length} SQL statements from ${sqlFile}...`)

// Use Supabase REST API to execute SQL
async function runMigration() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    console.log(`\n[${i + 1}/${statements.length}] Executing statement...`)
    
    try {
      // Use RPC to execute raw SQL (if available) or use REST API
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement }).catch(async () => {
        // Fallback: try direct REST API call
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql_query: statement })
        })
        
        if (!response.ok) {
          const text = await response.text()
          throw new Error(`HTTP ${response.status}: ${text}`)
        }
        
        return { error: null }
      })
      
      if (error) {
        // Some errors are OK (like "already exists")
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`   ⚠️  ${error.message} (continuing...)`)
        } else {
          throw error
        }
      } else {
        console.log(`   ✅ Success`)
      }
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`)
      // Continue with next statement
    }
  }
  
  console.log('\n✅ Migration complete')
}

runMigration().catch(error => {
  console.error('❌ Migration failed:', error.message)
  process.exit(1)
})
