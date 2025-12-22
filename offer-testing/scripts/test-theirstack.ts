/**
 * Test script for TheirStack API
 * 
 * This script tests the TheirStack integration with various searches.
 * 
 * Usage:
 *   npx tsx scripts/test-theirstack.ts
 */

// Load environment variables from .env.local
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import { TheirStackClient } from '../src/lib/clients/theirstack'

async function main() {
  console.log('🧪 Testing TheirStack API...\n')

  // Initialize client
  const client = new TheirStackClient()

  try {
    // Test 1: Basic connection test
    console.log('1️⃣ Testing API connection...')
    const isConnected = await client.testConnection()
    if (!isConnected) {
      console.error('❌ Connection test failed. Check your API key in .env.local')
      process.exit(1)
    }
    console.log('✅ Connection successful\n')

    // Test 2: Find companies hiring sales reps in the US
    console.log('2️⃣ Finding US companies hiring sales reps (last 7 days)...')
    const salesJobs = await client.findCompaniesHiringSales({
      country_codes: ['US'],
      posted_within_days: 7,
      min_employee_count: 50,
      max_employee_count: 500,
      limit: 5,
    })

    console.log(`   Found ${salesJobs.data.length} jobs from ${salesJobs.metadata.total_companies || 'N/A'} companies`)
    if (salesJobs.data.length > 0) {
      const firstJob = salesJobs.data[0]
      console.log(`   Example: ${firstJob.job_title} at ${firstJob.company_object?.name || 'Unknown'}`)
      if (firstJob.company_object?.domain) {
        console.log(`   Domain: ${firstJob.company_object.domain}`)
      }
      if (firstJob.locations && firstJob.locations.length > 0) {
        console.log(`   Location: ${firstJob.locations[0].display_name}`)
      }
    }
    console.log('')

    // Test 3: Find companies hiring engineers
    console.log('3️⃣ Finding companies hiring engineers (last 7 days)...')
    const engineeringJobs = await client.findCompaniesHiringForDepartment('engineering', {
      country_codes: ['US'],
      posted_within_days: 7,
      limit: 5,
    })

    console.log(`   Found ${engineeringJobs.data.length} engineering jobs`)
    if (engineeringJobs.data.length > 0) {
      const firstJob = engineeringJobs.data[0]
      console.log(`   Example: ${firstJob.job_title} at ${firstJob.company_object?.name || 'Unknown'}`)
    }
    console.log('')

    // Test 4: Custom search - jobs mentioning "AI" or "LLM"
    console.log('4️⃣ Finding jobs mentioning AI/LLM (last 7 days)...')
    const aiJobs = await client.searchByDescription(
      ['artificial intelligence', 'LLM', 'machine learning'],
      {
        country_codes: ['US'],
        posted_within_days: 7,
        limit: 5,
      }
    )

    console.log(`   Found ${aiJobs.data.length} AI-related jobs`)
    if (aiJobs.data.length > 0) {
      const firstJob = aiJobs.data[0]
      console.log(`   Example: ${firstJob.job_title} at ${firstJob.company_object?.name || 'Unknown'}`)
    }
    console.log('')

    // Test 5: Advanced search with multiple filters
    console.log('5️⃣ Advanced search: Remote sales jobs at YC companies...')
    const advancedJobs = await client.searchJobs({
      job_title_pattern_or: ['SDR', 'BDR', 'Sales'],
      posted_at_max_age_days: 14,
      remote: true,
      only_yc_companies: true,
      min_employee_count: 10,
      max_employee_count: 200,
      limit: 5,
    })

    console.log(`   Found ${advancedJobs.data.length} jobs`)
    if (advancedJobs.data.length > 0) {
      const firstJob = advancedJobs.data[0]
      console.log(`   Example: ${firstJob.job_title} at ${firstJob.company_object?.name || 'Unknown'}`)
      if (firstJob.company_object?.yc_batch) {
        console.log(`   YC Batch: ${firstJob.company_object.yc_batch}`)
      }
    }
    console.log('')

    // Summary
    console.log('✅ All tests passed!')
    console.log('\n📊 Summary:')
    console.log(`   - Sales jobs: ${salesJobs.data.length}`)
    console.log(`   - Engineering jobs: ${engineeringJobs.data.length}`)
    console.log(`   - AI jobs: ${aiJobs.data.length}`)
    console.log(`   - Remote YC jobs: ${advancedJobs.data.length}`)
    
    console.log('\n💡 Tips:')
    console.log('   - Use posted_at_max_age_days for recent jobs')
    console.log('   - Filter by employee count to target specific company sizes')
    console.log('   - Use job_title_pattern_or for flexible title matching')
    console.log('   - Filter by country_code for geographic targeting')
    console.log('   - Check company_object for rich company data')

  } catch (error) {
    console.error('\n❌ Error during testing:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    process.exit(1)
  }
}

main()

