# FIRST PROMPT FOR CURSOR

Copy everything below the line and paste it into Cursor as your first message in a new project.

---

# Project Setup: Offer Testing System

## What I'm Building

An AI-powered system to test business offers through outbound outreach. The workflow:

1. **Input**: I describe a business offer (product or service)
2. **Positioning**: AI helps define positioning and value proposition
3. **ICP Generation**: AI generates Ideal Customer Profile (company + buyer criteria)
4. **Signal Ideas**: AI suggests how to find companies with the problem
5. **Company Discovery**: Find companies via multiple data APIs
6. **Contact Discovery**: Find decision-makers at those companies
7. **Email Finding**: Get verified email addresses
8. **Status Check**: Check if already contacted via Unipile
9. **Copy Generation**: Generate personalized email + LinkedIn messages
10. **Campaign Tracking**: Store everything in Supabase
11. **Send**: Manual sending for V1 (automated later)
12. **Review**: Analyze results and capture learnings

## Tech Stack

| Component | Tool |
|-----------|------|
| **Language** | TypeScript / Node.js |
| **Frontend** | React (Next.js) |
| **AI** | Claude API (Anthropic) |
| **Database** | Supabase (Postgres) |

### Data & Enrichment APIs

| Tool | Purpose | Docs |
|------|---------|------|
| **Parallel** | Company search, people search, data extraction | https://docs.parallel.ai/ |
| **Exa** | AI-powered web search for companies | https://docs.exa.ai/ |
| **Sumble** | Organization data and enrichment | https://docs.sumble.com/ |
| **TheirStack** | Job posting signals (who's hiring) | https://theirstack.com/ |
| **Leadmagic** | Email finding and verification | https://docs.leadmagic.io/ |

### Outreach & Inbox

| Tool | Purpose | Docs |
|------|---------|------|
| **Unipile** | LinkedIn + Email sending and inbox management | https://docs.unipile.com/ |

## Project Structure to Create

```
offer-testing/
├── .cursor/
│   ├── rules/                    # Cursor rules (auto-context)
│   │   ├── project.mdc           # Always apply - project overview
│   │   └── offer-management.mdc  # How to manage offers
│   └── commands/                 # Slash commands
│       ├── new-offer.md          # /new-offer
│       ├── offer-icp.md          # /offer-icp
│       ├── offer-copy.md         # /offer-copy
│       ├── offer-launch.md       # /offer-launch
│       └── offer-review.md       # /offer-review
│
├── context/                      # General context (all offers)
│   ├── frameworks/
│   │   ├── positioning-canvas.md
│   │   ├── icp-framework.md
│   │   └── signal-brainstorming.md
│   ├── copywriting/
│   │   ├── email-principles.md
│   │   └── linkedin-principles.md
│   └── learnings/
│       └── what-works.md
│
├── offers/                       # Offer-specific context
│   └── _template/                # Template for new offers
│       ├── README.md
│       ├── positioning-canvas.md
│       ├── icp.md
│       ├── copy/
│       │   ├── email-sequence.md
│       │   └── linkedin-messages.md
│       ├── research/
│       │   └── notes.md
│       └── results/
│           └── learnings.md
│
├── docs/                         # Reference documentation
│   ├── cursor-setup.md           # Full setup guide
│   ├── supabase-schema.md        # Database schema
│   ├── offer-management.md       # Process documentation
│   └── roadmap.md                # V1/V2/V3 plan
│
├── src/
│   ├── lib/                      # Shared utilities
│   │   ├── clients/              # API client wrappers
│   │   │   ├── anthropic.ts      # Claude API
│   │   │   ├── parallel.ts       # Parallel API
│   │   │   ├── exa.ts            # Exa API
│   │   │   ├── sumble.ts         # Sumble API
│   │   │   ├── theirstack.ts     # TheirStack API
│   │   │   ├── leadmagic.ts      # Leadmagic API
│   │   │   ├── unipile.ts        # Unipile API
│   │   │   └── supabase.ts       # Supabase client
│   │   ├── types/                # TypeScript types
│   │   │   ├── offer.ts
│   │   │   ├── company.ts
│   │   │   ├── contact.ts
│   │   │   └── campaign.ts
│   │   └── utils/
│   │       ├── linkedin-safety.ts # Rate limiting
│   │       └── helpers.ts
│   │
│   ├── core/                     # Business logic
│   │   ├── icp-generator.ts
│   │   ├── company-finder.ts
│   │   ├── contact-finder.ts
│   │   ├── copy-generator.ts
│   │   └── outreach-manager.ts
│   │
│   └── app/                      # Next.js app (if using app router)
│       ├── page.tsx              # Dashboard
│       ├── offers/
│       ├── companies/
│       ├── contacts/
│       └── campaigns/
│
├── scripts/
│   ├── test-apis.ts              # Test all API connections
│   └── setup-db.ts               # Run Supabase migrations
│
├── .env.example
├── .env.local                    # Local env (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.js                # If using Next.js
└── README.md
```

## Important Constraints

1. **V1 Only**: Keep it simple. No fancy automation yet.
2. **LinkedIn Safety**: Max 20 connection requests/day, 40 messages/day
3. **Skip 1st Degree**: Don't message people already connected
4. **Manual Sending**: V1 outputs messages for manual sending
5. **Future-Proof**: Structure for eventual AI agent capabilities

## Your First Task

Create the folder structure and initial configuration files:

1. Create all the folders shown above

2. Create `package.json`:
   ```json
   {
     "name": "offer-testing",
     "version": "0.1.0",
     "private": true,
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "test-apis": "npx ts-node scripts/test-apis.ts"
     },
     "dependencies": {
       "next": "^14.0.0",
       "react": "^18.2.0",
       "react-dom": "^18.2.0",
       "@supabase/supabase-js": "^2.39.0",
       "@anthropic-ai/sdk": "^0.20.0"
     },
     "devDependencies": {
       "typescript": "^5.3.0",
       "@types/node": "^20.10.0",
       "@types/react": "^18.2.0",
       "ts-node": "^10.9.0"
     }
   }
   ```

3. Create `tsconfig.json` with standard Next.js TypeScript config

4. Create `.env.example`:
   ```
   # AI
   ANTHROPIC_API_KEY=

   # Data & Enrichment
   PARALLEL_API_KEY=
   EXA_API_KEY=
   SUMBLE_API_KEY=
   THEIRSTACK_API_KEY=
   LEADMAGIC_API_KEY=

   # Outreach & Inbox
   UNIPILE_API_KEY=
   UNIPILE_DSN=

   # Database
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

5. Create `.gitignore`:
   ```
   # Dependencies
   node_modules/
   
   # Environment
   .env
   .env.local
   .env.*.local
   
   # Next.js
   .next/
   out/
   
   # Build
   dist/
   build/
   
   # IDE
   .idea/
   .vscode/
   *.swp
   
   # OS
   .DS_Store
   Thumbs.db
   
   # Logs
   *.log
   npm-debug.log*
   ```

6. Create a basic `README.md` explaining the project

7. Create placeholder files:
   - `src/lib/clients/index.ts` (export barrel)
   - `src/lib/types/index.ts` (export barrel)
   - `src/core/index.ts` (export barrel)

After you create the structure, I'll provide content for:
- Cursor rules and commands
- Context framework files  
- Supabase schema
- API client implementations

Start now - create the folder structure and configuration files.