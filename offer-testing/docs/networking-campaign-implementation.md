# Networking Campaign System - Complete Implementation

## ✅ Campaign Created

**Campaign ID**: `d38eb9c1-5b9d-4c83-bda4-a1d5eeeb9ac8`
**Name**: networking-holidays-2025
**Status**: draft
**Targets**: 539 contacts
**Created**: 2025-12-22

---

## System Architecture

This is a **Sales Engagement Platform** for LinkedIn networking campaigns with:

1. **Contact Import** - Load 539 contacts from CSV → Supabase
2. **Member ID Lookup** - Find LinkedIn `member_id` for each contact
3. **Message Personalization** - fill in template with first name
4. **Campaign Monitor** - Dashboard to track progress
5. **Safe Sender** - Send with rate limits, pause/resume, error handling

---

## Database Structure

```
networking_campaign_batches (created ✅)
├─ id: d38eb9c1-5b9d-4c83-bda4-a1d5eeeb9ac8
├─ name: networking-holidays-2025
├─ message_template: "Happy holidays {first_name}..."
├─ status: draft → ready → in_progress → completed
└─ metrics: sent_count, reply_count, etc.

linkedin_connections (539 to import)
├─ linkedin_id: LinkedIn member_id (ACoAAA...)
├─ linkedin_url: https://linkedin.com/in/...
├─ first_name, last_name
├─ contacted_in_campaign: false → true
└─ campaign_response: null → positive/neutral/negative

networking_outreach (539 to create)
├─ batch_id: d38eb9c1-5b9d-4c83-bda4-a1d5eeeb9ac8
├─ connection_id: FK to linkedin_connections
├─ personalized_message: "Happy holidays Claudia..."
├─ status: pending → sent → replied
├─ sent_at, replied_at
└─ reply_sentiment, needs_follow_up
```

---

## Implementation Plan

### Phase 1: Import & Prepare (15-20 min)

**Script 1: `import-networking-contacts.js`**
- Load 539 contacts from JSON
- For each contact:
  - Search through your 7672 connections via Unipile
  - Find their `member_id` by matching `linkedin_url`
  - Insert into `linkedin_connections` table
  - Create `networking_outreach` record with personalized message
- Progress: Shows "Processing 1/539..." with ETA
- Handles errors: Logs contacts not found
- Output: 539 contacts ready, X not found

**Estimated time**: 15-20 minutes (539 contacts × 2s delay = 18 min)

### Phase 2: Review & Approve (5-10 min)

**Script 2: `campaign-monitor.js`**
- Dashboard showing:
  - Campaign status
  - 539 contacts ready
  - Rate limits (0/25 sent today)
  - Messages queued for review
- Options:
  - [V] View sample messages (show 5 random)
  - [R] Mark campaign as ready
  - [S] Show statistics
  - [Q] Quit

### Phase 3: Send Campaign (20-25 days)

