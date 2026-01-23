/**
 * Import AI Sales Roleplay Trainer leads into Supabase
 * 
 * This script imports companies and contacts from pre-processed JSON files.
 * 
 * Run with: npx tsx scripts/import-roleplay-leads.ts
 * 
 * Sources (already processed into JSON):
 * - Clay companies (from jobs export): 1,554 unique companies
 * - Sumble jobs: 1,231 unique companies  
 * - Sumble contacts: 2,188 contacts at 1,117 companies
 * 
 * Combined: 3,829 unique companies (minimal overlap between sources)
 */

import * as dotenv from 'dotenv';
// Load environment variables from .env.local and .env
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OFFER_ID = 'd07a584e-46dd-4c9f-8304-f6961a11ec3f';
const LEADS_DIR = path.join(__dirname, '../offers/ai-sales-roleplay-trainer/leads');

// Supabase client - use available env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Try service role key first, then secret key, then anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_SECRET_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log(`Using Supabase URL: ${supabaseUrl}`);
console.log(`Using key type: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : process.env.SUPABASE_SECRET_KEY ? 'secret' : 'anon'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

// Types (matching the JSON structure from our preprocessing)
interface Company {
  domain: string;
  name: string;
  description?: string;
  industry?: string;
  size?: string | null;
  size_exact?: number | null;
  website?: string;
  linkedin_url?: string;
  source_tool: string;
}

interface Contact {
  domain: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  title: string;
  seniority?: string | null;
  linkedin_url?: string;
  email?: string | null;
  location?: string;
  source_tool: string;
}

// Load pre-processed companies from JSON
function loadCompanies(): Company[] {
  const filePath = path.join(LEADS_DIR, '_import_companies.json');
  if (!fs.existsSync(filePath)) {
    console.error(`Companies JSON file not found: ${filePath}`);
    console.error('Run the preprocessing step first to create the JSON files.');
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const companies = JSON.parse(content) as Company[];
  console.log(`Loaded ${companies.length} companies from JSON`);
  return companies;
}

// Load pre-processed contacts from JSON
function loadContacts(): Contact[] {
  const filePath = path.join(LEADS_DIR, '_import_contacts.json');
  if (!fs.existsSync(filePath)) {
    console.error(`Contacts JSON file not found: ${filePath}`);
    console.error('Run the preprocessing step first to create the JSON files.');
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const contacts = JSON.parse(content) as Contact[];
  console.log(`Loaded ${contacts.length} contacts from JSON`);
  return contacts;
}

async function importCompanies(companies: Company[]): Promise<Map<string, string>> {
  const domainToId = new Map<string, string>();
  const batchSize = 100;
  let imported = 0;
  let skipped = 0;
  
  console.log(`\nImporting ${companies.length} companies in batches of ${batchSize}...`);
  
  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('companies')
      .upsert(
        batch.map(c => ({
          offer_id: OFFER_ID,
          name: c.name.substring(0, 255),
          domain: c.domain,
          url: c.website || null,
          description: c.description?.substring(0, 1000) || null,
          size: c.size || null,
          size_exact: c.size_exact || null,
          industry: c.industry || null,
          source_tool: c.source_tool,
          source_raw: c.linkedin_url ? { linkedin_url: c.linkedin_url } : null,
          status: 'new'
        })),
        { onConflict: 'offer_id,domain', ignoreDuplicates: false }
      )
      .select('id, domain');
    
    if (error) {
      console.error(`Error importing batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      skipped += batch.length;
    } else if (data) {
      for (const row of data) {
        domainToId.set(row.domain, row.id);
      }
      imported += data.length;
    }
    
    // Progress update every 500 records or at the end
    if ((i + batchSize) % 500 === 0 || i + batchSize >= companies.length) {
      console.log(`  Progress: ${Math.min(i + batchSize, companies.length)} / ${companies.length}`);
    }
  }
  
  console.log(`Companies imported: ${imported}, skipped: ${skipped}`);
  return domainToId;
}

