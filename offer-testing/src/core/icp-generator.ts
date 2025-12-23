/**
 * ICP Generator
 * 
 * Generate Ideal Customer Profile from offer description using AI.
 * 
 * This module orchestrates the AI-powered generation of ICPs,
 * including company profiles, buyer profiles, and search queries.
 */

import { generate, generateJSON } from '@/lib/clients/anthropic'
import { updateOffer, getOffer } from '@/lib/clients/supabase'
import type { ICP, Offer } from '@/lib/types'

// ===========================================
// TYPES
// ===========================================

export interface GenerateICPInput {
  offer_id: string
  positioning_canvas?: any
  additional_context?: string
}

export interface GenerateICPResult {
  icp: ICP
  reasoning: string
  suggestions: string[]
}

// ===========================================
// MAIN FUNCTION
// ===========================================

/**
 * Generate an ICP for an offer based on its positioning.
 * 
 * @param input - Offer ID and optional context
 * @returns Generated ICP with reasoning
 */
export async function generateICP(input: GenerateICPInput): Promise<GenerateICPResult> {
  // Get offer data
  const offer = await getOffer(input.offer_id)
  if (!offer) {
    throw new Error(`Offer not found: ${input.offer_id}`)
  }

  const positioning = input.positioning_canvas || (offer as any).positioning
  if (!positioning) {
    throw new Error('Positioning canvas is required to generate ICP')
  }

  // Build prompt
  const prompt = buildICPPrompt(offer, positioning, input.additional_context)
  
  // Generate ICP using AI
  const result = await generateJSON<GenerateICPResult>(prompt, {
    system: ICP_SYSTEM_PROMPT,
    max_tokens: 4096,
    temperature: 0.5,
  })

  // Save to database
  await updateOffer(input.offer_id, {
    icp: result.icp,
    status: 'ready',
  })

  return result
}

// ===========================================
// PROMPTS
// ===========================================

const ICP_SYSTEM_PROMPT = `You are an expert B2B sales strategist who specializes in defining Ideal Customer Profiles (ICPs).

Your job is to analyze an offer's positioning and generate a comprehensive ICP that will help find the right companies and buyers.

Always output valid JSON matching the expected schema. Be specific and actionable - avoid generic descriptions.`

function buildICPPrompt(
  offer: Offer,
  positioning: any,
  additionalContext?: string
): string {
  return `
# Generate ICP for: ${offer.name}

## Offer Description
${offer.description}

## Positioning Canvas
${JSON.stringify(positioning, null, 2)}

${additionalContext ? `## Additional Context\n${additionalContext}` : ''}

## Task
Generate a comprehensive Ideal Customer Profile (ICP) based on this positioning.

The ICP should include:

1. **Company Profile**
   - Firmographics (size, revenue, stage, geography)
   - Primary and adjacent verticals
   - Signals that indicate they need this solution
   - Disqualifiers to avoid wasting time

2. **Buyer Profile**
   - Primary decision-maker titles
   - Secondary influencer titles
   - Seniority level and departments
   - Pain points and goals
   - How they typically buy

3. **Search Queries**
   - Example queries for Parallel API
   - Job posting signals for TheirStack
   - LinkedIn Sales Navigator filters

## Output Format
Return JSON with this structure:
{
  "icp": {
    "company_profile": {...},
    "buyer_profile": {...},
    "search_queries": {...}
  },
  "reasoning": "Brief explanation of why this ICP makes sense",
  "suggestions": ["Suggestion 1", "Suggestion 2", "..."]
}
`
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Validate an ICP structure.
 */
export function validateICP(icp: ICP): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check company profile
  if (!icp.company_profile) {
    errors.push('Missing company_profile')
  } else {
    if (!icp.company_profile.firmographics?.size_range) {
      errors.push('Missing company size range')
    }
    if (!icp.company_profile.verticals?.primary?.length) {
      errors.push('Missing primary verticals')
    }
  }

  // Check buyer profile
  if (!icp.buyer_profile) {
    errors.push('Missing buyer_profile')
  } else {
    if (!icp.buyer_profile.titles?.primary?.length) {
      errors.push('Missing primary buyer titles')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Refine an existing ICP based on feedback.
 */
export async function refineICP(
  offerId: string,
  feedback: string
): Promise<GenerateICPResult> {
  const offer = await getOffer(offerId)
  if (!offer || !offer.icp) {
    throw new Error('Offer or ICP not found')
  }

  const prompt = `
# Refine ICP for: ${offer.name}

## Current ICP
${JSON.stringify(offer.icp, null, 2)}

## Feedback to Incorporate
${feedback}

## Task
Refine the ICP based on the feedback. Keep what works, adjust what doesn't.

Return the same JSON structure as before.
`

  const result = await generateJSON<GenerateICPResult>(prompt, {
    system: ICP_SYSTEM_PROMPT,
    max_tokens: 4096,
    temperature: 0.5,
  })

  // Save updated ICP
  await updateOffer(offerId, { icp: result.icp })

  return result
}

