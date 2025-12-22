#!/usr/bin/env node

/**
 * Import Networking Contacts
 * 
 * Reads CSV file with contacts (first name, LinkedIn URL)
 * Imports them to Supabase linkedin_connections table
 * Looks up LinkedIn member_id via Unipile API
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const UNIPILE_DSN = process.env.UNIPILE_DSN;
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment
if (!UNIPILE_DSN || !UNIPILE_API_KEY) {
  console.error('❌ Missing Unipile credentials in .env.local');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🚀 Starting Contact Import\n');

// Step 1: Load contacts from JSON (already parsed from CSV)
console.log('📂 Loading contacts from JSON...');
const contactsPath = path.join(__dirname, '..', 'data', 'networking-contacts.json');
let contacts;
try {
  const rawData = readFileSync(contactsPath, 'utf8');
  contacts = JSON.parse(rawData);
  console.log(`✅ Loaded ${contacts.length} contacts\n`);
} catch (error) {
  console.error('❌ Failed to load contacts:', error.message);
  console.log('💡 Make sure you run parse-networking-csv.js first');
  process.exit(1);
}

// Step 2: Get Unipile account ID
console.log('🔑 Fetching Unipile account ID...');
let unipileAccountId;
try {
  const response = await fetch(`${UNIPILE_DSN}/accounts`, {
    headers: {
      'X-API-KEY': UNIPILE_API_KEY,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const accounts = await response.json();
  const linkedinAccount = accounts.items?.find(acc => acc.provider === 'LINKEDIN');
  
  if (!linkedinAccount) {
    throw new Error('No LinkedIn account found');
  }

  unipileAccountId = linkedinAccount.id;
  console.log(`✅ Found LinkedIn account: ${linkedinAccount.display_name} (${unipileAccountId})\n`);
} catch (error) {
  console.error('❌ Failed to get Unipile account:', error.message);
  process.exit(1);
}

// Step 3: Get all existing connections from Unipile
console.log('📥 Fetching LinkedIn connections from Unipile...');
let unipileConnections = [];
try {
  const response = await fetch(
    `${UNIPILE_DSN}/attendees?account_id=${unipileAccountId}&limit=1000`,
    {
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'Accept': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  unipileConnections = data.items || [];
  console.log(`✅ Fetched ${unipileConnections.length} connections from Unipile\n`);
} catch (error) {
  console.error('❌ Failed to fetch connections:', error.message);
  process.exit(1);
}

// Step 4: Match contacts to Unipile connections
console.log('🔍 Matching contacts to Unipile connections...');

// Normalize LinkedIn URLs for matching
function normalizeLinkedInUrl(url) {
  if (!url) return '';
  // Remove trailing slash, lowercase, remove protocol
  return url
    .toLowerCase()
    .replace(/\/$/, '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '');
}

// Create lookup map from Unipile connections
const connectionMap = new Map();
unipileConnections.forEach(conn => {
  if (conn.linkedin_url) {
    const normalized = normalizeLinkedInUrl(conn.linkedin_url);
    connectionMap.set(normalized, conn);
  }
});

// Match contacts
const matchedContacts = [];
const unmatchedContacts = [];

contacts.forEach(contact => {
  const normalizedUrl = normalizeLinkedInUrl(contact.linkedin_url);
  const match = connectionMap.get(normalizedUrl);
  
  if (match) {
    matchedContacts.push({
      ...contact,
      member_id: match.id,
      linkedin_id: match.id,
      full_name: match.display_name || `${contact.first_name}`,
      headline: match.headline,
      profile_picture_url: match.profile_picture_url
    });
  } else {
    unmatchedContacts.push(contact);
  }
});

console.log(`✅ Matched: ${matchedContacts.length}`);
console.log(`⚠️  Unmatched: ${unmatchedContacts.length}\n`);

if (unmatchedContacts.length > 0 && unmatchedContacts.length < 10) {
  console.log('Unmatched contacts:');
  unmatchedContacts.forEach(c => {
    console.log(`  - ${c.first_name}: ${c.linkedin_url}`);
  });
  console.log();
}

// Step 5: Import matched contacts to Supabase
console.log('💾 Importing contacts to Supabase...');

// Import supabase client
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let imported = 0;
let skipped = 0;
let errors = 0;

for (const contact of matchedContacts) {
  try {
    const { data, error } = await supabase
      .from('linkedin_connections')
      .upsert({
        linkedin_id: contact.linkedin_id,
        linkedin_url: contact.linkedin_url,
        first_name: contact.first_name,
        full_name: contact.full_name,
        headline: contact.headline,
        profile_picture_url: contact.profile_picture_url,
        relationship_strength: 'unknown',
        priority: 'medium',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'linkedin_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error(`❌ Error importing ${contact.first_name}:`, error.message);
      errors++;
    } else {
      imported++;
      process.stdout.write(`\rImported: ${imported} | Errors: ${errors}`);
    }
  } catch (err) {
    console.error(`❌ Exception importing ${contact.first_name}:`, err.message);
    errors++;
  }
  
  // Small delay to avoid rate limits
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log('\n');

// Summary
console.log('═══════════════════════════════════════');
console.log('📊 IMPORT SUMMARY');
console.log('═══════════════════════════════════════');
console.log(`Total contacts in CSV: ${contacts.length}`);
console.log(`Matched to Unipile:    ${matchedContacts.length}`);
console.log(`Imported to Supabase:  ${imported}`);
console.log(`Errors:                ${errors}`);
console.log(`Unmatched:             ${unmatchedContacts.length}`);
console.log('═══════════════════════════════════════\n');

if (errors === 0 && imported > 0) {
  console.log('✅ Import complete!\n');
  console.log('⏭️  Next steps:');
  console.log('   1. Run: node scripts/generate-networking-messages.js');
  console.log('   2. Review messages in Supabase');
  console.log('   3. Run: node scripts/send-networking-campaign.js');
} else if (errors > 0) {
  console.log('⚠️  Import completed with errors. Check logs above.\n');
} else {
  console.log('❌ No contacts imported. Check your CSV and Unipile connection.\n');
}

