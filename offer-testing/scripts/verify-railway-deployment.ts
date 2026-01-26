/**
 * Verify what Railway needs for email sending to work
 */

console.log(`
🔍 Railway Deployment Verification Checklist

The code has been updated to use UNIPILE_EMAIL_ACCOUNT_ID as a fallback.
However, Railway needs to:

1. ✅ Deploy the updated code
   - The updated process-message-queue.js needs to be deployed
   - Check Railway dashboard: Has the latest code been deployed?

2. ✅ Set Environment Variables in Railway
   Railway MUST have these environment variables:
   
   UNIPILE_EMAIL_ACCOUNT_ID=0pKp3VL5TGSAMQpg-eNC7A
   UNIPILE_LINKEDIN_ACCOUNT_ID=eSaTTfPuRx6t131-4hjfSg
   UNIPILE_DSN=https://api4.unipile.com:13425/api/v1
   UNIPILE_API_KEY=<your-api-key>
   
3. ✅ Verify Cron is Running
   - Check Railway logs for cron execution
   - Should see "📧 sendEmailMessage called:" logs
   - Should see account_id being used

4. ✅ Check Recent Errors
   Current errors show "account_id missing" which means:
   - Either Railway doesn't have UNIPILE_EMAIL_ACCOUNT_ID set
   - Or Railway is running old code without the fallback

📋 To Fix:

1. Go to Railway dashboard
2. Navigate to your service
3. Go to Variables tab
4. Add/verify UNIPILE_EMAIL_ACCOUNT_ID=0pKp3VL5TGSAMQpg-eNC7A
5. Redeploy the service (or wait for auto-deploy)
6. Check logs to see if emails start sending

🔍 To Check Railway Logs:
   railway login
   railway logs --tail 100

Look for:
- "📧 sendEmailMessage called:" - confirms code is running
- "⚠️ Account relation missing, using UNIPILE_EMAIL_ACCOUNT_ID from env" - confirms fallback is working
- "📤 Sending email via Unipile:" - confirms account_id is being used
- Any errors about missing account_id - means env var not set
`)
