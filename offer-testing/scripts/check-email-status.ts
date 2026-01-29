/**
 * Check email status for critical priority companies
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';

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

async function checkEmails() {
  console.log('\n📊 Email Status for Critical Priority Companies\n');

  // Get all contacts at critical priority companies
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select(`
      id,
      email,
      linkedin_url,
      first_name,
      last_name,
      companies!inner(id, name, priority)
    `)
    .eq('offer_id', OFFER_ID)
    .eq('companies.priority', 'critical');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const total = contacts?.length || 0;
  const withEmail = contacts?.filter((c: any) => c.email).length || 0;
  const withoutEmail = total - withEmail;
  const withLinkedin = contacts?.filter((c: any) => c.linkedin_url).length || 0;
  const withEmailAndLinkedin =
    contacts?.filter((c: any) => c.email && c.linkedin_url).length || 0;

  console.log(`Total Contacts: ${total}`);
  console.log(`✅ With Email: ${withEmail} (${total > 0 ? Math.round((withEmail/total)*100) : 0}%)`);
  console.log(`❌ Without Email: ${withoutEmail} (${total > 0 ? Math.round((withoutEmail/total)*100) : 0}%)`);
  console.log(`🔗 With LinkedIn URL: ${withLinkedin} (${total > 0 ? Math.round((withLinkedin/total)*100) : 0}%)`);
  console.log(`✅ With Email + LinkedIn: ${withEmailAndLinkedin} (${total > 0 ? Math.round((withEmailAndLinkedin/total)*100) : 0}%)`);
  console.log(`\n💰 FullEnrich Credits Remaining: 67`);
  console.log(`📧 Credits Needed for Remaining: ${withoutEmail} (1 credit per email)`);
  
  if (withoutEmail <= 67) {
    console.log(`\n✅ You have enough credits to enrich all remaining contacts!`);
  } else {
    console.log(`\n⚠️  You need ${withoutEmail - 67} more credits to enrich all contacts.`);
  }

  // Check how many companies have contacts with emails
  const companiesWithEmails = new Set(
    contacts?.filter((c: any) => c.email).map((c: any) => c.companies.id)
  );
  const companiesWithoutEmails = new Set(
    contacts?.filter((c: any) => !c.email).map((c: any) => c.companies.id)
  );

  console.log(`\n🏢 Companies with contacts that have emails: ${companiesWithEmails.size}`);
  console.log(`🏢 Companies with contacts missing emails: ${companiesWithoutEmails.size}`);

  // Get total critical companies
  const { data: allCriticalCompanies } = await supabase
    .from('companies')
    .select('id')
    .eq('offer_id', OFFER_ID)
    .eq('priority', 'critical');

  console.log(`\n📈 Summary:`);
  console.log(`   • Total Critical Companies: ${allCriticalCompanies?.length || 0}`);
  console.log(`   • Companies with contacts (any): ${companiesWithEmails.size + companiesWithoutEmails.size}`);
  console.log(`   • Companies with contacts + emails: ${companiesWithEmails.size}`);
  console.log(`   • Companies needing email enrichment: ${companiesWithoutEmails.size}`);
  console.log(`   • Contacts ready to email: ${withEmail}`);
  
  if (withEmail >= 60) {
    console.log(`\n✅ You have ${withEmail} contacts ready to email!`);
    console.log(`   With 3 inboxes × 20 emails/day = 60 emails/day capacity`);
    console.log(`   You can start outreach immediately!`);
  } else {
    console.log(`\n⚠️  You have ${withEmail} contacts ready, but need more for full capacity.`);
  }
}

checkEmails().catch(console.error);
