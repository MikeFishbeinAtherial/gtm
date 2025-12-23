/**
 * Copy Generator
 * 
 * Generate personalized email and LinkedIn copy using AI.
 * Uses Claude to create messaging based on offer positioning and ICP.
 */

import { generateJSON } from '@/lib/clients/anthropic'
import { updateOffer, getOffer } from '@/lib/clients/supabase'
import type { 
  Offer, 
  ICP,
  EmailSequence,
  EmailTemplate,
  LinkedInTemplates,
  PersonalizationVariables 
} from '@/lib/types'

// ===========================================
// TYPES
// ===========================================

export interface GenerateCopyInput {
  offer_id: string
  type?: 'email' | 'linkedin' | 'both'
}

export interface GenerateCopyResult {
  email_templates?: EmailSequence
  linkedin_templates?: LinkedInTemplates
  reasoning: string
}

export interface PersonalizeMessageInput {
  template: string
  variables: PersonalizationVariables
}

// ===========================================
// MAIN FUNCTIONS
// ===========================================

/**
 * Generate outreach copy for an offer.
 * 
 * @param input - Generation parameters
 * @returns Generated copy templates
 */
export async function generateCopy(input: GenerateCopyInput): Promise<GenerateCopyResult> {
  const { offer_id, type = 'both' } = input

  // Get offer data
  const offer = await getOffer(offer_id)
  if (!offer) {
    throw new Error(`Offer not found: ${offer_id}`)
  }
  // TODO: Check positioning canvas - property may not exist on Offer type
  // if (!(offer as any).positioning) {
  //   throw new Error('Positioning canvas is required to generate copy')
  // }
  if (!offer.icp) {
    throw new Error('ICP is required to generate copy. Run /offer-icp first.')
  }

  const result: GenerateCopyResult = { reasoning: '' }

  // Generate email copy
  if (type === 'email' || type === 'both') {
    const emailResult = await generateEmailSequence(offer)
    result.email_templates = emailResult.templates
    result.reasoning += emailResult.reasoning
  }

  // Generate LinkedIn copy
  if (type === 'linkedin' || type === 'both') {
    const linkedinResult = await generateLinkedInCopy(offer)
    result.linkedin_templates = linkedinResult.templates
    result.reasoning += '\n\n' + linkedinResult.reasoning
  }

  // Save to database
  await updateOffer(offer_id, {
    email_templates: result.email_templates,
    linkedin_templates: result.linkedin_templates,
    status: 'ready',
  })

  return result
}

// ===========================================
// EMAIL GENERATION
// ===========================================

async function generateEmailSequence(offer: Offer): Promise<{
  templates: EmailSequence
  reasoning: string
}> {
  const prompt = buildEmailPrompt(offer)
  
  const result = await generateJSON<{
    email_1: EmailTemplate
    email_2: EmailTemplate
    email_3: EmailTemplate
    reasoning: string
  }>(prompt, {
    system: EMAIL_SYSTEM_PROMPT,
    max_tokens: 4096,
    temperature: 0.7,
  })

  return {
    templates: {
      email_1: result.email_1,
      email_2: result.email_2,
      email_3: result.email_3,
    },
    reasoning: result.reasoning,
  }
}

const EMAIL_SYSTEM_PROMPT = `You are an expert cold email copywriter who writes high-converting B2B emails.

Your emails are:
- Short (50-100 words)
- Relevant and personalized
- Have one clear CTA
- Sound human, not salesy
- Focus on the recipient's problem, not your solution

Always include personalization variables like {{first_name}}, {{company_name}}, {{signal}}.
Output valid JSON matching the expected schema.`

function buildEmailPrompt(offer: Offer): string {
  return `
# Generate Email Sequence for: ${offer.name}

## Offer
${offer.description}

## Positioning
${JSON.stringify((offer as any).positioning, null, 2)}

## ICP
${JSON.stringify(offer.icp, null, 2)}

## Task
Create a 3-email sequence for cold outreach.

**Email 1 (Day 0): Initial Outreach**
- Hook with relevance to them
- Brief value prop
- Soft CTA (question)

**Email 2 (Day 3): Follow-up**
- Reference first email
- Add new value or angle
- Ask a different question

**Email 3 (Day 7): Break-up**
- Acknowledge multiple emails
- Final value statement
- Give them an out

## Requirements
- Each email: 50-100 words
- 3 subject line options per email
- Use variables: {{first_name}}, {{company_name}}, {{title}}, {{signal}}
- Include notes on the approach

## Output Format
{
  "email_1": {
    "subject_lines": ["...", "...", "..."],
    "body": "...",
    "send_day": 0,
    "notes": "..."
  },
  "email_2": {...},
  "email_3": {...},
  "reasoning": "Brief explanation of the approach"
}
`
}

// ===========================================
// LINKEDIN GENERATION
// ===========================================

