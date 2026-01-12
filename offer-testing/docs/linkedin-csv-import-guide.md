# LinkedIn CSV Import Guide

## Why CSV Export is Better

**CSV Export Advantages:**
- ✅ **Simple** - Native LinkedIn feature, no API complexity
- ✅ **Reliable** - Works every time, no endpoint hunting
- ✅ **Complete** - Includes all connection data LinkedIn has
- ✅ **Fast** - One-time export, then import
- ✅ **No Rate Limits** - Import at your own pace

**Magic Route Disadvantages:**
- ❌ **Complex** - Requires finding LinkedIn endpoints via browser dev tools
- ❌ **Fragile** - LinkedIn can change endpoints anytime
- ❌ **Time-consuming** - Need to identify correct endpoint for each data type
- ❌ **Maintenance** - Endpoints might break with LinkedIn updates

## How to Export LinkedIn Connections

### Step 1: Request Your Data

1. Go to LinkedIn: **Settings & Privacy** → **Data Privacy**
2. Scroll down to **Get a copy of your data**
3. Click **Select the data you want**
4. Check **Connections** (and optionally **Messages** if you want message history)
5. Click **Request archive**
6. LinkedIn will email you when ready (usually within 24 hours)

### Step 2: Download and Extract

1. Check your email for the download link
2. Download the ZIP file
3. Extract it
4. Find the `Connections.csv` file

### Step 3: Save to Project

Save the CSV file as:
```
offer-testing/data/linkedin-connections.csv
```

## CSV Column Mapping

LinkedIn's CSV export typically includes these columns:

| LinkedIn CSV Column | Our Database Column | Notes |
|---------------------|---------------------|-------|
| `First Name` | `first_name` | |
| `Last Name` | `last_name` | |
| `Full Name` | `full_name` | |
| `Email Address` | (stored in `raw_data`) | Used to extract company domain |
| `Company` | `current_company` | |
| `Position` | `current_title` | Also might be "Position (Current)" |
| `Location` | `location` | |
| `Connected On` | `connected_at` | Date when you connected |
| `Tags` | `tags` | Comma-separated, converted to array |
| `Notes` | `notes` | Your personal notes |
| `Profile URL` | `linkedin_url` | LinkedIn profile URL |

**Note:** Column names can vary slightly. The import script tries multiple variations.

## Running the Import

```bash
node scripts/import-linkedin-csv.js
```

**What it does:**
1. Reads `data/linkedin-connections.csv`
2. Parses all rows
3. Maps to our `linkedin_connections` schema
4. Upserts to Supabase (updates existing, inserts new)
5. Shows summary statistics

## After Import

### 1. Verify the Data

```sql
-- Check total connections
SELECT COUNT(*) FROM linkedin_connections;

-- Check 2025 connections
SELECT COUNT(*) 
FROM linkedin_connections 
WHERE connected_at >= '2025-01-01' 
  AND connected_at < '2026-01-01';

-- Sample some connections
SELECT full_name, current_company, current_title, connected_at
FROM linkedin_connections
ORDER BY connected_at DESC
LIMIT 10;
```

### 2. Run the Filter Script

```bash
node scripts/filter-2025-connections.js
```

This will:
- Find connections from 2025
- Filter out people messaged in last 7 days
- Check Sumble for hiring signals
- Show top candidates

### 3. Create Your Campaign

Use the campaign slug: `atherial-ai-roleplay-2025-q1`

## Troubleshooting

### "CSV file not found"

Make sure the file is at:
```
offer-testing/data/linkedin-connections.csv
```

### "No way to generate ID"

The script needs either:
- A LinkedIn Profile URL, OR
- First Name + Last Name + Company

If a row is missing all of these, it will be skipped.

### "Column not found" warnings

LinkedIn's CSV format can vary. The script tries common column name variations, but if you see warnings, you might need to adjust the column mapping in the script.

### Date parsing issues

If `connected_at` dates aren't parsing correctly, check the date format in your CSV. The script uses JavaScript's `Date()` parser which handles most formats.

## Updating Connections

You can re-run the import script anytime:
- **New connections** → Will be inserted
- **Existing connections** → Will be updated with latest data
- **No duplicates** → Uses `linkedin_id` as unique key

## Alternative: Manual CSV Editing

If you want to add custom data before importing:

1. Open the CSV in Excel/Google Sheets
2. Add columns like:
   - `priority` (high/medium/low)
   - `tags` (comma-separated)
   - `notes` (personal notes)
3. Save and import

The script will include these in `raw_data` and you can query them later.

## Next Steps

After importing:
1. ✅ Review connections in Supabase
2. ✅ Run filter script to find 2025 connections
3. ✅ Check Sumble for hiring signals
4. ✅ Create campaign batch
5. ✅ Generate personalized messages
