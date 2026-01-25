/**
 * Test FullEnrich API key
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { fullenrich } from '../src/lib/clients/fullenrich.ts';

async function test() {
  console.log('Testing FullEnrich API key...\n');
  
  const apiKey = process.env.FULLENRICH_API_KEY;
  console.log(`API Key from env: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND'}\n`);
  
  // Try a simple enrichment request
  try {
    console.log('Testing with a simple enrichment request...');
    const enrichment = await fullenrich.enrichContact(
      {
        firstname: 'John',
        lastname: 'Doe',
        domain: 'example.com',
        company_name: 'Example Corp',
        enrich_fields: ['contact.emails'],
      },
      'Test Enrichment'
    );
    
    console.log(`✅ Success! Enrichment ID: ${enrichment.enrichment_id}`);
    console.log('\nAPI key is valid!');
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    if (error.message.includes('api.key')) {
      console.error('\n⚠️  The API key appears to be invalid or not activated.');
      console.error('Please verify the key at: https://app.fullenrich.com/');
    }
  }
}

test().catch(console.error);
