/**
 * Analyze companies and show why they're a good fit.
 * 
 * Shows:
 * - What signals indicate fit (hiring, growth, AI leadership, etc.)
 * - What queries found them
 * - What data we have from Parallel/Exa
 * - Summary by signal type
 * 
 * Usage:
 *   npx ts-node scripts/analyze-company-fit-signals.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface CompanyFitAnalysis {
  company_id: string
  name: string
  domain: string
  vertical: string | null
  lead_source: string | null
  source_query: string | null
  signals: {
    // From Parallel FindAll
    parallel?: {
      match_status?: string
      output?: Record<string, any>
      basis?: Array<{
        field: string
        reasoning: string
        confidence?: string
        citations?: Array<{ title: string; url: string; excerpts?: string[] }>
      }>
      query_name?: string
      objective?: string
    }
    // From company classification
    company_type?: string
    company_type_confidence?: string
    finance_fit?: boolean
    // From contacts (if found)
    has_contacts?: boolean
    contact_count?: number
    // Custom signals
    hiring_signals?: string[]
    growth_signals?: string[]
    ai_leadership_signals?: string[]
  }
  fit_reasons: string[]
  fit_score: number
}

function extractFitReasons(company: any): { reasons: string[]; score: number } {
  const reasons: string[] = []
  let score = 0

  // Check Parallel FindAll signals
  const parallel = company.source_raw?.parallel_findall || company.source_raw?.parallel
  if (parallel) {
    const output = parallel.output || {}
    const basis = parallel.basis || []
    
    // Check match conditions from Parallel
    if (output.currently_hiring === true || output.currently_hiring_technical === true) {
      reasons.push('✅ Currently hiring (from Parallel)')
      score += 3
    }
    
    if (output.ai_data_leadership === true || output.ai_leadership === true) {
      reasons.push('✅ Has AI/data leadership (from Parallel)')
      score += 3
    }
    
    if (output.small_to_mid_size === true || output.mid_market_size === true) {
      reasons.push('✅ Small-to-mid sized firm (from Parallel)')
      score += 2
    }
    
    if (output.east_coast_location === true || output.us_location === true) {
      reasons.push('✅ Located in target geography (from Parallel)')
      score += 1
    }
    
    // Extract reasoning from basis
    basis.forEach((b: any) => {
      if (b.reasoning && b.confidence === 'high') {
        if (b.reasoning.toLowerCase().includes('hiring')) {
          reasons.push(`📋 ${b.field}: ${b.reasoning.substring(0, 100)}...`)
          score += 1
        }
        if (b.reasoning.toLowerCase().includes('ai') || b.reasoning.toLowerCase().includes('data')) {
          reasons.push(`🤖 ${b.field}: ${b.reasoning.substring(0, 100)}...`)
          score += 1
        }
      }
    })
  }

  // Check company type
  if (company.vertical) {
    const fitVerticals = ['hedge_fund', 'private_equity', 'asset_manager', 'investment_firm', 'credit_fund']
    if (fitVerticals.includes(company.vertical)) {
      reasons.push(`✅ ${company.vertical.replace('_', ' ')} (verified type)`)
      score += 2
    }
  }

  // Check signals from company classification
  const signals = company.signals || {}
  if (signals.finance_fit === true) {
    reasons.push('✅ Verified finance firm fit')
    score += 2
  }

  // Check if we have contacts (indicates we found decision-makers)
  if (company.contact_count > 0) {
    reasons.push(`✅ Has ${company.contact_count} contact(s) found`)
    score += 1
  }

  // Check lead source
  const leadSource = company.source_raw?.lead_source || company.source_tool
  if (leadSource === 'parallel_findall') {
    reasons.push('✅ Found via Parallel FindAll (AI-verified match)')
    score += 1
  }

  return { reasons, score }
}

async function main() {
  console.log('🔍 Analyzing Company Fit Signals\n')

  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('slug', 'finance')
    .maybeSingle()

  if (!offer) {
    throw new Error('Finance offer not found')
  }

  // Get all companies with their signals
  const { data: companies, error } = await supabase
    .from('companies')
    .select(`
      id,
      name,
      domain,
      vertical,
      source_tool,
      source_raw,
      signals,
      description,
      url
    `)
    .eq('offer_id', offer.id)

  if (error) {
    throw new Error(`Failed to fetch companies: ${error.message}`)
  }

  // Get contact counts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('company_id')
    .eq('offer_id', offer.id)

  const contactCounts = new Map<string, number>()
  contacts?.forEach(c => {
    if (c.company_id) {
      contactCounts.set(c.company_id, (contactCounts.get(c.company_id) || 0) + 1)
    }
  })

  // Analyze each company
  const analyses: CompanyFitAnalysis[] = companies.map(c => {
    const { reasons, score } = extractFitReasons(c)
    
    return {
      company_id: c.id,
      name: c.name,
      domain: c.domain,
      vertical: c.vertical,
      lead_source: c.source_raw?.lead_source || c.source_tool,
      source_query: c.source_raw?.parallel_findall?.query_name || c.source_raw?.parallel?.query_name,
      signals: {
        parallel: c.source_raw?.parallel_findall || c.source_raw?.parallel,
        company_type: c.signals?.company_type,
        company_type_confidence: c.signals?.company_type_confidence,
        finance_fit: c.signals?.finance_fit,
        has_contacts: contactCounts.has(c.id),
        contact_count: contactCounts.get(c.id) || 0,
      },
      fit_reasons: reasons,
      fit_score: score,
    }
  })

  // Sort by fit score
  analyses.sort((a, b) => b.fit_score - a.fit_score)

  // Summary statistics
  console.log('📊 Summary Statistics\n')
  console.log(`Total Companies: ${companies.length}`)
  console.log(`Companies with Parallel signals: ${analyses.filter(a => a.signals.parallel).length}`)
  console.log(`Companies with contacts: ${analyses.filter(a => a.signals.has_contacts).length}`)
  console.log(`Average fit score: ${(analyses.reduce((sum, a) => sum + a.fit_score, 0) / analyses.length).toFixed(2)}`)
  
  // Signal breakdown
  const signalCounts = {
    hiring: analyses.filter(a => a.fit_reasons.some(r => r.includes('hiring'))).length,
    ai_leadership: analyses.filter(a => a.fit_reasons.some(r => r.includes('AI') || r.includes('data'))).length,
    small_mid_size: analyses.filter(a => a.fit_reasons.some(r => r.includes('Small-to-mid'))).length,
    verified_type: analyses.filter(a => a.fit_reasons.some(r => r.includes('verified'))).length,
  }

  console.log(`\n🎯 Signal Breakdown:`)
  console.log(`   Hiring signals: ${signalCounts.hiring}`)
  console.log(`   AI/Data leadership: ${signalCounts.ai_leadership}`)
  console.log(`   Small-to-mid sized: ${signalCounts.small_mid_size}`)
  console.log(`   Verified finance type: ${signalCounts.verified_type}`)

  // Top 20 companies by fit score
  console.log(`\n🏆 Top 20 Companies by Fit Score\n`)
  analyses.slice(0, 20).forEach((analysis, idx) => {
    console.log(`${idx + 1}. ${analysis.name}`)
    console.log(`   Domain: ${analysis.domain || 'N/A'}`)
    console.log(`   Fit Score: ${analysis.fit_score}`)
    console.log(`   Vertical: ${analysis.vertical || 'unknown'}`)
    console.log(`   Source: ${analysis.lead_source || 'unknown'}`)
    if (analysis.source_query) {
      console.log(`   Query: ${analysis.source_query}`)
    }
    console.log(`   Contacts: ${analysis.signals.contact_count}`)
    console.log(`   Fit Reasons:`)
    analysis.fit_reasons.forEach(reason => {
      console.log(`     ${reason}`)
    })
    console.log('')
  })

  // Companies needing attention (low fit score but in database)
  const lowFit = analyses.filter(a => a.fit_score < 3 && !a.signals.has_contacts)
  if (lowFit.length > 0) {
    console.log(`\n⚠️  Companies with Low Fit Scores (${lowFit.length}):\n`)
    lowFit.slice(0, 10).forEach((analysis, idx) => {
      console.log(`${idx + 1}. ${analysis.name} (Score: ${analysis.fit_score})`)
      console.log(`   Reasons: ${analysis.fit_reasons.length > 0 ? analysis.fit_reasons.join(', ') : 'No clear signals'}`)
    })
    console.log(`\n💡 Consider reviewing these companies or enriching with more signals.`)
  }

  // Export to JSON for further analysis
  const outputFile = `company-fit-analysis-${Date.now()}.json`
  fs.writeFileSync(
    outputFile,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      total_companies: companies.length,
      summary: {
        average_fit_score: analyses.reduce((sum, a) => sum + a.fit_score, 0) / analyses.length,
        signal_counts: signalCounts,
      },
      companies: analyses,
    }, null, 2)
  )
  console.log(`\n💾 Full analysis saved to: ${outputFile}`)
}

main().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
