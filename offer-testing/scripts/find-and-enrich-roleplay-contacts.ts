/**
 * Find contacts and enrich emails for AI Sales Roleplay Trainer critical companies
 * 
 * Step 1: Find contacts using Exa (for companies missing contacts)
 * Step 2: Enrich emails using FullEnrich (for all contacts missing emails)
 * 
 * Usage:
 *   npx tsx scripts/find-and-enrich-roleplay-contacts.ts [--limit 50] [--max-contacts-per-company 2] [--skip-find false] [--skip-enrich false]
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { exaSearchPeople, type ExaPerson } from '../src/lib/clients/exa.ts';
import { fullenrich } from '../src/lib/clients/fullenrich.ts';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const OFFER_ID = 'd07a584e-46dd-4c9f-8304-f6961a11ec3f';

// Sales titles to search for (decision makers for sales training)
const SALES_TITLES = [
  'VP Sales',
  'Vice President of Sales',
  'Head of Sales',
  'Chief Revenue Officer',
  'CRO',
  'Sales Director',
  'Director of Sales',
  'VP Business Development',
  'Head of Business Development',
];

function getArg(name: string, defaultValue?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return defaultValue;
  return process.argv[idx + 1] ?? defaultValue;
}

const LIMIT = Number(getArg('limit', '50'));
const MAX_PER_COMPANY = Number(getArg('max-contacts-per-company', '2'));
const SKIP_FIND = getArg('skip-find', 'false') === 'true';
const SKIP_ENRICH = getArg('skip-enrich', 'false') === 'true';

function splitName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  };
}

async function findContacts() {
  console.log('\n🔍 STEP 1: Finding Contacts with Exa\n');
  console.log(`Processing: ${LIMIT} critical companies`);
  console.log(`Max contacts per company: ${MAX_PER_COMPANY}\n`);

  // Get all critical companies
  const { data: allCompanies } = await supabase
    .from('companies')
    .select('id, name, domain')
    .eq('offer_id', OFFER_ID)
    .eq('priority', 'critical')
    .limit(1000);

  if (!allCompanies || allCompanies.length === 0) {
    console.log('✅ No critical companies found');
    return;
  }

  // Get companies that have contacts
  const { data: contactsData } = await supabase
    .from('contacts')
    .select('company_id')
    .eq('offer_id', OFFER_ID)
    .in('company_id', allCompanies.map((c) => c.id));

  const companiesWithContactsSet = new Set(
    contactsData?.map((c) => c.company_id) || []
  );

  // Filter to companies without contacts
  const companiesWithoutContacts = allCompanies.filter(
    (c) => !companiesWithContactsSet.has(c.id)
  );

  if (companiesWithoutContacts.length === 0) {
    console.log('✅ All critical companies already have contacts');
    return;
  }

  // Limit to requested amount
  const companies = companiesWithoutContacts.slice(0, LIMIT);

  if (!companies || companies.length === 0) {
    console.log('✅ All critical companies already have contacts');
    return;
  }

  console.log(`📊 Found ${companies.length} companies needing contacts\n`);

  let totalContactsFound = 0;
  let companiesProcessed = 0;

  for (const company of companies) {
    companiesProcessed++;
    console.log(`\n[${companiesProcessed}/${companies.length}] ${company.name} (${company.domain})`);

    // Search for contacts using Exa
    const contactsFound: ExaPerson[] = [];

    for (const title of SALES_TITLES.slice(0, 3)) {
      // Try top 3 titles first
      if (contactsFound.length >= MAX_PER_COMPANY) break;

      try {
        const query = `${title} at ${company.name}`;
        console.log(`   🔍 Searching: ${query}`);

        const results = await exaSearchPeople({
          query,
          num_results: 5,
          include_domains: ['linkedin.com'],
        });

        // Filter to this company and exclude non-person results
        const companyContacts = results.results.filter((person: ExaPerson) => {
          const name = person.name?.toLowerCase() || '';
          const title = person.title?.toLowerCase() || '';
          const url = person.linkedin_url?.toLowerCase() || '';
          
          // Skip if it's clearly not a person (job postings, company pages, etc.)
          const skipPatterns = [
            "'s post",
            "hiring",
            "job",
            "jobs",
            "careers",
            "job posting",
            "posted on",
            "posted about",
            "just posted",
            "profiles", // "40+ profiles"
            "uses", // "Company uses..."
            "posted", // Generic posts
            "expands", // Company news
            "welcomes", // Company announcements
          ];
          
          if (skipPatterns.some(pattern => name.includes(pattern) || title.includes(pattern))) {
            return false;
          }
          
          // Skip if URL doesn't look like a person profile (should be /in/username)
          if (url && !url.includes('/in/') && !url.includes('/sales-navigator/')) {
            return false;
          }

          // Must have a name that looks like a person (at least 2 words, not too long)
          const nameParts = person.name?.split(' ') || [];
          if (nameParts.length < 2 || nameParts.length > 5) {
            return false;
          }
          
          // Skip if name looks like a company name (all caps, has "Inc", "LLC", etc.)
          if (name.match(/\b(inc|llc|ltd|corp|corporation|company|group|solutions|systems)\b/i)) {
            return false;
          }

          // Check if person is at this company
          const personCompany = person.company?.toLowerCase() || '';
          const companyName = company.name.toLowerCase();
          const domain = company.domain?.toLowerCase() || '';
          
          // More flexible matching
          const companyMatch = 
            personCompany.includes(companyName) ||
            companyName.includes(personCompany) ||
            personCompany.includes(domain) ||
            domain.includes(personCompany) ||
            (domain && personCompany.includes(domain.split('.')[0])); // Match domain without TLD
          
          return companyMatch;
        });

        contactsFound.push(
          ...companyContacts.slice(0, MAX_PER_COMPANY - contactsFound.length)
        );

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error(`   ❌ Error searching for ${title}:`, error.message);
      }
    }

    if (contactsFound.length === 0) {
      console.log(`   ⚠️  No contacts found`);
      continue;
    }

    console.log(`   ✅ Found ${contactsFound.length} contacts`);

    // Save contacts to Supabase
    for (const person of contactsFound) {
      try {
        const { first_name, last_name } = splitName(person.name || '');

        if (!first_name) {
          console.log(`      ⚠️  Skipping ${person.name} - no first name`);
          continue;
        }

        const { data: contact, error } = await supabase
          .from('contacts')
          .insert({
            offer_id: OFFER_ID,
            company_id: company.id,
            first_name,
            last_name,
            full_name: person.name,
            title: person.title || null,
            linkedin_url: person.linkedin_url || null,
            source_tool: 'exa',
            source_raw: {
              exa: {
                query: `${person.title} at ${company.name}`,
                result: {
                  name: person.name,
                  title: person.title,
                  company: person.company,
                  linkedin_url: person.linkedin_url,
                  score: person.score,
                },
              },
            },
            status: 'new',
          })
          .select('id')
          .single();

        if (error) {
          if (error.code === '23505') {
            // Unique constraint violation
            console.log(`      ⏭️  ${person.name} already exists`);
          } else {
            console.error(`      ❌ Error saving ${person.name}:`, error.message);
          }
        } else {
          console.log(`      ✅ Saved: ${person.name} (${person.title || 'No title'})`);
          totalContactsFound++;
        }
      } catch (error: any) {
        console.error(`      ❌ Error processing ${person.name}:`, error.message);
      }
    }
  }

  console.log(`\n\n✅ Contact Finding Complete!`);
  console.log(`   Companies processed: ${companiesProcessed}`);
  console.log(`   Contacts found: ${totalContactsFound}`);
}

async function enrichEmails() {
  console.log('\n\n📧 STEP 2: Enriching Emails with FullEnrich\n');

  // Check FullEnrich API key is set
  if (!process.env.FULLENRICH_API_KEY) {
    console.error('❌ FULLENRICH_API_KEY not set in .env.local');
    return;
  }
  
  console.log('✅ FullEnrich API key found\n');

  // Get all contacts at critical companies without emails
  const { data: contacts } = await supabase
    .from('contacts')
    .select(`
      id,
      first_name,
      last_name,
      full_name,
      linkedin_url,
      email,
      companies!inner(id, name, domain, priority)
    `)
    .eq('offer_id', OFFER_ID)
    .eq('companies.priority', 'critical')
    .is('email', null)
    .not('first_name', 'is', null)
    .not('last_name', 'is', null);

  if (!contacts || contacts.length === 0) {
    console.log('✅ All contacts already have emails');
    return;
  }

  console.log(`📊 Found ${contacts.length} contacts needing email enrichment\n`);

  let enriched = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const company = (contact as any).companies;

    console.log(
      `\n[${i + 1}/${contacts.length}] ${contact.full_name || `${contact.first_name} ${contact.last_name}`} at ${company.name}`
    );

    // Skip if missing required fields
    if (!contact.first_name || !contact.last_name || !company.domain) {
      console.log(`   ⏭️  Skipping - missing required fields`);
      skipped++;
      continue;
    }

    try {
      // Submit enrichment request
      const enrichment = await fullenrich.enrichContact(
        {
          firstname: contact.first_name,
          lastname: contact.last_name,
          domain: company.domain,
          company_name: company.name,
          linkedin_url: contact.linkedin_url || undefined,
          enrich_fields: ['contact.emails'], // Work email (1 credit)
          custom: {
            contact_id: contact.id,
            company_id: company.id,
          },
        },
        `Roleplay Trainer - ${contact.full_name || contact.first_name} ${contact.last_name}`
      );

      console.log(
        `   ⏳ Waiting for FullEnrich results (enrichment_id: ${enrichment.enrichment_id})...`
      );

      // Wait for results (FullEnrich is async, typically 30-90 seconds)
      const statusResponse = await fullenrich.waitForCompletion(
        enrichment.enrichment_id,
        120, // max 2 minutes wait
        10 // check every 10 seconds
      );

      if (!statusResponse || statusResponse.status !== 'FINISHED') {
        console.log(`   ⚠️  Enrichment not finished: ${statusResponse?.status || 'timeout'}`);
        failed++;
        continue;
      }

      const bestEmail = fullenrich.getBestEmail(statusResponse);
      if (!bestEmail) {
        console.log(`   ⚠️  No email found`);
        failed++;
        continue;
      }

      // Determine email status
      const contactData = statusResponse.datas?.[0]?.contact;
      let email_status = 'unknown';
      if (
        contactData?.most_probable_email_status === 'HIGH_PROBABILITY' ||
        contactData?.emails?.some(
          (e: any) => e.email === bestEmail && e.status === 'DELIVERABLE'
        )
      ) {
        email_status = 'valid';
      }

      // Update contact with email
      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          email: bestEmail,
          email_status: email_status,
          status: email_status === 'valid' ? 'ready' : 'enriched',
          source_raw: {
            ...((contact as any).source_raw || {}),
            fullenrich: {
              enrichment_id: enrichment.enrichment_id,
              status: statusResponse.status,
              email: bestEmail,
              email_status: email_status,
            },
          },
        })
        .eq('id', contact.id);

      if (updateError) {
        console.error(`   ❌ Error updating contact:`, updateError.message);
        failed++;
      } else {
        console.log(`   ✅ Email found: ${bestEmail} (${email_status})`);
        enriched++;
      }
    } catch (error: any) {
      console.error(`   ❌ Error enriching ${contact.full_name}:`, error.message);
      failed++;
    }
  }

  console.log(`\n\n✅ Email Enrichment Complete!`);
  console.log(`   Contacts processed: ${contacts.length}`);
  console.log(`   Emails found: ${enriched}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped: ${skipped}`);
}

async function main() {
  console.log('=== Find & Enrich Contacts for AI Sales Roleplay Trainer ===\n');
  console.log(`Offer ID: ${OFFER_ID}\n`);

  if (!SKIP_FIND) {
    await findContacts();
  } else {
    console.log('⏭️  Skipping contact finding (--skip-find=true)');
  }

  if (!SKIP_ENRICH) {
    await enrichEmails();
  } else {
    console.log('\n⏭️  Skipping email enrichment (--skip-enrich=true)');
  }

  // Show final stats
  console.log('\n\n=== FINAL STATS ===\n');

  const { data: stats } = await supabase
    .from('companies')
    .select(
      `
      id,
      contacts!inner(id, email)
    `
    )
    .eq('offer_id', OFFER_ID)
    .eq('priority', 'critical');

  const companiesWithContacts = new Set(
    stats?.map((c: any) => c.id).filter(Boolean) || []
  );
  const contactsWithEmail = stats?.reduce(
    (acc: number, c: any) =>
      acc + (c.contacts?.filter((co: any) => co.email).length || 0),
    0
  ) || 0;

  console.log(`Critical companies with contacts: ${companiesWithContacts.size} / 478`);
  console.log(`Contacts with emails: ${contactsWithEmail}`);
}

main().catch(console.error);
