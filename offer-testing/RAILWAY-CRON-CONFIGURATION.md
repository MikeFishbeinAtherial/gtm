# Railway Cron Configuration Guide

## ⚠️ Important: Build Command vs Cron Command

**"Custom Build Command" is NOT what you need!**

- **Build Command** = Runs during **build time** (when Railway builds your Docker image)
- **Cron Command** = Runs during **runtime** (when the cron schedule triggers)

These are **two completely different things**.

---

## Where to Configure Cron Command

### Railway Dashboard (Required - No CLI Support)

Railway CLI **does NOT support** configuring cron commands. You **must** use the Railway Dashboard.

### Steps:

1. **Go to Railway Dashboard:**
   - https://railway.app → Your Project → `gtm-app` service

2. **Navigate to Settings:**
   - Click **"Settings"** tab (not "Builds" or "Deployments")

3. **Find Cron Schedule Section:**
   - Scroll to **"Cron Schedule"** section
   - You should see:
     - ✅ Schedule: `*/5 * * * *` (already set)
     - ❓ **Command:** (THIS IS WHAT YOU NEED TO SET!)

4. **Set the Cron Command:**
   - Look for a field labeled **"Command"**, **"Cron Command"**, or **"Run Command"**
   - Set it to: `cd offer-testing && node scripts/process-message-queue.js`
   - OR: `cd offer-testing && npm run cron:process-messages`

5. **Save/Apply Changes**

---

## What Each Command Does

### Build Command (NOT what you need)
- **Location:** Settings → Builds → Custom Build Command
- **When:** Runs during Docker image build
- **Purpose:** Compile/build your code
- **Example:** `npm run build`

### Cron Command (WHAT YOU NEED)
- **Location:** Settings → Cron Schedule → Command
- **When:** Runs every 5 minutes (based on schedule)
- **Purpose:** Execute your script
- **Example:** `cd offer-testing && node scripts/process-message-queue.js`

---

## Critical Requirements for Railway Cron Jobs

### ✅ Script Must Exit After Completion

Railway cron jobs **MUST exit** when done. If your script stays running, Railway will skip subsequent cron runs.

**Our script already does this correctly:**
- Script runs once
- Processes messages
- Exits with `process.exit(0)` or `process.exit(1)`

### ✅ Script Must Be Executable

Make sure the script has proper permissions:
```bash
chmod +x scripts/process-message-queue.js
```

### ✅ Working Directory

Railway runs from the **project root**, so you need:
- `cd offer-testing && node scripts/process-message-queue.js`
- OR: `node offer-testing/scripts/process-message-queue.js`

---

## Verification Steps

### 1. Check Current Configuration

In Railway Dashboard → Settings → Cron Schedule:
- [ ] Schedule is set: `*/5 * * * *`
- [ ] Command is set: `cd offer-testing && node scripts/process-message-queue.js`
- [ ] Service is running

### 2. Test Manually

1. Go to Railway Dashboard → Cron Runs
2. Click **"Run now"** button
3. Immediately check **Logs** tab
4. You should see:
   ```
   🚀 Message Queue Processor Starting...
   🔧 Environment check:
      UNIPILE_DSN: SET
      ...
   ```

### 3. Expected Log Output

When working correctly:
```
🚀 Message Queue Processor Starting...
⏰ Current time: 2025-12-28T23:00:00.000Z
🔧 Environment check:
   UNIPILE_DSN: SET
   UNIPILE_API_KEY: SET
   SUPABASE_URL: SET
   SUPABASE_SERVICE_KEY: SET
   RESEND_API_KEY: SET
   NOTIFICATION_EMAIL: your@email.com
🔍 Checking for due messages...
🔍 Checking for due networking messages...
📤 Found 1 due networking message(s)
📝 Message ID: dd899549-c767-41f3-bf3e-f11ac565dd54
👤 Processing message for: Conrad
🔗 LinkedIn ID: ACoAAAGnPIIB1Zgd4l2t6m18vXf1ESU5vYgbOfI
📤 Sending message via Unipile API...
✅ Networking message sent to Conrad
✅ Processing complete
```

### 4. If You See This Instead:

```
▲ Next.js 14.2.35
Starting Container
```

**Problem:** Cron is running `npm start` (Next.js) instead of your script!
**Solution:** Update the Cron Command in Settings.

---

## Troubleshooting

### Cron Not Running?

1. **Check Service Status:**
   - Service must be **Running** (not paused/stopped)

2. **Check Schedule:**
   - Must be valid cron expression: `*/5 * * * *`

3. **Check Command:**
   - Must be absolute path or relative from project root
   - Must point to your script, not `npm start`

4. **Check Logs:**
   - Look for error messages
   - Check if script is even starting

### Script Runs But No Messages Sent?

1. **Check Environment Variables:**
   - All required vars must be set in Railway

2. **Check Database:**
   - Messages must have `scheduled_at <= NOW()`
   - Messages must have `status = 'pending'`

3. **Check Unipile:**
   - Account must be connected
   - API keys must be valid

---

## Summary

- ❌ **NOT:** Custom Build Command (that's for builds)
- ✅ **YES:** Cron Schedule → Command (in Settings tab)
- ❌ **NOT:** Railway CLI (no CLI support for cron config)
- ✅ **YES:** Railway Dashboard (only way to configure)

**Action Required:**
1. Go to Railway Dashboard → Settings → Cron Schedule
2. Find "Command" field
3. Set to: `cd offer-testing && node scripts/process-message-queue.js`
4. Save and test with "Run now"

