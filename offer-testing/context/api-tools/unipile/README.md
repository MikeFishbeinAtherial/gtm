# Unipile API - Complete Guide

## What Unipile Does

Unipile is a **LinkedIn and email inbox management API**. It provides:

1. **LinkedIn Integration** - Send messages, connection requests, manage inbox
2. **Email Integration** - Send emails, manage inbox
3. **Conversation Management** - Track all messages and replies
4. **Connection Sync** - Pull your LinkedIn connections and message history

## When to Use Unipile

### ✅ USE Unipile For:

1. **Sending LinkedIn Messages**
   - Direct messages to 1st-degree connections
   - Connection requests with personalized notes
   - InMail to 2nd/3rd-degree connections

2. **Managing Inbox**
   - Sync conversations and messages
   - Track replies and engagement
   - Monitor unread messages

3. **Connection Management**
   - Pull all 1st-degree connections
   - Get connection metadata (company, title, etc.)
   - Track connection dates

4. **Email Sending**
   - Send emails via connected email accounts
   - Track email delivery and opens

### ❌ DON'T Use Unipile For:

1. **Finding Contacts**
   - Use Parallel or Exa for finding people
   - Unipile only works with existing connections/contacts

2. **Company Research**
   - Use Parallel, Exa, or Sumble for company data
   - Unipile focuses on messaging, not research

3. **LinkedIn Profile Scraping**
   - Unipile provides API access, not scraping
   - Use for sending/managing, not data extraction

## Setup

### Environment Variables

Add to `.env.local`:
```bash
UNIPILE_API_KEY=your_api_key_here
UNIPILE_DSN=https://your-instance.unipile.com/api/v1
```

Get your credentials from: https://unipile.com/dashboard

### Client Import

```typescript
import { unipile } from '@/lib/clients/unipile'
// or
import { UnipileClient } from '@/lib/clients/unipile'
const client = new UnipileClient()
```

## Key Methods

### 1. List Accounts

Get your connected LinkedIn/email accounts:

```typescript
const accounts = await unipile.listAccounts()
const linkedinAccount = accounts.find(a => a.provider === 'linkedin')
```

### 2. Sync Connections

Pull all 1st-degree LinkedIn connections:

```typescript
import { syncLinkedInConnections } from '@/lib/networking/linkedin-sync'

const results = await syncLinkedInConnections(linkedinAccount.id)
// Returns: { total, new, updated, errors }
```

### 3. Sync Messages

Pull all conversations and messages:

```typescript
import { syncLinkedInMessages } from '@/lib/networking/linkedin-sync'

const results = await syncLinkedInMessages(linkedinAccount.id, 50)
// Returns: { conversations, messages, errors }
```

### 4. Send LinkedIn Message

Send a direct message to a 1st-degree connection:

```typescript
const result = await unipile.sendDM(
  linkedinAccount.id,
  'https://linkedin.com/in/person',
  'Your message here...'
)
```

### 5. Send Connection Request

Send a connection request with note:

```typescript
const result = await unipile.sendConnectionRequest(
  linkedinAccount.id,
  'https://linkedin.com/in/person',
  'Hi! I saw your post about...' // Max 300 chars
)
```

### 6. Get Conversations

Get all conversations:

```typescript
const conversations = await unipile.getConversations(linkedinAccount.id, 50)
```

### 7. Get Messages

Get messages in a conversation:

```typescript
const messages = await unipile.getMessages(linkedinAccount.id, conversationId)
```

## Rate Limits & Safety

**CRITICAL:** LinkedIn has strict rate limits. Always respect these:

- **Connection Requests:** Max 20/day (recommended: 18/day)
- **Messages:** Max 40/day (recommended: 38/day)
- **Delays:** 2-5 minutes between actions (with random jitter)
- **Business Hours:** Only send 9am-6pm weekdays (recipient timezone)

See `src/lib/utils/linkedin-safety.ts` for safety utilities.

## Integration with Networking Campaigns

### Full Sync Workflow

```typescript
import { fullLinkedInSync } from '@/lib/networking/linkedin-sync'

// Sync everything: connections + messages
const results = await fullLinkedInSync(linkedinAccount.id)
```

This stores data in Supabase:
- `linkedin_connections` - All 1st-degree connections
- `linkedin_conversations` - All conversation threads
- `linkedin_messages` - All individual messages

### Checking for Duplicates

Before sending, check if you've already messaged someone:

```typescript
// Check networking_outreach table (campaign messages)
const { data: existing } = await supabase
  .from('networking_outreach')
  .select('*')
  .eq('connection_id', connectionId)
  .eq('status', 'sent')
  .not('sent_at', 'is', null)
  .gte('sent_at', sevenDaysAgoISO)
  .single()

if (existing) {
  // Already messaged in last 7 days - skip
}
```

## Examples

See `examples.ts` for detailed code examples.

## Related Files

- **Client:** `src/lib/clients/unipile.ts`
- **Sync Functions:** `src/lib/networking/linkedin-sync.ts`
- **Safety Utils:** `src/lib/utils/linkedin-safety.ts`
- **Sync Script:** `scripts/sync-linkedin.ts`
