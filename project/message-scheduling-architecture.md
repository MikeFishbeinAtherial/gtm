# Message Scheduling & Limiting Architecture

## Overview

The system uses a **multi-layer approach** to schedule and limit message sending:

1. **Message Creation Scripts** - Assign accounts and calculate initial schedules
2. **Railway Cron Job** - Enforces business hours and daily limits at send time
3. **Database Schema** - Stores limits and tracks activity

---

## Architecture Components

### 1. Message Creation Phase

**Location:** Scripts like `create-roleplay-email-messages.ts`

**Responsibilities:**
- Assigns `account_id` to each message (round-robin or based on campaign config)
- Calculates `scheduled_at` timestamp respecting:
  - Business hours (9 AM - 6 PM ET, Mon-Fri for cold email)
  - Daily limits per account (20 emails/day default)
  - Random spacing (5-20 minutes between messages)
- Inserts into `messages` table with `status = 'pending'`

**Key Code Pattern:**
```typescript
// Assign account (round-robin)
const accountId = accountIds[i % accountIds.length]

// Calculate next available time slot
let nextTime = lastScheduledByAccount.get(accountId) || new Date()

// Enforce business hours
if (!inBusinessHoursET(nextTime)) {
  nextTime = moveToNextBusinessMorningET(nextTime)
}

// Enforce daily limits
const dateKey = formatDateET(nextTime)
const dayCount = dailyCountByAccount.get(accountId)!.get(dateKey) || 0
if (dayCount >= DAILY_LIMIT) {
  nextTime = moveToNextBusinessMorningET(
    new Date(nextTime.getTime() + 24 * 60 * 60 * 1000)
  )
}

// Insert message
messagesToInsert.push({
  account_id: accountId,
  scheduled_at: nextTime.toISOString(),
  // ...
})
```

**Files:**
- `scripts/create-roleplay-email-messages.ts`
- `scripts/create-email-messages.ts`
- `src/lib/services/message-scheduler.ts` (alternative service)

---

### 2. Enqueue Phase

**Location:** Manual SQL or helper scripts

**Responsibilities:**
- Copies messages from `messages` table to `send_queue` table
- Links via `external_message_id = messages.id`
- Sets `scheduled_for = messages.scheduled_at`
- Updates `messages.status = 'queued'`

**SQL Pattern:**
```sql
INSERT INTO send_queue (
  campaign_id,
  contact_id,
  account_id,
  channel,
  subject,
  body,
  scheduled_for,
  external_message_id,
  status
)
SELECT 
  m.campaign_id,
  m.contact_id,
  m.account_id,
  m.channel,
  m.subject,
  m.body,
  m.scheduled_at,
  m.id,
  'pending'
FROM messages m
WHERE m.campaign_id = '...'
  AND m.status = 'pending'
  AND m.channel = 'email'
ON CONFLICT DO NOTHING;

UPDATE messages
SET status = 'queued'
WHERE campaign_id = '...'
  AND status = 'pending';
```

**Helper Scripts:**
- `scripts/enqueue-messages.ts` (to be created)
- Manual SQL execution

---

### 3. Sending Phase (Railway Cron)

**Location:** `scripts/process-message-queue.js`

**Responsibilities:**
- Runs every 5 minutes via Railway cron
- **Business Hours Check** - Skips processing if outside business hours
- **Daily Limit Check** - Verifies account hasn't exceeded daily limit
- **Account Spacing** - Ensures minimum interval between sends per account
- Sends via Unipile API
- Logs to `account_activity` table for limit tracking

**Business Hours Enforcement:**
```javascript
const BUSINESS_HOURS_START = 9; // 9 AM ET
const BUSINESS_HOURS_END = 18; // 6 PM ET
const SEND_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri only

function isWithinSendWindow(dateInTz) {
  const day = dateInTz.getDay();
  const hour = dateInTz.getHours();
  const isWeekday = SEND_DAYS.includes(day);
  const isWithinHours = hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
  return isWeekday && isWithinHours;
}

// In processDueMessages():
const nowInTz = getNowInTimeZone();
if (!isWithinSendWindow(nowInTz)) {
  console.log('⏰ Outside send window - skipping');
  return false;
}
```

**Daily Limit Enforcement:**
```javascript
async function checkDailyCapForAccount(accountId, account, actionType) {
  const dailyLimit = getDailyLimitForAccount(account, actionType);
  
  // Count sends today from account_activity
  const { count: sentToday } = await supabase
    .from('account_activity')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('action_type', actionType)
    .eq('status', 'success')
    .gte('created_at', startUtc.toISOString())
    .lt('created_at', endUtc.toISOString());
  
  if (sentToday >= dailyLimit) {
    return {
      canSend: false,
      reason: `Daily cap reached (${sentToday}/${dailyLimit})`,
      nextTime: getNextDayStartUtc(nowInTz)
    };
  }
  
  return { canSend: true };
}
```

**Limit Source Priority:**
1. `accounts.daily_limit_emails` (per-account override)
2. `DEFAULT_DAILY_LIMITS.email` (fallback: 20/day)

**Files:**
- `scripts/process-message-queue.js` (main cron job)

---

## Database Schema

### Accounts Table

