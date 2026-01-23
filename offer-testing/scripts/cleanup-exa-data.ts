/**
 * Clean up noisy Exa companies and contacts
 * - Delete bad companies (non-hedge funds, lists, etc.)
 * - Delete noisy contacts (LinkedIn posts, job descriptions)
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
  console.log('\n🧹 Cleaning Up Exa Data\n')

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

  // Get all Exa companies
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, domain, vertical')
    .eq('offer_id', offer.id)
    .eq('source_tool', 'exa')

  if (!companies || companies.length === 0) {
    console.log('✅ No Exa companies found')
    return
  }

  // Identify bad companies
  const badKeywords = [
    'East Coast Companies',
    'Top 10K',
    'List of',
    'Audiology',
    'Physical Therapy',
    'Contracting',
    'Benefit Solutions',
    'Network Services',
    'Developers',
    'Cornell Hedge Fund Club', // Student club, not a fund
    'Crunchbase',
    'Management', // Too generic - "Hedge Fund Management", "Investment Management"
  ]

  const badCompanies = companies.filter(c => {
    const nameLower = c.name.toLowerCase()
    return badKeywords.some(kw => nameLower.includes(kw.toLowerCase())) ||
           c.vertical !== 'hedge_fund' // Only keep hedge_fund vertical
  })

  console.log(`\n🏢 Companies Analysis:`)
  console.log(`   Total: ${companies.length}`)
  console.log(`   Bad (to delete): ${badCompanies.length}`)
  console.log(`   Good (to keep): ${companies.length - badCompanies.length}`)

  if (badCompanies.length > 0) {
    console.log(`\n⚠️  Bad Companies to Delete:\n`)
    badCompanies.forEach(c => {
      console.log(`   - ${c.name} (${c.vertical || 'unknown'})`)
    })
  }

  // Get contacts for bad companies
  const badCompanyIds = badCompanies.map(c => c.id)
  const { data: contactsToDelete } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, company_id')
    .in('company_id', badCompanyIds)

  // Also find noisy contacts (LinkedIn posts, job descriptions)
  const { data: allContacts } = await supabase
    .from('contacts')
    .select(`
      id,
      first_name,
      last_name,
      title,
      linkedin_url,
      companies!inner(
        source_tool
      )
    `)
    .eq('companies.source_tool', 'exa')
    .eq('offer_id', offer.id)

  const noisyKeywords = [
    'Job Description',
    'hiring',
    "'s Post",
    'Post -',
    'excited to',
    'welcome',
    'announce',
    'appointed',
    'effective',
    'Life & Work',
    'The Billion-Dollar',
  ]

  const noisyContacts = (allContacts || []).filter((c: any) => {
    const nameLower = ((c.first_name || '') + ' ' + (c.last_name || '')).toLowerCase()
    const titleLower = (c.title || '').toLowerCase()
    return noisyKeywords.some(kw => nameLower.includes(kw.toLowerCase()) || titleLower.includes(kw.toLowerCase()))
  })

  console.log(`\n👥 Contacts Analysis:`)
  console.log(`   Total: ${allContacts?.length || 0}`)
  console.log(`   From bad companies: ${contactsToDelete?.length || 0}`)
  console.log(`   Noisy contacts: ${noisyContacts.length}`)
  console.log(`   Total to delete: ${(contactsToDelete?.length || 0) + noisyContacts.length}`)

  if (noisyContacts.length > 0) {
    console.log(`\n⚠️  Noisy Contacts to Delete:\n`)
    noisyContacts.slice(0, 10).forEach((c: any) => {
      console.log(`   - ${c.first_name} ${c.last_name || ''} (${c.companies?.name || 'unknown'})`)
    })
    if (noisyContacts.length > 10) {
      console.log(`   ... and ${noisyContacts.length - 10} more`)
    }
  }

  // Delete contacts first (due to foreign key constraints)
  const allContactIdsToDelete = [
    ...(contactsToDelete?.map(c => c.id) || []),
    ...noisyContacts.map((c: any) => c.id)
  ]

  if (allContactIdsToDelete.length > 0) {
    console.log(`\n🗑️  Deleting ${allContactIdsToDelete.length} contacts...`)
    const { error: contactError } = await supabase
      .from('contacts')
      .delete()
      .in('id', allContactIdsToDelete)

    if (contactError) {
      console.error('❌ Error deleting contacts:', contactError.message)
    } else {
      console.log(`✅ Deleted ${allContactIdsToDelete.length} contacts`)
    }
  }

  // Delete bad companies
  if (badCompanyIds.length > 0) {
    console.log(`\n🗑️  Deleting ${badCompanyIds.length} companies...`)
    const { error: companyError } = await supabase
      .from('companies')
      .delete()
      .in('id', badCompanyIds)

    if (companyError) {
      console.error('❌ Error deleting companies:', companyError.message)
    } else {
      console.log(`✅ Deleted ${badCompanyIds.length} companies`)
    }
  }

  // Final count
  const { count: finalCompanyCount } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('offer_id', offer.id)
    .eq('source_tool', 'exa')
    .eq('vertical', 'hedge_fund')

  const { count: finalContactCount } = await supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('offer_id', offer.id)
    .in('company_id', 
      (await supabase
        .from('companies')
        .select('id')
        .eq('offer_id', offer.id)
        .eq('source_tool', 'exa')
        .eq('vertical', 'hedge_fund')
      ).data?.map(c => c.id) || []
    )

  console.log(`\n\n✅ Cleanup Complete!`)
  console.log(`   Remaining hedge funds: ${finalCompanyCount || 0}`)
  console.log(`   Remaining contacts: ${finalContactCount || 0}`)
}

main().catch(console.error)
