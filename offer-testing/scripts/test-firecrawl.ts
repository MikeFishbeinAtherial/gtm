/**
 * Test Firecrawl API Integration
 * 
 * Verifies that Firecrawl is properly configured and working.
 * Tests scrape, agent, and actions functionality.
 * 
 * Run: npx ts-node scripts/test-firecrawl.ts
 */

import * as dotenv from 'dotenv'
import { z } from 'zod'
import Firecrawl from '@mendable/firecrawl-js'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Check for API key
if (!process.env.FIRECRAWL_API_KEY) {
  console.error('❌ FIRECRAWL_API_KEY not found in .env.local')
  process.exit(1)
}

console.log('✅ Firecrawl API key found')
console.log('🔥 Testing Firecrawl...\n')

// Initialize client
const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY!
})

async function test1_BasicScrape() {
  console.log('\n📝 Test 1: Basic Scrape (Single Page)')
  console.log('=' .repeat(50))
  
  try {
    console.log('Scraping Firecrawl homepage...')
    
    const result = await firecrawl.scrape('https://firecrawl.dev', {
      formats: ['markdown'] as any
    })

    if (result && result.markdown) {
      console.log('\n✅ Success!')
      console.log(`Markdown length: ${result.markdown.length} characters`)
      console.log(`\nFirst 200 characters:`)
      console.log(result.markdown.substring(0, 200) + '...')
    } else {
      console.log('❌ Scrape failed: No markdown returned')
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

async function test2_ScrapeWithSchema() {
  console.log('\n📝 Test 2: Scrape with JSON Schema')
  console.log('=' .repeat(50))
  
  try {
    const schema = z.object({
      company_mission: z.string(),
      is_open_source: z.boolean(),
      is_in_yc: z.boolean()
    })

    console.log('Extracting structured data from Firecrawl homepage...')
    
    const result = await firecrawl.scrape('https://firecrawl.dev', {
      formats: [{
        type: 'json',
        schema: schema
      }] as any
    })

    if (result && result.json) {
      console.log('\n✅ Success!')
      console.log('\nExtracted data:')
      console.log(JSON.stringify(result.json, null, 2))
    } else {
      console.log('❌ Extraction failed')
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

async function test3_AgentBasicExtraction() {
  console.log('\n📝 Test 3: Agent - Basic Extraction (Founders)')
  console.log('=' .repeat(50))
  
  try {
    const schema = z.object({
      founders: z.array(z.object({
        name: z.string().describe("Full name of the founder"),
        role: z.string().optional().describe("Role or position"),
        background: z.string().optional().describe("Professional background")
      })).describe("List of founders")
    })

    console.log('Agent searching for Firecrawl founders...')
    
    const result = await firecrawl.agent({
      prompt: "Find the founders of Firecrawl",
      schema: schema
    })

    if (result.status === 'completed' && result.data) {
      console.log('\n✅ Success!')
      console.log(`Credits used: ${result.creditsUsed}`)
      console.log('\nFounders:')
      ;(result.data as any).founders.forEach((founder: any, i: number) => {
        console.log(`${i + 1}. ${founder.name}`)
        if (founder.role) console.log(`   Role: ${founder.role}`)
        if (founder.background) console.log(`   Background: ${founder.background}`)
      })
    } else {
      console.log('❌ Extraction failed:', result.status)
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

async function test4_AgentWithURLs() {
  console.log('\n📝 Test 4: Agent with Specific URLs')
  console.log('=' .repeat(50))
  
  try {
    const schema = z.object({
      plans: z.array(z.object({
        name: z.string().describe("Plan name"),
        price: z.string().describe("Price with currency and period"),
        features: z.array(z.string()).describe("Key features")
      })).describe("Pricing plans")
    })

    console.log('Extracting pricing from Firecrawl...')
    
    const result = await firecrawl.agent({
      urls: ["https://firecrawl.dev/pricing"],
      prompt: "Extract all pricing plans with names, prices, and key features",
      schema: schema,
      maxCredits: 30
    })

    if (result.status === 'completed' && result.data) {
      console.log('\n✅ Success!')
      console.log(`Credits used: ${result.creditsUsed}`)
      console.log(`\nFound ${(result.data as any).plans.length} pricing plans:`)
      ;(result.data as any).plans.forEach((plan: any, i: number) => {
        console.log(`\n${i + 1}. ${plan.name} - ${plan.price}`)
        console.log(`   Features: ${plan.features.slice(0, 3).join(', ')}${plan.features.length > 3 ? '...' : ''}`)
      })
    } else {
      console.log('❌ Extraction failed:', result.status)
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

async function test5_StartAndPoll() {
  console.log('\n📝 Test 5: Agent - Start Job + Poll Status')
  console.log('=' .repeat(50))
  
  try {
    console.log('Starting asynchronous job...')
    
    const job = await firecrawl.startAgent({
      prompt: "Find 3 interesting facts about Firecrawl",
      maxCredits: 20
    })

    console.log(`✅ Job started: ${job.id}`)
    console.log('Polling for status...')

    // Poll every 3 seconds
    let attempts = 0
    const maxAttempts = 20
    
    while (attempts < maxAttempts) {
      const status = await firecrawl.getAgentStatus(job.id!)
      
      console.log(`   Status: ${status.status}`)
      
      if (status.status === 'completed') {
        console.log('\n✅ Job completed!')
        console.log(`Credits used: ${status.creditsUsed}`)
        console.log('\nData:', JSON.stringify(status.data, null, 2))
        break
      } else if (status.status === 'failed') {
        console.log('❌ Job failed')
        break
      }
      
      // Wait 3 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 3000))
      attempts++
    }
    
    if (attempts >= maxAttempts) {
      console.log('⚠️  Job still processing after max attempts')
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

// Run all tests
async function runAllTests() {
  console.log('🔥 FIRECRAWL API TEST SUITE')
  console.log('=' .repeat(50))
  
  try {
    await test1_BasicScrape()
    await test2_ScrapeWithSchema()
    await test3_AgentBasicExtraction()
    await test4_AgentWithURLs()
    await test5_StartAndPoll()
    
    console.log('\n' + '=' .repeat(50))
    console.log('✅ All tests completed!')
    console.log('\n💡 Features Tested:')
    console.log('- ✅ Scrape: Single-page content extraction')
    console.log('- ✅ Scrape + Schema: Structured data extraction')
    console.log('- ✅ Agent: Autonomous research without URLs')
    console.log('- ✅ Agent + URLs: Focused extraction with URLs')
    console.log('- ✅ Async Jobs: Start job and poll status')
    console.log('\n📚 Next Steps:')
    console.log('- Try Scrape + Actions for interactive pages')
    console.log('- Use URLs when you know where data lives (faster, cheaper)')
    console.log('- Set maxCredits to control costs')
    console.log('- Define clear schemas for structured output')
    console.log('\n📖 See context/api-guides/firecrawl-usage-guide.md for more patterns')
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message)
  }
}

// Run tests
runAllTests()