Stores per-account limits and configuration:

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('linkedin', 'email')),
  unipile_account_id TEXT,
  email_address TEXT,
  
  -- Daily Limits (per account)
  daily_limit_emails INTEGER DEFAULT 100,
  daily_limit_connections INTEGER DEFAULT 20,
  daily_limit_messages INTEGER DEFAULT 40,
  
  -- Today's Activity (reset daily)
  today_emails INTEGER DEFAULT 0,
  today_connections INTEGER DEFAULT 0,
  today_messages INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'active',
  -- ...
);
```

**Key Columns:**
- `daily_limit_emails` - Max emails per day for this account
- `unipile_account_id` - Links to Unipile account
- `type` - 'email' or 'linkedin'

---

### Messages Table

Stores message content and initial schedule:

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  contact_id UUID REFERENCES contacts(id),
  account_id UUID REFERENCES accounts(id),  -- ⭐ Assigned at creation
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  scheduled_at TIMESTAMPTZ,  -- ⭐ Calculated at creation
  status TEXT DEFAULT 'pending',
  -- ...
);
```

**Key Columns:**
- `account_id` - Which account will send this message
- `scheduled_at` - When message was originally scheduled
- `status` - 'pending' → 'queued' → 'sent'

---

### Send Queue Table

Execution queue for Railway cron:

```sql
CREATE TABLE send_queue (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  contact_id UUID REFERENCES contacts(id),
  account_id UUID REFERENCES accounts(id),  -- ⭐ Links to account
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  scheduled_for TIMESTAMPTZ,  -- ⭐ When to send (copied from messages.scheduled_at)
  external_message_id TEXT,  -- Links back to messages.id
  status TEXT DEFAULT 'pending',
  -- ...
);
```

**Key Columns:**
- `account_id` - Which account will send (used for limit checking)
- `scheduled_for` - When cron should process this item
- `external_message_id` - Links to source `messages.id`

---

### Account Activity Table

Tracks actual sends for limit enforcement:

```sql
CREATE TABLE account_activity (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  message_id UUID REFERENCES messages(id),
  contact_id UUID REFERENCES contacts(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'email',
    'message',
    'connection_request',
    'inmail'
  )),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'rate_limited')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- ...
);
```

**Usage:**
- Railway cron logs each successful send here
- Daily limit checks count `WHERE account_id = X AND action_type = 'email' AND status = 'success' AND created_at >= start_of_day`

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Message Creation Script                                  │
│    (create-roleplay-email-messages.ts)                      │
├─────────────────────────────────────────────────────────────┤
│ • Assign account_id (round-robin)                          │
│ • Calculate scheduled_at (business hours + daily limits)    │
│ • Insert into messages table                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Enqueue Phase                                            │
│    (Manual SQL or script)                                   │
├─────────────────────────────────────────────────────────────┤
│ • Copy messages → send_queue                               │
│ • Set scheduled_for = messages.scheduled_at                │
│ • Update messages.status = 'queued'                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Railway Cron Job                                         │
│    (process-message-queue.js, runs every 5 min)            │
├─────────────────────────────────────────────────────────────┤
│ CHECK 1: Business Hours?                                   │
│   • If outside 9 AM - 6 PM ET Mon-Fri → SKIP               │
│                                                             │
│ CHECK 2: Daily Limit?                                      │
│   • Count account_activity WHERE account_id = X             │
│   • If count >= accounts.daily_limit_emails → RESCHEDULE   │
│                                                             │
│ CHECK 3: Account Spacing?                                   │
│   • Min 6 minutes between sends per account                 │
│                                                             │
│ SEND: If all checks pass                                    │
│   • Send via Unipile API                                   │
│   • Log to account_activity                                │
│   • Update send_queue.status = 'sent'                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration Points

### Per-Account Limits

Set in `accounts` table:

```sql
UPDATE accounts
SET daily_limit_emails = 20
WHERE unipile_account_id = '0pKp3VL5TGSAMQpg-eNC7A';
```

### Business Hours

Configured in `process-message-queue.js`:

```javascript
const BUSINESS_HOURS_START = 9; // 9 AM ET
const BUSINESS_HOURS_END = 18; // 6 PM ET
const SEND_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri
```

### Default Limits

Fallback if account doesn't have limit set:

```javascript
const DEFAULT_DAILY_LIMITS = {
  email: 20,
  linkedin_dm: 50,
  linkedin_connect: 20,
};
```

---

## Key Principles

1. **Account Assignment at Creation** - Each message gets `account_id` when created
2. **Dual Enforcement** - Limits enforced both at creation (scheduling) and send time (cron)
3. **Activity Tracking** - `account_activity` table is source of truth for actual sends
4. **Rescheduling** - Cron automatically reschedules if limits exceeded
5. **Business Hours** - Enforced at cron level (won't send outside hours even if scheduled)

---

## Troubleshooting

### Messages not sending

1. Check `send_queue.status = 'pending'` and `scheduled_for <= NOW()`
2. Check Railway cron logs for business hours skip messages
3. Check `account_activity` for daily limit reschedules
4. Verify `accounts.daily_limit_emails` is set correctly

### Daily limits not working

1. Verify `accounts.daily_limit_emails` is set (not NULL)
2. Check `account_activity` table has correct `account_id` and `action_type`
3. Verify Railway cron is logging sends to `account_activity`

### Business hours not enforced

1. Check `BUSINESS_HOURS_START` and `BUSINESS_HOURS_END` in `process-message-queue.js`
2. Verify `SEND_DAYS` array excludes weekends
3. Check Railway cron logs for "Outside send window" messages

---

## Related Files

- `scripts/create-roleplay-email-messages.ts` - Message creation with scheduling
- `scripts/process-message-queue.js` - Railway cron job (enforcement)
- `scripts/check-daily-limits.ts` - Verification script
- `scripts/fix-daily-limits.ts` - Fix script for limit violations
- `project/supabase_schema.md` - Full database schema
