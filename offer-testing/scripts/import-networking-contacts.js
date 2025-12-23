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
// Check for Supabase service key with multiple possible names
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SECRET_KEY 
  || process.env.SUPABASE_SERVICE_KEY;

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
  
  // Debug: Show what accounts we got
  if (accounts.items && accounts.items.length > 0) {
    console.log('📋 Available accounts:');
    accounts.items.forEach(acc => {
      const fields = Object.keys(acc).join(', ');
      console.log(`   - ${acc.display_name || acc.id}: fields=[${fields}]`);
      console.log(`     provider: ${acc.provider}, type: ${acc.type}, platform: ${acc.platform}`);
    });
    console.log();
  }
  
  // Try multiple provider/type/platform name variations
  const linkedinAccount = accounts.items?.find(acc => {
    const provider = (acc.provider || acc.type || acc.platform || '').toUpperCase();
    return provider === 'LINKEDIN' || provider.includes('LINKEDIN');
  });
  
  if (!linkedinAccount) {
    console.error('❌ No LinkedIn account found. Available providers:', 
      accounts.items?.map(a => a.provider).join(', ') || 'none');
    throw new Error('No LinkedIn account found');
  }

  unipileAccountId = linkedinAccount.id;
  console.log(`✅ Found LinkedIn account: ${linkedinAccount.display_name} (${unipileAccountId})\n`);
} catch (error) {
  console.error('❌ Failed to get Unipile account:', error.message);
  process.exit(1);
}

// Step 3: Get ALL existing connections from Unipile (with pagination)
console.log('📥 Fetching LinkedIn connections from Unipile...');
let unipileConnections = [];
let cursor = null;
let page = 1;

try {
  do {
    const url = cursor 
      ? `${UNIPILE_DSN}/users/relations?account_id=${unipileAccountId}&limit=100&cursor=${cursor}`
      : `${UNIPILE_DSN}/users/relations?account_id=${unipileAccountId}&limit=100`;
    
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': UNIPILE_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const pageConnections = data.items || [];
    unipileConnections = unipileConnections.concat(pageConnections);
    
    cursor = data.cursor;
    console.log(`   Page ${page}: ${pageConnections.length} connections (total: ${unipileConnections.length})`);
    
    page++;
    
    // Small delay between pages to be safe
    if (cursor) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } while (cursor);
  
  console.log(`✅ Fetched ${unipileConnections.length} total connections from Unipile`);
  
  // Debug: Show sample connection structure
  if (unipileConnections.length > 0) {
    console.log('\n📋 Sample connection structure:');
    const sample = unipileConnections[0];
    console.log('   Fields:', Object.keys(sample).join(', '));
    console.log('   Sample data:', JSON.stringify(sample, null, 2).substring(0, 500));
    console.log();
  }
} catch (error) {
  console.error('❌ Failed to fetch connections:', error.message);
  process.exit(1);
}

// Step 4: Match contacts to Unipile connections
console.log('🔍 Matching contacts to Unipile connections...');

// Normalize LinkedIn URLs for matching
function normalizeLinkedInUrl(url) {
  if (!url) return '';
  // Remove trailing slash, lowercase, remove protocol, remove numeric IDs
  return url
    .toLowerCase()
    .replace(/\/$/, '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/in\/[^\/]+-\d+$/, (match) => {
      // Extract just the username part before the numeric ID
      return match.replace(/-\d+$/, '');
    });
}

// Extract LinkedIn username from URL
function extractLinkedInUsername(url) {
  if (!url) return null;
  const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
  if (match) {
    // Remove numeric suffix if present (e.g., "trevor-martin-86567859" -> "trevor-martin")
    return match[1].replace(/-\d+$/, '').toLowerCase();
  }
  return null;
}

// Create lookup map from Unipile connections (by URL and by username)
const connectionMapByUrl = new Map();
const connectionMapByUsername = new Map();
let sampleUnipileUrls = [];
unipileConnections.forEach(conn => {
  // Try multiple possible URL field names (Unipile uses public_profile_url)
  const url = conn.public_profile_url || conn.linkedin_url || conn.url || conn.profile_url || conn.linkedin_profile_url;
  if (url && sampleUnipileUrls.length < 3) {
    sampleUnipileUrls.push({ url, fields: Object.keys(conn).join(', ') });
  }
  if (url) {
    const normalized = normalizeLinkedInUrl(url);
    connectionMapByUrl.set(normalized, conn);
    
    // Also extract username for matching
    const username = extractLinkedInUsername(url) || conn.public_identifier?.toLowerCase();
    if (username) {
      connectionMapByUsername.set(username, conn);
    }
  }
  
  // Also match by public_identifier directly
  if (conn.public_identifier) {
    connectionMapByUsername.set(conn.public_identifier.toLowerCase(), conn);
  }
});

