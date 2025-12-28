---
name: Local Development to Railway Campaign Execution Workflow
overview: Create a seamless workflow where campaigns are developed locally in Cursor (offers, campaigns, lead lists), then pushed to GitHub/Railway when ready to launch. Railway auto-deploys on push, and campaigns are manually triggered via Railway CLI when ready to send messages.
todos:
  - id: create-campaign-scripts
    content: "Create campaign management scripts: start-campaign.js, pause-campaign.js, list-campaigns.js"
    status: pending
  - id: create-launch-wrapper
    content: Create launch-campaign.sh wrapper script for Railway CLI
    status: pending
  - id: update-railway-config
    content: Update railway.json with worker service configuration
    status: pending
  - id: create-railwayignore
    content: Create .railwayignore to exclude local-only files from Railway
    status: pending
  - id: enhance-worker-script
    content: Enhance campaign-worker.js to accept campaign name as CLI argument
    status: pending
  - id: write-workflow-docs
    content: Write comprehensive workflow documentation (local-to-railway-workflow.md, campaign-lifecycle.md)
    status: pending
    dependencies:
      - create-campaign-scripts
      - create-launch-wrapper
  - id: test-workflow
    content: "Test complete workflow: local development → push → Railway launch"
    status: pending
    dependencies:
      - create-campaign-scripts
      - create-launch-wrapper
      - update-railway-config
      - enhance-worker-script
---

# Local Development to Railway Campaign Execution Workflow

## Problem Statement

You want to:

- **Develop in Cursor**: Create offers, campaigns, and lead lists using Cursor commands and markdown files
- **Execute on Railway**: Run long-running campaigns (days/weeks) without keeping your computer on
- **Seamless Sync**: Push to GitHub/Railway when ready to launch, without disrupting local development

## Solution Architecture

### Workflow Overview

```javascript
Local Development (Cursor)
  ↓
  Create offers/campaigns (files + Supabase)
  ↓
  Generate lead lists (Supabase)
  ↓
  Push to GitHub (when ready to launch)
  ↓
  Railway auto-deploys
  ↓
  Manual trigger: railway run node scripts/campaign-worker.js
  ↓
  Campaign runs 24/7 on Railway
```



### Key Design Decisions

1. **Auto-deploy on push**: Railway watches GitHub and auto-deploys. This works because:

- You push infrequently (only when ready to launch)
- Railway deployments are fast and non-disruptive
- Ensures Railway always has latest code

2. **Manual campaign trigger**: Use Railway CLI to start campaigns when ready:

- `railway run node scripts/campaign-worker.js` for full campaigns
- `railway run node scripts/test-campaign-10.js` for testing
- Gives you control over when campaigns start

3. **Shared Supabase**: Database is the source of truth:

- Local Cursor writes to Supabase (offers, campaigns, contacts)
- Railway reads from Supabase (campaign status, pending messages)
- No sync needed - Supabase is shared

## Implementation Plan

### Phase 1: Structure Scripts for Dual Environment

**Files to create/modify:**

1. **`scripts/campaign-worker.js`** (already exists)

- Works in both local and Railway
- Reads from Supabase (shared)
- Uses environment variables (works in both)

2. **`scripts/launch-campaign.sh`** (new)

- Wrapper script for Railway CLI
- Validates environment before starting
- Provides clear feedback

3. **`docs/workflow-guide.md`** (new)

- Step-by-step guide for local → Railway workflow
- When to push, when to trigger

### Phase 2: Campaign Management Scripts

**Files to create:**

1. **`scripts/list-campaigns.js`** (new)

- Shows all campaigns with status
- Helps choose which campaign to launch

2. **`scripts/start-campaign.js`** (new)

- Accepts campaign name/slug as argument
- Sets campaign status to 'in_progress' in Supabase
- Can be run locally (for testing) or on Railway

3. **`scripts/pause-campaign.js`** (new)

- Pauses campaign via Supabase status update
- Works from anywhere (local or Railway)

### Phase 3: Railway Configuration

**Files to modify:**

1. **`railway.json`** (update)

- Add worker service configuration
- Separate from Next.js app service

2. **`.railwayignore`** (new)

- Exclude local-only files from Railway
- Keep deployment lean

### Phase 4: Documentation

**Files to create:**

1. **`docs/local-to-railway-workflow.md`**

- Complete workflow guide
- When to push, when to trigger
- Troubleshooting

2. **`docs/campaign-lifecycle.md`**

- Campaign states (draft → ready → active → paused → completed)
- How to move between states

## Detailed Implementation

### 1. Campaign Worker Script (`scripts/campaign-worker.js`)

**Current state:** Already exists and works**Enhancements needed:**

- Accept campaign name/slug as CLI argument (optional)
- If no argument, query Supabase for campaigns with `status = 'ready'`
- Support multiple campaigns running simultaneously

**Key code pattern:**

```javascript
// Accept campaign name from CLI args or environment
const campaignName = process.argv[2] || process.env.CAMPAIGN_NAME || null;

// If no campaign specified, find ready campaigns
if (!campaignName) {
  const { data: readyCampaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'ready')
    .limit(1);
  
  if (!readyCampaigns || readyCampaigns.length === 0) {
    console.log('No ready campaigns found. Exiting.');
    process.exit(0);
  }
  
  campaign = readyCampaigns[0];
}
```



