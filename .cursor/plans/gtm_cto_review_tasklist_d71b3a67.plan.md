---
name: gtm_cto_review_tasklist
overview: Review the CTO proposal, align the data model and safety rules with the current codebase, add global outreach tracking + send queue, update the sender/scheduler, add a simple visual dashboard, and document the implementation tasks in a dedicated markdown file.
todos: []
isProject: false
---

# Safety-First Visibility Upgrade Plan

## Assumptions

- Tasklist file will live next to the CTO doc as [`project/jan252026_currentgtm_proposedSEP_tasklist.md`](project/jan252026_currentgtm_proposedSEP_tasklist.md) so the reasoning and tasks stay together.
- Visual interface will be built inside the existing Next.js app (no separate tool), using read-only views plus a few safe actions.

## Plan

- Align taxonomy so every table uses the same words for channels, campaign types, statuses, and tools (problem: mismatched labels cause bugs and confusing filters). Update schema definitions and docs in [`offer-testing/scripts/setup-db.sql`](offer-testing/scripts/setup-db.sql) and [`project/supabase_schema.md`](project/supabase_schema.md); add a single source of truth (enum or lookup tables) and map existing values to it.
- Add global outreach tracking and a true send queue (problem: you can’t see what’s scheduled or enforce the 60‑day rule across offers). Create a migration SQL file (e.g. [`offer-testing/scripts/add-send-queue-and-outreach-history.sql`](offer-testing/scripts/add-send-queue-and-outreach-history.sql)) to add `send_queue`, `message_events`, and `outreach_history`, plus global contact fields and partial indexes (per Postgres best practices). Add views for UI (`leads_for_review`, `todays_schedule`, `account_capacity`).
- Update scheduling + sending pipeline to use the new queue as the single source of truth (problem: current workers write directly to `messages`, making visibility and pause/resume hard). Modify [`offer-testing/src/lib/services/message-scheduler.ts`](offer-testing/src/lib/services/message-scheduler.ts), [`offer-testing/scripts/process-message-queue.js`](offer-testing/scripts/process-message-queue.js), and [`offer-testing/scripts/campaign-worker.js`](offer-testing/scripts/campaign-worker.js) to read from `send_queue`, enforce per‑account warmup limits/timezones, use `SKIP LOCKED` for concurrency, and write to `message_events`/`outreach_history`.
- Build the visual dashboard pages inside the existing app (problem: Supabase tables are hard to interpret). Add pages under [`offer-testing/src/app`](offer-testing/src/app) for leads, queue, accounts, and campaigns; wire them to the new views via server actions or API routes; keep actions minimal and safe (approve/skip/pause).
- Add a lightweight “multi‑step runner” for lead sourcing (problem: you want chained actions without a full workflow builder). Implement a simple pipeline script (e.g. [`offer-testing/scripts/run-lead-pipeline.ts`](offer-testing/scripts/run-lead-pipeline.ts)) with a small `pipeline_runs` table to track each step and results.
- Write the implementation tasklist file with beginner‑friendly explanations (problem: hard to know what to build and why). Create [`project/jan252026_currentgtm_proposedSEP_tasklist.md`](project/jan252026_currentgtm_proposedSEP_tasklist.md) with sections for each component, the problem it solves, and why it matters for safety/visibility.
- Backfill and verify safety rules (problem: existing data won’t automatically get the new global fields). Add a backfill SQL section in the migration file and a quick verification checklist; update [`project/supabase_schema.md`](project/supabase_schema.md) to reflect the final schema.

todos:

- id: taxonomy-and-schema
content: Align channel/campaign/tool taxonomy across schema + docs
- id: queue-and-tracking
content: Add send_queue, message_events, outreach_history + views
- id: update-sender-pipeline
content: Move scheduler/worker to send_queue with safety rules
- id: dashboards
content: Add Next.js dashboard pages wired to views
- id: lead-pipeline
content: Implement lightweight multi-step lead runner
- id: tasklist-doc
content: Create implementation tasklist markdown file