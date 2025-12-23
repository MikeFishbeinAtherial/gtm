/**
 * Helper Utilities
 * 
 * Common helper functions used throughout the application.
 */

// ===========================================
// STRING UTILITIES
// ===========================================

/**
 * Convert a string to kebab-case (for slugs).
 * 
 * @example
 * toKebabCase("AI Roleplay Trainer") // "ai-roleplay-trainer"
 */
export function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Convert a string to camelCase.
 * 
 * @example
 * toCamelCase("first_name") // "firstName"
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Truncate a string to a maximum length.
 * 
 * @example
 * truncate("Hello World", 8) // "Hello..."
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - suffix.length) + suffix
}

/**
 * Extract the domain from a URL.
 * 
 * @example
 * extractDomain("https://www.example.com/path") // "example.com"
 */
export function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Extract LinkedIn member ID from a profile URL.
 * 
 * @example
 * extractLinkedInId("https://linkedin.com/in/john-doe-123") // "john-doe-123"
 */
export function extractLinkedInId(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^/?]+)/i)
  return match ? match[1] : null
}

// ===========================================
// DATE UTILITIES
// ===========================================

/**
 * Format a date as a relative time string.
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "1 hour ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'just now'
}

/**
 * Format a date as ISO date string (YYYY-MM-DD).
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

/**
 * Add days to a date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// ===========================================
// OBJECT UTILITIES
// ===========================================

/**
 * Deep clone an object.
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Remove undefined/null values from an object.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)
  ) as Partial<T>
}

/**
 * Pick specific keys from an object.
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  return keys.reduce((acc, key) => {
    if (key in obj) {
      acc[key] = obj[key]
    }
    return acc
  }, {} as Pick<T, K>)
}

/**
 * Omit specific keys from an object.
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

// ===========================================
// ARRAY UTILITIES
// ===========================================

/**
 * Chunk an array into smaller arrays of a given size.
 * 
 * @example
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

/**
 * Remove duplicates from an array.
 */
export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

/**
 * Remove duplicates by a key function.
 */
export function uniqueBy<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>()
  return arr.filter(item => {
    const key = keyFn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Group array items by a key function.
 */
export function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const key = keyFn(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

// ===========================================
// ASYNC UTILITIES
// ===========================================

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff.
 * 
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelayMs - Base delay in milliseconds
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | undefined
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        await sleep(delay)
      }
    }
  }
  
  throw lastError
}

/**
 * Run promises with a concurrency limit.
 * 
 * @param items - Items to process
 * @param fn - Async function to run for each item
 * @param concurrency - Maximum concurrent operations
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 5
): Promise<R[]> {
  const results: R[] = []
  const executing: Promise<void>[] = []
  
  for (const item of items) {
    const promise = fn(item).then(result => {
      results.push(result)
    })
    executing.push(promise)
    
    if (executing.length >= concurrency) {
      await Promise.race(executing)
      // Remove completed promises
      const completed = executing.filter(p => 
        p.then(() => false).catch(() => false)
      )
      executing.splice(0, executing.length, ...completed)
    }
  }
  
  await Promise.all(executing)
  return results
}

// ===========================================
// VALIDATION UTILITIES
// ===========================================

/**
 * Validate an email address format.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate a LinkedIn URL format.
 */
export function isValidLinkedInUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname.includes('linkedin.com') && 
           parsed.pathname.startsWith('/in/')
  } catch {
    return false
  }
}

/**
 * Validate a URL format.
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

