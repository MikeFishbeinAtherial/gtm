/**
 * Parallel Web Agents Client
 * 
 * Deep research, data enrichment, and entity discovery using Parallel's Web Agents.
 * 
 * Web Agents (NOT basic search):
 * - Task API: Deep research (4min-30min) & enrichment (10s-30min)
 * - FindAll API: Build structured datasets (5min-60min)
 * - Chat API: Chat with a model (<30s)
 * 
 * @see https://docs.parallel.ai/
 */

import { Parallel } from 'parallel-web'

// ===========================================
// RE-EXPORT SDK TYPES
// ===========================================

// Export the main client
export { Parallel }

// ===========================================
// CUSTOM WRAPPER CLIENT
// ===========================================

/**
 * Enhanced Parallel Web Agents client with helper methods.
 * 
 * This wraps the official SDK and adds convenience methods for:
 * - Deep research on companies/markets
 * - Data enrichment for outreach
 * - Finding contacts at target companies
 */
export class ParallelClient {
  private client: Parallel

  constructor(apiKey?: string) {
    const key = apiKey || process.env.PARALLEL_API_KEY || ''
    
    if (!key) {
      console.warn('Parallel API key not set. Set PARALLEL_API_KEY in .env.local')
    }

    this.client = new Parallel({ apiKey: key })
  }

  // ===========================================
  // TASK API - Deep Research & Enrichment
  // Deep Research: 4min-30min for comprehensive analysis
  // Enrichment: 10s-30min for structured data extraction
  // ===========================================

  /**
   * Deep Research: Comprehensive, multi-step research with citations.
   * 
   * Duration: 4min-30min (asynchronous)
   * 
   * Best for:
   * - In-depth company analysis for personalized outreach
   * - Market research and competitive analysis
   * - Understanding specific use cases and pain points
   * 
   * @param instructions - What you want to research (detailed prompt)
   * @param processor - Quality level: 'base' | 'core' | 'pro' (default: 'pro')
   * @returns Task run object with run_id (poll for results)
   * 
   * @example
   * ```ts
   * // Deep research on a company
   * const task = await client.deepResearch(
   *   `Research Acme Corp (acme.com) and identify:
   *    1. Their current sales tech stack
   *    2. Recent hiring activity for sales roles
   *    3. Pain points related to sales training
   *    4. Key decision makers in sales enablement`
   * )
   * 
   * // Poll for results (takes 4-30min)
   * const result = await client.getTaskResult(task.run_id)
   * console.log(result.output.content) // Rich analysis with citations
   * ```
   */
  async deepResearch(instructions: string, processor: 'base' | 'core' | 'pro' = 'pro') {
    return this.client.taskRun.create({
      input: instructions,
      processor: processor
    })
  }

  /**
   * Enrichment: Extract structured data from the web about entities.
   * 
   * Duration: 10s-30min (asynchronous)
   * 
   * Best for:
   * - Enriching a list of companies with specific data points
   * - Finding specific information about prospects
   * - Repeated workflow automation
   * 
   * @param input - What entities to enrich (companies, people, etc.)
   * @param schema - What data points to extract (structured output)
   * @param processor - Quality level: 'base' | 'core' | 'pro' (default: 'core')
   * @returns Task run object with run_id (poll for results)
   * 
   * @example
   * ```ts
   * // Enrich companies with specific data
   * const task = await client.enrichData(
   *   `Companies: acme.com, techcorp.com, salesinc.com`,
   *   {
   *     type: 'json',
   *     json_schema: {
   *       type: 'array',
   *       items: {
   *         type: 'object',
   *         properties: {
   *           company_name: { type: 'string' },
   *           employee_count: { type: 'number' },
   *           recent_job_postings: { type: 'array' },
   *           tech_stack: { type: 'array' }
   *         }
   *       }
   *     }
   *   }
   * )
   * 
   * // Poll for results (takes 10s-30min depending on complexity)
   * const result = await client.getTaskResult(task.run_id)
   * console.log(result.output.content) // Structured JSON data
   * ```
   */
  async enrichData(
    input: string | Record<string, unknown>,
    schema?: { type: 'json' | 'text' | 'auto'; json_schema?: any },
    processor: 'base' | 'core' | 'pro' = 'core'
  ) {
    return this.client.taskRun.create({
      input: input,
      processor: processor,
      task_spec: schema ? { output_schema: schema } : undefined as any
    })
  }

