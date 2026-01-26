# Railway Email Sending Fix

## Problem

Emails are failing with error: `"account_id": "Required property"`

This means the `account_id` field is not reaching Unipile's API.

## Root Cause

Railway is either:
1. Running old code without the fallback to `UNIPILE_EMAIL_ACCOUNT_ID`
2. Missing the `UNIPILE_EMAIL_ACCOUNT_ID` environment variable

## Solution

### Step 1: Verify Railway Environment Variables

Go to Railway dashboard → Your Service → Variables tab

**Required Variables:**
```
UNIPILE_EMAIL_ACCOUNT_ID=0pKp3VL5TGSAMQpg-eNC7A
UNIPILE_LINKEDIN_ACCOUNT_ID=eSaTTfPuRx6t131-4hjfSg
UNIPILE_DSN=https://api4.unipile.com:13425/api/v1
UNIPILE_API_KEY=<your-key>
```

### Step 2: Deploy Updated Code

The code has been updated with:
- Fallback to `UNIPILE_EMAIL_ACCOUNT_ID` if account relation is missing
- Debug logging to show which account ID is being used
- Better error messages

**To deploy:**
1. Push code to git (if using git deploy)
2. Or trigger a redeploy in Railway dashboard
3. Wait for deployment to complete

### Step 3: Verify It's Working

Check Railway logs:
```bash
railway login
railway logs --tail 100
```

**Look for:**
- ✅ `📧 sendEmailMessage called:` - Code is running
- ✅ `⚠️ Account relation missing, using UNIPILE_EMAIL_ACCOUNT_ID from env` - Fallback working
- ✅ `📤 Sending email via Unipile: account_id: 0pKp3VL5TGSAMQpg-eNC7A` - Account ID is set
- ❌ `account_id missing` errors - Means env var not set or old code running

### Step 4: Test Email Sending

After deployment, check the send_queue:
```bash
npx ts-node scripts/check-email-sending-status.ts
```

Should see:
- Pending items being processed
- Successful sends (status = 'sent')
- No more "account_id missing" errors

## Code Changes Made

1. **`sendEmailMessage()` function:**
   - Added fallback to `process.env.UNIPILE_EMAIL_ACCOUNT_ID`
   - Added debug logging
   - Ensures accountId is a string before sending

2. **`sendLinkedInMessage()` function:**
   - Added fallback to `process.env.UNIPILE_LINKEDIN_ACCOUNT_ID`
   - Same improvements as email function

3. **`processNetworkingMessages()` function:**
   - Prefers `UNIPILE_LINKEDIN_ACCOUNT_ID` from env
   - Falls back to API fetch if not set

## Verification

Local test confirms FormData works correctly:
```bash
npx ts-node scripts/test-formdata-debug.ts
# ✅ Email sent successfully!
```

The issue is Railway-specific, not code-specific.
