/**
 * Save Exa company search results to Supabase
 * 
 * Usage:
 *   npx ts-node scripts/save-exa-companies-to-supabase.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'
import Exa from 'exa-js'

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

function getExaClient() {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) {
    throw new Error('EXA_API_KEY not set')
  }
  return new Exa(apiKey)
}

async function exaFindCompanies(params: {
  size?: string
  industry?: string
  geography?: string
  limit?: number
}) {
  const { size, industry, geography, limit = 50 } = params
  const parts = []
  if (industry) parts.push(industry)
  if (size) parts.push(`with ${size}`)
  if (geography) parts.push(`in ${geography}`)
  const query = `${parts.join(' ')} companies`
  
  const exa = getExaClient()
  return exa.search(query, {
    numResults: limit,
    useAutoprompt: true,
    category: 'company'
  })
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]
  }
}

function determineVertical(companyName: string, url: string): string {
  const nameLower = companyName.toLowerCase()
  
  // Bad companies to exclude
  const badKeywords = [
    'cornell hedge fund club', // Student club
    'hedge fund management', // Too generic
    'search partners', // Recruiting firm
    'audiology',
    'physical therapy',
    'contracting',
    'benefit solutions',
    'network services',
    'developers',
    'flooring',
    'seafood',
    'property',
    'jets',
    'housing',
    'crunchbase',
    'top 10k',
    'list of',
  ]
  
  if (badKeywords.some(kw => nameLower.includes(kw))) {
    return 'other' // Will be filtered out
  }
  
  // Since we're searching ONLY hedge funds, default to hedge_fund
  if (nameLower.includes('hedge fund') || 
      nameLower.includes('capital management') || 
      nameLower.includes('capital partners') ||
      nameLower.includes('fund management') ||
      nameLower.includes('capital lp') ||
      nameLower.includes('capital llc')) {
    return 'hedge_fund'
  }
  
  // Default to hedge_fund since we're searching only hedge funds
  return 'hedge_fund'
}

async function main() {
  console.log('\n🔍 Finding Companies with Exa\n')
  
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

  const limit = 100 // Get more to account for filtering

  // Run search - ONLY hedge funds
  const queries = [
    {
      industry: 'hedge fund',
      size: '10-100 employees',
      geography: 'East Coast United States',
      limit: 100
    }
  ]

  const allResults: any[] = []
  const seenUrls = new Set<string>()

  for (const queryParams of queries) {
    console.log(`Searching: ${queryParams.industry}...`)
    try {
      const results = await exaFindCompanies(queryParams)
      
      for (const result of results.results || []) {
        if (result.url && !seenUrls.has(result.url)) {
          seenUrls.add(result.url)
          allResults.push(result)
        }
      }
    } catch (error: any) {
      console.error(`Error searching ${queryParams.industry}:`, error.message)
    }
  }

  console.log(`\n✅ Found ${allResults.length} total companies\n`)

  // Filter out bad results
  const excluded = ['bridgewater', 'citadel', 'renaissance', 'two sigma', 'de shaw', 'point72']
  const nonCompanyKeywords = [
    'wikipedia', 
    'list of', 
    'association', 
    'insurance', 
    'due diligence exchange', 
    'hedge fund intelligence',
    'cornell hedge fund club', // Student club
    'search partners', // Recruiting
    'audiology',
    'physical therapy',
    'contracting',
    'benefit solutions',
    'network services',
    'developers',
    'crunchbase',
    'top 10k',
  ]
  
  const filtered = allResults.filter((c: any) => {
    const nameLower = (c.title || c.name || '').toLowerCase()
    const urlLower = (c.url || '').toLowerCase()
    
    // Exclude large firms
    if (excluded.some(ex => nameLower.includes(ex))) return false
    
    // Exclude non-companies
    if (nonCompanyKeywords.some(keyword => nameLower.includes(keyword) || urlLower.includes(keyword))) return false
    
    // Exclude bad domains
    if (urlLower.includes('wikipedia.org') || 
        urlLower.includes('hedgefundassoc.org') ||
        urlLower.includes('crunchbase.com')) return false
    
    // Must have "fund", "capital", or "management" in name to be a hedge fund
    if (!nameLower.includes('fund') && 
        !nameLower.includes('capital') && 
        !nameLower.includes('management') &&
        !nameLower.includes('partners')) {
      return false
    }
    
    return true
  })

  console.log(`📊 After filtering: ${filtered.length} companies\n`)

  // Save to Supabase
  console.log('💾 Saving to Supabase...\n')

  const companiesToInsert = filtered.map((company: any) => {
    const name = company.title || company.name || 'Unknown'
    const url = company.url
    const domain = extractDomain(url)
    const vertical = determineVertical(name, url)

    return {
      offer_id: offer.id,
      name: name,
      url: url,
      domain: domain,
      vertical: vertical,
      source_tool: 'exa',
      source_raw: {
        title: company.title,
        url: company.url,
        score: company.score,
        publishedDate: company.publishedDate
      },
      fit_score: 5 // Default, can be updated later
    }
  })

  // Check for duplicates by domain
  const existingDomains = new Set<string>()
  const { data: existing } = await supabase
    .from('companies')
    .select('domain')
    .eq('offer_id', offer.id)

  existing?.forEach(c => {
    if (c.domain) existingDomains.add(c.domain.toLowerCase())
  })

  const newCompanies = companiesToInsert.filter(c => {
    const domainLower = c.domain.toLowerCase()
    return !existingDomains.has(domainLower)
  })

  console.log(`   New companies: ${newCompanies.length}`)
  console.log(`   Duplicates skipped: ${companiesToInsert.length - newCompanies.length}\n`)

  if (newCompanies.length === 0) {
    console.log('✅ All companies already exist in database')
    return
  }

  // Insert in batches
  const batchSize = 20
  let inserted = 0

  for (let i = 0; i < newCompanies.length; i += batchSize) {
    const batch = newCompanies.slice(i, i + batchSize)
    const { error } = await supabase
      .from('companies')
      .insert(batch)

    if (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error.message)
    } else {
      inserted += batch.length
      console.log(`   ✅ Inserted batch ${i / batchSize + 1}: ${batch.length} companies (${inserted}/${newCompanies.length})`)
    }
  }

  console.log(`\n✅ Successfully saved ${inserted} companies to Supabase`)
  console.log(`\n💡 Next: Find contacts at these companies`)
  console.log(`   Run: npx ts-node scripts/find-contacts-exa.ts`)
}

main().catch(console.error)
