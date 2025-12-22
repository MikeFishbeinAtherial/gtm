# Campaign Plan: networking-holidays-2025

**Offer:** Atherial  
**Campaign Type:** Networking/Reconnection  
**Status:** In Setup  
**Timeline:** December 21, 2025 - January 13, 2026  
**Pause:** December 25 (Christmas Day)

---

## Campaign Overview

### Goal
Reconnect with 1st-degree LinkedIn connections during the holiday season to:
1. Wish happy holidays (genuine relationship building)
2. Surface what's new with them in 2026
3. Soft introduction to Atherial services
4. Ask for referrals to people who need custom AI development

### Why This Campaign
- **Warm audience:** All 1st-degree connections (not cold outreach)
- **Seasonal timing:** Holidays are natural time for reconnection
- **Soft approach:** No hard pitch, just offering to be a resource
- **Referral-focused:** Easier ask than direct sale

### Target Audience
- **Size:** 539 contacts
- **Relationship:** 1st-degree LinkedIn connections
- **Source:** Personal network (CSV export)
- **Qualification:** None (networking, not sales-qualified)

---

## Messaging Strategy

### Message Template

```
Happy holidays {{firstname}}! What's in store for you in 2026? 

Let me know if I can be a resource to anyone in your network who wants to implement custom AI agents or internal tools. Here are demo videos of some of what we've shipped to production: https://www.atherial.ai/work. Happy to share lessons and best practices.
```

### Message Breakdown

**Line 1:** "Happy holidays {{firstname}}! What's in store for you in 2026?"
- Purpose: Holiday greeting + open-ended question
- Personalization: First name only
- Tone: Warm, genuine interest

**Line 2-3:** Service introduction + referral ask
- Purpose: Explain what we do, ask for referrals (not direct sale)
- Proof: Link to portfolio
- CTA: Be a resource, share knowledge

### Why This Works
- ✅ Personal and warm (holiday timing)
- ✅ Question invites response (not just broadcast)
- ✅ Soft ask (referrals easier than direct pitch)
- ✅ Proof included (portfolio link)
- ✅ No pressure (offer to help, not sell)

---

## LinkedIn Safety Strategy

### Critical Rules
1. **1st-degree connections only** (lower risk of spam flags)
2. **Human-like sending patterns** (not all at once)
3. **Rate limits** (max 50-100 messages/day)
4. **Random delays** (15-45 min between messages)
5. **Business hours only** (9 AM - 6 PM ET, Mon-Fri)
6. **Manual review option** (can review messages before sending)
7. **Pause capability** (stop for holidays/weekends)
8. **Error monitoring** (catch API errors, LinkedIn warnings)

### Sending Schedule

```
Total: 539 messages
Daily Rate: 50 messages/day (conservative)
Duration: ~11 days (including weekends)
Start: Dec 23, 2025
Pause: Dec 25 (Christmas only)
Resume: Dec 26
Estimated Completion: Jan 13, 2026
```

**Daily Pattern:**
- 6 AM - 8 PM ET (14-hour window, 7 days/week except Christmas)
- 50 messages = ~3.5 messages/hour
- Random 15-45 min delays between sends
- Looks like manual sending to LinkedIn
- Can send Saturdays and Sundays

### LinkedIn Rate Limits (Updated)

**Official Unipile Recommendations:**
- **Messages to connections:** 100/day per account (we use 50 for safety)
- **Connection requests:** 80-100/day (not applicable - we only message existing connections)
- **Profile visits:** ~100/day
- **Search results:** 1,000/day (standard) or 2,500/day (Sales Navigator)
- **General rule:** Space calls randomly, emulate human behavior

**Key Guidelines:**
- Use random intervals (not fixed timing)
- Distribute across working hours
- New/inactive accounts: Start low, increase gradually
- Handle HTTP 429/500 errors gracefully
- Real accounts only (fake accounts detected easily)

**Our Safety Settings:**
- 50 messages/day (50% of recommended max)
- 15-45 min random delays
- 6 AM - 8 PM ET (14 hours vs. typical 9-5)
- Include weekends (except Christmas)
- Only 1st-degree connections (lowest risk)

---

## Technical Implementation

### Database Schema
Uses new `networking_campaign_batches` and `networking_outreach` tables (see `scripts/setup-networking-schema.sql`)

### Scripts

1. **`import-networking-contacts.js`** - Load CSV → Supabase
2. **`generate-networking-messages.js`** - Create personalized messages
3. **`send-networking-campaign.js`** - Safe sending with rate limits
4. **`monitor-networking-campaign.js`** - Real-time dashboard

### Workflow

```
1. Import contacts from CSV
   ↓
2. Look up LinkedIn member_ids via Unipile
   ↓
3. Generate personalized messages (fill in first name)
   ↓
4. Review messages (optional manual approval)
   ↓
5. Queue messages in Supabase
   ↓
6. Send with rate limiting (50/day, random delays)
   ↓
7. Monitor progress & errors
   ↓
8. Track replies (manual for V1)
```

---

## Success Metrics

### Primary Metrics
- **Messages Sent:** Target 539
- **Reply Rate:** Benchmark 10-20% (warm audience)
- **Positive Replies:** Interested in services or know someone
- **Referrals Generated:** Introductions made
- **Meetings Booked:** Calls scheduled

### Secondary Metrics
- **Error Rate:** Should be <1%
- **Time to Complete:** ~11 business days
- **LinkedIn Safety:** No warnings or restrictions

### What Success Looks Like
- 50+ replies
- 10+ referrals or warm intros
- 2-5 qualified meetings
- Zero LinkedIn issues
- Learnings for future campaigns

---

## Risk Mitigation

### LinkedIn Automation Risk
**Risk:** LinkedIn detects automation, flags or restricts account  
**Mitigation:** 
- Only 1st-degree connections (lower risk)
- Human-like timing (random delays, business hours)
- Conservative rate limit (50/day vs. 100+ possible)
- Monitor for errors
- Can pause immediately if issues arise

### Message Quality Risk
**Risk:** Generic message, low response rate  
**Mitigation:**
- Personal greeting with first name
- Holiday timing (natural reconnection)
- Ask about their plans (not just broadcast)
- Portfolio link for credibility
- No hard pitch (referral ask is easier)

### Timing Risk
**Risk:** Sending during holidays when people aren't checking LinkedIn  
**Mitigation:**
- Pause on Dec 25 (Christmas)
- Extend campaign into early January
- Messages will be waiting when people return

---

## Campaign Timeline

| Date | Activity | Notes |
|------|----------|-------|
| Dec 21 | Setup complete | Scripts ready, database configured |
| Dec 23 | Start sending | First 50 messages |
| Dec 24 | Continue | 50 messages |
| Dec 25 | **PAUSE** | Christmas Day - no messages |
| Dec 26 | Resume | 50 messages |
| Dec 27-31 | Continue | 50 messages/day |
| Jan 2-13 | Finish campaign | Remaining messages |
| Jan 13 | Campaign complete | Review results |

---

## Next Steps

1. ✅ Import 539 contacts from CSV
2. ✅ Look up LinkedIn member IDs
3. ✅ Generate personalized messages
4. Review sample messages (optional)
5. Start sending (Dec 23)
6. Monitor daily
7. Respond to replies manually
8. Track learnings

---

## Files

- `copy/linkedin-message.md` - Final message copy
- `targeting.md` - Audience definition (1st-degree connections)
- `results.md` - Campaign performance tracking

