#!/usr/bin/env node

/**
 * Test Unipile Webhook Endpoint
 *
 * Tests the webhook endpoint with sample payloads to ensure it handles
 * different event types correctly.
 *
 * USAGE:
 *   node scripts/test-webhook-endpoint.js
 *
 * Set WEBHOOK_TEST_URL environment variable to test against deployed app:
 *   WEBHOOK_TEST_URL=https://your-app.railway.app/api/webhooks/unipile node scripts/test-webhook-endpoint.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const WEBHOOK_SECRET = process.env.UNIPILE_WEBHOOK_SECRET || 'test-secret-key';
const WEBHOOK_TEST_URL = process.env.WEBHOOK_TEST_URL || 'http://localhost:3000/api/webhooks/unipile';

// Sample webhook payloads for testing
const samplePayloads = {
  message_received: {
    "account_id": "dfXlh46vQYCsMbVarumWlg",
    "account_type": "LINKEDIN",
    "account_info": {
      "type": "LINKEDIN",
      "feature": "classic",
      "user_id": "ACoAAAcDMMQBODyLwZrRcgYhrkCafURGqva0U4E"
    },
    "event": "message_received",
    "chat_id": "R8J-xM9WX7eoHLp6gSVtWQ",
    "timestamp": new Date().toISOString(),
    "webhook_name": "Webhook demo",
    "message_id": "ykmhfXlRW0W_cqReJYrfBw",
    "message": "Thanks for reaching out! I'd be happy to chat about that.",
    "sender": {
      "attendee_id": "C8zaRZTlVcmfnke_Vai4Gg",
      "attendee_name": "John Smith",
      "attendee_provider_id": "ACoAAAcDMMQBODyLwZrRcgYhrkCafURGqva0U4E",
      "attendee_profile_url": "https://www.linkedin.com/in/johnsmith/"
    },
    "attendees": [
      {
        "attendee_id": "12Siz1Vcmfnke_Vai4Gg",
        "attendee_name": "Your Name",
        "attendee_provider_id": "AA1212sqqsMQBODyLwZrRcgYhrkCafURGqva0U4E",
        "attendee_profile_url": "https://www.linkedin.com/in/yourname/"
      }
    ]
  },

  message_delivered: {
    "account_id": "dfXlh46vQYCsMbVarumWlg",
    "account_type": "LINKEDIN",
    "account_info": {
      "type": "LINKEDIN",
      "feature": "classic",
      "user_id": "ACoAAAcDMMQBODyLwZrRcgYhrkCafURGqva0U4E"
    },
    "event": "message_delivered",
    "chat_id": "R8J-xM9WX7eoHLp6gSVtWQ",
    "timestamp": new Date().toISOString(),
    "webhook_name": "Webhook demo",
    "message_id": "ykmhfXlRW0W_cqReJYrfBw",
    "sender": {
      "attendee_id": "12Siz1Vcmfnke_Vai4Gg",
      "attendee_name": "Your Name",
      "attendee_provider_id": "AA1212sqqsMQBODyLwZrRcgYhrkCafURGqva0U4E",
      "attendee_profile_url": "https://www.linkedin.com/in/yourname/"
    }
  },

  message_read: {
    "account_id": "dfXlh46vQYCsMbVarumWlg",
    "account_type": "LINKEDIN",
    "event": "message_read",
    "chat_id": "R8J-xM9WX7eoHLp6gSVtWQ",
    "timestamp": new Date().toISOString(),
    "webhook_name": "Webhook demo",
    "message_id": "ykmhfXlRW0W_cqReJYrfBw"
  },

  message_failed: {
    "account_id": "dfXlh46vQYCsMbVarumWlg",
    "account_type": "LINKEDIN",
    "event": "message_failed",
    "chat_id": "R8J-xM9WX7eoHLp6gSVtWQ",
    "timestamp": new Date().toISOString(),
    "webhook_name": "Webhook demo",
    "message_id": "ykmhfXlRW0W_cqReJYrfBw"
  },

  message_reaction: {
    "account_id": "dfXlh46vQYCsMbVarumWlg",
    "account_type": "LINKEDIN",
    "event": "message_reaction",
    "chat_id": "R8J-xM9WX7eoHLp6gSVtWQ",
    "timestamp": new Date().toISOString(),
    "webhook_name": "Webhook demo",
    "message_id": "ykmhfXlRW0W_cqReJYrfBw",
    "reaction": "👍",
    "reaction_sender": {
      "attendee_id": "C8zaRZTlVcmfnke_Vai4Gg",
      "attendee_name": "John Smith",
      "attendee_provider_id": "ACoAAAcDMMQBODyLwZrRcgYhrkCafURGqva0U4E",
      "attendee_profile_url": "https://www.linkedin.com/in/johnsmith/"
    }
  }
};

async function testWebhook(payload, eventType) {
  console.log(`\n🧪 Testing ${eventType}...`);

  try {
    const response = await fetch(WEBHOOK_TEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Unipile-Auth': WEBHOOK_SECRET,
        'User-Agent': 'Unipile-Webhook-Test'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    if (response.ok) {
      console.log(`✅ ${eventType}: ${response.status} - ${responseText}`);
    } else {
      console.log(`❌ ${eventType}: ${response.status} - ${responseText}`);
    }

    return { success: response.ok, status: response.status, response: responseText };
  } catch (error) {
    console.log(`❌ ${eventType}: Network error - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing Unipile Webhook Endpoint');
  console.log('=' .repeat(50));
  console.log(`URL: ${WEBHOOK_TEST_URL}`);
  console.log(`Secret: ${WEBHOOK_SECRET ? 'Set' : 'Not set'}`);
  console.log('');

  const results = [];

  // Test each event type
  for (const [eventType, payload] of Object.entries(samplePayloads)) {
    const result = await testWebhook(payload, eventType);
    results.push({ eventType, ...result });

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));

  const successful = results.filter(r => r.success).length;
  const total = results.length;

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.eventType}: ${result.success ? 'PASS' : 'FAIL'}`);
  });

  console.log('');
  console.log(`Results: ${successful}/${total} tests passed`);

  if (successful === total) {
    console.log('🎉 All webhook tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the webhook endpoint implementation.');
  }

  console.log('\n💡 Next steps:');
  console.log('1. Run the database migration: psql -f scripts/add-webhook-tracking.sql');
  console.log('2. Set UNIPILE_WEBHOOK_SECRET in Railway environment variables');
  console.log('3. Register the webhook URL with Unipile');
}

// Test authentication
async function testAuth() {
  console.log('\n🔐 Testing webhook authentication...');

  const testPayload = { test: true };

  // Test without auth header
  try {
    const response = await fetch(WEBHOOK_TEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    if (response.status === 401) {
      console.log('✅ Authentication correctly rejects requests without Unipile-Auth header');
    } else {
      console.log(`⚠️  Authentication test: Expected 401, got ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Auth test failed: ${error.message}`);
  }

  // Test with wrong auth header
  try {
    const response = await fetch(WEBHOOK_TEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Unipile-Auth': 'wrong-secret'
      },
      body: JSON.stringify(testPayload)
    });

    if (response.status === 401) {
      console.log('✅ Authentication correctly rejects requests with wrong secret');
    } else {
      console.log(`⚠️  Authentication test: Expected 401, got ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Auth test failed: ${error.message}`);
  }
}

// Run all tests
async function main() {
  await testAuth();
  await runTests();
}

main().catch(console.error);
