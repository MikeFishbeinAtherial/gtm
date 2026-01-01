# Email Digest System - How It Works

## 🎯 **Problem Solved**

**Before:** You received an email notification for EVERY message sent (too many emails!)

**After:** You receive ONE digest email every 6 hours with all notifications batched together.

---

## 📧 **How Resend Notifications Work**

### **Previous System (Immediate Emails):**

```
Message Sent → Send Email Immediately → You get email
Message Sent → Send Email Immediately → You get email
Message Sent → Send Email Immediately → You get email
```

**Result:** If you send 10 messages, you get 10 emails! 📧📧📧📧📧📧📧📧📧📧

### **New System (Digest Emails):**

```
Message Sent → Add to Queue → (no email yet)
Message Sent → Add to Queue → (no email yet)
Message Sent → Add to Queue → (no email yet)
...
6 Hours Pass → Send Digest Email → You get ONE email with all notifications
```

**Result:** If you send 10 messages, you get 1 digest email! 📧

---

## 🔧 **How It Works Technically**

### **Step 1: Messages Are Queued**

When a message is sent (or fails), instead of sending an email immediately:

1. **Notification is stored** in Supabase `notification_digest_queue` table
2. **No email is sent** (yet)
3. **Log shows:** `📝 Added success notification to digest queue`

### **Step 2: Digest Check (Every Cron Run)**

Every 5 minutes when the cron runs:

1. **Checks:** Has 6 hours passed since last digest?
2. **If NO:** Logs when next digest will be sent
3. **If YES:** Sends digest email with all queued notifications

### **Step 3: Digest Email Sent**

When it's time to send:

1. **Fetches** all notifications from queue
2. **Groups** them by type (success, failed, errors)
3. **Creates** one digest email with summary
4. **Sends** the email
5. **Clears** the queue
6. **Updates** last digest sent time

---

## 📊 **What You'll See in Logs**

### **When Messages Are Sent:**

```
📝 Added success notification to digest queue
📝 Added failure notification to digest queue
📭 Digest email will be sent at: 2025-12-29T14:00:00.000Z
```

### **When Digest Is Sent:**

```
📧 Time to send digest email...
✅ Digest email sent with 5 notifications
```

---

## 📧 **Digest Email Format**

You'll receive emails like this:

```
📊 Message Digest Report
⏰ Period: Last 6 hours
📅 Generated: 2025-12-29T14:00:00.000Z

📈 Summary:
• Total notifications: 5
• ✅ Successful sends: 4
• ❌ Failed sends: 1
• ⚠️  Errors: 0

✅ Networking Messages Sent (3):
────────────────────────────────────────────────────────────
1. John Doe
   Sent: 12/29/2025, 8:05:47 AM
   LinkedIn: https://linkedin.com/in/johndoe

2. Jane Smith
   Sent: 12/29/2025, 8:10:23 AM
   LinkedIn: https://linkedin.com/in/janesmith

❌ Networking Messages Failed (1):
────────────────────────────────────────────────────────────
1. Bob Johnson
   Error: Connection not found
   LinkedIn: https://linkedin.com/in/bobjohnson

────────────────────────────────────────────────────────────
This is a digest email sent every 6 hours.
Individual notifications are batched to reduce email volume.
```

---

## ⚙️ **Configuration**

### **Digest Interval:**

Currently set to **6 hours**. To change:

1. Update `digest_interval_hours` in `notification_digest_metadata` table
2. Or modify the code: `digest_interval_hours: 6`

### **What Gets Queued:**

- ✅ Networking messages sent successfully
- ❌ Networking messages that failed
- ✅ Regular messages sent successfully
- ❌ Regular messages that failed
- ⚠️ Unipile connection errors

---

## 🎯 **Benefits**

1. **Fewer Emails:** 1 email every 6 hours instead of 1 per message
2. **Better Overview:** See all activity in one place
3. **Less Noise:** Important errors still included, but batched
4. **Same Information:** You still see everything, just organized

---

## 📋 **Example Timeline**

**8:00 AM:** Message sent → Added to queue (no email)
**8:05 AM:** Message sent → Added to queue (no email)
**8:10 AM:** Message sent → Added to queue (no email)
**...**
**2:00 PM:** 6 hours passed → **Digest email sent** with all 3 messages ✅

---

## 🔍 **How to Verify It's Working**

### **Check Logs:**

Look for these messages in Railway logs:

✅ **Good Signs:**
- `📝 Added success notification to digest queue`
- `📭 Digest email will be sent at: [time]`
- `✅ Digest email sent with X notifications`

❌ **Bad Signs:**
- No "Added to digest queue" messages
- Still getting individual emails for each message

### **Check Your Email:**

- ✅ You should receive **1 digest email every 6 hours**
- ✅ Digest contains **all notifications** from the period
- ❌ You should **NOT** receive individual emails for each message

---

## 🆘 **Troubleshooting**

### **Problem: Still getting individual emails**

**Solution:** Check that the code changes were deployed. Old code sends immediately, new code queues.

### **Problem: Not receiving digest emails**

**Solution:** 
1. Check `RESEND_API_KEY` and `NOTIFICATION_EMAIL` are set
2. Check Railway logs for digest sending
3. Verify notifications are being queued (`📝 Added to digest queue`)

### **Problem: Want to change digest interval**

**Solution:** Update `digest_interval_hours` in Supabase `notification_digest_metadata` table.

---

## 📝 **Summary**

**Before:** 1 email per message = Too many emails! 📧📧📧

**After:** 1 digest email every 6 hours = Perfect! 📧

**How:** Notifications are queued in Supabase, then batched into digest emails every 6 hours.

