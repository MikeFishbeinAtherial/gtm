/**
 * Score AI Sales Roleplay Trainer companies (Tier 1 - No API costs)
 * 
 * Scoring criteria:
 * - Job posting signal (50 pts) - MOST IMPORTANT
 * - Company size (25 pts) - 11-500 employees ideal
 * - Contact quality (15 pts) - Decision makers
 * - B2B industry fit (10 pts) - Less important
 * 
 * Run with: npx tsx scripts/score-roleplay-companies.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OFFER_ID = 'd07a584e-46dd-4c9f-8304-f6961a11ec3f';
const LEADS_DIR = path.join(__dirname, '../offers/ai-sales-roleplay-trainer/leads');

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_SECRET_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// B2B industries (clear or likely B2B)
const B2B_INDUSTRIES = new Set([
  'software development',
  'saas',
  'technology, information and internet',
  'it services and it consulting',
  'business consulting and services',
  'financial services',
  'insurance',
  'pharmaceutical manufacturing',
  'medical equipment manufacturing',
  'professional training and coaching',
  'computer and network security',
  'transportation, logistics, supply chain and storage',
  'wholesale',
  'wholesale building materials',
  'manufacturing',
  'engineering services',
  'advertising services',
  'marketing services',
  'public relations and communications services',
  'telecommunications',
  'e-learning providers',
  'hospitals and health care',
  'medical practices',
  'embedded software products'
]);

const LIKELY_B2B_INDUSTRIES = new Set([
  'construction',
  'real estate',
  'facilities services',
  'security and investigations',
  'specialty trade contractors',
  'printing services',
  'book and periodical publishing'
]);

interface CompanyData {
  id: string;
  domain: string;
  name: string;
  size: string | null;
  size_exact: number | null;
  industry: string | null;
  source_tool: string;
}

interface ContactData {
  company_id: string;
  seniority: string | null;
}

// Check if company came from job posting
function getJobSignalScore(company: CompanyData, jobDomains: Set<string>): number {
  const domain = company.domain.toLowerCase();
  
  // Clay = came from jobs export
  if (company.source_tool === 'clay') {
    return 50; // From Clay jobs export
  }
  
  // Sumble + in job domains = from jobs export
  if (company.source_tool === 'sumble' && jobDomains.has(domain)) {
    return 25; // From Sumble jobs export
  }
  
  // Sumble contact only (no job posting)
  return 0;
}

// Score company size (11-500 employees ideal)
function getSizeScore(sizeExact: number | null, sizeRange: string | null): number {
  if (sizeExact) {
    if (sizeExact >= 11 && sizeExact <= 50) return 25; // Small but growing
    if (sizeExact >= 51 && sizeExact <= 200) return 25; // Scaling fast
    if (sizeExact >= 201 && sizeExact <= 500) return 20; // Still good
    if (sizeExact >= 501 && sizeExact <= 1000) return 10; // Possible
    if (sizeExact >= 1 && sizeExact <= 10) return 0; // Too small
    if (sizeExact > 1000) return 0; // Too large
  }
  
  // Fallback to size range
  if (sizeRange) {
    const range = sizeRange.toLowerCase();
    if (range === '11-50') return 25;
    if (range === '51-200') return 25;
    if (range === '201-500') return 20;
    if (range === '501-1000') return 10;
    if (range === '1-10') return 0;
    if (range === '1000+') return 0;
  }
  
  return 0;
}

// Score based on industry B2B fit
function getIndustryScore(industry: string | null): number {
  if (!industry) return 5; // Neutral if unknown
  
  const ind = industry.toLowerCase();
  
  if (B2B_INDUSTRIES.has(ind)) return 10; // Clear B2B
  if (LIKELY_B2B_INDUSTRIES.has(ind)) return 5; // Likely B2B
  
  // B2C indicators (0 points)
  const b2cKeywords = ['retail', 'consumer', 'food and beverage', 'restaurant', 'hospitality'];
  if (b2cKeywords.some(kw => ind.includes(kw))) return 0;
  
  return 5; // Unknown, give neutral score
}

// Score based on contact seniority
function getContactScore(contacts: ContactData[]): number {
  if (contacts.length === 0) return 0;
  
  const seniorities = contacts.map(c => c.seniority).filter(Boolean);
  
  if (seniorities.includes('c_level')) return 15; // C-level contact
  if (seniorities.includes('vp')) return 12; // VP level
  if (seniorities.includes('director')) return 10; // Director/Head
  if (contacts.length > 1) return 5; // Multiple contacts
  if (contacts.length === 1) return 3; // Single contact
  
  return 0;
}

// Calculate total score and reasoning
function calculateScore(
  company: CompanyData,
  contacts: ContactData[],
  jobDomains: Set<string>
): { score: number; reasoning: any; priority: string } {
  const jobSignal = getJobSignalScore(company, jobDomains);
  const sizeScore = getSizeScore(company.size_exact, company.size);
  const industryScore = getIndustryScore(company.industry);
  const contactScore = getContactScore(contacts);
  
  const totalScore = jobSignal + sizeScore + industryScore + contactScore;
  
  // Determine priority
  let priority = 'low';
  if (totalScore >= 85) priority = 'critical';
  else if (totalScore >= 70) priority = 'high';
  else if (totalScore >= 55) priority = 'medium';
  
  const reasoning = {
    job_signal: { score: jobSignal, max: 50 },
    size: { score: sizeScore, max: 25, value: company.size_exact || company.size },
    industry: { score: industryScore, max: 10, value: company.industry },
    contacts: { score: contactScore, max: 15, count: contacts.length },
    total: totalScore
  };
  
  return { score: totalScore, reasoning, priority };
}

async function main() {
  console.log('=== Scoring AI Sales Roleplay Trainer Companies (Tier 1) ===\n');
  
  // Load job posting domains from Sumble
  console.log('Loading job posting signals from Sumble...');
  const sumbleJobDomains = new Set<string>();
  const jobsCsvPath = path.join(LEADS_DIR, 'roleplay_jobs_sumble_export_20260114_203247.csv');
  
  if (fs.existsSync(jobsCsvPath)) {
    const csvContent = fs.readFileSync(jobsCsvPath, 'utf-8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    const domainIdx = headers.findIndex(h => h.includes('organization_domain'));
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols[domainIdx]) {
        const domain = cols[domainIdx].trim().toLowerCase().replace(/"/g, '');
        if (domain) sumbleJobDomains.add(domain);
      }
    }
  }
  
  console.log(`Found ${sumbleJobDomains.size} Sumble companies with job postings\n`);
  
  // Fetch all companies for this offer (with pagination)
  console.log('Fetching companies from Supabase...');
  let allCompanies: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, domain, name, size, size_exact, industry, source_tool')
      .eq('offer_id', OFFER_ID)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error('Error fetching companies:', error);
      process.exit(1);
    }
    
    if (!data || data.length === 0) break;
    allCompanies = allCompanies.concat(data);
    page++;
    console.log(`  Loaded ${allCompanies.length} companies so far...`);
    
    if (data.length < pageSize) break;
  }
  
  console.log(`Total companies loaded: ${allCompanies.length}\n`);
  
  // Fetch all contacts for this offer (with pagination)
  console.log('Fetching contacts from Supabase...');
  let allContacts: any[] = [];
  page = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from('contacts')
      .select('company_id, seniority')
      .eq('offer_id', OFFER_ID)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error('Error fetching contacts:', error);
      process.exit(1);
    }
    
    if (!data || data.length === 0) break;
    allContacts = allContacts.concat(data);
    page++;
    console.log(`  Loaded ${allContacts.length} contacts so far...`);
    
    if (data.length < pageSize) break;
  }
  
  console.log(`Total contacts loaded: ${allContacts.length}\n`);
  
  const companies = allCompanies;
  const contacts = allContacts;
  
  // Group contacts by company
  const contactsByCompany = new Map<string, ContactData[]>();
  for (const contact of contacts || []) {
    if (!contactsByCompany.has(contact.company_id)) {
      contactsByCompany.set(contact.company_id, []);
    }
    contactsByCompany.get(contact.company_id)!.push(contact);
  }
  
  // Score each company
  console.log('Calculating scores...\n');
  const updates: any[] = [];
  const scoreDist = { critical: 0, high: 0, medium: 0, low: 0 };
  
  for (const company of companies || []) {
    const companyContacts = contactsByCompany.get(company.id) || [];
    const { score, reasoning, priority } = calculateScore(company, companyContacts, sumbleJobDomains);
    
    updates.push({
      id: company.id,
      fit_score: score,
      fit_reasoning: reasoning,
      priority: priority
    });
    
    scoreDist[priority as keyof typeof scoreDist]++;
  }
  
  // Update companies one at a time (batch updates with multiple IDs not supported)
  console.log('Updating Supabase with scores...');
  let updated = 0;
  let failed = 0;
  
  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    
    const { error } = await supabase
      .from('companies')
      .update({
        fit_score: update.fit_score,
        fit_reasoning: update.fit_reasoning,
        priority: update.priority
      })
      .eq('id', update.id);
    
    if (error) {
      failed++;
      if (failed <= 5) {
        console.error(`Error updating company ${update.id}:`, error.message);
      }
    } else {
      updated++;
    }
    
    if ((i + 1) % 500 === 0 || i + 1 === updates.length) {
      console.log(`  Progress: ${i + 1} / ${updates.length} (${updated} updated, ${failed} failed)`);
    }
  }
  
  console.log(`\n✅ Updated ${updated} companies with scores\n`);
  
  // Show distribution
  console.log('=== SCORE DISTRIBUTION ===\n');
  console.log(`Critical (85-100): ${scoreDist.critical} companies`);
  console.log(`High (70-84):      ${scoreDist.high} companies`);
  console.log(`Medium (55-69):    ${scoreDist.medium} companies`);
  console.log(`Low (<55):         ${scoreDist.low} companies`);
  
  // Show top 10 companies
  console.log('\n=== TOP 10 COMPANIES ===\n');
  const { data: topCompanies } = await supabase
    .from('companies')
    .select('name, domain, fit_score, priority, fit_reasoning')
    .eq('offer_id', OFFER_ID)
    .order('fit_score', { ascending: false })
    .limit(10);
  
  for (let i = 0; i < (topCompanies?.length || 0); i++) {
    const c = topCompanies![i];
    console.log(`${i + 1}. ${c.name} (${c.domain})`);
    console.log(`   Score: ${c.fit_score} | Priority: ${c.priority?.toUpperCase() || 'UNKNOWN'}`);
    if (c.fit_reasoning) {
      console.log(`   Job: ${c.fit_reasoning.job_signal.score}/50 | Size: ${c.fit_reasoning.size.score}/25 | Contacts: ${c.fit_reasoning.contacts.score}/15`);
    }
    console.log();
  }
}

main().catch(console.error);
