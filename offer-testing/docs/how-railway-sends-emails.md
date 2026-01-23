# How Railway Sends Your Finance Campaign Emails

## 📊 Supabase Tables Used

### Main Table: `messages`
This is where your 210 scheduled emails live.

**Key columns:**
- `id` - Message UUID
- `campaign_contact_id` - Links to campaign_contacts
- `contact_id` - Who to send to
- `account_id` - Which email account to use (yours)
- `channel` - 'email' for this campaign
- `subject` - Email subject line
- `body` - Email body with {FirstName} already replaced
- `scheduled_at` - When to send (e.g., "2026-01-26T12:05:00.000Z")
- `status` - 'pending' → 'sent' → 'replied'/'failed'
- `personalization_used` - JSON with Template: "V2", "V3", or "Sentiment"

**Related tables:**
- `contacts` - Contact details (name, email, company)
- `companies` - Company info (name, vertical)
- `campaigns` - Campaign metadata
- `campaign_contacts` - Links contacts to campaigns
- `accounts` - Your Unipile account info

---

## 🔄 How Railway Knows What to Send

### Step 1: Railway Cron Runs Every 5 Minutes
Your existing Railway cron job runs:
```
*/5 * * * *
```

### Step 2: Script Queries Supabase
`process-message-queue.js` runs this query:

```javascript
supabase
  .from('messages')
  .select(`
    *,
    contact:contacts(*),
    campaign_contact:campaign_contacts(*, campaign:campaigns(*)),
    account:accounts(*)
  `)
  .eq('status', 'pending')
  .lte('scheduled_at', new Date().toISOString())  // ← Only messages whose time has passed
  .order('scheduled_at')
  .limit(1)  // Send 1 message per 5-min run
```

**Translation:** 
> "Give me 1 pending message whose scheduled_at time has already passed"

### Step 3: Send via Unipile
The script:
1. Gets the message from Supabase
2. Uses `account.unipile_account_id` from the accounts table
3. Calls Unipile API: `/emails` endpoint
4. Sends to `contact.email` with the subject and body

### Step 4: Update Status
```javascript
supabase
  .from('messages')
  .update({ 
    status: 'sent',
    sent_at: new Date().toISOString()
  })
  .eq('id', message.id)
```

---

## 📝 How Messages Got Into Supabase

### You asked me to schedule emails, so I ran:
`scripts/create-email-messages-v2-v3.ts`

This script:
1. ✅ Got all contacts linked to the 'finance-leadgen-1000' campaign
2. ✅ Split them 50/50 between V2 and V3 templates
3. ✅ Personalized each email (replaced {FirstName} with actual name)
4. ✅ Calculated `scheduled_at` times (20/day, business hours, weekends skipped)
5. ✅ **Inserted 210 rows into the `messages` table via Supabase client**

Example insert:
```javascript
await supabase.from('messages').insert({
  campaign_contact_id: "uuid-here",
  contact_id: "uuid-here",
  account_id: "00000000-0000-0000-0000-000000000001",
  channel: "email",
  subject: "AI for earnings",
  body: "John,\n\nManual earnings call analysis...",
  scheduled_at: "2026-01-26T12:05:00.000Z",
  status: "pending",
  personalization_used: { FirstName: "John", Template: "V2" }
})
```

### Then I fixed PE contacts:
`scripts/fix-pe-messages-and-create-sentiment.ts`

1. ✅ Deleted 31 PE messages that had earnings emails
2. ✅ Created 31 new PE messages with sentiment email
3. ✅ Scheduled them for Feb 11-12

---

## 🎯 Why This Works

**Railway doesn't need to know about campaigns or offers.**

It just:
1. Looks for ANY message in the `messages` table where:
   - `status = 'pending'` 
   - `scheduled_at <= NOW()`
2. Sends it
3. Marks it `status = 'sent'`

**All 210 of your finance campaign messages are sitting in that table right now,** waiting for their scheduled_at time to arrive.

---

## 📊 Current State

Run this to see your messages:

```sql
SELECT 
  scheduled_at,
  subject,
  personalization_used->>'Template' as template,
  status,
  contacts.first_name,
  companies.name as company,
  companies.vertical
FROM messages
JOIN contacts ON messages.contact_id = contacts.id
JOIN companies ON contacts.company_id = companies.id
WHERE status = 'pending'
ORDER BY scheduled_at
LIMIT 10;
```

You'll see:
- 179 earnings emails (V2/V3) scheduled Jan 26 - Feb 9
- 31 sentiment emails scheduled Feb 11-12

---

## 🚀 Timeline

**Now → Jan 26:**
- Messages sit in Supabase with `status = 'pending'`
- Railway cron runs every 5 min but finds no messages (scheduled_at is in the future)

**Jan 26, 7:05 AM ET:**
- First message's `scheduled_at` passes
- Railway cron finds it and sends
- Status changes to 'sent'

**Every 5 minutes after:**
- Next message's time passes
- Railway sends it
- Continues until all 210 are sent

---

## ❓ FAQ

**Q: How does Railway know to use the finance campaign?**
A: It doesn't! It just processes any pending message in the `messages` table, regardless of campaign.

**Q: Did you use MCP to add messages?**
A: No, I used the Supabase JavaScript client in the TypeScript scripts. MCP is for reading/querying Supabase, not for bulk inserts.

**Q: Can other campaigns interfere?**
A: No. Each message is independent. If you have other campaigns with messages in the same table, Railway will process them too based on their scheduled_at times.

**Q: How do I stop the campaign?**
A: Update all pending messages:
```sql
UPDATE messages 
SET status = 'cancelled' 
WHERE status = 'pending' 
AND campaign_contact_id IN (
  SELECT id FROM campaign_contacts 
  WHERE campaign_id = 'your-campaign-id'
);
```

**Q: How do I check what's been sent?**
A: Query Supabase:
```sql
SELECT COUNT(*), status 
FROM messages 
GROUP BY status;
```
