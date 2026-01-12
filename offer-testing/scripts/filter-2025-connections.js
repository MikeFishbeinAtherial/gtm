#!/usr/bin/env node

/**
 * Filter 2025 LinkedIn Connections
 * 
 * Finds connections you connected with in 2025 and filters out
 * anyone you've messaged in the past 30 days.
 * 
 * Also pulls full message history for context and enriches with Sumble.
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

  const response = await fetch(`${SUMBLE_BASE_URL}/jobs/find`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUMBLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      limit: params.limit || 10,
      offset: params.offset || 0,
      ...(params.organization && { organization: params.organization }),
      ...(params.filters && { filters: params.filters }),
      ...(params.query && { filters: { query: params.query } }),
    }),
  })

  if (response.status === 429) {
    throw new Error('Sumble API rate limit exceeded')
  }

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Sumble API error (${response.status}): ${error}`)
  }

  return response.json()
}

// Import sales job titles helper
// Note: We'll need to convert this to .js or use a different approach
// For now, define the functions inline
function isSalesJobTitle(title) {
  const titleLower = title.toLowerCase()
  const salesKeywords = [
    'sales', 'sdr', 'bdr', 'account executive', 'ae', 'account manager',
    'sales rep', 'sales representative', 'sales manager', 'sales director',
    'vp sales', 'head of sales', 'cro', 'revenue', 'inside sales',
    'outside sales', 'field sales', 'territory manager', 'sales engineer',
    'sales enablement', 'sales operations', 'revops'
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
    // Step 1: Get connections from 2025
    console.log('\n1️⃣  Finding connections from 2025...')
    
    const { data: connections2025, error: connError } = await supabase
      .from('linkedin_connections')
      .select('*')
      .gte('connected_at', '2025-01-01')
      .lt('connected_at', '2026-01-01')
      .eq('skip_outreach', false)
      .order('connected_at', { ascending: false })

    if (connError) {
      throw new Error(`Database error: ${connError.message}`)
    }

    console.log(`   ✅ Found ${connections2025.length} connections from 2025`)

    // Step 2: Filter out people messaged in last 7 days
    console.log('\n2️⃣  Filtering out people messaged in last 7 days...')
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoISO = sevenDaysAgo.toISOString()

    // Get all outreach messages sent in last 7 days from networking_outreach table
    // This is more reliable than linkedin_messages which may be empty
    const { data: recentOutreach, error: outreachError } = await supabase
      .from('networking_outreach')
      .select('connection_id, sent_at')
      .eq('status', 'sent')
      .not('sent_at', 'is', null)
      .gte('sent_at', sevenDaysAgoISO)

    if (outreachError) {
      throw new Error(`Database error: ${outreachError.message}`)
    }

    // Also check linkedin_messages as a fallback (in case some messages were sent outside campaigns)
    const { data: recentMessages, error: msgError } = await supabase
      .from('linkedin_messages')
      .select('connection_id, sent_at')
      .eq('is_from_me', true)
      .gte('sent_at', sevenDaysAgoISO)

    if (msgError) {
      console.warn(`   ⚠️  Warning: Could not check linkedin_messages: ${msgError.message}`)
    }

    // Combine both sources - get unique connection IDs that were messaged recently
    const recentlyMessagedIds = new Set([
      ...(recentOutreach?.map(outreach => outreach.connection_id).filter(Boolean) || []),
      ...(recentMessages?.map(msg => msg.connection_id).filter(Boolean) || [])
    ])

    // Filter out recently messaged connections
    const eligibleConnections = connections2025.filter(
      conn => !recentlyMessagedIds.has(conn.id)
    )

    console.log(`   ✅ ${connections2025.length - eligibleConnections.length} excluded (messaged in last 7 days)`)
    console.log(`   ✅ ${eligibleConnections.length} eligible for outreach`)

    // Step 3: Pull full message history for context
    console.log('\n3️⃣  Pulling message history for context...')
    
    let connectionsWithHistory = []
    let historyCount = 0

    for (const conn of eligibleConnections) {
      // Get all messages with this connection
      const { data: messages, error: historyError } = await supabase
        .from('linkedin_messages')
        .select('*')
        .eq('connection_id', conn.id)
        .order('sent_at', { ascending: true })

      if (!historyError && messages) {
        connectionsWithHistory.push({
          ...conn,
          message_history: messages,
          message_count: messages.length,
          last_message_at: messages.length > 0 
            ? messages[messages.length - 1].sent_at 
            : null
        })
        historyCount += messages.length
      } else {
        connectionsWithHistory.push({
          ...conn,
          message_history: [],
          message_count: 0,
          last_message_at: null
        })
      }
    }

    console.log(`   ✅ Loaded ${historyCount} total messages across ${connectionsWithHistory.length} connections`)

    // Step 4: Get company domains for Sumble enrichment
    console.log('\n4️⃣  Extracting company domains for Sumble enrichment...')
    
    const companyDomains = new Set()
    connectionsWithHistory.forEach(conn => {
      if (conn.current_company) {
        // Try to extract domain from company name (basic - you may need to enhance)
        // For now, we'll use Sumble's organization search by name
        companyDomains.add(conn.current_company)
      }
    })

    console.log(`   ✅ Found ${companyDomains.size} unique companies`)

    // Step 5: Enrich with Sumble (check for hiring salespeople)
    console.log('\n5️⃣  Checking Sumble for hiring signals (sales roles)...')
    console.log('   ⚠️  This may take a few minutes and use API credits\n')

    const connectionsWithSumble = []
    let sumbleChecked = 0
    let sumbleHiring = 0

    for (const conn of connectionsWithHistory) {
      if (!conn.current_company) {
        connectionsWithSumble.push({
          ...conn,
          sumble_data: null,
          is_hiring_sales: false
        })
        continue
      }

      try {
        // Check if company is hiring for sales roles
        // Sumble's findJobs API searches by technologies, but we can also search by job function
        // For sales roles, we'll search for common sales-related terms
        
        let jobs = { jobs: [], total: 0 }
        let orgJobs = { jobs: [], total: 0 }
        
        if (!SUMBLE_API_KEY) {
          console.warn(`   ⚠️  Skipping Sumble check for ${conn.current_company} - API key not set`)
          connectionsWithSumble.push({
            ...conn,
            sumble_data: null,
            is_hiring_sales: false
          })
          continue
        }

        try {
          // Try organization-specific search first (more accurate)
          if (conn.current_company) {
            try {
              orgJobs = await sumbleFindJobs({
                organization: { name: conn.current_company },
                filters: {
                  since: '2024-12-01' // Last 2 months
                },
                limit: 20
              })
            } catch (err) {
              // Organization search might fail if company name doesn't match exactly
              // Fall back to query search
            }
          }

          // Also try query-based search as fallback
          if (orgJobs.jobs.length === 0) {
            try {
              jobs = await sumbleFindJobs({
                query: `sales OR SDR OR BDR OR account executive OR sales manager ${conn.current_company}`,
                limit: 10
              })
            } catch (err) {
              // Query search failed too
            }
          }
        } catch (error) {
          console.error(`   ⚠️  Sumble API error for ${conn.current_company}: ${error.message}`)
          connectionsWithSumble.push({
            ...conn,
            sumble_data: null,
            is_hiring_sales: false
          })
          continue
        }

        const allJobs = [...(jobs.jobs || []), ...(orgJobs.jobs || [])]
        // Use the sales job titles helper for better matching
        const salesJobs = allJobs.filter(job => {
          const title = job.job_title || ''
          const desc = job.description || ''
          
          // Check if title matches sales roles
          if (isSalesJobTitle(title)) {
            return true
          }
          
          // Check if description mentions sales
          if (isSalesJobDescription(desc)) {
            return true
          }
          
          // Check primary job function
          if (job.primary_job_function === 'Sales') {
            return true
          }
          
          return false
        })

        const isHiringSales = salesJobs.length > 0
        
        // Categorize sales jobs
        const categorizedJobs = salesJobs.map(job => ({
          title: job.job_title,
          category: categorizeSalesJob(job.job_title || '').category,
          posted_date: job.datetime_pulled,
          url: job.url,
          location: job.location
        }))

        // Save to database
        const sumbleData = {
          is_hiring_sales: isHiringSales,
          total_jobs: allJobs.length,
          sales_jobs_count: salesJobs.length,
          sales_job_titles: salesJobs.map(j => j.job_title),
          sales_jobs_categorized: categorizedJobs,
          latest_sales_job_date: salesJobs.length > 0 
            ? salesJobs.sort((a, b) => new Date(b.datetime_pulled) - new Date(a.datetime_pulled))[0].datetime_pulled
            : null,
          checked_at: new Date().toISOString()
        }

        // Update the connection record with Sumble data
        await supabase
          .from('linkedin_connections')
          .update({
            sumble_insights: sumbleData,
            is_hiring_sales: isHiringSales,
            updated_at: new Date().toISOString()
          })
          .eq('id', conn.id)

        connectionsWithSumble.push({
          ...conn,
          sumble_data: sumbleData,
          is_hiring_sales: isHiringSales
        })

        sumbleChecked++
        if (isHiringSales) {
          sumbleHiring++
        }

        // Rate limit: Sumble allows 10 req/sec, so we'll be conservative
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        console.error(`   ⚠️  Error checking ${conn.current_company}: ${error.message}`)
        connectionsWithSumble.push({
          ...conn,
          sumble_data: null,
          is_hiring_sales: false
        })
      }
    }

    console.log(`\n   ✅ Checked ${sumbleChecked} companies`)
    console.log(`   ✅ Found ${sumbleHiring} companies hiring sales roles`)

    // Step 6: Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total 2025 Connections: ${connections2025.length}`)
    console.log(`Excluded (messaged in 7 days): ${connections2025.length - eligibleConnections.length}`)
    console.log(`Eligible for Outreach: ${connectionsWithSumble.length}`)
    console.log(`Companies Hiring Sales: ${sumbleHiring}`)
    console.log(`Connections with Message History: ${connectionsWithHistory.filter(c => c.message_count > 0).length}`)
    console.log('='.repeat(60))

    // Step 7: Show top candidates
    console.log('\n🎯 TOP CANDIDATES (Hiring Sales + Has Message History)')
    console.log('='.repeat(60))
    
    const topCandidates = connectionsWithSumble
      .filter(c => c.is_hiring_sales && c.message_count > 0)
      .sort((a, b) => {
        // Sort by: hiring sales (priority), then by last message date (older = better for reconnecting)
        if (a.is_hiring_sales !== b.is_hiring_sales) {
          return b.is_hiring_sales - a.is_hiring_sales
        }
        if (!a.last_message_at && !b.last_message_at) return 0
        if (!a.last_message_at) return -1
        if (!b.last_message_at) return 1
        return new Date(a.last_message_at) - new Date(b.last_message_at)
      })
      .slice(0, 10)

    topCandidates.forEach((conn, idx) => {
      console.log(`\n${idx + 1}. ${conn.full_name || 'Unknown'}`)
      console.log(`   Company: ${conn.current_company || 'N/A'}`)
      console.log(`   Title: ${conn.current_title || 'N/A'}`)
      console.log(`   Hiring Sales: ✅ (${conn.sumble_data?.sales_jobs || 0} roles)`)
      console.log(`   Message History: ${conn.message_count} messages`)
      if (conn.last_message_at) {
        const daysAgo = Math.floor((new Date() - new Date(conn.last_message_at)) / (1000 * 60 * 60 * 24))
        console.log(`   Last Message: ${daysAgo} days ago`)
      }
      if (conn.sumble_data?.sales_job_titles?.length > 0) {
        console.log(`   Roles: ${conn.sumble_data.sales_job_titles.slice(0, 3).join(', ')}`)
      }
    })

    // Step 8: Save results (optional - create a view or temp table)
    console.log('\n💾 Results are ready!')
    console.log('\n📋 Campaign Details:')
    console.log('   Campaign Name: Atherial AI Roleplay Training - 2025 Q1')
    console.log('   Campaign Slug: atherial-ai-roleplay-2025-q1')
    console.log('   Offer: Atherial (Custom AI agents for GTM teams)')
    console.log('   Use Case: AI roleplay training for sales teams')
    console.log('\n💡 Next steps:')
    console.log('   1. Review the connections above')
    console.log('   2. Create networking campaign batch with slug: atherial-ai-roleplay-2025-q1')
    console.log('   3. Add email template with variables: {{firstname}}, {{company}}, {{role}}, {{hiring_signal}}')
    console.log('   4. Use generate-networking-messages.js to create personalized messages')
    console.log('   5. Review and approve messages before sending')

    // Return data for potential use in other scripts
    return {
      total: connections2025.length,
      eligible: connectionsWithSumble.length,
      hiring_sales: sumbleHiring,
      connections: connectionsWithSumble
    }

  } catch (error) {
    console.error('\n❌ Error:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    process.exit(1)
  }
}

main()
