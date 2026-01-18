# API Tool Results Storage - Best Practices

## Overview

When using external APIs (Parallel, TheirStack, Exa, etc.), we must **always store**:
1. **Raw API responses** - For debugging, recovery, and audit trails
2. **Run IDs/Request IDs** - For retrieving results later (especially async APIs)
3. **Processed data** - Structured data saved to main tables (`companies`, `contacts`, etc.)
4. **Metadata** - Costs, timing, status, errors

**Why:** API calls cost money. If scripts fail or timeout, we need to recover the data we paid for.

---

## Storage Strategy

### 1. **Tool-Specific Tables** (For Async/Long-Running APIs)

Create dedicated tables for APIs that return run IDs or require polling:

**Example: `parallel_findall_runs` table**
```sql
CREATE TABLE parallel_findall_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID REFERENCES offers(id),
    campaign_id UUID REFERENCES campaigns(id),
    
    -- Run identification
    findall_run_id TEXT NOT NULL,  -- The ID from Parallel API
    query_name TEXT NOT NULL,      -- Human-readable name
    
    -- Request details
    objective TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    generator TEXT NOT NULL,
    match_limit INTEGER NOT NULL,
    match_conditions JSONB NOT NULL,
    request_params JSONB,           -- Full request payload
    
    -- Status tracking
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    
    -- Raw response storage
    raw_response JSONB,             -- Full API response when completed
    
    -- Results summary
    items_count INTEGER DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 4),
    credits_used INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parallel_findall_run_id ON parallel_findall_runs(findall_run_id);
CREATE INDEX idx_parallel_findall_status ON parallel_findall_runs(status);
CREATE INDEX idx_parallel_findall_offer ON parallel_findall_runs(offer_id);
```

**When to use:**
- APIs that return run IDs (Parallel FindAll, Parallel Task API)
- Long-running operations that require polling
- Operations where you need to retrieve results later

---

### 2. **Tool Usage Logging** (For All API Calls)

Use the `tool_usage` table for **all** API calls (via the `tool-usage-logger.ts` hook):

```typescript
// Automatic logging via hook
import { logToolUsage } from '@/lib/hooks/tool-usage-logger'

// The hook automatically logs:
// - Request parameters
// - Response summary (not full response - too large)
// - Status (success/error)
// - Credits used
// - Duration
```

**What gets logged:**
- `action` - What API call was made (`findAll`, `searchCompanies`, etc.)
- `request_params` - Full request parameters (JSONB)
- `response_summary` - Summarized response (counts, IDs, not full data)
- `status` - `success`, `error`, or `rate_limited`
- `credits_used` - API credits consumed
- `duration_ms` - How long the call took

**Limitations:**
- `response_summary` is **not** the full response (too large)
- Use tool-specific tables for full raw responses

---

### 3. **Source Raw Fields** (In Main Tables)

Store raw API responses in the main tables' `source_raw` JSONB fields:

**Companies table:**
```typescript
{
  name: "Acme Capital",
  domain: "acmecapital.com",
  source_tool: "parallel_findall",
  source_query: "Find hedge funds with AI/data leadership",
  source_raw: {
    // Full raw API response
    parallel_findall: {
      run_id: "findall_xxx",
      item: { /* full company object from Parallel */ },
      match_reasoning: "...",
      citations: [...]
    }
  }
}
```

**Contacts table:**
```typescript
{
  full_name: "John Doe",
  linkedin_url: "https://linkedin.com/in/johndoe",
  source_tool: "exa",
  source_raw: {
    exa: { /* full Exa API response */ },
    fullenrich: { /* full FullEnrich response if enriched */ }
  }
}
```

**Why:** Allows you to see exactly what data the API returned, even after processing.

---

## Implementation Checklist

### ✅ When Creating a New API Integration

1. **Create tool-specific table** (if async/polling required)
   - Store run IDs, status, raw responses
   - Index on run_id and status for fast lookups

2. **Save run ID immediately** (before polling)
   ```typescript
   const findall = await parallel.findAll(...)
   const runId = findall.findall_id
   
   // Save immediately (status: 'pending')
   await supabase.from('parallel_findall_runs').insert({
     findall_run_id: runId,
     status: 'pending',
     // ... other fields
   })
   ```

3. **Update status when complete**
   ```typescript
   const result = await parallel.getFindAllResult(runId)
   
   await supabase.from('parallel_findall_runs')
     .update({
       status: 'completed',
       raw_response: result,  // Full response
       items_count: result.output?.items?.length || 0,
       completed_at: new Date().toISOString(),
     })
     .eq('findall_run_id', runId)
   ```

