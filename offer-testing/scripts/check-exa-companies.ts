/**
 * Check Exa-discovered companies and contacts
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
  console.log('\n📊 Exa-Discovered Companies & Contacts\n')

  // Get finance offer
  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('slug', 'finance')
    .single()

  if (!offer) {
    console.error('❌ Finance offer not found')
    process.exit(1)
  }

  // Get all companies from Exa
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, domain, url, vertical, source_tool, fit_score')
    .eq('offer_id', offer.id)
    .eq('source_tool', 'exa')
    .order('name')

  console.log(`\n🏢 Companies from Exa: ${companies?.length || 0}\n`)

  // Show examples
  console.log('📋 Example Companies:\n')
  companies?.slice(0, 15).forEach((c, idx) => {
    console.log(`${idx + 1}. ${c.name}`)
    console.log(`   Domain: ${c.domain}`)
    console.log(`   Vertical: ${c.vertical || 'unknown'}`)
    console.log('')
  })

  // Check for bad companies
  const badKeywords = ['East Coast Companies', 'Top 10K', 'List of', 'Management']
  const badCompanies = companies?.filter(c => 
    badKeywords.some(kw => c.name.includes(kw))
  ) || []

  if (badCompanies.length > 0) {
    console.log(`\n⚠️  Questionable Companies (${badCompanies.length}):\n`)
    badCompanies.forEach(c => {
      console.log(`   - ${c.name}`)
    })
  }

  // Get contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select(`
      id,
      first_name,
      last_name,
      title,
      linkedin_url,
      source_tool,
      source_raw,
      companies!inner(
        name,
        source_tool
      )
    `)
    .eq('companies.source_tool', 'exa')
    .eq('offer_id', offer.id)

  console.log(`\n\n👥 Contacts from Exa: ${contacts?.length || 0}\n`)

  // Check LinkedIn URLs
  const withLinkedIn = contacts?.filter(c => c.linkedin_url) || []
  const withoutLinkedIn = contacts?.filter(c => !c.linkedin_url) || []

  console.log(`   With LinkedIn: ${withLinkedIn.length}`)
  console.log(`   Without LinkedIn: ${withoutLinkedIn.length}`)

  // Show examples of contacts
  console.log(`\n📋 Example Contacts:\n`)
  contacts?.slice(0, 10).forEach((c: any, idx) => {
    console.log(`${idx + 1}. ${c.first_name} ${c.last_name || ''}`)
    console.log(`   Title: ${c.title || 'N/A'}`)
    console.log(`   Company: ${c.companies.name}`)
    console.log(`   LinkedIn: ${c.linkedin_url || '❌ Missing'}`)
    console.log('')
  })

  // Check for noisy contacts (job postings, etc.)
  const noisyKeywords = ['Job Description', 'hiring', 'Post', 'excited to announce', 'welcome']
  const noisyContacts = contacts?.filter((c: any) => {
    const nameLower = (c.first_name + ' ' + (c.last_name || '')).toLowerCase()
    const titleLower = (c.title || '').toLowerCase()
    return noisyKeywords.some(kw => nameLower.includes(kw.toLowerCase()) || titleLower.includes(kw.toLowerCase()))
  }) || []

  if (noisyContacts.length > 0) {
    console.log(`\n⚠️  Noisy Contacts (${noisyContacts.length} - likely job postings):\n`)
    noisyContacts.slice(0, 10).forEach((c: any) => {
      console.log(`   - ${c.first_name} ${c.last_name || ''} at ${c.companies.name}`)
      console.log(`     Title: ${c.title || 'N/A'}`)
    })
  }

  // Summary
  console.log(`\n\n📊 Summary:`)
  console.log(`   Total companies: ${companies?.length || 0}`)
  console.log(`   Bad companies: ${badCompanies.length}`)
  console.log(`   Total contacts: ${contacts?.length || 0}`)
  console.log(`   Contacts with LinkedIn: ${withLinkedIn.length}`)
  console.log(`   Noisy contacts: ${noisyContacts.length}`)
}

main().catch(console.error)
