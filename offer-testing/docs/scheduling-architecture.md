# Message Scheduling Architecture

## Overview

Messages are scheduled at campaign creation time, not at send time.
Railway cron jobs execute scheduled messages, not schedule them.

## The Two Levers

1. **Cursor: Sets `scheduled_at` timestamps** (5-10 min apart)
2. **Railway: Queries `WHERE scheduled_at <= NOW()`** (only due messages)

## Safety Guarantees

- Max 3 messages per cron run (LIMIT clause)
- Rate limit check before each send
- Messages spread 5-10 minutes apart
- New campaigns stack AFTER existing queue

## Campaign Types

### Cold Outreach Campaigns
- **Purpose**: Prospecting to new contacts
- **Rules**: Never message 1st degree LinkedIn connections
- **Sending**: Connection requests to 2nd/3rd degree, DMs to existing conversations
- **Use case**: Sales prospecting, lead generation

### Networking Campaigns
- **Purpose**: Reaching out to existing network
- **Rules**: Allow messaging 1st degree connections
- **Sending**: DMs to all connections (1st, 2nd, 3rd degree)
- **Use case**: Holiday networking, relationship building

**Database field**: `campaigns.campaign_type` ('cold_outreach' or 'networking')

## Key Files

- `src/lib/services/message-scheduler.ts` - Scheduling logic
- `scripts/process-message-queue.js` - Railway cron job
- `campaigns.scheduling_config` - Per-campaign config (JSONB)
- `campaigns.campaign_type` - Outreach type (cold_outreach/networking)
- `messages.scheduled_at` - Individual message timestamps

## Architecture Flow

```mermaid
graph TD
    A[Campaign Launch] --> B[Generate Messages]
    B --> C[MessageScheduler.scheduleNewMessages()]
    C --> D[Query last scheduled message]
    D --> E[Calculate next available slots]
    E --> F[Assign scheduled_at timestamps]
    F --> G[Insert to messages table]

    H[Railway Cron Job] --> I[Query WHERE scheduled_at <= NOW() LIMIT 3]
    I --> J[Send via Unipile API]
    J --> K[Update status to 'sent']
    K --> L[Log to account_activity]
    L --> M[Send N8N webhook]
```

## Scheduling Algorithm

### Starting Point
- Find last scheduled message for the channel
- If none exist, start from current time

### Slot Calculation
For each message:
1. Check if current slot is within business hours
2. If not, move to next business hour
3. Check if daily limit reached for this day
4. If so, move to next business day
5. Add minimum interval (5 minutes)
6. Add random jitter (±2.5 minutes)

### Business Hours Logic
- Every day including weekends (configurable)
- 8 AM - 7 PM ET (configurable)
- Configurable send days (default: all 7 days)

### Daily Limits
- Max 40 LinkedIn messages per day (configurable)
- Evenly distributed across business hours
- New campaigns stack after existing ones

## Database Schema

### campaigns.scheduling_config (JSONB)
```json
{
  "daily_limit": 40,
  "min_interval_minutes": 5,
  "max_interval_minutes": 10,
  "business_hours_start": 8,
  "business_hours_end": 19,
  "send_days": [0,1,2,3,4,5,6]
}
```

### messages.scheduled_at (TIMESTAMPTZ)
- Exact timestamp when message should be sent
- Used by cron job to find due messages
- Never null for scheduled messages

### Indexes
- `idx_messages_scheduled` - Fast lookup of pending messages by time
- `idx_messages_scheduled_channel` - Channel-specific scheduling queries

## Cron Job Details

### Frequency: Every 5 minutes
- `*/5 * * * *` cron expression
- Runs on Railway, not local machine
- Processes up to 3 messages per run

### Query Logic
```sql
SELECT * FROM messages
WHERE scheduled_at <= NOW()
AND status = 'pending'
ORDER BY scheduled_at ASC
LIMIT 3
```

### Processing Steps
1. Load message with contact/campaign/account data
2. Route to LinkedIn or Email sending logic
3. Check contact status (connection degree, etc.)
4. Send via appropriate Unipile endpoint
5. Update message status
6. Log activity for rate limiting
7. Send webhook notification

## Error Handling

### Rate Limit Errors
- Don't retry automatically
- Mark as failed
- Cron will skip on next run due to rate limit checks

### Network Errors
- Could retry once after 30 seconds
- Mark as failed if persistent

### Authentication Errors
- Mark as failed
- Require manual intervention

### Validation Errors
- Mark as failed
- Log validation details

## Monitoring & Observability

### Real-time Views
- `message_activity_recent` - Last 100 messages
- `today_sending_progress` - Today's channel breakdown
- `campaign_progress` - Campaign-level metrics

### N8N Webhooks
Send to configured webhook URL:
```json
{
  "event": "message_sent",
  "message_id": "uuid",
  "campaign_name": "My Campaign",
  "contact_name": "John Smith",
  "channel": "linkedin",
  "result": "success|failed",
  "error": "optional error message"
}
```

### Emergency Controls
```sql
-- Pause all campaigns
UPDATE campaigns SET status = 'paused';

-- Stop Railway service
-- Dashboard → Service → Stop
```

## Configuration Examples

### Conservative (Default)
```json
{
  "daily_limit": 20,
  "min_interval_minutes": 15,
  "max_interval_minutes": 30,
  "business_hours_start": 9,
  "business_hours_end": 17,
  "send_days": [1,2,3,4,5]
}
```

### Aggressive
```json
{
  "daily_limit": 50,
  "min_interval_minutes": 3,
  "max_interval_minutes": 7,
  "business_hours_start": 8,
  "business_hours_end": 18,
  "send_days": [1,2,3,4,5,6,7]
}
```

### Weekend Only
```json
{
  "daily_limit": 30,
  "min_interval_minutes": 10,
  "max_interval_minutes": 20,
  "business_hours_start": 10,
  "business_hours_end": 16,
  "send_days": [6,7]
}
```

## Migration Notes

### From Manual Sending
- Old campaigns used `campaign_contacts` table
- New system uses `messages` table with scheduling
- Migration script needed for existing campaigns

### Backward Compatibility
- Old manual sending still works
- New scheduled sending is opt-in per campaign
- Can run both systems simultaneously
