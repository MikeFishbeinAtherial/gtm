# Offer Template

This template is used by `1-new-offer` to create new offer folders.

---

## 📁 **Folder Structure**

```
offers/{slug}/
├── {slug}-README.md              ← Offer overview (created by 1-new-offer)
├── {slug}-positioning.md         ← Positioning + ICP (created by 1-new-offer)
│
├── campaigns/                    ← Campaign strategies (created by 2-offer-campaigns)
│   └── {campaign-slug}/
│       ├── {campaign-slug}-plan.md
│       ├── {campaign-slug}-signals.md
│       └── {framework}/
│
├── copy/                         ← Email + LinkedIn copy (created by 3-campaign-copy)
│   └── {campaign-slug}/
│       ├── README.md
│       ├── email-v1.md
│       ├── email-v2.md
│       ├── linkedin-connection-v1.md
│       └── linkedin-message-v1.md
│
├── leads/                        ← Companies + Contacts (created by 4-campaigns-leads)
│   └── {campaign-slug}/
│       ├── companies.csv
│       ├── contacts.csv
│       └── summary.md
│
└── results/                      ← Campaign analytics (created by 6-campaign-review)
    └── {campaign-slug}-learnings.md
```

---

## 🔄 **Sequential Workflow**

### **Phase 1: Define Offer**
```
1-new-offer → {slug}-positioning.md, {slug}-README.md, empty folders
```

### **Phase 2: Create Campaigns**
```
2-offer-campaigns → campaigns/{campaign-slug}/
```

### **Phase 3: Write Copy**
```
3-campaign-copy → copy/{campaign-slug}/
```

### **Phase 4: Find Leads**
```
4-campaigns-leads → leads/{campaign-slug}/ + database
```

### **Phase 5: Send Messages**
```
5-leads-outreach → database (messages sent)
```

### **Phase 6: Review Results**
```
6-campaign-review → results/{campaign-slug}-learnings.md
```

---

## 📊 **What Lives Where**

| Content | Location | Created By | Used By |
|---------|----------|------------|---------|
| **Positioning** | `{slug}-positioning.md` | 1-new-offer | All phases |
| **Campaign Strategy** | `campaigns/{campaign-slug}/` | 2-offer-campaigns | Phases 3-6 |
| **Copy Variations** | `copy/{campaign-slug}/` | 3-campaign-copy | Phase 5 |
| **Lead Data** | `leads/{campaign-slug}/` | 4-campaigns-leads | Phase 5 |
| **Campaign Results** | `results/` | 6-campaign-review | Learning |

---

## 🎯 **Key Principles**

### **1. One Folder Per Campaign**
Each campaign gets its own subfolder in:
- `campaigns/` - Strategy (signals, framework)
- `copy/` - Messaging (email, LinkedIn)
- `leads/` - Target list (companies, contacts)
- `results/` - Learnings (what worked)

### **2. Offer-Level vs Campaign-Level**
- **Offer-Level** (stable): `{slug}-positioning.md`
- **Campaign-Level** (variable): `campaigns/`, `copy/`, `leads/`

### **3. Sequential Outputs**
Each phase builds on the previous:
```
Positioning → Campaigns → Copy → Leads → Outreach → Review
```

---

## 🚀 **Getting Started**

To create a new offer:

```
@.cursor/commands/1-new-offer.md create {offer-name}
```

This will create the base folder structure. Then proceed through phases 2-6 as needed.

---

## 📚 **Related Documentation**

- **Workflow Guide:** `docs/workflow-architecture-final.md`
- **Folder Structure:** `docs/folder-structure-guide.md`
- **Quick Reference:** `docs/QUICK-REFERENCE.md`
