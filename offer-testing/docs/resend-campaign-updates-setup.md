# Resend Campaign Updates Setup

**Purpose:** Send daily email updates at 8am and 1pm ET with campaign progress

---

## ✅ What's Created

### Script: `scripts/send-campaign-update.ts`
Sends formatted HTML email via Resend with:
- Messages sent today (with timestamps)
- Messages scheduled for rest of day
- Tomorrow's schedule preview
- Overall campaign stats (sent, pending, replied, failed)

### Email Format
- **From:** Campaign Updates <updates@atherial.ai>
- **To:** mfishbein1@gmail.com
- **Subject:** "📊 Campaign Update - X sent today, Y remaining"
- **Content:** Clean HTML with stats cards and message lists

---

## 🔧 Setup Instructions

### 1. Get Resend API Key

1. Go to https://resend.com/api-keys
2. Create new API key
3. Copy the key (starts with `re_`)

### 2. Add to Environment Variables

**Local (.env.local):**
```bash
RESEND_API_KEY=re_your_key_here
```

**Railway:**
1. Go to your Railway project
2. Settings → Variables
3. Add: `RESEND_API_KEY` = `re_your_key_here`

### 3. Verify Domain in Resend

**Option A: Use atherial.ai (if you own it)**
1. In Resend, go to Domains
2. Add domain: `atherial.ai`
3. Add DNS records they provide
4. Wait for verification

**Option B: Use Resend's shared domain (easier)**
Just use `onboarding@resend.dev` as the from address:

Update script line 162:
```typescript
from: 'Campaign Updates <onboarding@resend.dev>',
```

---

## 🚀 Railway Cron Setup

### Create Two Cron Jobs in Railway

**Cron Job 1: Morning Update (8 AM ET)**
- Schedule: `0 8 * * *` (8 AM EST/EDT - Railway uses UTC)
  - For EST (UTC-5): `0 13 * * *`
  - For EDT (UTC-4): `0 12 * * *`
  - **Use:** `0 12 * * *` (covers EDT)
- Command: `npx ts-node scripts/send-campaign-update.ts`

**Cron Job 2: Afternoon Update (1 PM ET)**
- Schedule: `0 13 * * *` (1 PM EST/EDT - Railway uses UTC)
  - For EST (UTC-5): `0 18 * * *`
  - For EDT (UTC-4): `0 17 * * *`
  - **Use:** `0 17 * * *` (covers EDT)
- Command: `npx ts-node scripts/send-campaign-update.ts`

### How to Add in Railway

1. Go to your Railway project
2. Click "New" → "Cron Job"
3. Set schedule (see above)
4. Set command: `npx ts-node scripts/send-campaign-update.ts`
5. Ensure `RESEND_API_KEY` is in environment variables
6. Deploy

---

## 📧 Test Locally

Before deploying to Railway, test locally:

```bash
cd offer-testing
npx ts-node scripts/send-campaign-update.ts
```

You should receive an email at mfishbein1@gmail.com with:
- Today's sent messages
- Remaining scheduled for today
- Tomorrow's preview

---

## 📊 Email Contents

### Stats Cards
- **Sent:** Total emails sent
- **Pending:** Emails waiting to send
- **Replied:** Contacts who replied
- **Failed:** Send failures (shows ⚠️ if > 0)

### Sent Today Section
Lists each email sent with:
- Send time (in ET)
- Email subject
- Template badge (V2, V3, or Sentiment)
- Recipient name, company, vertical

### Scheduled for Rest of Today
Shows emails queued for later today with same format

### Tomorrow Preview
Simple count of how many emails scheduled for next day

---

## 🎨 Email Example

```
📊 Campaign Update - Jan 26, 2026

┌─────────┬─────────┬─────────┬─────────┐
│   42    │   168   │    3    │    0    │
│  SENT   │ PENDING │ REPLIED │ FAILED  │
└─────────┴─────────┴─────────┴─────────┘

📤 Sent Today (5)

7:05 AM ET
"AI for earnings" [V2]
To: John at Vista Equity (private_equity)

7:38 AM ET
"build earnings AI" [V3]
To: Sarah at Millennium Management (hedge_fund)

...

⏰ Scheduled for Rest of Today (15)

1:15 PM ET
"Reddit sentiment" [Sentiment]
To: Mike at KKR (private_equity)

...

📅 Tomorrow Preview
20 messages scheduled for Tue, Jan 27
```

---

## 🔍 Monitoring

### Check if emails are sending:
1. Log into Resend dashboard
2. Go to "Emails" → See delivery status
3. Check opens/clicks (if tracking enabled)

### Troubleshooting:
- **No email received:** Check Railway logs for errors
- **403 error:** Verify domain or use onboarding@resend.dev
- **Wrong timezone:** Adjust cron schedule (Railway uses UTC)

---

## ⚙️ Customization Options

### Change Recipient
Edit line 163 in `send-campaign-update.ts`:
```typescript
to: 'your-email@example.com',
```

### Change Send Times
Edit Railway cron schedules (see above for UTC conversions)

### Add More Stats
Query additional fields from Supabase in the script:
- Bounce rate
- Open rate (if Unipile provides)
- Reply categorization

### Change Email Design
Edit HTML template starting at line 93

---

## 📝 Next Steps

1. ✅ Install Resend: `npm install resend`
2. ⏳ Add RESEND_API_KEY to Railway
3. ⏳ Set up 2 Railway cron jobs (8am & 1pm ET)
4. ⏳ Test locally first
5. ⏳ Monitor first few sends

---

## 💡 Tips

- **First send:** Will show "0 sent today" until messages actually start sending
- **Weekend sends:** No messages on Sat/Sun, update will show empty
- **Failed messages:** If failures > 0, investigate in Railway logs
- **Reply tracking:** Update process-message-queue.js to mark messages as 'replied' when Unipile detects replies
