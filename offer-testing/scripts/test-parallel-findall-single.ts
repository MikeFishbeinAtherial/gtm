/**
 * Test a single Parallel FindAll query to verify it works
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { ParallelClient } from '../src/lib/clients/parallel.ts'

const parallel = new ParallelClient(process.env.PARALLEL_API_KEY)

async function main() {
  console.log('🧪 Testing Parallel FindAll with a single query...\n')

  const objective = 'Find all small-to-mid hedge funds ($10M-$500M AUM) in the United States that have hired AI/data leadership roles'
  const matchConditions = [
    {
      name: 'hedge_fund_type',
      description: "Company must be a hedge fund, alternative investment fund, or investment management firm. Look for keywords: 'hedge fund', 'alternative investment', 'investment management'. Exclude banks, credit unions, insurance companies."
    },
    {
      name: 'aum_size',
      description: "Company must have AUM between $10M and $500M, or have 5-50 employees and describe itself as a 'small' or 'mid-sized' fund."
    },
    {
      name: 'ai_data_leadership',
      description: "Company must have hired for AI/data leadership roles in the past 2 years. Look for: 'Head of AI', 'Chief Data Officer', 'Head of Data', 'AI Engineer', 'Data Scientist'."
    },
    {
      name: 'us_location',
      description: "Company headquarters must be in the United States."
    }
  ]

  console.log('📤 Creating FindAll run...')
  const startTime = Date.now()
  
  const findall = await parallel.findAll(
    'companies',
    objective,
    matchConditions,
    10, // Just 10 companies for testing
    'core'
  )

  const runId = findall.findall_id || findall.run_id
  console.log(`✅ Run created: ${runId}`)
  console.log(`⏳ Polling for results (typically 15-30 seconds)...\n`)

  // Poll for results
  let attempts = 0
  const maxAttempts = 30 // 5 minutes max
  let result: any = null

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
    
    try {
      result = await parallel.getFindAllResult(runId)
      
      if (result.status === 'completed') {
        break
      }
      
      if (result.status === 'failed') {
        throw new Error(`FindAll failed: ${result.error || 'unknown error'}`)
      }
      
      console.log(`   Attempt ${attempts + 1}/${maxAttempts}: Status = ${result.status || 'pending'}...`)
    } catch (error: any) {
      if (error.message?.includes('not ready') || error.message?.includes('not found') || error.message?.includes('404')) {
        console.log(`   Attempt ${attempts + 1}/${maxAttempts}: Not ready yet...`)
        attempts++
        continue
      }
      throw error
    }
    
    attempts++
  }

  if (!result || result.status !== 'completed') {
    throw new Error(`FindAll timed out after ${maxAttempts} attempts`)
  }

  const duration = Math.floor((Date.now() - startTime) / 1000)
  const items = result.output?.items || result.candidates || []
  
  console.log(`\n✅ Query completed in ${duration} seconds`)
  console.log(`📊 Found ${items.length} companies\n`)

  // Show sample companies
  console.log('📋 Sample companies found:')
  items.slice(0, 5).forEach((item: any, idx: number) => {
    console.log(`\n${idx + 1}. ${item.name || 'Unknown'}`)
    console.log(`   Domain: ${item.domain || item.website || 'N/A'}`)
    console.log(`   Description: ${(item.description || item.about || '').substring(0, 100)}...`)
    if (item.match_reasoning) {
      console.log(`   Match reasoning: ${item.match_reasoning.substring(0, 150)}...`)
    }
  })

  // Calculate cost
  const costPer1000 = 0.23 // core generator
  const estimatedCost = (items.length / 1000) * costPer1000
  console.log(`\n💰 Estimated cost: ~$${estimatedCost.toFixed(4)}`)

  // Save full results to JSON
  const fs = await import('fs')
  const path = await import('path')
  const outputFile = path.join(process.cwd(), `test-parallel-findall-${Date.now()}.json`)
  fs.writeFileSync(outputFile, JSON.stringify({
    run_id: runId,
    duration_seconds: duration,
    items_count: items.length,
    estimated_cost: estimatedCost,
    full_response: result,
    sample_items: items.slice(0, 10),
  }, null, 2))
  
  console.log(`\n💾 Full results saved to: ${outputFile}`)
}

main().catch(err => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
