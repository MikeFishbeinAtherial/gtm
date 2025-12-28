# Message Architecture Guide

## Overview

Your system uses **two separate message tables** for different campaign types. This is intentional and serves different purposes.

---

## Table Structure

### 1. **`messages` Table** - For Cold Outreach Campaigns

**Purpose:** Structured, multi-step email/LinkedIn sequences for cold outreach

**Architecture:**
```
campaigns (campaign_type = 'cold_outreach')
  └── campaign_contacts (links campaign to contacts)
      └── messages (individual messages in sequence)
          ├── sequence_step (1, 2, 3...)
          ├── campaign_contact_id (tracks progress)
          └── scheduled_at (when to send)
```

**Use Cases:**
- Email sequences (follow-up 1, 2, 3...)
- LinkedIn DM sequences
- Multi-touch campaigns
- A/B testing different sequences

**Features:**
- ✅ Multi-step sequences (`sequence_step`)
- ✅ Tracks progress per contact (`campaign_contact_id`)
- ✅ Links to accounts, contacts, campaigns
- ✅ Full tracking (opened, clicked, replied)

---

### 2. **`networking_outreach` Table** - For Networking Campaigns

**Purpose:** One-off personalized messages to LinkedIn connections

**Architecture:**
```
networking_campaign_batches
  └── networking_outreach (one message per connection)
      ├── connection_id → linkedin_connections
      ├── personalized_message (custom per person)
      ├── scheduled_at (when to send)
      └── message_id → linkedin_messages (after sent)
```

**Use Cases:**
- Holiday greetings to connections
- Re-engagement with network
- One-time personalized outreach
- Relationship building

**Features:**
- ✅ Simple structure (one message per connection)
- ✅ Links directly to LinkedIn connections
- ✅ Personalized messages (not templates)
- ✅ Tracks replies and sentiment

---

## Why Two Tables?

### **Different Data Models:**
- **Cold Outreach:** Needs sequences, steps, templates
- **Networking:** Needs personalization, connection context

### **Different Workflows:**
- **Cold Outreach:** Contact → Sequence → Multiple Messages
- **Networking:** Connection → One Message → Done

### **Different Tracking:**
- **Cold Outreach:** Campaign metrics, sequence performance
- **Networking:** Connection relationship, reply sentiment

---

## Message Spacing & Rate Limiting

### **How Spacing Works:**

1. **Cron Frequency:** Runs every 5 minutes
2. **Per-Run Limit:** Only processes 1 message per run
3. **Last-Sent Check:** Ensures minimum 5 minutes between sends
4. **Result:** Messages spaced 5-10 minutes apart automatically

### **Spacing Logic:**

```javascript
// In process-message-queue.js
- Check last sent message time
- If < 5 minutes ago → Skip this run
- If >= 5 minutes ago → Send 1 message
- Next cron run (5 min later) → Send next message
```

### **Example Timeline:**

```
Time    | Action
--------|------------------
00:00   | Cron runs → Send message 1
00:05   | Cron runs → Send message 2
00:10   | Cron runs → Send message 3
00:15   | Cron runs → Send message 4
00:20   | Cron runs → Send message 5
```

---

## Going Forward: Recommendations

### ✅ **Keep Both Tables** (Recommended)

**Pros:**
- Clear separation of concerns
- Different schemas for different needs
- Easier to optimize each table
- Better data modeling

**Cons:**
- Two code paths to maintain
- Need to query both tables

### ❌ **Consolidate to One Table** (Not Recommended)

**Pros:**
- Single code path
- One query for all messages

**Cons:**
- Complex schema (many nullable fields)
- Harder to optimize
- Mixing different data models
- More complex queries

---

## Current Implementation

### **Cron Job:** `process-message-queue.js`
- Runs every 5 minutes
- Checks both tables:
  1. `networking_outreach` (with spacing check)
  2. `messages` (with spacing check)
- Processes 1 message per table per run
- Sends notifications via Resend

### **Continuous Worker:** `campaign-worker.js`
- Runs continuously (for high-volume campaigns)
- Checks `networking_outreach` only
- Respects business hours, rate limits
- Better for campaigns needing faster sending

---

## Which Table Should You Use?

### Use `messages` table when:
- ✅ Multi-step sequences
- ✅ Cold outreach campaigns
- ✅ Need to track sequence progress
- ✅ Template-based messages
- ✅ Campaigns linked to offers

### Use `networking_outreach` table when:
- ✅ One-off messages
- ✅ Networking/re-engagement
- ✅ Personalized messages (not templates)
- ✅ Direct connection outreach
- ✅ Simple relationship building

---

## Migration Path (If Needed)

If you want to consolidate in the future:

1. **Add campaign_type to messages table**
2. **Make networking fields nullable**
3. **Migrate networking_outreach → messages**
4. **Update all queries**

**But this is NOT recommended** - current architecture is cleaner!

---

## Summary

- ✅ **Two tables is correct** - they serve different purposes
- ✅ **Spacing is handled** - 5-10 minutes between messages
- ✅ **Cron processes 1 per run** - automatic spacing
- ✅ **Both tables supported** - unified sending logic

**Recommendation:** Keep the current architecture. It's well-designed for your use cases!

