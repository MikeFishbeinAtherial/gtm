# ✅ READY TO SEND - Email Campaign Summary

**Date:** January 18, 2026  
**Status:** All messages scheduled, ready for Railway cron

---

## ✅ What's Complete

### 1. Hedge Fund Campaign (Earnings Analysis)
- **210 messages created** in Supabase
- **2 templates** (50/50 A/B test):
  - V2: "AI for earnings" (105 messages)
  - V3: "build earnings AI" (105 messages)
- **Scheduling:** 20 per day, 11 business days (Jan 26 - Feb 9)
- **Sender:** mike@atherial.ai (Unipile connected)
- **Status:** Ready to send

### 2. Private Equity Campaign (Sentiment & DD)
- **3 email templates created:**
  - V1: "diligence shortcut" (Due diligence automation)
  - V2: "portfolio monitoring" (Portfolio company monitoring)
  - V3: "sourcing edge" (Deal sourcing early signals)
- **Contacts:** Waiting for enrichment to complete (~43 PE companies)
- **Status:** Templates ready, contacts in progress

---

## 📧 Email Templates Summary

### Hedge Fund Emails (Currently Scheduled)

**Template V2: "AI for earnings"**
- Offer: Guide to automate earnings analysis on thousands of companies
- Target: ~105 contacts
- CTA: "Just reply yes and I'll send it to you"

**Template V3: "build earnings AI"**
- Offer: DIY guide for portfolio-wide earnings AI system
- Target: ~105 contacts
- CTA: "Just reply 'send guide'"

### PE Emails (Ready, Not Scheduled Yet)

**Template V1: "diligence shortcut"**
- Offer: Guide to automate sentiment analysis for due diligence
- Use case: Employee/customer/franchisee sentiment during DD

**Template V2: "portfolio monitoring"**
- Offer: Guide to automate sentiment monitoring for portfolio companies
- Use case: Catch issues 6 months before they hit financials

**Template V3: "sourcing edge"**
- Offer: Guide to monitor thousands of companies for distress signals
- Use case: Find deals before they go to market

---

## 🚀 Next Steps to Start Sending

### Step 1: Set Up Railway Cron

Railway is already configured with `start-service.js` which auto-detects cron runs.

**In Railway dashboard:**
1. Go to your project
2. Add a Cron Job service
3. Set schedule: `*/5 * * * *` (every 5 minutes)
4. Railway will automatically run `process-message-queue.js`

**OR if Railway cron is already set up:**
- Just verify it's running every 5 minutes
- Check logs to ensure it's picking up messages

### Step 2: Monitor First Sends

**Check Railway logs:**
```bash
railway logs --tail 100
```

