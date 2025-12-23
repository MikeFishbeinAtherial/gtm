/**
 * Company Finder
 * 
 * Orchestrate company search across multiple data APIs.
 * Uses Parallel, Exa, Sumble, and TheirStack to find companies matching an ICP.
 */

import { parallel } from '@/lib/clients/parallel'
import { exa } from '@/lib/clients/exa'
import { sumble } from '@/lib/clients/sumble'
import { theirstack } from '@/lib/clients/theirstack'
import { createCompanies, getOffer } from '@/lib/clients/supabase'
import type { Company, CreateCompanyInput, ICP, CompanySignals } from '@/lib/types'

// ===========================================
// TYPES
// ===========================================

export interface FindCompaniesInput {
  offer_id: string
  limit?: number
  sources?: ('parallel' | 'exa' | 'sumble' | 'theirstack')[]
}

export interface FindCompaniesResult {
  companies: Company[]
  total_found: number
  by_source: Record<string, number>
  query_used: string
}

// ===========================================
// MAIN FUNCTION
// ===========================================

/**
 * Find companies matching an offer's ICP.
 * 
 * @param input - Search parameters
 * @returns Found companies
 */
export async function findCompanies(input: FindCompaniesInput): Promise<FindCompaniesResult> {
  const { offer_id, limit = 30, sources = ['parallel'] } = input

  // Get offer and ICP
  const offer = await getOffer(offer_id)
  if (!offer) {
    throw new Error(`Offer not found: ${offer_id}`)
  }
  if (!offer.icp) {
    throw new Error('ICP is required to find companies. Run /offer-icp first.')
  }

  const icp = offer.icp as ICP
  const companyInputs: CreateCompanyInput[] = []
  const bySource: Record<string, number> = {}
  let queryUsed = ''

  // Search each enabled source
  for (const source of sources) {
    try {
      const results = await searchSource(source, icp, offer_id, Math.ceil(limit / sources.length))
      companyInputs.push(...results.companies)
      bySource[source] = results.companies.length
      if (!queryUsed) queryUsed = results.query
    } catch (error) {
      console.error(`Error searching ${source}:`, error)
      bySource[source] = 0
    }
  }

  // Deduplicate by domain
  const uniqueCompanies = deduplicateByDomain(companyInputs)

  // Score companies against ICP
  const scoredCompanies = uniqueCompanies.map(c => ({
    ...c,
    fit_score: scoreCompany(c, icp),
  }))

  // Sort by fit score and limit
  scoredCompanies.sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0))
  const finalCompanies = scoredCompanies.slice(0, limit)

  // Save to database
  const saved = await createCompanies(finalCompanies)

  return {
    companies: saved,
    total_found: companyInputs.length,
    by_source: bySource,
    query_used: queryUsed,
  }
}

// ===========================================
// SOURCE SEARCHERS
// ===========================================

interface SourceSearchResult {
  companies: CreateCompanyInput[]
  query: string
}

async function searchSource(
  source: string,
  icp: ICP,
  offerId: string,
  limit: number
): Promise<SourceSearchResult> {
  switch (source) {
    case 'parallel':
      return searchParallel(icp, offerId, limit)
    case 'exa':
      return searchExa(icp, offerId, limit)
    case 'sumble':
      return searchSumble(icp, offerId, limit)
    case 'theirstack':
      return searchTheirStack(icp, offerId, limit)
    default:
      throw new Error(`Unknown source: ${source}`)
  }
}

async function searchParallel(
  icp: ICP,
  offerId: string,
  limit: number
): Promise<SourceSearchResult> {
  const query = buildParallelQuery(icp)
  
  // Use findAll API to search for companies
  const findallRun = await parallel.findAll(
    'company',
    query.query,
    [
      {
        name: 'size',
        description: `Company size between ${(query.filters.employee_count as any)?.min || 10} and ${(query.filters.employee_count as any)?.max || 500} employees`
      },
      {
        name: 'location',
        description: `Located in ${(query.filters as any).location || 'any location'}`
      }
    ],
    limit,
    'core'
  )

  // Note: This creates an async job. In production, we'd need to poll for results
  // For now, return empty results since we can't wait for completion
  console.warn('Parallel findAll creates async job - results not immediately available')

  const companies: CreateCompanyInput[] = []

  return { companies, query: query.query }
}