async function generateLinkedInCopy(offer: Offer): Promise<{
  templates: LinkedInTemplates
  reasoning: string
}> {
  const prompt = buildLinkedInPrompt(offer)
  
  const result = await generateJSON<{
    connection_request: {
      template: string
      variations: string[]
      character_count: number
    }
    follow_up_dm: {
      template: string
      variations: string[]
    }
    inmail: {
      subject: string
      body: string
    }
    reasoning: string
  }>(prompt, {
    system: LINKEDIN_SYSTEM_PROMPT,
    max_tokens: 4096,
    temperature: 0.7,
  })

  return {
    templates: {
      connection_request: result.connection_request,
      follow_up_dm: {
        ...result.follow_up_dm,
        send_after_hours: 24,
      },
      inmail: result.inmail,
    },
    reasoning: result.reasoning,
  }
}

const LINKEDIN_SYSTEM_PROMPT = `You are an expert at LinkedIn outreach who builds genuine connections.

Your messages are:
- Authentic and not salesy
- Focused on shared interests or genuine observations
- Connection requests are under 300 characters
- Follow-up DMs start conversations, not pitches

Output valid JSON matching the expected schema.`

function buildLinkedInPrompt(offer: Offer): string {
  return `
# Generate LinkedIn Messages for: ${offer.name}

## Offer
${offer.description}

## Positioning
${JSON.stringify((offer as any).positioning, null, 2)}

## ICP
${JSON.stringify(offer.icp, null, 2)}

## Task
Create LinkedIn outreach messages.

**Connection Request (MAX 300 CHARACTERS)**
- Reason to connect (shared interest, observation)
- NO pitch, NO ask
- Genuine and personalized

**Follow-up DM (24-48hrs after connection)**
- Acknowledge the connection
- Start a conversation
- Subtle mention of what you do
- Question to engage

**InMail (for 3rd degree)**
- Professional subject line
- Complete value prop
- Clear next step

## Requirements
- Connection request MUST be under 300 characters
- Use variables: {{first_name}}, {{company_name}}, {{mutual_connection}}
- Include 2-3 variations for A/B testing

## Output Format
{
  "connection_request": {
    "template": "...",
    "variations": ["...", "..."],
    "character_count": 123
  },
  "follow_up_dm": {
    "template": "...",
    "variations": ["...", "..."]
  },
  "inmail": {
    "subject": "...",
    "body": "..."
  },
  "reasoning": "Brief explanation of the approach"
}
`
}

// ===========================================
// PERSONALIZATION
// ===========================================

/**
 * Personalize a message template with variables.
 * 
 * @param input - Template and variables
 * @returns Personalized message
 */
export function personalizeMessage(input: PersonalizeMessageInput): string {
  let message = input.template
  const { variables } = input

  // Replace standard variables
  if (variables.first_name) {
    message = message.replace(/\{\{first_name\}\}/gi, variables.first_name)
  }
  if (variables.last_name) {
    message = message.replace(/\{\{last_name\}\}/gi, variables.last_name)
  }
  if (variables.company_name) {
    message = message.replace(/\{\{company_name\}\}/gi, variables.company_name)
  }
  if (variables.title) {
    message = message.replace(/\{\{title\}\}/gi, variables.title)
  }
  if (variables.signal) {
    message = message.replace(/\{\{signal\}\}/gi, variables.signal)
  }
  if (variables.mutual_connection) {
    message = message.replace(/\{\{mutual_connection\}\}/gi, variables.mutual_connection)
  }
  if (variables.recent_post) {
    message = message.replace(/\{\{recent_post\}\}/gi, variables.recent_post)
  }

  // Replace custom variables
  if (variables.custom) {
    for (const [key, value] of Object.entries(variables.custom)) {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value)
    }
  }

  return message
}

/**
 * Validate that all required variables are filled.
 */
export function validatePersonalization(
  template: string,
  variables: PersonalizationVariables
): { valid: boolean; missing: string[] } {
  const variablePattern = /\{\{(\w+)\}\}/g
  const matches = template.matchAll(variablePattern)
  const missing: string[] = []

  for (const match of Array.from(matches)) {
    const varName = match[1].toLowerCase()
    const hasValue = 
      (varName === 'first_name' && variables.first_name) ||
      (varName === 'last_name' && variables.last_name) ||
      (varName === 'company_name' && variables.company_name) ||
      (varName === 'title' && variables.title) ||
      (varName === 'signal' && variables.signal) ||
      (varName === 'mutual_connection' && variables.mutual_connection) ||
      (varName === 'recent_post' && variables.recent_post) ||
      (variables.custom && variables.custom[varName])

    if (!hasValue) {
      missing.push(varName)
    }
  }

  return {
    valid: missing.length === 0,
    missing: Array.from(new Set(missing)), // Remove duplicates
  }
}

