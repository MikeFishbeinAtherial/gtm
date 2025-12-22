# Claude Code Sales Ops - Versioned Roadmap

## Core Decision: Unipile as Unified Platform

**Instead of**: Smartlead (email) + Heyreach (LinkedIn) + Unipile (inbox) = $100-200+/mo + complexity

**Use**: Unipile alone ($55/mo) + Claude Code writes the sending logic

### Why This Works

| Capability | Unipile Has It? |
|------------|-----------------|
| Send LinkedIn messages | ✅ Yes |
| Send emails | ✅ Yes (connects to email accounts) |
| Check if already messaged | ✅ Yes |
| See replies | ✅ Yes |
| Check connection status | ✅ Yes (1st, 2nd, 3rd degree) |
| Conversation history | ✅ Yes |

**What Unipile does NOT do** (that we build):
- Campaign logic (sequences, timing)
- Lead sourcing (we use Parallel, TheirStack)
- Email finding (we use Leadmagic or Parallel)
- Analytics/reporting (we use Supabase)

This is fine because Claude Code can write simple scripts for all of this.

---

## Version Roadmap

```
┌─────────────────────────────────────────────────────────────────┐
│  V1: MANUAL + SINGLE TOUCH                                      │
│  ────────────────────────────────────────────────────────────── │
│  • Find leads manually or with Parallel                         │
│  • Claude drafts personalized messages                          │
│  • You send via LinkedIn/email manually OR simple script        │
│  • Track in spreadsheet or Supabase                             │
│  • Goal: Test if offer gets ANY response                        │
│                                                                 │
│  Time to build: 1-2 days                                        │
│  Cost: Unipile free trial + Parallel credits                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  V2: SEMI-AUTOMATED + MULTI-TOUCH                               │
│  ────────────────────────────────────────────────────────────── │
│  • Signal-based targeting (TheirStack job posts)                │
│  • Automated lead enrichment pipeline                           │
│  • 2-3 touch sequences with delays                              │
│  • Unipile checks for replies before next touch                 │
│  • Permissionless value campaigns                               │
│  • Basic analytics in Supabase                                  │
│                                                                 │
│  Time to build: 1-2 weeks                                       │
│  Cost: ~$100/mo (Unipile + APIs)                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  V3: FULL TAM + MULTI-OFFER TESTING                             │
│  ────────────────────────────────────────────────────────────── │
│  • Source entire TAM for a vertical                             │
│  • AI matches companies to multiple offers                      │
│  • Parallel campaigns for different offers                      │
│  • A/B testing messaging                                        │
│  • Response-based routing (hot leads → calendar)                │
│  • Full CRM with pipeline stages                                │
│                                                                 │
│  Time to build: 3-4 weeks                                       │
│  Cost: ~$150-200/mo                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## V1: Manual + Single Touch

### Goal
Test if an offer gets ANY traction with minimal infrastructure.

### What You Build

```
v1/
├── scripts/
│   ├── find_leads.py        # Search Parallel for companies/people
│   ├── check_contacted.py   # Unipile: have we messaged them?
│   ├── draft_message.py     # Claude API: personalized message
│   └── send_message.py      # Unipile: send (or just output for manual)
├── skills/
│   └── cold_email.md        # Basic email/LinkedIn copy guidance
└── data/
    └── leads.csv            # Simple spreadsheet tracking
```

### Workflow

```
1. You: "Find 20 companies hiring sales reps"
   → Claude Code runs Parallel search
   → Returns list of companies + contacts

2. You: "Draft LinkedIn messages for these"
   → Claude Code reads skill, drafts personalized messages
   → Shows you for approval

3. You: "Check if I've messaged any of these before"
   → Claude Code checks Unipile
   → Flags any existing conversations

4. You: Send manually via LinkedIn
   OR: "Send these messages" → Claude Code uses Unipile API
   
