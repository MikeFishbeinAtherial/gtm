# Atherial Leads - Networking Campaign

## Contact Data for networking-holidays-2025 Campaign

### 📁 Files

- **`networking-contacts.json`** - Processed contact data (539 contacts)
  - Source: Original CSV with first_name and linkedin_url columns
  - Processed: Parsed and cleaned for campaign use

### 📊 Data Structure

Each contact has:
```json
{
  "first_name": "Claudia",
  "last_name": "Ring",
  "linkedin_url": "https://www.linkedin.com/in/claudiaring"
}
```

### 🎯 Campaign Details

- **Total Contacts**: 539
- **Qualification**: 1st-degree LinkedIn connections
- **Message Type**: Holiday networking with value proposition
- **Timeline**: Dec 23, 2025 - Jan 13, 2026
- **Sending Rate**: 50/day (6 AM - 8 PM ET, 7 days/week)

### 🔄 Processing Steps

1. **Original CSV** → `parse-networking-csv.js` → `networking-contacts.json`
2. **Import to Supabase** → `import-networking-contacts.js` → `linkedin_connections` table
3. **Generate Messages** → `generate-networking-messages.js` → `networking_outreach` table
4. **Send Campaign** → `send-networking-campaign.js` → LinkedIn DMs

### 📈 Campaign Status

- ✅ Campaign created in Supabase
- ⏳ Contacts imported to database
- ⏳ Messages generated
- ⏳ Ready for sending

### 📋 Source Data

The original CSV file was provided by the user and contained:
- 539 rows of LinkedIn connections
- Columns: first_name, linkedin_url
- Source: Personal LinkedIn network export

### 🗂️ Organization

This data is stored here following the offer structure:
```
offers/atherial/
├── leads/                    # Contact data
│   ├── networking-contacts.json
│   └── README.md
├── campaigns/                # Campaign plans
├── copy/                     # Message templates
└── results/                  # Campaign results
```

This keeps all campaign-related assets organized under the offer.
