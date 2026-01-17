/**
 * Tool Usage Logger Hook
 * 
 * Automatically logs all API calls to the tool_usage table in Supabase.
 * This hook runs deterministically before/after tool calls.
 * 
 * Uses Supabase MCP server when available, falls back to direct client.
 * 
 * Location: .cursor/hooks/tool-usage-logger.ts
 * 
 * How to use:
 * 1. Cursor will automatically invoke hooks when configured
 * 2. Or use the withToolLogging wrapper in your code
 * 3. Or call logToolUsage() directly
 */

// Note: In Cursor context, prefer MCP Supabase server
// For application code, use direct import:
import { supabaseAdmin } from '@/lib/clients/supabase'

export interface ToolCall {
  tool: string // API name: 'parallel', 'theirstack', 'exa', etc.
  action: string // Action: 'search', 'enrich', 'verify', etc.
  requestParams: Record<string, unknown>
  responseSummary?: Record<string, unknown>
  status: 'success' | 'error' | 'rate_limited'
  resultsCount?: number
  creditsUsed?: number
  durationMs?: number
  errorMessage?: string
  offerId?: string
  campaignId?: string
  companyId?: string
  contactId?: string
}

/**
 * Logs a tool usage to Supabase tool_usage table.
 * 
 * This is called automatically by hooks before/after API calls.
 * 
 * @param toolCall - Tool call information to log
 */
export async function logToolUsage(toolCall: ToolCall): Promise<void> {
  try {
    // First, get or create the tool record
    const tool = await getOrCreateTool(toolCall.tool)
    
    // Calculate credits if not provided
    const creditsUsed = toolCall.creditsUsed ?? calculateCredits(toolCall)
    
    // Insert usage record
    const { error } = await supabaseAdmin.from('tool_usage').insert({
      tool_id: tool.id,
      offer_id: toolCall.offerId || null,
      campaign_id: toolCall.campaignId || null,
      company_id: toolCall.companyId || null,
      contact_id: toolCall.contactId || null,
      action: toolCall.action,
      request_params: toolCall.requestParams,
      status: toolCall.status,
      response_summary: toolCall.responseSummary || null,
      results_count: toolCall.resultsCount || null,
      error_message: toolCall.errorMessage || null,
      credits_used: creditsUsed,
      duration_ms: toolCall.durationMs || null,
      created_at: new Date().toISOString()
    })

    if (error) {
      console.error('Failed to log tool usage:', error)
      // Don't throw - logging failures shouldn't break the workflow
    }
  } catch (error) {
    console.error('Error in logToolUsage hook:', error)
    // Don't throw - hooks should be resilient
  }
}

/**
 * Gets or creates a tool record in the tools table.
 */
async function getOrCreateTool(toolName: string): Promise<{ id: string }> {
  // Try to find existing tool
  const { data: existing } = await supabaseAdmin
    .from('tools')
    .select('id')
    .eq('name', toolName)
    .single()

  if (existing) {
    return existing
  }

  // Create new tool record
  const toolType = getToolType(toolName)
  
  const { data: newTool, error } = await supabaseAdmin
    .from('tools')
    .insert({
      name: toolName,
      type: toolType,
      status: 'active'
    })
    .select('id')
    .single()

  if (error || !newTool) {
    // Fallback: return a placeholder ID if creation fails
    console.warn(`Failed to create tool record for ${toolName}:`, error)
    return { id: '00000000-0000-0000-0000-000000000000' }
  }

  return newTool
}

/**
 * Determines tool type based on tool name.
 */
function getToolType(toolName: string): string {
  const toolTypes: Record<string, string> = {
    parallel: 'company_search',
    theirstack: 'company_search',
    exa: 'company_search',
    sumble: 'enrichment',
    leadmagic: 'email_finding',
    fullenrich: 'email_finding',
    firecrawl: 'enrichment',
    unipile: 'sending'
  }

  return toolTypes[toolName.toLowerCase()] || 'enrichment'
}

/**
 * Calculates credits used based on tool and action.
 * 
 * This is a fallback if credits aren't provided by the API call.
 * Update these estimates based on actual API pricing.
 */
function calculateCredits(toolCall: ToolCall): number {
  const tool = toolCall.tool.toLowerCase()
  const action = toolCall.action.toLowerCase()

  // Default credits per action (update based on actual API costs)
  const credits: Record<string, Record<string, number>> = {
    parallel: {
      search: 5,
      enrich: 10,
      'people_search': 5
    },
    theirstack: {
      search: 1,
      'job_search': 1
    },
    exa: {
      search: 10,
      research: 20
    },
    sumble: {
      enrich: 5,
      'job_search': 1
    },
    leadmagic: {
      find: 1,
      verify: 1,
      enrich: 3
    },
    fullenrich: {
      find: 1,
      'find_phone': 10,
      enrich: 3
    },
    firecrawl: {
      scrape: 5,
      extract: 10
    },
    unipile: {
      'check_connection': 0,
      'send_message': 0,
      'send_connection_request': 0
    }
  }

  return credits[tool]?.[action] || 1 // Default to 1 credit
}

/**
 * Pre-tool-call hook: Logs before making API call.
 * 
 * Use this to log the start of an API call.
 */
export async function preToolCallHook(toolCall: Omit<ToolCall, 'status' | 'responseSummary'>): Promise<void> {
  // Log with 'pending' status (you might want to add this status to your schema)
  // For now, we'll just prepare the log entry
  // Actual logging happens in postToolCallHook
}

/**
 * Post-tool-call hook: Logs after API call completes.
 * 
 * Use this to log the result of an API call.
 */
export async function postToolCallHook(toolCall: ToolCall): Promise<void> {
  await logToolUsage(toolCall)
}

/**
 * Wraps an API call with automatic logging.
 * 
 * Usage:
 * ```typescript
 * const result = await withToolLogging(
 *   'parallel',
 *   'search',
 *   { query: '...', limit: 50 },
 *   async () => await parallel.search(...)
 * )
 * ```
 */
export async function withToolLogging<T>(
  tool: string,
  action: string,
  requestParams: Record<string, unknown>,
  apiCall: () => Promise<T>,
  context?: {
    offerId?: string
    campaignId?: string
    companyId?: string
    contactId?: string
  }
): Promise<T> {
  const startTime = Date.now()
  let status: 'success' | 'error' | 'rate_limited' = 'success'
  let responseSummary: Record<string, unknown> | undefined
  let resultsCount: number | undefined
  let errorMessage: string | undefined

  try {
    const result = await apiCall()
    
    // Extract summary from result
    if (Array.isArray(result)) {
      resultsCount = result.length
      responseSummary = { count: result.length }
    } else if (result && typeof result === 'object') {
      responseSummary = { ...result } as Record<string, unknown>
      if ('count' in result) {
        resultsCount = result.count as number
      }
    }

    return result
  } catch (error: unknown) {
    status = error instanceof Error && error.message.includes('rate limit')
      ? 'rate_limited'
      : 'error'
    
    errorMessage = error instanceof Error ? error.message : String(error)
    throw error
  } finally {
    const durationMs = Date.now() - startTime

    await logToolUsage({
      tool,
      action,
      requestParams,
      responseSummary,
      status,
      resultsCount,
      errorMessage,
      durationMs,
      ...context
    })
  }
}
