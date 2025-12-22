/**
 * Example: Use Sumble Jobs API to find companies with hiring signals
 * 
 * This script demonstrates how to:
 * 1. Find companies hiring for specific technologies
 * 2. Group results by company
 * 3. Prioritize companies with multiple openings
 * 4. Extract personalization data from job postings
 * 
 * Run: npx tsx scripts/sumble-find-companies.ts
 */

// Load environment variables FIRST
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// THEN import the client
import { SumbleClient } from '../src/lib/clients/sumble'

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(colors[color] + message + colors.reset)
}

async function main() {
  log('\n🔍 Finding Companies with Hiring Signals\n', 'blue')

  // Create a new Sumble client instance (env vars are now loaded)
  const sumble = new SumbleClient()

  // STEP 1: Find companies hiring for your target technologies
  log('1️⃣  Searching for companies hiring Python + AWS engineers...', 'yellow')
  
  const jobs = await sumble.findJobs({
    filters: {
      technologies: ['python', 'aws'],  // Target tech stack
      countries: ['US'],                 // Geographic filter
      since: '2024-11-01'                // Only recent postings (last ~2 months)
    },
    limit: 50  // Get up to 50 jobs (150 credits max)
  })

  log(`✅ Found ${jobs.total} total jobs`, 'green')
  log(`   Retrieved ${jobs.jobs.length} job details`, 'dim')
  log(`   Credits used: ${jobs.credits_used}, remaining: ${jobs.credits_remaining}`, 'dim')

  // STEP 2: Group by company and count openings
  log('\n2️⃣  Grouping by company...', 'yellow')
  
  interface CompanyData {
    name: string
    domain: string
    jobCount: number
    jobs: typeof jobs.jobs
    latestJob: typeof jobs.jobs[0]
  }

  const companiesByDomain = jobs.jobs
    .filter(job => job.organization_domain)  // Filter out jobs without domain
    .reduce((acc, job) => {
      const domain = job.organization_domain!
      
      if (!acc[domain]) {
        acc[domain] = {
          name: job.organization_name,
          domain,
          jobCount: 0,
          jobs: [],
          latestJob: job
        }
      }
      
      acc[domain].jobCount++
      acc[domain].jobs.push(job)
      
      // Keep the most recent job as latestJob
      if (new Date(job.datetime_pulled) > new Date(acc[domain].latestJob.datetime_pulled)) {
        acc[domain].latestJob = job
      }
      
      return acc
    }, {} as Record<string, CompanyData>)

  const companies = Object.values(companiesByDomain)
    .sort((a, b) => b.jobCount - a.jobCount)  // Sort by most openings first

  log(`✅ Found ${companies.length} unique companies`, 'green')

  // STEP 3: Show top companies with multiple openings
  log('\n3️⃣  Top Companies (by number of openings):\n', 'yellow')
  
  const topCompanies = companies.slice(0, 10)
  
  topCompanies.forEach((company, index) => {
    log(`${index + 1}. ${company.name}`, 'bold')
    log(`   Domain: ${company.domain}`, 'dim')
    log(`   Open positions: ${company.jobCount}`, company.jobCount >= 5 ? 'green' : 'dim')
    log(`   Latest: ${company.latestJob.job_title}`, 'dim')
    log(`   Location: ${company.latestJob.location}`, 'dim')
    log(`   Posted: ${new Date(company.latestJob.datetime_pulled).toLocaleDateString()}`, 'dim')
    
    if (company.latestJob.matched_technologies) {
      log(`   Tech: ${company.latestJob.matched_technologies}`, 'blue')
    }
    
    log('')  // Empty line
  })

  // STEP 4: Show personalization example
  log('4️⃣  Personalization Example:\n', 'yellow')
  
  const targetCompany = topCompanies[0]
  
  log(`Company: ${targetCompany.name}`, 'bold')
  log('\nPersonalized outreach hook:', 'blue')
  
  let hook = ''
  if (targetCompany.jobCount >= 5) {
    hook = `I see ${targetCompany.name} is rapidly scaling (${targetCompany.jobCount} open roles in engineering). `
  } else if (targetCompany.jobCount > 1) {
    hook = `I noticed ${targetCompany.name} is growing your team (${targetCompany.jobCount} open positions). `
  } else {
    hook = `I saw you recently posted for a ${targetCompany.latestJob.job_title}. `
  }

  if (targetCompany.latestJob.matched_technologies) {
    hook += `As you're building with ${targetCompany.latestJob.matched_technologies}, `
  }

  hook += `I thought this might be relevant...`

  log(`"${hook}"`, 'dim')
  log(`\nJob URL: ${targetCompany.latestJob.url}`, 'dim')

  // STEP 5: Summary and next steps
  log('\n✅ Summary:\n', 'green')
  log(`• Found ${companies.length} companies actively hiring`, 'dim')
  log(`• ${companies.filter(c => c.jobCount >= 3).length} companies with 3+ openings (hot leads!)`, 'dim')
  log(`• ${companies.filter(c => c.jobCount >= 5).length} companies with 5+ openings (scaling fast!)`, 'dim')
  log(`• Credits remaining: ${jobs.credits_remaining}`, 'dim')
  
  log('\n💡 Next Steps:\n', 'yellow')
  log('1. Export these companies to your CRM or Supabase', 'dim')
  log('2. Use enrichment API to get team size data', 'dim')
  log('3. Find contacts at these companies (via Parallel or Leadmagic)', 'dim')
  log('4. Generate personalized copy using job posting details', 'dim')
  log('5. Reach out while the hiring need is still urgent!\n', 'dim')
}

main().catch(error => {
  log('\n💥 Error occurred:', 'red')
  console.error(error)
  process.exit(1)
})

