#!/usr/bin/env node

/**
 * Run Import Scripts on Railway
 *
 * This script runs the import and message generation for the networking campaign.
 * Run this on Railway after deployment.
 */

import dotenv from 'dotenv';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

console.log('🚀 Starting Networking Campaign Setup on Railway\n');

// Check environment variables
const required = ['UNIPILE_DSN', 'UNIPILE_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL'];
const missing = required.filter(key => !process.env[key]);

// Check for Supabase service key (can be SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!supabaseKey) {
  missing.push('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY');
}

if (missing.length > 0) {
  console.error('❌ Missing environment variables:', missing.join(', '));
  console.log('\n💡 Required variables in Railway:');
  console.log('   - UNIPILE_DSN');
  console.log('   - UNIPILE_API_KEY');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)');
  console.log('\n💡 Make sure these are set in Railway → Project Settings → Shared Variables');
  process.exit(1);
}

// Set SUPABASE_SERVICE_ROLE_KEY if it's using SUPABASE_SECRET_KEY
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SECRET_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY;
}

console.log('✅ Environment variables configured\n');

try {
  // Step 1: Import contacts
  console.log('📥 Step 1: Importing contacts...');
  execSync('node scripts/import-networking-contacts.js', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  // Step 2: Generate messages
  console.log('\n✍️  Step 2: Generating messages...');
  execSync('node scripts/generate-networking-messages.js', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  console.log('\n🎉 Setup complete!');
  console.log('📊 Check Supabase to review the 539 messages');
  console.log('🚀 Ready to start sending campaign');

} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
}
