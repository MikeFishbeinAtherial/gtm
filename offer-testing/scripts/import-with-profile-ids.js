#!/usr/bin/env node

/**
 * Import Contacts with Profile IDs
 * 
 * If you have LinkedIn profile IDs (member_id) for your contacts,
 * use this script instead of import-networking-contacts.js
 * 
 * Expected CSV format:
 * first_name,last_name,linkedin_url,linkedin_profile_id
 * 
 * Or JSON format:
 * [
 *   {
 *     "first_name": "Claudia",
 *     "last_name": "Ring",
 *     "linkedin_url": "https://www.linkedin.com/in/claudiaring",
 *     "linkedin_profile_id": "ACoAAA..." // The member_id
 *   }
 * ]
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SECRET_KEY 
  || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 Importing Contacts with Profile IDs\n');

// Load contacts from JSON (update path if needed)
const contactsPath = path.join(__dirname, '..', 'data', 'networking-contacts.json');
let contacts;
try {
  const rawData = readFileSync(contactsPath, 'utf8');
  contacts = JSON.parse(rawData);
  console.log(`✅ Loaded ${contacts.length} contacts\n`);
} catch (error) {
  console.error('❌ Failed to load contacts:', error.message);
  process.exit(1);
}

// Check if contacts have profile IDs
const hasProfileIds = contacts.some(c => c.linkedin_profile_id || c.member_id || c.linkedin_id);
if (!hasProfileIds) {
  console.error('❌ No profile IDs found in contacts!');
  console.log('\n💡 Expected format:');
  console.log('   {');
  console.log('     "first_name": "Claudia",');
  console.log('     "linkedin_url": "https://...",');
  console.log('     "linkedin_profile_id": "ACoAAA..."  // ← Add this field');
  console.log('   }');
  console.log('\n📝 Update your CSV/JSON to include linkedin_profile_id or member_id');
  process.exit(1);
}

console.log('💾 Importing contacts to Supabase...\n');

let imported = 0;
let skipped = 0;
let errors = 0;

for (const contact of contacts) {
  try {
    const profileId = contact.linkedin_profile_id || contact.member_id || contact.linkedin_id;
    
    if (!profileId) {
      console.log(`⚠️  Skipping ${contact.first_name}: No profile ID`);
      skipped++;
      continue;
    }
    
    const { data, error } = await supabase
      .from('linkedin_connections')
      .upsert({
        linkedin_id: profileId,
        linkedin_url: contact.linkedin_url,
        first_name: contact.first_name,
        last_name: contact.last_name,
        full_name: `${contact.first_name} ${contact.last_name || ''}`.trim(),
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
      process.stdout.write(`\rImported: ${imported} | Skipped: ${skipped} | Errors: ${errors}`);
    }
  } catch (err) {
    console.error(`❌ Exception importing ${contact.first_name}:`, err.message);
    errors++;
  }
  
  await new Promise(resolve => setTimeout(resolve, 50));
}

console.log('\n');

console.log('═══════════════════════════════════════');
console.log('📊 IMPORT SUMMARY');
console.log('═══════════════════════════════════════');
console.log(`Total contacts: ${contacts.length}`);
console.log(`Imported:       ${imported}`);
console.log(`Skipped:        ${skipped}`);
console.log(`Errors:         ${errors}`);
console.log('═══════════════════════════════════════\n');

if (errors === 0 && imported > 0) {
  console.log('✅ Import complete!\n');
  console.log('⏭️  Next steps:');
  console.log('   1. Run: node scripts/generate-networking-messages.js');
  console.log('   2. Run: node scripts/send-test-networking-message.js');
}

