/**
 * Lead Pipeline Runner
 *
 * Runs a simple multi-step pipeline:
 * 1) Find companies
 * 2) Find contacts
 * 3) Enrich emails
 *
 * Usage (Mac terminal):
 *   npx ts-node scripts/run-lead-pipeline.ts --offer-id <UUID> --steps find_companies,find_contacts,enrich_emails
 */

import * as dotenv from 'dotenv'

// Load env FIRST before importing clients
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'
import { findCompanies, findContacts } from '../src/core/index.ts'
import { leadmagic } from '../src/lib/clients/leadmagic.ts'

// -------------------------
// Helpers (simple parsing)
// -------------------------
function getArg(name: string, fallback?: string) {
  const value = process.argv.find(arg => arg.startsWith(name + '='))?.split('=')[1]
  if (value) return value
  const index = process.argv.findIndex(arg => arg === name)
  if (index >= 0) return process.argv[index + 1]
  return fallback
}

function toInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// -------------------------
// Environment
// -------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// -------------------------
// Inputs
// -------------------------
const offerId = getArg('--offer-id', process.env.OFFER_ID)
const campaignId = getArg('--campaign-id', process.env.CAMPAIGN_ID)
const stepsRaw = getArg('--steps', process.env.STEPS || 'find_companies,find_contacts,enrich_emails')
const companyLimit = toInt(getArg('--company-limit', process.env.COMPANY_LIMIT), 30)
const maxPerCompany = toInt(getArg('--max-per-company', process.env.MAX_PER_COMPANY), 3)

if (!offerId) {
  console.error('❌ Missing offer_id (use --offer-id or OFFER_ID)')
  process.exit(1)
}

const steps = stepsRaw.split(',').map(s => s.trim()).filter(Boolean)

// -------------------------
// Pipeline runner
// -------------------------
async function runPipeline() {
  console.log('🚀 Starting lead pipeline...')
  console.log(`Offer: ${offerId}`)
  console.log(`Steps: ${steps.join(', ')}`)

  // Create pipeline run
  const { data: pipelineRun, error: runError } = await supabase
    .from('pipeline_runs')
    .insert({
      offer_id: offerId,
      campaign_id: campaignId || null,
      steps,
      input_params: {
        company_limit: companyLimit,
        max_per_company: maxPerCompany
      }
    })
    .select()
    .single()

  if (runError || !pipelineRun) {
    throw new Error(`Failed to create pipeline run: ${runError?.message}`)
  }

  // Create step records
  const stepRows = steps.map(step => ({
    pipeline_run_id: pipelineRun.id,
    step_name: step,
    status: 'pending'
  }))

  await supabase.from('pipeline_steps').insert(stepRows)

  const summary: Record<string, unknown> = {}

  try {
    for (const step of steps) {
      await updateStepStatus(pipelineRun.id, step, 'running')

      if (step === 'find_companies') {
        const result = await findCompanies({
          offer_id: offerId,
          limit: companyLimit
        })

        summary.find_companies = {
          total_found: result.total_found,
          saved: result.companies.length
        }

        await updateStepStatus(pipelineRun.id, step, 'completed', summary.find_companies)
      } else if (step === 'find_contacts') {
        const result = await findContacts({
          offer_id: offerId,
          max_per_company: maxPerCompany,
          enrich_emails: false
        })

        summary.find_contacts = {
          total_found: result.total_found,
          companies_processed: result.companies_processed
        }

        await updateStepStatus(pipelineRun.id, step, 'completed', summary.find_contacts)
      } else if (step === 'enrich_emails') {
        const result = await enrichEmailsForOffer(offerId)
        summary.enrich_emails = result
        await updateStepStatus(pipelineRun.id, step, 'completed', summary.enrich_emails)
      } else {
        await updateStepStatus(pipelineRun.id, step, 'skipped', { reason: 'Unknown step' })
      }
    }

    await supabase
      .from('pipeline_runs')
      .update({
        status: 'completed',
        output_summary: summary,
        completed_at: new Date().toISOString()
      })
      .eq('id', pipelineRun.id)

    console.log('✅ Pipeline complete')
  } catch (error: any) {
    await supabase
      .from('pipeline_runs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', pipelineRun.id)

    console.error('❌ Pipeline failed:', error.message)
    process.exit(1)
  }
}

async function updateStepStatus(
  pipelineRunId: string,
  stepName: string,
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped',
  stepOutput?: Record<string, unknown>
) {
  await supabase
    .from('pipeline_steps')
    .update({
      status,
      step_output: stepOutput || null,
      started_at: status === 'running' ? new Date().toISOString() : undefined,
      completed_at: status === 'completed' || status === 'failed' || status === 'skipped'
        ? new Date().toISOString()
        : undefined
    })
    .eq('pipeline_run_id', pipelineRunId)
    .eq('step_name', stepName)
}

async function enrichEmailsForOffer(offerId: string) {
  const { data: rows, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, linkedin_url, company:companies(domain, name)')
    .eq('offer_id', offerId)
    .is('email', null)
    .limit(50)

  if (error) {
    throw new Error(`Failed to load contacts for enrichment: ${error.message}`)
  }

  if (!rows || rows.length === 0) {
    return { enriched: 0, attempted: 0 }
  }

  const requests = rows
    .map(row => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      domain: row.company?.domain,
      linkedin_url: row.linkedin_url || undefined
    }))
    .filter(row => row.first_name && row.last_name && row.domain)

  const people = requests.map(r => ({
    first_name: r.first_name!,
    last_name: r.last_name!,
    domain: r.domain!,
    linkedin_url: r.linkedin_url
  }))

  const results = await leadmagic.bulkFindEmails(people)
  let enrichedCount = 0

  for (let i = 0; i < results.length; i += 1) {
    const person = results[i]
    const request = requests[i]
    if (!person?.emails?.length) continue

    const bestEmail = person.emails.find(e => e.verified) || person.emails[0]
    const emailStatus = bestEmail.verified ? 'valid' : 'risky'

    await supabase
      .from('contacts')
      .update({
        email: bestEmail.email,
        email_status: emailStatus,
        email_verification_source: 'leadmagic'
      })
      .eq('id', request.id)

    enrichedCount += 1
  }

  return { enriched: enrichedCount, attempted: requests.length }
}

runPipeline().catch(error => {
  console.error('❌ Pipeline crashed:', error)
  process.exit(1)
})
