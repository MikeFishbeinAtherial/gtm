# Outreach Review

Review and send personalized messages to campaign contacts.

## Description

Load the message queue for a campaign, personalize each message with company-specific details, present for user review, and send approved messages via Unipile (LinkedIn/email). Enforces LinkedIn safety limits.

## When to Use

- User wants to "send" or "review" messages for a campaign
- User asks to "launch outreach" or "start sending"
- User wants to "personalize" messages
- User references phase 5 of the workflow

## Prerequisites

- Campaign has contacts ready (`campaign_contacts` with status = 'queued')
- Copy variants exist (`offers/{slug}/copy/{campaign}/`)
- Unipile account connected and configured

## Instructions

### Step 1: Load Queue

Query Supabase for contacts ready to message:
```sql
SELECT * FROM campaign_contacts
WHERE campaign_id = {id}
AND status = 'queued'
ORDER BY priority DESC
LIMIT 20
```

### Step 2: Check Daily Limits

Before processing, verify LinkedIn safety limits:
- Connection requests sent today < 18 (limit: 20)
- Messages sent today < 38 (limit: 40)
- Current time is business hours (9am-6pm recipient timezone)

If limits reached, stop and notify user.

### Step 3: Personalize Messages

For each contact, generate personalized copy:
1. Load copy template from `offers/{slug}/copy/{campaign}/`
2. Replace placeholders:
   - `{first_name}` - Contact's first name
   - `{company}` - Company name
   - `{title}` - Contact's title
   - `{signal_detail}` - Specific signal (e.g., "hiring 3 SDRs")
3. Add company-specific insight if available

### Step 4: Present for Review

Show each message to user:
```
Contact: {name} - {title} at {company}
Signal: {signal_detail}
LinkedIn: {url}

Message:
---
{personalized_message}
---

[Approve] [Edit] [Skip] [Stop]
```

### Step 5: Send Approved Messages

For approved messages:
1. Send via Unipile API
2. Log to `messages` table
3. Log to `account_activity` table
4. Update `campaign_contacts` status to 'sent'
5. Wait 2-5 minutes (random jitter) before next send

### Step 6: Report Results

```
Session complete:
- Reviewed: 20 contacts
- Approved & Sent: 15
- Edited & Sent: 3
- Skipped: 2
- Remaining in queue: 54

Daily limits:
- Connection requests: 18/20
- Messages: 38/40

Next session: Tomorrow 9am
```

## LinkedIn Safety Rules (Non-Negotiable)

- Max 20 connection requests/day (stop at 18)
- Max 40 messages/day (stop at 38)
- 2-5 minute random delays between actions
- Business hours only: 9am-6pm weekdays
- Never message 1st degree connections cold

## Database Tables

- `campaign_contacts` - Queue with status
- `messages` - Sent message content
- `account_activity` - All LinkedIn/email activity

## Cost

Free (Unipile subscription covers sending).

## Status: In Development

This skill is V2 - core workflow defined but not fully implemented yet.

## Related Files

- LinkedIn Safety: `offer-testing/src/lib/utils/linkedin-safety.ts`
- Unipile Client: `offer-testing/src/lib/clients/unipile.ts`
- Message Queue: `offer-testing/scripts/process-message-queue.js`