// Debug: Show sample URLs and identifiers from Unipile
if (sampleUnipileUrls.length > 0) {
  console.log('📋 Sample connections from Unipile:');
  unipileConnections.slice(0, 5).forEach(conn => {
    const username = extractLinkedInUsername(conn.public_profile_url) || conn.public_identifier;
    console.log(`   - ${conn.first_name} ${conn.last_name}: username="${username}", public_identifier="${conn.public_identifier}"`);
  });
  console.log();
}

// Match contacts
const matchedContacts = [];
const unmatchedContacts = [];
let sampleCsvUrls = [];

contacts.forEach(contact => {
  const normalizedUrl = normalizeLinkedInUrl(contact.linkedin_url);
  const username = extractLinkedInUsername(contact.linkedin_url);
  if (sampleCsvUrls.length < 3) {
    sampleCsvUrls.push({ original: contact.linkedin_url, normalized: normalizedUrl, username });
  }
  
  // Try matching by URL first, then by username
  let match = connectionMapByUrl.get(normalizedUrl);
  if (!match && username) {
    match = connectionMapByUsername.get(username);
  }
  
  if (match) {
    matchedContacts.push({
      ...contact,
      member_id: match.member_id || match.id,
      linkedin_id: match.member_id || match.id || match.linkedin_id,
      full_name: `${match.first_name || ''} ${match.last_name || ''}`.trim() || match.display_name || match.name || `${contact.first_name} ${contact.last_name || ''}`.trim(),
      headline: match.headline,
      profile_picture_url: match.profile_picture_url || match.picture_url || match.avatar_url,
      linkedin_url: match.public_profile_url || contact.linkedin_url
    });
  } else {
    unmatchedContacts.push(contact);
  }
});

// Debug: Show sample CSV URLs
if (sampleCsvUrls.length > 0) {
  console.log('📋 Sample URLs from CSV:');
  sampleCsvUrls.forEach(s => {
    console.log(`   - Original: "${s.original}" → Normalized: "${s.normalized}"`);
  });
  console.log();
}

console.log(`✅ Matched: ${matchedContacts.length}`);
console.log(`⚠️  Unmatched: ${unmatchedContacts.length}\n`);

if (unmatchedContacts.length > 0 && unmatchedContacts.length < 10) {
  console.log('Unmatched contacts:');
  unmatchedContacts.forEach(c => {
    console.log(`  - ${c.first_name}: ${c.linkedin_url}`);
  });
  console.log();
}

// Step 5: Import ALL contacts to Supabase (matched and unmatched)
// For unmatched contacts, we'll look up member_id when sending
console.log('💾 Importing contacts to Supabase...');
console.log(`   Matched: ${matchedContacts.length} (will have member_id)`);
console.log(`   Unmatched: ${unmatchedContacts.length} (will look up member_id when sending)\n`);

// Import supabase client
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let imported = 0;
let skipped = 0;
let errors = 0;

// Import matched contacts
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

// Import unmatched contacts (without member_id - we'll look it up when sending)
for (const contact of unmatchedContacts) {
  try {
    // Generate a unique temp ID from URL hash
    const crypto = await import('crypto');
    const urlHash = crypto.createHash('md5').update(contact.linkedin_url).digest('hex').substring(0, 16);
    const tempId = `temp_${urlHash}`;
    
    const { data, error } = await supabase
      .from('linkedin_connections')
      .upsert({
        linkedin_id: tempId, // Temporary - will update when we get real member_id
        linkedin_url: contact.linkedin_url,
        first_name: contact.first_name,
        last_name: contact.last_name,
        full_name: `${contact.first_name} ${contact.last_name || ''}`.trim(),
        relationship_strength: 'unknown',
        priority: 'medium',
        notes: 'Member ID to be looked up when sending',
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

