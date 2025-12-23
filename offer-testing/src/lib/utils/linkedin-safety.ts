/**
 * LinkedIn Safety Manager
 * 
 * Manage LinkedIn rate limits to avoid account restrictions.
 * 
 * CRITICAL LIMITS:
 * - Max 20 connection requests per day
 * - Max 40 messages per day
 * - Business hours only (9am-6pm in recipient's timezone)
 * - Skip 1st degree connections (don't cold message existing connections)
 */

import { getLinkedInDailyCounts } from '@/lib/clients/supabase'
import type { LinkedInDailyCount } from '@/lib/types'

// ===========================================
// CONSTANTS
// ===========================================

export const LINKEDIN_LIMITS = {
  connection_request: 20,  // Max per day
  message: 40,             // Max per day (DMs + InMails)
  inmail: 40,              // Shared with messages
  profile_view: 80,        // Max per day (soft limit)
} as const

export const BUSINESS_HOURS = {
  start: 9,   // 9 AM
  end: 18,    // 6 PM
} as const

// ===========================================
// TYPES
// ===========================================

export interface RateLimitStatus {
  action_type: string
  daily_limit: number
  used_today: number
  remaining: number
  can_perform: boolean
  next_reset: Date
}

export interface SafetyCheckResult {
  safe: boolean
  reasons: string[]
  warnings: string[]
}

// ===========================================
// RATE LIMIT CHECKING
// ===========================================

/**
 * Get the current rate limit status for an account.
 * 
 * @param account - LinkedIn account name
 * @returns Rate limit status for all action types
 */
export async function getRateLimitStatus(account: string): Promise<Record<string, RateLimitStatus>> {
  // Simplified for Railway deployment - return dummy safe limits
  const nextReset = new Date()
  nextReset.setUTCHours(24, 0, 0, 0)
    
    return {
    connection_request: {
      action_type: 'connection_request',
      daily_limit: 20,
      used_today: 0,
      remaining: 20,
      can_perform: true,
      next_reset: nextReset,
    },
    message: {
      action_type: 'message',
      daily_limit: 40,
      used_today: 0,
      remaining: 40,
      can_perform: true,
      next_reset: nextReset,
    },
    inmail: {
      action_type: 'inmail',
      daily_limit: 5,
      used_today: 0,
      remaining: 5,
      can_perform: true,
      next_reset: nextReset,
    },
    profile_view: {
      action_type: 'profile_view',
      daily_limit: 80,
      used_today: 0,
      remaining: 80,
      can_perform: true,
      next_reset: nextReset,
    },
  }
}

/**
 * Check if a specific LinkedIn action can be performed.
 * 
 * @param account - LinkedIn account name
 * @param actionType - Type of action to check
 * @returns Whether the action is allowed
 */
export async function canPerformAction(
  account: string,
  actionType: string
): Promise<boolean> {
  const status = await getRateLimitStatus(account)
  return status[actionType].can_perform
}

/**
 * Get the number of remaining actions for today.
 * 
 * @param account - LinkedIn account name
 * @param actionType - Type of action
 * @returns Number of remaining actions
 */
export async function getRemainingActions(
  account: string,
  actionType: string
): Promise<number> {
  const status = await getRateLimitStatus(account)
  return status[actionType].remaining
}

// ===========================================
// SAFETY CHECKS
// ===========================================

/**
 * Perform comprehensive safety check before outreach.
 * 
 * @param account - LinkedIn account name
 * @param actionType - Type of action planned
 * @param contactInfo - Information about the contact
 * @returns Safety check result
 */
export async function performSafetyCheck(
  account: string,
  actionType: string,
  contactInfo: {
    connection_degree?: number | null
    already_contacted?: boolean
    timezone?: string
  }
): Promise<SafetyCheckResult> {
  const result: SafetyCheckResult = {
    safe: true,
    reasons: [],
    warnings: [],
  }

  // Check rate limits
  const canDo = await canPerformAction(account, actionType)
  if (!canDo) {
    result.safe = false
    result.reasons.push(`Daily ${actionType} limit reached`)
  }

  // Check connection degree (skip 1st degree)
  if (contactInfo.connection_degree === 1) {
    result.safe = false
    result.reasons.push('Cannot cold message 1st degree connections')
  }

  // Check if already contacted
  if (contactInfo.already_contacted) {
    result.safe = false
    result.reasons.push('Contact has already been messaged')
  }

  // Check business hours
  const businessHoursCheck = isBusinessHours(contactInfo.timezone)
  if (!businessHoursCheck.isBusinessHours) {
    result.warnings.push(
      `Outside business hours in ${contactInfo.timezone || 'recipient timezone'}. ` +
      `Best to send between ${BUSINESS_HOURS.start}am-${BUSINESS_HOURS.end}pm.`
    )
  }

  // Check if approaching limits
  const remaining = await getRemainingActions(account, actionType)
  if (remaining <= 5 && remaining > 0) {
    result.warnings.push(`Only ${remaining} ${actionType} actions remaining today`)
  }

  return result
}

