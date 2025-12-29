// Debug Unipile connection
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

console.log('🔍 Debugging Unipile connection...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
console.log('Looking for .env.local at:', envPath);
console.log('File exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  console.log('\n📋 Environment variables found:');
  console.log('UNIPILE_API_KEY:', env.UNIPILE_API_KEY ? 'SET (length: ' + env.UNIPILE_API_KEY.length + ')' : 'NOT SET');
  console.log('UNIPILE_DSN:', env.UNIPILE_DSN || 'NOT SET');

  // Test the current DSN
  if (env.UNIPILE_API_KEY && env.UNIPILE_DSN) {
    console.log('\n🧪 Testing current DSN...');
    testDSN(env.UNIPILE_DSN, env.UNIPILE_API_KEY);
  }

  // Test the user's provided DSN
  const userDSN = 'https://api4.unipile.com:13425';
  console.log(`\n🧪 Testing your DSN: ${userDSN}`);
  testDSN(userDSN, env.UNIPILE_API_KEY);
} else {
  console.log('\n❌ .env.local file not found!');
  console.log('You need to create this file with your Unipile credentials.');
}

async function testDSN(dsn, apiKey) {
  try {
    const response = await fetch(`${dsn}/accounts`, {
      headers: {
        'X-API-KEY': apiKey,
        'accept': 'application/json'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS! Accounts found:', data.length || data.items?.length || 0);
    } else {
      const errorText = await response.text();
      console.log('❌ FAILED:', errorText);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}
