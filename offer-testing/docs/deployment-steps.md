# Deployment Steps - Quick Reference

## 1. Push to GitHub

```bash
cd /Users/mikefishbein/Desktop/Vibe\ Coding/gtm
git add .
git commit -m "Add variant 5, do_not_message table, update digest timing"
git push origin main
```

## 2. Railway Deployment

Railway will automatically deploy when you push to GitHub.

**Check:**
- Railway Dashboard → Deployments
- Wait for deployment to complete
- Check logs for errors

## 3. Configure Cron Job (IMPORTANT!)

**Railway Dashboard → Settings → Cron Schedule:**

1. **Schedule:** `*/5 * * * *` (every 5 minutes)
2. **Command:** 
   ```
   cd offer-testing && node scripts/process-message-queue.js
   ```

**Test:**
- Click "Run now" button
- Check logs immediately
- Should see script output

## 4. Verify Everything Works

### Check Messages Are Ready
```sql
SELECT COUNT(*) 
FROM networking_outreach 
WHERE status = 'pending'
AND batch_id = (SELECT id FROM networking_campaign_batches WHERE slug = 'atherial-ai-roleplay-2025-q1');
-- Should be 971
```

### Check Variant 5
```sql
SELECT COUNT(*) 
FROM networking_outreach 
WHERE personalization_notes LIKE 'Variant 5%';
-- Should be ~200
```

### Check Excluded People
```sql
SELECT COUNT(*) 
FROM do_not_message;
-- Should be 26
```

## 5. Monitor

- **First message:** Should send within 1 minute of cron running
- **Digest emails:** Will arrive at 7am, noon, 4pm, 7pm ET
- **Check logs:** Railway Dashboard → Logs tab

## Troubleshooting

**Cron not running?**
- Check Railway Settings → Cron Schedule → Command is set correctly
- Command must be: `cd offer-testing && node scripts/process-message-queue.js`

**Messages not sending?**
- Check `scheduled_at <= NOW()` in database
- Check Unipile account is connected
- Check environment variables are set

**No digest emails?**
- Emails only send at 7am, noon, 4pm, 7pm ET
- Check `RESEND_API_KEY` and `NOTIFICATION_EMAIL` are set
- Check logs for digest check messages
