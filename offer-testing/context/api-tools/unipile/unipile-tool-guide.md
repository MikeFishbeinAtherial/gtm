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

## Getting LinkedIn Member IDs

**CRITICAL:** Unipile requires LinkedIn **member IDs** (like `ACoAAABHHUIBcypgACxVCPvvXIL7RHwHohWS-Q0`), NOT usernames (like `john-doe`).

### The Problem

When importing connections from CSV, you often only have LinkedIn URLs:
- ✅ Good: `https://linkedin.com/in/john-doe`
- ❌ Bad: Storing `john-doe` as the LinkedIn ID

Unipile's API requires the actual member ID, which looks like:
- `ACoAAABHHUIBcypgACxVCPvvXIL7RHwHohWS-Q0`
- `urn:li:member:1234567890`

### Solution: Use the Cache System

We cache all Unipile relations locally to avoid repeated API calls:

#### Step 1: Populate Cache (One Time)

```bash
node scripts/cache-unipile-relations.js
```

This fetches all 7,671+ relations from Unipile and stores them in `unipile_relations_cache` table.

#### Step 2: Fix Campaign LinkedIn IDs

For any campaign with invalid LinkedIn IDs:

```bash
node scripts/fix-campaign-linkedin-ids.js "Campaign Name"
```

This script:
1. Finds all connections in the campaign with invalid IDs
2. Looks them up in the local cache (instant!)
3. Updates `linkedin_connections.linkedin_id` with the real member ID
4. Shows progress: `[X/531] (X%) - Xs elapsed, ~Xs remaining`

#### Step 3: Verify IDs Are Valid

```sql
-- Check campaign status
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN lc.linkedin_id IS NOT NULL 
               AND lc.linkedin_id NOT LIKE 'temp_%' 
               AND (lc.linkedin_id ~ '^urn:' OR lc.linkedin_id !~ '^[a-z0-9-]+$') 
          THEN 1 END) as valid_ids,
    COUNT(CASE WHEN lc.linkedin_id IS NULL 
               OR lc.linkedin_id LIKE 'temp_%' 
               OR (lc.linkedin_id !~ '^urn:' AND lc.linkedin_id ~ '^[a-z0-9-]+$') 
          THEN 1 END) as invalid_ids
FROM networking_campaign_batches ncb
JOIN networking_outreach no ON ncb.id = no.batch_id
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE ncb.name = 'Your Campaign Name';
```

### When to Refresh Cache

Refresh the cache weekly or when:
- You've added many new LinkedIn connections
- Cache is > 7 days old
- Scripts can't find connections (cache might be stale)

```bash
node scripts/cache-unipile-relations.js
```

### How It Works

1. **Cache Table:** `unipile_relations_cache`
   - Stores member IDs, URLs, names, etc.
   - Indexed for fast lookups

2. **Automatic Usage:**
   - Scripts check cache first
   - If cache is fresh (< 7 days), use it
   - If stale, fetch from API and update cache

3. **Performance:**
   - **Without cache:** 5-10 minutes to fetch 7,671 relations
   - **With cache:** < 1 second to load from database

### Invalid ID Patterns

These are considered invalid and need fixing:
- `temp_123456` (temporary IDs)
- `john-doe` (username instead of member ID)
- `null` or empty

Valid member IDs look like:
- `ACoAAABHHUIBcypgACxVCPvvXIL7RHwHohWS-Q0`
- `urn:li:member:1234567890`

### Related Scripts

- `scripts/cache-unipile-relations.js` - Populate/refresh cache
- `scripts/fix-campaign-linkedin-ids.js` - Fix IDs for a campaign
- `scripts/create-unipile-cache-table.sql` - Table schema

See `docs/unipile-cache-system.md` for full documentation.

## Examples

See `examples.ts` for detailed code examples.

## Related Files

- **Client:** `src/lib/clients/unipile.ts`
- **Sync Functions:** `src/lib/networking/linkedin-sync.ts`
- **Safety Utils:** `src/lib/utils/linkedin-safety.ts`
- **Sync Script:** `scripts/sync-linkedin.ts`
- **Cache Script:** `scripts/cache-unipile-relations.js`
- **Fix IDs Script:** `scripts/fix-campaign-linkedin-ids.js`
