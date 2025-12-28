#!/usr/bin/env node

/**
 * Test Cron Script Locally
 * 
 * Run this to test if the message processing script works locally
 * before deploying to Railway.
 * 
 * USAGE:
 *   node scripts/test-cron-locally.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

console.log('🧪 Testing Cron Script Locally...\n');

// Check environment variables
const required = [
  'UNIPILE_DSN',
  'UNIPILE_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'NOTIFICATION_EMAIL'
];

console.log('📋 Environment Variables Check:');
let allSet = true;
for (const key of required) {
  const value = process.env[key];
  const isSet = !!value;
  console.log(`   ${isSet ? '✅' : '❌'} ${key}: ${isSet ? 'SET' : 'MISSING'}`);
  if (!isSet) allSet = false;
}

if (!allSet) {
  console.error('\n❌ Missing required environment variables!');
  console.error('Please check your .env.local file.');
  process.exit(1);
}

console.log('\n✅ All environment variables are set!\n');

// Import and run the actual script
console.log('🚀 Running process-message-queue.js...\n');

try {
  const { default: processDueMessages } = await import('./process-message-queue.js');
  // The script runs itself, so we just need to import it
  console.log('\n✅ Script imported successfully!');
  console.log('Note: The script runs automatically when imported.');
} catch (error) {
  console.error('\n❌ Error running script:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}

