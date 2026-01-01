# Notification Digest Tables - Explained

## 📊 **Tables Overview**

Here are the Supabase tables used for the email digest system:

---

## 1. **`notification_digest_queue`** ✅ **ACTIVE - Currently Used**

**Purpose:** Temporary storage for notifications that will be batched into digest emails

**What it stores:**
- Individual notifications about messages sent/failed
- Each row = one notification event
- Notifications accumulate here until digest is sent

**Key Columns:**
- `notification_type`: Type of notification (`networking_success`, `networking_failed`, `message_success`, `message_failed`, `unipile_error`)
- `contact_name`: Name of person who received the message
- `contact_linkedin_url`: Their LinkedIn profile URL
- `message_content`: The actual message text that was sent
- `sent_at`: When the message was actually sent
- `result`: `SUCCESS` or `FAILED`
- `error_message`: Error details if it failed
- `created_at`: When this notification was added to queue

**How it works:**
1. Message sent → Notification added to this queue
2. Notification stays here (no email sent yet)
3. After 6 hours → All notifications in queue are batched into digest email
4. Queue is cleared after digest is sent

**Example Data:**
```
id: abc-123
notification_type: networking_success
contact_name: Tommi
contact_linkedin_url: https://linkedin.com/in/forssto
message_content: "Hi Tommi, great to connect..."
sent_at: 2026-01-01 13:06:37
result: SUCCESS
created_at: 2026-01-01 13:06:37
```

---

## 2. **`notification_digest_metadata`** ✅ **ACTIVE - Currently Used**

**Purpose:** Tracks when the last digest email was sent (scheduling)

**What it stores:**
- When the last digest was sent
- How often to send digests (currently 6 hours)
- Single row with ID: `00000000-0000-0000-0000-000000000001`

**Key Columns:**
- `last_digest_sent_at`: Timestamp of last digest email sent
- `digest_interval_hours`: How many hours between digests (default: 6)
- `updated_at`: When this record was last updated

**How it works:**
1. Every cron run checks: "Has 6 hours passed since `last_digest_sent_at`?"
2. If YES → Send digest email, update `last_digest_sent_at` to now
3. If NO → Skip, wait for next cron run

**Example Data:**
```
id: 00000000-0000-0000-0000-000000000001
last_digest_sent_at: 2026-01-01 13:06:38
digest_interval_hours: 6
updated_at: 2026-01-01 13:06:38
```

---

## 3. **`notification_queue`** ⚠️ **EXISTS BUT NOT USED**

**Purpose:** This table exists in your database but is **NOT currently being used** by the code

**Why it exists:**
- Likely created during earlier development/testing
- Has similar structure to `notification_digest_queue`
- Can be ignored or deleted if you want to clean up

**Difference from `notification_digest_queue`:**
- `notification_queue` has `status` column (`pending`/`sent`)
- `notification_digest_queue` doesn't have status (it's cleared after digest)
- `notification_queue` has `message_preview` instead of `message_content`
- `notification_queue` has `metadata` JSONB column

**Recommendation:** You can safely ignore this table or delete it if you want to clean up unused tables.

---

## 🔄 **How They Work Together**

### **Flow Diagram:**

```
Message Sent
    ↓
Add to notification_digest_queue
    ↓
(Notification waits in queue)
    ↓
Every 5 minutes: Check notification_digest_metadata
    ↓
Has 6 hours passed since last_digest_sent_at?
    ↓
YES → Send digest email with all notifications
    ↓
Clear notification_digest_queue
    ↓
Update notification_digest_metadata.last_digest_sent_at
```

### **Example Timeline:**

**8:00 AM:** Message sent → Added to `notification_digest_queue` (1 notification)
**8:05 AM:** Message sent → Added to `notification_digest_queue` (2 notifications)
**8:10 AM:** Message sent → Added to `notification_digest_queue` (3 notifications)
**...**
**2:00 PM:** 6 hours passed → Check `notification_digest_metadata`
- `last_digest_sent_at` = 8:00 AM
- 6 hours have passed ✅
- Send digest email with all 3 notifications
- Clear `notification_digest_queue`
- Update `notification_digest_metadata.last_digest_sent_at` = 2:00 PM

---

## 📋 **Summary Table**

| Table Name | Status | Purpose | Key Info |
|------------|--------|---------|----------|
| `notification_digest_queue` | ✅ **ACTIVE** | Stores notifications waiting to be batched | Cleared after each digest |
| `notification_digest_metadata` | ✅ **ACTIVE** | Tracks digest schedule | Single row, tracks timing |
| `notification_queue` | ⚠️ **UNUSED** | Old table, not used by current code | Can be ignored/deleted |

---

## 🎯 **Key Points**

1. **`notification_digest_queue`**: This is where notifications accumulate
2. **`notification_digest_metadata`**: This controls when digests are sent
3. **`notification_queue`**: Old table, not used - can ignore

**The system uses only 2 tables:**
- Queue table (stores notifications)
- Metadata table (tracks schedule)

That's it! Simple and efficient. 🚀

