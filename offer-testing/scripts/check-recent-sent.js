#!/usr/bin/env node

/**
 * Check ACTUAL messages sent through Unipile
 * Shows the last N messages that YOU sent (not received)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const UNIPILE_DSN = process.env.UNIPILE_DSN;
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;

async function main() {
  console.log('🔍 Checking ACTUAL messages sent through Unipile...\n');

  // Get LinkedIn account
  const accountsRes = await fetch(`${UNIPILE_DSN}/accounts`, {
    headers: { 'X-API-KEY': UNIPILE_API_KEY, 'Accept': 'application/json' }
  });
  
  const accounts = await accountsRes.json();
  const linkedinAccount = accounts.items?.find(acc => 
    (acc.provider || acc.type || acc.platform || '').toUpperCase() === 'LINKEDIN'
  );
  
  if (!linkedinAccount) {
    console.error('❌ No LinkedIn account found');
    process.exit(1);
  }
  
  console.log(`✅ LinkedIn account: ${linkedinAccount.name || linkedinAccount.id}\n`);

  // Get recent chats
  const chatsRes = await fetch(`${UNIPILE_DSN}/chats?account_id=${linkedinAccount.id}&limit=100`, {
    headers: { 'X-API-KEY': UNIPILE_API_KEY, 'Accept': 'application/json' }
  });
  
  const chats = await chatsRes.json();
  console.log(`📬 Checking ${chats.items?.length || 0} recent conversations for YOUR sent messages...\n`);

  // Track messages sent by me
  const mySentMessages = [];
  const recipientCounts = {};

  for (const chat of (chats.items || []).slice(0, 50)) {
    try {
      const messagesRes = await fetch(`${UNIPILE_DSN}/chats/${chat.id}/messages?limit=10`, {
        headers: { 'X-API-KEY': UNIPILE_API_KEY, 'Accept': 'application/json' }
      });
      
      if (!messagesRes.ok) continue;
      
      const messages = await messagesRes.json();
      
      for (const msg of (messages.items || [])) {
        // Check if this message was sent by me
        const isFromMe = msg.is_sender || msg.is_from_me || msg.from_me || 
                         msg.sender?.is_me || msg.direction === 'outbound';
        
        if (isFromMe && msg.text) {
          // Get recipient info from chat attendees
          const attendees = chat.attendees || chat.participants || [];
          const recipient = attendees.find(a => !a.is_me) || {};
          
          mySentMessages.push({
            time: msg.timestamp || msg.created_at || msg.sent_at,
            recipient: recipient.name || recipient.display_name || 'Unknown',
            recipientId: recipient.id || recipient.attendee_id || chat.id,
            text: (msg.text || '').substring(0, 150),
            chatId: chat.id
          });
          
          // Count by recipient
          const recipientKey = recipient.name || recipient.display_name || chat.id;
          recipientCounts[recipientKey] = (recipientCounts[recipientKey] || 0) + 1;
        }
      }
    } catch (e) {
      // Skip errors
    }
  }

  // Sort by time (most recent first)
  mySentMessages.sort((a, b) => new Date(b.time) - new Date(a.time));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📤 YOUR SENT MESSAGES (Last 20):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const msg of mySentMessages.slice(0, 20)) {
    console.log(`[${msg.time}]`);
    console.log(`To: ${msg.recipient}`);
    console.log(`"${msg.text}..."`);
    console.log('');
  }

  // Show duplicates
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  RECIPIENTS WITH MULTIPLE MESSAGES:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let foundDuplicates = false;
  for (const [recipient, count] of Object.entries(recipientCounts)) {
    if (count > 1) {
      foundDuplicates = true;
      console.log(`❌ ${recipient}: ${count} messages sent`);
    }
  }

  if (!foundDuplicates) {
    console.log('✅ No duplicates found in checked messages');
  }

  console.log('\n✅ Check complete.');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
