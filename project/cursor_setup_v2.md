# Cursor Project Setup: Offer Testing System

## How to Use Cursor's Features

### 1. Project Rules (`.cursor/rules/`)

**What they are**: Persistent instructions that guide the AI's behavior. They're like system prompts that automatically apply based on context.

**Where they live**: `.cursor/rules/*.mdc` files in your project (version controlled)

**Types of rules**:
- **Always Apply**: Rules that apply to every conversation (project-wide standards)
- **Auto Attached**: Rules that trigger when certain file patterns match (e.g., `*.py` files)
- **Agent Requested**: Rules the AI can choose to use based on description

**For our project, create these rules**:

```
.cursor/
├── rules/
│   ├── project.mdc          # Always apply - project overview & standards
│   ├── python-backend.mdc   # Auto attach for *.py - Python conventions
│   ├── react-frontend.mdc   # Auto attach for *.tsx - React conventions
│   ├── api-clients.mdc      # Auto attach for src/clients/* - API integration patterns
│   └── skills.mdc           # Agent requested - how to use skill files
```

### 2. Custom Commands (`.cursor/commands/`)

**What they are**: Reusable prompt templates triggered with `/command-name`. Like macros for common tasks.

**Where they live**: `.cursor/commands/*.md` files

**Key difference from Rules**: Commands are YOUR prompt (carry more weight), Rules are appended context.

**For our project, create these commands**:

```
.cursor/commands/
├── new-offer.md             # /new-offer - Generate ICP + copy for a new offer
├── find-companies.md        # /find-companies - Search for companies via Parallel
├── find-contacts.md         # /find-contacts - Find people at companies
├── check-status.md          # /check-status - Check contact status via Unipile
├── generate-copy.md         # /generate-copy - Generate email/LinkedIn messages
├── test-api.md              # /test-api - Test API connections
└── run-outreach.md          # /run-outreach - Execute outreach workflow
```

### 3. Agent Mode

**What it is**: Cursor's autonomous mode that can execute multi-step tasks, run terminal commands, and edit files.

**How to use**: Just describe what you want in natural language. The agent will plan and execute.

**For our project**: The agent will be your main interface. You describe the offer, it orchestrates everything.

---

## Project Rules Files

### `.cursor/rules/project.mdc`

```mdc
---
description: Core project context and standards for the Offer Testing System
globs: 
alwaysApply: true
---

# Offer Testing System - Project Context

## What This Project Does
An AI-powered system to test business offers through outbound outreach:
1. Takes an offer description as input
2. Generates Ideal Customer Profile (ICP)
3. Finds companies and contacts matching the ICP
4. Checks if already contacted (via Unipile)
5. Generates personalized outreach copy
6. Tracks everything in Supabase

## Tech Stack
- **Language**: Python 3.11+ (backend), Next.js/React (UI)
- **AI**: Claude API (Anthropic) - use claude-sonnet-4-20250514
- **Company/People Search**: Parallel API
- **Outreach + Inbox**: Unipile API (handles LinkedIn AND email)
- **Email Finding**: Leadmagic API (if needed)
- **Database**: Supabase (Postgres)

## Key Constraints
- **V1 ONLY**: Do NOT build V2/V3 features (signal-based targeting, permissionless value, full TAM)
- **LinkedIn Safety**: Max 20 connection requests/day, max 40 messages/day, business hours only
- **Skip 1st Degree**: Never message people already connected (connection_degree = 1)

## Project Structure
@file ../README.md

## API Documentation
- Parallel: https://docs.parallel.ai/
- Unipile: https://docs.unipile.com/
- Leadmagic: https://docs.leadmagic.io/
- Supabase: https://supabase.com/docs
```

### `.cursor/rules/python-backend.mdc`

```mdc
---
description: Python backend conventions and patterns
globs: ["*.py"]
alwaysApply: false
---

# Python Backend Standards

## Code Style
- Use Python 3.11+ features
- Type hints on all functions
- Docstrings for public functions
- Use `httpx` for HTTP requests (async-friendly)
- Use `pydantic` for data validation
- Use environment variables for API keys (python-dotenv)

## API Client Pattern
All API clients should follow this pattern:

```python
import httpx
from typing import Optional
import os

class ExampleClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("EXAMPLE_API_KEY")
        if not self.api_key:
            raise ValueError("API key required")
        self.base_url = "https://api.example.com/v1"
        self.client = httpx.Client(
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=30.0
        )
    
    def search(self, query: str) -> list[dict]:
        """Search for items."""
        response = self.client.post(
            f"{self.base_url}/search",
            json={"query": query}
        )
        response.raise_for_status()
        return response.json()["results"]
```

## Error Handling
- Catch specific exceptions, not bare `except`
- Log errors with context
- Return structured error responses

## File Organization
- `src/clients/` - API client wrappers
- `src/core/` - Business logic
- `src/utils/` - Helpers and utilities
- `skills/` - AI prompt templates (markdown)
```

### `.cursor/rules/api-clients.mdc`

```mdc
---
description: API integration patterns for Parallel, Unipile, etc.
globs: ["src/clients/*.py"]
alwaysApply: false
---

# API Client Guidelines

## Parallel API
- Use `findall` for company/people search
- Use `extract` for pulling data from URLs
- Always handle pagination if results > 100

## Unipile API
- Check conversation history before any outreach
- Always check connection degree (skip 1st degree)
- Log all LinkedIn activity to `linkedin_activity` table
- Respect rate limits (built into LinkedInSafetyManager)

## Rate Limiting
All clients should implement rate limiting:
- Use `time.sleep()` with jitter between requests
- Track daily limits in database
- Fail gracefully when limits reached

## Response Handling
- Always validate response structure
- Handle empty results gracefully
- Log API errors with full context
```

### `.cursor/rules/skills.mdc`

```mdc
---
description: How to use and create skill files for AI prompts
globs: ["skills/*.md"]
alwaysApply: false
---

# Skills System

## What Skills Are
Skills are markdown files that serve as detailed prompts for Claude. They contain:
- Instructions for a specific task
- Examples and templates
- Output format specifications

## How to Use Skills
When generating content (ICP, email copy, etc.):
1. Read the relevant skill file
2. Use it as the system prompt for Claude
3. Pass user input as the user message
4. Parse structured output (usually JSON)

## Existing Skills
- `skills/icp_generator.md` - Generate ICP from offer description
- `skills/email_copywriter.md` - Write cold email sequences
- `skills/linkedin_copywriter.md` - Write LinkedIn messages

## Creating New Skills
Follow this template:
```markdown
# Skill Name

## Purpose
What this skill does

## Input
What information is needed

## Output Format
Expected JSON/text structure

## Instructions
Step-by-step guidance

## Examples
Good examples of input → output
```
```

---

## Custom Commands

### `.cursor/commands/new-offer.md`

```markdown
# Create New Offer

Generate a complete offer setup including ICP and copy.

## Input Required
- Offer name
- Offer description (what problem it solves, for whom)

## Steps
1. Read `skills/icp_generator.md` for ICP generation instructions
2. Generate ICP with:
   - Company criteria (size, vertical, simple signals)
   - Buyer titles
   - Disqualifiers
3. Read `skills/email_copywriter.md` for email writing instructions
4. Generate 3-email sequence with personalization variables
5. Read `skills/linkedin_copywriter.md` for LinkedIn instructions
6. Generate connection request + follow-up DM
7. Save offer to Supabase `offers` table
8. Return summary of what was created

## Output
- Offer ID
- ICP summary
- Email templates preview
- LinkedIn templates preview

## Example Usage
```
/new-offer

Offer: AI Roleplay Training
Description: We build custom AI bots that sales reps can practice with 24/7. 
Reps get realistic objection handling practice and instant feedback.
Target: Companies with sales teams who need to ramp new hires faster.
```
```

### `.cursor/commands/find-companies.md`

```markdown
# Find Companies

Search for companies matching an offer's ICP using Parallel API.

## Input Required
- Offer ID (to get ICP criteria)
- Limit (default: 30)

## Steps
1. Fetch offer from Supabase to get ICP
2. Construct Parallel API search query from ICP criteria
3. Execute search via `src/clients/parallel_client.py`
4. Score each company against ICP (1-10 fit score)
5. Save companies to Supabase `companies` table
6. Return summary with top companies

## Constraints
- Only search, don't find contacts yet
- Log the query used for debugging
- Handle empty results gracefully

## Example Usage
```
/find-companies offer_id=abc-123 limit=50
```
```

