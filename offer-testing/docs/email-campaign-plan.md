# Email Campaign Plan: Finance Offer

**Date:** January 18, 2025  
**Campaign:** finance-leadgen-1000  
**Goal:** Send personalized emails offering free AI Earnings Edge Report

---

## 📊 Current Status

### Company & Contact Metrics
- **Total Companies:** 331
- **Total Contacts:** 274
- **Contacts with Email:** 210 (76.6% success rate)
- **Companies with Contacts:** 217
- **Companies without Contacts:** 114

### Company Segments
| Segment | Count | % of Total |
|---------|-------|------------|
| unknown | 93 | 28% |
| private_equity | 72 | 22% |
| investment_firm | 57 | 17% |
| hedge_fund | 43 | 13% |
| other | 19 | 6% |
| credit_union | 16 | 5% |
| bank | 15 | 5% |
| insurance | 6 | 2% |
| broker_dealer | 4 | 1% |
| fintech | 3 | 1% |
| mortgage | 2 | <1% |
| asset_manager | 1 | <1% |

**Key Segments for Targeting:**
- **Primary:** hedge_fund (43), private_equity (72), investment_firm (57) = **172 companies**
- **Secondary:** asset_manager (1), unknown (93 - may include finance firms) = **94 companies**
- **Exclude:** credit_union, bank, insurance, broker_dealer, fintech, mortgage = **46 companies**

---

## 📧 Email Template Strategy

### Template Segmentation

Based on company segments and signals, we'll use **3 email templates**:

#### Template 1: Hedge Funds & Asset Managers (Primary)
- **Target:** `hedge_fund`, `asset_manager` segments
- **Count:** ~44 companies
- **Template:** `ai-earnings-edge-report-email-v1.md` (Competitive angle)
- **Subject:** "While Citadel runs LLMs on earnings calls, you're reading transcripts manually"
- **Angle:** Competitive pressure from mega-funds using AI

#### Template 2: Private Equity Firms
- **Target:** `private_equity` segment
- **Count:** ~72 companies
- **Template:** `ai-earnings-edge-report-email-v2.md` (Use case-focused)
- **Subject:** "The earnings call sentiment edge that 80% of Balyasny's staff use daily"
- **Angle:** Practical use case, sentiment analysis for deal research

#### Template 3: Investment Firms & Unknown (General)
- **Target:** `investment_firm`, `unknown` segments (filtered for finance)
- **Count:** ~150 companies
- **Template:** Simplified version of v2
- **Subject:** "How LLMs predict earnings surprises better than consensus estimates"
- **Angle:** General value proposition, less competitive

### Personalization Variables

All templates will use:
- **{FirstName}** - Contact's first name (from `contacts.first_name`)
- **{CompanyName}** - Company name (from `companies.name`)
- **{YourName}** - Your name (from campaign config or env var)

Optional (if signals available):
- **{FundName}** - If company name is known
- **{SignalReference}** - If hiring/research signals detected

---

## 🎯 Email Copy (Brief & Report Offer)

### Template 1: Hedge Funds (Competitive Angle)

**Subject:** While Citadel runs LLMs on earnings calls, you're reading transcripts manually

**Body:**
```
Hi {FirstName},

While Citadel and Two Sigma run LLMs on earnings calls to extract sentiment and predict surprises, most mid-market funds are still reading transcripts manually.

**The gap:**
- Mega-funds use AI to analyze earnings calls in minutes
- You're spending hours reading transcripts looking for signals
- They're faster, more accurate, and catching insights you're missing

**The opportunity:**
LLMs can extract sentiment signals that predict earnings surprises better than consensus estimates. The management tone in earnings calls - how they answer questions, what they emphasize, what they avoid - is a signal most funds aren't capturing.

I just finished a report called "The AI Earnings Edge Report" that shows:
- How LLM-extracted management tone predicts earnings surprises
- The sentiment signal that beats consensus estimates
- Real examples from funds we've worked with
- How to leverage AI for research without building a 50-person team

We've helped 4 mid-market funds ($50M-$300M AUM) build AI earnings analysis systems. One fund improved earnings surprise prediction accuracy by 23%.

Want the report? Just reply and I'll send it over - no pitch, just insights.

Best,
{YourName}
```

### Template 2: Private Equity (Use Case Focus)

**Subject:** The earnings call sentiment edge that 80% of Balyasny's staff use daily

**Body:**
```
Hi {FirstName},

There's a sentiment signal in earnings calls that most funds are missing.

While you're reading transcripts looking for management tone changes, LLMs can extract this signal automatically - and it predicts earnings surprises better than consensus estimates.

**Here's what we've seen:**
- Funds using AI sentiment analysis saw 8% alpha improvement in earnings-driven trades
- One fund improved earnings surprise prediction accuracy by 23% using our LLM approach
- The management tone in earnings calls - how they answer questions, what they emphasize - is a signal most funds aren't capturing

I just finished a report called "The AI Earnings Edge Report" that shows:
- The sentiment signal that beats consensus estimates
- How LLM-extracted management tone predicts earnings surprises
- Real examples from funds we've worked with
- A playbook on leveraging AI for research without building a 50-person team

We've helped 4 mid-market funds ($50M-$300M AUM) build AI earnings analysis systems. The report shares what we learned.

Want it? Just reply and I'll send it over - no pitch, just insights.

Best,
{YourName}
```

### Template 3: Investment Firms & General (Simplified)

