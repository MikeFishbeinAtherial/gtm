# Email Campaign Implementation Summary

**Date:** January 18, 2025  
**Status:** Ready to execute

---

## ✅ What's Done

### 1. Email Sending Infrastructure
- ✅ **Test email sent successfully** via Unipile (`mike@atherial.ai` → `mfishbein1@gmail.com`)
- ✅ **Email account connected:** `0pKp3VL5TGSAMQpg-eNC7A`
- ✅ **Message queue script updated** to use correct Unipile endpoint (`/emails` with array format)
- ✅ **Database schema ready:** `messages` table supports email channel

### 2. Email Templates Created
- ✅ **Template 1:** Hedge Funds & Asset Managers (competitive angle)
- ✅ **Template 2:** Private Equity (use case focus)
- ✅ **Template 3:** Investment Firms & General (simplified)

### 3. Scripts Created
- ✅ **`link-contacts-to-campaign.ts`** - Links contacts to campaign
- ✅ **`create-email-messages.ts`** - Creates personalized messages with scheduling
- ✅ **`check-company-segments-and-contacts.ts`** - Analytics script

### 4. Documentation
- ✅ **`email-campaign-plan.md`** - Complete campaign plan
- ✅ **`email-campaign-implementation-summary.md`** - This file

---

## 📊 Current Status

### Company & Contact Metrics
- **331 companies** total
- **274 contacts** total
- **210 contacts with email** (76.6% success rate)
- **217 companies have contacts**
- **114 companies need contacts**

### Segments Breakdown
| Segment | Companies | Template |
|---------|-----------|----------|
| hedge_fund | 43 | Template 1 (Competitive) |
| private_equity | 72 | Template 2 (Use Case) |
| investment_firm | 57 | Template 3 (General) |
| unknown | 93 | Template 3 (General) |
| other | 66 | Template 3 (General) |

---

## 🚀 Next Steps (In Order)

### Step 1: Link Contacts to Campaign
```bash
npx ts-node scripts/link-contacts-to-campaign.ts
```
**What it does:**
- Links all 210 contacts with emails to `finance-leadgen-1000` campaign
- Sets status to `queued` for message creation

**Expected output:**
- Links ~210 contacts (or shows how many were already linked)

---

### Step 2: Create Email Messages (Dry Run First)
```bash
# Dry run to preview
npx ts-node scripts/create-email-messages.ts --dry-run

# Create first 50 messages
npx ts-node scripts/create-email-messages.ts --limit 50
```
**What it does:**
- Selects template based on company `vertical`
- Personalizes with `{FirstName}`, `{CompanyName}`, `{YourName}`
- Calculates `scheduled_at` timestamps (5-20 min spacing, business hours)
- Inserts into `messages` table with `status: 'pending'`

**Expected output:**
- Creates 50 personalized messages
- Shows first/last scheduled times
- Messages ready for sending

---

### Step 3: Test Send a Few Messages Manually
```bash
# Check what messages are ready
# Then manually trigger process-message-queue.js to send 1-2

node scripts/process-message-queue.js
```
**What it does:**
- Queries `messages` table for `status: 'pending'` and `scheduled_at <= NOW()`
- Sends via Unipile `/emails` endpoint
- Updates status to `sent` or `failed`

**Verify:**
- Check inbox for test emails
- Check `messages.status` in Supabase
- Verify personalization worked

---

### Step 4: Set Up Railway Cron (For Automated Sending)
**Railway Configuration:**
```json
{
  "cron": "*/5 * * * *",
  "command": "node scripts/process-message-queue.js"
}
```

**What it does:**
- Runs every 5 minutes
- Processes 1 message per run (safety limit)
- Respects 5-minute spacing between sends
- Only sends during business hours (9 AM - 6 PM ET, Mon-Fri)

**Rate Limits:**
- Max 1 message per cron run
- ~12 messages/hour (if all scheduled)
- ~96 messages/day (if running 8 hours)
- Adjust daily limit in `create-email-messages.ts` if needed

---

### Step 5: Create Remaining Messages
```bash
# After testing, create all remaining messages
npx ts-node scripts/create-email-messages.ts
```
**What it does:**
- Creates messages for all remaining contacts
- Stacks scheduling after existing messages
- Respects daily limits and business hours

**Expected:**
- Creates ~160 more messages (210 total - 50 test batch)
- Messages scheduled over next 1-2 weeks

---

## 📧 Email Templates Summary

### Template 1: Hedge Funds (Competitive Angle)
- **Subject:** "While Citadel runs LLMs on earnings calls, you're reading transcripts manually"
- **Target:** `hedge_fund`, `asset_manager` segments
- **Count:** ~44 companies
- **Angle:** Competitive pressure from mega-funds

