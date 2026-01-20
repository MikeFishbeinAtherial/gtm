# Script Errors & Solutions

## Error: `getaddrinfo ENOTFOUND api.exa.ai`

### What Happened
The contact discovery script failed with a DNS resolution error when trying to connect to Exa API.

**Error message:**
```
Error: getaddrinfo ENOTFOUND api.exa.ai
```

### Why It Happens
1. **Temporary DNS issue** - Your local DNS can't resolve `api.exa.ai`
2. **Network connectivity** - Internet connection issue
3. **API downtime** - Exa API temporarily unavailable
4. **Local firewall/VPN** - Blocking API access

### Solutions

#### Option 1: Retry (Simplest)
Often it's just a temporary network issue. Wait a few minutes and retry:

```bash
npx ts-node scripts/enrich-finance-companies.ts --limit 152 --max-per-company 2
```

#### Option 2: Check Network
```bash
# Test if you can reach Exa API
curl -I https://api.exa.ai

# Check DNS resolution
nslookup api.exa.ai
```

#### Option 3: Run via Railway (If Local Network Issues Persist)
If local network issues persist, Railway might have better connectivity:

1. **Deploy script to Railway:**
   - Create a Railway project
   - Add environment variables (EXA_API_KEY, FULLENRICH_API_KEY, etc.)
   - Run script as a one-off job

2. **Or use Railway CLI:**
   ```bash
   railway run npx ts-node scripts/enrich-finance-companies.ts --limit 152
   ```

**Note:** Railway is good for long-running scripts that might timeout locally.

#### Option 4: Add Retry Logic
Modify the script to retry on network errors (future improvement).

---

## Script Timeout Issues

### Why Scripts Timeout
1. **FullEnrich is async** - Takes 30-90 seconds per contact
2. **Polling waits** - Script waits for each enrichment to complete
3. **Many contacts** - Processing 100+ contacts can take hours

### Solutions

#### Option 1: Run in Smaller Batches
```bash
# Process 25 companies at a time
npx ts-node scripts/enrich-finance-companies.ts --limit 25 --max-per-company 2
```

#### Option 2: Skip Email Enrichment (Find Contacts Only)
```bash
# Find contacts but skip emails (faster)
npx ts-node scripts/enrich-finance-companies.ts --limit 50 --skip-email true
```

Then enrich emails separately:
```bash
npx ts-node scripts/enrich-finance-companies.ts --enrich-existing true
```

#### Option 3: Use Railway for Long-Running Scripts
Railway won't timeout like local terminals:
- Better for scripts that run >30 minutes
- More reliable network connectivity
- Can run in background

---

## Current Status & Next Steps

### ✅ Progress Made
- **226 total contacts** (up from 157)
- **157 contacts with email** (up from 103)
- **179 companies have contacts** (up from 157)
- **152 companies still need contacts**

### ⏭️ Next Steps

#### 1. Continue Contact Discovery (152 companies remaining)

**If network is working:**
```bash
npx ts-node scripts/enrich-finance-companies.ts --limit 152 --max-per-company 2 --only-fit true
```

**If network issues persist:**
- Try Railway (better connectivity)
- Or run in smaller batches (25 at a time)

#### 2. Get Emails for Existing Contacts (69 contacts)

The email enrichment script is running now. It will:
- Find contacts without emails
- Bulk-enrich up to 100 contacts (FullEnrich limit)
- Wait for async results (30-90 seconds per batch)

**Command:**
```bash
npx ts-node scripts/enrich-finance-companies.ts --enrich-existing true --skip-classify true
```

**Note:** This can take 10-30 minutes because FullEnrich is async.

#### 3. Check Progress
```bash
npx ts-node scripts/check-contact-metrics.ts
```

---

## Recommendation: Railway for Long-Running Scripts

**When to use Railway:**
- ✅ Scripts that run >30 minutes
- ✅ Network connectivity issues locally
- ✅ Need to run scripts in background
- ✅ Want better reliability

**How to set up:**
1. Create Railway project
2. Add environment variables
3. Run script as one-off job or scheduled task

**Example Railway command:**
```bash
railway run npx ts-node scripts/enrich-finance-companies.ts --limit 152
```

---

## Summary

- ✅ **Script made progress** - 69 new contacts found before error
- ⚠️ **Network error** - DNS resolution failed for Exa API
- ✅ **Email enrichment running** - Processing 69 contacts without emails
- ⏭️ **Next:** Continue contact discovery (152 companies remaining)

**For now:** Let the email enrichment finish, then decide if you want to:
1. Retry contact discovery locally (if network is working)
2. Use Railway for better reliability
3. Run in smaller batches to avoid timeouts