**Subject:** How LLMs predict earnings surprises better than consensus estimates

**Body:**
```
Hi {FirstName},

I help finance firms like {CompanyName} leverage AI for research without building large teams.

I just finished a report called "The AI Earnings Edge Report" that shows how LLMs extract sentiment signals from earnings calls - signals that predict earnings surprises better than consensus estimates.

**What's in the report:**
- How LLM-extracted management tone predicts earnings surprises
- The sentiment signal that beats consensus estimates
- Real examples from 4 mid-market funds ($50M-$300M AUM)
- A playbook on leveraging AI for research without building a 50-person team

One fund we worked with improved earnings surprise prediction accuracy by 23%.

Want the report? Just reply and I'll send it over - no pitch, just insights.

Best,
{YourName}
```

---

## 🔧 Implementation Steps

### Step 1: Link Contacts to Campaign

**Current Issue:** Contacts exist but aren't linked to `finance-leadgen-1000` campaign.

**Action:** Create script to link all contacts with emails to the campaign:

```typescript
// Script: scripts/link-contacts-to-campaign.ts
// Links all finance offer contacts with emails to finance-leadgen-1000 campaign
```

### Step 2: Create Email Messages

**Action:** Create script to generate personalized messages:

```typescript
// Script: scripts/create-email-messages.ts
// 1. Query contacts with emails linked to campaign
// 2. Select template based on company.vertical
// 3. Personalize {FirstName}, {CompanyName}, {YourName}
// 4. Insert into messages table with:
//    - channel: 'email'
//    - subject: (from template)
//    - body: (personalized template)
//    - status: 'pending'
//    - scheduled_at: (calculated with spacing)
```

### Step 3: Schedule Messages

**Action:** Use existing `message-scheduler.ts` logic to:
- Calculate `scheduled_at` timestamps
- Space messages 5-20 minutes apart
- Respect business hours (9 AM - 6 PM ET, Mon-Fri)
- Daily limit: 50 emails/day (adjustable)

### Step 4: Send via Railway Cron

**Action:** Update `process-message-queue.js` to handle email channel:
- Already has `sendEmailMessage()` function
- Uses Unipile `/emails` endpoint
- Updates `messages.status` to 'sent' or 'failed'

**Railway Cron Setup:**
```json
{
  "cron": "*/5 * * * *",
  "command": "node scripts/process-message-queue.js"
}
```

---

## 📋 Next Steps Checklist

### Immediate (Today)
- [ ] **Link contacts to campaign:** Create `link-contacts-to-campaign.ts` script
- [ ] **Create email messages:** Create `create-email-messages.ts` script
- [ ] **Test personalization:** Verify {FirstName}, {CompanyName} substitution
- [ ] **Test email sending:** Send 1-2 test emails manually

### This Week
- [ ] **Set up Railway cron:** Configure `process-message-queue.js` to run every 5 minutes
- [ ] **Monitor first batch:** Send 50 emails, monitor deliverability
- [ ] **Track replies:** Set up reply tracking (Unipile webhooks)
- [ ] **Adjust templates:** Based on open/reply rates

### Next Week
- [ ] **Scale up:** Increase daily limit if deliverability is good
- [ ] **Follow-ups:** Create follow-up sequence for non-responders
- [ ] **Find more contacts:** Continue contact discovery for 114 companies without contacts

---

## 📈 Success Metrics

### Email Metrics
- **Open Rate Target:** 25-35% (finance industry average: 20-25%)
- **Reply Rate Target:** 5-10% (cold email average: 1-3%)
- **Report Requests:** Track "yes" replies
- **Bounce Rate:** Keep < 5%

### Campaign Metrics
- **Emails Sent:** 210 (all contacts with emails)
- **Deliverability:** > 95%
- **Replies:** Track positive/negative/question
- **Meetings Booked:** Track conversion from reply to meeting

---

## 🚨 Risk Mitigation

### Deliverability
- **Warm-up:** Start with 10-20 emails/day, gradually increase
- **Spacing:** 5-20 minutes between sends (already configured)
- **Business Hours:** Only send Mon-Fri, 9 AM - 6 PM ET
- **Unsubscribe:** Include unsubscribe link in emails

### Compliance
- **CAN-SPAM:** Include physical address, unsubscribe link
- **GDPR:** Ensure contacts opted in or have legitimate interest
- **Rate Limits:** Respect Unipile limits (50-100/day per account)

### Quality
- **Personalization:** Always use {FirstName}, never generic "Hi there"
- **Relevance:** Match template to company segment
- **Testing:** Test each template before bulk send

---

## 📝 Notes

- **Email Account:** Already connected (mike@atherial.ai via Unipile)
- **Account ID:** `0pKp3VL5TGSAMQpg-eNC7A`
- **Test Email:** ✅ Successfully sent to mfishbein1@gmail.com
- **Templates:** Located in `offers/finance/campaigns/ai-earnings-edge-report/copy/`
- **Your Name:** Set in campaign config or use "Mike" as default

---

## 🔗 Related Files

- **Email Templates:** `offers/finance/campaigns/ai-earnings-edge-report/copy/`
- **Message Queue:** `scripts/process-message-queue.js`
- **Message Scheduler:** `src/lib/services/message-scheduler.ts`
- **Database Schema:** `project/supabase_schema.md`
- **Unipile Guide:** `docs/unipile-email-sending-guide.md`
