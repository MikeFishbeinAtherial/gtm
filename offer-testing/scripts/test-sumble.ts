/**
 * Test script for Sumble API
 * 
 * This script tests the Sumble client to ensure:
 * 1. API key is configured correctly
 * 2. Connection to Sumble API works
 * 3. Basic enrichment functions work
 * 
 * Run with: npx tsx scripts/test-sumble.ts
 */

// Load environment variables from .env.local
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local before importing the client
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { SumbleClient } from '../src/lib/clients/sumble'

// ANSI color codes for pretty terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  dim: '\x1b[2m',
}

// Helper function to print colored output
function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(colors[color] + message + colors.reset)
}

async function main() {
  log('\n🧪 Testing Sumble API Setup\n', 'blue')

  // Initialize the Sumble client
  const sumble = new SumbleClient()

  // Test 1: Check if API key is configured
  log('1️⃣  Checking API key configuration...', 'yellow')
  if (!process.env.SUMBLE_API_KEY) {
    log('❌ SUMBLE_API_KEY not found in environment', 'red')
    log('   Add it to .env.local: SUMBLE_API_KEY=your_api_key_here', 'dim')
    process.exit(1)
  }
  log('✅ API key found', 'green')

  // Test 2: Test basic enrichment with a well-known company
  log('\n2️⃣  Testing organization enrichment with technology discovery...', 'yellow')
  try {
    const result = await sumble.enrichOrganization({ 
      domain: 'sumble.com',
      technologies: ['python'] // Required: at least one technology
    })
    
    log('✅ Enrichment successful!', 'green')
    log(`   Credits used: ${result.credits_used}, remaining: ${result.credits_remaining}`, 'dim')
    log('\nCompany Data:', 'blue')
    log(`   Name: ${result.organization.name}`, 'dim')
    log(`   Domain: ${result.organization.domain}`, 'dim')
    log(`   Technologies found: ${result.technologies_found || 'None'}`, 'dim')
    log(`   Technology count: ${result.technologies_count || 0}`, 'dim')
    
    if (result.technologies && result.technologies.length > 0) {
      log('\nTechnology Details:', 'blue')
      result.technologies.forEach(tech => {
        log(`   ${tech.name}:`, 'dim')
        log(`     - People: ${tech.people_count || 0}`, 'dim')
        log(`     - Jobs: ${tech.jobs_count || 0}`, 'dim')
        if (tech.last_job_post) {
          log(`     - Last job post: ${tech.last_job_post}`, 'dim')
        }
      })
    }
  } catch (error) {
    log('❌ Enrichment failed', 'red')
    if (error instanceof Error) {
      log(`   Error: ${error.message}`, 'dim')
      
      // Provide helpful hints based on error
      if (error.message.includes('401')) {
        log('   💡 Hint: Your API key may be invalid or expired', 'yellow')
        log('   Generate a new key at: https://sumble.com/account/api-keys', 'dim')
      } else if (error.message.includes('429')) {
        log('   💡 Hint: Rate limit exceeded (10 requests/second)', 'yellow')
      } else if (error.message.includes('403')) {
        log('   💡 Hint: Your account may not have access to this endpoint', 'yellow')
      }
    }
    process.exit(1)
  }

  // Test 3: Test enrichment with multiple technologies
  log('\n3️⃣  Testing enrichment with multiple technologies...', 'yellow')
  try {
    const result = await sumble.enrichOrganization({ 
      domain: 'anthropic.com',
      technologies: ['python', 'aws', 'react']
    })
    
    log('✅ Multi-technology enrichment successful!', 'green')
    log(`   Company: ${result.organization.name}`, 'dim')
    log(`   Technologies found: ${result.technologies_found || 'None'}`, 'dim')
    log(`   Credits used: ${result.credits_used}`, 'dim')
  } catch (error) {
    log('⚠️  Multi-technology test failed (may not be critical)', 'yellow')
    if (error instanceof Error) {
      log(`   Error: ${error.message}`, 'dim')
    }
  }

  // Test 4: Test Jobs API - find Python jobs at Anthropic
  log('\n4️⃣  Testing Jobs API (finding hiring signals)...', 'yellow')
  try {
    const result = await sumble.findJobs({
      organization: { domain: 'anthropic.com' },
      filters: { 
        technologies: ['python'],
        since: '2024-01-01'  // Jobs from 2024 onwards
      },
      limit: 5  // Just get a few to test (each job costs 3 credits)
    })
    
    log('✅ Jobs API successful!', 'green')
    log(`   Credits used: ${result.credits_used} (3 per job), remaining: ${result.credits_remaining}`, 'dim')
    log(`   Total jobs found: ${result.total}`, 'dim')
    log(`   Jobs returned: ${result.jobs.length}`, 'dim')
    
    if (result.jobs.length > 0) {
      log('\nSample Job:', 'blue')
      const job = result.jobs[0]
      log(`   Title: ${job.job_title}`, 'dim')
      log(`   Company: ${job.organization_name}`, 'dim')
      log(`   Location: ${job.location}`, 'dim')
      log(`   Technologies: ${job.matched_technologies || 'N/A'}`, 'dim')
      log(`   Posted: ${new Date(job.datetime_pulled).toLocaleDateString()}`, 'dim')
      log(`   URL: ${job.url}`, 'dim')
    }
  } catch (error) {
    log('⚠️  Jobs API test failed (may not be critical)', 'yellow')
    if (error instanceof Error) {
      log(`   Error: ${error.message}`, 'dim')
    }
  }

  // All tests passed!
  log('\n🎉 All critical tests passed! Sumble is ready to use.\n', 'green')
}

// Run the tests
main().catch(error => {
  log('\n💥 Unexpected error occurred:', 'red')
  console.error(error)
  process.exit(1)
})

