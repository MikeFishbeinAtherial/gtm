# Message Sending Monitoring Guide

## Real-time Monitoring

### Supabase Dashboard Views

#### Recent Message Activity
```sql
SELECT * FROM message_activity_recent LIMIT 20;
```
Shows the last 100 messages sent with full context.

#### Today's Progress
```sql
SELECT * FROM today_sending_progress;
```
Breakdown of messages sent today by channel and status.

#### Campaign Overview
```sql
SELECT * FROM campaign_progress ORDER BY created_at DESC LIMIT 10;
```
High-level view of all campaigns with progress metrics.

### Live Queries

#### Messages Sent in Last Hour
```sql
SELECT count(*) as sent_last_hour
FROM messages
WHERE sent_at >= NOW() - INTERVAL '1 hour'
AND status = 'sent';
```

#### Current Queue Status
```sql
SELECT
  channel,
  count(*) as pending_messages,
  min(scheduled_at) as next_scheduled,
  max(scheduled_at) as last_in_queue
FROM messages
WHERE status = 'pending'
GROUP BY channel;
```

#### Check Rate Limits
```sql
SELECT
  a.name as account,
  a.daily_limit_linkedin - a.today_linkedin_messages as remaining_linkedin,
  a.daily_limit_email - a.today_email_messages as remaining_email
FROM accounts a
WHERE a.type IN ('linkedin', 'email');
```

## Proactive Notifications

### Resend Email Integration

The cron job sends real-time email notifications via Resend:

**Subject:** `✅ Message Sent: John Smith` or `❌ Message Failed: John Smith`

**Email Body:**
```
Message Details:
• Contact: John Smith
• Company: Acme Corp
• Campaign: My Campaign
• Channel: LinkedIn
• Action Type: Connection Request
• Scheduled: 2:29 PM EST
• Sent: 2:30 PM EST
• Result: SUCCESS

Message Content:
Happy holidays John! Hope you're having a great end to 2024...
```

**Configuration:**
- Set `RESEND_API_KEY` in Railway environment variables
- Set `NOTIFICATION_EMAIL` for recipient (defaults to notifications@yourdomain.com)
- Resend requires domain verification for the "from" address

### Email Notifications

Receive formatted email notifications for every message:

```
🚀 Message Sent
• Contact: John Smith @ Acme Corp
• Channel: LinkedIn (Connection Request)
• Campaign: hiring-signal-q1
• Sent: 2:15 PM EST
• Scheduled: 2:14 PM EST
• Status: ✅ Success
```

**Note:** For Slack notifications, you could set up email-to-Slack forwarding, or upgrade to N8N/webhooks later.

### Email Alerts

Configure daily/weekly summary emails:

```
Daily Sending Summary - January 15, 2024

📊 Overview:
• Total Sent: 23 messages
• Success Rate: 96%
• Failed: 1 message

📈 By Channel:
• LinkedIn: 18 sent (17 connection requests, 1 DM)
• Email: 5 sent

🚨 Issues:
• 1 message failed: Rate limit exceeded

📋 Active Campaigns:
• hiring-signal-q1: 45/100 sent (45% complete)
• follow-up-sequence: 12/50 sent (24% complete)
```

## Alert Types

### Success Notifications
- Every message sent (real-time via webhook)
- Hourly progress summaries (9 AM - 5 PM)
- Daily completion summaries

### Warning Alerts
- Approaching daily limits (80% threshold)
- Rate limit hits
- High failure rates (>10% in last hour)

### Critical Alerts
- Cron job failures
- Database connection issues
- Authentication problems
- Queue growing too large (>1000 pending)

## Emergency Monitoring

### Stop Sending Immediately

#### Option 1: Database Level
```sql
-- Pause all active campaigns
UPDATE campaigns SET status = 'paused' WHERE status = 'active';

-- Emergency stop flag (requires code support)
INSERT INTO system_flags (flag_name, flag_value)
VALUES ('emergency_stop', true)
ON CONFLICT (flag_name) UPDATE SET flag_value = true;
```

#### Option 2: Railway Level
- Go to Railway Dashboard → Your Service → **Stop**
- This kills the cron job immediately
- Service won't restart automatically

#### Option 3: Environment Variable
Set `N8N_WEBHOOK_URL` to empty to disable notifications during testing.

### Check Current Status

#### Is the cron job running?
```bash
# Check Railway service logs
railway logs --service message-processor

# Or check if messages are being sent
SELECT sent_at FROM messages
WHERE sent_at >= NOW() - INTERVAL '10 minutes'
ORDER BY sent_at DESC LIMIT 5;
```

#### What's in the queue?
```sql
SELECT
  channel,
  status,
  count(*) as count,
  min(scheduled_at) as earliest,
  max(scheduled_at) as latest
FROM messages
GROUP BY channel, status
ORDER BY channel, status;
```

#### Recent failures?
```sql
SELECT
  id,
  channel,
  error_message,
  sent_at
FROM messages
WHERE status = 'failed'
AND sent_at >= NOW() - INTERVAL '24 hours'
ORDER BY sent_at DESC;
```

## Email Notification Setup

**No complex workflow setup needed!** Resend handles email delivery automatically.

### Optional: Advanced Monitoring with N8N

If you want Slack notifications or complex workflows, you can upgrade to N8N:

#### Basic Email-to-Slack Flow

1. **Webhook Trigger** - Receives `message_sent` events
2. **Router** - Route by `result` (success/failed)
3. **Slack Node** - Send success notifications
4. **Email Node** - Send failure alerts

### Advanced Monitoring Flow

1. **Schedule Trigger** - Every hour during business hours
2. **Supabase Query** - Get last hour's activity
3. **Condition** - Check if activity > threshold
4. **Slack** - Send progress summary

### Error Handling Flow

1. **Webhook Trigger** - Filter for failed messages
2. **Supabase Query** - Check failure rate in last hour
3. **Condition** - If >10% failure rate
4. **Slack** - Send critical alert
5. **Pause Campaigns** - Auto-pause if severe

## Configuration

### Environment Variables

```bash
# Required
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/message-sent

# Optional - for monitoring
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
EMAIL_RECIPIENT=alerts@yourcompany.com
```

### Campaign Notification Settings

```json
{
  "notifications": {
    "slack_webhook": "https://hooks.slack.com/...",
    "email_recipients": ["your@email.com"],
    "alert_on_failure": true,
    "alert_on_completion": true,
    "hourly_progress": true,
    "daily_summary": true
  }
}
```

## Troubleshooting

### No Messages Being Sent

1. Check cron job is running: `railway logs --service message-processor`
2. Check for pending messages: `SELECT count(*) FROM messages WHERE status = 'pending'`
3. Check scheduled times: `SELECT scheduled_at FROM messages WHERE status = 'pending' LIMIT 5`
4. Verify Railway environment variables

### Too Many Messages Being Sent

1. Check cron frequency: Should be `*/5 * * * *` (every 5 min)
2. Check LIMIT: Should be `LIMIT 3` in query
3. Verify scheduling intervals: Messages should be 5-10 min apart

### Webhook Notifications Not Working

1. Check `N8N_WEBHOOK_URL` environment variable
2. Verify N8N workflow is active
3. Check Railway logs for webhook errors
4. Test webhook URL manually

### Database Performance Issues

1. Check index usage: `EXPLAIN SELECT * FROM messages WHERE scheduled_at <= NOW()`
2. Monitor view performance: Views should be fast for dashboard queries
3. Archive old data: Consider moving sent messages older than 30 days to archive table
