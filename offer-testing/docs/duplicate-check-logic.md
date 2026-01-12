# Duplicate Check Logic - How It Works

**Last Updated:** January 12, 2026  
**Purpose:** Explain how duplicate prevention works and what it checks

---

## 🎯 What Gets Checked

The duplicate check looks for messages in the `networking_outreach` table that:
- Have `status = 'sent'` (successfully sent)
- Have `sent_at IS NOT NULL` (has a timestamp)
- Match the same LinkedIn ID

---

## 📋 Two-Level Check

### **Level 1: Same Campaign Check**
**Purpose:** Prevent sending the same message twice in the same campaign

**What it checks:**
- Has a message already been sent in **THIS campaign** (`batch_id` matches)?
- If yes → **BLOCK** (skip with reason "Duplicate: Already sent in this campaign")

**Example:**
- Campaign: "Atherial AI Roleplay Training - 2025 Q1"
- If we already sent to Matthew Kay in this campaign → Block sending again

---

### **Level 2: Cross-Campaign Check**
**Purpose:** Prevent sending messages across multiple campaigns (don't spam)

**What it checks:**
- Has a message been sent in **ANY OTHER campaign** (`batch_id` different)?
- If yes → **BLOCK** (skip with reason "Cross-campaign: Already sent in [Campaign Name]")

**Example:**
- Campaign 1: "Holiday Greetings 2024" → Sent to Matthew Kay ✅
- Campaign 2: "Atherial AI Roleplay Training - 2025 Q1" → Tries to send to Matthew Kay
- Result: **BLOCKED** (already sent in "Holiday Greetings 2024")

---

## ❓ What About Manual Messages?

**Manual messages are NOT tracked** in `networking_outreach`, so they **won't block** sending.

**What this means:**
- ✅ If you manually messaged someone 6 months ago → **Still allowed** to send campaign message
- ✅ Manual messages don't interfere with campaigns
- ❌ Campaign messages DO block other campaigns (cross-campaign prevention)

---

## 📊 "Sent" Definition

A message is considered "sent" if:
1. `status = 'sent'` (in database)
2. `sent_at IS NOT NULL` (has a timestamp)

**What this means:**
- ✅ Successfully sent via Unipile API → `status = 'sent'`, `sent_at = timestamp`
- ❌ Failed to send → `status = 'failed'`, `sent_at = NULL` → **Doesn't block**
- ❌ Pending → `status = 'pending'`, `sent_at = NULL` → **Doesn't block**
- ❌ Skipped → `status = 'skipped'`, `sent_at = NULL` → **Doesn't block**

---

## 🔍 Examples

### Example 1: Same Campaign Duplicate
```
Campaign: "Atherial AI Roleplay Training - 2025 Q1"
Matthew Kay: Already sent message (status='sent', sent_at='2026-01-12 10:00:00')
Result: BLOCKED - "Duplicate: Already sent in this campaign"
```

### Example 2: Cross-Campaign
```
Campaign 1: "Holiday Greetings 2024"
Matthew Kay: Sent message (status='sent', sent_at='2024-12-20 10:00:00')

Campaign 2: "Atherial AI Roleplay Training - 2025 Q1"
Matthew Kay: Tries to send
Result: BLOCKED - "Cross-campaign: Already sent in 'Holiday Greetings 2024'"
```

### Example 3: Manual Message (Not Blocked)
```
Manual: You manually messaged Matthew Kay 6 months ago (not in networking_outreach)
Campaign: "Atherial AI Roleplay Training - 2025 Q1"
Matthew Kay: Tries to send
Result: ALLOWED - Manual messages don't block campaigns
```

### Example 4: Failed Message (Not Blocked)
```
Campaign: "Atherial AI Roleplay Training - 2025 Q1"
Matthew Kay: Previous attempt failed (status='failed', sent_at=NULL)
Matthew Kay: Tries to send again
Result: ALLOWED - Failed messages don't block retries
```

---

## 🛡️ Protection Summary

| Scenario | Blocks? | Reason |
|----------|---------|--------|
| Already sent in **same campaign** | ✅ YES | Duplicate in same campaign |
| Already sent in **different campaign** | ✅ YES | Cross-campaign prevention |
| Manually messaged (not in DB) | ❌ NO | Manual messages not tracked |
| Failed message (status='failed') | ❌ NO | Only 'sent' messages block |
| Pending message (not sent yet) | ❌ NO | Only 'sent' messages block |

---

## 🔧 Code Location

**Files:**
- `scripts/campaign-worker.js` (lines 330-400)
- `scripts/process-message-queue.js` (lines 333-400)

**Both scripts now:**
1. Check for same-campaign duplicates first
2. Check for cross-campaign duplicates second
3. Only block if `status = 'sent'` AND `sent_at IS NOT NULL`

---

## 💡 Why This Logic?

**Your Requirements:**
1. ✅ Don't send twice in same campaign (duplicate prevention)
2. ✅ Don't send across multiple campaigns (avoid spamming)
3. ✅ Allow sending even if manually messaged before (manual not tracked)

**This logic matches all your requirements!**
