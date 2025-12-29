// Quick DSN test script
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Load environment
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const API_KEY = env.UNIPILE_API_KEY;
const CURRENT_DSN = env.UNIPILE_DSN;

console.log('🔍 Testing current DSN configuration...\n');
console.log('Current UNIPILE_DSN:', CURRENT_DSN);
console.log('API Key present:', API_KEY ? 'YES' : 'NO');
console.log('');

async function testDSN(dsn) {
  try {
    const response = await fetch(`${dsn}/accounts`, {
      headers: {
        'X-API-KEY': API_KEY,
        'accept': 'application/json'
      },
      timeout: 5000
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ SUCCESS with DSN: ${dsn}`);
      console.log('Accounts found:', data.length || data.items?.length || 0);
      return { success: true, data };
    } else {
      console.log(`❌ FAILED with DSN: ${dsn} - Status: ${response.status}`);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.log(`❌ ERROR with DSN: ${dsn} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test current DSN
await testDSN(CURRENT_DSN);

// Test your provided DSN
const yourDSN = 'https://api4.unipile.com:13425';
console.log(`\n🧪 Testing your provided DSN: ${yourDSN}`);
await testDSN(yourDSN);

// Test common variations
const variations = [
  'https://api4.unipile.com:13425/api/v1',
  'https://api4.unipile.com:13425/v1',
  'https://api4.unipile.com/api/v1',
  'https://api4.unipile.com/v1'
];

console.log('\n🔄 Testing common DSN variations...');
for (const dsn of variations) {
  await testDSN(dsn);
}
