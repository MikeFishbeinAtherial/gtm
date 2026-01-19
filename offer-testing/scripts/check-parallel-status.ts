/**
 * Check status of Parallel FindAll queries and retrieve results
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

const PARALLEL_API_KEY = process.env.PARALLEL_API_KEY

if (!PARALLEL_API_KEY) {
  console.error('❌ PARALLEL_API_KEY not set')
  process.exit(1)
}

const runId = process.argv[2]

if (!runId) {
  console.error('Usage: npx ts-node scripts/check-parallel-status.ts <run_id>')
  process.exit(1)
}

async function checkStatus(runId: string) {
  try {
    const response = await fetch(`https://api.parallel.ai/v1beta/findall/runs/${runId}/result`, {
      headers: {
        'x-api-key': PARALLEL_API_KEY!,
        'parallel-beta': 'findall-2025-09-15'
      }
    })

    if (response.status === 404) {
      console.log('⏳ Query not found or still initializing...')
      return
    }

    const result = await response.json()
    const status = result.run?.status?.status || result.status
    const metrics = result.run?.status?.metrics || {}
    
    console.log(`\n📊 Query Status: ${status}`)
    console.log(`   Generated Candidates: ${metrics.generated_candidates_count || 0}`)
    console.log(`   Matched Candidates: ${metrics.matched_candidates_count || 0}`)
    
    if (status === 'completed') {
      const candidates = result.candidates || []
      const matched = candidates.filter((c: any) => c.match_status === 'matched')
      console.log(`\n✅ Query completed!`)
      console.log(`   Total Candidates: ${candidates.length}`)
      console.log(`   Matched: ${matched.length}`)
      
      if (matched.length > 0) {
        console.log(`\n📋 Sample matched companies:`)
        matched.slice(0, 5).forEach((c: any, idx: number) => {
          console.log(`\n${idx + 1}. ${c.name}`)
          console.log(`   URL: ${c.url || 'N/A'}`)
          console.log(`   Description: ${(c.description || '').substring(0, 100)}...`)
        })
      }
    } else if (status === 'running') {
      console.log(`\n⏳ Query is still running...`)
      console.log(`   Check again in a minute or two.`)
    } else if (status === 'failed') {
      console.log(`\n❌ Query failed:`)
      console.log(`   Reason: ${result.run?.status?.termination_reason || 'unknown'}`)
    }
  } catch (error: any) {
    console.error(`❌ Error checking status: ${error.message}`)
  }
}

checkStatus(runId)
