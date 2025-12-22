/**
 * Test script for Exa API
 * 
 * This script tests all the Exa functions using the modern exa-js SDK
 * to make sure your API key works and you can search for companies, people, and research.
 */

import * as dotenv from 'dotenv'
import { 
  exaSearch,
  exaSearchAndContents,
  exaFindCompanies, 
  exaSearchPeople,
  exaFindContacts,
  exaResearchCompany,
  exaIndustryResearch 
} from '../src/lib/clients/exa'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

async function testExa() {
  console.log('🔍 Testing Exa API with Modern SDK...\n')

  // Check if API key is set
  if (!process.env.EXA_API_KEY) {
    console.error('❌ EXA_API_KEY not found in .env.local')
    console.log('\nMake sure your .env.local file has:')
    console.log('EXA_API_KEY=your_actual_api_key_here')
    process.exit(1)
  }

  console.log('✅ API key found\n')

  try {
    // Test 1: Basic Search
    console.log('📝 Test 1: Basic Search')
    console.log('Searching for: "B2B SaaS companies with 20-100 employees"')
    
    const searchResults = await exaSearch({
      query: 'B2B SaaS companies with 20-100 employees',
      num_results: 5,
      use_autoprompt: true,
      category: 'company'
    })

    console.log(`✅ Found ${searchResults.results.length} results:`)
    searchResults.results.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.title}`)
      console.log(`     ${result.url}`)
      console.log(`     Score: ${result.score.toFixed(3)}\n`)
    })

    if (searchResults.autoprompt_string) {
      console.log(`🤖 Autoprompt: "${searchResults.autoprompt_string}"\n`)
    }

    // Test 2: Search with Content (more efficient)
    console.log('📄 Test 2: Search and Get Contents in One Call')
    console.log('Looking for: AI automation trends')
    
    const searchWithContent = await exaSearchAndContents({
      query: 'AI automation trends in 2024',
      num_results: 3,
      summary: true,
      text: false  // Don't need full text, just summaries
    })

    console.log(`✅ Found ${searchWithContent.results.length} articles with summaries:`)
    searchWithContent.results.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.title}`)
      console.log(`     ${result.url}`)
      if (result.summary) {
        console.log(`     📄 ${result.summary.substring(0, 150)}...`)
      }
      console.log('')
    })

    // Test 3: Find Companies (Helper function)
    console.log('🏢 Test 3: Find Companies')
    console.log('Looking for: Marketing agencies hiring salespeople in US')
    
    const companies = await exaFindCompanies({
      industry: 'marketing agency',
      size: '10-50 employees',
      geography: 'United States',
      signals: ['hiring salespeople'],
      limit: 3
    })

    console.log(`✅ Found ${companies.results.length} companies:`)
    companies.results.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.title}`)
      console.log(`     ${result.url}\n`)
    })

    // Test 4: NEW - People Search!
    console.log('👥 Test 4: People Search (NEW)')
    console.log('Looking for: CMOs at B2B SaaS companies')
    
    const people = await exaSearchPeople({
      query: 'CMO at B2B SaaS company',
      num_results: 5,
      include_domains: ['linkedin.com']
    })

    console.log(`✅ Found ${people.results.length} people:`)
    people.results.forEach((person, i) => {
      console.log(`  ${i + 1}. ${person.name}`)
      if (person.title) console.log(`     Title: ${person.title}`)
      if (person.company) console.log(`     Company: ${person.company}`)
      console.log(`     LinkedIn: ${person.linkedin_url}`)
      console.log(`     Score: ${person.score.toFixed(3)}\n`)
    })

    // Test 5: NEW - Find Contacts at Specific Company
    console.log('🎯 Test 5: Find Contacts at Specific Company (NEW)')
    
    // Use the first company from our earlier search
    if (companies.results.length > 0) {
      const targetCompany = companies.results[0].title
      console.log(`Looking for: Sales leaders at ${targetCompany}`)
      
      const contacts = await exaFindContacts({
        company: targetCompany,
        titles: ['VP Sales', 'Sales Director', 'Head of Sales', 'Chief Revenue Officer'],
        limit: 3
      })

      console.log(`✅ Found ${contacts.results.length} contacts:`)
      contacts.results.forEach((contact, i) => {
        console.log(`  ${i + 1}. ${contact.name}`)
        if (contact.title) console.log(`     ${contact.title}`)
        if (contact.linkedin_url) console.log(`     ${contact.linkedin_url}`)
        console.log('')
      })
    }

    // Test 6: Research a Company
    console.log('🔬 Test 6: Research a Company')
    
    // Pick the first company from our search
    if (companies.results.length > 0) {
      const firstCompany = companies.results[0].title
      console.log(`Researching: ${firstCompany}`)
      
      const research = await exaResearchCompany(firstCompany, {
        include_news: true,
        days_back: 90,
        get_summary: true
      })

      console.log(`✅ Found ${research.search.results.length} articles:`)
      
      // Show first 3 results with summaries
      const resultsToShow = Math.min(3, research.search.results.length)
      for (let i = 0; i < resultsToShow; i++) {
        const article = research.search.results[i]
        console.log(`\n  ${i + 1}. ${article.title}`)
        console.log(`     ${article.url}`)
        
        if (research.contents?.results[i]?.summary) {
          console.log(`     📄 ${research.contents.results[i].summary.substring(0, 150)}...`)
        }
      }
      console.log('')
    }

    // Test 7: Industry Research
    console.log('📊 Test 7: Industry Research')
    console.log('Topic: AI automation trends in marketing')
    
    const industryInsights = await exaIndustryResearch(
      'marketing',
      'AI automation',
      { limit: 3, days_back: 180 }
    )

    console.log(`✅ Found ${industryInsights.search.results.length} insights:`)
    industryInsights.search.results.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.title}`)
      console.log(`     ${result.url}`)
      
      if (industryInsights.contents?.results[i]?.summary) {
        console.log(`     📄 ${industryInsights.contents.results[i].summary.substring(0, 120)}...`)
      }
      console.log('')
    })

    console.log('🎉 All Exa tests passed!')
    console.log('\n✨ Your Exa integration is working perfectly!')
    console.log('\n🆕 New Features Available:')
    console.log('  • People Search - Find decision-makers on LinkedIn')
    console.log('  • Contact Finder - Get contacts at specific companies')
    console.log('  • Efficient API - searchAndContents combines search + content in one call')

  } catch (error) {
    console.error('\n❌ Error testing Exa:', error)
    
    if (error instanceof Error) {
      console.error('Message:', error.message)
      
      // Helpful error messages
      if (error.message.includes('401') || error.message.includes('403')) {
        console.log('\n💡 This looks like an authentication error.')
        console.log('Double-check your API key in .env.local')
        console.log('Get your key from: https://dashboard.exa.ai/')
      } else if (error.message.includes('429')) {
        console.log('\n💡 Rate limit reached. Wait a moment and try again.')
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        console.log('\n💡 Network error. Check your internet connection.')
      } else if (error.message.includes('exa-js')) {
        console.log('\n💡 The exa-js package might not be installed.')
        console.log('Run: npm install exa-js')
      }
    }
    
    process.exit(1)
  }
}

// Run the tests
testExa()

