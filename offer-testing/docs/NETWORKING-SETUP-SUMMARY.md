# Networking Campaign - Setup Summary

## What We've Built

I've set up everything you need for your networking campaign. Here's what's ready:

### ✅ **Database Schema** 
Created new Supabase tables specifically for networking:
- `linkedin_connections` - Stores all your 1st-degree connections
- `linkedin_conversations` - Your chat threads
- `linkedin_messages` - Individual messages
- `networking_campaign_batches` - Campaign configuration
- `networking_outreach` - Individual outreach tracking

📁 File: `scripts/setup-networking-schema.sql`

### ✅ **TypeScript Types**
Full type definitions for all networking campaign data structures.

📁 File: `src/lib/types/networking.ts`

### ✅ **Data Sync Functions**
Functions to pull your LinkedIn data from Unipile and store in Supabase:
- `syncLinkedInConnections()` - Pull all connections
- `syncLinkedInMessages()` - Pull message history
- `fullLinkedInSync()` - Complete sync
- Helper functions for analysis

📁 File: `src/lib/networking/linkedin-sync.ts`

### ✅ **Sync Script**
Command-line script to run the full sync.

📁 File: `scripts/sync-linkedin.ts`

### ✅ **Documentation**
- **Full Guide**: Step-by-step instructions for the entire campaign
- **Quick Checklist**: Simple checklist to follow
- **Unipile Setup**: Troubleshooting for API connection

📁 Files:
- `docs/networking-campaign-guide.md` (comprehensive)
- `docs/networking-checklist.md` (quick reference)
- `docs/unipile-setup.md` (troubleshooting)

### ✅ **Testing Scripts**
Scripts to verify your setup:
- `scripts/test-unipile-simple.js` - Test Unipile connection
- `scripts/find-unipile-dsn.js` - Auto-detect correct DSN

---

## ⚠️ **What's Blocking You Right Now**

### The Unipile DSN Issue

The DSN URL that Unipile gave you (`https://1api24.unipile.com:15421/api/v1`) is not resolving. This is your **immediate blocker**.

**What this means**: 
- The hostname `1api24.unipile.com` doesn't exist in DNS
- We can't connect to Unipile to pull your LinkedIn data
- Everything else is ready to go once this is fixed

**How to fix it**:

1. **Log into your Unipile dashboard**: https://dashboard.unipile.com

2. **Find your actual DSN** - Look for:
   - "API Endpoint"
   - "Base URL"
   - "DSN"
   - It should be prominently displayed on the homepage

3. **Test it works**:
   ```bash
   curl --request GET \
     --url YOUR_DSN/accounts \
     --header 'X-API-KEY: 2HdAnLfuG.8z5MjY+YB9oo3jxLmwpWbHTcvsJ6anI4dQj2uDG3XKo=' \
     --header 'accept: application/json'
   ```
   
   If you get JSON back (not an error), it works!

4. **Update .env.local** with the correct DSN

5. **Or contact Unipile support**:
   - Email: support@unipile.com
   - Tell them: "The DSN shown in my dashboard (https://1api24.unipile.com:15421/api/v1) is not resolving. Can you provide the correct API endpoint for my account?"

---

## 📋 **Your Next Steps** (In Order)

### Step 1: Fix Unipile Connection (FIRST - BLOCKING)

- [ ] Go to Unipile dashboard
- [ ] Find correct DSN
- [ ] Test with curl
- [ ] Create `.env.local` file with correct DSN

### Step 2: Set Up Database

- [ ] Open Supabase SQL Editor
- [ ] Run `scripts/setup-networking-schema.sql`
- [ ] Verify tables were created

### Step 3: Sync Your Data

- [ ] Run: `npx ts-node --esm scripts/sync-linkedin.ts`
- [ ] Verify connections in Supabase
- [ ] Verify messages in Supabase

### Step 4: Prepare Campaign

- [ ] Mark family/close friends to skip
- [ ] Set priorities
- [ ] Add tags (optional)
- [ ] Write message template
- [ ] Create campaign batch

### Step 5: Launch

- [ ] Identify first 20-30 people
- [ ] Personalize each message
- [ ] Send 20-25 per day
- [ ] Track responses

---

## 🎯 **What Makes This Different**

This networking campaign is **completely separate** from your traditional cold outbound campaigns:

