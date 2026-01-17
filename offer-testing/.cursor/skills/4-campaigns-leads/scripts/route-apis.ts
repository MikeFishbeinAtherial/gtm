/**
 * API Routing Script
 * 
 * Determines which APIs to use based on signal type and ICP.
 * This implements the API routing logic from project rules.
 * 
 * Used by: 4-campaigns-leads skill
 */

export interface Signal {
  type: string
  priority: 'high' | 'medium' | 'low'
  description: string
}

export interface APIRouting {
  primary: 'TheirStack' | 'Parallel' | 'Exa' | 'Sumble'
  secondary?: 'Parallel' | 'Exa' | 'Sumble'
  enrichment: 'Parallel'
  contacts: 'Parallel'
  email?: 'Leadmagic' | 'FullEnrich'
  status?: 'Unipile'
}

/**
 * Determines API routing based on signal type.
 * 
 * Reference: .cursor/rules/project.mdc (API Routing Logic section)
 * 
 * @param signals - Array of campaign signals
 * @returns API routing configuration
 */
export function routeAPIs(signals: Signal[]): APIRouting {
  // Find highest priority signal
  const primarySignal = signals
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })[0]

  if (!primarySignal) {
    // No signals - use Parallel for ICP-only search
    return {
      primary: 'Parallel',
      enrichment: 'Parallel',
      contacts: 'Parallel'
    }
  }

  const signalType = primarySignal.type.toLowerCase()
  const signalDesc = primarySignal.description.toLowerCase()

  // Hiring signals → TheirStack
  if (
    signalType.includes('hiring') ||
    signalDesc.includes('hiring') ||
    signalDesc.includes('job') ||
    signalDesc.includes('recruiting')
  ) {
    return {
      primary: 'TheirStack',
      secondary: 'Parallel',
      enrichment: 'Parallel',
      contacts: 'Parallel',
      status: 'Unipile'
    }
  }

  // Tech stack signals → Parallel (has tech filters)
  if (
    signalType.includes('tech') ||
    signalType.includes('stack') ||
    signalType.includes('tool') ||
    signalDesc.includes('using') ||
    signalDesc.includes('tech stack')
  ) {
    return {
      primary: 'Parallel',
      enrichment: 'Parallel',
      contacts: 'Parallel',
      status: 'Unipile'
    }
  }

  // Funding/news signals → Exa (AI search)
  if (
    signalType.includes('funding') ||
    signalType.includes('news') ||
    signalType.includes('announcement') ||
    signalDesc.includes('funding') ||
    signalDesc.includes('raised') ||
    signalDesc.includes('announced')
  ) {
    return {
      primary: 'Exa',
      secondary: 'Parallel',
      enrichment: 'Parallel',
      contacts: 'Parallel',
      status: 'Unipile'
    }
  }

  // Growth signals → Parallel (employee count trends)
  if (
    signalType.includes('growth') ||
    signalType.includes('expanding') ||
    signalDesc.includes('growing') ||
    signalDesc.includes('expanding')
  ) {
    return {
      primary: 'Parallel',
      enrichment: 'Parallel',
      contacts: 'Parallel',
      status: 'Unipile'
    }
  }

  // Default: Parallel (ICP-only search)
  return {
    primary: 'Parallel',
    enrichment: 'Parallel',
    contacts: 'Parallel',
    status: 'Unipile'
  }
}

/**
 * Formats API routing for display.
 */
export function formatAPIRouting(routing: APIRouting): string {
  const lines: string[] = ['🔀 API Routing:']
  
  lines.push(`   Primary: ${routing.primary}`)
  
  if (routing.secondary) {
    lines.push(`   Secondary: ${routing.secondary}`)
  }
  
  lines.push(`   Enrichment: ${routing.enrichment}`)
  lines.push(`   Contacts: ${routing.contacts}`)
  
  if (routing.email) {
    lines.push(`   Email: ${routing.email}`)
  }
  
  if (routing.status) {
    lines.push(`   Status: ${routing.status}`)
  }

  return lines.join('\n')
}

/**
 * Extracts job titles from hiring signals.
 */
export function extractJobTitles(signal: Signal): string[] {
  const desc = signal.description.toLowerCase()
  const titles: string[] = []

  // Common sales titles
  const salesTitles = ['sdr', 'bdr', 'ae', 'account executive', 'sales development', 'business development']
  
  for (const title of salesTitles) {
    if (desc.includes(title)) {
      titles.push(title.toUpperCase())
    }
  }

  // Extract any quoted titles
  const quotedMatches = desc.match(/"([^"]+)"/g)
  if (quotedMatches) {
    quotedMatches.forEach(match => {
      titles.push(match.replace(/"/g, ''))
    })
  }

  return titles.length > 0 ? titles : ['SDR', 'BDR', 'AE'] // Default
}