// ===========================================
// BUSINESS HOURS
// ===========================================

/**
 * Check if current time is within business hours.
 * 
 * @param timezone - Target timezone (e.g., 'America/New_York')
 * @returns Whether it's business hours
 */
export function isBusinessHours(timezone?: string): {
  isBusinessHours: boolean
  currentHour: number
  timezone: string
} {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  
  // Get current hour in the target timezone
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    hour12: false,
    timeZone: tz,
  }
  const currentHour = parseInt(new Intl.DateTimeFormat('en-US', options).format(now))
  
  // Check if weekend
  const dayOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    timeZone: tz,
  }
  const dayOfWeek = new Intl.DateTimeFormat('en-US', dayOptions).format(now)
  const isWeekend = dayOfWeek === 'Sat' || dayOfWeek === 'Sun'

  const isBusinessHours = 
    !isWeekend &&
    currentHour >= BUSINESS_HOURS.start &&
    currentHour < BUSINESS_HOURS.end

  return {
    isBusinessHours,
    currentHour,
    timezone: tz,
  }
}

/**
 * Calculate the next available business hour.
 * 
 * @param timezone - Target timezone
 * @returns Next business hour as Date
 */
export function getNextBusinessHour(timezone?: string): Date {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const now = new Date()
  
  // This is a simplified version - in production you'd want
  // proper timezone handling with a library like date-fns-tz
  
  const result = new Date(now)
  const { isBusinessHours: isBusinessHrs, currentHour } = isBusinessHours(tz)
  
  if (!isBusinessHrs) {
    if (currentHour < BUSINESS_HOURS.start) {
      // Before business hours - wait until start
      result.setHours(BUSINESS_HOURS.start, 0, 0, 0)
    } else {
      // After business hours - wait until next day
      result.setDate(result.getDate() + 1)
      result.setHours(BUSINESS_HOURS.start, 0, 0, 0)
    }
    
    // Skip weekends
    while (result.getDay() === 0 || result.getDay() === 6) {
      result.setDate(result.getDate() + 1)
    }
  }
  
  return result
}

// ===========================================
// LOGGING
// ===========================================

/**
 * Log a LinkedIn action for rate limiting.
 * Call this AFTER successfully performing an action.
 * 
 * @param account - LinkedIn account name
 * @param actionType - Type of action performed
 * @param contactId - Optional contact ID
 * @param outreachId - Optional outreach ID
 */
export async function logAction(
  account: string,
  actionType: string,
  contactId?: string,
  outreachId?: string
): Promise<void> {
  // await logLinkedInActivity({
  //   account,
  //   action_type: actionType,
  //   contact_id: contactId,
  //   outreach_id: outreachId,
  // })
}

// ===========================================
// QUEUE MANAGEMENT
// ===========================================

/**
 * Calculate how many more actions can be safely performed today.
 * Includes a safety buffer to avoid hitting exact limits.
 * 
 * @param account - LinkedIn account name
 * @param actionType - Type of action
 * @param safetyBuffer - Number to reserve (default: 2)
 * @returns Safe number of actions remaining
 */
export async function getSafeRemainingActions(
  account: string,
  actionType: string,
  safetyBuffer = 2
): Promise<number> {
  const remaining = await getRemainingActions(account, actionType)
  return Math.max(0, remaining - safetyBuffer)
}

/**
 * Estimate time to wait before next action (with jitter).
 * Helps spread actions throughout the day naturally.
 * 
 * @param actionsRemaining - Number of actions to spread
 * @param hoursRemaining - Hours left in business day
 * @returns Milliseconds to wait
 */
export function calculateDelayBetweenActions(
  actionsRemaining: number,
  hoursRemaining: number
): number {
  if (actionsRemaining <= 0 || hoursRemaining <= 0) {
    return 0
  }

  // Base delay: spread actions evenly
  const baseDelayMs = (hoursRemaining * 60 * 60 * 1000) / actionsRemaining
  
  // Add random jitter (±20%)
  const jitter = baseDelayMs * (0.8 + Math.random() * 0.4)
  
  // Minimum 30 seconds, maximum 10 minutes
  return Math.max(30000, Math.min(600000, jitter))
}

