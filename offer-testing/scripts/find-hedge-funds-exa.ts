/**
 * Find hedge funds using Exa company search
 * Uses Exa's 60M+ company database with structured metadata
 * 
 * Usage:
 *   npx ts-node scripts/find-hedge-funds-exa.ts [--limit 50]
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import Exa from 'exa-js'

// Initialize Exa client
function getExaClient() {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) {
    throw new Error('EXA_API_KEY not set in environment variables')
  }
  return new Exa(apiKey)
}

async function exaFindCompanies(params: {
  size?: string
  industry?: string
  geography?: string
  signals?: string[]
  limit?: number
}) {
  const { size, industry, geography, signals = [], limit = 50 } = params

  // Construct natural language query
  const parts = []
  if (industry) parts.push(industry)
  if (size) parts.push(`with ${size}`)
  if (geography) parts.push(`in ${geography}`)
  if (signals.length > 0) parts.push(`that are ${signals.join(' and ')}`)

  const query = `${parts.join(' ')} companies`

  const exa = getExaClient()
  return exa.search(query, {
    numResults: limit,
    useAutoprompt: true,
    category: 'company'
  })
}

async function main() {
  const args = process.argv.slice(2)
  const limitArg = args.find(arg => arg.startsWith('--limit'))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) || 50 : 50

  console.log('\n🔍 Finding Hedge Funds & Investment Management Firms with Exa\n')
  console.log(`Target: ${limit} companies`)
  console.log('Types: Hedge funds and investment management firms')
  console.log('Location: East Coast, United States')
  console.log('Size: 10-100 employees')
  console.log('Excluding: Bridgewater Associates, Citadel, Renaissance, Two Sigma\n')

  try {
    // Run multiple queries to get better coverage
    const queries = [
      {
        industry: 'hedge fund',
        size: '10-100 employees',
        geography: 'East Coast United States',
        limit: Math.ceil(limit / 2)
      },
      {
        industry: 'investment management firm',
        size: '10-100 employees',
        geography: 'East Coast United States',
        limit: Math.ceil(limit / 2)
      }
    ]

    const allResults: any[] = []
    const seenUrls = new Set<string>()

    for (const queryParams of queries) {
      console.log(`Searching: ${queryParams.industry}...`)
      const results = await exaFindCompanies(queryParams)
      
      // Deduplicate by URL
      for (const result of results.results || []) {
        if (result.url && !seenUrls.has(result.url)) {
          seenUrls.add(result.url)
          allResults.push(result)
        }
      }
    }

    // Create a results object with all companies
    const results = {
      results: allResults.slice(0, limit),
      autopromptString: undefined
    }

    console.log(`✅ Found ${results.results?.length || 0} companies\n`)

    // Display results
    console.log('📊 Results:\n')
    results.results?.forEach((company: any, idx: number) => {
      console.log(`${idx + 1}. ${company.title || company.name || 'Unknown'}`)
      console.log(`   URL: ${company.url}`)
      if (company.score) {
        console.log(`   Score: ${company.score.toFixed(3)}`)
      }
      if (company.publishedDate) {
        console.log(`   Updated: ${company.publishedDate}`)
      }
      if (company.text) {
        const preview = company.text.substring(0, 100).replace(/\n/g, ' ')
        console.log(`   Preview: ${preview}...`)
      }
      console.log('')
    })

    // Filter out excluded companies and non-company results
    const excluded = ['bridgewater', 'citadel', 'renaissance', 'two sigma', 'de shaw', 'point72']
    const nonCompanyKeywords = ['wikipedia', 'list of', 'association', 'insurance', 'due diligence exchange', 'hedge fund intelligence']
    
    const filtered = (results.results || []).filter((c: any) => {
      const nameLower = (c.title || c.name || '').toLowerCase()
      const urlLower = (c.url || '').toLowerCase()
      
      // Exclude large firms
      if (excluded.some(ex => nameLower.includes(ex))) return false
      
      // Exclude non-company results (lists, associations, etc.)
      if (nonCompanyKeywords.some(keyword => nameLower.includes(keyword) || urlLower.includes(keyword))) {
        return false
      }
      
      // Exclude Wikipedia and other non-company sites
      if (urlLower.includes('wikipedia.org') || urlLower.includes('hedgefundassoc.org')) {
        return false
      }
      
      return true
    })

    console.log(`\n📈 After Excluding Large Firms:`)
    console.log(`   Original: ${results.results?.length || 0}`)
    console.log(`   Filtered: ${filtered.length}`)
    console.log(`   Removed: ${(results.results?.length || 0) - filtered.length}`)

    if (filtered.length < limit) {
      console.log(`\n⚠️  Only found ${filtered.length} companies (requested ${limit})`)
      console.log('   Try:')
      console.log('   - Expanding to broader geography (NYC metro, tri-state)')
      console.log('   - Adjusting employee count range')
      console.log('   - Removing exclusions')
    }

    // Show autoprompt if available
    if ((results as any).autopromptString) {
      console.log(`\n💡 Exa's optimized query: "${(results as any).autopromptString}"`)
    }

    console.log('\n💡 Next Steps:')
    console.log('   1. Review these companies manually')
    console.log('   2. Save good ones to Supabase')
    console.log('   3. Find contacts at those companies')
    console.log('   4. Schedule emails')

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('EXA_API_KEY')) {
      console.error('\n💡 Make sure EXA_API_KEY is set in .env.local')
    }
    process.exit(1)
  }
}

main().catch(console.error)
