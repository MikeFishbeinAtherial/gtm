/**
 * Verify FullEnrich API key using their check endpoint
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const API_KEY = process.env.FULLENRICH_API_KEY;

async function verifyKey() {
  console.log('Verifying FullEnrich API key...\n');
  
  if (!API_KEY) {
    console.error('❌ FULLENRICH_API_KEY not found in .env.local');
    return;
  }
  
  console.log(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}\n`);
  
  try {
    // Try the check key endpoint
    const response = await fetch('https://app.fullenrich.com/api/v1/check-key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${text}\n`);
    
    if (response.ok) {
      console.log('✅ API key is valid!');
    } else {
      console.log('❌ API key validation failed');
      const error = JSON.parse(text);
      console.log(`Error: ${error.message || error.code}`);
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

verifyKey().catch(console.error);