**Look for:**
- "📤 Processing message..." (confirms it's sending)
- "✅ EMAIL SENT SUCCESSFULLY" (confirms Unipile worked)
- Any errors or 404s

**Check Supabase:**
Query messages table to see status updates:
```sql
SELECT 
  subject,
  status,
  sent_at,
  error_message,
  personalization_used->>'Template' as template
FROM messages
WHERE campaign_id = (SELECT id FROM campaigns WHERE name = 'finance-leadgen-1000')
ORDER BY scheduled_at
LIMIT 20;
```

### Step 3: Track Performance

**After first day (20 emails sent):**
- Check deliverability (bounces, spam)
- Monitor for replies
- Compare V2 vs V3 engagement

**After first week (100 emails):**
- Calculate reply rate by template
- Identify which offer resonates more
- Adjust remaining sends if needed

---

## 📊 Expected Results

### Timeline
- **Jan 26 - Jan 30:** 100 emails sent (Week 1)
- **Feb 2 - Feb 9:** 110 emails sent (Week 2)
- **Total:** 210 emails over 11 business days

### Performance Targets
- **Deliverability:** > 95%
- **Open Rate:** 40-60%
- **Reply Rate:** 8-15% (17-31 replies expected)
- **Guide Requests:** 12-25 (60-80% of replies)

### Template Comparison
- **V2 ("AI for earnings"):** Test if flexible offer resonates
- **V3 ("build earnings AI"):** Test if DIY/portfolio-wide angle works better
- **Winner:** Use for future campaigns

---

## 🔧 Technical Details

### Message Fields in Supabase
```json
{
  "campaign_contact_id": "uuid",
  "contact_id": "uuid",
  "account_id": "00000000-0000-0000-0000-000000000001",
  "channel": "email",
  "sequence_step": 1,
  "subject": "AI for earnings",
  "body": "{FirstName},\n\nManual earnings call analysis...",
  "personalization_used": {
    "FirstName": "John",
    "Template": "V2"
  },
  "scheduled_at": "2026-01-26T12:05:00.000Z",
  "status": "pending"
}
```

### process-message-queue.js Logic
1. Queries: `WHERE status = 'pending' AND scheduled_at <= NOW() LIMIT 1`
2. Sends via: Unipile `/emails` endpoint
3. Updates: `status = 'sent'`, `sent_at = NOW()`, `external_id = tracking_id`
4. Logs: Inserts to `account_activity` table
5. Spacing: 5-minute minimum between sends (cron frequency)

### Railway Cron Configuration
- **Frequency:** Every 5 minutes (`*/5 * * * *`)
- **Command:** `node scripts/start-service.js` (auto-detects cron run)
- **Runs:** `process-message-queue.js`
- **Safety:** Only processes 1 message per run

---

## 📋 Files Reference

### Hedge Fund Campaign
- `offers/finance/campaigns/ai-earnings-edge-report/copy/ai-earnings-edge-report-email-v2.md`
- `offers/finance/campaigns/ai-earnings-edge-report/copy/ai-earnings-edge-report-email-v3.md`

### PE Campaign (Not Scheduled Yet)
- `offers/finance/campaigns/pe-sentiment-diligence/copy/pe-sentiment-email-v1.md`
- `offers/finance/campaigns/pe-sentiment-diligence/copy/pe-sentiment-email-v2.md`
- `offers/finance/campaigns/pe-sentiment-diligence/copy/pe-sentiment-email-v3.md`

### Scripts
- `scripts/create-email-messages-v2-v3.ts` - Create messages (already run)
- `scripts/link-contacts-to-campaign.ts` - Link contacts (already run)
- `scripts/process-message-queue.js` - Railway cron job (needs to be triggered)
- `scripts/start-service.js` - Railway auto-detector

### Documentation
- `docs/emails-ready-to-send-summary.md` - Detailed summary
- `docs/email-segmentation-plan.md` - Segmentation strategy
- `docs/READY-TO-SEND.md` - This file

---

## ⚠️ Important: Railway Cron Setup

Railway should already be configured, but verify:

1. **Check if cron is running:**
   ```bash
   railway logs | grep "CRON JOB"
   ```

2. **If not set up, add cron job:**
   - Go to Railway dashboard
   - Add cron job: `*/5 * * * *`
   - Command: Already configured in railway.json

3. **Test manually:**
   ```bash
   # Locally test the processor
   cd offer-testing
   node scripts/process-message-queue.js
   ```

---

## 🎯 Success Criteria

### Week 1 Goals
- Send 100 emails without errors
- Deliverability > 95%
- Get 8-15 replies

### Campaign Goals
- Send all 210 emails
- Reply rate > 8%
- Identify winning template (V2 or V3)
- Book 3-5 meetings from guide requesters

### Next Campaign Goals
- Use winning template for PE campaign
- Scale up daily limit if deliverability is good
- Build follow-up sequences

---

## 🚨 Monitoring Checklist

### Daily (First Week)
- [ ] Check Railway logs for sends/errors
- [ ] Verify message status updates in Supabase
- [ ] Monitor inbox for bounces/replies
- [ ] Track deliverability in Unipile dashboard

### Weekly
- [ ] Calculate reply rate by template
- [ ] Review error messages
- [ ] Adjust scheduling if needed
- [ ] Prepare guide fulfillment for requesters

---

## ✅ YOU'RE READY!

All you need to do is ensure Railway cron is running. The messages are scheduled, templates are ready, and the infrastructure is built.

**First email sends:** Sunday, Jan 26 at ~7 AM ET

**Track progress:** Railway logs + Supabase messages table