5. Track responses in spreadsheet or Supabase
```

### LinkedIn Safety (V1)

**For V1, consider fully manual sending:**
- Claude Code outputs the messages
- You copy/paste into LinkedIn
- Zero automation risk
- Still saves 80% of the work (finding leads, writing messages)

**If using Unipile to send:**
- Max 10-15 connection requests/day
- Max 20-30 messages/day (to existing connections)
- Random delays between actions (2-5 min)
- Only send during business hours
- Never on weekends

### V1 Deliverables
- [ ] Parallel API wrapper (search companies, find people)
- [ ] Unipile API wrapper (check conversations, optionally send)
- [ ] Simple Claude prompt for message drafting
- [ ] CSV or basic Supabase table for tracking

---

## V2: Semi-Automated + Multi-Touch

### Goal
Run real campaigns with sequences, signals, and tracking.

### What You Add to V1

```
v2/
├── scripts/
│   ├── ... (v1 scripts)
│   ├── theirstack_search.py    # Find companies by job postings
│   ├── sequence_runner.py       # Run multi-touch sequences
│   ├── response_checker.py      # Check Unipile for replies
│   └── analytics.py             # Pull stats from Supabase
├── skills/
│   ├── cold_email.md
│   ├── signal_brainstorming.md  # NEW: Generate targeting ideas
│   └── permissionless_value.md  # NEW: Value-first campaigns
├── sequences/
│   └── example_sequence.json    # Define touch timing
└── data/
    └── supabase schema          # Full CRM tables
```

### Sequence Logic

```python
# Example sequence definition
{
    "name": "AI Roleplay - Hiring Signal",
    "offer": "roleplay_trainer",
    "touches": [
        {
            "day": 0,
            "channel": "linkedin_connect",
            "template": "connection_request.md",
            "skip_if": ["already_connected", "already_messaged"]
        },
        {
            "day": 3,
            "channel": "linkedin_dm",
            "template": "followup_dm.md",
            "skip_if": ["replied", "not_connected"]
        },
        {
            "day": 7,
            "channel": "email",
            "template": "email_1.md",
            "skip_if": ["replied", "no_email"]
        }
    ]
}
```

### Sequence Runner Logic

```python
def run_sequence_step(lead, sequence, step_num):
    step = sequence["touches"][step_num]
    
    # Check skip conditions via Unipile
    if "already_messaged" in step["skip_if"]:
        if unipile.has_conversation(lead.linkedin_url):
            return "skipped: already messaged"
    
    if "replied" in step["skip_if"]:
        if unipile.has_reply(lead.linkedin_url):
            return "skipped: already replied"
    
    if "already_connected" in step["skip_if"]:
        if unipile.connection_degree(lead.linkedin_url) == 1:
            return "skipped: already connected"
    
    # Generate message
    message = claude.draft_message(
        template=step["template"],
        lead=lead,
        offer=sequence["offer"]
    )
    
    # Send via Unipile (or queue for manual)
    if AUTO_SEND:
        unipile.send_message(
            channel=step["channel"],
            recipient=lead,
            message=message
        )
        return "sent"
    else:
        return {"action": "manual_send", "message": message}
```

### LinkedIn Safety (V2)

**Rate Limits (Conservative)**

| Action | Daily Limit | Hourly Limit | Min Delay Between |
|--------|-------------|--------------|-------------------|
| Connection requests | 15-20 | 5 | 3-5 min |
| Messages (1st degree) | 30-40 | 10 | 2-3 min |
| Profile views | 50-80 | 15 | 1-2 min |

**Safety Features to Build**

```python
class LinkedInSafetyManager:
    def __init__(self):
        self.daily_limits = {
            "connection_request": 20,
            "message": 40,
            "profile_view": 80
        }
        self.min_delay_seconds = {
            "connection_request": 180,  # 3 min
            "message": 120,             # 2 min
            "profile_view": 60          # 1 min
        }
        self.active_hours = (9, 17)  # 9am - 5pm
        self.active_days = [0, 1, 2, 3, 4]  # Mon-Fri
    
    def can_send(self, action_type: str) -> tuple[bool, str]:
        # Check if within active hours
        now = datetime.now()
        if now.weekday() not in self.active_days:
            return False, "Weekend - no sending"
        if not (self.active_hours[0] <= now.hour < self.active_hours[1]):
            return False, "Outside business hours"
        
        # Check daily limit
        today_count = db.count_actions_today(action_type)
        if today_count >= self.daily_limits[action_type]:
            return False, f"Daily limit reached ({self.daily_limits[action_type]})"
        
        # Check time since last action
        last_action = db.get_last_action(action_type)
        if last_action:
            elapsed = (now - last_action.timestamp).seconds
            if elapsed < self.min_delay_seconds[action_type]:
                wait_time = self.min_delay_seconds[action_type] - elapsed
                return False, f"Wait {wait_time}s before next {action_type}"
        
        return True, "OK"
    
    def add_jitter(self, base_delay: int) -> int:
        """Add random variation to delays (looks more human)"""
        import random
        jitter = random.uniform(0.5, 1.5)
        return int(base_delay * jitter)