### 2. Launch Script (`scripts/launch-campaign.sh`)

**Purpose:** Simple wrapper for Railway CLI with validation**Content:**

```bash
#!/bin/bash
# Launch campaign on Railway

CAMPAIGN_NAME=$1

if [ -z "$CAMPAIGN_NAME" ]; then
  echo "Usage: ./scripts/launch-campaign.sh <campaign-name>"
  echo "Example: ./scripts/launch-campaign.sh networking-holidays-2025"
  exit 1
fi

echo "🚀 Launching campaign: $CAMPAIGN_NAME"
echo "📤 Pushing to GitHub..."
git push

echo "⏳ Waiting for Railway deployment..."
sleep 10

echo "🎯 Starting campaign worker on Railway..."
railway run node scripts/campaign-worker.js "$CAMPAIGN_NAME"
```



### 3. Campaign Management Scripts

**`scripts/list-campaigns.js`:**

- Query Supabase for all campaigns
- Show status, sent count, pending count
- Help choose which to launch

**`scripts/start-campaign.js`:**

- Set campaign status to 'in_progress'
- Validate campaign exists and has pending messages
- Can be run locally (for testing) or via Railway API

**`scripts/pause-campaign.js`:**

- Set campaign status to 'paused'
- Worker checks this status and pauses automatically

### 4. Railway Configuration

**`railway.json` updates:**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  },
  "services": {
    "web": {
      "startCommand": "npm start"
    },
    "worker": {
      "startCommand": "node scripts/campaign-worker.js",
      "restartPolicyType": "ON_FAILURE"
    }
  }
}
```

**`.railwayignore`:**

```javascript
# Local development files
.env.local
.cursor/
offers/*/research/
offers/*/results/
*.md
!README.md
docs/
```



### 5. Workflow Documentation

**`docs/local-to-railway-workflow.md` structure:**

1. **Local Development Phase**

- Create offer: `/new-offer`
- Create campaign: `/offer-campaign`
- Generate leads: `/offer-launch`
- Review in Supabase

2. **Launch Phase**

- Push to GitHub: `git push`
- Railway auto-deploys (wait ~30 seconds)
- Start campaign: `railway run node scripts/campaign-worker.js <campaign-name>`

3. **Monitoring Phase**

- Check status: Supabase or API endpoint
- Pause/resume: Update Supabase status or use API

4. **Troubleshooting**

- Campaign not starting
- Environment variables missing
- Railway deployment issues

## File Structure

```javascript
offer-testing/
├── scripts/
│   ├── campaign-worker.js          # Main worker (exists)
│   ├── start-campaign.js            # NEW: Set status to in_progress
│   ├── pause-campaign.js            # NEW: Set status to paused
│   ├── list-campaigns.js            # NEW: Show all campaigns
│   └── launch-campaign.sh           # NEW: Railway CLI wrapper
├── docs/
│   ├── local-to-railway-workflow.md # NEW: Complete workflow guide
│   └── campaign-lifecycle.md        # NEW: Campaign states
├── railway.json                     # UPDATE: Add worker service
├── .railwayignore                   # NEW: Exclude local files
└── .env.local                       # Local only (not pushed)
```



## Campaign Lifecycle States

```javascript
draft → ready → in_progress → paused → completed
                ↓
            (can resume)
```

**State transitions:**

- `draft`: Created in Cursor, not ready to launch
- `ready`: Has leads, messages generated, ready to send
- `in_progress`: Worker is sending messages
- `paused`: Temporarily stopped (can resume)
- `completed`: All messages sent

**How to change states:**

- Local: Update Supabase directly or use scripts
- Railway: Use API endpoints (`/api/campaign/pause`, `/api/campaign/resume`)

## Usage Examples

### Example 1: Launch New Campaign

```bash
# 1. Local development (in Cursor)
# - Create offer: /new-offer
# - Create campaign: /offer-campaign
# - Generate leads: /offer-launch

# 2. Push to GitHub
git add .
git commit -m "Add networking-holidays-2025 campaign"
git push

# 3. Wait for Railway deployment (~30 seconds)

# 4. Launch campaign
railway run node scripts/campaign-worker.js networking-holidays-2025
```



### Example 2: Pause Campaign

```bash
# Option 1: Via Supabase
# Update campaigns table: status = 'paused'

# Option 2: Via API
curl -X POST https://your-app.railway.app/api/campaign/pause

# Option 3: Via script
node scripts/pause-campaign.js networking-holidays-2025
```



### Example 3: Check Campaign Status

```bash
# Option 1: Supabase Dashboard
# Table Editor → campaigns → filter by name

# Option 2: API
curl https://your-app.railway.app/api/campaign/status

# Option 3: Script
node scripts/list-campaigns.js
```



## Benefits of This Approach

1. **Local Development**: Use Cursor commands and markdown files as normal
2. **No Sync Needed**: Supabase is shared, no manual sync required
3. **Simple Launch**: Push → wait → run Railway CLI command
4. **Flexible**: Can test locally, then launch on Railway
5. **Control**: Manual trigger gives you control over when campaigns start
6. **Monitoring**: Check status via Supabase or API from anywhere

## Next Steps

1. Create campaign management scripts (`start-campaign.js`, `pause-campaign.js`, `list-campaigns.js`)
2. Create launch wrapper script (`launch-campaign.sh`)
3. Update `railway.json` with worker service config