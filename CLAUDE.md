# GTM Offer Testing System

An AI-powered B2B outbound sales campaign testing system. Tests business offers through signal-based outreach.

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5.3
- **Database:** Supabase (Postgres)
- **Deployment:** Railway.app

## Project Structure

```
gtm/
├── offer-testing/              # Main application
│   ├── src/
│   │   ├── app/                # Next.js pages/routes
│   │   ├── core/               # Business logic
│   │   │   ├── company-finder.ts
│   │   │   ├── contact-finder.ts
│   │   │   ├── copy-generator.ts
│   │   │   ├── icp-generator.ts
│   │   │   └── outreach-manager.ts
│   │   └── lib/
│   │       ├── clients/        # API clients (11 integrations)
│   │       ├── services/       # Business services
│   │       ├── types/          # TypeScript types
│   │       └── utils/          # Utilities
│   ├── offers/                 # Per-offer data
│   │   └── {slug}/
│   │       ├── {slug}-positioning.md
│   │       ├── campaigns/{campaign}/strategy.md
│   │       ├── copy/{campaign}/email-variants.md
│   │       ├── leads/{campaign}/export.csv
│   │       └── results/{campaign}-learnings.md
│   ├── scripts/                # 76 automation scripts
│   ├── context/                # Frameworks, copywriting guides
│   └── docs/                   # API guides, learnings
└── project/                    # Documentation archive
```

## Core Workflow (6 Phases)

| Phase | Command | Cost | Output |
|-------|---------|------|--------|
| 1 | `1-new-offer` | Free | Positioning canvas + ICP |
| 2 | `2-offer-campaigns` | Free | Signal strategies |
| 3 | `3-campaign-copy` | Free | Email + LinkedIn variants |
| 4 | `4-campaigns-leads` | API credits | Companies + contacts |
| 5 | `5-leads-outreach` | Free | Messages sent |
| 6 | `6-campaign-review` | Free | Learnings captured |

**Key insight:** Quality depends on signals. Random companies = spam. Companies experiencing the problem = relevant.

## API Integrations

### Data & Enrichment
| API | Purpose |
|-----|---------|
| **Parallel** | Company/people search, enrichment (PRIMARY) |
| **TheirStack** | Job posting signals (hiring detection) |
| **Exa** | AI-powered web search |
| **Sumble** | Company enrichment |
| **Firecrawl** | Web scraping |
| **Leadmagic** | Email finding/verification |
| **FullEnrich** | Cell phones, additional enrichment |
| **Perplexity** | Web search alternative |

### Outreach
| API | Purpose |
|-----|---------|
| **Unipile** | LinkedIn + Email sending/inbox |

## API Routing Logic

```
Signal = "Hiring [role]"     → TheirStack
Signal = "Using [tech]"      → Parallel (tech stack filter)
Signal = "Company growth"    → Parallel (employee trends)
Signal = "Recent funding"    → Exa (search funding news)
No specific signal           → Parallel (ICP firmographics)
```

## LinkedIn Safety (Non-Negotiable)

- Max 20 connection requests/day (stop at 18)
- Max 40 messages/day (stop at 38)
- 2-5 minute delays between actions (random jitter)
- Business hours only: 9am-6pm weekdays (recipient timezone)
- Skip 1st degree connections
- Skip already contacted

## Coding Conventions

- Use TypeScript strict mode
- API clients in `src/lib/clients/`
- Business logic in `src/core/`
- Types in `src/lib/types/`
- Scripts use `.ts` extension, run with `ts-node`
- Environment variables in `.env.local`

## Outreach Frameworks

### Permissionless Value (PVP)
Give value BEFORE asking. Use for breaking into new accounts.
- Reference: `context/frameworks/permissionless-value.md`

### Use Case-Driven
Work backwards from the perfect email. Deep research per company.
- Reference: `context/frameworks/use-case-driven-outreach.md`

## Database Tables (Supabase)

- `companies` - Discovered companies
- `contacts` - Decision-makers
- `campaign_contacts` - Campaign-contact mapping
- `messages` - Outreach messages
- `account_activity` - LinkedIn/email activity log
- `tool_usage` - API call logging for cost tracking

## Common Commands

```bash
# Development
npm run dev                    # Start Next.js dev server
npm run build                  # Build for production

# Testing APIs
npm run test-apis              # Test all API connections
npm run test-parallel          # Test Parallel API
npm run test-exa               # Test Exa API

# Campaign operations
npm run campaign:worker        # Run campaign worker
npm run campaign:start         # Start networking campaign
```

## V1 Constraints

- Human-in-loop: User reviews before sending
- No full TAM sourcing (V2)
- No multi-offer matching (V2)
- No A/B testing infrastructure (V2)
