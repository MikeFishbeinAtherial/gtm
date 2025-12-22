/**
 * Exa API Client
 * 
 * AI-powered web search for finding companies, research, and intelligence.
 * Uses the official exa-js SDK.
 * 
 * @see https://docs.exa.ai/
 */

import Exa from 'exa-js'

// Initialize Exa client
function getExaClient() {
  const apiKey = process.env.EXA_API_KEY
  
  if (!apiKey) {
    throw new Error('EXA_API_KEY not set in environment variables')
  }
  
  return new Exa(apiKey)
}

// Legacy interfaces for backward compatibility
export interface ExaSearchOptions {
  query: string
  num_results?: number
  use_autoprompt?: boolean
  category?: 'company' | 'research paper' | 'news' | 'github' | 'tweet' | 'movie' | 'song' | 'personal site' | 'pdf'
  start_published_date?: string  // ISO 8601 format
  end_published_date?: string
  include_domains?: string[]
  exclude_domains?: string[]
}

export interface ExaSearchResult {
  results: Array<{
    title: string
    url: string
    published_date?: string
    author?: string
    score: number
    id: string
  }>
  autoprompt_string?: string
}

export interface ExaContentsOptions {
  ids: string[]
  text?: boolean
  highlights?: boolean
  summary?: boolean
}

export interface ExaContentsResult {
  results: Array<{
    id: string
    url: string
    title: string
    text?: string
    highlights?: string[]
    summary?: string
  }>
}

// New People Search interfaces
export interface ExaPeopleSearchOptions {
  query: string
  num_results?: number
  include_domains?: string[]
  exclude_domains?: string[]
}

export interface ExaPerson {
  name: string
  title?: string
  company?: string
  linkedin_url?: string
  twitter_url?: string
  email?: string
  location?: string
  bio?: string
  url: string
  score: number
}

/**
 * Search the web using Exa's neural search.
 * Perfect for finding companies, research, and competitive intelligence.
 * 
 * @example
 * ```typescript
 * // Find B2B SaaS companies hiring sales reps
 * const results = await exaSearch({
 *   query: "B2B SaaS companies with 20-100 employees hiring sales representatives",
 *   num_results: 50,
 *   use_autoprompt: true,
 *   category: 'company'
 * })
 * ```
 */
export async function exaSearch(options: ExaSearchOptions): Promise<ExaSearchResult> {
  const exa = getExaClient()

  const {
    query,
    num_results = 10,
    use_autoprompt = true,
    category,
    start_published_date,
    end_published_date,
    include_domains,
    exclude_domains,
  } = options

  const result = await exa.search(query, {
    numResults: num_results,
    useAutoprompt: use_autoprompt,
    category,
    startPublishedDate: start_published_date,
    endPublishedDate: end_published_date,
    includeDomains: include_domains,
    excludeDomains: exclude_domains,
  })

  return result as ExaSearchResult
}

/**
 * Get detailed content for specific search results.
 * Use this to extract full text, highlights, or summaries.
 * 
 * @example
 * ```typescript
 * // Get summaries of top results
 * const contents = await exaGetContents({
 *   ids: ['result-id-1', 'result-id-2'],
 *   summary: true
 * })
 * ```
 */
export async function exaGetContents(options: ExaContentsOptions): Promise<ExaContentsResult> {
  const exa = getExaClient()

  const { ids, text = false, highlights = false, summary = false } = options

  const result = await exa.getContents(ids, {
    text,
    highlights,
    summary,
  })

  return result as ExaContentsResult
}

/**
 * Search and get contents in one call.
 * More efficient than calling search + getContents separately.
 * 
 * @example
 * ```typescript
 * const results = await exaSearchAndContents({
 *   query: "AI startups raising funding",
 *   num_results: 10,
 *   text: true,
 *   summary: true
 * })
 * ```
 */
export async function exaSearchAndContents(
  options: ExaSearchOptions & { text?: boolean; highlights?: boolean; summary?: boolean }
): Promise<ExaSearchResult & { results: Array<ExaSearchResult['results'][0] & { text?: string; summary?: string; highlights?: string[] }> }> {
  const exa = getExaClient()

  const {
    query,
    num_results = 10,
    use_autoprompt = true,
    category,
    start_published_date,
    end_published_date,
    include_domains,
    exclude_domains,
    text = false,
    highlights = false,
    summary = false,
  } = options

  const result = await exa.searchAndContents(query, {
    numResults: num_results,
    useAutoprompt: use_autoprompt,
    category,
    startPublishedDate: start_published_date,
    endPublishedDate: end_published_date,
    includeDomains: include_domains,
    excludeDomains: exclude_domains,
    text,
    highlights,
    summary,
  })

  return result as any
}

/**
 * Search for people using Exa's people search.
 * Find decision-makers, experts, and contacts.
 * 
 * @example
 * ```typescript
 * // Find CMOs at B2B SaaS companies
 * const people = await exaSearchPeople({
 *   query: "CMO at B2B SaaS company",
 *   num_results: 20,
 *   include_domains: ["linkedin.com"]
 * })
 * ```
 */
export async function exaSearchPeople(options: ExaPeopleSearchOptions): Promise<{ results: ExaPerson[] }> {
  const exa = getExaClient()

  const {
    query,
    num_results = 10,
    include_domains,
    exclude_domains,
  } = options

  // People search typically works best with LinkedIn
  const domains = include_domains || ['linkedin.com']

  const result = await exa.search(query, {
    numResults: num_results,
    includeDomains: domains,
    excludeDomains: exclude_domains,
    useAutoprompt: true,
  })

  // Transform results into person objects
  const people: ExaPerson[] = result.results.map((r: any) => ({
    name: r.title?.split('|')[0]?.trim() || r.title,
    title: extractTitle(r.title),
    company: extractCompany(r.title),
    linkedin_url: r.url.includes('linkedin.com') ? r.url : undefined,
    url: r.url,
    score: r.score,
  }))

  return { results: people }
}

