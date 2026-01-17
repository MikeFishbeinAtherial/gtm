/**
 * ICP Validation Script
 * 
 * Validates that a company matches the ICP before spending credits on enrichment.
 * This prevents wasted API calls on companies that don't match our criteria.
 * 
 * Used by: 4-campaigns-leads skill
 * 
 * Location: .cursor/skills/4-campaigns-leads/scripts/validate-icp.ts
 * 
 * Note: This is a skill script, not application code. It's used by Cursor AI
 * when executing the skill. For application code, see src/lib/utils/icp-validation.ts
 */

export interface ICP {
  size_min?: number
  size_max?: number
  industries?: string[]
  geography?: string[]
  disqualifiers?: string[]
}

export interface Company {
  name: string
  domain?: string
  employee_count?: number
  industry?: string
  location?: string
  headquarters_country?: string
  headquarters_state?: string
  headquarters_city?: string
}

export interface ICPValidationResult {
  matches: boolean
  reasons: string[]
  warnings: string[]
}

/**
 * Validates if a company matches the ICP criteria.
 * 
 * @param company - Company data to validate
 * @param icp - ICP criteria to match against
 * @returns Validation result with match status and reasons
 */
export function validateICP(
  company: Company,
  icp: ICP
): ICPValidationResult {
  const reasons: string[] = []
  const warnings: string[] = []

  // Check employee count (size)
  if (icp.size_min !== undefined || icp.size_max !== undefined) {
    const employeeCount = company.employee_count
    
    if (employeeCount === undefined) {
      warnings.push('Employee count not available - cannot validate size match')
    } else {
      if (icp.size_min !== undefined && employeeCount < icp.size_min) {
        reasons.push(
          `Size too small: ${employeeCount} employees (ICP requires ${icp.size_min}+)`
        )
      }
      if (icp.size_max !== undefined && employeeCount > icp.size_max) {
        reasons.push(
          `Size too large: ${employeeCount} employees (ICP requires ${icp.size_max} or less)`
        )
      }
    }
  }

  // Check industry
  if (icp.industries && icp.industries.length > 0) {
    const companyIndustry = company.industry?.toLowerCase()
    
    if (!companyIndustry) {
      warnings.push('Industry not available - cannot validate industry match')
    } else {
      const matchesIndustry = icp.industries.some(
        icpIndustry => companyIndustry.includes(icpIndustry.toLowerCase())
      )
      
      if (!matchesIndustry) {
        reasons.push(
          `Industry mismatch: ${company.industry} (ICP requires: ${icp.industries.join(', ')})`
        )
      }
    }
  }

  // Check geography
  if (icp.geography && icp.geography.length > 0) {
    const companyLocation = 
      company.headquarters_country || 
      company.location || 
      company.headquarters_state
    
    if (!companyLocation) {
      warnings.push('Location not available - cannot validate geography match')
    } else {
      const matchesGeography = icp.geography.some(
        icpGeo => companyLocation.toLowerCase().includes(icpGeo.toLowerCase())
      )
      
      if (!matchesGeography) {
        reasons.push(
          `Geography mismatch: ${companyLocation} (ICP requires: ${icp.geography.join(', ')})`
        )
      }
    }
  }

  // Check disqualifiers
  if (icp.disqualifiers && icp.disqualifiers.length > 0) {
    const companyText = [
      company.name,
      company.industry,
      company.description
    ].filter(Boolean).join(' ').toLowerCase()

    for (const disqualifier of icp.disqualifiers) {
      if (companyText.includes(disqualifier.toLowerCase())) {
        reasons.push(`Disqualifier matched: "${disqualifier}"`)
      }
    }
  }

  return {
    matches: reasons.length === 0,
    reasons,
    warnings
  }
}

/**
 * Filters companies that match ICP, returning both valid and invalid companies.
 * 
 * @param companies - Array of companies to filter
 * @param icp - ICP criteria
 * @returns Object with valid and invalid companies
 */
export function filterCompaniesByICP(
  companies: Company[],
  icp: ICP
): {
  valid: Company[]
  invalid: Array<{ company: Company; validation: ICPValidationResult }>
} {
  const valid: Company[] = []
  const invalid: Array<{ company: Company; validation: ICPValidationResult }> = []

  for (const company of companies) {
    const validation = validateICP(company, icp)
    
    if (validation.matches) {
      valid.push(company)
    } else {
      invalid.push({ company, validation })
    }
  }

  return { valid, invalid }
}

/**
 * Formats validation result for display.
 */
export function formatValidationResult(result: ICPValidationResult): string {
  if (result.matches) {
    return '✅ Matches ICP'
  }

  const lines: string[] = ['❌ Does not match ICP:']
  result.reasons.forEach(reason => {
    lines.push(`  • ${reason}`)
  })
  
  if (result.warnings.length > 0) {
    lines.push('\n⚠️  Warnings:')
    result.warnings.forEach(warning => {
      lines.push(`  • ${warning}`)
    })
  }

  return lines.join('\n')
}
