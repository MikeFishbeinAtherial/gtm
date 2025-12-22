# ✅ Fixed: Folder Structure + Clear Deliverables

## 🚨 **The Issue You Found**

**Before:** `offers/_template/permissionless-value/` ❌  
**After:** `offers/_template/campaigns/_template/permissionless-value/` ✅

**Why?** PVP is a campaign-specific strategy, not offer-wide.

---

## 📦 **Key Deliverables by Command**

### `/new-offer` Creates:

**Files:**
```
offers/ai-sales-roleplay-trainer/
├── README.md                    ← Offer overview
├── positioning-canvas.md        ← ICP + positioning
├── research/ (empty)
├── results/ (empty)
└── campaigns/ (empty)
```

**Database:**
- `offers` table: 1 new record

**Cost:** FREE

---

### `/offer-campaign` Creates:

**Files:**
```
offers/ai-sales-roleplay-trainer/campaigns/hiring-signal-q1/
├── campaign-plan.md             ← Strategy overview
├── signals.md                   ← WHAT to look for
├── copy/
│   ├── email-v1.md
│   ├── email-v2.md
│   ├── linkedin-v1.md
│   └── linkedin-v2.md
└── permissionless-value/        ← Only if PVP chosen
    └── pvp-strategy.md
```

**Database:**
- `campaigns` table: 1 new record

**Cost:** FREE

---

### `/offer-launch` Creates:

**Files:** None (all database)

**Database:**
- `companies` table: 40-100 records
- `contacts` table: 80-200 records
- `campaign_contacts` table: Links

**Cost:** 💰 API CREDITS

---

## 📊 **Clear Separation**

| Level | Location | Contains | Created By |
|-------|----------|----------|------------|
| **OFFER** | `offers/{slug}/` | Positioning + ICP (stable) | `/new-offer` |
| **CAMPAIGN** | `offers/{slug}/campaigns/{slug}/` | Signals + Copy + Framework (variable) | `/offer-campaign` |
| **LEADS** | Database tables | Companies + Contacts | `/offer-launch` |
| **MESSAGES** | Database tables | Sent messages | `/offer-send` |

---

## 📚 **New Documentation**

1. **`offers/_template/README.md`** - What `/new-offer` creates
2. **`offers/_template/campaigns/_template/README.md`** - What `/offer-campaign` creates
3. **`docs/folder-structure-guide.md`** - Complete reference

---

## ✅ **Structure is Now Clear**

**One offer = One positioning** (stable)  
**One offer = Multiple campaigns** (variable strategies)  
**One campaign = One set of signals + copy** (test different approaches)

---

**Ready to test `/new-offer`?** Just type:

```
@.cursor/commands/new-offer.md create AI Sales Roleplay Trainer
```

I'll walk you through positioning, and everything will be saved to the correct locations! 🚀

