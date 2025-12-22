# Product Roadmap

## Vision

An AI-powered system that tests business offers through intelligent outbound outreach, learns from results, and continuously improves targeting and messaging.

---

## V1: Foundation (Current)

**Goal:** Manual outreach with AI assistance for ICP and copy generation.

### Features

- [x] Offer management with positioning canvas
- [x] AI-generated ICP from positioning
- [x] AI-generated email and LinkedIn copy
- [x] Company discovery via Parallel, Exa, Sumble, TheirStack
- [x] Contact discovery and email enrichment
- [x] LinkedIn status checking (connection degree, conversations)
- [x] Rate limit tracking and safety
- [x] Supabase storage for all data
- [x] Cursor slash commands for workflow

### Constraints

- Manual message sending (review before send)
- Max 20 connection requests/day per account
- Max 40 messages/day per account
- Skip 1st degree connections

### Tech Stack

- TypeScript / Node.js
- Next.js (frontend)
- Supabase (database)
- Claude API (AI)
- Parallel, Exa, Sumble, TheirStack (data)
- Leadmagic (email)
- Unipile (LinkedIn/email inbox)

---

## V2: Signal-Based Targeting

**Goal:** Find companies based on buying signals, not just firmographics.

### Planned Features

- [ ] Signal detection engine
  - Job posting signals (TheirStack)
  - Funding signals (Crunchbase)
  - Tech stack signals (BuiltWith)
  - Content signals (LinkedIn posts)
- [ ] Signal scoring and prioritization
- [ ] Trigger-based outreach
  - "Just raised Series A"
  - "Hiring first SDR"
  - "Posted about [problem]"
- [ ] Multi-signal combinations
- [ ] Signal freshness decay
- [ ] Automated company monitoring

### Expected Impact

- Higher response rates (relevant timing)
- Better quality conversations
- More efficient prospecting

---

## V3: Permissionless Value

**Goal:** Lead with value before asking for anything.

### Planned Features

- [ ] Value asset generation
  - Industry reports
  - Benchmark data
  - Personalized insights
- [ ] Insight-based outreach
  - "Noticed X about your company"
  - "Compared to peers, you..."
- [ ] Content personalization at scale
- [ ] Drip campaigns with value
- [ ] Engagement tracking (downloads, views)

### Expected Impact

- Build trust before pitch
- Higher engagement rates
- Warmer conversations

---

## V4: Full TAM Coverage

**Goal:** Systematically reach every potential customer.

### Planned Features

- [ ] TAM mapping and tracking
- [ ] Multi-channel orchestration
  - LinkedIn
  - Email
  - Phone (via integration)
  - Events
- [ ] Account-based coordination
- [ ] Territory management
- [ ] Pipeline forecasting
- [ ] A/B testing framework
- [ ] Automated optimization

### Expected Impact

- No missed opportunities
- Predictable pipeline
- Scalable outreach

---

## V5: AI Agent Mode

**Goal:** Fully autonomous outreach with human oversight.

### Planned Features

- [ ] Autonomous prospecting
- [ ] Self-improving copy
- [ ] Conversation handling
- [ ] Meeting scheduling
- [ ] Objection handling
- [ ] Human escalation rules
- [ ] Learning from results

### Expected Impact

- 24/7 prospecting
- Consistent quality
- Scale without headcount

---

## Backlog (Unscheduled)

### Integrations

- [ ] CRM sync (Salesforce, HubSpot)
- [ ] Calendar integration (Calendly, Cal.com)
- [ ] Slack notifications
- [ ] Zapier/Make webhooks
- [ ] Phone integration (Dialpad, Aircall)

### Analytics

- [ ] Campaign dashboards
- [ ] Conversion funnels
- [ ] A/B test results
- [ ] Revenue attribution
- [ ] Competitive intelligence

### Team Features

- [ ] Multi-user support
- [ ] Role-based permissions
- [ ] Approval workflows
- [ ] Team performance tracking
- [ ] Shared learnings

### Content

- [ ] Email template library
- [ ] Subject line database
- [ ] Objection response library
- [ ] Industry-specific templates

---

## Success Metrics

### V1 Goals

| Metric | Target |
|--------|--------|
| Time to first outreach | < 2 hours |
| Reply rate | > 10% |
| Positive reply rate | > 30% |
| Meeting rate | > 5% |

### Long-Term Goals

| Metric | Target |
|--------|--------|
| Prospects contacted/month | 1,000+ |
| Reply rate | > 20% |
| Meeting rate | > 10% |
| Time per prospect | < 5 min |

---

## Current Sprint

**Focus:** V1 completion and first offer tests

1. Complete foundation setup
2. Test with first offer (AI Roleplay Trainer)
3. Gather learnings
4. Iterate on ICP and copy
5. Document what works