async function importContacts(contacts: Contact[], domainToId: Map<string, string>): Promise<void> {
  const batchSize = 100;
  let imported = 0;
  let skipped = 0;
  let noCompany = 0;
  
  console.log(`\nImporting ${contacts.length} contacts in batches of ${batchSize}...`);
  
  // Filter contacts to those with matching companies
  const contactsWithCompanies = contacts.filter(c => {
    if (!domainToId.has(c.domain)) {
      noCompany++;
      return false;
    }
    return true;
  });
  
  console.log(`  ${contactsWithCompanies.length} contacts have matching companies, ${noCompany} skipped (no company)`);
  
  for (let i = 0; i < contactsWithCompanies.length; i += batchSize) {
    const batch = contactsWithCompanies.slice(i, i + batchSize);
    
    // Use regular insert (not upsert) since the unique constraint may not exist
    const { data, error } = await supabase
      .from('contacts')
      .insert(
        batch.map(c => ({
          offer_id: OFFER_ID,
          company_id: domainToId.get(c.domain),
          first_name: c.first_name || null,
          last_name: c.last_name || null,
          full_name: c.full_name?.substring(0, 255) || null,
          title: c.title?.substring(0, 255) || null,
          seniority: c.seniority || null,
          linkedin_url: c.linkedin_url || null,
          email: c.email || null,
          source_tool: c.source_tool,
          source_raw: c.location ? { location: c.location } : null,
          status: c.email ? 'enriched' : 'new'
        }))
      )
      .select('id');
    
    if (error) {
      console.error(`Error importing contacts batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      skipped += batch.length;
    } else if (data) {
      imported += data.length;
    }
    
    if ((i + batchSize) % 500 === 0 || i + batchSize >= contactsWithCompanies.length) {
      console.log(`  Progress: ${Math.min(i + batchSize, contactsWithCompanies.length)} / ${contactsWithCompanies.length}`);
    }
  }
  
  console.log(`Contacts imported: ${imported}, skipped: ${skipped}`);
}

async function getStats(): Promise<void> {
  console.log('\n=== FINAL COUNTS ===\n');
  
  // Total companies
  const { count: totalCompanies } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', OFFER_ID);
  
  // Total contacts
  const { count: totalContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', OFFER_ID);
  
  // Companies with contacts
  const { data: companiesWithContacts } = await supabase
    .from('companies')
    .select('id, contacts!inner(id)')
    .eq('offer_id', OFFER_ID);
  
  const withContacts = companiesWithContacts?.length || 0;
  const withoutContacts = (totalCompanies || 0) - withContacts;
  
  // Contacts with emails
  const { count: contactsWithEmail } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', OFFER_ID)
    .not('email', 'is', null);
  
  console.log(`Total Companies: ${totalCompanies}`);
  console.log(`Total Contacts: ${totalContacts}`);
  console.log(`Companies WITH contacts: ${withContacts}`);
  console.log(`Companies WITHOUT contacts: ${withoutContacts} (need to find contacts)`);
  console.log(`Contacts WITH email: ${contactsWithEmail}`);
  console.log(`Contacts WITHOUT email: ${(totalContacts || 0) - (contactsWithEmail || 0)} (need email enrichment)`);
}

async function main() {
  console.log('=== AI Sales Roleplay Trainer - Lead Import ===\n');
  console.log(`Offer ID: ${OFFER_ID}\n`);
  
  // Load pre-processed data from JSON files
  // (These files were created by the preprocessing step)
  const companies = loadCompanies();
  const contacts = loadContacts();
  
  // Import companies first (creates domain -> id mapping)
  const domainToId = await importCompanies(companies);
  
  // Import contacts (linked to companies by domain)
  await importContacts(contacts, domainToId);
  
  // Show final stats
  await getStats();
}

main().catch(console.error);
