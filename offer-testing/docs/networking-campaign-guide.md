# Networking Campaign Guide

## Overview

This guide walks you through setting up your "Networking" campaign - a warm outreach campaign to your existing 1st-degree LinkedIn connections for the holiday season.

**Goal**: Reconnect with your network, wish them happy holidays, and explore opportunities for your AI development services.

**Approach**: Warm, personal, no hard pitch - just genuine relationship building.

---

## What Makes This Different

Unlike traditional cold outbound campaigns, this networking campaign:

- ✅ **Targets existing connections** - People who already know you
- ✅ **Focuses on relationships** - Not just lead generation
- ✅ **Uses conversation history** - Personalize based on past interactions
- ✅ **Separate database structure** - Different tables from cold outreach
- ✅ **More flexible messaging** - Can be more casual and personal

---

## Step-by-Step Setup

### Step 1: Fix Your Unipile Connection

**Problem**: The DSN URL `https://1api24.unipile.com:15421` isn't resolving.

**Solution**:

1. Go to your Unipile dashboard: https://dashboard.unipile.com
2. Find your correct **DSN** or **API Endpoint**
3. It might be:
   - A different subdomain format
   - An IP address
   - Or a standard API gateway URL

4. Test it with curl:
   ```bash
   curl --request GET \
     --url YOUR_DSN/accounts \
     --header 'X-API-KEY: 2HdAnLfuG.8z5MjY+YB9oo3jxLmwpWbHTcvsJ6anI4dQj2uDG3XKo=' \
     --header 'accept: application/json'
   ```

5. If you get JSON back with your account info, you're good!

**If still stuck**: Email support@unipile.com and say "My DSN isn't resolving, can you provide the correct API endpoint?"

---

### Step 2: Create Your Environment File

Create `/Users/mikefishbein/Desktop/Vibe Coding/gtm/offer-testing/.env.local`:

```bash
# Unipile
UNIPILE_API_KEY=2HdAnLfuG.8z5MjY+YB9oo3jxLmwpWbHTcvsJ6anI4dQj2uDG3XKo=
UNIPILE_DSN=<YOUR_CORRECT_DSN_HERE>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Other APIs (optional for now)
ANTHROPIC_API_KEY=your-anthropic-key
PARALLEL_API_KEY=your-parallel-key
```

---

### Step 3: Set Up Supabase Tables

Run the SQL schema in your Supabase SQL Editor:

1. Open Supabase dashboard
2. Go to SQL Editor
3. Copy contents of `scripts/setup-networking-schema.sql`
4. Run it

This creates:
- `linkedin_connections` - Your 1st degree connections
- `linkedin_conversations` - Chat threads
- `linkedin_messages` - Individual messages
- `networking_campaign_batches` - Outreach campaigns
- `networking_outreach` - Individual outreach attempts

---

### Step 4: Sync Your LinkedIn Data

Once Unipile is working, run:

```bash
cd /Users/mikefishbein/Desktop/Vibe\ Coding/gtm/offer-testing
npx ts-node --esm scripts/sync-linkedin.ts
```

This will:
1. Pull all your 1st-degree LinkedIn connections
2. Pull your message history
3. Store everything in Supabase
4. Show you statistics about your network

**Expected output**:
```
✅ Found LinkedIn account: Mike Fishbein
🔄 Syncing LinkedIn connections...
📥 Found 487 connections
✅ Sync complete: 487 new, 0 updated

💬 Syncing LinkedIn conversations...
📥 Found 50 conversations
✅ Sync complete: 50 conversations, 342 messages

📊 YOUR NETWORK
Total Connections: 487
Ready for Outreach: 425
Already Contacted: 0
Skipped: 0
```

---

### Step 5: Categorize Your Connections

Before sending messages, you should categorize your connections:

#### A. Mark People to Skip

Some people you don't want to contact in a campaign:
- Family members
- Very close friends (message them personally)
- People you talk to regularly
- Current clients/coworkers

**How to mark them**:

```sql
-- In Supabase SQL Editor
UPDATE linkedin_connections
SET 
  skip_outreach = TRUE,
  skip_reason = 'family'
WHERE full_name IN ('Mom Fishbein', 'Dad Fishbein');

UPDATE linkedin_connections
SET 
  skip_outreach = TRUE,
  skip_reason = 'close_personal_friend'
WHERE tags && ARRAY['close_friend'];
```

