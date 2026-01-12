/**
 * Sales Job Titles - Comprehensive List
 * 
 * Used to identify if a company is hiring salespeople.
 * This helps prioritize outreach to companies that need sales training.
 */

export const SALES_JOB_TITLES = {
  // Entry Level / Development Roles
  entry: [
    'sdr',                    // Sales Development Representative
    'bdr',                    // Business Development Representative
    'sales development rep',
    'business development rep',
    'inside sales rep',
    'inside sales representative',
    'sales development',
    'business development',
    'sales associate',
    'sales coordinator',
    'sales support',
    'junior sales',
    'entry level sales',
  ],

  // Account Executive / Closer Roles
  accountExecutive: [
    'account executive',
    'ae',
    'account manager',
    'sales executive',
    'sales rep',
    'sales representative',
    'outside sales',
    'field sales',
    'territory manager',
    'regional sales',
    'sales specialist',
    'sales consultant',
    'sales advisor',
  ],

  // Management Roles
  management: [
    'sales manager',
    'sales director',
    'vp sales',
    'vice president sales',
    'head of sales',
    'chief revenue officer',
    'cro',
    'sales lead',
    'sales team lead',
    'regional sales manager',
    'area sales manager',
    'district sales manager',
    'national sales manager',
    'sales operations manager',
    'sales enablement manager',
  ],

  // Specialized Roles
  specialized: [
    'enterprise sales',
    'enterprise account executive',
    'enterprise account manager',
    'mid market sales',
    'smb sales',
    'channel sales',
    'partner sales',
    'alliance sales',
    'inside sales manager',
    'sales engineer',
    'sales consultant',
    'sales trainer',
    'sales enablement',
  ],

  // Revenue Operations
  revops: [
    'revenue operations',
    'revops',
    'sales operations',
    'sales ops',
    'revenue operations manager',
    'sales operations analyst',
  ],
}

/**
 * Get all sales job titles as a flat array (lowercase)
 */
export function getAllSalesJobTitles(): string[] {
  return [
    ...SALES_JOB_TITLES.entry,
    ...SALES_JOB_TITLES.accountExecutive,
    ...SALES_JOB_TITLES.management,
    ...SALES_JOB_TITLES.specialized,
    ...SALES_JOB_TITLES.revops,
  ]
}

/**
 * Check if a job title matches sales roles
 */
export function isSalesJobTitle(title: string): boolean {
  const titleLower = title.toLowerCase()
  const allTitles = getAllSalesJobTitles()
  
  // Check exact matches
  if (allTitles.includes(titleLower)) {
    return true
  }
  
  // Check if title contains any sales keywords
  const salesKeywords = [
    'sales',
    'sdr',
    'bdr',
    'account executive',
    'ae',
    'account manager',
    'revenue',
    'cro',
  ]
  
  return salesKeywords.some(keyword => titleLower.includes(keyword))
}

/**
 * Check if a job description mentions sales roles
 */
export function isSalesJobDescription(description: string): boolean {
  const descLower = description.toLowerCase()
  
  const salesKeywords = [
    'sales',
    'revenue',
    'quota',
    'prospect',
    'lead generation',
    'cold calling',
    'account management',
    'customer acquisition',
    'closing deals',
    'sales cycle',
    'pipeline',
  ]
  
  return salesKeywords.some(keyword => descLower.includes(keyword))
}

/**
 * Categorize a sales job title
 */
export function categorizeSalesJob(title: string): {
  category: 'entry' | 'accountExecutive' | 'management' | 'specialized' | 'revops' | 'unknown'
  isSales: boolean
} {
  const titleLower = title.toLowerCase()
  
  if (SALES_JOB_TITLES.entry.some(t => titleLower.includes(t))) {
    return { category: 'entry', isSales: true }
  }
  if (SALES_JOB_TITLES.accountExecutive.some(t => titleLower.includes(t))) {
    return { category: 'accountExecutive', isSales: true }
  }
  if (SALES_JOB_TITLES.management.some(t => titleLower.includes(t))) {
    return { category: 'management', isSales: true }
  }
  if (SALES_JOB_TITLES.specialized.some(t => titleLower.includes(t))) {
    return { category: 'specialized', isSales: true }
  }
  if (SALES_JOB_TITLES.revops.some(t => titleLower.includes(t))) {
    return { category: 'revops', isSales: true }
  }
  
  // Check if it's sales-related but not in our list
  if (isSalesJobTitle(title)) {
    return { category: 'unknown', isSales: true }
  }
  
  return { category: 'unknown', isSales: false }
}
