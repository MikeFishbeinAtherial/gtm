# API Results Storage Skill

## Purpose

Ensure all API tool results are properly stored for recovery, debugging, and audit trails.

## When to Use

- Creating new API integrations
- Writing scripts that call external APIs
- Handling async/long-running API operations
- Recovering from script failures/timeouts

## Storage Requirements

### 1. Run IDs (For Async APIs)

**Save immediately** before polling/processing:

```typescript
// Parallel FindAll example
const findall = await parallel.findAll(...)
const runId = findall.findall_id

// Save to tool-specific table IMMEDIATELY
await supabase.from('parallel_findall_runs').insert({
  findall_run_id: runId,
  status: 'pending',
  offer_id: offerId,
  campaign_id: campaignId,
  // ... request details
})
```

### 2. Raw API Responses

**Store full responses** in:
- Tool-specific tables (for async APIs)
- `source_raw` JSONB fields (in main tables)
- JSON backup files

```typescript
// Update run record with full response
await supabase.from('parallel_findall_runs')
  .update({
    status: 'completed',
    raw_response: result,  // Full API response
    items_count: result.output?.items?.length || 0
  })
  .eq('findall_run_id', runId)

// Store in companies table
await supabase.from('companies').upsert({
  name: item.name,
  domain: item.domain,
  source_raw: {
    parallel_findall: item  // Full raw item
  }
})
```

### 3. JSON Backup Files

**Always save JSON backups**, even in dry-run mode:

```typescript
fs.writeFileSync(
  `parallel-results-${runId}-${Date.now()}.json`,
  JSON.stringify({
    run_id: runId,
    timestamp: new Date().toISOString(),
    results: result.output.items
  }, null, 2)
)
```

### 4. Tool Usage Logging

**Automatic via hook** - no manual logging needed:

```typescript
// The tool-usage-logger.ts hook automatically logs:
// - Request parameters
// - Response summary
// - Status (success/error)
// - Credits used
// - Duration
```

## Implementation Checklist

- [ ] Create tool-specific table (if async/polling required)
- [ ] Save run ID immediately (before processing)
- [ ] Store full raw response when complete
- [ ] Update status (pending → completed → failed)
- [ ] Save processed data to main tables with `source_raw`
- [ ] Save JSON backup file
- [ ] Create recovery script (for retrieving results later)

## Recovery Pattern

If script fails/timeout:

1. **Find run IDs:**
   - Database: `SELECT findall_run_id FROM parallel_findall_runs WHERE status = 'completed'`
   - Dashboard: Check API provider's dashboard
   - JSON files: Check `scripts/` directory

2. **Retrieve results:**
   ```typescript
   const runIds = ['findall_xxx', 'findall_yyy']
   for (const runId of runIds) {
     const result = await parallel.getFindAllResult(runId)
     // Process and save to database
   }
   ```

3. **Update database** with retrieved results

## References

- @file docs/api-tool-results-storage.md - Full documentation
- @file .cursor/hooks/tool-usage-logger.ts - Automatic logging hook
- @file scripts/retrieve-parallel-results.ts - Example recovery script
