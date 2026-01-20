# Unipile Email Sending Guide

## Issue: Email Endpoint Not Found

The `/email/send` endpoint is returning 404, which suggests Unipile may not have a direct email sending API endpoint, or it requires a different approach.

## Current Status

### Your Connected Accounts
1. **Email Account (Google OAuth)**
   - ID: `0pKp3VL5TGSAMQpg-eNC7A`
   - Email: mike@atherial.ai
   - Status: Active ✅

2. **LinkedIn Account**
   - ID: `eSaTTfPuRx6t131-4hjfSg`
   - Name: Mike Fishbein
   - Status: Active ✅

## Possible Solutions

### Option 1: Check Unipile Dashboard
1. Go to Unipile dashboard
2. Look for "Email" or "Send Email" section
3. Check API documentation for correct endpoint
4. Verify if email sending is enabled for your plan

### Option 2: Use Unipile Client Library
The `UnipileClient` class has a `sendEmail` method, but it's using `/email/send` which returns 404. This suggests:
- Email sending might not be available in your plan
- Endpoint might be different
- Email sending might work differently than LinkedIn messages

### Option 3: Alternative Email Sending
If Unipile doesn't support email sending directly, consider:
- **Resend** - Email API service (already integrated for notifications)
- **SendGrid** - Email API service
- **SMTP** - Direct SMTP sending

## Next Steps

1. **Check Unipile Dashboard** - Verify email sending capabilities
2. **Contact Unipile Support** - Ask about email sending API endpoint
3. **Use Alternative** - If Unipile doesn't support email, use Resend or another service

## For Now

Since email sending endpoint isn't working, let's focus on:
1. ✅ **Contact discovery** - Continue finding contacts (running now)
2. ✅ **Get emails** - Enrich contacts with emails (FullEnrich working)
3. ⏭️ **Email sending** - Resolve Unipile email endpoint or use alternative

---

## Summary

- ✅ **Email account connected** - `0pKp3VL5TGSAMQpg-eNC7A`
- ✅ **LinkedIn account connected** - `eSaTTfPuRx6t131-4hjfSg`
- ❌ **Email sending endpoint** - `/email/send` returns 404
- 💡 **Next:** Check Unipile dashboard/docs or contact support

**LinkedIn messages work fine** - The issue is specifically with email sending endpoint.
