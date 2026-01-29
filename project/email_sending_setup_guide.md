---
title: Email Sending Setup Guide (Unipile + Supabase)
created: 2026-01-29
---

# Email Sending Setup Guide (Unipile + Supabase)

This guide explains how to add new email accounts, verify they’re active, and confirm messages are scheduled + sending.

---

## 1) Add Email Accounts (Env + Railway)

Add new Unipile account IDs to both `.env.local` and Railway:

```
UNIPILE_EMAIL_ACCOUNT_ID_AICOM=...
UNIPILE_EMAIL_ACCOUNT_ID_CO=...
```

Optional (comma list):
```
UNIPILE_EMAIL_ACCOUNT_IDS=id1,id2,id3
```

If both are present, **all IDs are used**.

---

## 2) Upsert Accounts into Supabase

Run:
```
npx tsx scripts/upsert-unipile-accounts.ts
```

Expected:
```
✅ Inserted 2 accounts
- aicom: <unipile_id>
- co: <unipile_id>
```

---

## 3) Ensure Campaign Columns Exist

Run once in Supabase SQL Editor:
```sql
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS campaign_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS account_ids JSONB,
  ADD COLUMN IF NOT EXISTS target_criteria JSONB;
```

These fields store:
- cold vs networking (`campaign_type`)
- offer (`offer_id`)
- channel (`channel`)
- accounts (`account_ids`)
- signal + ICP (`target_criteria`)

---

## 4) Create/Link Campaign + Contacts

Link contacts with emails:
```
npx tsx scripts/link-roleplay-contacts-to-campaign.ts
```

This creates campaign `cold-email-roleplay-aicom-hiring-012926` (if missing)
and links all email‑ready contacts.

---

## 5) Create Messages

Dry run:
```
npx tsx scripts/create-roleplay-email-messages.ts --dry-run --limit=20
```

Create all:
```
npx tsx scripts/create-roleplay-email-messages.ts
```

Messages are scheduled:
- business hours only (ET)
- 5–20 min spacing
- **20/day per account**

**Important:** creating `messages` does **not** send them.
You must enqueue into `send_queue` for Railway cron to execute.

---

## 6) Enqueue for Sending

If messages exist but nothing sends, enqueue them:

```sql
INSERT INTO send_queue (
  campaign_id,
  campaign_contact_id,
  contact_id,
  account_id,
  channel,
  sequence_step,
  subject,
  body,
  scheduled_for,
  priority,
  status,
  external_message_id
)
SELECT
  m.campaign_id,
  m.campaign_contact_id,
  m.contact_id,
  m.account_id,
  m.channel,
  m.sequence_step,
  m.subject,
  m.body,
  m.scheduled_at,
  5,
  'pending',
  m.id::text
FROM messages m
WHERE m.status IN ('pending','queued')
  AND NOT EXISTS (
    SELECT 1 FROM send_queue sq WHERE sq.external_message_id = m.id::text
  );
```

This will enqueue missing messages without duplicating.

---

## 7) Verify Scheduling + Sending

**Check scheduled range per account:**
```sql
SELECT a.name, MIN(m.scheduled_at), MAX(m.scheduled_at), COUNT(*)
FROM messages m
JOIN accounts a ON a.id = m.account_id
WHERE m.channel = 'email'
GROUP BY a.name
ORDER BY a.name;
```

**Check what’s due to send now:**
```sql
SELECT a.name, COUNT(*) AS due_now
FROM send_queue sq
JOIN accounts a ON a.id = sq.account_id
WHERE sq.status = 'pending'
  AND sq.scheduled_for <= NOW()
GROUP BY a.name;
```

**Check message status by account:**
```sql
SELECT a.name, sq.status, COUNT(*)
FROM send_queue sq
JOIN accounts a ON a.id = sq.account_id
GROUP BY a.name, sq.status
ORDER BY a.name, sq.status;
```

---

## 8) Railway Cron (Sending)

Ensure Railway cron is running:
```
/5 * * * *  node scripts/process-message-queue.js
```

If messages are pending + due but nothing sends:
1. Check Railway logs
2. Confirm Unipile accounts are connected
3. Check account status in Supabase (`accounts.status`)

---

## Troubleshooting

**Emails aren’t sending**
- `messages.status` still `pending` and `scheduled_at` <= now
- Check Railway logs for Unipile errors
- Confirm Unipile account is connected and not paused

**Wrong account used**
- Remove any old `UNIPILE_EMAIL_ACCOUNT_ID` from `.env.local`
- Recreate messages so only desired accounts are used

**Need more accounts**
- Add new `UNIPILE_EMAIL_ACCOUNT_ID_X` vars
- Re-run `upsert-unipile-accounts.ts`
- Create new messages (or reassign existing)
