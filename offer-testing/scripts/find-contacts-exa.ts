/**
 * Find contacts at companies discovered via Exa company search
 * Uses Exa people search to find decision-makers
 * 
 * Usage:
 *   npx ts-node scripts/find-contacts-exa.ts [--limit 25] [--max-per-company 2]
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'
import {
  exaSearchPeople,
  type ExaPerson,
} from '../src/lib/clients/exa.ts'

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

// Finance titles to search for
const FINANCE_TITLES = [
  'Chief Investment Officer',
  'CIO',
  'Head of Research',
  'Portfolio Manager',
  'Managing Partner',
  'Partner',
  'Managing Director',
  'Principal',
]

function getArg(name: string, defaultValue?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return defaultValue
  return process.argv[idx + 1] ?? defaultValue
}

const LIMIT = Number(getArg('limit', '25'))
const MAX_PER_COMPANY = Number(getArg('max-per-company', '2'))

async function main() {
  console.log('\n👥 Finding Contacts at Exa-Discovered Companies\n')
  console.log(`Processing: ${LIMIT} companies`)
  console.log(`Max contacts per company: ${MAX_PER_COMPANY}\n`)

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

  // Get companies from Exa that don't have contacts yet
  const { data: companies } = await supabase
    .from('companies')
    .select(`
      id,
      name,
      domain,
      url,
      vertical
    `)
    .eq('offer_id', offer.id)
    .eq('source_tool', 'exa')
    .limit(LIMIT)

  if (!companies || companies.length === 0) {
    console.log('✅ No companies found from Exa source')
    return
  }

  console.log(`📊 Found ${companies.length} companies to process\n`)

  let totalContactsFound = 0
  let companiesProcessed = 0

  for (const company of companies) {
    companiesProcessed++
    console.log(`\n[${companiesProcessed}/${companies.length}] ${company.name}`)

    // Check if company already has contacts
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('company_id', company.id)
      .limit(1)

    if (existingContacts && existingContacts.length > 0) {
      console.log(`   ⏭️  Already has contacts, skipping`)
      continue
    }

    // Search for contacts using Exa
    const contactsFound: ExaPerson[] = []

    for (const title of FINANCE_TITLES.slice(0, 3)) { // Try top 3 titles first
      if (contactsFound.length >= MAX_PER_COMPANY) break

      try {
        const query = `${title} at ${company.name}`
        console.log(`   🔍 Searching: ${query}`)

        const results = await exaSearchPeople({
          query,
          num_results: 5,
          include_domains: ['linkedin.com']
        })

        // Filter to this company
        const companyContacts = results.results.filter((person: ExaPerson) => {
          const personCompany = person.company?.toLowerCase() || ''
          const companyName = company.name.toLowerCase()
          return personCompany.includes(companyName) || companyName.includes(personCompany)
        })

        contactsFound.push(...companyContacts.slice(0, MAX_PER_COMPANY - contactsFound.length))

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error: any) {
        console.error(`   ❌ Error searching for ${title}:`, error.message)
      }
    }

    if (contactsFound.length === 0) {
      console.log(`   ⚠️  No contacts found`)
      continue
    }

    console.log(`   ✅ Found ${contactsFound.length} contacts`)

    // Save contacts to Supabase
    for (const person of contactsFound) {
      try {
        // Extract first/last name
        const nameParts = person.name?.split(' ') || []
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        const { data: contact, error } = await supabase
          .from('contacts')
          .insert({
            offer_id: offer.id,
            company_id: company.id,
            first_name: firstName,
            last_name: lastName,
            title: person.title,
            linkedin_url: person.linkedin_url,
            source_tool: 'exa',
            source_raw: {
              name: person.name,
              title: person.title,
              company: person.company,
              linkedin_url: person.linkedin_url,
              score: person.score
            }
          })
          .select('id')
          .single()

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            console.log(`      ⏭️  ${person.name} already exists`)
          } else {
            console.error(`      ❌ Error saving ${person.name}:`, error.message)
          }
        } else {
          console.log(`      ✅ Saved: ${person.name} (${person.title})`)
          totalContactsFound++
        }
      } catch (error: any) {
        console.error(`      ❌ Error processing ${person.name}:`, error.message)
      }
    }
  }

  console.log(`\n\n✅ Complete!`)
  console.log(`   Companies processed: ${companiesProcessed}`)
  console.log(`   Contacts found: ${totalContactsFound}`)
  console.log(`\n💡 Next: Enrich emails for these contacts`)
  console.log(`   Run: npx ts-node scripts/enrich-finance-companies.ts --enrich-existing true`)
}

main().catch(console.error)
