/**
 * Filter 2025 LinkedIn Connections
 * 
 * Finds connections you connected with in 2025 and filters out
 * anyone you've messaged in the past 7 days.
 * 
 * Enriches with Sumble to find companies hiring salespeople.
 * 
 * Usage:
 *   node scripts/filter-2025-connections.js
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SECRET_KEY 
  || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

// Import clients
const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Import Sumble client - create instance directly since we can't import .ts files
// We'll use the Sumble API directly via fetch
const SUMBLE_API_KEY = process.env.SUMBLE_API_KEY
const SUMBLE_BASE_URL = 'https://api.sumble.com/v3'

if (!SUMBLE_API_KEY) {
  console.warn('⚠️  SUMBLE_API_KEY not set - Sumble enrichment will be skipped')
}

// Sumble API helper function
async function sumbleFindJobs(params) {
  if (!SUMBLE_API_KEY) {
    throw new Error('SUMBLE_API_KEY not set')
  }

  const requestBody = {
    limit: params.limit || 2,
    offset: params.offset || 0,
  }

  if (params.organization && params.organization.domain) {
    requestBody.organization = params.organization
  }

  if (params.filters) {
    requestBody.filters = params.filters
  } else if (params.query) {
    requestBody.filters = { query: params.query }
  } else {
    throw new Error('Either query or filters must be provided')
  }

  const response = await fetch(`${SUMBLE_BASE_URL}/jobs/find`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUMBLE_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': '*/*',
    },
    body: JSON.stringify(requestBody),
  })

  if (response.status === 429) {
    throw new Error('Sumble API rate limit exceeded (10 req/sec)')
  }

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Sumble API error (${response.status}): ${errorText}`
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.detail) {
        errorMessage = `Sumble API error: ${errorJson.detail}`
      }
    } catch {
      // Not JSON, use text as-is
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

// Sales job detection helpers
function isSalesJobTitle(title) {
  const titleLower = title.toLowerCase()
  const salesKeywords = [
    'sales', 'sdr', 'bdr', 'account executive', 'ae', 'account manager',
    'sales rep', 'sales representative', 'sales manager', 'sales director',
    'vp sales', 'head of sales', 'cro', 'revenue', 'inside sales',
    'outside sales', 'field sales', 'territory manager', 'sales engineer',
    'sales enablement', 'sales operations', 'revops', 'business development'
  ]
  return salesKeywords.some(keyword => titleLower.includes(keyword))
}

function isSalesJobDescription(description) {
  const descLower = description.toLowerCase()
  const salesKeywords = [
    'sales', 'revenue', 'quota', 'prospect', 'lead generation',
    'cold calling', 'account management', 'customer acquisition',
    'closing deals', 'sales cycle', 'pipeline'
  ]
  return salesKeywords.some(keyword => descLower.includes(keyword))
}

function categorizeSalesJob(title) {
  const titleLower = title.toLowerCase()
  if (titleLower.includes('sdr') || titleLower.includes('bdr') || titleLower.includes('sales development')) {
    return { category: 'entry', isSales: true }
  }
  if (titleLower.includes('account executive') || titleLower.includes('ae') || titleLower.includes('account manager')) {
    return { category: 'accountExecutive', isSales: true }
  }
  if (titleLower.includes('manager') || titleLower.includes('director') || titleLower.includes('vp') || titleLower.includes('head of')) {
    return { category: 'management', isSales: true }
  }
  if (isSalesJobTitle(title)) {
    return { category: 'unknown', isSales: true }
  }
  return { category: 'unknown', isSales: false }
}

async function main() {
  console.log('🔍 Filtering 2025 LinkedIn Connections\n')
  console.log('='.repeat(60))

  try {
    // Step 1: Get connections from 2025-2026
    console.log('\n1️⃣  Finding recent connections...')
    
    const { data: connections2025, error: connError } = await supabase
      .from('linkedin_connections')
      .select('*')
      .gte('connected_at', '2025-01-01')
      .lt('connected_at', '2027-01-01')
      .eq('skip_outreach', false)
      .order('connected_at', { ascending: false })

    if (connError) {
      throw new Error(`Database error: ${connError.message}`)
    }

    console.log(`   ✅ Found ${connections2025.length} connections from 2025-2026`)

    // Step 2: Filter out recently messaged
    console.log('\n2️⃣  Filtering out people messaged in last 7 days...')
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentOutreach } = await supabase
      .from('networking_outreach')
      .select('connection_id')
      .gte('sent_at', sevenDaysAgo.toISOString())

    const { data: recentMessages } = await supabase
      .from('linkedin_messages')
      .select('connection_id')
      .gte('sent_at', sevenDaysAgo.toISOString())

    const recentlyMessagedIds = new Set([
      ...(recentOutreach?.map(outreach => outreach.connection_id).filter(Boolean) || []),
      ...(recentMessages?.map(msg => msg.connection_id).filter(Boolean) || [])
    ])

    const eligibleConnections = connections2025.filter(
      conn => !recentlyMessagedIds.has(conn.id)
    )

    console.log(`   ✅ ${connections2025.length - eligibleConnections.length} excluded (messaged in last 7 days)`)
    console.log(`   ✅ ${eligibleConnections.length} eligible for outreach`)

    // Step 3: Enrich with Sumble
    console.log('\n3️⃣  Checking Sumble for hiring signals (sales roles)...')
    console.log('   ⚠️  This may take a few minutes and use API credits')
    console.log('   💡 Strategy: Search each company specifically for accuracy')
    console.log('   📅 Date filter: Since December 15, 2025')
    console.log('   🌎 Country filter: US only')
    console.log('   💰 Cost: ~6 credits per company (limit 2 jobs = 6 credits max per company)\n')

    const companiesMap = new Map()
    eligibleConnections.forEach(conn => {
      if (conn.current_company) {
        const companyKey = conn.current_company.toLowerCase().trim()
        if (!companiesMap.has(companyKey)) {
          companiesMap.set(companyKey, {
            company: conn.current_company,
            connections: []
          })
        }
        companiesMap.get(companyKey).connections.push(conn)
      }
    })

    console.log(`   📊 Found ${companiesMap.size} unique companies to check\n`)

    const connectionsWithSumble = []
    let sumbleChecked = 0
    let sumbleHiring = 0
    let totalCreditsUsed = 0

    for (const [companyKey, companyData] of companiesMap) {
      const conn = companyData.connections[0]
      
      if (!conn.current_company || !SUMBLE_API_KEY) {
        for (const companyConn of companyData.connections) {
          connectionsWithSumble.push({
            ...companyConn,
            sumble_data: null,
            is_hiring_sales: false
          })
        }
        continue
      }

      try {
        console.log(`   🔍 Checking ${companyData.company}...`)
        
        const jobs = await sumbleFindJobs({
          filters: {
            query: `organization_name EQ '${companyData.company}' AND job_function IN ('Sales', 'Business Development')`,
            countries: ['US'],
            since: '2025-12-15'
          },
          limit: 2
        })
        
        const allJobs = jobs.jobs || []
        const salesJobs = allJobs.filter(job => {
          const title = job.job_title || ''
          const desc = job.description || ''
          return isSalesJobTitle(title) || isSalesJobDescription(desc) || job.primary_job_function === 'Sales'
        })

        const isHiringSales = salesJobs.length > 0
        
        if (isHiringSales) {
          console.log(`      ✅ Found ${salesJobs.length} sales job(s) at ${companyData.company}`)
        }
        
        console.log(`      💰 Credits used: ${jobs.credits_used || 0}, remaining: ${jobs.credits_remaining || 0}`)
        totalCreditsUsed += (jobs.credits_used || 0)
        
        const categorizedJobs = salesJobs.map(job => ({
          title: job.job_title,
          category: categorizeSalesJob(job.job_title || '').category,
          posted_date: job.datetime_pulled,
          url: job.url,
          location: job.location
        }))

        const sumbleData = {
          is_hiring_sales: isHiringSales,
          total_jobs: allJobs.length,
          sales_jobs_count: salesJobs.length,
          sales_job_titles: salesJobs.map(j => j.job_title),
          sales_jobs_categorized: categorizedJobs,
          latest_sales_job_date: salesJobs.length > 0 
            ? salesJobs.sort((a, b) => new Date(b.datetime_pulled) - new Date(a.datetime_pulled))[0].datetime_pulled
            : null,
          checked_at: new Date().toISOString(),
          credits_used: jobs.credits_used || 0,
          credits_remaining: jobs.credits_remaining || 0
        }

        for (const companyConn of companyData.connections) {
          await supabase
            .from('linkedin_connections')
            .update({
              sumble_insights: sumbleData,
              is_hiring_sales: isHiringSales,
              sumble_checked_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', companyConn.id)

          connectionsWithSumble.push({
            ...companyConn,
            sumble_data: sumbleData,
            is_hiring_sales: isHiringSales
          })
        }

        sumbleChecked++
        if (isHiringSales) {
          sumbleHiring++
        }

        await new Promise(resolve => setTimeout(resolve, 150))

      } catch (error) {
        console.error(`   ❌ Error checking ${companyData.company}: ${error.message}`)
        for (const companyConn of companyData.connections) {
          connectionsWithSumble.push({
            ...companyConn,
            sumble_data: null,
            is_hiring_sales: false
          })
        }
      }
    }

    console.log(`\n   ✅ Processed ${sumbleChecked} unique companies`)
    console.log(`   ✅ Found ${sumbleHiring} companies hiring sales roles`)
    console.log(`   💰 Total credits used: ${totalCreditsUsed}`)

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total 2025-2026 Connections: ${connections2025.length}`)
    console.log(`Excluded (messaged in 7 days): ${connections2025.length - eligibleConnections.length}`)
    console.log(`Eligible for Outreach: ${connectionsWithSumble.length}`)
    console.log(`Companies Hiring Sales: ${sumbleHiring}`)
    console.log(`Sumble API Key Set: ${SUMBLE_API_KEY ? '✅ Yes' : '❌ No'}`)
    if (SUMBLE_API_KEY) {
      console.log(`Sumble Companies Checked: ${sumbleChecked}`)
      console.log(`Sumble Credits Used: ${totalCreditsUsed}`)
    }
    console.log('='.repeat(60))

    // Top candidates
    console.log('\n🎯 TOP CANDIDATES (Hiring Sales)')
    console.log('='.repeat(60))
    
    const topCandidates = connectionsWithSumble
      .filter(c => c.is_hiring_sales)
      .sort((a, b) => (a.current_company || '').localeCompare(b.current_company || ''))
      .slice(0, 20)

    topCandidates.forEach((conn, idx) => {
      console.log(`\n${idx + 1}. ${conn.full_name} @ ${conn.current_company}`)
      console.log(`   📧 ${conn.email || 'No email'}`)
      console.log(`   💼 ${conn.current_position || 'No position'}`)
      if (conn.is_hiring_sales && conn.sumble_data) {
        const titles = conn.sumble_data.sales_job_titles || []
        const jobs = conn.sumble_data.sales_jobs_categorized || []
        console.log(`   🎯 Hiring Sales: ${titles.join(', ')}`)
        jobs.forEach(job => {
          console.log(`      - ${job.title} (${job.location})`)
        })
      }
    })

    console.log('\n💾 Results are ready!')
    console.log('\n📋 Campaign Details:')
    console.log('   Campaign Name: Atherial AI Roleplay Training - 2025 Q1')
    console.log('   Campaign Slug: atherial-ai-roleplay-2025-q1')
    console.log('   Offer: Atherial (Custom AI agents for GTM teams)')
    console.log('   Use Case: AI roleplay training for sales teams')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
