/**
 * Review company quality and identify non-ICP companies
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

// Good verticals for this campaign
const GOOD_VERTICALS = ['hedge_fund', 'private_equity', 'investment_firm', 'asset_manager']

// Questionable verticals
const QUESTIONABLE_VERTICALS = ['unknown', 'credit_union', 'bank', 'insurance', 'mortgage', 'broker_dealer', 'other']

async function main() {
  console.log('\n🔍 Company Quality Review\n')

  // Get all companies with contacts that have messages
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      id,
      contact:contacts!inner(
        id,
        first_name,
        email,
        companies!inner(
          id,
          name,
          vertical,
          lead_source,
          fit_score
        )
      )
    `)
    .eq('status', 'pending')

  const companiesByVertical = (messages || []).reduce((acc, m: any) => {
    const vertical = m.contact?.companies?.vertical || 'unknown'
    if (!acc[vertical]) acc[vertical] = []
    acc[vertical].push({
      company: m.contact.companies.name,
      contact: m.contact.first_name,
      email: m.contact.email,
      lead_source: m.contact.companies.lead_source,
      fit_score: m.contact.companies.fit_score
    })
    return acc
  }, {} as Record<string, any[]>)

  // Show good companies
  console.log('✅ GOOD ICP Companies:')
  GOOD_VERTICALS.forEach(vertical => {
    const companies = companiesByVertical[vertical] || []
    if (companies.length > 0) {
      console.log(`\n  ${vertical}: ${companies.length} contacts`)
      companies.slice(0, 3).forEach(c => {
        console.log(`    - ${c.contact} at ${c.company} (source: ${c.lead_source || 'unknown'})`)
      })
      if (companies.length > 3) {
        console.log(`    ... and ${companies.length - 3} more`)
      }
    }
  })

  const goodCount = GOOD_VERTICALS.reduce((sum, v) => sum + (companiesByVertical[v]?.length || 0), 0)

  console.log('\n\n⚠️  QUESTIONABLE Companies (May Not Be ICP):')
  QUESTIONABLE_VERTICALS.forEach(vertical => {
    const companies = companiesByVertical[vertical] || []
    if (companies.length > 0) {
      console.log(`\n  ${vertical}: ${companies.length} contacts`)
      companies.slice(0, 5).forEach(c => {
        console.log(`    - ${c.contact} at ${c.company}`)
      })
      if (companies.length > 5) {
        console.log(`    ... and ${companies.length - 5} more`)
      }
    }
  })

  const questionableCount = QUESTIONABLE_VERTICALS.reduce((sum, v) => sum + (companiesByVertical[v]?.length || 0), 0)

  console.log('\n\n📊 Summary:')
  console.log(`   ✅ Good ICP companies: ${goodCount} contacts`)
  console.log(`   ⚠️  Questionable companies: ${questionableCount} contacts`)
  console.log(`   📈 Percentage good: ${Math.round((goodCount / (goodCount + questionableCount)) * 100)}%`)
  console.log('')

  if (questionableCount > 0) {
    console.log('💡 Recommendations:')
    console.log('   1. Review "unknown" companies - verify they are investment firms')
    console.log('   2. Consider removing: credit unions, banks, insurance, mortgage')
    console.log('   3. Check lead_source to understand where questionable companies came from')
    console.log('')
    console.log('🔧 To fix:')
    console.log('   - Cancel messages for non-ICP companies')
    console.log('   - Delete or mark those companies as excluded')
    console.log('   - Re-run contact discovery with stricter filters')
  }

  // Show lead sources
  console.log('\n📍 Lead Sources:')
  const allCompanies = Object.values(companiesByVertical).flat()
  const bySources = allCompanies.reduce((acc, c) => {
    const source = c.lead_source || 'unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  Object.entries(bySources)
    .sort(([, a], [, b]) => b - a)
    .forEach(([source, count]) => {
      console.log(`   ${source}: ${count} contacts`)
    })
}

main().catch(console.error)
