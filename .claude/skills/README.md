# GTM Skills for Claude Code

Portable skills for the GTM Offer Testing System. These skills work across Claude Code CLI, the Anthropic API, and claude.ai.

## Available Skills

| Skill | Phase | Description | Cost |
|-------|-------|-------------|------|
| `offer-positioning` | 1 | Create offer with positioning canvas + ICP | Free |
| `campaign-planning` | 2 | Plan campaigns with signals + messaging framework | Free |
| `copy-generation` | 3 | Generate email + LinkedIn copy variants | Free |
| `campaign-leads` | 4 | Find companies + contacts matching signals | API credits |
| `outreach-review` | 5 | Review and send personalized messages | Free |
| `results-analysis` | 6 | Analyze performance and capture learnings | Free |

## Workflow

```
offer-positioning (phase 1)
        ↓
campaign-planning (phase 2) ←── create 3-5 ideas
        ↓
copy-generation (phase 3) ←── for each campaign
        ↓
    Pick best 1-2 campaigns
        ↓
campaign-leads (phase 4) ←── spends API credits
        ↓
outreach-review (phase 5)
        ↓
results-analysis (phase 6)
```

## How Skills Work

1. **At startup**: Only skill names and descriptions are loaded (~30-50 tokens each)
2. **When invoked**: Full `skill.md` is loaded into context
3. **Progressive loading**: Referenced files/scripts load as needed

This keeps context efficient while providing deep expertise when needed.

## Skill Structure

```
.claude/skills/
├── README.md                    # This file
├── campaign-leads/
│   ├── skill.md                 # Skill definition
│   └── scripts/                 # TypeScript executables (optional)
├── offer-positioning/
│   └── skill.md
├── campaign-planning/
│   └── skill.md
├── copy-generation/
│   └── skill.md
├── outreach-review/
│   └── skill.md
└── results-analysis/
    └── skill.md
```

## Usage with Claude Code CLI

```bash
# Skills are auto-discovered in .claude/skills/
claude "create a new offer for AI Sales Roleplay Trainer"
# → Loads offer-positioning skill

claude "find leads for the hiring-signal campaign"
# → Loads campaign-leads skill
```

## Relationship to Cursor Skills

These skills mirror the `.cursor/skills/` setup but in Claude Code's portable format:

| Cursor | Claude Code |
|--------|-------------|
| `.cursor/skills/4-campaigns-leads/` | `.claude/skills/campaign-leads/` |
| `.cursor/commands/*.md` | `.claude/skills/*/skill.md` |

Both can coexist - use Cursor skills in Cursor, Claude skills in Claude Code CLI.

## Adding New Skills

1. Create folder: `.claude/skills/{skill-name}/`
2. Add `skill.md` with:
   - Title (H1)
   - Description paragraph
   - "When to Use" section
   - "Instructions" with numbered steps
3. Optionally add `scripts/` for deterministic executables

## Status

- `offer-positioning` - Ready
- `campaign-planning` - Ready
- `copy-generation` - Ready
- `campaign-leads` - Ready (most complete)
- `outreach-review` - V2 (defined, not fully implemented)
- `results-analysis` - V2 (defined, not fully implemented)
