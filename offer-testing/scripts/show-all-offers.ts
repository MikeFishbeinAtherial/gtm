/**
 * Show all offers and their company counts
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
  console.log('\n📊 All Offers & Company Counts\n')

  const { data: offers } = await supabase
    .from('offers')
    .select('id, name, slug')

  if (!offers || offers.length === 0) {
    console.log('No offers found')
    return
  }

  for (const offer of offers) {
    const { count } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('offer_id', offer.id)

    console.log(`${offer.name} (slug: ${offer.slug})`)
    console.log(`   Offer ID: ${offer.id}`)
    console.log(`   Companies: ${count || 0}`)
    console.log('')
  }

  console.log('\n💡 To see finance companies only:')
  console.log('   SELECT * FROM companies WHERE offer_id = (SELECT id FROM offers WHERE slug = \'finance\');')
}

main().catch(console.error)