4. **Save processed data to main tables**
   ```typescript
   for (const item of result.output.items) {
     await supabase.from('companies').upsert({
       name: item.name,
       domain: item.domain,
       source_tool: 'parallel_findall',
       source_raw: {
         parallel_findall: item  // Full raw item
       }
     })
   }
   ```

5. **Log to tool_usage** (automatic via hook)
   - The hook logs request/response summary
   - No manual logging needed

6. **Save to JSON file** (backup)
   ```typescript
   // Always save to JSON file, even in dry-run mode
   fs.writeFileSync(
     `parallel-results-${Date.now()}.json`,
     JSON.stringify({
       run_id: runId,
       timestamp: new Date().toISOString(),
       results: result.output.items
     }, null, 2)
   )
   ```

---

## Recovery Pattern

### If Script Fails/Timeouts

1. **Find run IDs** from:
   - Database: `SELECT findall_run_id FROM parallel_findall_runs WHERE status = 'completed'`
   - Dashboard: Check API provider's dashboard
   - JSON files: Check `scripts/` directory for saved JSON files

2. **Retrieve results** using run IDs:
   ```typescript
   const runIds = ['findall_xxx', 'findall_yyy']
   for (const runId of runIds) {
     const result = await parallel.getFindAllResult(runId)
     // Process and save to database
   }
   ```

3. **Update database** with retrieved results

---

## Examples

### Parallel FindAll (Async API)

**Storage locations:**
1. `parallel_findall_runs` table - Run metadata + raw response
2. `companies` table - Processed companies with `source_raw`
3. `tool_usage` table - API call log (via hook)
4. JSON file - Backup copy

**Code pattern:**
```typescript
// 1. Create run
const findall = await parallel.findAll(...)
const runId = findall.findall_id

// 2. Save run record immediately
await supabase.from('parallel_findall_runs').insert({
  findall_run_id: runId,
  status: 'pending',
  // ...
})

// 3. Poll for results
const result = await waitForFindAllResult(runId)

// 4. Update run record with results
await supabase.from('parallel_findall_runs')
  .update({
    status: 'completed',
    raw_response: result,
    items_count: result.output?.items?.length || 0
  })
  .eq('findall_run_id', runId)

// 5. Process and save companies
for (const item of result.output.items) {
  await supabase.from('companies').upsert({
    name: item.name,
    domain: item.domain,
    source_raw: { parallel_findall: item }
  })
}

// 6. Save JSON backup
fs.writeFileSync(`results-${runId}.json`, JSON.stringify(result, null, 2))
```

### TheirStack (Sync API)

**Storage locations:**
1. `tool_usage` table - API call log (via hook)
2. `companies` table - Processed companies with `source_raw`
3. JSON file - Backup copy

**Code pattern:**
```typescript
// 1. Make API call
const response = await theirstack.searchCompanies(...)

// 2. Log automatically (via hook)
// No manual logging needed

// 3. Process and save companies
for (const company of response.data) {
  await supabase.from('companies').upsert({
    name: company.name,
    domain: company.domain,
    source_tool: 'theirstack',
    source_raw: { theirstack: company }  // Full raw response
  })
}

// 4. Save JSON backup
fs.writeFileSync(`theirstack-results-${Date.now()}.json`, 
  JSON.stringify(response, null, 2)
)
```

---

## Best Practices Summary

### ✅ DO

1. **Save run IDs immediately** - Before polling/processing
2. **Store full raw responses** - In tool-specific tables or `source_raw` fields
3. **Save JSON backups** - Even in dry-run mode
4. **Update status** - Track pending → completed → failed
5. **Log all API calls** - Via `tool_usage` table (automatic hook)
6. **Index run IDs** - For fast retrieval

### ❌ DON'T

1. **Don't rely on terminal output** - It's lost when terminal closes
2. **Don't skip saving run IDs** - You'll lose the ability to recover
3. **Don't store only summaries** - Keep full raw responses
4. **Don't assume scripts will complete** - Always save progress incrementally

---

## Recovery Scripts

Create recovery scripts for each API tool:

**Example: `retrieve-parallel-results.ts`**
```typescript
// Gets run IDs from database or command line
// Retrieves results from Parallel API
// Processes and saves to Supabase
// Updates run records with status
```

**Usage:**
```bash
# From database
npx ts-node scripts/retrieve-parallel-results.ts

# With specific run IDs
npx ts-node scripts/retrieve-parallel-results.ts --run-ids findall_xxx,findall_yyy
```

---

## Questions to Ask When Adding a New API

1. **Does it return a run ID?** → Create tool-specific table
2. **Is it async?** → Save run ID immediately, poll later
3. **What data do we need to recover?** → Store in `source_raw`
4. **How do we retrieve results later?** → Create recovery script
5. **What if the script fails?** → Ensure run IDs are saved before processing