### Template 2: Private Equity (Use Case Focus)
- **Subject:** "The earnings call sentiment edge that 80% of Balyasny's staff use daily"
- **Target:** `private_equity` segment
- **Count:** ~72 companies
- **Angle:** Practical sentiment analysis use case

### Template 3: General (Simplified)
- **Subject:** "How LLMs predict earnings surprises better than consensus estimates"
- **Target:** `investment_firm`, `unknown`, `other` segments
- **Count:** ~150 companies
- **Angle:** General value proposition

**All templates:**
- Brief (~150 words)
- Offer free report ("Want the report? Just reply...")
- No pitch, just insights
- Personalized with `{FirstName}` and `{CompanyName}`

---

## 🔧 Technical Details

### Personalization Variables
- **{FirstName}** - From `contacts.first_name`
- **{CompanyName}** - From `companies.name`
- **{YourName}** - From `YOUR_NAME` env var (default: "Mike")

### Scheduling Logic
- **Spacing:** 5-20 minutes between messages (randomized)
- **Business Hours:** 9 AM - 6 PM ET, Mon-Fri
- **Daily Limit:** Configurable (default: no hard limit, but spacing naturally limits)
- **Stacking:** New messages scheduled after existing ones

### Message Status Flow
```
pending → sending → sent
                 ↘ failed
```

### Database Tables Used
- **`campaigns`** - Campaign metadata
- **`campaign_contacts`** - Links contacts to campaigns
- **`messages`** - Individual messages to send
- **`contacts`** - Contact info (email, first_name)
- **`companies`** - Company info (name, vertical)
- **`accounts`** - Unipile account info

---

## 📈 Success Metrics to Track

### Email Metrics
- **Open Rate:** Target 25-35%
- **Reply Rate:** Target 5-10%
- **Bounce Rate:** Keep < 5%
- **Report Requests:** Track "yes" replies

### Campaign Metrics
- **Total Sent:** 210 emails
- **Deliverability:** > 95%
- **Replies:** Track positive/negative/question
- **Meetings:** Track conversion from reply to meeting

---

## ⚠️ Important Notes

### Before Sending
1. **Verify email account:** Ensure `mike@atherial.ai` is properly connected
2. **Test personalization:** Check a few messages in Supabase to verify `{FirstName}` substitution
3. **Check scheduled times:** Verify `scheduled_at` timestamps are reasonable
4. **Start small:** Send 10-20 emails first, monitor deliverability

### During Sending
1. **Monitor logs:** Check Railway logs for errors
2. **Check Supabase:** Verify `messages.status` updates correctly
3. **Watch inbox:** Monitor for bounces or spam complaints
4. **Track replies:** Set up Unipile webhooks for reply tracking

### After Sending
1. **Analyze results:** Check open/reply rates
2. **Adjust templates:** Based on performance
3. **Follow-ups:** Create follow-up sequence for non-responders
4. **Scale up:** Increase daily limit if deliverability is good

---

## 🐛 Troubleshooting

### Messages Not Sending
- **Check Railway cron:** Is it running every 5 minutes?
- **Check scheduled_at:** Are messages scheduled in the past?
- **Check status:** Are messages `pending`?
- **Check logs:** Look for errors in Railway logs

### Personalization Not Working
- **Check first_name:** Verify `contacts.first_name` is populated
- **Check template:** Verify template has `{FirstName}` placeholder
- **Check script:** Review `create-email-messages.ts` personalization logic

### Email Delivery Issues
- **Check Unipile:** Verify account is connected and active
- **Check endpoint:** Verify using `/emails` (plural) endpoint
- **Check format:** Verify `to` is array: `[{identifier: "email@example.com"}]`
- **Check bounces:** Review bounce reports in Unipile dashboard

---

## 📝 Files Reference

### Scripts
- `scripts/link-contacts-to-campaign.ts` - Link contacts
- `scripts/create-email-messages.ts` - Create messages
- `scripts/process-message-queue.js` - Send messages (Railway cron)
- `scripts/check-company-segments-and-contacts.ts` - Analytics

### Templates
- `offers/finance/campaigns/ai-earnings-edge-report/copy/ai-earnings-edge-report-email-v1.md`
- `offers/finance/campaigns/ai-earnings-edge-report/copy/ai-earnings-edge-report-email-v2.md`

### Documentation
- `docs/email-campaign-plan.md` - Full campaign plan
- `docs/email-campaign-implementation-summary.md` - This file
- `docs/unipile-email-sending-guide.md` - Unipile setup guide

---

## ✅ Ready to Execute

All infrastructure is in place. Follow the steps above to:
1. Link contacts
2. Create messages
3. Test sending
4. Set up Railway cron
5. Scale up

**Questions?** Check the full plan in `docs/email-campaign-plan.md` or review the scripts.
