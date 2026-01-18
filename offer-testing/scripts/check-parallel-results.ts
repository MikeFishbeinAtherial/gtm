/**
 * Check Parallel FindAll runs and retrieve results
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

const apiKey = process.env.PARALLEL_API_KEY
if (!apiKey) {
  console.error('❌ PARALLEL_API_KEY not set')
  process.exit(1)
}

async function checkRuns() {
  console.log('🔍 Checking Parallel FindAll runs...\n')

  // List recent runs (we'll need to check the API docs for this endpoint)
  // For now, let's try to get runs from the API
  const response = await fetch('https://api.parallel.ai/v1beta/findall/runs?limit=10', {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'parallel-beta': 'findall-2025-09-15'
    }
  })

  if (!response.ok) {
    let error: any
    try {
      error = await response.json()
    } catch {
      error = { error: await response.text() }
    }
    console.error('❌ Failed to list runs:', JSON.stringify(error, null, 2))
    return
  }

  const runs = await response.json()
  console.log(`📊 Found ${runs.runs?.length || 0} recent runs\n`)

  if (!runs.runs || runs.runs.length === 0) {
    console.log('No runs found. They may have expired or been cleaned up.')
    return
  }

  // Get results for each completed run
  for (const run of runs.runs.slice(0, 5)) {
    console.log(`\n🔍 Run: ${run.findall_id || run.id}`)
    console.log(`   Status: ${run.status}`)
    console.log(`   Created: ${run.created_at}`)

    if (run.status === 'completed') {
      try {
        const resultResponse = await fetch(`https://api.parallel.ai/v1beta/findall/runs/${run.findall_id || run.id}/result`, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'parallel-beta': 'findall-2025-09-15'
          }
        })

        if (resultResponse.ok) {
          const result = await resultResponse.json()
          const items = result.output?.items || result.candidates || []
          console.log(`   ✅ Found ${items.length} companies`)
          
          if (items.length > 0) {
            console.log(`\n   Sample companies:`)
            items.slice(0, 3).forEach((item: any, idx: number) => {
              console.log(`   ${idx + 1}. ${item.name || 'Unknown'}`)
              console.log(`      Domain: ${item.domain || item.website || 'N/A'}`)
              console.log(`      Description: ${(item.description || item.about || '').substring(0, 80)}...`)
            })
          }
        }
      } catch (error: any) {
        console.log(`   ⚠️  Could not fetch results: ${error.message}`)
      }
    }
  }
}

checkRuns().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
