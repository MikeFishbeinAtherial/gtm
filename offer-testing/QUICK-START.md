# Quick Start Guide: Networking Campaign

**Campaign:** networking-holidays-2025  
**Offer:** Atherial  
**Target:** 539 LinkedIn connections

---

## ✅ Setup Complete

Your campaign is ready to launch! Here's everything that's been set up:

### 📁 Offer Structure
```
offers/atherial/
├── atherial-positioning.md          # Complete positioning canvas
├── atherial-README.md                # Offer overview
├── campaigns/
│   └── networking-holidays-2025/
│       ├── networking-holidays-2025-campaign-plan.md
│       └── copy/
│           └── linkedin-message.md   # Final message template
├── research/
│   └── atherial-research.md
└── results/
    └── atherial-learnings.md         # Track campaign results here
```

### 🗄️ Database
- ✅ Supabase tables created (`linkedin_connections`, `networking_outreach`, etc.)
- ✅ Campaign created: `networking-holidays-2025` (ID: `d38eb9c1-5b9d-4c83-bda4-a1d5eeeb9ac8`)

### 🛠️ Scripts
- ✅ `import-networking-contacts.js` - Import CSV contacts
- ✅ `generate-networking-messages.js` - Create personalized messages
- ✅ `monitor-networking-campaign.js` - Real-time dashboard
- ✅ `send-networking-campaign.js` - Safe sending with rate limits

---

## 🚀 Launch Steps

### Step 1: Import Contacts (2-3 minutes)

```bash
cd /Users/mikefishbein/Desktop/Vibe\ Coding/gtm/offer-testing
node scripts/import-networking-contacts.js
```

**What it does:**
- Loads 539 contacts from `data/networking-contacts.json`
- Matches them to your Unipile LinkedIn connections
- Imports to Supabase `linkedin_connections` table

**Expected output:** "✅ Import complete! Imported: 539"

---

### Step 2: Generate Messages (1-2 minutes)

```bash
node scripts/generate-networking-messages.js
```

**What it does:**
- Fills in message template with each person's first name
- Creates entries in `networking_outreach` table
- Shows sample messages for review

**Expected output:** "✅ Message generation complete! Generated: 539"

---

### Step 3: Start Monitor (optional but recommended)

**Open a NEW terminal tab**, then run:

```bash
cd /Users/mikefishbein/Desktop/Vibe\ Coding/gtm/offer-testing
node scripts/monitor-networking-campaign.js
```

**What it does:**
- Shows real-time campaign progress
- Displays send rate, errors, recent activity
- Refreshes every 5 seconds
- **Keep this running while sending**

**To stop monitoring:** Press `Ctrl+C` (campaign keeps running)

---

### Step 4: Send Campaign

**Back in your original terminal:**

```bash
node scripts/send-networking-campaign.js
```

**What it does:**
- Sends 50 messages per day
- Random delays (15-45 min between messages)
- 6 AM - 8 PM ET (14 hours, 7 days/week)
- Auto-pauses only on Dec 25 (Christmas)
- Logs all activity to Supabase

**Expected timeline:**
- 539 messages ÷ 50/day = ~11 business days
- Start: Dec 23, 2025
- Finish: ~Jan 13, 2026

**To pause sending:** Press `Ctrl+C` or run:
```bash
node scripts/send-networking-campaign.js --pause
```

**To resume:**
```bash
node scripts/send-networking-campaign.js --resume
```

---

## 💻 Computer Requirements

### Do You Need to Keep Your Computer On?

**Short answer:** Yes, for the local version.

**While sending:**
- ✅ Computer must be on (not sleeping)
- ✅ Terminal must be running the sender script
- ✅ Internet connection required

**Monitor script:**
- Optional - you can stop it anytime with `Ctrl+C`
- Campaign keeps running independently
- Restart monitor anytime to check progress

**Tips:**
1. **Prevent sleep:** System Preferences → Energy Saver → Prevent computer from sleeping
2. **Run overnight:** The script will pause outside business hours automatically
3. **Check progress:** Open monitor anytime to see status
4. **Safe to interrupt:** Press `Ctrl+C` to pause, then `--resume` to continue