### `.cursor/commands/find-contacts.md`

```markdown
# Find Contacts

Find decision makers at companies using Parallel API.

## Input Required
- Offer ID (to get buyer titles from ICP)
- Optional: specific company IDs (otherwise all companies for offer)

## Steps
1. Fetch offer to get target buyer titles
2. Fetch companies for the offer
3. For each company:
   a. Search Parallel for people with target titles
   b. Get LinkedIn URLs
   c. Try to get email (or flag for Leadmagic enrichment)
4. Save contacts to Supabase `contacts` table
5. Return summary

## Constraints
- Max 5 contacts per company
- Prioritize senior titles (VP > Director > Manager)
- Log companies where no contacts found

## Example Usage
```
/find-contacts offer_id=abc-123
```
```

### `.cursor/commands/check-status.md`

```markdown
# Check Contact Status

Check Unipile for existing conversations and connection status.

## Input Required
- Offer ID (to get contacts)
- LinkedIn account to check ('mike' or 'eugene')

## Steps
1. Fetch contacts for the offer
2. For each contact with LinkedIn URL:
   a. Check Unipile for existing conversation
   b. Get connection degree (1st, 2nd, 3rd)
   c. Update contact record in Supabase
3. Flag contacts to skip:
   - already_contacted = true (have messaged before)
   - connection_degree = 1 (already connected - skip these)
4. Return summary with counts

## Output
- Total contacts checked
- Already contacted: N
- 1st degree (skip): N
- 2nd degree (good targets): N
- 3rd degree (need connection request): N

## Example Usage
```
/check-status offer_id=abc-123 account=mike
```
```

### `.cursor/commands/generate-copy.md`

```markdown
# Generate Outreach Copy

Generate personalized email and LinkedIn messages for contacts.

## Input Required
- Offer ID

## Steps
1. Fetch offer (for copy templates)
2. Fetch contacts ready for outreach (not already_contacted, not 1st degree)
3. For each contact:
   a. Generate personalized email using template + contact/company data
   b. Generate personalized LinkedIn message
   c. Save to `outreach` table with status='pending'
4. Return preview of generated messages

## Personalization Variables
- {{first_name}}
- {{company_name}}
- {{title}}
- Custom variables from company signals

## Example Usage
```
/generate-copy offer_id=abc-123
```
```

### `.cursor/commands/test-api.md`

```markdown
# Test API Connections

Verify all API integrations are working.

## Steps
1. Test Anthropic API (Claude)
   - Send simple completion request
   - Verify response
   
2. Test Parallel API
   - Search for "test company"
   - Verify results structure
   
3. Test Unipile API
   - Check connection status
   - Verify can read conversations
   
4. Test Supabase
   - Insert test record
   - Read it back
   - Delete it

5. Test Leadmagic API (if configured)
   - Verify email finding works

## Output
For each API:
- ✅ Connected successfully
- ❌ Failed: [error message]

## Example Usage
```
/test-api
```
```

---

## Database Architecture: What Goes Where

### Supabase (Remote Database) - Source of Truth

**Store in Supabase**:
- **Offers**: ICP, copy templates, status
- **Companies**: All discovered companies
- **Contacts**: All discovered contacts
- **Outreach**: Every message sent/received
- **LinkedIn Activity**: Rate limit tracking

**Why Supabase**:
- Persistent across sessions
- Queryable for analytics
- Prevents duplicate outreach
- Team accessible (if needed later)
- Real-time features for UI

### Local/Git (Codebase)

**Store in Git**:
- **Skills** (`skills/*.md`): AI prompt templates
- **Cursor Rules** (`.cursor/rules/`): Project conventions
- **Cursor Commands** (`.cursor/commands/`): Workflow automation
- **API Clients** (`src/clients/`): Integration code
- **Configuration** (`.env.example`): Template for env vars

**Why Git**:
- Version controlled
- Shareable/reproducible
- Part of the codebase

### Local Only (Not in Git)

