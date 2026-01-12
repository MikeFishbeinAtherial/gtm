#!/usr/bin/env node

/**
 * Implement Connection Campaigns Table
 * 
 * This script:
 * 1. Creates the connection_campaigns table
 * 2. Migrates data from networking_outreach
 * 3. Verifies the migration
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SECRET_KEY 
  || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 Implementing Connection Campaigns Table\n');
console.log('═══════════════════════════════════════\n');

// Step 1: Read and execute SQL schema
console.log('📋 Step 1: Creating connection_campaigns table...\n');

const sqlPath = path.join(__dirname, 'create-connection-campaigns-schema.sql');
let sqlContent;
try {
  sqlContent = readFileSync(sqlPath, 'utf8');
} catch (error) {
  console.error('❌ Error reading SQL file:', error.message);
  process.exit(1);
}

// Split SQL into individual statements (split on semicolons, but be careful with functions)
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

// Execute each statement
let executed = 0;
let errors = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  
  // Skip comments and empty statements
  if (statement.startsWith('--') || statement.length < 10) {
    continue;
  }
  
  try {
    // Use RPC for DDL statements if needed, or execute directly
    const { error } = await supabase.rpc('exec_sql', { sql: statement });
    
    if (error) {
      // Try direct query execution instead
      const { error: directError } = await supabase
        .from('_exec_sql')
        .select('*')
        .limit(0);
      
      // If that doesn't work, we'll need to use the Supabase SQL editor approach
      console.log(`⚠️  Statement ${i + 1} needs to be run in Supabase SQL Editor`);
      console.log(`   Statement preview: ${statement.substring(0, 100)}...\n`);
      errors++;
      continue;
    }
    
    executed++;
  } catch (err) {
    console.log(`⚠️  Statement ${i + 1} error: ${err.message}`);
    errors++;
  }
}

if (errors > 0) {
  console.log('\n⚠️  Some SQL statements could not be executed automatically.');
  console.log('💡 Please run the SQL file manually in Supabase SQL Editor:');
  console.log(`   ${sqlPath}\n`);
} else {
  console.log(`✅ Executed ${executed} SQL statements\n`);
}

// Step 2: Check if table exists
console.log('🔍 Step 2: Verifying table exists...\n');

const { data: tableCheck, error: tableError } = await supabase
  .from('connection_campaigns')
  .select('*')
  .limit(1);

if (tableError && tableError.code === '42P01') {
  console.log('❌ Table does not exist. Please run the SQL file in Supabase SQL Editor.');
  console.log(`   File: ${sqlPath}\n`);
  process.exit(1);
} else if (tableError) {
  console.log('⚠️  Error checking table:', tableError.message);
  console.log('💡 Please run the SQL file manually in Supabase SQL Editor:');
  console.log(`   ${sqlPath}\n`);
  process.exit(1);
}

console.log('✅ Table exists!\n');

// Step 3: Migrate data from networking_outreach
console.log('📥 Step 3: Migrating data from networking_outreach...\n');

// Get all outreach records
const { data: outreachRecords, error: outreachError } = await supabase
  .from('networking_outreach')
  .select('*');

if (outreachError) {
  console.error('❌ Error loading outreach records:', outreachError);
  process.exit(1);
}

console.log(`✅ Found ${outreachRecords.length} outreach records to migrate\n`);

// Migrate in batches
const batchSize = 100;
let migrated = 0;
let skipped = 0;
let migrationErrors = 0;

for (let i = 0; i < outreachRecords.length; i += batchSize) {
  const batch = outreachRecords.slice(i, i + batchSize);
  
  const recordsToInsert = batch.map(record => ({
    connection_id: record.connection_id,
    campaign_id: record.batch_id,
    message: record.personalized_message,
    message_status: record.status,
    skip_reason: record.skip_reason,
    scheduled_at: record.scheduled_at,
    sent_at: record.sent_at,
    replied_at: record.replied_at,
    reply_text: record.reply_text,
    reply_sentiment: record.reply_sentiment,
    needs_follow_up: record.needs_follow_up,
    follow_up_notes: record.follow_up_notes,
    personalization_notes: record.personalization_notes,
    created_at: record.created_at,
    updated_at: record.updated_at
  }));

  const { error: insertError } = await supabase
    .from('connection_campaigns')
    .upsert(recordsToInsert, {
      onConflict: 'connection_id,campaign_id',
      ignoreDuplicates: false
    });

  if (insertError) {
    console.error(`❌ Error migrating batch ${Math.floor(i/batchSize) + 1}:`, insertError.message);
    migrationErrors++;
    
    // Try individual inserts to see which ones fail
    for (const record of recordsToInsert) {
      const { error: singleError } = await supabase
        .from('connection_campaigns')
        .upsert(record, {
          onConflict: 'connection_id,campaign_id'
        });
      
      if (singleError) {
        console.error(`   Failed: connection ${record.connection_id}, campaign ${record.campaign_id}`);
        migrationErrors++;
      } else {
        migrated++;
      }
    }
  } else {
    migrated += recordsToInsert.length;
  }
  
  process.stdout.write(`\r   Migrated: ${migrated} / ${outreachRecords.length}`);
}

console.log(`\n✅ Migrated ${migrated} records`);
if (migrationErrors > 0) {
  console.log(`⚠️  ${migrationErrors} errors occurred`);
}
console.log('');

// Step 4: Verify migration
console.log('🔍 Step 4: Verifying migration...\n');

const { data: migratedCount, error: countError } = await supabase
  .from('connection_campaigns')
  .select('*', { count: 'exact', head: true });

if (countError) {
  console.error('❌ Error counting migrated records:', countError);
} else {
  console.log(`✅ Total records in connection_campaigns: ${migratedCount || 0}`);
  console.log(`   Expected: ${outreachRecords.length}`);
  
  if (migratedCount === outreachRecords.length) {
    console.log('   ✅ Migration complete - all records migrated!\n');
  } else {
    console.log(`   ⚠️  Migration incomplete - ${outreachRecords.length - (migratedCount || 0)} records missing\n`);
  }
}

// Step 5: Show sample data
console.log('📊 Step 5: Sample migrated data...\n');

const { data: samples } = await supabase
  .from('connection_campaigns')
  .select(`
    *,
    linkedin_connections!inner(full_name, linkedin_url),
    networking_campaign_batches!inner(name)
  `)
  .limit(5);

if (samples && samples.length > 0) {
  samples.forEach((sample, idx) => {
    console.log(`${idx + 1}. ${sample.linkedin_connections?.full_name || 'Unknown'}`);
    console.log(`   Campaign: ${sample.networking_campaign_batches?.name || 'Unknown'}`);
    console.log(`   Status: ${sample.message_status}`);
    console.log(`   Message: ${sample.message?.substring(0, 60)}...`);
    console.log('');
  });
}

console.log('═══════════════════════════════════════');
console.log('✅ Implementation Complete!\n');
console.log('💡 Next steps:');
console.log('   1. Verify data in Supabase dashboard');
console.log('   2. Update scripts to use connection_campaigns table');
console.log('   3. Test queries using the new table\n');
