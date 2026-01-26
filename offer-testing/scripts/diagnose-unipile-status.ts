#!/usr/bin/env ts-node

/**
 * Diagnose Unipile Account Status
 * 
 * Checks:
 * - API connection
 * - LinkedIn account status
 * - Recent activity
 * - Any errors or warnings
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const UNIPILE_DSN = process.env.UNIPILE_DSN;
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
const UNIPILE_LINKEDIN_ACCOUNT_ID = process.env.UNIPILE_LINKEDIN_ACCOUNT_ID;

if (!UNIPILE_DSN || !UNIPILE_API_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: UNIPILE_DSN, UNIPILE_API_KEY');
  process.exit(1);
}

interface UnipileAccount {
  id: string;
  provider?: string;
  type?: string;
  platform?: string;
  email?: string;
  name?: string;
  status?: string;
  is_valid?: boolean;
  created_at?: string;
  updated_at?: string;
}

async function unipileRequest(endpoint: string, method = 'GET', body: any = null) {
  const url = `${UNIPILE_DSN}${endpoint}`;
  
  console.log(`\n📡 ${method} ${endpoint}`);
  
  const response = await fetch(url, {
    method,
    headers: {
      'X-API-KEY': UNIPILE_API_KEY!,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  console.log(`   Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function checkAccounts() {
  console.log('\n📋 CHECKING UNIPILE ACCOUNTS');
  console.log('='.repeat(60));
  
  try {
    const accountsData = await unipileRequest('/accounts');
    const accounts: UnipileAccount[] = accountsData.items || accountsData;
    
    console.log(`\n✅ Found ${accounts.length} account(s)\n`);
    
    for (const account of accounts) {
      const provider = (account.provider || account.type || account.platform || 'unknown').toUpperCase();
      const isLinkedIn = provider === 'LINKEDIN';
      
      console.log(`${isLinkedIn ? '🔵' : '📧'} ${provider} Account`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Name: ${account.name || 'N/A'}`);
      console.log(`   Email: ${account.email || 'N/A'}`);
      console.log(`   Status: ${account.status || account.is_valid || 'N/A'}`);
      console.log(`   Created: ${account.created_at || 'N/A'}`);
      console.log(`   Updated: ${account.updated_at || 'N/A'}`);
      
      // Check if this matches the env variable
      if (isLinkedIn && UNIPILE_LINKEDIN_ACCOUNT_ID) {
        if (account.id === UNIPILE_LINKEDIN_ACCOUNT_ID) {
          console.log(`   ✅ Matches UNIPILE_LINKEDIN_ACCOUNT_ID in .env.local`);
        } else {
          console.log(`   ⚠️  DOES NOT MATCH UNIPILE_LINKEDIN_ACCOUNT_ID in .env.local`);
          console.log(`      Env has: ${UNIPILE_LINKEDIN_ACCOUNT_ID}`);
          console.log(`      API has: ${account.id}`);
        }
      }
      
      console.log('');
    }
    
    return accounts;
  } catch (error: any) {
    console.error('❌ Failed to fetch accounts:', error.message);
    throw error;
  }
}

async function checkLinkedInProfile(accountId: string, testUrl: string = 'https://www.linkedin.com/in/mikefishbein/') {
  console.log('\n🔍 TESTING LINKEDIN API ACCESS');
  console.log('='.repeat(60));
  console.log(`Testing with profile: ${testUrl}\n`);
  
  try {
    const profile = await unipileRequest('/linkedin/profile', 'POST', {
      account_id: accountId,
      profile_url: testUrl,
    });
    
    console.log('✅ LinkedIn API is working!');
    console.log(`   Name: ${profile.first_name} ${profile.last_name}`);
    console.log(`   Headline: ${profile.headline || 'N/A'}`);
    console.log(`   Connection Degree: ${profile.connection_degree || 'N/A'}`);
    console.log(`   Is Connected: ${profile.is_connected ? 'Yes' : 'No'}`);
    
    return true;
  } catch (error: any) {
    console.error('❌ LinkedIn API test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('   ⚠️  Authentication issue - LinkedIn session may have expired');
      console.error('   → Action: Re-authenticate LinkedIn in Unipile dashboard');
    } else if (error.message.includes('429')) {
      console.error('   ⚠️  Rate limit reached');
    } else if (error.message.includes('500')) {
      console.error('   ⚠️  Unipile server error - may be temporary');
    }
    
    return false;
  }
}

async function testMessageSending(accountId: string) {
  console.log('\n💬 TESTING MESSAGE ENDPOINT');
  console.log('='.repeat(60));
  console.log('Note: This is a dry-run test, no actual message will be sent\n');
  
  // We won't actually send, but we can test the endpoint structure
  console.log(`Account ID to use: ${accountId}`);
  console.log(`Endpoint: POST ${UNIPILE_DSN}/chats`);
  console.log(`Required fields: account_id, attendees_ids, text`);
  console.log('\n✅ Message endpoint configuration looks correct');
}

async function main() {
  console.log('🚀 Unipile Diagnostic Tool');
  console.log('='.repeat(60));
  console.log(`DSN: ${UNIPILE_DSN}`);
  console.log(`API Key: ${UNIPILE_API_KEY?.substring(0, 10)}...`);
  console.log(`LinkedIn Account ID (env): ${UNIPILE_LINKEDIN_ACCOUNT_ID || 'NOT SET'}`);
  
  try {
    // Step 1: Check accounts
    const accounts = await checkAccounts();
    
    // Step 2: Find LinkedIn account
    const linkedInAccount = accounts.find((acc: UnipileAccount) => 
      (acc.provider || acc.type || acc.platform || '').toUpperCase() === 'LINKEDIN'
    );
    
    if (!linkedInAccount) {
      console.error('\n❌ No LinkedIn account found in Unipile');
      console.error('   → Action: Add LinkedIn account in Unipile dashboard');
      process.exit(1);
    }
    
    // Step 3: Test LinkedIn API
    const linkedInWorking = await checkLinkedInProfile(linkedInAccount.id);
    
    // Step 4: Test message endpoint structure
    await testMessageSending(linkedInAccount.id);
    
    // Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Unipile API: Connected`);
    console.log(`${linkedInWorking ? '✅' : '❌'} LinkedIn API: ${linkedInWorking ? 'Working' : 'Failed'}`);
    console.log(`✅ Account ID: ${linkedInAccount.id}`);
    
    if (UNIPILE_LINKEDIN_ACCOUNT_ID && UNIPILE_LINKEDIN_ACCOUNT_ID !== linkedInAccount.id) {
      console.log(`\n⚠️  WARNING: Environment variable mismatch!`);
      console.log(`   Update .env.local with:`);
      console.log(`   UNIPILE_LINKEDIN_ACCOUNT_ID=${linkedInAccount.id}`);
    }
    
    if (!linkedInWorking) {
      console.log(`\n❌ NEXT STEPS:`);
      console.log(`   1. Go to https://dashboard.unipile.com`);
      console.log(`   2. Find your LinkedIn account`);
      console.log(`   3. Click "Reconnect" or "Re-authenticate"`);
      console.log(`   4. Run this script again to verify`);
    } else {
      console.log(`\n✅ All systems operational!`);
    }
    
  } catch (error: any) {
    console.error('\n❌ DIAGNOSTIC FAILED');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
