# Timezone Issue - Root Cause & Fix

## The Problem

### What Happened
Messages were scheduled to start at **12:00 PM ET** (noon) instead of **7:00 AM ET**, and extended past 6 PM ET into the evening (latest at 8:36 PM ET).

### Root Cause: Broken Timezone Conversion

The original `reschedule-campaign-accelerated.js` script had a critical bug in the `toUTC()` function:

```javascript
// BROKEN CODE (original script):
function toUTC(etDate) {
  const utcString = etDate.toLocaleString('en-US', { timeZone: 'UTC' });
  return new Date(utcString);
}
```

**Why this is broken:**
- `toLocaleString()` only **formats** the date - it doesn't **convert** timezones
- It takes the local date/time and just displays it as if it were UTC
- Example: "7:00 AM" stays "7:00 AM" - no conversion happens!

### The Timezone Chain

1. **Database (Supabase/Postgres):** Stores all timestamps in **UTC**
2. **Railway:** Runs in **UTC** timezone by default
3. **Our code:** Needs to work in **ET (America/New_York)** timezone
4. **Conversion needed:** ET → UTC when saving to database

### What Actually Happened

When the script tried to schedule "7:00 AM ET":

1. Script created: `7:00 AM` (thinking it's ET)
2. Broken `toUTC()` function: Kept it as `7:00 AM` (no conversion!)
3. Database stored: `7:00 AM UTC`
4. When displayed in ET: `7:00 AM UTC` = `2:00 AM ET` (5 hours behind)

Wait, that doesn't match! Let me trace through what really happened:

**Actual bug chain:**
1. Script used `getETDate()` which did: `new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }))`
2. This created a date object with weird timezone handling
3. The `toUTC()` function then "kept" the time but stored it wrong
4. Result: Times that looked like "12:00 PM" got stored as UTC times that display as "12:00 PM ET"

This meant the script was essentially running 5 hours late (the UTC offset).

## The Solution

### Fixed Timezone Conversion

```javascript
// CORRECT CODE (fixed script):
function convertETtoUTC(year, month, day, hour, minute) {
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const hourStr = String(hour).padStart(2, '0');
  const minStr = String(minute).padStart(2, '0');
  
  // Create ISO string with explicit ET offset
  const dateStr = `${year}-${monthStr}-${dayStr}T${hourStr}:${minStr}:00`;
  
  // In January 2026, ET is EST (UTC-5)
  const etDate = new Date(dateStr + '-05:00');
  
  return etDate;
}
```

**Why this works:**
- Creates ISO8601 string with **explicit timezone offset** (`-05:00` for EST)
- JavaScript Date constructor properly parses this and converts to UTC
- Database receives correct UTC timestamp

### Timezone Offsets

**Eastern Time (ET) has two offsets:**
- **EST (Winter):** UTC-5 (Nov-Mar)
- **EDT (Summer):** UTC-4 (Mar-Nov)

**January 2026 = EST (UTC-5)**

**Conversion examples:**
- `7:00 AM ET` = `12:00 PM UTC` (add 5 hours)
- `6:00 PM ET` = `11:00 PM UTC` (add 5 hours)

## Verification

### Before Fix
```
First message: 12:00 PM ET
Last message:  8:36 PM ET
Problem: Started 5 hours late, ended too late
```

### After Fix
```
First message: 7:00 AM ET ✅
Last message:  3:33 PM ET ✅
Success: Proper 7 AM-6 PM window
```

## Key Learnings

### 1. Database Timezone (Supabase/Postgres)
- **Always stores in UTC**
- Query with `AT TIME ZONE 'America/New_York'` to display in ET
- Example: `SELECT scheduled_at AT TIME ZONE 'America/New_York' FROM table`

### 2. Railway Environment
- **Runs in UTC** by default
- Doesn't affect Node.js Date objects (they're timezone-aware)
- But cron times are in UTC

### 3. JavaScript Date Objects
- **Internally stored as UTC milliseconds** since epoch
- Display timezone depends on system/Node.js settings
- Always use explicit timezone offsets in ISO strings

### 4. Proper Conversion Pattern
```javascript
// Creating an ET time and converting to UTC:

// ❌ WRONG:
const etDate = new Date('2026-01-23T07:00:00'); // Ambiguous!
// Uses local system timezone, not ET

// ❌ WRONG:
const utc = etDate.toLocaleString('en-US', { timeZone: 'UTC' });
// Only formats, doesn't convert!

// ✅ CORRECT:
const etDate = new Date('2026-01-23T07:00:00-05:00'); // Explicit ET offset
// JavaScript automatically converts to UTC internally
```

## Impact on Campaign

### Schedule Improvements
- **Before fix:** Messages from 12 PM - 8:36 PM ET
- **After fix:** Messages from 7 AM - 3:33 PM ET
- **Benefit:** Earlier sends = better engagement, no late-night messages

### Timeline
- **Campaign completion:** Still ~February 7, 2026 (17 days)
- **Daily volume:** 48-49 messages/day ✅
- **Weekend sends:** Now active ✅
- **Early morning sends:** Now starting at 7 AM ✅

## Prevention

### For Future Scripts
1. **Always use explicit timezone offsets** in ISO strings
2. **Test timezone conversion** with example dates
3. **Verify in database** by checking actual UTC times
4. **Use Intl.DateTimeFormat** for reliable timezone display

### Testing Checklist
- [ ] Create date in ET: `7:00 AM ET`
- [ ] Convert to UTC: Should be `12:00 PM UTC`
- [ ] Store in database
- [ ] Query with `AT TIME ZONE 'America/New_York'`
- [ ] Verify displays as `7:00 AM`
