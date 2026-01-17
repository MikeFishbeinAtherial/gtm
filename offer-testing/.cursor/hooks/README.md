# Cursor Hooks

**Purpose:** Deterministic operations that run automatically before/after tool calls or conversations.

---

## Available Hooks

### 1. Tool Usage Logger (`tool-usage-logger.ts`)

**Purpose:** Automatically logs all API calls to `tool_usage` table in Supabase.

**When it runs:**
- Before API calls (pre-tool-call hook)
- After API calls (post-tool-call hook)

**What it logs:**
- Tool name (parallel, theirstack, exa, etc.)
- Action (search, enrich, verify, etc.)
- Request parameters
- Response summary
- Status (success/error/rate_limited)
- Credits used
- Duration
- Context (offer_id, campaign_id, company_id, contact_id)

**Usage:**

```typescript
import { withToolLogging } from '@/lib/hooks/tool-usage-logger'

// Wrap any API call
const companies = await withToolLogging(
  'parallel',
  'search',
  { query: 'B2B SaaS', limit: 50 },
  async () => await parallel.searchCompanies(...),
  { offerId: '...', campaignId: '...' }
)
```

**Integration:**
- Hooks are automatically invoked by Cursor when configured
- Can also be called manually in code using `withToolLogging` wrapper

---

## How Hooks Work

### Pre-Conversation Hooks
Run before every conversation starts. Use for:
- Injecting static context
- Loading reference files
- Setting up environment

### Post-Conversation Hooks
Run after conversation completes. Use for:
- Logging results
- Saving to database
- Cleanup operations

### Pre-Tool-Call Hooks
Run before API calls. Use for:
- Validation (ICP matching)
- Rate limit checks
- Request logging

### Post-Tool-Call Hooks
Run after API calls. Use for:
- Response logging
- Error handling
- Cost tracking

---

## Configuration

Hooks are automatically discovered by Cursor when placed in `.cursor/hooks/`.

**File naming convention:**
- `{hook-name}.ts` - TypeScript hook implementation
- `README.md` - Documentation (this file)

---

## Best Practices

1. **Don't throw errors** - Hooks should be resilient. Log errors but don't break workflows.
2. **Keep hooks fast** - They run synchronously, so avoid slow operations.
3. **Use async/await** - Hooks can be async, but handle errors gracefully.
4. **Log everything** - Hooks are perfect for observability.

---

## Adding New Hooks

1. Create hook file in `.cursor/hooks/`
2. Export hook functions
3. Document in this README
4. Test with a simple API call

**Example:**

```typescript
// .cursor/hooks/my-hook.ts
export async function myPreHook(params: any) {
  // Your logic here
}

export async function myPostHook(result: any) {
  // Your logic here
}
```

---

## Related Files

- **Tool Usage Table:** `scripts/setup-db.sql` (tool_usage schema)
- **Supabase Client:** `src/lib/clients/supabase.ts`
- **Skills:** `.cursor/skills/` (use hooks in skills)
