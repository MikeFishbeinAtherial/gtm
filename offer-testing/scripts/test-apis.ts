/**
 * Test API Connections
 * 
 * Run this script to verify all API integrations are working.
 * Usage: npm run test-apis
 */

import { testConnection as testAnthropic } from '../src/lib/clients/anthropic'
import { parallel } from '../src/lib/clients/parallel'
import { exa } from '../src/lib/clients/exa'
import { sumble } from '../src/lib/clients/sumble'
import { theirstack } from '../src/lib/clients/theirstack'
import { leadmagic } from '../src/lib/clients/leadmagic'
import { unipile } from '../src/lib/clients/unipile'
import { supabase } from '../src/lib/clients/supabase'

// ===========================================
// TYPES
// ===========================================

interface TestResult {
  name: string
  success: boolean
  message: string
  duration: number
}

// ===========================================
// TEST FUNCTIONS
// ===========================================

async function testSupabase(): Promise<TestResult> {
  const start = Date.now()
  try {
    // Try to query the offers table (will fail gracefully if empty)
    const { error } = await supabase.from('offers').select('id').limit(1)
    
    if (error && !error.message.includes('does not exist')) {
      return {
        name: 'Supabase',
        success: false,
        message: `Connection failed: ${error.message}`,
        duration: Date.now() - start,
      }
    }

    return {
      name: 'Supabase',
      success: true,
      message: 'Connected successfully',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'Supabase',
      success: false,
      message: `Error: ${(error as Error).message}`,
      duration: Date.now() - start,
    }
  }
}

async function testAnthropicAPI(): Promise<TestResult> {
  const start = Date.now()
  try {
    const success = await testAnthropic()
    return {
      name: 'Anthropic (Claude)',
      success,
      message: success ? 'Connected successfully' : 'Connection test returned false',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'Anthropic (Claude)',
      success: false,
      message: `Error: ${(error as Error).message}`,
      duration: Date.now() - start,
    }
  }
}

async function testParallelAPI(): Promise<TestResult> {
  const start = Date.now()
  try {
    const success = await parallel.testConnection()
    return {
      name: 'Parallel',
      success,
      message: success ? 'Connected successfully' : 'Connection test returned false',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'Parallel',
      success: false,
      message: `Error: ${(error as Error).message}`,
      duration: Date.now() - start,
    }
  }
}

async function testExaAPI(): Promise<TestResult> {
  const start = Date.now()
  try {
    const success = await exa.testConnection()
    return {
      name: 'Exa',
      success,
      message: success ? 'Connected successfully' : 'Connection test returned false',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'Exa',
      success: false,
      message: `Error: ${(error as Error).message}`,
      duration: Date.now() - start,
    }
  }
}

async function testSumbleAPI(): Promise<TestResult> {
  const start = Date.now()
  try {
    const success = await sumble.testConnection()
    return {
      name: 'Sumble',
      success,
      message: success ? 'Connected successfully' : 'Connection test returned false',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'Sumble',
      success: false,
      message: `Error: ${(error as Error).message}`,
      duration: Date.now() - start,
    }
  }
}

async function testTheirStackAPI(): Promise<TestResult> {
  const start = Date.now()
  try {
    const success = await theirstack.testConnection()
    return {
      name: 'TheirStack',
      success,
      message: success ? 'Connected successfully' : 'Connection test returned false',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'TheirStack',
      success: false,
      message: `Error: ${(error as Error).message}`,
      duration: Date.now() - start,
    }
  }
}

async function testLeadmagicAPI(): Promise<TestResult> {
  const start = Date.now()
  try {
    const success = await leadmagic.testConnection()
    return {
      name: 'Leadmagic',
      success,
      message: success ? 'Connected successfully' : 'Connection test returned false',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'Leadmagic',
      success: false,
      message: `Error: ${(error as Error).message}`,
      duration: Date.now() - start,
    }
  }
}

async function testUnipileAPI(): Promise<TestResult> {
  const start = Date.now()
  try {
    const success = await unipile.testConnection()
    return {
      name: 'Unipile',
      success,
      message: success ? 'Connected successfully' : 'Connection test returned false',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'Unipile',
      success: false,
      message: `Error: ${(error as Error).message}`,
      duration: Date.now() - start,
    }
  }
}

// ===========================================
// MAIN
// ===========================================

async function main() {
  console.log('\n🔌 Testing API Connections...\n')
  console.log('=' .repeat(60))

  const tests = [
    testSupabase,
    testAnthropicAPI,
    testParallelAPI,
    testExaAPI,
    testSumbleAPI,
    testTheirStackAPI,
    testLeadmagicAPI,
    testUnipileAPI,
  ]

  const results: TestResult[] = []

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `)
    const result = await test()
    results.push(result)
    
    const icon = result.success ? '✅' : '❌'
    console.log(`${icon} ${result.message} (${result.duration}ms)`)
  }

  console.log('=' .repeat(60))
  console.log('\n📊 Summary:\n')

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(`  ✅ Passed: ${passed}`)
  console.log(`  ❌ Failed: ${failed}`)

  if (failed > 0) {
    console.log('\n⚠️  Failed APIs:')
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`    - ${r.name}: ${r.message}`))
    
    console.log('\n💡 Tips:')
    console.log('    1. Check your .env.local file has all API keys set')
    console.log('    2. Verify the API keys are valid and not expired')
    console.log('    3. Check if the API services are operational')
  }

  console.log('\n')
  
  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0)
}

// Run if called directly
main().catch(error => {
  console.error('Test runner error:', error)
  process.exit(1)
})

