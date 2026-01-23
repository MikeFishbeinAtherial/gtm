# Exa Company Search - Finding Better Finance Companies

**New Feature:** Exa now has 60M+ companies with structured metadata (headcount, revenue, funding, location, etc.)

---

## ✅ Setup Complete

1. ✅ Exa MCP installed with advanced search endpoint
2. ✅ Company Research Claude Skill created
3. ⏳ **Restart Claude Code** to activate the skill

---

## 🎯 How to Use for Finance Lead Gen

### Example Queries

**Find hedge funds:**
```
Do company research: Find 50 hedge funds in New York with 20-200 employees, 
exclude large firms like Bridgewater, Citadel, Renaissance
```

**Find private equity firms:**
```
Company research: Find 30 small to mid-sized private equity firms on the East Coast 
with recent investments in technology or SaaS companies
```

**Find companies with AI leadership:**
```
Find companies: Investment firms with "Head of AI" or "Chief Data Officer" 
or "VP Data" in their team, exclude venture capital
```

**More specific:**
```
Research companies: Growth equity firms managing $100M-$2B AUM, 
focused on B2B software, based in Boston or NYC
```

---

## 🔑 Key Advantages Over Parallel

### Structured Metadata
Exa returns:
- **Headcount** (exact employee count)
- **Location** (city, state, country)
- **Funding** (raised amount)
- **Revenue** (estimated)
- **Company type** (verified)

### Better Filtering
- Filter by employee count range
- Filter by location (city-level)
- Filter by company characteristics
- More accurate categorization

### No Credits/Cost Issues
- Uses your Exa API key
- More predictable costs
- Can run many searches

---

## 📊 Workflow for Next Campaign

### Step 1: Use Exa Company Search
```
Company research: Find 100 hedge funds in United States 
with 10-500 employees, AUM under $5B, 
exclude: Bridgewater, Citadel, Renaissance, Two Sigma, DE Shaw
```

### Step 2: Get Structured Data
Exa returns JSON with:
```json
{
  "name": "Greenlight Capital",
  "url": "greenlightcapital.com",
  "headcount": 45,
  "location": "New York, NY",
  "description": "Value-focused hedge fund...",
  "category": "hedge_fund"
}
```

### Step 3: Save to Supabase
Use the data to populate:
- `companies` table (name, url, vertical, headcount)
- Better `fit_score` based on real headcount
- Better targeting (no more banks/credit unions)

### Step 4: Find Contacts
Use existing Exa people search + FullEnrich for emails

---

## 🚀 Next Steps

1. **Restart Claude Code** (required for skill to activate)
2. **Test the skill:**
   ```
   Company research: Find 5 small hedge funds in New York
   ```
3. **Create script** to:
   - Query Exa for companies
   - Save to Supabase
   - Deduplicate
   - Find contacts
   - Schedule emails

---

## 💡 Why This Solves Your Problem

### Before (Parallel):
- Got mixed results (banks, credit unions, etc.)
- No structured data
- Hard to filter by size
- Cost unpredictable

### After (Exa):
- **60M+ verified companies**
- **Structured metadata** (headcount, location, revenue)
- **Better categorization** (actual hedge funds vs. banks)
- **Precise filtering** (exclude large firms, target specific AUM)

---

## 📝 Sample Script Outline

```typescript
// Use Exa MCP via Claude skill to get companies
// Returns structured JSON with all metadata

// Save to Supabase
await supabase.from('companies').insert({
  name: company.name,
  website: company.url,
  vertical: 'hedge_fund', // verified
  headcount: company.headcount, // actual number
  location: company.location,
  fit_score: calculateFitScore(company), // based on real data
  lead_source: 'exa_company_search'
})

// Find contacts (existing workflow)
// Schedule emails (existing workflow)
```

---

## 🎯 Recommended Next Action

**Try it now:**
1. Restart Claude Code
2. Ask: "Company research: Find 10 hedge funds in NYC with 20-100 employees"
3. Review the structured results
4. Decide if you want to replace your current 175-contact list or add to it

This could give you a much cleaner, more targeted list than what Parallel FindAll provided.
