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
  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('slug', 'finance')
    .maybeSingle()

  if (!offer) {
    console.error('Finance offer not found')
    process.exit(1)
  }

  const { count: total } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', offer.id)

  const { data: bySource } = await supabase
    .from('companies')
    .select('source_tool, vertical')
    .eq('offer_id', offer.id)

  const bySourceTool: Record<string, number> = {}
  const byVertical: Record<string, number> = {}
  
  bySource?.forEach(c => {
    bySourceTool[c.source_tool || 'unknown'] = (bySourceTool[c.source_tool || 'unknown'] || 0) + 1
    byVertical[c.vertical || 'other'] = (byVertical[c.vertical || 'other'] || 0) + 1
  })

  const { count: inCampaign } = await supabase
    .from('campaign_companies')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', (await supabase.from('campaigns').select('id').eq('offer_id', offer.id).eq('name', 'finance-leadgen-1000').maybeSingle()).data?.id || '')

  console.log(`\n📊 Finance Companies Summary\n`)
  console.log(`Total Companies: ${total || 0}`)
  console.log(`Target: 1000`)
  console.log(`Remaining: ${1000 - (total || 0)}\n`)
  
  console.log(`By Source Tool:`)
  Object.entries(bySourceTool).forEach(([tool, count]) => {
    console.log(`  ${tool}: ${count}`)
  })
  
  console.log(`\nBy Vertical:`)
  Object.entries(byVertical).forEach(([vertical, count]) => {
    console.log(`  ${vertical}: ${count}`)
  })
  
  console.log(`\nCompanies in Campaign: ${inCampaign || 0}`)
}

main().catch(console.error)
