/**
 * Sumble API Examples
 * 
 * Real-world examples of using Sumble for hiring signals and tech validation.
 */

import { sumble } from '@/lib/clients/sumble'
import { isSalesJobTitle, categorizeSalesJob } from '@/context/sales-job-titles'

// ===========================================
// EXAMPLE 1: Find Companies Hiring Sales
// ===========================================

export async function findCompaniesHiringSales() {
  // Find companies hiring for sales roles
  const jobs = await sumble.findJobs({
    query: 'sales OR SDR OR BDR OR account executive',
    filters: {
      countries: ['US'],
      since: '2024-12-01' // Last 2 months
    },
    limit: 50
  })

  // Filter to only sales roles
  const salesJobs = jobs.jobs.filter(job => 
    isSalesJobTitle(job.job_title || '')
  )

  // Group by company
  const companiesByDomain = new Map()
  salesJobs.forEach(job => {
    const domain = job.organization_domain
    if (!domain) return

    if (!companiesByDomain.has(domain)) {
      companiesByDomain.set(domain, {
        domain,
        name: job.organization_name,
        jobs: [],
        jobCount: 0
      })
    }

    const company = companiesByDomain.get(domain)
    company.jobs.push(job)
    company.jobCount++
  })

  // Sort by number of openings (more = stronger signal)
  return Array.from(companiesByDomain.values())
    .sort((a, b) => b.jobCount - a.jobCount)
}

// ===========================================
// EXAMPLE 2: Check Specific Company
// ===========================================

export async function checkCompanyHiringStatus(companyDomain: string) {
  const jobs = await sumble.findJobs({
    organization: { domain: companyDomain },
    filters: {
      since: '2024-12-01'
    },
    limit: 20
  })

  const salesJobs = jobs.jobs.filter(job => 
    isSalesJobTitle(job.job_title || '')
  )

  return {
    total_jobs: jobs.total,
    sales_jobs: salesJobs.length,
    sales_job_titles: salesJobs.map(j => j.job_title),
    is_hiring_sales: salesJobs.length > 0,
    latest_job_date: salesJobs.length > 0
      ? salesJobs.sort((a, b) => 
          new Date(b.datetime_pulled).getTime() - 
          new Date(a.datetime_pulled).getTime()
        )[0].datetime_pulled
      : null
  }
}

// ===========================================
// EXAMPLE 3: Validate Tech Stack
// ===========================================

export async function validateTechStack(
  domain: string,
  requiredTech: string[]
) {
  const result = await sumble.enrichOrganization({
    domain,
    technologies: requiredTech
  })

  const matchScore = (result.technologies_count || 0) / requiredTech.length

  return {
    domain,
    technologies_found: result.technologies_found,
    technologies_count: result.technologies_count,
    match_score: matchScore,
    is_good_fit: matchScore >= 0.67, // At least 2/3 match
    technologies: result.technologies || []
  }
}

// ===========================================
// EXAMPLE 4: Bulk Check Companies
// ===========================================

export async function bulkCheckHiringStatus(companyDomains: string[]) {
  const results = []

  for (const domain of companyDomains) {
    try {
      const status = await checkCompanyHiringStatus(domain)
      results.push({
        domain,
        ...status
      })

      // Rate limit: 10 req/sec, so wait 150ms between requests
      await new Promise(resolve => setTimeout(resolve, 150))
    } catch (error) {
      console.error(`Error checking ${domain}:`, error)
      results.push({
        domain,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
}

// ===========================================
// EXAMPLE 5: Get Personalization Data
// ===========================================

export async function getPersonalizationData(companyDomain: string) {
  const jobs = await sumble.findJobs({
    organization: { domain: companyDomain },
    filters: { since: '2024-12-01' },
    limit: 10
  })

  const salesJobs = jobs.jobs.filter(job => 
    isSalesJobTitle(job.job_title || '')
  )

  if (salesJobs.length === 0) {
    return null
  }

  // Categorize jobs
  const categorized = salesJobs.map(job => ({
    title: job.job_title,
    category: categorizeSalesJob(job.job_title || '').category,
    posted_date: job.datetime_pulled,
    location: job.location,
    description: job.description
  }))

  // Get latest job for personalization
  const latest = salesJobs.sort((a, b) => 
    new Date(b.datetime_pulled).getTime() - 
    new Date(a.datetime_pulled).getTime()
  )[0]

  return {
    company: jobs.jobs[0]?.organization_name,
    total_sales_jobs: salesJobs.length,
    latest_job: {
      title: latest.job_title,
      posted: latest.datetime_pulled,
      location: latest.location,
      url: latest.url
    },
    categorized_jobs: categorized,
    personalization_hook: salesJobs.length >= 3
      ? `I see you're rapidly scaling your sales team (${salesJobs.length} open roles)`
      : `I noticed you recently posted for a ${latest.job_title}`
  }
}