**Store locally, gitignored**:
- **`.env`**: Actual API keys
- **`data/cache/`**: Temporary API response cache (optional)
- **Logs**: Debug output

### Decision Matrix

| Data Type | Where | Why |
|-----------|-------|-----|
| Offers + ICP | Supabase | Persist across sessions, queryable |
| Companies | Supabase | Large dataset, needs querying |
| Contacts | Supabase | Track status, avoid duplicates |
| Outreach records | Supabase | CRM functionality, analytics |
| Rate limit tracking | Supabase | Persist across sessions |
| Skill prompts | Git | Version control, iterate on prompts |
| API clients | Git | Code, version control |
| Cursor rules | Git | Project standards |
| API keys | Local .env | Security |

---

## Supabase Schema

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Offers we're testing
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icp JSONB,  -- Generated ICP
    email_templates JSONB,  -- 3-email sequence
    linkedin_templates JSONB,  -- Connection + DM
    status TEXT DEFAULT 'draft',  -- draft, active, paused, completed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies discovered for each offer
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT,
    description TEXT,
    size TEXT,  -- '1-10', '11-50', '51-200', '201-500', '500+'
    vertical TEXT,
    signals JSONB,  -- {hiring_sales: true, tech_stack: [...]}
    fit_score INTEGER CHECK (fit_score >= 1 AND fit_score <= 10),
    source TEXT,  -- 'parallel', 'manual'
    raw_data JSONB,  -- Full API response for debugging
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(offer_id, url)  -- No duplicate companies per offer
);

-- Contacts at companies
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT GENERATED ALWAYS AS (
        COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
    ) STORED,
    title TEXT,
    email TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    linkedin_url TEXT,
    connection_degree INTEGER,  -- 1, 2, 3, or NULL
    already_contacted BOOLEAN DEFAULT FALSE,
    source TEXT,  -- 'parallel', 'leadmagic', 'manual'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(offer_id, linkedin_url)  -- No duplicate contacts per offer
);

