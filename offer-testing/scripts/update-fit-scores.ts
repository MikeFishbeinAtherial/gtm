/**
 * Update fit scores in Supabase based on signal analysis.
 * 
 * Usage:
 *   npx ts-node scripts/update-fit-scores.ts
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
      reasons.push('Currently hiring (from Parallel)')
      score += 3
    }
    
    if (output.ai_data_leadership === true || output.ai_leadership === true) {
      reasons.push('Has AI/data leadership (from Parallel)')
      score += 3
    }
    
    if (output.small_to_mid_size === true || output.mid_market_size === true) {
      reasons.push('Small-to-mid sized firm (from Parallel)')
      score += 2
    }
    
    if (output.east_coast_location === true || output.us_location === true) {
      reasons.push('Located in target geography (from Parallel)')
      score += 1
    }
    
    if (output.deal_sourcing_hiring === true) {
      reasons.push('Hiring deal sourcing roles (pain signal)')
      score += 2
    }
    
    if (output.technical_leadership === true) {
      reasons.push('Has technical leadership')
      score += 2
    }
    
    // Extract reasoning from basis
    basis.forEach((b: any) => {
      if (b.reasoning && b.confidence === 'high') {
        if (b.reasoning.toLowerCase().includes('hiring')) {
          score += 1
        }
        if (b.reasoning.toLowerCase().includes('ai') || b.reasoning.toLowerCase().includes('data')) {
          score += 1
        }
      }
    })
  }

  // Check company type
  if (company.vertical) {
    const fitVerticals = ['hedge_fund', 'private_equity', 'asset_manager', 'investment_firm', 'credit_fund']
    if (fitVerticals.includes(company.vertical)) {
      reasons.push(`${company.vertical.replace('_', ' ')} (verified type)`)
      score += 2
    }
  }

  // Check signals from company classification
  const signals = company.signals || {}
  if (signals.finance_fit === true) {
    reasons.push('Verified finance firm fit')
    score += 2
  }

  // Check if we have contacts (indicates we found decision-makers)
  if (company.contact_count > 0) {
    reasons.push(`Has ${company.contact_count} contact(s) found`)
    score += 1
  }

  // Check lead source
  const leadSource = company.source_raw?.lead_source || company.source_tool
  if (leadSource === 'parallel_findall') {
    reasons.push('Found via Parallel FindAll (AI-verified match)')
    score += 1
  }

  // Check Sumble signals
  if (company.source_raw?.matching_job_post_count) {
    const jobCount = parseInt(company.source_raw.matching_job_post_count) || 0
    if (jobCount > 0) {
      reasons.push(`${jobCount} job postings found (from Sumble)`)
      score += Math.min(2, Math.floor(jobCount / 5)) // Up to 2 points for job postings
    }
  }

  return { reasons, score }
}

async function main() {
  console.log('🔄 Updating Fit Scores in Supabase\n')

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
      description
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

  // Calculate fit scores
  const updates: Array<{ id: string; fit_score: number; fit_reasoning: string }> = []

  companies.forEach(c => {
    const { reasons, score } = extractFitReasons({
      ...c,
      contact_count: contactCounts.get(c.id) || 0,
    })
    
    updates.push({
      id: c.id,
      fit_score: Math.min(10, Math.max(0, score)), // Clamp to 0-10
      fit_reasoning: reasons.join('; '),
    })
  })

  // Update in batches
  console.log(`📊 Updating ${updates.length} companies...\n`)
  
  const batchSize = 50
  let updated = 0
  
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)
    
    for (const update of batch) {
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          fit_score: update.fit_score,
          fit_reasoning: update.fit_reasoning,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id)

      if (updateError) {
        console.error(`❌ Failed to update ${update.id}: ${updateError.message}`)
      } else {
        updated++
      }
    }
    
    console.log(`   Updated ${Math.min(i + batchSize, updates.length)}/${updates.length} companies...`)
  }

  console.log(`\n✅ Successfully updated ${updated} companies`)
  
  // Show summary
  const scoreDistribution = {
    '8-10': updates.filter(u => u.fit_score >= 8).length,
    '5-7': updates.filter(u => u.fit_score >= 5 && u.fit_score < 8).length,
    '3-4': updates.filter(u => u.fit_score >= 3 && u.fit_score < 5).length,
    '0-2': updates.filter(u => u.fit_score < 3).length,
  }

  console.log(`\n📊 Score Distribution:`)
  console.log(`   Excellent (8-10): ${scoreDistribution['8-10']}`)
  console.log(`   Good (5-7): ${scoreDistribution['5-7']}`)
  console.log(`   Moderate (3-4): ${scoreDistribution['3-4']}`)
  console.log(`   Low (0-2): ${scoreDistribution['0-2']}`)

  // Show top companies
  const topCompanies = updates
    .sort((a, b) => b.fit_score - a.fit_score)
    .slice(0, 10)
    .map(u => {
      const company = companies.find(c => c.id === u.id)
      return {
        name: company?.name,
        domain: company?.domain,
        score: u.fit_score,
        reasoning: u.fit_reasoning,
      }
    })

  console.log(`\n🏆 Top 10 Companies by Fit Score:\n`)
  topCompanies.forEach((c, idx) => {
    console.log(`${idx + 1}. ${c.name} (Score: ${c.score})`)
    console.log(`   Domain: ${c.domain}`)
    console.log(`   Reasons: ${c.reasoning}`)
    console.log('')
  })
}

main().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
