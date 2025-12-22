# Offer Testing System

An AI-powered system to test business offers through outbound outreach.

## What This Does

1. **Input**: Describe a business offer (product or service)
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

| Tool | Purpose |
|------|---------|
| **Parallel** | Company search, people search, data extraction |
| **Exa** | AI-powered web search for companies |
| **Sumble** | Organization data and enrichment |
| **TheirStack** | Job posting signals (who's hiring) |
| **Leadmagic** | Email finding and verification |

### Outreach & Inbox

| Tool | Purpose |
|------|---------|
| **Unipile** | LinkedIn + Email sending and inbox management |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- API keys for: Anthropic, Parallel, Exa, Sumble, TheirStack, Leadmagic, Unipile

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Fill in your API keys in `.env.local`

5. Set up Supabase:
   - Create a new Supabase project
   - Run the schema from `scripts/setup-db.sql`
   - Copy your project URL and keys to `.env.local`

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Test API connections:
   ```bash
   npm run test-apis
   ```

## Project Structure

```
offer-testing/
├── .cursor/
│   ├── rules/          # Cursor rules (auto-context)
│   └── commands/       # Slash commands (/new-offer, etc.)
│
├── context/            # General context (all offers)
│   ├── frameworks/     # Positioning, ICP, signal frameworks
│   ├── copywriting/    # Email and LinkedIn best practices
│   ├── examples/       # Good examples to reference
│   └── learnings/      # Cross-offer learnings
│
├── offers/             # Offer-specific context
│   └── _template/      # Template for new offers
│
├── src/
│   ├── lib/
│   │   ├── clients/    # API client wrappers
│   │   ├── types/      # TypeScript types
│   │   └── utils/      # Helpers and utilities
│   ├── core/           # Business logic
│   └── app/            # Next.js app router
│
├── scripts/            # Setup and utility scripts
└── docs/               # Documentation
```

## Cursor Commands

Use these slash commands to work with offers:

| Command | Description |
|---------|-------------|
| `/new-offer` | Create a new offer with positioning canvas |
| `/offer-research` | Research competitors and market |
| `/offer-icp` | Generate ICP from positioning |
| `/offer-copy` | Generate email and LinkedIn copy |
| `/offer-launch` | Find companies, contacts, prepare outreach |
| `/offer-review` | Analyze results and capture learnings |

## Important Constraints (V1)

1. **V1 Only**: Keep it simple. No fancy automation yet.
2. **LinkedIn Safety**: Max 20 connection requests/day, 40 messages/day
3. **Skip 1st Degree**: Don't message people already connected
4. **Manual Sending**: V1 outputs messages for manual sending
5. **Future-Proof**: Structure for eventual AI agent capabilities

## License

Private - All rights reserved