  /**
   * Get results from a completed task.
   * 
   * @param runId - ID of the task run (run_id from create response)
   * @returns Task results
   */
  async getTaskResult(runId: string) {
    return this.client.taskRun.result(runId)
  }

  /**
   * Check task status (polling helper).
   * 
   * @param runId - ID of the task run (run_id from create response)
   * @returns Current status and result if complete
   */
  async checkTaskStatus(runId: string) {
    try {
      const result = await this.client.taskRun.result(runId)
      return { status: 'completed', result }
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('not found')) {
        return { status: 'running', result: null }
      }
      throw error
    }
  }

  // ===========================================
  // FINDALL API - Build Structured Datasets
  // Duration: 5min-60min (asynchronous)
  // Best for: Creating lists of entities from the web
  // ===========================================

  /**
   * FindAll: Discover and build a dataset of entities from the web.
   * 
   * Duration: 5min-60min (asynchronous)
   * 
   * Best for:
   * - Finding all people at a company matching criteria
   * - Building lists of companies in a specific market
   * - Creating structured datasets from unstructured web data
   * 
   * @param entityType - Type of entity to find (e.g., "person", "company")
   * @param objective - What entities to find (natural language)
   * @param matchConditions - Specific criteria entities must match
   * @param matchLimit - Maximum number of results (default: 50)
   * @param generator - Quality level: 'base' | 'core' | 'pro' (default: 'core')
   * @returns FindAll run object with findall_id (poll for results)
   * 
   * @example
   * ```ts
   * // Find decision makers at a company
   * const findall = await client.findAll(
   *   'person',
   *   'Find sales leadership at acme.com',
   *   [
   *     { name: 'title', description: 'VP of Sales, Director of Sales, or Head of Sales Enablement' },
   *     { name: 'company', description: 'Currently employed at acme.com' }
   *   ]
   * )
   * 
   * // Poll for results (takes 5-60min)
   * const result = await client.getFindAllResult(findall.findall_id)
   * console.log(result.candidates) // List of matched people with data
   * ```
   */
  async findAll(
    entityType: string,
    objective: string,
    matchConditions: Array<{ name: string; description: string }>,
    matchLimit: number = 50,
    generator: 'base' | 'core' | 'pro' = 'core'
  ) {
    return this.client.beta.findall.create({
      entity_type: entityType,
      objective: objective,
      match_conditions: matchConditions,
      match_limit: matchLimit,
      generator: generator,
      betas: ['findall-2025-09-15'] // Required beta header
    })
  }

  /**
   * Helper: Find people at a specific company.
   * 
   * This is a convenience wrapper around findAll for the common use case
   * of finding contacts at target companies.
   * 
   * @param companyDomain - Company website domain
   * @param titles - Job titles to look for (e.g., "VP of Sales, Director of Sales")
   * @param matchLimit - Max results (default: 20)
   * @param generator - Quality level (default: 'core')
   * @returns FindAll run object
   * 
   * @example
   * ```ts
   * const findall = await client.findPeople(
   *   'acme.com',
   *   'VP of Sales, Director of Sales Enablement, Head of Sales'
   * )
   * ```
   */
  async findPeople(
    companyDomain: string,
    titles: string,
    matchLimit: number = 20,
    generator: 'base' | 'core' | 'pro' = 'core'
  ) {
    return this.findAll(
      'person',
      `Find people at ${companyDomain} who are currently employed in sales leadership roles`,
      [
        {
          name: 'title',
          description: `Job title matches one of: ${titles}`
        },
        {
          name: 'company',
          description: `Currently employed at ${companyDomain}`
        }
      ],
      matchLimit,
      generator
    )
  }

  /**
   * Get results from a FindAll run.
   * 
   * @param runId - ID of the FindAll run (run_id from create response)
   * @returns FindAll results with people data
   */
  async getFindAllResult(runId: string) {
    return this.client.beta.findall.result(runId)
  }

  // ===========================================
  // UTILITIES
  // ===========================================

  /**
   * Test the API connection by creating a simple task.
   * 
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try creating a simple task to test authentication
      const task = await this.client.taskRun.create({
        input: 'What is 2+2?',
        processor: 'base'
      })
      return !!task.run_id
    } catch (error) {
      console.error('Parallel connection test failed:', error)
      return false
    }
  }

  /**
   * Get the raw SDK client for advanced usage.
   */
  get sdk() {
    return this.client
  }
}

// Export singleton instance
export const parallel = new ParallelClient()

