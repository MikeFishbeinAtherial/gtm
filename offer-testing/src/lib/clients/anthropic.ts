/**
 * Anthropic Client
 * 
 * Claude API client for AI-powered ICP generation, copy writing, and more.
 * 
 * @see https://docs.anthropic.com/
 */

import Anthropic from '@anthropic-ai/sdk'

// ===========================================
// CLIENT INITIALIZATION
// ===========================================

// Get API key from environment
const apiKey = process.env.ANTHROPIC_API_KEY

// Validate API key
if (!apiKey) {
  console.warn(
    'Anthropic API key not set. ' +
    'Set ANTHROPIC_API_KEY in .env.local'
  )
}

// Create Anthropic client (singleton)
export const anthropic = new Anthropic({
  apiKey: apiKey || 'placeholder-key',
})

// Default model to use
export const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

// ===========================================
// TYPES
// ===========================================

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeResponse {
  content: string
  stop_reason: string | null
  model: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export interface GenerateOptions {
  model?: string
  max_tokens?: number
  temperature?: number
  system?: string
  stop_sequences?: string[]
}

// ===========================================
// CORE FUNCTIONS
// ===========================================

/**
 * Generate a completion from Claude.
 * 
 * @param prompt - The user prompt to send
 * @param options - Optional parameters for the request
 * @returns The generated response
 */
export async function generate(
  prompt: string,
  options: GenerateOptions = {}
): Promise<ClaudeResponse> {
  const {
    model = DEFAULT_MODEL,
    max_tokens = 4096,
    temperature = 0.7,
    system,
    stop_sequences,
  } = options

  const response = await anthropic.messages.create({
    model,
    max_tokens,
    temperature,
    system,
    stop_sequences,
    messages: [
      { role: 'user', content: prompt }
    ],
  })

  // Extract text content from response
  const textContent = response.content.find(block => block.type === 'text')
  const content = textContent?.type === 'text' ? textContent.text : ''

  return {
    content,
    stop_reason: response.stop_reason,
    model: response.model,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  }
}

/**
 * Generate a completion with conversation history.
 * 
 * @param messages - Array of conversation messages
 * @param options - Optional parameters for the request
 * @returns The generated response
 */
export async function chat(
  messages: ClaudeMessage[],
  options: GenerateOptions = {}
): Promise<ClaudeResponse> {
  const {
    model = DEFAULT_MODEL,
    max_tokens = 4096,
    temperature = 0.7,
    system,
    stop_sequences,
  } = options

  const response = await anthropic.messages.create({
    model,
    max_tokens,
    temperature,
    system,
    stop_sequences,
    messages,
  })

  // Extract text content from response
  const textContent = response.content.find(block => block.type === 'text')
  const content = textContent?.type === 'text' ? textContent.text : ''

  return {
    content,
    stop_reason: response.stop_reason,
    model: response.model,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  }
}

/**
 * Generate and parse JSON response from Claude.
 * 
 * @param prompt - The user prompt (should request JSON output)
 * @param options - Optional parameters for the request
 * @returns Parsed JSON object
 */
export async function generateJSON<T = unknown>(
  prompt: string,
  options: GenerateOptions = {}
): Promise<T> {
  // Add instruction to return JSON if not already in system prompt
  const system = options.system 
    ? `${options.system}\n\nAlways respond with valid JSON only.`
    : 'Always respond with valid JSON only. No markdown, no explanation, just the JSON object.'

  const response = await generate(prompt, {
    ...options,
    system,
    temperature: options.temperature ?? 0.3, // Lower temp for more consistent JSON
  })

  // Try to parse the response as JSON
  try {
    // Remove potential markdown code blocks
    let jsonStr = response.content.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7)
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }
    
    return JSON.parse(jsonStr.trim())
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${response.content.slice(0, 200)}...`)
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Test the Anthropic API connection.
 * 
 * @returns True if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    const response = await generate('Say "OK" and nothing else.', {
      max_tokens: 10,
      temperature: 0,
    })
    return response.content.toLowerCase().includes('ok')
  } catch (error) {
    console.error('Anthropic connection test failed:', error)
    return false
  }
}

/**
 * Estimate tokens for a given text.
 * Rough estimation: ~4 chars per token for English text.
 * 
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

