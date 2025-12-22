# Folder Structure - Inputs & Outputs

This document clarifies what each command creates and where files live.

---

## 📁 **Complete Folder Structure**

```
offers/
├── _template/                              ← Template for /new-offer
│   ├── README.md                          ← You're here!
│   ├── positioning-canvas.md              ← Template
│   ├── research/notes.md                  ← Template
│   ├── results/learnings.md               ← Template
│   └── campaigns/
│       └── _template/                     ← Template for /offer-campaign
│           ├── README.md
│           ├── campaign-plan.md           ← Template
│           ├── signals.md                 ← Template
│           ├── copy/                      ← Templates
│           │   ├── email-v1.md
│           │   ├── email-v2.md
│           │   ├── linkedin-v1.md
│           │   └── linkedin-v2.md
│           ├── permissionless-value/      ← Template (if PVP chosen)
│           │   └── pvp-strategy.md
│           ├── use-case/                  ← Template (if Use Case chosen)
│           │   └── use-case-strategy.md
│           └── problem-focused/           ← Template (if Problem chosen)
│               └── problem-strategy.md
│
└── {slug}/                                 ← Created by /new-offer
    ├── README.md                          ✅ Output: Offer overview
    ├── positioning-canvas.md              ✅ Output: Positioning + ICP
    ├── research/                          ⏭️  Future: /offer-research
    │   └── notes.md
    ├── results/                           ⏭️  Future: /offer-review
    │   └── learnings.md
    └── campaigns/                         ← Folder created by /new-offer
        └── {campaign-slug}/               ← Created by /offer-campaign
            ├── campaign-plan.md           ✅ Output: Campaign overview
            ├── signals.md                 ✅ Output: What to look for
            ├── copy/                      ✅ Output: A/B test variations
            │   ├── email-v1.md
            │   ├── email-v2.md
            │   ├── linkedin-v1.md
            │   └── linkedin-v2.md
            └── {framework}/               ✅ Output: Strategy (based on choice)
                ├── permissionless-value/
                │   └── pvp-strategy.md
                ├── use-case/
                │   └── use-case-strategy.md
                └── problem-focused/
                    └── problem-strategy.md
```

---

## 🔄 **Command → Output Mapping**

### **PHASE 1: `/new-offer {name}`**

**Inputs:**
- Offer name, description, type, ownership
- User answers: positioning questions

**Outputs (Files):**
```
offers/{slug}/
├── README.md                    ← Offer overview and status
├── positioning-canvas.md        ← Complete positioning + ICP
├── research/                    ← Empty folder (for future use)
│   └── notes.md
├── results/                     ← Empty folder (for future use)
│   └── learnings.md
└── campaigns/                   ← Empty folder (for future use)
```

**Outputs (Database):**
- `offers` table: New record (status: 'draft')

**Cost:** FREE

---

### **PHASE 2: `/offer-campaign {slug} {campaign-name}`**

**Inputs:**
- Offer slug (from Phase 1)
- Campaign name
- User answers: signal brainstorming, messaging approach

**Outputs (Files):**
```
offers/{slug}/campaigns/{campaign-slug}/
├── campaign-plan.md             ← Goal, timeline, approach, metrics
├── signals.md                   ← Observable behaviors (WHAT to find)
├── copy/
│   ├── email-v1.md             ← Subject + body (variation 1)
│   ├── email-v2.md             ← Subject + body (variation 2)
│   ├── linkedin-v1.md          ← Connection request + message
│   └── linkedin-v2.md          ← Alternative version
└── {framework}/                 ← One of these, based on choice:
    ├── permissionless-value/
    │   └── pvp-strategy.md     ← 4-phase PVP details
    ├── use-case/
    │   └── use-case-strategy.md ← Use case implementation
    └── problem-focused/
        └── problem-strategy.md  ← Problem-solution narrative
```

**Outputs (Database):**
- `campaigns` table: New record (status: 'draft')

**Cost:** FREE

---

### **PHASE 3: `/offer-launch {slug} {campaign-slug}`**

**Inputs:**
- Offer slug
- Campaign slug
- Reads: `positioning-canvas.md` (ICP)
- Reads: `campaigns/{campaign-slug}/signals.md`