```

**Account Warming (New Accounts)**

If using a newer LinkedIn account:
- Week 1: 5 connection requests/day, 10 messages/day
- Week 2: 10 connection requests/day, 20 messages/day
- Week 3: 15 connection requests/day, 30 messages/day
- Week 4+: Normal limits

### 1st Degree Connection Handling

**Your preference**: Don't message 1st degree connections (they already know you)

```python
def should_contact(lead) -> tuple[bool, str]:
    # Check connection status via Unipile
    degree = unipile.get_connection_degree(lead.linkedin_url)
    
    if degree == 1:
        return False, "1st degree connection - skip"
    
    if degree == 2:
        return True, "2nd degree - good target"
    
    if degree == 3 or degree is None:
        return True, "3rd+ degree - send connection request first"
```

### V2 Deliverables
- [ ] TheirStack API wrapper (job posting signals)
- [ ] Sequence definition format (JSON)
- [ ] Sequence runner with skip logic
- [ ] LinkedIn safety manager
- [ ] Response monitoring (check Unipile for replies)
- [ ] Supabase CRM schema
- [ ] Ideation skills (signal_brainstorming, permissionless_value)

---

## V3: Full TAM + Multi-Offer Testing

### Goal
Source entire markets, match to multiple offers, run parallel experiments.

### What You Add to V2

```
v3/
├── scripts/
│   ├── ... (v2 scripts)
│   ├── tam_builder.py           # Source full TAM for a vertical
│   ├── offer_matcher.py         # AI matches companies to offers
│   ├── ab_test_manager.py       # Test different messaging
│   └── pipeline_manager.py      # Move leads through stages
├── skills/
│   ├── ... (v2 skills)
│   ├── offer_matching.md        # How to match company to offer
│   └── ab_testing.md            # Messaging experimentation
└── data/
    └── extended CRM schema      # Pipeline stages, offer associations
```

### TAM Building

```python
def build_tam(vertical: str, filters: dict) -> list[Company]:
    """
    Source all companies in a vertical, not just a sample.
    
    Example:
    build_tam("insurance_agencies", {
        "size_min": 10,
        "size_max": 200,
        "signals": ["hiring_sales"]
    })
    """
    companies = []
    
    # Source 1: Parallel broad search
    parallel_results = parallel.search_companies(
        query=f"{vertical} companies",
        limit=500
    )
    companies.extend(parallel_results)
    
    # Source 2: TheirStack by job postings
    if "hiring_sales" in filters.get("signals", []):
        theirstack_results = theirstack.search(
            job_titles=["sales rep", "account executive", "SDR"],
            company_size_min=filters.get("size_min"),
            company_size_max=filters.get("size_max"),
            limit=500
        )
        companies.extend(theirstack_results)
    
    # Source 3: Sumble for additional coverage
    sumble_results = sumble.search_organizations(
        query=vertical,
        size_range=(filters.get("size_min"), filters.get("size_max"))
    )
    companies.extend(sumble_results)
    
    # Dedupe by domain
    unique_companies = dedupe_by_domain(companies)
    
    # Save to Supabase
    save_to_supabase(unique_companies, vertical=vertical)
    
    return unique_companies
