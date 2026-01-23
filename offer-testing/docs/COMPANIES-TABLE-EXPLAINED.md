# Companies Table Explained

## 📊 Overview

**Total companies:** 4,191  
**Finance companies:** 362 (filtered by `offer_id`)

The `companies` table stores companies from **ALL offers/campaigns**, not just finance.

---

## 🔍 How to See Only Finance Companies

### In Supabase SQL Editor:

```sql
-- Get finance offer ID first
SELECT id, name FROM offers WHERE slug = 'finance';

-- Then filter companies
SELECT * FROM companies 
WHERE offer_id = '90192289-ebd5-42dc-b8fa-930d8dabb3e2';
```

### Or use the offer slug in a join:

```sql
SELECT c.* 
FROM companies c
JOIN offers o ON c.offer_id = o.id
WHERE o.slug = 'finance';
```

---

## 🔗 How Messages Link to Companies

**The relationship chain:**

```
messages
  ↓ (via contact_id)
contacts
  ↓ (via company_id)
companies
  ↓ (via offer_id)
offers
```

**Example:**
- Message → Contact (Michael) → Company (PA Compensation Rating Bureau) → Offer (Finance)

**To see which companies are getting emails:**

```sql
SELECT DISTINCT
  c.name,
  c.vertical,
  c.industry,
  COUNT(m.id) as message_count
FROM messages m
JOIN contacts ct ON m.contact_id = ct.id
JOIN companies c ON ct.company_id = c.id
WHERE m.status = 'pending'
GROUP BY c.id, c.name, c.vertical, c.industry
ORDER BY message_count DESC;
```

---

## 📝 Where Vertical/Industry Data Comes From

### Vertical Column
**Set by script logic** - The `determineVertical()` function in scripts analyzes:
- Company name keywords ("hedge fund", "capital management", etc.)
- URL patterns
- Source data

**Examples:**
- "Schonfeld" → `hedge_fund` (has "fund" in name)
- "Francisco Partners" → `private_equity` (has "partners" + PE context)
- "Bain Capital" → `investment_firm` (default for investment companies)

**Not from APIs** - It's our classification logic.

### Industry Column
**From API responses** (when available):
- **Sumble:** Returns industry data → saved to `industry` column
- **Parallel:** May return industry → saved if available
- **Exa:** Doesn't return industry → stays `null`
- **Manual:** Can be set manually in Supabase

**Current data:**
- 202 companies: `industry = null`
- 160 companies: `industry = 'Finance and Insurance'` (from Sumble)

---

## 📊 Finance Companies Breakdown

### By Source Tool:
- **parallel_findall:** 171 companies
- **sumble:** 160 companies  
- **exa:** 31 companies

### By Vertical:
- **investment_firm:** 120
- **unknown:** 93 (need review)
- **hedge_fund:** 45
- **private_equity:** 43
- **credit_union:** 16
- **bank:** 15
- **other:** 14
- Plus: insurance, broker_dealer, fintech, mortgage, asset_manager

### By Industry:
- **null:** 202 (no industry data)
- **Finance and Insurance:** 160 (from Sumble)

---

## 🎯 Key Points

1. **`offer_id` is the key** - Always filter by this to see finance-only companies
2. **No campaign_id on companies** - Companies belong to offers, not campaigns
3. **Campaigns link via contacts** - `campaign_contacts` table links contacts to campaigns
4. **Vertical = our classification** - Set by script logic, not APIs
5. **Industry = API data** - From Sumble/Parallel when available, otherwise null

---

## 🔍 Useful Queries

### See all finance companies:
```sql
SELECT * FROM companies 
WHERE offer_id = (SELECT id FROM offers WHERE slug = 'finance');
```

### See companies getting emails:
```sql
SELECT DISTINCT c.*
FROM companies c
JOIN contacts ct ON ct.company_id = c.id
JOIN messages m ON m.contact_id = ct.id
WHERE m.status = 'pending'
  AND c.offer_id = (SELECT id FROM offers WHERE slug = 'finance');
```

### See companies by vertical:
```sql
SELECT vertical, COUNT(*) 
FROM companies 
WHERE offer_id = (SELECT id FROM offers WHERE slug = 'finance')
GROUP BY vertical
ORDER BY COUNT(*) DESC;
```

### See where vertical came from:
```sql
SELECT 
  source_tool,
  vertical,
  COUNT(*) 
FROM companies 
WHERE offer_id = (SELECT id FROM offers WHERE slug = 'finance')
GROUP BY source_tool, vertical
ORDER BY source_tool, COUNT(*) DESC;
```

---

## 💡 Why This Structure?

**Multi-offer support:**
- One database can handle multiple offers (finance, sales training, etc.)
- Each company belongs to ONE offer (`offer_id`)
- Easy to query: "Show me all finance companies"

**Flexible classification:**
- `vertical` = our business logic (hedge_fund, PE, etc.)
- `industry` = external data (when available)
- Can have both or neither

**Campaign independence:**
- Companies exist at offer level
- Campaigns are just sequences of messages
- Same company can be in multiple campaigns (via contacts)
