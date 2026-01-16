#!/usr/bin/env node

/**
 * Check Unipile for Actually Sent Messages
 * 
 * This script queries Unipile's API to see what messages were actually sent,
 * which is the source of truth (not the database).
 * 
 * USAGE:
 *   node scripts/check-unipile-sent-messages.js [search-name]
 * 
 * EXAMPLES:
 *   node scripts/check-unipile-sent-messages.js Tyler
 *   node scripts/check-unipile-sent-messages.js "Tyler John"
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

if (!UNIPILE_DSN || !UNIPILE_API_KEY) {
  console.error('❌ Missing UNIPILE_DSN or UNIPILE_API_KEY');
  process.exit(1);
}

const searchName = process.argv[2] || '';

async function main() {
  console.log('🔍 Checking Unipile for sent messages...\n');
  
  if (searchName) {
    console.log(`   Searching for: "${searchName}"\n`);
  }

  // Get LinkedIn account
  const accountsRes = await fetch(`${UNIPILE_DSN}/accounts`, {
    headers: {
      'X-API-KEY': UNIPILE_API_KEY,
      'Accept': 'application/json'
    }
  });
  
  const accounts = await accountsRes.json();
  const linkedinAccount = accounts.items?.find(acc => 
    (acc.provider || acc.type || acc.platform || '').toUpperCase() === 'LINKEDIN'
  );
  
  if (!linkedinAccount) {
    console.error('❌ No LinkedIn account found in Unipile');
    process.exit(1);
  }
  
  console.log(`✅ LinkedIn account: ${linkedinAccount.name || linkedinAccount.id}\n`);

  // Get recent chats/messages
  console.log('📬 Fetching recent conversations...\n');
  
  const chatsRes = await fetch(`${UNIPILE_DSN}/chats?account_id=${linkedinAccount.id}&limit=50`, {
    headers: {
      'X-API-KEY': UNIPILE_API_KEY,
      'Accept': 'application/json'
    }
  });
  
  if (!chatsRes.ok) {
    console.error('❌ Failed to fetch chats:', await chatsRes.text());
    process.exit(1);
  }
  
  const chats = await chatsRes.json();
  
  console.log(`📊 Found ${chats.items?.length || 0} recent conversations\n`);
  
  // Filter by search name if provided
  let filteredChats = chats.items || [];
  
  if (searchName) {
    filteredChats = filteredChats.filter(chat => {
      const participants = chat.attendees || chat.participants || [];
      return participants.some(p => {
        const name = p.name || p.display_name || '';
        return name.toLowerCase().includes(searchName.toLowerCase());
      });
    });
    
    console.log(`🔍 Filtered to ${filteredChats.length} conversations matching "${searchName}"\n`);
  }
  
  // Show recent messages
  for (const chat of filteredChats.slice(0, 10)) {
    const participants = chat.attendees || chat.participants || [];
    const otherPerson = participants.find(p => !p.is_me);
    const personName = otherPerson?.name || otherPerson?.display_name || 'Unknown';
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📧 Conversation with: ${personName}`);
    console.log(`   Chat ID: ${chat.id}`);
    console.log(`   Last activity: ${chat.last_message_at || chat.updated_at || 'Unknown'}`);
    
    // Get messages in this chat
    try {
      const messagesRes = await fetch(`${UNIPILE_DSN}/chats/${chat.id}/messages?limit=5`, {
        headers: {
          'X-API-KEY': UNIPILE_API_KEY,
          'Accept': 'application/json'
        }
      });
      
      if (messagesRes.ok) {
        const messages = await messagesRes.json();
        
        if (messages.items && messages.items.length > 0) {
          console.log(`   Messages (last ${messages.items.length}):`);
          
          for (const msg of messages.items.slice(0, 3)) {
            const sender = msg.sender?.name || (msg.is_from_me ? 'YOU' : 'Them');
            const text = (msg.text || msg.body || '').substring(0, 100);
            const time = msg.timestamp || msg.created_at || '';
            
            console.log(`\n   [${time}] ${sender}:`);
            console.log(`   "${text}${text.length >= 100 ? '...' : ''}"`);
          }
        }
      }
    } catch (e) {
      console.log(`   (Could not fetch messages: ${e.message})`);
    }
  }
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('\n✅ Check complete.');
  console.log('   This shows what Unipile actually has - the source of truth for LinkedIn messages.');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