```

### Multi-Offer Matching

```python
def match_company_to_offers(company: Company, offers: list[Offer]) -> list[dict]:
    """
    Use Claude to determine which offers fit this company.
    """
    prompt = f"""
    Given this company:
    - Name: {company.name}
    - URL: {company.url}
    - Size: {company.size}
    - Signals: {company.signals}
    - Description: {company.description}
    
    And these offers:
    {json.dumps([o.to_dict() for o in offers])}
    
    Which offers would be a good fit? Score each 1-10 and explain why.
    Return JSON: [{{"offer_id": "...", "score": N, "reasoning": "..."}}]
    """
    
    response = claude.complete(prompt)
    return json.loads(response)
```

### V3 Deliverables
- [ ] TAM builder (multi-source aggregation)
- [ ] Offer catalog and matching system
- [ ] A/B test framework for messaging
- [ ] Pipeline stages in CRM (lead → contacted → replied → meeting → closed)
- [ ] Dashboard for cross-offer analytics

---

## Tech Stack Summary (All Versions)

| Component | Tool | Cost | Version |
|-----------|------|------|---------|
| **Unified sending** | Unipile | $55/mo | V1+ |
| **Company search** | Parallel | Credits | V1+ |
| **Job signals** | TheirStack | Credits | V2+ |
| **Org data** | Sumble | Credits | V2+ |
| **Email finding** | Leadmagic (if needed) | ~$50/mo | V1+ |
| **CRM/tracking** | Supabase | Free tier | V1+ |
| **AI** | Claude API | ~$20-50/mo | V1+ |

**Total monthly cost**: ~$75-150 depending on volume

---

## LinkedIn Safety Summary

### The Conservative Approach (Recommended)

**For V1**: Send manually. Claude Code does everything except the actual send.
- Zero risk
- Still 10x faster than doing it all yourself

**For V2+**: Use Unipile with strict limits
- Max 15-20 connection requests/day
- Max 30-40 messages/day
- Business hours only (your timezone)
- Random delays (2-5 min between actions)
- Never on weekends
- Warm up new accounts slowly

### Account-Specific Strategy

| Account | Use For | Risk Tolerance |
|---------|---------|----------------|
| Mike's LinkedIn | Sales/marketing targets | Lower (it's your main account) |
| Eugene's LinkedIn | Other verticals | Can be slightly more aggressive |

**Suggestion**: Start with manual sending on Mike's account, test automation on Eugene's account first.

### Red Flags That Get Accounts Flagged

- Sending 50+ connection requests/day
- Same message copy to everyone (looks like spam)
- Sending at 3am
- Sudden spike in activity (0 to 100)
- High rejection rate on connection requests
- Many "I don't know this person" reports

### Green Flags (Stay Safe)

- Personalized messages (even small variations help)
- Gradual ramp-up of activity
- Targeting 2nd degree connections (mutual connections)
- High acceptance rate (good targeting)
- Business hours activity
- Consistent daily patterns

---

## Getting Started: V1 This Week

### Day 1: Setup
- [ ] Sign up for Unipile free trial
- [ ] Get Parallel API key
- [ ] Create Supabase project (or just use Google Sheet)
- [ ] Set up Claude Code environment

### Day 2: Build Core Scripts
- [ ] `parallel_client.py` - Search companies/people
- [ ] `unipile_client.py` - Check conversations, connection status
- [ ] `draft_messages.py` - Claude API for personalization

### Day 3: Test Flow
- [ ] Pick an offer (AI Roleplay Trainer?)
- [ ] Find 10 companies via Parallel
- [ ] Get contacts (VP Sales, etc.)
- [ ] Check via Unipile: already contacted? connection status?
- [ ] Draft messages via Claude
- [ ] Send manually (or test Unipile send with 1-2 people)

### Day 4-5: Iterate
- [ ] Refine message copy based on what feels right
- [ ] Build simple tracking (spreadsheet or Supabase)
- [ ] Document what worked for V2

---

## Open Questions

1. **Unipile free trial** - Worth testing this week to validate it does what we need?

2. **Manual vs automated sending (V1)** - Start fully manual, or test Unipile sending immediately?

3. **Which offer first?** - AI Roleplay Trainer (hiring signal) or Redshift (tiny TAM, easy to find)?

4. **Mike's account vs Eugene's** - Who goes first? Eugene for testing, Mike for real campaigns?