| Feature | Cold Outbound | Networking Campaign |
|---------|---------------|---------------------|
| Target | New prospects | Existing connections |
| Database | `contacts`, `companies` | `linkedin_connections` |
| Discovery | Signal-based search | Already have list |
| Personalization | Company/role based | Relationship based |
| Messaging | Professional, value-driven | Warm, personal |
| Volume | High (100s) | Lower (50-100 at a time) |
| Goal | Meetings, demos | Reconnect, referrals |

This is about **relationship management**, not lead generation (though it can lead to business).

---

## 📚 **Documentation Quick Reference**

**Need step-by-step instructions?**
→ Read `docs/networking-campaign-guide.md`

**Just want a checklist?**
→ Follow `docs/networking-checklist.md`

**Unipile not working?**
→ See `docs/unipile-setup.md`

**Want to understand the database?**
→ Look at `scripts/setup-networking-schema.sql` (heavily commented)

**Need to modify types?**
→ Edit `src/lib/types/networking.ts`

---

## 💡 **Example Workflow** (Once Unipile is Fixed)

Here's what your actual workflow will look like:

1. **Sync data** (once):
   ```bash
   npx ts-node --esm scripts/sync-linkedin.ts
   ```
   → Pulls all 487 (or however many) connections

2. **Query who to contact**:
   ```sql
   SELECT * FROM networking_contacts_ready
   WHERE recency_category IN ('stale', 'very_stale')
   AND priority != 'low'
   LIMIT 30;
   ```

3. **For each person**, write personalized message mentioning:
   - Where you met
   - Their current role/company
   - A past conversation
   - Your holiday wishes

4. **Send 20-25 per day** via LinkedIn

5. **Update database** when they reply:
   ```sql
   UPDATE networking_outreach
   SET status = 'replied', reply_text = '...'
   WHERE connection_id = '...';
   ```

6. **Follow up** with interested people

7. **Track metrics**:
   ```sql
   SELECT * FROM networking_batch_performance;
   ```

---

## ⏱️ **Time Estimates**

Once Unipile is working:

- **Database setup**: 5 minutes
- **Initial data sync**: 2-5 minutes
- **Categorizing connections**: 30-60 minutes
- **Writing message template**: 15-30 minutes
- **Personalizing 20 messages**: 30-45 minutes
- **Sending 20 messages**: 30-45 minutes

**Total first batch**: 2-3 hours

Then **30-45 min/day** for subsequent batches.

---

## 🎁 **Holiday Timing**

Perfect timing for holiday outreach:
- **Now - Dec 23**: Send messages with holiday wishes
- **Dec 24-26**: Pause (holidays)
- **Dec 27-31**: Light follow-ups
- **Jan 2-10**: Follow up on positive responses
- **Jan 10+**: Next batch if first went well

---

## 🤔 **Common Questions**

**Q: What if I can't fix the Unipile DSN?**
A: Contact their support - they'll give you the right URL. This is a common setup issue.

**Q: Can I start without Unipile?**
A: Not easily. You need your connections list. You could export from LinkedIn manually, but that's tedious.

**Q: What if I don't have Supabase set up?**
A: You'll need to set that up first. It's free to start. Create account at supabase.com.

**Q: How long until I can send messages?**
A: Once Unipile works: 15-20 minutes (set up DB, sync data, write first message).

**Q: Can I fully automate this?**
A: Technically yes, but don't. Manual sending is safer for your LinkedIn account and shows better results.

---

## 📞 **Need Help?**

If you get stuck:

1. **Unipile issues**: Check `docs/unipile-setup.md` or email support@unipile.com
2. **Database questions**: Reference the SQL schema - it's well commented
3. **Type errors**: Look at `src/lib/types/networking.ts`
4. **General flow**: Follow `docs/networking-checklist.md`

---

## ✅ **Current Status**

**What's Done**:
- ✅ Database schema designed
- ✅ TypeScript types created
- ✅ Sync functions built
- ✅ Scripts created
- ✅ Documentation written
- ✅ Testing utilities built

**What's Next** (Your Action Items):
- ⏳ Fix Unipile DSN
- ⏳ Create .env.local
- ⏳ Set up Supabase tables
- ⏳ Sync LinkedIn data
- ⏳ Launch campaign

**Blocker**: Unipile DSN not resolving

**Once blocker is cleared**: 30 minutes to launch 🚀

---

Good luck! Let me know once you get the Unipile DSN sorted and I can help you with the next steps.

