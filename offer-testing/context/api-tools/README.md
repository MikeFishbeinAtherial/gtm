# API Tools Documentation

This directory contains detailed documentation for each API tool used in the Offer Testing System.

## Structure

Each API tool has its own directory with:
- `{tool-name}-tool-guide.md` - Overview, when to use, setup
- `examples.ts` - Code examples
- `setup.md` - Setup and configuration (if needed)
- Additional guides as needed (e.g., `hiring-signals.md`, `tech-validation.md`)

## Available Tools

### [Sumble](./sumble/sumble-tool-guide.md)
**Hiring signals and technology intelligence**
- Find companies hiring for specific roles
- Validate technology stacks
- Get job posting details for personalization

### [Unipile](./unipile/unipile-tool-guide.md)
**LinkedIn and email outreach**
- Send LinkedIn messages and connection requests
- Manage inbox and conversations
- Sync connections and message history

### [Parallel](./parallel/)
**Company and people search**
- Find companies matching ICP criteria
- Search for decision-makers
- Enrich company data (revenue, employee count, tech stack)

### [TheirStack](./theirstack/)
**Job posting signals**
- Find companies hiring for specific roles
- Track hiring velocity
- Get job posting details

### [Exa](./exa/)
**AI-powered web search**
- Discover companies by qualitative criteria
- Research industry trends
- Find decision-makers with context

### [Perplexity](./perplexity/perplexity-tool-guide.md)
**AI-powered web search and research**
- Real-time web search with AI understanding
- Company and contact research
- Industry trends and competitive intelligence
- General research with citations

### [FullEnrich](./fullenrich/fullenrich-tool-guide.md)
**Contact enrichment**
- Find work email addresses (1 credit)
- Get mobile phone numbers (10 credits)
- Find personal emails (3 credits)
- Bulk enrichment (up to 100 contacts)
- Asynchronous with webhooks

### [Firecrawl](./firecrawl/)
**Web scraping and data extraction**
- Extract structured data from websites
- Navigate and search sites autonomously
- Get pricing, features, team info

### [Leadmagic](./leadmagic/)
**Email finding and verification**
- Find personal work emails
- Verify email deliverability
- Bulk email lookups

---

## Quick Reference

See `../api-guides/` for quick reference cards and comparison guides.

---

## Decision Tree

**I need to...**

- **Find companies hiring sales** → Sumble or TheirStack
- **Send LinkedIn messages** → Unipile
- **Find companies by size/revenue** → Parallel
- **Research company context** → Exa or Perplexity
- **Research contacts/people** → Perplexity
- **Extract website data** → Firecrawl
- **Find email addresses** → FullEnrich or Leadmagic
- **Enrich contacts at scale** → FullEnrich
- **Validate tech stack** → Sumble

See `../api-guides/README.md` for detailed decision trees.
