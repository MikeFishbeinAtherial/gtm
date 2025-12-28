# Railway Cron Setup Guide

## ⚠️ CRITICAL ISSUE FOUND

Your Railway cron is configured, but it's likely running the **WRONG COMMAND**.

## Current Configuration

### What Railway Shows:
- ✅ Cron Schedule: `*/5 * * * *` (every 5 minutes UTC)
- ✅ Service is running
- ❓ **Unknown:** What command is the cron actually running?

### The Problem:

Railway cron jobs need to be configured with a **specific command** to run. Based on your configuration files:

1. **`railway.toml`** shows: `startCommand = "cd offer-testing && npm start"`
   - This runs **Next.js** (not your script!)

2. **`railway.json`** shows: `startCommand = "npm start"`
   - This also runs **Next.js** (not your script!)

3. **The cron needs to run:** `node scripts/process-message-queue.js`
   - But this might not be configured!

## How to Fix

### Option 1: Configure Cron Command in Railway Dashboard (Recommended)

1. Go to Railway Dashboard → Your Service (`gtm-app`) → **Settings**
2. Find **"Cron Schedule"** section
3. Look for **"Command"** or **"Cron Command"** field
4. Set it to: `cd offer-testing && node scripts/process-message-queue.js`
   - OR if Railway runs from project root: `node offer-testing/scripts/process-message-queue.js`

### Option 2: Add Script to package.json

Add this to `package.json`:

```json
{
  "scripts": {
    "cron:process-messages": "node scripts/process-message-queue.js"
  }
}
```

Then configure Railway cron to run: `npm run cron:process-messages`

### Option 3: Create a Wrapper Script

Create `offer-testing/scripts/railway-cron.sh`:

```bash
#!/bin/bash
cd "$(dirname "$0")/.."
node scripts/process-message-queue.js
```

Make it executable and configure Railway to run: `./offer-testing/scripts/railway-cron.sh`

## Verification Steps

After fixing, verify:

1. **Check Railway Logs:**
   - Look for: `🚀 Message Queue Processor Starting...`
   - Should appear every 5 minutes

2. **Check for Errors:**
   - Look for: `❌` error messages
   - Check environment variables are set

3. **Test Manually:**
   - In Railway Dashboard → Cron Runs → Click "Run now"
   - Check logs immediately after

## Expected Log Output

When working correctly, you should see:

```
🚀 Message Queue Processor Starting...
⏰ Current time: 2025-12-28T22:45:00.000Z
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
📤 Sending message via Unipile API...
✅ Networking message sent to...
```

## Current Status

- ❌ **Cron command likely wrong** (running Next.js instead of script)
- ✅ **Cron schedule correct** (every 5 minutes)
- ✅ **Script is ready** (with all fixes applied)
- ❌ **Messages not processing** (because wrong command)

## Next Steps

1. **Check Railway Dashboard** → Settings → Cron Schedule → Command field
2. **Update command** to: `node offer-testing/scripts/process-message-queue.js`
3. **Test immediately** using "Run now" button
4. **Monitor logs** for the expected output

