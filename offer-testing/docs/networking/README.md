# Networking Campaign - Quick Start

## 🎯 Goal
Reconnect with your existing LinkedIn network for the holidays and explore opportunities for your AI development services.

## 📊 Current Status

**✅ READY**:
- Database schema designed
- TypeScript types created
- Sync functions built
- Documentation complete

**⚠️ BLOCKING**: Unipile DSN not resolving

## 🚀 Quick Start (3 Steps)

### 1. Fix Unipile Connection

Your Unipile DSN (`https://1api24.unipile.com:15421/api/v1`) is not working.

**Action**: 
1. Go to https://dashboard.unipile.com
2. Find your correct DSN/API Endpoint
3. Test it: `node scripts/find-unipile-dsn.js`

### 2. Create Environment File

Create `.env.local`:

```bash
UNIPILE_API_KEY=2HdAnLfuG.8z5MjY+YB9oo3jxLmwpWbHTcvsJ6anI4dQj2uDG3XKo=
UNIPILE_DSN=<your-correct-dsn>
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
```

### 3. Set Up & Sync

```bash
# Set up database tables
# (Run scripts/setup-networking-schema.sql in Supabase SQL Editor)

# Sync your LinkedIn data
npx ts-node --esm scripts/sync-linkedin.ts
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[NETWORKING-SETUP-SUMMARY.md](./NETWORKING-SETUP-SUMMARY.md)** | **START HERE** - Overview of everything |
| [networking-checklist.md](./networking-checklist.md) | Step-by-step checklist |
| [networking-campaign-guide.md](./networking-campaign-guide.md) | Complete guide with examples |
| [unipile-setup.md](./unipile-setup.md) | Troubleshooting Unipile connection |

## 🛠️ Scripts Available

| Script | Purpose | Command |
|--------|---------|---------|
| **find-unipile-dsn.js** | Find working Unipile DSN | `node scripts/find-unipile-dsn.js` |
| **setup-networking-schema.sql** | Create database tables | Run in Supabase SQL Editor |
| **sync-linkedin.ts** | Pull LinkedIn data | `npx ts-node --esm scripts/sync-linkedin.ts` |

## 📂 Files Created

```
offer-testing/
├── docs/
│   ├── NETWORKING-SETUP-SUMMARY.md  ← START HERE
│   ├── networking-checklist.md
│   ├── networking-campaign-guide.md
│   └── unipile-setup.md
├── scripts/
│   ├── find-unipile-dsn.js          ← Test Unipile connection
│   ├── setup-networking-schema.sql  ← Database tables
│   ├── sync-linkedin.ts             ← Pull LinkedIn data
│   └── test-unipile-simple.js
└── src/
    ├── lib/
    │   ├── networking/
    │   │   └── linkedin-sync.ts      ← Sync functions
    │   └── types/
    │       └── networking.ts         ← TypeScript types
```

## ⚡ What This Does

1. **Pulls your LinkedIn connections** from Unipile
2. **Pulls your message history** to see who you've talked to
3. **Stores everything in Supabase** for analysis
4. **Helps you identify** who to reach out to
5. **Tracks responses** and follow-ups

## 🎁 Holiday Campaign Approach

**Message Style**: Warm, personal, no hard pitch

**Example**:
> Hey [Name]! 👋
>
> Hope you're doing well! With the holidays coming up, I've been thinking about my network and wanted to reach out.
> 
> [Mention where you met / their current work / past conversation]
>
> I've been focused on AI development work lately - helping companies build custom AI solutions. If you know anyone exploring that space, I'd love to chat!
>
> Either way, hope you have a great holiday season! 🎄

**Volume**: 20-25 messages per day max
**Personalization**: Essential - don't copy/paste!

## ⏱️ Timeline

**Once Unipile is fixed**:
- 5 min: Set up database
- 5 min: Sync data
- 30 min: Categorize connections
- 30 min: Write & personalize first 20 messages
- = **70 minutes to first send**

Then 30-45 min/day for ongoing batches.

## 💡 Next Immediate Actions

1. **Fix Unipile DSN** (blocking everything)
   - Check dashboard.unipile.com
   - Or email support@unipile.com

2. **Once fixed**, run:
   ```bash
   node scripts/find-unipile-dsn.js
   ```

3. **Then follow**: [networking-checklist.md](./networking-checklist.md)

## 📊 Database Tables Created

- `linkedin_connections` - Your 1st-degree connections (name, company, title, tags)
- `linkedin_conversations` - Chat threads
- `linkedin_messages` - Message history
- `networking_campaign_batches` - Campaign configuration
- `networking_outreach` - Individual outreach tracking

## ❓ Questions?

Read the [full guide](./networking-campaign-guide.md) or [setup summary](./NETWORKING-SETUP-SUMMARY.md).

---

**Status**: Waiting on Unipile DSN fix → Then ready to launch 🚀

