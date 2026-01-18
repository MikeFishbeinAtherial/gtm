# How to Retrieve Parallel FindAll Results

## Step 1: Get Run IDs from Parallel Dashboard

1. Go to: https://platform.parallel.ai/
2. Navigate to your API usage/logs
3. Find the FindAll runs from today (Jan 17, 2026)
4. Copy the `findall_id` or `run_id` from each completed run

They should look like: `findall_edf3c5902b584472982bcba2b0a15bb6`

## Step 2: Retrieve Results

Run the retrieval script with your run IDs:

```bash
npx ts-node scripts/retrieve-parallel-results.ts --run-ids findall_xxx,findall_yyy,findall_zzz
```

Or if you have many, save them to a file and pass them:

```bash
# Get run IDs from dashboard, then:
npx ts-node scripts/retrieve-parallel-results.ts --run-ids $(cat run-ids.txt | tr '\n' ',')
```

## Step 3: Review Results

The script will:
1. Fetch results from Parallel API
2. Process companies (dedupe, filter finance firms)
3. Save to Supabase `companies` table
4. Link to `finance-leadgen-1000` campaign
5. Save full raw data to JSON file
6. Show sample companies

---

## Alternative: Check Terminal Output

If you still have the terminal output from when the script ran, look for lines like:

```
⏳ FindAll run created: findall_edf3c5902b584472982bcba2b0a15bb6
```

Copy those IDs and use them in the retrieval script.
