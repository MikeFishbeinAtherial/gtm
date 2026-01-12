# Duplicate Import Root Cause Analysis

## 🔍 **What Happened**

### **The Problem: 461 Duplicate Records (Not Just Liza Adams!)**

Liza Adams wasn't the only duplicate - there are **461 duplicate connection records** in the database! Each person appears twice:

1. **First record** (created ~00:59:05): Has a `temp_` LinkedIn ID
2. **Second record** (created ~01:10:12): Has a real LinkedIn ID

### **Why This Happened**

The import process happened in **two phases**:

#### **Phase 1: Unmatched Contacts (00:59:05)**
- Contacts were imported from CSV
- Some couldn't be matched to Unipile connections (maybe Unipile API was slow, or contacts weren't in Unipile yet)
- These got imported with **temporary IDs** like `temp_d97fe133c73d2d67`
- The `temp_` ID is generated from a hash of the LinkedIn URL

#### **Phase 2: Matched Contacts (01:10:12)**
- The same contacts were imported again (maybe the script was run twice, or Unipile sync happened later)
- This time, they **were matched** to Unipile connections
- They got **real LinkedIn IDs** like `ACoAAABO9I0BwLXGa43-7PJLaexXcn71tIaW5sc`

#### **The Bug: Upsert Conflict Key**

The import script uses:
```javascript
.upsert({
  linkedin_id: contact.linkedin_id,
  ...
}, {
  onConflict: 'linkedin_id',  // ← This is the problem!
  ignoreDuplicates: false
})
```

**Problem**: The upsert checks for conflicts by `linkedin_id`, but:
- First record: `linkedin_id = temp_d97fe133c73d2d67`
- Second record: `linkedin_id = ACoAAABO9I0BwLXGa43-7PJLaexXcn71tIaW5sc`

Since the IDs are different, Supabase thinks they're different records and creates a **new record** instead of updating the existing one!

---

## 🎯 **Why Liza Adams Got Two Messages**

Liza Adams was one of the 461 duplicates. Here's what happened:

1. **First import** created record with `temp_d97fe133c73d2d67`
2. **Second import** created a NEW record with real ID `ACoAAABO9I0BwLXGa43-7PJLaexXcn71tIaW5sc`
3. **Message generation** created messages for BOTH records (because they have different `connection_id`s)
4. **Message sending** sent both messages:
   - First message: Dec 23, 2025 (from temp_ record)
   - Second message: Jan 8, 2026 (from real ID record)

---

## 🔧 **The Fix Needed**

### **Option 1: Check by LinkedIn URL Before Upserting** (Recommended)

Before inserting, check if a record with the same `linkedin_url` already exists:

```javascript
// Check if record with this URL already exists
const { data: existing } = await supabase
  .from('linkedin_connections')
  .select('id, linkedin_id')
  .eq('linkedin_url', contact.linkedin_url)
  .single();

if (existing) {
  // Update existing record with new LinkedIn ID (if we have a real one now)
  if (contact.linkedin_id && !contact.linkedin_id.startsWith('temp_')) {
    await supabase
      .from('linkedin_connections')
      .update({
        linkedin_id: contact.linkedin_id, // Replace temp_ with real ID
        ...otherFields
      })
      .eq('id', existing.id);
  }
} else {
  // Insert new record
  await supabase
    .from('linkedin_connections')
    .insert({...});
}
```

### **Option 2: Use LinkedIn URL as Conflict Key** (If URL is unique)

Change the unique constraint to use `linkedin_url` instead of `linkedin_id`:

```sql
-- Remove unique constraint on linkedin_id
ALTER TABLE linkedin_connections DROP CONSTRAINT linkedin_connections_linkedin_id_key;

-- Add unique constraint on linkedin_url (if URLs are unique)
ALTER TABLE linkedin_connections ADD CONSTRAINT unique_linkedin_url UNIQUE (linkedin_url);
```

Then use:
```javascript
.upsert({
  ...
}, {
  onConflict: 'linkedin_url'  // Check by URL instead of ID
})
```

**Note**: This only works if `linkedin_url` is always unique and never null.

---

## 📊 **Current Impact**

- **461 duplicate connection records** (same person, different IDs)
- **Liza Adams**: Got 2 messages (one from each record)
- **Other duplicates**: May have gotten messages too, but we only noticed Liza

---

## ✅ **What We Fixed (So Far)**

1. ✅ **Duplicate prevention in message sending**: Checks by LinkedIn ID before sending
2. ✅ **Duplicate prevention in message generation**: Checks by LinkedIn ID/URL when generating
3. ✅ **Diagnostic scripts**: Can find and report duplicates

---

## 🛠️ **What Still Needs Fixing**

1. ⚠️ **Import script**: Should check by `linkedin_url` before upserting
2. ⚠️ **Clean up existing duplicates**: Merge or delete the 461 duplicate records
3. ⚠️ **Database constraint**: Consider adding unique constraint on `linkedin_url` (if appropriate)

---

## 💡 **Why `temp_` IDs Exist**

The `temp_` IDs serve a purpose:

1. **Allow importing contacts without LinkedIn member IDs**: Some contacts might not be in Unipile yet
2. **Look up member ID later**: When sending messages, we can look up the real member ID from the LinkedIn URL
3. **Prevent data loss**: We can import contacts even if we don't have their member IDs yet

**The problem**: When we later get the real member ID, we should **update** the existing record, not create a new one!

---

## 🔍 **How to Verify**

Run the duplicate finder script:
```bash
node scripts/find-duplicate-connections.js
```

This will show:
- How many duplicates exist
- Which people have duplicates
- Which duplicates have sent messages