#### B. Set Priorities

Who should you contact first?

- **High**: People you'd love to reconnect with, potential clients, referral sources
- **Medium**: General network, acquaintances
- **Low**: People you don't remember well

```sql
-- Set priority based on recency
UPDATE linkedin_connections
SET priority = 
  CASE 
    WHEN last_interaction_at > NOW() - INTERVAL '3 months' THEN 'high'
    WHEN last_interaction_at > NOW() - INTERVAL '1 year' THEN 'medium'
    ELSE 'low'
  END;
```

#### C. Add Tags

Tags help you segment:

```sql
-- Add tags
UPDATE linkedin_connections
SET tags = ARRAY['industry_peer', 'saas']
WHERE industry LIKE '%Software%' 
  AND current_title LIKE '%Founder%';

UPDATE linkedin_connections
SET tags = ARRAY['college']
WHERE linkedin_url IN (
  -- List of college friends
);
```

---

### Step 6: Create Your Campaign

#### Write Your Message Template

**Example for holidays**:

```
Hey [First Name]! 👋

Hope you're doing well! With the holidays coming up, I've been thinking about my network and wanted to reach out.

[PERSONALIZATION - mention something specific about them, their company, or your connection]

I've been focused on AI development work lately - helping companies build custom AI solutions. If you know anyone exploring that space, I'd love to chat!

Either way, hope you have a great holiday season! 🎄

Best,
Mike
```

**Personalization ideas**:
- Mention where you met
- Reference their current company/role
- Bring up a past conversation
- Congratulate them on a recent achievement
- Ask about a project you know they're working on

#### Create the Campaign Batch

```sql
INSERT INTO networking_campaign_batches (
  name,
  description,
  message_template,
  personalization_instructions,
  target_filters,
  status
) VALUES (
  'Holiday 2025 Reconnect',
  'Warm holiday outreach to existing connections',
  'Hey {first_name}! 👋

Hope you''re doing well! With the holidays coming up...

{personalization}

Best,
Mike',
  'Mention: where we met, their current role/company, or a past conversation. Keep it natural and warm.',
  '{
    "relationship_strength": ["weak", "moderate", "unknown"],
    "last_interaction_before": "2024-06-01",
    "exclude_tags": ["family", "close_friend"],
    "min_priority": "medium"
  }'::jsonb,
  'draft'
);
```

---

### Step 7: Generate Personalized Messages

You have two options:

#### Option A: Manual (Recommended for First Campaign)

1. Query connections to contact:
   ```sql
   SELECT *
   FROM networking_contacts_ready
   WHERE priority IN ('high', 'medium')
   AND recency_category IN ('stale', 'very_stale')
   LIMIT 50;
   ```

2. For each person, write a personalized message
3. Insert into `networking_outreach` table
4. Review and approve each one

#### Option B: AI-Assisted (Build Later)

Create a script that:
1. Pulls connection data
2. Uses Claude/Anthropic to personalize based on their profile
3. Saves to `networking_outreach` with status = 'pending'
4. You review and approve before sending

---

### Step 8: Send Messages

**IMPORTANT**: LinkedIn rate limits
- Max 40 messages per day
- Best: 20-25 per day to be safe
- Space them out over the day
- Only send during business hours

**Manual sending** (safest for first batch):
1. Query pending messages
2. Copy each message
3. Send via LinkedIn manually
4. Mark as sent in database

**Semi-automated** (build later):
- Use Unipile API to send
- Implement rate limiting
- Add random delays (2-5 min between sends)
- Only send 9am-6pm recipient timezone

---

### Step 9: Track Responses

When people reply:

```sql
UPDATE networking_outreach
SET 
  status = 'replied',
  replied_at = NOW(),
  reply_text = 'Their response here',
  reply_sentiment = 'positive'  -- or 'neutral', 'negative'
WHERE id = 'outreach-id';

-- If they're interested in your services
UPDATE networking_outreach
SET 
  needs_follow_up = TRUE,
  follow_up_notes = 'Interested in AI development for their project X'
WHERE id = 'outreach-id';
```

---

## Database Schema Reference

### Key Tables

**linkedin_connections**
- Your 1st degree connections
- Fields: name, title, company, last_interaction_at, priority, tags

