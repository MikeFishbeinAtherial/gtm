// Test the corrected DSN
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

console.log('🧪 Testing corrected Unipile DSN...\n');

const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const apiKey = env.UNIPILE_API_KEY;
const dsn = env.UNIPILE_DSN;

console.log('Current UNIPILE_DSN:', dsn);
console.log('API Key present:', apiKey ? 'YES' : 'NO');

if (!apiKey || !dsn) {
  console.log('❌ Missing credentials');
  process.exit(1);
}

try {
  const response = await fetch(`${dsn}/accounts`, {
    headers: {
      'X-API-KEY': apiKey,
      'accept': 'application/json'
    }
  });

  console.log(`\n📡 Response: ${response.status} ${response.statusText}`);

  if (response.ok) {
    const data = await response.json();
    const accounts = data.items || data;
    console.log('✅ SUCCESS! Found', accounts.length, 'account(s)');

    if (accounts.length > 0) {
      const linkedin = accounts.find(a => (a.provider || a.type || '').toUpperCase().includes('LINKEDIN'));
      if (linkedin) {
        console.log('🎯 LinkedIn account ID:', linkedin.id);
        console.log('📧 Email:', linkedin.email || 'N/A');
        console.log('📊 Status:', linkedin.status || 'unknown');
      }
    }
  } else {
    const error = await response.text();
    console.log('❌ FAILED:', error);
  }
} catch (error) {
  console.log('❌ ERROR:', error.message);
}
