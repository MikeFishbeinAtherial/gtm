# LinkedIn Rate Limits & Safety Guidelines

**Source**: Unipile Platform Documentation  
**Last Updated**: December 22, 2025  
**Purpose**: Reference guide for all LinkedIn automation to avoid account restrictions

---

## ⚠️ Critical Warnings

- **These limits are conservative recommendations.** You may increase at your own risk.
- **Exceeding limits = HTTP 429 or 500 errors** from LinkedIn
- **Fake accounts are easily detected** - Use real, active accounts only
- **New/inactive accounts**: Start low, increase gradually
- **Automation patterns are flagged** - Randomize timing, emulate human behavior

---

## 📊 Official Rate Limits (Unipile Recommendations)

### Connection Requests (Invitations)
- **Paid & active account**: 80-100 invitations/day, ~200/week
  - Message limit: 300 characters
- **Free account**: ~5/month, 150/week without note
- **Error on limit**: HTTP 422/cannot_resend_yet
- **Note**: We only message existing connections (1st-degree) - not applicable for networking campaigns

### Messages to Connections
- **Limit**: 100 messages/day per account
- **Our usage**: 50/day (50% safety buffer)
- **Pattern**: Random 15-45 minute delays between sends
- **Hours**: Distribute across available time windows

### Profile Retrieval (Profile Visits/ID Conversion)
- **Limit**: ~100 profiles/day
- **Sales Navigator/Recruiter bonus**: Additional requests possible
- **Recruiter Lite**: Official limit of 2,000
- **Tip**: Switch "api" parameter for Sales Navigator accounts

### Search Results
- **Per-search cap (LinkedIn enforced)**:
  - Standard LinkedIn: 1,000 profiles max per query
  - Sales Navigator/Recruiter: 2,500 profiles max per query
- **Daily usage (Unipile recommendation)**:
  - Standard: 1,000 profiles/day total
  - Sales Navigator: 2,500 profiles/day total
- **Note**: This is sum of results fetched, not number of requests

### Relations & Invitation List
- **Polling recommendation**: Don't poll every hour or at fixed times
- **Webhook alternative**: Use 'new_relation' webhook for accepted invitations
- **Sync pattern**: Initial bulk sync, then random intervals of several hours
- **Limit**: First page only, few times/day

### InMail
- **Depends on subscription**:
  - Career: 5/month
  - Recruiter: Thousands (shared)
- **Free InMails**: ~800/month to open profiles
- **Recommendation**: 30-50/day to maximize monthly allocation
- **Check credits**: Available via API endpoint

### Other Routes (General)
- **Default limit**: 100 actions/day per account
- **Examples**: Company profiles, posts, comments, reactions
- **Pattern**: Minimize usage, random spacing

---

## 🛡️ Safety Best Practices

### Timing & Distribution
- **Random intervals**: Never fixed timing (e.g., not every 8 AM)
- **Human emulation**: Space out calls, vary delays
- **Working hours**: Distribute across available time windows
- **Weekends**: Can be included (we do 6 AM - 8 PM daily)

### Account Health
- **Real accounts only**: Fake accounts detected easily
- **Gradual ramp-up**: Start low on new/inactive accounts
- **Active usage**: Regular manual activity recommended
- **Connection quality**: Focus on 1st-degree connections (lowest risk)

### Error Handling
- **HTTP 429/500**: Rate limit exceeded - back off
- **HTTP 422**: Cannot send yet - invitation limit hit
- **Graceful handling**: Log errors, continue processing
- **Threshold alerts**: Pause on 5+ consecutive failures

### Automation Detection Avoidance
- **Pattern breaking**: Random delays, varying times
- **Manual-like behavior**: Realistic intervals between actions
- **Context awareness**: Don't spam, provide value
- **Rate limiting**: Conservative usage (50% of limits)

---

## 📈 Our Implementation (Networking Campaign)

### Rate Limits Used
- **Messages**: 50/day (50% of 100/day limit)
- **Safety buffer**: Allows for unexpected usage
- **Conservative approach**: Better safe than banned

### Timing Strategy
- **Hours**: 6 AM - 8 PM ET (14 hours daily)
- **Days**: Monday-Sunday (except Dec 25 Christmas)
- **Delays**: 15-45 minutes random between messages
- **Pattern**: Emulates manual sending throughout day

### Error Management
- **Automatic handling**: Continues on individual failures
- **Logging**: All errors tracked in Supabase
- **Threshold pausing**: Stops on 5+ consecutive errors
- **Resume capability**: Can restart after issues resolved

### Monitoring
- **Real-time dashboard**: Track progress, errors, rates
- **Daily limits**: Auto-pause at 50 messages/day
- **Hourly limits**: Respects time windows
- **Manual override**: Can pause/resume anytime

---

## 🚨 Red Flags to Monitor

### Account Warnings
- **Unusual activity detected**: LinkedIn security emails
- **Rate limit errors**: HTTP 429/500 responses
- **Message delivery issues**: Messages not appearing in UI
- **Connection restrictions**: Can't send invitations

### Pattern Detection
- **Fixed timing**: Same time every day
- **Burst sending**: Many actions in short time
- **High volume**: Exceeding recommended limits
- **Automated patterns**: Predictable sequences

### Recovery Steps
1. **Pause immediately** if warnings received
2. **Reduce frequency** (lower daily limits)
3. **Randomize timing** more aggressively
4. **Manual activity** to look human
5. **Contact support** if account restricted

---

## 📋 Quick Reference

### Daily Limits (Our Usage)
- Messages: 50 (of 100 available)
- Profile visits: N/A (networking campaign)
- Searches: N/A (using existing contacts)
- Invitations: 0 (1st-degree only)

### Time Windows
- Hours: 6 AM - 8 PM ET
- Days: Daily except Dec 25
- Delays: 15-45 min random
- Timezone: America/New_York

### Error Codes
- **429**: Too many requests - back off
- **422**: cannot_resend_yet - invitation limit
- **500**: Server error - may be rate related

---

## 🔗 Resources

- **Unipile Docs**: https://developer.unipile.com/
- **LinkedIn Limits**: Check account type for InMail credits
- **Webhook Guide**: https://developer.unipile.com/docs/detecting-accepted-invitations

---

## 📝 Notes for Future Campaigns

- **Outbound campaigns**: May need lower limits (colder audience)
- **Sales Navigator**: Higher limits available for profile searches
- **A/B testing**: Test different sending patterns safely
- **Account rotation**: Multiple accounts for scale (if needed)
- **Monitoring**: Track account health metrics over time