**Script 3: `campaign-send.js`**
- Safety features:
  - Rate limit: 50/day max (50% of LinkedIn's 100/day recommendation)
  - Random delays: 15-45 min between sends (emulates human behavior)
  - Hours: 6 AM - 8 PM ET (14 hours, 7 days/week)
  - Pause: Only Christmas Day (Dec 25)
  - Resume capability
- Error handling:
  - Logs all errors
  - Continues on failure
  - Reports at end
- Progress tracking:
  - Real-time updates
  - Saves state every 5 sends
  - Can Ctrl+C and resume

**Timeline**:
- 25 sends/day = 22 days
- 20 sends/day = 27 days

---

## Detailed Script Specifications

### Script 1: import-networking-contacts.js

```javascript
// Pseudocode

const contacts = require('./data/networking-contacts.json') // 539 contacts
const BATCH_ID = 'd38eb9c1-5b9d-4c83-bda4-a1d5eeeb9ac8'

for (const contact of contacts) {
  // 1. Search Unipile for member_id
  const memberData = await findInConnections(contact.linkedin_url)
  
  if (!memberData) {
    log(`❌ Not found: ${contact.first_name} - ${contact.linkedin_url}`)
    continue
  }
  
  // 2. Insert into linkedin_connections
  const connection = await supabase
    .from('linkedin_connections')
    .upsert({
      linkedin_id: memberData.member_id,
      linkedin_url: contact.linkedin_url,
      first_name: contact.first_name,
      last_name: contact.last_name,
      full_name: `${contact.first_name} ${contact.last_name}`,
      headline: memberData.headline,
      // ... other fields
    })
  
  // 3. Create personalized message
  const message = template.replace('{first_name}', contact.first_name)
  
  // 4. Create outreach record
  await supabase
    .from('networking_outreach')
    .insert({
      batch_id: BATCH_ID,
      connection_id: connection.id,
      personalized_message: message,
      status: 'pending'
    })
  
  // Progress
  console.log(`✅ ${i}/${contacts.length} - ${contact.first_name}`)
  
  // Delay to avoid rate limits
  await sleep(2000) // 2 seconds
}
```

### Script 2: campaign-monitor.js

```javascript
// Dashboard

Campaign: networking-holidays-2025
Status: Ready to Send
Created: 2025-12-22

┌─────────────────────────────────────┐
│          CAMPAIGN OVERVIEW          │
├─────────────────────────────────────┤
│ Total Contacts: 539                 │
│ Ready to Send:  539                 │
│ Sent:           0                   │
│ Replied:        0                   │
│ Failed:         0                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         RATE LIMITS (Today)         │
├─────────────────────────────────────┤
│ Messages Sent: 0 / 25               │
│ Remaining:     25                   │
│ Resets:        Tomorrow 12:00 AM    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│            TIMELINE                 │
├─────────────────────────────────────┤
│ Days to Complete: ~22 days          │
│ (at 25 messages/day)                │
│                                     │
│ Start:    Dec 22, 2025              │
│ Finish:   Jan 13, 2026              │
│                                     │
│ ⚠️ Paused Dec 25 (holiday)     │
└─────────────────────────────────────┘

Options:
[S] Start sending
[V] View sample messages
[P] Pause campaign
[R] Reset campaign
[Q] Quit

Your choice:
```

### Script 3: campaign-send.js

```javascript
// Main sending loop

while (hasRemainingContacts) {
  // Check if we can send
  if (todayCount >= 25) {
    log('⏸️  Daily limit reached. Pausing until tomorrow.')
    scheduleResume('tomorrow 9am')
    break
  }
  
  if (!isBusinessHours()) {
    log('⏸️  Outside business hours. Resuming at 9am.')
    scheduleResume('next business day 9am')
    break
  }
  
  if (isPausedDate()) { // Christmas, etc
    log('⏸️  Holiday pause. Resuming after holiday.')
    scheduleResume('after holiday')
    break
  }
  
  // Get next contact
  const outreach = await getNextPending()
  
  try {
    // Send via Unipile
    const result = await sendMessage({
      account_id: UNIPILE_ACCOUNT_ID,
      member_id: outreach.connection.linkedin_id,
      text: outreach.personalized_message
    })
    
    // Update database
    await updateOutreach(outreach.id, {
      status: 'sent',
      sent_at: new Date(),
      message_id: result.message_id
    })
    
    await updateConnection(outreach.connection_id, {
      contacted_in_campaign: true,
      last_campaign_contact_at: new Date()
    })
    
    await updateBatchStats(BATCH_ID)
    
    log(`✅ Sent to ${outreach.connection.first_name}`)
    todayCount++
    
    // Random delay
    const delay = randomBetween(120000, 300000) // 2-5 min
    log(`   Waiting ${delay/60000} minutes...`)
    await sleep(delay)
    
  } catch (error) {
    log(`❌ Failed: ${outreach.connection.first_name} - ${error.message}`)
    
    await updateOutreach(outreach.id, {
      status: 'failed',
      skip_reason: error.message
    })
    
    // Continue to next
  }
}
```

---

## Monitoring & Control

### Campaign States

```
draft → ready → in_progress → paused → in_progress → completed
         ↓                              ↑
         └──────────────────────────────┘
              (can pause/resume anytime)
```

### Pause Scenarios

1. **Manual pause**: User runs `campaign-send.js --pause`
2. **Rate limit**: Hits 50/day → auto-pause until next day 6am
3. **Business hours**: After 8pm → auto-pause until 6am next day
4. **Holiday**: Only Dec 25 (Christmas) → auto-pause for 24 hours
5. **Error threshold**: 5+ consecutive failures → pause for review

### Resume

```bash
# Auto-resumes when:
- Next day 6am (if paused for time)
- After holidays
- User runs: campaign-send.js --resume
```

---

## Error Handling

### Contact Not Found
- Log to `import-errors.txt`
- Skip and continue
- Report at end

### Send Failure
- Mark outreach as 'failed'
- Log reason
- Continue to next contact
- If 5+ consecutive failures → pause and alert

### Rate Limit Hit
- Stop immediately
- Save progress
- Schedule resume for tomorrow

---

## Files Created

1. ✅ `data/networking-contacts.json` - 539 contacts
2. ✅ `scripts/parse-networking-csv.js` - CSV parser
3. ✅ `scripts/send-to-eugene.js` - Test send (worked!)
4. ⏳ `scripts/import-networking-contacts.js` - Import system
5. ⏳ `scripts/campaign-monitor.js` - Dashboard
6. ⏳ `scripts/campaign-send.js` - Safe sender
7. ⏳ `scripts/campaign-pause.js` - Pause control
8. ⏳ `scripts/campaign-stats.js` - Statistics

---

## Next Steps

I'll now build these 5 remaining scripts. They'll be production-ready with:
- ✅ Full error handling
- ✅ Progress saving/resuming
- ✅ Rate limiting
- ✅ Business hours checking
- ✅ Holiday detection
- ✅ Logging
- ✅ Statistics
- ✅ Pause/resume

Should I proceed with building these scripts now?