-- Outreach tracking (the CRM part)
CREATE TABLE outreach (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('linkedin_connect', 'linkedin_dm', 'email')),
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Ready to send
        'queued',       -- In queue, waiting for rate limit
        'rate_limited', -- Hit daily limit, try tomorrow
        'sent',         -- Successfully sent
        'delivered',    -- Email delivered (not bounced)
        'opened',       -- Email opened
        'replied',      -- Got a response
        'meeting',      -- Meeting booked
        'not_interested', -- Declined
        'bounced',      -- Email bounced
        'failed'        -- Send failed
    )),
    message_sent TEXT,  -- Actual message that was sent
    personalization JSONB,  -- Variables used
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    reply_text TEXT,
    reply_sentiment TEXT CHECK (reply_sentiment IN ('positive', 'negative', 'neutral', 'question')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LinkedIn activity for rate limiting
CREATE TABLE linkedin_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account TEXT NOT NULL,  -- 'mike' or 'eugene'
    action_type TEXT NOT NULL CHECK (action_type IN ('connection_request', 'message', 'profile_view')),
    contact_id UUID REFERENCES contacts(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rate limit queries
CREATE INDEX idx_linkedin_activity_daily 
ON linkedin_activity (account, action_type, created_at);

-- View: Today's LinkedIn activity count
CREATE VIEW linkedin_daily_counts AS
SELECT 
    account,
    action_type,
    COUNT(*) as count,
    DATE(created_at) as date
FROM linkedin_activity
WHERE created_at >= CURRENT_DATE
GROUP BY account, action_type, DATE(created_at);

-- View: Contacts ready for outreach
CREATE VIEW contacts_ready_for_outreach AS
SELECT c.*, co.name as company_name, co.url as company_url
FROM contacts c
JOIN companies co ON c.company_id = co.id
WHERE c.already_contacted = FALSE
AND (c.connection_degree IS NULL OR c.connection_degree > 1)  -- Skip 1st degree
AND NOT EXISTS (
    SELECT 1 FROM outreach o 
    WHERE o.contact_id = c.id 
    AND o.status NOT IN ('failed', 'bounced')
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_offers_updated_at
    BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_outreach_updated_at
    BEFORE UPDATE ON outreach
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Project File Structure

```
offer-testing/
├── .cursor/
│   ├── rules/
│   │   ├── project.mdc           # Always apply - project context
│   │   ├── python-backend.mdc    # Auto attach *.py
│   │   ├── react-frontend.mdc    # Auto attach *.tsx
│   │   ├── api-clients.mdc       # Auto attach src/clients/*
│   │   └── skills.mdc            # Agent requested - skill usage
│   └── commands/
│       ├── new-offer.md          # /new-offer
│       ├── find-companies.md     # /find-companies
│       ├── find-contacts.md      # /find-contacts
│       ├── check-status.md       # /check-status
│       ├── generate-copy.md      # /generate-copy
│       └── test-api.md           # /test-api
│
├── skills/                        # AI prompt templates
│   ├── icp_generator.md
│   ├── email_copywriter.md
│   └── linkedin_copywriter.md
│
├── src/
│   ├── clients/                   # API wrappers
│   │   ├── __init__.py
│   │   ├── anthropic_client.py
│   │   ├── parallel_client.py
│   │   ├── unipile_client.py
│   │   ├── leadmagic_client.py
│   │   └── supabase_client.py
│   │
│   ├── core/                      # Business logic
│   │   ├── __init__.py
│   │   ├── icp_generator.py
│   │   ├── company_finder.py
│   │   ├── contact_finder.py
│   │   ├── copywriter.py
│   │   └── outreach_checker.py
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   └── linkedin_safety.py
│   │
│   └── main.py                    # CLI entry point
│
├── ui/                            # Next.js frontend
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx           # Dashboard
│   │       ├── offers/
│   │       ├── companies/
│   │       ├── contacts/
│   │       └── outreach/
│   └── package.json
│
├── scripts/
│   ├── setup_supabase.sql         # Database schema
│   └── test_apis.py
│
├── .env.example
├── .gitignore
├── requirements.txt
├── package.json
└── README.md
```

---

## Initial Cursor Prompt

Copy this into Cursor to get started:

```
I'm setting up a project to test business offers through outbound outreach. 
Please help me create the initial project structure.

## What I Need

1. Create the folder structure shown in the project.mdc rule
2. Set up the Cursor rules in .cursor/rules/
3. Set up the Cursor commands in .cursor/commands/
4. Create placeholder skill files in skills/
5. Create the Supabase schema SQL file
6. Set up basic Python project files (requirements.txt, .env.example)
7. Create a simple README.md

## Tech Stack
- Python 3.11+ for backend
- Next.js for simple UI
- Supabase for database
- APIs: Parallel, Unipile, Claude, Leadmagic

## Important Constraints
- V1 ONLY - keep it simple
- LinkedIn safety: max 20 connections/day, 40 messages/day
- Skip 1st degree connections

## Read First
Before generating code, read the project rules I'll create:
- .cursor/rules/project.mdc (project context)
- .cursor/rules/python-backend.mdc (Python patterns)
- .cursor/rules/api-clients.mdc (API integration patterns)

Start by creating the .cursor/rules/ files, then the folder structure, 
then we'll build out each component.
```

---

## Summary

### Cursor Features Usage

| Feature | Purpose | Files |
|---------|---------|-------|
| **Rules** | Persistent context, auto-applied | `.cursor/rules/*.mdc` |
| **Commands** | Reusable workflows, triggered with `/` | `.cursor/commands/*.md` |
| **Agent** | Natural language orchestration | Just talk to it |

### Database Split

| Data | Location | Reason |
|------|----------|--------|
| Offers, Companies, Contacts, Outreach | Supabase | Persistent, queryable, CRM |
| Skills, Rules, Commands, Code | Git | Version controlled |
| API Keys, Cache | Local (.gitignore) | Security, ephemeral |

### V1 Scope Reminder
- ✅ ICP from offer
- ✅ Company search (Parallel)
- ✅ Contact search (Parallel)
- ✅ Status check (Unipile)
- ✅ Copy generation (Claude)
- ✅ Simple UI
- ✅ Rate limiting
- ❌ Signal-based targeting (V2)
- ❌ Permissionless value (V2)
- ❌ Full TAM (V3)