**linkedin_messages**
- Message history
- Used to personalize outreach
- Shows conversation recency

**networking_campaign_batches**
- Campaign configuration
- Message template
- Target filters

**networking_outreach**
- Individual outreach attempts
- Links batch → connection → message
- Tracks responses

### Key Views

**networking_contacts_ready**
- Shows who you can contact
- Excludes people you've already reached out to
- Excludes people marked as "skip"
- Includes recency category

**networking_batch_performance**
- Shows campaign metrics
- Reply rate, positive rate
- Progress tracking

---

## Example Queries

### Find people you haven't talked to in a year:

```sql
SELECT 
  full_name,
  current_company,
  current_title,
  last_interaction_at,
  tags
FROM networking_contacts_ready
WHERE recency_category IN ('stale', 'very_stale')
AND priority != 'low'
ORDER BY last_interaction_at ASC
LIMIT 20;
```

### See campaign performance:

```sql
SELECT * FROM networking_batch_performance;
```

### Find positive replies:

```sql
SELECT 
  lc.full_name,
  lc.current_company,
  no.reply_text,
  no.replied_at
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE no.reply_sentiment = 'positive'
ORDER BY no.replied_at DESC;
```

---

## Tips for Success

### 1. Personalization is Key
Don't send the same message to everyone. Mention:
- Where you met
- Their current work
- A past conversation
- Recent achievement

### 2. No Hard Pitch
This is about reconnecting, not selling. The ask is soft:
- "If you know anyone..."
- "Would love to chat if relevant..."
- Focus on the relationship

### 3. Batch Smartly
Group by:
- How you know them (college, past coworker, industry)
- Their industry
- Recency of relationship

This makes personalization easier.

### 4. Follow LinkedIn Etiquette
- Don't spam
- Don't be salesy
- Be genuine
- Respect if someone doesn't respond

### 5. Track Everything
- Who replied
- What they said
- Follow-up needed
- Referrals given

This becomes your CRM for your network.

---

## Troubleshooting

### Unipile Connection Issues

**Problem**: Can't connect to Unipile
**Solution**: Check docs/unipile-setup.md

**Problem**: No connections returned
**Solution**: 
- Make sure you connected LinkedIn in Unipile dashboard
- Check account status
- Try re-authenticating

### Supabase Issues

**Problem**: Insert errors
**Solution**: 
- Check table schema matches
- Verify foreign keys exist
- Check for unique constraint violations

### Rate Limiting

**Problem**: LinkedIn restricts your account
**Solution**:
- Slow down (10-15 messages/day for a few days)
- More personalization
- Only message 2nd/3rd degree for now
- Wait a week before resuming

---

## Next Steps After Setup

1. ✅ **Sync complete** - All your connections are in Supabase
2. 🏷️ **Tag & categorize** - Mark family/friends to skip
3. 📝 **Draft your message** - Write your template
4. 🎯 **Identify first batch** - Start with 20-30 people
5. ✍️ **Personalize each message** - Don't skip this!
6. 📤 **Send slowly** - 20-25/day max
7. 📊 **Track responses** - Update database
8. 🔄 **Follow up** - On positive responses
9. 📈 **Iterate** - Learn what works, improve messaging

---

## Files Reference

- `/scripts/setup-networking-schema.sql` - Database tables
- `/scripts/sync-linkedin.ts` - Pull data from Unipile
- `/src/lib/networking/linkedin-sync.ts` - Sync functions
- `/src/lib/types/networking.ts` - TypeScript types
- `/docs/unipile-setup.md` - Unipile troubleshooting

---

## Questions?

Common questions:

**Q: Can I automate sending?**
A: Technically yes (via Unipile API), but start manual. Too much automation = LinkedIn restrictions.

**Q: How many people should I contact?**
A: Start with 20-30. See response rate. Scale gradually.

**Q: What if someone doesn't respond?**
A: That's normal. No follow-up needed for networking messages.

**Q: Should I send to everyone?**
A: No! Skip family, close friends, people you talk to regularly. Focus on "weak ties" - people you haven't connected with in a while.

**Q: What's a good response rate?**
A: For warm network outreach: 20-40% is good. 10-15% is normal.

**Q: How do I track referrals?**
A: Update `networking_outreach.follow_up_notes` with details, then create a proper lead record in your CRM (or the main `contacts` table if they refer someone).

