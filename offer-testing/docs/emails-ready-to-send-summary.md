# Emails Ready to Send - Summary

**Date:** January 18, 2026  
**Status:** ✅ Messages created and scheduled in Supabase

---

## ✅ What's Complete

### 1. Email Templates Created
- **V2:** "AI for earnings" - Flexible offer (custom report OR DIY guide)
- **V3:** "build earnings AI" - DIY guide for portfolio-wide system
- Both templates: Plain text, ~85-100 words, signed "Mike"

### 2. Messages Scheduled in Supabase
- **210 total messages** created
- **105 using V2 template** ("AI for earnings")
- **105 using V3 template** ("build earnings AI")
- **50/50 split** for A/B testing

### 3. Scheduling Details
- **Daily limit:** 20 emails per day
- **Business hours:** 7 AM - 6 PM ET
- **Days:** Mon-Fri (skips weekends)
- **Spacing:** ~33 minutes apart with 0-5 min random jitter
- **Duration:** 11 business days (Jan 26 - Feb 9)

### 4. Daily Breakdown
- Jan 26 (Sun): 20 emails
- Jan 27 (Mon): 20 emails
- Jan 28 (Tue): 20 emails
- Jan 29 (Wed): 20 emails
- Jan 30 (Thu): 20 emails
- Feb 2 (Mon): 20 emails
- Feb 3 (Tue): 20 emails
- Feb 4 (Wed): 20 emails
- Feb 5 (Thu): 20 emails
- Feb 6 (Fri): 20 emails
- Feb 9 (Mon): 10 emails

---

## 📧 Email Details

### Template V2: "AI for earnings"
**Subject:** AI for earnings

**Body:**
```
{FirstName},

Manual earnings call analysis takes hours per company.

AI does it in seconds and catches alpha humans miss. Management tone, answer patterns, topic avoidance all signal surprises before they hit.

A hedge fund improved earnings prediction accuracy 23% using AI analysis.

Want a free guide on how to get AI to do this on thousands of companies automatically, immediately after earnings? Just reply yes and I'll send it to you.

Best,
Mike
```

**Offer:** Guide to automate earnings analysis across entire portfolio

---

### Template V3: "build earnings AI"
**Subject:** build earnings AI

**Body:**
```
{FirstName},

Most funds analyze earnings calls one at a time.

What if AI could do it for every company in your portfolio simultaneously?

We built a guide showing how to set this up yourself. No vendor dependency, runs on your schedule, scales to hundreds of companies.

A hedge fund used this approach and improved earnings prediction accuracy 23%.

Want it? Just reply "send guide".

Best,
Mike
```

**Offer:** DIY guide for building portfolio-wide earnings AI system

---

## 📊 Tracking & Analytics

### Personalization Tracking
Each message has `personalization_used` field:
```json
{
  "FirstName": "John",
  "Template": "V2" // or "V3"
}
```

Use this to:
- Track which template performed better
- Identify successful personalization patterns
- Segment future follow-ups by template

### Performance Queries

**Check V2 vs V3 performance:**
```sql
SELECT 
  personalization_used->>'Template' as template,
  COUNT(*) as sent,
  COUNT(*) FILTER (WHERE status = 'sent') as delivered,
  COUNT(*) FILTER (WHERE status = 'replied') as replied
FROM messages
WHERE campaign_id = (
  SELECT id FROM campaigns WHERE name = 'finance-leadgen-1000'
)
GROUP BY personalization_used->>'Template';
```

**Get reply rate by template:**
```sql
SELECT 
  personalization_used->>'Template' as template,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'replied')::numeric / 
    COUNT(*) FILTER (WHERE status = 'sent')::numeric * 100,
    2
  ) as reply_rate_percent
FROM messages
WHERE campaign_id = (SELECT id FROM campaigns WHERE name = 'finance-leadgen-1000')
  AND status IN ('sent', 'replied')
GROUP BY personalization_used->>'Template';
```

---

## 🚀 Next Steps

### Immediate: Set Up Railway Cron

**1. Configure Railway to run every 5 minutes:**
```json
{
  "cron": "*/5 * * * *",
  "command": "node scripts/process-message-queue.js"
}
```

**2. Deploy to Railway:**
```bash
# If not already deployed
railway up

# Or if using existing deployment
railway redeploy
```

**3. Monitor logs:**
```bash
railway logs
```

---

### What Railway Cron Will Do

Every 5 minutes:
1. Query for messages WHERE `status = 'pending'` AND `scheduled_at <= NOW()`
2. Process 1 message per run (safety limit)
3. Send via Unipile `/emails` endpoint
4. Update `messages.status` to 'sent' or 'failed'
5. Log to `account_activity` table

**Rate limiting:**
- 5-minute spacing between sends (cron frequency)
- Only sends during business hours (7 AM - 6 PM ET)
- Skips weekends (Mon-Fri only)
- Max 20 per day (controlled by scheduling)

---

## 📈 Expected Timeline

### Week 1 (Jan 26 - Jan 30)
- 100 emails sent (20 per day)
- Expect 8-15 replies (8-15% reply rate)
- Track V2 vs V3 performance

### Week 2 (Feb 2 - Feb 9)
- 110 emails sent (20 per day, last day 10)
- Expect 8-16 more replies
- Adjust strategy based on Week 1 results

### Total Campaign
- 210 emails sent over 11 business days
- Expected 16-31 total replies (8-15% reply rate)
- Expected 10-25 report/guide requests

---

## 🎯 Success Metrics

### Email Deliverability
- Target: > 95% delivered
- Monitor bounces in Unipile dashboard
- Check spam rates

### Engagement
- Open Rate: Target 40-60%
- Reply Rate: Target 8-15%
- Report/Guide Requests: Target 60-80% of replies

### Template Performance
- Track V2 vs V3 reply rates
- Identify which offer resonates more (custom vs. DIY)
- Use winning template for future campaigns

---

## ⚠️ Important Notes

### Before Starting Railway Cron
1. **Verify test email worked** - You sent one to mfishbein1@gmail.com
2. **Check Unipile limits** - Confirm daily email limits
3. **Review sample messages** - Check Supabase for personalization
4. **Set up monitoring** - Watch Railway logs for first few sends

### During Sending
1. **Monitor Railway logs** - Check for errors
2. **Watch Supabase** - Verify `messages.status` updates
3. **Check inbox** - Monitor deliverability and spam
4. **Track replies** - Set up Unipile webhooks if available

### After Campaign
1. **Analyze results** - V2 vs V3 performance
2. **Collect feedback** - What resonated? What didn't?
3. **Prepare fulfillment** - Have guide ready to send to requesters
4. **Plan follow-ups** - Create follow-up sequence for non-responders

---

## 📝 Next: Private Equity Templates

As mentioned, we'll create separate templates for PE firms focused on:
- Sentiment analysis (employee/customer feedback)
- Deal sourcing signals
- Due diligence automation

These will NOT mention earnings calls (not relevant for PE).

Segments to target:
- `private_equity`: 43 companies
- Expected contacts: ~60-80 (after enrichment completes)

---

## Files Created

- `scripts/create-email-messages-v2-v3.ts` - Message creation script
- `scripts/link-contacts-to-campaign.ts` - Campaign linking script
- `docs/emails-ready-to-send-summary.md` - This file
- `docs/email-segmentation-plan.md` - Segmentation strategy
