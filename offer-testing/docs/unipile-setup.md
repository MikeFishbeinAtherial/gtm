# Unipile Setup Guide

## Problem We're Solving

The URL `https://1api24.unipile.com:15421/api/v1` provided by Unipile is not resolving. This is a common issue with custom DSN endpoints.

## Solution Steps

### Step 1: Check Your Unipile Dashboard

1. Go to your Unipile dashboard: https://dashboard.unipile.com
2. Look for your **DSN** or **API Endpoint** - it should be listed on the main page or in settings
3. The DSN format could be:
   - A custom subdomain: `https://XXXXX.unipile.com:PORT/api/v1`
   - A direct IP: `https://IP.ADDRESS:PORT/api/v1`
   - Or a different format entirely

### Step 2: Test With curl

Once you have the correct DSN, test it with curl:

```bash
curl --request GET \
  --url YOUR_DSN/accounts \
  --header 'X-API-KEY: 2HdAnLfuG.8z5MjY+YB9oo3jxLmwpWbHTcvsJ6anI4dQj2uDG3XKo=' \
  --header 'accept: application/json'
```

If this works, you'll see a JSON response with your connected accounts.

### Step 3: Create .env.local File

Create a file called `.env.local` in the `offer-testing` directory:

```bash
# Unipile Configuration
UNIPILE_API_KEY=2HdAnLfuG.8z5MjY+YB9oo3jxLmwpWbHTcvsJ6anI4dQj2uDG3XKo=
UNIPILE_DSN=<YOUR_CORRECT_DSN_HERE>
```

## Alternative Approaches

### Option A: Try the API Gateway

Some Unipile plans use a central API gateway instead of custom DSNs:

```bash
curl --request GET \
  --url https://api.unipile.com/v1/accounts \
  --header 'X-API-KEY: 2HdAnLfuG.8z5MjY+YB9oo3jxLmwpWbHTcvsJ6anI4dQj2uDG3XKo=' \
  --header 'accept: application/json'
```

### Option B: Contact Unipile Support

If the DSN still doesn't work:
1. Email support@unipile.com or use the chat in their dashboard
2. Tell them: "My DSN `https://1api24.unipile.com:15421` is not resolving. Can you provide the correct API endpoint?"
3. Ask if you need to allowlist any IPs or if there are firewall rules

## What's Next After You Get It Working

Once you can successfully call the Unipile API:

1. **Pull your connections**: We'll fetch all your 1st-degree LinkedIn connections
2. **Pull your messages**: We'll fetch your conversation history
3. **Store in Supabase**: We'll create tables to store this data
4. **Build the networking campaign**: We'll help you identify who to reach out to

## Quick Test Script

Once you have the correct DSN, run this:

```bash
cd /Users/mikefishbein/Desktop/Vibe\ Coding/gtm/offer-testing
node scripts/test-unipile-simple.js
```

Update the DSN in that script first (line 6).

