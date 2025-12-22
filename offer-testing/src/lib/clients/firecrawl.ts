/**
 * Firecrawl API Client
 * 
 * Firecrawl turns entire websites into LLM-ready data with multiple endpoints:
 * - /scrape: Extract content from a single URL
 * - /crawl: Scrape entire websites automatically
 * - /agent: Autonomous research and data gathering
 * - /extract: Multi-page structured extraction
 * - /search: Search the web and scrape results
 * 
 * For outbound outreach, focus on:
 * - Agent: Competitive research, pre-outreach research
 * - Scrape: Single-page extraction with optional actions
 * - Extract: Multi-site structured extraction
 * 
 * @see /context/api-guides/firecrawl-usage-guide.md for detailed usage patterns
 */

import Firecrawl from '@mendable/firecrawl-js'

// Initialize Firecrawl client
if (!process.env.FIRECRAWL_API_KEY) {
  throw new Error('FIRECRAWL_API_KEY is not set in environment variables')
}

export const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY
})

/**
 * Helper: Scrape a single URL
 * 
 * @example
 * // Basic scrape
 * const doc = await firecrawlScrape('https://acme.com/pricing', {
 *   formats: ['markdown', 'html']
 * })
 * 
 * // Scrape with JSON extraction
 * const data = await firecrawlScrape('https://acme.com/pricing', {
 *   formats: [{
 *     type: 'json',
 *     schema: pricingSchema
 *   }]
 * })
 * 
 * // Scrape with actions (interact with page first)
 * const doc = await firecrawlScrape('https://acme.com', {
 *   formats: ['markdown'],
 *   actions: [
 *     { type: 'click', selector: '#pricing-tab' },
 *     { type: 'wait', milliseconds: 1000 }
 *   ]
 * })
 */
export async function firecrawlScrape(
  url: string,
  options?: {
    formats?: Array<'markdown' | 'html' | 'links' | 'screenshot' | { type: 'json', schema?: any, prompt?: string }>
    actions?: Array<any>
    onlyMainContent?: boolean
    timeout?: number
  }
) {
  return firecrawl.scrape(url, options as any)
}

/**
 * Helper: Run agent with structured schema
 * 
 * Best for autonomous research when you don't know exactly where the data is.
 * Agent will search, navigate, and extract data based on your prompt.
 * 
 * @example
 * const result = await firecrawlAgent({
 *   prompt: "Find the founders of Acme Corp",
 *   schema: z.object({
 *     founders: z.array(z.object({
 *       name: z.string(),
 *       role: z.string().optional()
 *     }))
 *   })
 * })
 */
export async function firecrawlAgent<T = any>(params: {
  prompt: string
  urls?: string[]
  schema?: any
  maxCredits?: number
}): Promise<{
  success: boolean
  status: string
  data: T
  creditsUsed: number
}> {
  const result = await firecrawl.agent(params)
  return result as any
}

/**
 * Helper: Start agent job and poll for completion
 * Useful when you want to start a job and check status later
 * 
 * @example
 * const job = await firecrawlStartAgent({
 *   prompt: "Find pricing information for top 5 CRM tools"
 * })
 * 
 * // Later...
 * const status = await firecrawlGetAgentStatus(job.id)
 */
export async function firecrawlStartAgent(params: {
  prompt: string
  urls?: string[]
  schema?: any
  maxCredits?: number
}): Promise<{ id: string }> {
  return firecrawl.startAgent(params)
}

/**
 * Helper: Check agent job status
 * 
 * @returns {
 *   status: 'processing' | 'completed' | 'failed',
 *   data?: any,
 *   creditsUsed?: number
 * }
 */
export async function firecrawlGetAgentStatus(jobId: string) {
  return firecrawl.getAgentStatus(jobId)
}

/**
 * Helper: Crawl entire website
 * 
 * Use when you need content from multiple pages of a site.
 * Less relevant for outreach use cases - better for documentation aggregation.
 * 
 * @example
 * const docs = await firecrawlCrawl('https://docs.acme.com', {
 *   limit: 10,
 *   formats: ['markdown']
 * })
 */
export async function firecrawlCrawl(
  url: string,
  options?: {
    limit?: number
    formats?: Array<'markdown' | 'html' | 'links' | 'screenshot'>
  }
) {
  return firecrawl.crawl(url, options as any)
}

/**
 * Common schemas for structured extraction
 */
export const FirecrawlSchemas = {
  /**
   * Extract company information
   */
  company: {
    name: { type: 'string', description: 'Company name' },
    website: { type: 'string', description: 'Company website URL' },
    description: { type: 'string', description: 'Brief description of what the company does' },
    employee_count: { type: 'string', description: 'Number of employees (if available)' },
    location: { type: 'string', description: 'Company headquarters location' },
    founded: { type: 'string', description: 'Year founded (if available)' }
  },

  /**
   * Extract contact information
   */
  contact: {
    name: { type: 'string', description: 'Full name' },
    title: { type: 'string', description: 'Job title' },
    email: { type: 'string', description: 'Email address (if available)' },
    linkedin: { type: 'string', description: 'LinkedIn profile URL (if available)' },
    company: { type: 'string', description: 'Current company' }
  },

  /**
   * Extract pricing information
   */
  pricing: {
    plan_name: { type: 'string', description: 'Name of pricing plan' },
    price: { type: 'string', description: 'Price (include currency and period)' },
    features: { 
      type: 'array',
      description: 'List of features included',
      items: { type: 'string' }
    }
  },

  /**
   * Extract product features
   */
  features: {
    feature_name: { type: 'string', description: 'Name of feature' },
    description: { type: 'string', description: 'What the feature does' },
    category: { type: 'string', description: 'Feature category (if available)' }
  }
}

/**
 * Common actions for interacting with pages
 */
export const FirecrawlActions = {
  /**
   * Wait for page to load
   */
  wait: (milliseconds: number = 1000) => ({
    type: 'wait',
    milliseconds
  }),

  /**
   * Click an element
   */
  click: (selector: string) => ({
    type: 'click',
    selector
  }),

  /**
   * Type text into an input
   */
  write: (text: string) => ({
    type: 'write',
    text
  }),

  /**
   * Press a key
   */
  press: (key: string) => ({
    type: 'press',
    key
  }),

  /**
   * Scroll the page
   */
  scroll: (direction: 'down' | 'up' = 'down') => ({
    type: 'scroll',
    direction
  }),

  /**
   * Take a screenshot
   */
  screenshot: (fullPage: boolean = false) => ({
    type: 'screenshot',
    fullPage
  })
}

