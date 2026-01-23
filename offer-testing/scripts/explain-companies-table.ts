/**
 * Explain companies table structure and relationships
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'

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

async function main() {
  console.log('\n📊 Companies Table Structure & Relationships\n')

  // Get total count
  const { count: totalCompanies } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })

  console.log(`Total companies in table: ${totalCompanies}\n`)

  // Get finance offer
  const { data: offer } = await supabase
    .from('offers')
    .select('id, name, slug')
    .eq('slug', 'finance')
    .single()

  if (!offer) {
    console.error('❌ Finance offer not found')
    return
  }

  console.log(`Finance Offer:`)
  console.log(`   ID: ${offer.id}`)
  console.log(`   Name: ${offer.name}`)
  console.log(`   Slug: ${offer.slug}\n`)

  // Count finance companies
  const { count: financeCompanies } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', offer.id)

  console.log(`Finance companies (offer_id = ${offer.id}): ${financeCompanies}\n`)

  // Show breakdown by source_tool
  const { data: bySource } = await supabase
    .from('companies')
    .select('source_tool')
    .eq('offer_id', offer.id)

  const sourceCounts = (bySource || []).reduce((acc, c) => {
    const source = c.source_tool || 'unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('📊 Finance Companies by Source:')
  Object.entries(sourceCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([source, count]) => {
      console.log(`   ${source}: ${count}`)
    })

  // Show breakdown by vertical
  const { data: byVertical } = await supabase
    .from('companies')
    .select('vertical')
    .eq('offer_id', offer.id)

  const verticalCounts = (byVertical || []).reduce((acc, c) => {
    const vertical = c.vertical || 'unknown'
    acc[vertical] = (acc[vertical] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('\n📊 Finance Companies by Vertical:')
  Object.entries(verticalCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([vertical, count]) => {
      console.log(`   ${vertical}: ${count}`)
    })

  // Show breakdown by industry
  const { data: byIndustry } = await supabase
    .from('companies')
    .select('industry')
    .eq('offer_id', offer.id)

  const industryCounts = (byIndustry || []).reduce((acc, c) => {
    const industry = c.industry || 'null'
    acc[industry] = (acc[industry] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('\n📊 Finance Companies by Industry:')
  const industryEntries = Object.entries(industryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
  
  industryEntries.forEach(([industry, count]) => {
    console.log(`   ${industry}: ${count}`)
  })
  if (Object.keys(industryCounts).length > 10) {
    console.log(`   ... and ${Object.keys(industryCounts).length - 10} more`)
  }

  // Show how messages link to companies
  console.log('\n\n🔗 How Messages Link to Companies:\n')

  // Get a sample message with its relationships
  const { data: sampleMessage } = await supabase
    .from('messages')
    .select(`
      id,
      subject,
      contact:contacts!inner(
        id,
        first_name,
        company_id,
        companies!inner(
          id,
          name,
          offer_id,
          vertical,
          industry
        )
      ),
      campaign_contact:campaign_contacts!inner(
        campaign_id,
        campaigns!inner(
          id,
          name,
          offer_id
        )
      )
    `)
    .eq('status', 'pending')
    .limit(1)
    .single()

  if (sampleMessage) {
    const contact = (sampleMessage as any).contact
    const company = contact?.companies
    const campaign = (sampleMessage as any).campaign_contact?.campaigns

    console.log('Example Message Relationship:')
    console.log(`   Message ID: ${sampleMessage.id}`)
    console.log(`   Subject: "${sampleMessage.subject}"`)
    console.log(`   ↓`)
    console.log(`   Contact: ${contact?.first_name} (ID: ${contact?.id})`)
    console.log(`   ↓`)
    console.log(`   Company: ${company?.name} (ID: ${company?.id})`)
    console.log(`   Company offer_id: ${company?.offer_id}`)
    console.log(`   Company vertical: ${company?.vertical || 'null'}`)
    console.log(`   Company industry: ${company?.industry || 'null'}`)
    console.log(`   ↓`)
    console.log(`   Campaign: ${campaign?.name} (ID: ${campaign?.id})`)
    console.log(`   Campaign offer_id: ${campaign?.offer_id}`)
  }

  // Show where vertical/industry data comes from
  console.log('\n\n📝 Where Vertical/Industry Data Comes From:\n')

  const { data: sampleCompanies } = await supabase
    .from('companies')
    .select('name, vertical, industry, source_tool, source_raw')
    .eq('offer_id', offer.id)
    .in('source_tool', ['exa', 'parallel', 'csv'])
    .limit(5)

  sampleCompanies?.forEach(c => {
    console.log(`\n${c.name} (source: ${c.source_tool}):`)
    console.log(`   Vertical: ${c.vertical || 'null'} (set by script logic)`)
    console.log(`   Industry: ${c.industry || 'null'} (from API or script)`)
    if (c.source_raw) {
      const raw = typeof c.source_raw === 'string' ? JSON.parse(c.source_raw) : c.source_raw
      console.log(`   Raw data keys: ${Object.keys(raw).join(', ')}`)
    }
  })

  console.log('\n\n💡 Summary:')
  console.log('   1. Companies table stores ALL companies from ALL offers')
  console.log('   2. Filter by offer_id to see only finance companies')
  console.log('   3. Messages → contacts → companies → offer_id')
  console.log('   4. Vertical: Set by script logic (determineVertical function)')
  console.log('   5. Industry: From API responses or manual classification')
}

main().catch(console.error)
