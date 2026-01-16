#!/usr/bin/env node

/**
 * Reconcile Unipile Sent Messages vs Supabase
 *
 * This script checks Unipile for outbound messages and compares them to
 * networking_outreach records. It helps detect "sent in Unipile but not
 * recorded in Supabase" cases.
 *
 * USAGE:
 *   node scripts/reconcile-unipile-sent.js
 *
 * OPTIONAL FLAGS:
 *   --hours=24        (default: 24)
 *   --chat-limit=100  (default: 100)
 *   --msg-limit=10    (default: 10 per chat)
 *   --dry-run=true    (default: true)
 *
 * NOTE:
 * - This script is read-only by default (dry-run).
 * - If you want to auto-fix, we can add a --repair flag later.
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
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_SERVICE_KEY;

if (!UNIPILE_DSN || !UNIPILE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing credentials (Unipile or Supabase)');
  process.exit(1);
}

const args = process.argv.slice(2);
function getArgValue(prefix, defaultValue) {
  const arg = args.find(a => a.startsWith(`${prefix}=`));
  if (!arg) return defaultValue;
  return arg.split('=').slice(1).join('=');
}

const HOURS = parseInt(getArgValue('--hours', '24'), 10);
const CHAT_LIMIT = parseInt(getArgValue('--chat-limit', '100'), 10);
const MSG_LIMIT = parseInt(getArgValue('--msg-limit', '10'), 10);
const DRY_RUN = getArgValue('--dry-run', 'true') === 'true';

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function unipileGet(endpoint) {
  const res = await fetch(`${UNIPILE_DSN}${endpoint}`, {
    headers: {
      'X-API-KEY': UNIPILE_API_KEY,
      'Accept': 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`Unipile error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function isOutboundMessage(msg) {
  return Boolean(
    msg.is_sender ||
    msg.is_from_me ||
    msg.from_me ||
    msg.sender?.is_me ||
    msg.direction === 'outbound'
  );
}

async function main() {
  console.log('🔍 Reconciling Unipile outbound messages vs Supabase');
  console.log(`   Window: last ${HOURS} hours`);
  console.log(`   Chat limit: ${CHAT_LIMIT}`);
  console.log(`   Message limit per chat: ${MSG_LIMIT}`);
  console.log(`   Dry run: ${DRY_RUN}\n`);

  // Fetch LinkedIn account
  const accounts = await unipileGet('/accounts');
  const linkedinAccount = accounts.items?.find(acc =>
    (acc.provider || acc.type || acc.platform || '').toUpperCase() === 'LINKEDIN'
  );
  if (!linkedinAccount) {
    console.error('❌ No LinkedIn account found in Unipile');
    process.exit(1);
  }

  // Fetch recent chats
  const chats = await unipileGet(`/chats?account_id=${linkedinAccount.id}&limit=${CHAT_LIMIT}`);
  const cutoff = Date.now() - HOURS * 60 * 60 * 1000;

  const outbound = [];

  for (const chat of chats.items || []) {
    const messages = await unipileGet(`/chats/${chat.id}/messages?limit=${MSG_LIMIT}`);
    for (const msg of messages.items || []) {
      const ts = new Date(msg.timestamp || msg.created_at || msg.sent_at || 0).getTime();
      if (!ts || ts < cutoff) continue;
      if (!isOutboundMessage(msg)) continue;

      const attendees = chat.attendees || chat.participants || [];
      const recipient = attendees.find(a => !a.is_me) || {};

      outbound.push({
        unipile_message_id: msg.id || msg.message_id || null,
        unipile_chat_id: chat.id,
        sent_at: new Date(ts).toISOString(),
        recipient_name: recipient.name || recipient.display_name || null,
        recipient_id: recipient.id || recipient.attendee_id || null,
        text: (msg.text || msg.body || '').trim()
      });
    }
  }

  console.log(`📤 Found ${outbound.length} outbound messages in Unipile\n`);

  const mismatches = [];

  for (const msg of outbound) {
    // Try to match by unipile_message_id if stored
    const { data: matchById } = await supabase
      .from('networking_outreach')
      .select('id, status, sent_at, connection_id, linkedin_connections!inner(linkedin_id)')
      .eq('unipile_message_id', msg.unipile_message_id)
      .limit(1);

    if (matchById && matchById.length > 0) {
      continue;
    }

    // Fallback: match by exact text + time window
    const { data: matchByText } = await supabase
      .from('networking_outreach')
      .select('id, status, sent_at, connection_id, linkedin_connections!inner(linkedin_id)')
      .eq('status', 'sent')
      .eq('personalized_message', msg.text)
      .gte('sent_at', new Date(cutoff).toISOString())
      .limit(1);

    if (!matchByText || matchByText.length === 0) {
      mismatches.push(msg);
    }
  }

  if (mismatches.length === 0) {
    console.log('✅ No mismatches found. Supabase matches Unipile for this window.');
    return;
  }

  console.log('⚠️ Potential mismatches (sent in Unipile, not recorded in Supabase):');
  mismatches.forEach((m, i) => {
    console.log(`\n${i + 1}) ${m.sent_at}`);
    console.log(`   Recipient: ${m.recipient_name || 'Unknown'}`);
    console.log(`   Chat ID: ${m.unipile_chat_id}`);
    console.log(`   Unipile Message ID: ${m.unipile_message_id || 'Unknown'}`);
    console.log(`   Text: ${m.text.slice(0, 200)}${m.text.length > 200 ? '...' : ''}`);
  });

  if (DRY_RUN) {
    console.log('\n🟡 Dry run only. No database changes were made.');
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
