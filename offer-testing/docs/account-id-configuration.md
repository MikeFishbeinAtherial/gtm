# Account ID Configuration

## Overview

The system uses separate account IDs for email and LinkedIn campaigns to ensure messages are sent from the correct accounts.

## Environment Variables

### Required in Railway

1. **`UNIPILE_EMAIL_ACCOUNT_ID`** - Email account for sending emails
   - Value: `0pKp3VL5TGSAMQpg-eNC7A` (mike@atherial.ai)
   - Used for: All email campaigns (finance, etc.)

2. **`UNIPILE_LINKEDIN_ACCOUNT_ID`** - LinkedIn account for sending LinkedIn messages
   - Value: `eSaTTfPuRx6t131-4hjfSg` (Mike Fishbein personal LinkedIn)
   - Used for: Roleplay networking campaign and other LinkedIn campaigns

## How It Works

### Email Campaigns (`sendEmailMessage`)

1. First tries to use `message.account.unipile_account_id` from the database relation
2. Falls back to `process.env.UNIPILE_EMAIL_ACCOUNT_ID` if relation is missing
3. Logs warnings if account ID is missing

### LinkedIn Campaigns (`sendLinkedInMessage`)

1. First tries to use `message.account.unipile_account_id` from the database relation
2. Falls back to `process.env.UNIPILE_LINKEDIN_ACCOUNT_ID` if relation is missing
3. Logs warnings if account ID is missing

### Networking Messages (`processNetworkingMessages`)

1. First checks `process.env.UNIPILE_LINKEDIN_ACCOUNT_ID`
2. Falls back to fetching from Unipile API if env var not set
3. Logs which method was used

## Verification

To verify your account IDs are correct:

```bash
# Check email account
npx ts-node scripts/check-unipile-account.ts

# Test email sending
npx ts-node scripts/test-unipile-fix.ts

# Check LinkedIn account
# (Look for LinkedIn account in Unipile dashboard)
```

## Troubleshooting

### Email sends failing with "Missing account_id"

1. Check Railway has `UNIPILE_EMAIL_ACCOUNT_ID` set
2. Verify the account ID matches your email account in Unipile
3. Check Railway logs for debug output showing which account ID is being used

### LinkedIn sends failing with "Missing account_id"

1. Check Railway has `UNIPILE_LINKEDIN_ACCOUNT_ID` set
2. Verify the account ID matches your LinkedIn account in Unipile
3. Check Railway logs for debug output

### Wrong account being used

- Email campaigns should use the email account (mike@atherial.ai)
- LinkedIn campaigns should use the LinkedIn account (Mike Fishbein personal)
- Check the debug logs to see which account ID is being used