// Helper functions to extract person info from LinkedIn titles
function extractTitle(title: string): string | undefined {
  // LinkedIn titles are often formatted as "Name | Title at Company"
  const parts = title.split('|')
  if (parts.length > 1) {
    const titlePart = parts[1].trim()
    const atIndex = titlePart.indexOf(' at ')
    return atIndex > 0 ? titlePart.substring(0, atIndex).trim() : titlePart
  }
  return undefined
}

function extractCompany(title: string): string | undefined {
  // Extract company name from "Title at Company" format
  const atMatch = title.match(/\bat\s+([^|]+)/)
  return atMatch ? atMatch[1].trim() : undefined
}

/**
 * Find decision-makers at specific companies.
 * Useful for contact discovery in outreach campaigns.
 * 
 * @example
 * ```typescript
 * const contacts = await exaFindContacts({
 *   company: "Acme Corp",
 *   titles: ["VP Sales", "Sales Director", "CRO"],
 *   limit: 10
 * })
 * ```
 */
export async function exaFindContacts(params: {
  company: string
  titles: string[]
  limit?: number
}): Promise<{ results: ExaPerson[] }> {
  const { company, titles, limit = 10 } = params

  // Construct query for finding people with specific titles at a company
  const titleQuery = titles.join(' OR ')
  const query = `${titleQuery} at ${company} site:linkedin.com`

  return exaSearchPeople({
    query,
    num_results: limit,
    include_domains: ['linkedin.com'],
  })
}

/**
 * Find companies matching an ICP.
 * 
 * @example
 * ```typescript
 * const companies = await exaFindCompanies({
 *   size: "20-100 employees",
 *   industry: "B2B SaaS",
 *   geography: "United States",
 *   signals: ["hiring sales reps", "raised Series A"]
 * })
 * ```
 */
export async function exaFindCompanies(params: {
  size?: string
  industry?: string
  geography?: string
  signals?: string[]
  limit?: number
}): Promise<ExaSearchResult> {
  const { size, industry, geography, signals = [], limit = 50 } = params

  // Construct natural language query
  const parts = []
  if (industry) parts.push(industry)
  if (size) parts.push(`with ${size}`)
  if (geography) parts.push(`in ${geography}`)
  if (signals.length > 0) parts.push(`that are ${signals.join(' and ')}`)

  const query = `${parts.join(' ')} companies`

  return exaSearch({
    query,
    num_results: limit,
    use_autoprompt: true,
    category: 'company',
  })
}

/**
 * Research a specific company.
 * Returns recent news, blog posts, and information.
 * 
 * @example
 * ```typescript
 * const research = await exaResearchCompany("Acme Corp", {
 *   include_news: true,
 *   days_back: 90
 * })
 * ```
 */
export async function exaResearchCompany(
  companyName: string,
  options: {
    include_news?: boolean
    days_back?: number
    get_summary?: boolean
  } = {}
): Promise<{ search: ExaSearchResult; contents?: ExaContentsResult }> {
  const { include_news = true, days_back = 90, get_summary = true } = options

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days_back)

  const query = include_news
    ? `${companyName} news announcements funding hiring`
    : `${companyName} company information`

  if (get_summary) {
    // Use searchAndContents for efficiency
    const result = await exaSearchAndContents({
      query,
      num_results: 10,
      use_autoprompt: true,
      start_published_date: startDate.toISOString().split('T')[0],
      end_published_date: endDate.toISOString().split('T')[0],
      summary: true,
    })

    return {
      search: {
        results: result.results,
        autoprompt_string: result.autoprompt_string,
      },
      contents: {
        results: result.results.map(r => ({
          id: r.id,
          url: r.url,
          title: r.title,
          summary: r.summary,
        })),
      },
    }
  } else {
    const searchResult = await exaSearch({
      query,
      num_results: 10,
      use_autoprompt: true,
      start_published_date: startDate.toISOString().split('T')[0],
      end_published_date: endDate.toISOString().split('T')[0],
    })

    return { search: searchResult }
  }
}

/**
 * Find industry trends and insights.
 * Useful for PVP creation - understanding industry pain points.
 * 
 * @example
 * ```typescript
 * const trends = await exaIndustryResearch(
 *   "cosmetics manufacturing",
 *   "compliance challenges regulations"
 * )
 * ```
 */
export async function exaIndustryResearch(
  industry: string,
  topic: string,
  options: { limit?: number; days_back?: number } = {}
): Promise<{ search: ExaSearchResult; contents?: ExaContentsResult }> {
  const { limit = 20, days_back = 365 } = options

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days_back)

  const query = `${industry} ${topic} trends challenges risks`

  // Use searchAndContents for efficiency
  const result = await exaSearchAndContents({
    query,
    num_results: limit,
    use_autoprompt: true,
    start_published_date: startDate.toISOString().split('T')[0],
    summary: true,
    highlights: true,
  })

  return {
    search: {
      results: result.results,
      autoprompt_string: result.autoprompt_string,
    },
    contents: {
      results: result.results.slice(0, 10).map(r => ({
        id: r.id,
        url: r.url,
        title: r.title,
        summary: r.summary,
        highlights: r.highlights,
      })),
    },
  }
}
