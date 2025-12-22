# Networking Campaign - System Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR LINKEDIN                            │
│                                                                  │
│  • 1st-degree connections (487 people)                          │
│  • Message history                                               │
│  • Profile data                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ API calls
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                          UNIPILE                                 │
│                                                                  │
│  • Connects to your LinkedIn                                    │
│  • Provides API to read connections & messages                  │
│  • Can send messages via API                                    │
│                                                                  │
│  DSN: https://????.unipile.com:????/api/v1                     │
│  API Key: 2HdAnLfuG.8z5MjY+YB9oo3jxLmwpWbHTcvsJ6anI4dQj2uDG3XKo=│
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ scripts/sync-linkedin.ts
                         │ (pulls data via API)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ linkedin_connections                                      │  │
│  │ ─────────────────                                         │  │
│  │ • id, linkedin_id, full_name                             │  │
│  │ • current_company, current_title                         │  │
│  │ • last_interaction_at                                    │  │
│  │ • priority, tags, notes                                  │  │
│  │ • skip_outreach, skip_reason                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           │ foreign key                          │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ linkedin_messages                                         │  │
│  │ ──────────────────                                        │  │
│  │ • connection_id (FK)                                      │  │
│  │ • message_text, sent_at                                   │  │
│  │ • is_from_me                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ networking_campaign_batches                               │  │
│  │ ────────────────────────────                              │  │
│  │ • name: "Holiday 2025 Reconnect"                         │  │
│  │ • message_template                                        │  │
│  │ • target_filters (who to contact)                        │  │
│  │ • status, metrics                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ networking_outreach                                       │  │
│  │ ────────────────────                                      │  │
│  │ • batch_id (FK), connection_id (FK)                      │  │
│  │ • personalized_message                                    │  │
│  │ • status (pending/sent/replied)                          │  │
│  │ • reply_text, reply_sentiment                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  VIEWS:                                                          │
│  • networking_contacts_ready (who to contact)                   │
│  • networking_batch_performance (metrics)                       │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          │ Query & analyze
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        YOU                                       │
│                                                                  │
│  1. Review connections ready for outreach                       │
│  2. Personalize each message                                    │
│  3. Send via LinkedIn (manually or via Unipile API)            │
│  4. Track responses in database                                 │
│  5. Follow up on positive replies                               │
└─────────────────────────────────────────────────────────────────┘
```

## Workflow Steps

### 1. Initial Sync (Once)

```
┌─────────┐    API Call     ┌─────────┐    Store    ┌──────────┐
│ Unipile │ ────────────►   │  Script │ ─────────►  │ Supabase │
│         │  List           │         │  Insert      │          │
│         │  Connections    │         │  Records     │          │
└─────────┘                 └─────────┘              └──────────┘
     │
     │ Also fetch
     │ messages
     ▼
  Message
  History
```

**Command**: `npx ts-node --esm scripts/sync-linkedin.ts`

**Result**: All 487 connections + message history in Supabase

### 2. Preparation

```sql
-- Mark people to skip
UPDATE linkedin_connections
SET skip_outreach = TRUE
WHERE tags && ARRAY['family', 'close_friend'];

-- Set priorities
UPDATE linkedin_connections
SET priority = 'high'
WHERE <your criteria>;
```

### 3. Campaign Creation

```sql
-- Create campaign batch
INSERT INTO networking_campaign_batches (
  name,
  message_template,
  target_filters,
  status
) VALUES (
  'Holiday 2025 Reconnect',
  'Hey {first_name}...',
  '{"relationship_strength": ["weak"], ...}'::jsonb,
  'draft'
);
```

### 4. Target Identification

```sql
-- Query who to contact
SELECT *
FROM networking_contacts_ready
WHERE recency_category IN ('stale', 'very_stale')
AND priority != 'low'
LIMIT 30;
```

Returns people you:
- Haven't talked to in 6+ months
- Haven't contacted in this campaign
- Haven't marked to skip
- Have marked as medium/high priority

### 5. Message Personalization

For each target:
```sql
INSERT INTO networking_outreach (
  batch_id,
  connection_id,
  personalized_message,
  personalization_notes,
  status
) VALUES (
  '<batch-id>',
  '<connection-id>',
  'Hey John! Hope you''re doing well...',
  'Mentioned his new role at Acme Corp',
  'pending'
);
```

### 6. Sending

**Option A: Manual** (Recommended)
1. Query pending messages
2. Copy each message
3. Send via LinkedIn
4. Mark as sent in DB

**Option B: API** (Build later)
1. Query pending messages  
2. Use Unipile API to send
3. Rate limit: 20-25/day
4. Random delays between sends

### 7. Response Tracking

When someone replies:
```sql
UPDATE networking_outreach
SET 
  status = 'replied',
  replied_at = NOW(),
  reply_text = 'Their response...',
  reply_sentiment = 'positive',
  needs_follow_up = TRUE
