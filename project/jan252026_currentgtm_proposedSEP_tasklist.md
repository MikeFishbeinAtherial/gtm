# Implementation Tasklist for CTO Review

This file turns the CTO feedback into concrete, beginner-friendly build steps.
Each section includes the problem it solves and why we need it.

---

## 1) Taxonomy (Shared Vocabulary)

**Problem:** Different parts of the system call the same thing by different names.  
**Why it matters:** If labels are inconsistent, filters break, dashboards lie, and safety checks miss things.

**What to implement:**
- [x] **Central taxonomy constants** in `offer-testing/src/lib/constants/taxonomy.ts`
- [x] **Schema alignment** for channels and status names in `offer-testing/scripts/setup-db.sql`
- [x] **Doc update** in `project/supabase_schema.md`

---

## 2) Global Outreach Tracking (60‑Day Rule)

**Problem:** The same person can get contacted from multiple offers.  
**Why it matters:** This burns reputation and increases spam risk.

**What to implement:**
- [x] Add **global fields** to `contacts` (last_contacted, status, eligible_for_outreach)
- [x] Create **outreach_history** for global logging
- [x] Add **trigger** to update global fields when new outreach is logged
- [x] Add **refresh_outreach_eligibility()** function for daily resets

---

## 3) Dedicated Send Queue

**Problem:** Scheduled messages are hidden inside `messages`, making visibility and control hard.  
**Why it matters:** You need to pause, skip, and audit every message safely.

**What to implement:**
- [x] Create `send_queue` table
- [x] Add `message_events` for each state change
- [x] Add `claim_send_queue_item()` with `SKIP LOCKED`
- [x] Update queue queries and views (`todays_schedule`, `leads_for_review`)

---

## 4) Visual Dashboard (Next.js)

**Problem:** Supabase tables are hard to read at a glance.  
**Why it matters:** A visual view helps you spot risk and fix issues fast.

**What to implement:**
- [x] `/leads` page (Clay-style review)
- [x] `/queue` page (today’s schedule)
- [x] `/accounts` page (health + limits)
- [x] `/campaigns` page (status + quick actions)
- [x] Minimal actions (skip queue item, pause/resume campaign)

---

## 5) Account Health + Safety

**Problem:** You can burn inboxes or get LinkedIn accounts flagged.  
**Why it matters:** One burned account can take weeks to recover.

**What to implement:**
- [x] Add `health_score`, `spam_rate`, `rotation_set` to accounts
- [x] Update `account_capacity` view to block low health
- [x] Use safer defaults in scheduling config

---

## 6) Lightweight Multi‑Step Pipeline Runner

**Problem:** You want an agent to do multi-step lead generation, but not a full workflow builder.  
**Why it matters:** A simple runner gives repeatability without huge complexity.

**What to implement:**
- [x] `pipeline_runs` + `pipeline_steps` tables
- [x] Script `scripts/run-lead-pipeline.ts` with steps:
  - `find_companies`
  - `find_contacts`
  - `enrich_emails`

---

## 7) Message Templates (Structured Copy)

**Problem:** Copy lives in files and JSON blobs, making it hard to version.  
**Why it matters:** Structured templates make A/B testing and review easier later.

**What to implement:**
- [x] `message_templates` table
- [ ] (Optional) UI editor for templates

---

## 8) Verification Checklist (Go‑Live)

**Problem:** If safety rules break, you will burn accounts.  
**Why it matters:** This is the highest-risk part of the system.

**What to verify before running live:**
- [x] Per‑inbox limits are enforced
  - `setup-db.sql`: `daily_limit_connections=20`, `daily_limit_messages=40`, `daily_limit_emails=100`
  - `campaign-worker.js`: `MAX_MESSAGES_PER_DAY=38` (line 73)
  - `account_capacity` view: blocks sending if `today_emails >= daily_limit_emails`
- [x] Random delays are active
  - `campaign-worker.js`: 6-16 minute delays (lines 74-75)
  - `message-scheduler.ts`: `min_interval_minutes=6`, `max_interval_minutes=16`
- [x] Business hours and time zones enforced
  - `campaign-worker.js`: 9 AM - 6 PM ET, Mon-Fri (lines 76-79)
  - `message-scheduler.ts`: respects `business_hours_start/end` in config
- [x] 60‑day rule enforced
  - `outreach_history` table + `update_global_outreach_tracking()` trigger
  - `contacts.eligible_for_outreach` updated by trigger
  - `checkQueueEligibility()` in `process-message-queue.js` checks before sending
- [x] Account health blocks sending below 30
  - `account_capacity` view: `WHEN health_score < 30 THEN FALSE` (blocks sending)
  - `account_health` view: `can_send = FALSE` when health < 30
- [x] Queue can be paused instantly
  - Campaign status = 'paused' stops sending immediately
  - `/api/campaigns/update-status` endpoint for pause/resume
  - Workers check `campaign.status` before each send

