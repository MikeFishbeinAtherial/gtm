# ✅ REORGANIZED: Sequential Commands + Clear Folder Structure

**Date:** December 20, 2024

---

## 🎯 **What Changed**

### **1. Renamed Commands (Sequential + Descriptive)**

| Old Name | New Name | Phase | Purpose |
|----------|----------|-------|---------|
| `offer-research.md` | `0-offer-research.md` | 0 (Optional) | Market research |
| `new-offer.md` | `1-new-offer.md` | 1 | Define offer |
| `offer-campaign.md` | `2-offer-campaigns.md` | 2 | Create campaigns (plural!) |
| `offer-copy.md` (stub) | `3-campaign-copy.md` | 3 | Write copy variations |
| `offer-launch.md` | `4-campaigns-leads.md` | 4 | Find leads (not sending yet) |
| `offer-send.md` | `5-leads-outreach.md` | 5 | Send messages |
| `offer-review.md` | `6-campaign-review.md` | 6 | Analyze results |
| `test-setup.md` | ~~DELETED~~ | - | Was for testing only |

**Why numbers?** Makes the sequence crystal clear - you execute them in order.

---

### **2. Updated Folder Structure**

```
offers/{slug}/
├── README.md
├── positioning-canvas.md        ← Phase 1 output
│
├── campaigns/                   ← Phase 2 outputs
│   └── {campaign-slug}/
│       ├── campaign-plan.md
│       ├── signals.md
│       └── {framework}/
│           ├── permissionless-value/
│           ├── use-case/
│           └── problem-focused/
│
├── copy/                        ← Phase 3 outputs (NEW!)
│   └── {campaign-slug}/
│       ├── README.md
│       ├── email-v1.md
│       ├── email-v2.md
│       ├── email-v3.md
│       ├── linkedin-connection-v1.md
│       ├── linkedin-connection-v2.md
│       ├── linkedin-message-v1.md
│       └── linkedin-message-v2.md
│
├── leads/                       ← Phase 4 outputs (NEW!)
│   └── {campaign-slug}/
│       ├── companies.csv
│       ├── contacts.csv
│       └── summary.md
│
├── research/                    ← Phase 0 output (optional)
│   └── notes.md
│
└── results/                     ← Phase 6 outputs
    └── {campaign-slug}-learnings.md
```

**Key Changes:**
- ✅ Added `copy/` folder - Each campaign gets its own copy subfolder
- ✅ Added `leads/` folder - CSV exports for review
- ✅ Moved copy OUT of campaigns (was confusing)
- ✅ Clear separation: Strategy (campaigns) vs Messaging (copy) vs Data (leads)

---

## 📊 **Sequential Workflow**

### **Phase 0: Market Research** (Optional)
```
0-offer-research
├─ Input: Offer idea
├─ Process: Competitive analysis
└─ Output: research/notes.md
```

### **Phase 1: Define Offer**
```
1-new-offer
├─ Input: Offer details
├─ Process: Positioning canvas + ICP
└─ Output: positioning-canvas.md, README.md
```

### **Phase 2: Create Campaigns**
```
2-offer-campaigns (run 3-5 times)
├─ Input: Offer slug, campaign name
├─ Process: Signals + Framework choice
└─ Output: campaigns/{slug}/ (strategy)
```

### **Phase 3: Write Copy**
```
3-campaign-copy (run for each campaign)
├─ Input: Campaign slug
├─ Process: Generate email + LinkedIn variations
└─ Output: copy/{slug}/ (A/B test variations)
```

### **Phase 4: Find Leads** 💰
```
4-campaigns-leads (pick best campaign)
├─ Input: Campaign slug
├─ Process: API calls to find companies/contacts
└─ Output: leads/{slug}/ (CSV) + database
```

### **Phase 5: Send Messages**
```
5-leads-outreach (V2 - not built)
├─ Input: Campaign slug
├─ Process: Personalize, review, send
└─ Output: database (messages sent)
```

### **Phase 6: Review Results**
```
6-campaign-review (V2 - not built)
├─ Input: Campaign slug
├─ Process: Analyze metrics
└─ Output: results/{slug}-learnings.md
```

---

## 🔑 **Key Improvements**

### **1. Naming Clarity**
- ❌ Before: `offer-launch` (confusing - sounds like sending)
- ✅ After: `4-campaigns-leads` (clear - finding leads)

- ❌ Before: `offer-send` (unclear what phase)
- ✅ After: `5-leads-outreach` (clear sequence)

### **2. Folder Organization**
Each major deliverable gets its own folder:
- `campaigns/` = Strategy (signals, framework)
- `copy/` = Messaging (email, LinkedIn)
- `leads/` = Data (companies, contacts)

### **3. Copy Separation**
- ❌ Before: Copy was mixed with campaign strategy
- ✅ After: Copy is separate, created AFTER strategy
- **Why:** You might write multiple copy variations per campaign

### **4. Sequential Numbers**
- Makes workflow obvious
- Easy to find next step
- Clear what order to run

---

## 📁 **Deliverables by Phase**

| Phase | Command | Files Created | Database |
|-------|---------|---------------|----------|
| 0 | `0-offer-research` | `research/notes.md` | - |
| 1 | `1-new-offer` | `positioning-canvas.md`, `README.md` | `offers` |
| 2 | `2-offer-campaigns` | `campaigns/{slug}/` | `campaigns` |
| 3 | `3-campaign-copy` | `copy/{slug}/` | - |
| 4 | `4-campaigns-leads` | `leads/{slug}/` | `companies`, `contacts` |
| 5 | `5-leads-outreach` | - | `messages` |
| 6 | `6-campaign-review` | `results/{slug}-learnings.md` | - |

---

## 🎯 **Usage Examples**

### **Create New Offer**
```
@.cursor/commands/1-new-offer.md create AI Sales Roleplay Trainer
```

### **Create 3 Campaign Ideas**
```
@.cursor/commands/2-offer-campaigns.md sales-roleplay-trainer hiring-signal-q1
@.cursor/commands/2-offer-campaigns.md sales-roleplay-trainer tech-stack-targeting
@.cursor/commands/2-offer-campaigns.md sales-roleplay-trainer pvp-benchmarks
```

### **Write Copy for Best Campaign**
```
@.cursor/commands/3-campaign-copy.md sales-roleplay-trainer hiring-signal-q1
```

### **Find Leads for Campaign**
```
@.cursor/commands/4-campaigns-leads.md sales-roleplay-trainer hiring-signal-q1
```

---

## 📚 **Updated Documentation**

1. **`.cursor/rules/project.mdc`** - Updated workflow
2. **`offers/_template/README.md`** - New folder structure
3. **`offers/_template/copy/README.md`** - Copy folder guide
4. **`offers/_template/leads/README.md`** - Leads folder guide
5. **`docs/REORGANIZED-commands.md`** - This file

---

## ✅ **What's Better Now**

### **Before (Confusing)**
```
/new-offer → /offer-campaign → /offer-launch → /offer-send
```
- What order?
- What does "launch" mean?
- Where's the copy creation?

### **After (Clear)**
```
1-new-offer → 2-offer-campaigns → 3-campaign-copy → 4-campaigns-leads → 5-leads-outreach
```
- Numbers show sequence
- Names describe action
- Copy is explicit step

---

## 🚀 **Ready to Test**

Everything is now set up with:
- ✅ Sequential command names
- ✅ Clear folder structure
- ✅ Specialized steps (campaigns vs copy vs leads)
- ✅ Updated documentation

**Try it:**
```
@.cursor/commands/1-new-offer.md create AI Sales Roleplay Trainer
```

Let me walk you through it! 🎯