WHERE id = '<outreach-id>';
```

### 8. Metrics

```sql
SELECT * FROM networking_batch_performance;
```

Shows:
- Total sent
- Reply rate
- Positive reply rate
- Progress

## Key Design Decisions

### Why Separate Tables?

**Networking campaign ≠ Cold outbound**

| Aspect | Cold Outbound | Networking |
|--------|---------------|------------|
| Source | Discovery (Parallel, Exa) | Existing connections |
| Tables | `companies`, `contacts` | `linkedin_connections` |
| Personalization | Company/role based | Relationship based |
| Volume | High (100s-1000s) | Lower (50-100) |
| Tracking | Lead status, meetings | Relationship, referrals |

Separate tables because:
- Different data models
- Different workflows
- Different metrics
- Prevents confusion

### Why Manual Sending?

**Safer & Better Results**

1. **LinkedIn safety**: Manual = looks human
2. **Better personalization**: Forces you to review each message
3. **Relationship building**: Shows genuine effort
4. **Flexibility**: Can adjust on the fly

**When to automate**: After you've validated your approach with 50-100 manual sends.

### Why Message History Matters

**Enables real personalization**:
- "I remember when we talked about..."
- "Last time we chatted, you were..."
- "Haven't heard from you since..."

**Recency segmentation**:
- Never messaged → Different approach
- 1+ year stale → "Been a while!"
- 3-6 months → "Wanted to check in"
- Recent → Skip for now

## Error Handling

### Unipile Sync Failures

```typescript
// scripts/sync-linkedin.ts tracks errors
{
  total: 487,
  new: 450,
  updated: 37,
  errors: [
    "Error inserting John Doe: duplicate linkedin_id",
    "Error processing Jane Smith: missing linkedin_id"
  ]
}
```

**Action**: Review errors, fix data, re-run sync

### Rate Limiting

LinkedIn limits:
- 40 messages/day (official)
- 20-25 messages/day (recommended)

**Enforcement**:
- Manual: You control pace
- API: Build rate limiter

### Database Constraints

**Unique constraints prevent duplicates**:
- `linkedin_connections.linkedin_id` - UNIQUE
- `linkedin_messages.unipile_message_id` - UNIQUE
- `linkedin_conversations.unipile_chat_id` - UNIQUE

If sync tries to insert duplicate → Error (by design)

## Security & Privacy

### Environment Variables

**Never commit**:
- `.env.local`
- API keys
- DSN URLs

**Always in .gitignore**

### LinkedIn Data

**Stored locally** (Supabase):
- You control the data
- Can delete anytime
- GDPR compliant (you own it)

**Don't share**:
- Connection lists
- Message history
- Personal data

### API Keys

**Least privilege**:
- Unipile: Read connections & send messages only
- Supabase: Service role (full access needed)

**Rotate regularly**: Change keys every few months

## Performance

### Sync Speed

**Initial sync** (487 connections):
- Connections: ~30 seconds
- Messages (50 convos): ~2 minutes
- **Total: 2-3 minutes**

**Incremental sync** (daily):
- Just new messages: ~10 seconds

### Query Performance

**Views are fast**:
- `networking_contacts_ready` - 487 rows, instant
- `networking_batch_performance` - Aggregated, instant

**Indexes on**:
- `linkedin_id` (lookups)
- `last_interaction_at` (sorting)
- Foreign keys (joins)

### Storage

**Minimal**:
- 487 connections × ~2KB = ~1MB
- 1000 messages × ~1KB = ~1MB
- **Total: ~2-3MB**

Free tier Supabase = 500MB (plenty)

## Extensibility

### Future Enhancements

**Could add**:
1. **AI personalization** - Claude generates messages
2. **Sentiment analysis** - Analyze reply tone
3. **Referral tracking** - Track who introduces who
4. **Email integration** - Combine LinkedIn + email outreach
5. **CRM sync** - Push leads to your CRM
6. **Automated follow-ups** - Schedule reminders

**Currently focused on**: Manual, relationship-first approach

---

## Summary

**Data flows**:
LinkedIn → Unipile API → Sync Script → Supabase → You

**You control**:
- Who to contact
- What to say
- When to send
- How to follow up

**System helps with**:
- Organizing connections
- Tracking history
- Identifying targets
- Measuring results

**Philosophy**: 
Use technology to be more thoughtful, not to spam at scale.