---

## 9) Q&A Notes (CTO Review Follow‑ups)

These are direct answers to your questions so the reasoning stays attached to the plan.

**Q1: Does Railway know about the “ticket line”? How is it updated?**  
Railway runs `offer-testing/scripts/process-message-queue.js` on cron, which now pulls from `send_queue` using `claim_send_queue_item()`. That function atomically claims one row (with `SKIP LOCKED`) and marks it `processing`, which prevents two workers from sending the same item. After send, the row is updated to `sent` or `failed`, and a `message_events` row is created.

**Q2: What is the trigger + daily refresh function?**  
The trigger lives in `update_global_outreach_tracking()` and runs any time a row is inserted or updated in `outreach_history`. It updates *all* contact rows with the same email or LinkedIn URL so the 60‑day rule is enforced across offers. The daily `refresh_outreach_eligibility()` recomputes eligibility in case time has passed or statuses changed.

**Q3: How is account health calculated?**  
Right now it is a manual field plus a safety gate in `account_capacity` (health < 30 blocks sending). We don’t yet compute health automatically; next step is a small job that updates `health_score` based on recent bounce/spam rates and send volume.

**Q4: Why use an async function for the pipeline?**  
The pipeline talks to Supabase and external APIs, which are slow and return promises. `async/await` lets us pause the function until each database call finishes, so steps run in order and errors are handled safely.

**Q5: How do we know safety rules are respected?**  
The new flow checks global eligibility before sending (60‑day rule), uses queue locking to avoid duplicates, and keeps send rate limits in the scheduler/cron. You should still validate with the checklist above before running at scale.

**Q6: Do previously scheduled messages move into send_queue?**  
Not automatically. Old rows in `messages` will not send anymore because the cron now reads `send_queue`. If you need to keep them, you should backfill from `messages` into `send_queue` once.

**Q7: What is message_events and do we need webhooks now?**  
`message_events` is a timeline table that records state changes (queued/sent/failed/etc.). It’s ready for future webhook integration, but we can postpone that until volume grows.

---

## 10) Later Upgrade (Optional)

- [ ] **Digest email from `message_events`** for daily safety/health summary when volume grows.

---

## 11) Migration + Backfill (Important)

**Problem:** Pending messages from older campaigns live in `messages` and will not send now that cron reads `send_queue`.  
**Why it matters:** You could lose scheduled sends or accidentally double‑send if you re‑queue incorrectly.

**What to do (one‑time migration + backfill):**

**Step 1: Run migration (REQUIRED FIRST)**
- [ ] Open Supabase dashboard → SQL Editor
- [ ] Copy contents of `offer-testing/scripts/add-send-queue-and-outreach-history.sql`
- [ ] Paste and run in SQL Editor
- [ ] Verify tables exist: `send_queue`, `message_events`, `outreach_history`

**Step 2: Backfill pending messages**
- [x] Add `scripts/backfill-messages-to-send-queue.ts`  
- [x] Dry-run completed: Found 175 pending messages
- [ ] **Run migration first**, then: `npx ts-node scripts/backfill-messages-to-send-queue.ts`

**Step 3: Backfill sent messages (prevents duplicates)**
- [x] Add `scripts/backfill-sent-messages-to-outreach-history.ts`  
- [ ] Run: `npx ts-node scripts/backfill-sent-messages-to-outreach-history.ts --dry-run`
- [ ] Run: `npx ts-node scripts/backfill-sent-messages-to-outreach-history.ts`  

---

## 12) Visual Activity Feed (Scheduled + Sent)

**Problem:** You want a single timeline view for all scheduled and sent messages.  
**Why it matters:** It’s the easiest way to spot duplicates, pacing issues, and missing sends.

**What to implement:**
- [x] `activity_feed` view (union of `send_queue` + `outreach_history`)
- [x] `/activity` page in Next.js for a timeline view

---

## Where the Changes Live

**Schema + migrations**
- `offer-testing/scripts/setup-db.sql`
- `offer-testing/scripts/add-send-queue-and-outreach-history.sql`
- `project/supabase_schema.md`

**Queue + safety pipeline**
- `offer-testing/scripts/process-message-queue.js`
- `offer-testing/src/lib/services/message-scheduler.ts`
- `offer-testing/scripts/campaign-worker.js`
- `offer-testing/scripts/backfill-messages-to-send-queue.ts`

**Dashboard**
- `offer-testing/src/app/activity/page.tsx`
- `offer-testing/src/app/leads/page.tsx`
- `offer-testing/src/app/queue/page.tsx`
- `offer-testing/src/app/accounts/page.tsx`
- `offer-testing/src/app/campaigns/page.tsx`

**Pipeline runner**
- `offer-testing/scripts/run-lead-pipeline.ts`