async function searchExa(
  icp: ICP,
  offerId: string,
  limit: number
): Promise<SourceSearchResult> {
  const query = icp.search_queries?.exa || buildExaQuery(icp)
  
  const response = await exa.searchCompanies(query, limit)

  const companies: CreateCompanyInput[] = response.results.map(r => ({
    offer_id: offerId,
    name: extractCompanyName(r.title, r.url),
    url: r.url,
    domain: extractDomain(r.url),
    description: undefined, // Exa results don't include text content
    source_tool: 'exa',
    source_query: query,
    raw_data: { title: r.title, url: r.url, score: r.score },
  }))

  return { companies, query }
}

async function searchSumble(
  icp: ICP,
  offerId: string,
  limit: number
): Promise<SourceSearchResult> {
  const query = buildSumbleQuery(icp)
  
  // TODO: Implement Sumble search - API method not available
  console.warn('Sumble search not implemented - returning empty results')

  const companies: CreateCompanyInput[] = []

  return { companies, query }
}

async function searchTheirStack(
  icp: ICP,
  offerId: string,
  limit: number
): Promise<SourceSearchResult> {
  const jobTitles = icp.search_queries?.theirstack?.job_titles || 
    icp.buyer_profile?.titles?.primary || 
    ['SDR', 'Sales Manager']
  
  // TODO: Implement TheirStack search - API parameters incorrect
  console.warn('TheirStack search not implemented - returning empty results')

  const companies: CreateCompanyInput[] = []

  return { companies, query: jobTitles.join(', ') }
}

// ===========================================
// QUERY BUILDERS
// ===========================================

function buildParallelQuery(icp: ICP): { query: string; filters: Record<string, unknown> } {
  const verticals = icp.company_profile?.verticals?.primary || []
  const firmographics = icp.company_profile?.firmographics
  
  const query = verticals.length > 0
    ? `Companies in ${verticals.join(' or ')} industry`
    : 'B2B SaaS companies'

  return {
    query,
    filters: {
      employee_count: {
        min: firmographics?.size_min || 10,
        max: firmographics?.size_max || 500,
      },
      location: firmographics?.geography,
    },
  }
}

function buildExaQuery(icp: ICP): string {
  const verticals = icp.company_profile?.verticals?.primary || []
  const stage = icp.company_profile?.firmographics?.stage || 'growth'
  
  return `${stage} stage ${verticals.join(' ')} companies that might need sales tools`
}

function buildSumbleQuery(icp: ICP): string {
  const verticals = icp.company_profile?.verticals?.primary || []
  return verticals.join(' OR ') || 'B2B software'
}

// ===========================================
// HELPERS
// ===========================================

function deduplicateByDomain(companies: CreateCompanyInput[]): CreateCompanyInput[] {
  const seen = new Set<string>()
  return companies.filter(c => {
    const domain = c.domain?.toLowerCase()
    if (!domain || seen.has(domain)) return false
    seen.add(domain)
    return true
  })
}

function scoreCompany(company: CreateCompanyInput, icp: ICP): number {
  let score = 5 // Base score

  // Size match
  const sizeMin = icp.company_profile?.firmographics?.size_min || 0
  const sizeMax = icp.company_profile?.firmographics?.size_max || Infinity
  if (company.size_exact) {
    if (company.size_exact >= sizeMin && company.size_exact <= sizeMax) {
      score += 2
    } else {
      score -= 1
    }
  }

  // Vertical match
  const primaryVerticals = icp.company_profile?.verticals?.primary || []
  if (company.vertical && primaryVerticals.some(v => 
    company.vertical?.toLowerCase().includes(v.toLowerCase())
  )) {
    score += 2
  }

  // Signal bonus
  if (company.signals?.hiring) score += 1
  if (company.signals?.funding) score += 1

  return Math.max(1, Math.min(10, score))
}

function mapEmployeeCount(count?: number): Company['size'] {
  if (!count) return null
  if (count <= 10) return '1-10'
  if (count <= 50) return '11-50'
  if (count <= 200) return '51-200'
  if (count <= 500) return '201-500'
  return '1000+'
}

function extractDomain(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return undefined
  }
}

function extractCompanyName(title: string, url: string): string {
  // Try to extract from title or fall back to domain
  const cleanTitle = title.split(' - ')[0].split(' | ')[0].trim()
  return cleanTitle || extractDomain(url) || 'Unknown'
}

