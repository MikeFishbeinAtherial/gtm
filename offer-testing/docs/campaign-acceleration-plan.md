# Atherial Campaign Acceleration Plan

## Current Status (January 19, 2026)

### Campaign Overview
- **Campaign:** Atherial AI Roleplay Training - 2025 Q1
- **Status:** In Progress
- **Total Messages:** 971

### Message Breakdown
| Status | Count | Percentage |
|--------|-------|------------|
| Sent | 181 | 18.6% |
| Pending | 771 | 79.4% |
| Failed | 16 | 1.6% |
| Skipped | 3 | 0.3% |

### Current Schedule
- **Messages/day:** 38
- **Send days:** Mon-Fri only (weekdays)
- **Hours:** 9 AM - 6 PM ET
- **Spacing:** 6-16 minutes between messages
- **Estimated completion:** ~February 12, 2026 (20 more weekdays)

---

## Acceleration Plan

### New Schedule Configuration

#### Changes
1. **Increase daily volume:** 38 → **48 messages/day** (+26%)
2. **Add weekend sends:** Mon-Fri → **7 days/week**
3. **Earlier start time:** 9 AM → **7 AM ET** (2 hours earlier)
4. **Same end time:** 6 PM ET (keeping same cutoff)
5. **Maintain spacing:** 6-16 minutes (unchanged)
6. **One message per cron:** 5-minute cron runs (unchanged)

#### New Timeline
- **Estimated completion:** ~February 8, 2026 (16 days instead of 20 weekdays)
- **Time saved:** ~12 days
- **Completion:** 4 days earlier

### Daily Schedule Examples

**Weekdays (Mon-Fri):**
```
7:00 AM - First message
7:15 AM - 2nd message (+15 min)
7:27 AM - 3rd message (+12 min)
...
5:45 PM - Last message (~48 messages)
```

**Weekends (Sat-Sun):**
```
7:00 AM - First message
7:11 AM - 2nd message (+11 min)
7:23 AM - 3rd message (+12 min)
...
5:50 PM - Last message (~48 messages)
```

---

## Implementation Steps

### 1. Update Configuration (✅ Done)
Updated `process-message-queue.js`:
```javascript
BUSINESS_HOURS_START = 7; // Was 9
SEND_DAYS = [0, 1, 2, 3, 4, 5, 6]; // Was [1,2,3,4,5]
MAX_MESSAGES_PER_DAY = 48; // Was 38
```

### 2. Reschedule Pending Messages
Run the reschedule script:
```bash
node scripts/reschedule-campaign-accelerated.js
```

This will:
- Take all 771 pending messages
- Reschedule them with new parameters
- Maintain 6-16 minute spacing
- Distribute across 7 days/week
- Start from 7 AM instead of 9 AM
- Complete campaign ~12 days faster

### 3. Verify Schedule
After rescheduling, check the new distribution:
```sql
SELECT 
  DATE(scheduled_at AT TIME ZONE 'America/New_York') as date,
  TO_CHAR(DATE(scheduled_at AT TIME ZONE 'America/New_York'), 'Dy') as day,
  COUNT(*) as messages
FROM networking_outreach
WHERE batch_id = (SELECT id FROM networking_campaign_batches WHERE slug = 'atherial-ai-roleplay-2025-q1')
AND status = 'pending'
GROUP BY date
ORDER BY date
LIMIT 20;
```

---

## Safety Considerations

### LinkedIn Rate Limits
- **Daily limit:** 50 messages/day (we're using 48 for safety buffer)
- **Spacing:** 6-16 minutes is well within safe range
- **Pattern variation:** Random spacing prevents detection
- **Weekend sends:** Safer than weekdays (less LinkedIn activity)

### Monitoring
- **Digest emails:** Every 3 hours (9am, 12pm, 3pm, 6pm, 9pm ET)
- **Daily stats included:** Sent today, remaining, last scheduled
- **Check script:** `node scripts/check-today-stats.js`

### Risk Mitigation
1. ✅ Staying under 50/day limit (using 48)
2. ✅ Random spacing (6-16 min) prevents patterns
3. ✅ One message per cron run (maintains natural timing)
4. ✅ Business hours respected (7 AM - 6 PM ET)
5. ✅ Weekend sends are SAFER (lower LinkedIn activity)

---

## Benefits

### Time Savings
- **Before:** ~20 weekdays (ending Feb 12)
- **After:** ~16 days including weekends (ending Feb 8)
- **Savings:** 4 days faster completion

### Coverage Improvement
- **Before:** Only Mon-Fri (5/7 days)
- **After:** All 7 days (100% coverage)
- **Benefit:** Reach people who check LinkedIn on weekends

### Early Morning Advantage
- **Before:** 9 AM start
- **After:** 7 AM start
- **Benefit:** Messages arrive before work starts, higher engagement

---

## Next Steps

1. **Run reschedule script:**
   ```bash
   cd /Users/mikefishbein/Desktop/Vibe\ Coding/gtm/offer-testing
   node scripts/reschedule-campaign-accelerated.js
   ```

2. **Push to GitHub and deploy to Railway:**
   ```bash
   git add .
   git commit -m "Accelerate campaign: 48/day, 7 days/week, 7am start"
   git push origin main
   ```

3. **Monitor first few days:**
   - Check digest emails for send times
   - Verify weekend sends work
   - Confirm 7 AM sends happen

4. **Track completion:**
   - Campaign should complete by ~Feb 8 instead of Feb 12
   - 4 days faster with weekend coverage