**Alternative (if you don't want to leave computer on):**
- We can deploy to Railway/Render later
- For now, local is simpler for 539 contacts over 11 days

---

## 📊 Monitoring Progress

### Real-Time Dashboard
```bash
node scripts/monitor-networking-campaign.js
```

Shows:
- Messages sent today / total
- Progress bar
- Send rate
- Recent activity
- Errors (if any)

### Supabase Database

Check directly in Supabase:

```sql
-- Campaign stats
SELECT 
  status, 
  COUNT(*) 
FROM networking_outreach 
WHERE batch_id = 'd38eb9c1-5b9d-4c83-bda4-a1d5eeeb9ac8'
GROUP BY status;

-- Recent sends
SELECT 
  sent_at,
  linkedin_connections.first_name
FROM networking_outreach
JOIN linkedin_connections ON networking_outreach.connection_id = linkedin_connections.id
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 10;
```

---

## 🎯 Safety Features

### LinkedIn Safety
- ✅ 1st-degree connections only (warm audience)
- ✅ Max 50 messages/day (conservative limit)
- ✅ Random 15-45 min delays (looks human)
- ✅ Extended hours (6 AM - 8 PM ET, daily except Christmas)
- ✅ Auto-pause on Dec 25 (Christmas)
- ✅ Error logging and monitoring

### Campaign Control
- **Pause anytime:** `Ctrl+C` or `--pause` flag
- **Resume anytime:** `--resume` flag
- **Monitor separately:** Dashboard runs independently
- **No data loss:** All progress saved to Supabase

### Error Handling
- Failed messages logged with reason
- Script continues if one message fails
- Can review and retry failed messages later
- No LinkedIn account risk

---

## 🎉 What Happens Next

### Sending Phase (Dec 23 - Jan 13)
1. Script sends 50 messages/day (6 AM - 8 PM ET, 7 days/week)
2. Messages logged to Supabase
3. Monitor dashboard shows real-time progress
4. Campaign auto-pauses outside hours and on Dec 25

### Response Tracking (Manual for V1)
1. Check LinkedIn for replies
2. Manually update Supabase when people respond:
   ```sql
   UPDATE networking_outreach 
   SET 
     status = 'replied',
     replied_at = NOW(),
     reply_text = 'Their message here',
     reply_sentiment = 'positive'
   WHERE connection_id = (
     SELECT id FROM linkedin_connections 
     WHERE first_name = 'Eugene'
   );
   ```

### Results Analysis (Jan 14+)
1. Calculate reply rate
2. Track meetings booked
3. Document learnings in `offers/atherial/results/atherial-learnings.md`
4. Use insights for future campaigns

---

## 🆘 Troubleshooting

### "Campaign not found"
- Run the setup script again: `node scripts/setup-networking-campaign.js`

### "No contacts imported"
- Check CSV was parsed: `ls data/networking-contacts.json`
- Re-parse if needed: `node scripts/parse-networking-csv.js`

### "Unipile API error"
- Check `.env.local` has correct `UNIPILE_DSN` and `UNIPILE_API_KEY`
- Test connection: `node scripts/test-unipile-simple.js`

### "Too many errors"
- Check monitor dashboard for error details
- Pause campaign: `node scripts/send-networking-campaign.js --pause`
- Review errors in Supabase
- Fix issues, then resume

### Script stopped unexpectedly
- Check if computer went to sleep
- Resume campaign: `node scripts/send-networking-campaign.js --resume`

---

## 📝 Pro Tips

1. **Start with a test:** Add `--dry-run` flag to test without sending
   ```bash
   node scripts/send-networking-campaign.js --dry-run
   ```

2. **Check sample messages** before sending (Step 2 shows them)

3. **Keep monitor running** in a separate terminal tab for peace of mind

4. **Respond quickly** to replies - shows you're genuinely interested

5. **Track learnings** in `offers/atherial/results/atherial-learnings.md`

6. **Future campaigns:** Use this same structure for other offers

---

## 🎯 Success Metrics

**Target:**
- 539 messages sent
- 10-20% reply rate (50-100 replies)
- 10+ referrals or warm intros
- 2-5 qualified meetings
- Zero LinkedIn issues

**Track in:** `offers/atherial/results/atherial-learnings.md`

---

## Questions?

All documentation is in:
- Campaign plan: `offers/atherial/campaigns/networking-holidays-2025/networking-holidays-2025-campaign-plan.md`
- Message copy: `offers/atherial/campaigns/networking-holidays-2025/copy/linkedin-message.md`
- Implementation: `docs/networking-campaign-implementation.md`

**Ready to launch? Start with Step 1! 🚀**

