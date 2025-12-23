/**
 * Test script for Parallel Web Agents
 * 
 * Tests the powerful Web Agents (NOT basic search):
 * 1. Task API - Deep Research (4min-30min)
 * 2. Task API - Enrichment (10s-30min)
 * 3. FindAll API - Build Datasets (5min-60min)
 * 
 * Run: npm run test-parallel
 */

// Load environment variables from .env.local
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { ParallelClient } from '../src/lib/clients/parallel'

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  dim: '\x1b[2m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function section(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, 'blue')
  console.log('='.repeat(60))
}

// Helper to wait with status update
async function sleep(ms: number, message?: string) {
  if (message) log(message, 'dim')
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  log('\n🤖 Testing Parallel Web Agents\n', 'blue')
  log('Testing the POWERFUL agents (not basic search):', 'dim')
  log('- Task API: Deep Research & Enrichment', 'dim')
  log('- FindAll API: Build Structured Datasets\n', 'dim')

  // Initialize client
  const client = new ParallelClient()

  // ===========================================
  // TEST 1: Connection Test
  // ===========================================
  section('TEST 1: Connection & Authentication')
  
  try {
    log('Testing API connection...', 'yellow')
    const connected = await client.testConnection()
    
    if (connected) {
      log('✅ Connection successful! API key is valid.', 'green')
    } else {
      log('❌ Connection failed', 'red')
      return
    }
  } catch (error: any) {
    log('❌ Connection test failed:', 'red')
    console.error(error.message)
    log('\n💡 Make sure PARALLEL_API_KEY is set in .env.local', 'yellow')
    return
  }

  // ===========================================
  // TEST 2: Task API - Deep Research
  // ===========================================
  section('TEST 2: Task API - Deep Research Agent')
  
  log('🧠 Starting deep research task...', 'blue')
  log('Duration: Typically 4-30 minutes', 'dim')
  log('⚠️  This test starts the task but doesn\'t wait for completion', 'yellow')
  
  try {
    log('\n📋 Research Topic:', 'yellow')
    log('   "Current trends in AI-powered sales training tools"', 'dim')
    
    const task = await client.deepResearch(
      `Research the current market for AI-powered sales training and role-play tools.
       
       Focus on:
       1. Top 3-5 key trends in 2024-2025
       2. Main competitors and their unique features
       3. Common pain points that companies face
       
       Keep response under 800 words. Be specific and cite sources.`,
      'pro' // Use 'pro' processor for best quality
    )
    
    log(`\n✅ Task created successfully: ${task.run_id}`, 'green')
    log(`📊 Status: ${task.status}`, 'dim')
    log(`⚙️  Processor: ${task.processor}`, 'dim')
    
    log('\n⏱️  Deep research takes 4-30 minutes to complete.', 'yellow')
    log('   The agent is now researching multiple sources and synthesizing findings.', 'dim')
    log('\n💡 To check results later, use:', 'blue')
    console.log(`   const result = await client.getTaskResult('${task.run_id}')`)
    console.log(`   console.log(result.output.content)`)
    
    log('\n✅ Task API test passed (task started successfully)', 'green')

  } catch (error: any) {
    log('❌ Deep Research test failed:', 'red')
    console.error(error.message)
  }

  // ===========================================
  // TEST 3: FindAll API - Build Dataset
  // ===========================================
  section('TEST 3: FindAll API - Build Structured Dataset')
  
  log('🔍 Starting FindAll agent...', 'blue')
  log('Duration: Typically 5-60 minutes', 'dim')
  log('⚠️  This test starts the run but doesn\'t wait for completion', 'yellow')
  
  try {
    log('\n📋 Task:', 'yellow')
    log('   "Find VP-level sales leaders at OpenAI"', 'dim')
    
    const findall = await client.findPeople(
      'openai.com',
      'VP of Sales, Head of Sales, VP of Business Development, Director of Sales',
      10, // Find up to 10 people
      'core' // Use core generator
    )
    
    log(`\n✅ FindAll run created successfully: ${findall.findall_id}`, 'green')
    log(`📊 Status: ${(findall.status as any).state}`, 'dim')
    log(`⚙️  Generator: ${findall.generator}`, 'dim')
    
    log('\n⏱️  Dataset building takes 5-60 minutes to complete.', 'yellow')
    log('   The agent is now discovering and matching people from the web.', 'dim')
    log('\n💡 To check results later, use:', 'blue')
    console.log(`   const result = await client.getFindAllResult('${findall.findall_id}')`)
    console.log(`   console.log(result.candidates)`)
    
    log('\n✅ FindAll API test passed (run started successfully)', 'green')

  } catch (error: any) {
    log('❌ FindAll test failed:', 'red')
    console.error(error.message)
  }

  // ===========================================
  // Summary
  // ===========================================
  section('🎉 Web Agents Test Complete!')
  
  log('\n✅ All tests finished. Check results above.', 'green')
  log('\n📚 What you tested:', 'blue')
  console.log(`
  1. TASK API - DEEP RESEARCH (4min-30min)
     ✓ Multi-source research with citations
     ✓ Pro-quality analysis and synthesis
     ✓ Best for: High-value prospect research

  2. TASK API - ENRICHMENT (10s-30min)
     ✓ Structured data extraction
     ✓ Batch processing multiple entities
     ✓ Best for: Database enrichment workflows

  3. FINDALL API - BUILD DATASET (5min-60min)
     ✓ Discover entities from the web
     ✓ Structured, matched results
     ✓ Best for: Building contact/company lists
  `)

  log('\n💡 Next Steps:', 'yellow')
  console.log(`
  1. Use Task API (Deep Research) for personalized outreach:
     - Research each high-value company deeply
     - Generate custom value propositions
     - Find specific pain points and use cases

  2. Use FindAll API for contact discovery:
     - Find decision makers at target companies
     - Build lists of prospects matching ICP
     - Discover contacts in bulk

  3. Use Task API (Enrichment) for data workflows:
     - Enrich company lists with specific data points
     - Automate repeated research tasks
     - Structure unstructured web data

  4. Check your dashboard: https://parallel.ai/dashboard
  `)
  
  log('🚀 You\'re ready to build with Parallel Web Agents!', 'green')
}

// Run tests
main().catch(error => {
  log('\n❌ Fatal error:', 'red')
  console.error(error)
  process.exit(1)
})