**Outputs (Files):**
- None (everything goes to database)

**Outputs (Database):**
- `companies` table: 40-100 records
- `contacts` table: 80-200 records
- `campaign_contacts` table: Links contacts to campaign
- `tool_usage` table: API call logs
- `campaigns` table: Update status 'draft' → 'ready'

**Cost:** 💰 **API CREDITS** (TheirStack, Parallel, Exa)

---

### **PHASE 4: `/offer-send {slug} {campaign-slug}` (V2 - Not Built)**

**Inputs:**
- Offer slug
- Campaign slug
- Reads: `campaigns/{campaign-slug}/copy/` (all variants)
- Reads: Database queue (campaign_contacts)

**Outputs (Files):**
- None (everything goes to database)

**Outputs (Database):**
- `messages` table: Sent messages
- `account_activity` table: Rate limit tracking
- `campaign_contacts` table: Update status 'queued' → 'in_progress'
- `campaigns` table: Update status 'ready' → 'active'

**Cost:** FREE (Unipile included)

---

## 🔍 **Key Distinctions**

### **Offer-Level (Stable)**
**Location:** `offers/{slug}/`  
**Created by:** `/new-offer`  
**Contains:**
- ✅ Positioning (problem, solution, benefits)
- ✅ ICP (size, industry, geography, titles)
- ❌ NOT signals (those vary by campaign)
- ❌ NOT copy (that varies by campaign)

### **Campaign-Level (Variable)**
**Location:** `offers/{slug}/campaigns/{campaign-slug}/`  
**Created by:** `/offer-campaign`  
**Contains:**
- ✅ Signals (observable behaviors)
- ✅ Copy variations (A/B test)
- ✅ Framework strategy (PVP, Use Case, Problem)
- ❌ NOT ICP (that's shared from offer)

---

## 📊 **Data Flow**

```
/new-offer
├─ Creates: offers/{slug}/
│  └─ positioning-canvas.md (ICP lives here)
└─ Database: offers table

↓ (User creates 3-5 campaign ideas)

/offer-campaign (x3-5)
├─ Creates: offers/{slug}/campaigns/{campaign-slug}/
│  ├─ signals.md (WHAT to find)
│  ├─ copy/ (messaging)
│  └─ {framework}/ (strategy)
└─ Database: campaigns table

↓ (User picks best campaign)

/offer-launch
├─ Reads: positioning-canvas.md + signals.md
├─ APIs: Find companies matching signals
└─ Database: companies, contacts, campaign_contacts tables

↓ (User reviews leads)

/offer-send (future)
├─ Reads: copy/ + database queue
├─ Unipile: Send messages
└─ Database: messages, account_activity tables
```

---

## ✅ **Why This Structure?**

### **1. Separation of Concerns**
- **Offer** = What you're selling (stable)
- **Campaign** = How you reach them (variable)

### **2. Reusability**
- One positioning canvas → Multiple campaigns
- Test different signals without recreating offer

### **3. Cost Control**
- Create unlimited campaigns (free)
- Launch only the best (paid)

### **4. Clear Ownership**
- Each file has ONE command that creates it
- No confusion about where things live

---

## 🎯 **Quick Reference**

| File | Created By | Used By | Contains |
|------|------------|---------|----------|
| `positioning-canvas.md` | `/new-offer` | All campaigns | ICP, Problem, Benefits |
| `campaign-plan.md` | `/offer-campaign` | You (review) | Goal, Signals, Approach |
| `signals.md` | `/offer-campaign` | `/offer-launch` | WHAT to find |
| `copy/*.md` | `/offer-campaign` | `/offer-send` | Email + LinkedIn copy |
| `{framework}/*.md` | `/offer-campaign` | `/offer-send` | Strategy details |

---

**Need to find something?**
- Positioning? → `offers/{slug}/positioning-canvas.md`
- Signals? → `offers/{slug}/campaigns/{campaign-slug}/signals.md`
- Copy? → `offers/{slug}/campaigns/{campaign-slug}/copy/`
- Framework? → `offers/{slug}/campaigns/{campaign-slug}/{framework}/`

