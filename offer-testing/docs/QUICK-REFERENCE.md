# 🎯 Quick Reference: Sequential Workflow

---

## **Commands (In Order)**

| # | Command | Purpose | Output | Cost |
|---|---------|---------|--------|------|
| **0** | `0-offer-research` | Market research (optional) | `research/notes.md` | FREE |
| **1** | `1-new-offer` | Define offer + ICP | `positioning-canvas.md` | FREE |
| **2** | `2-offer-campaigns` | Create campaign strategies | `campaigns/{slug}/` | FREE |
| **3** | `3-campaign-copy` | Write email + LinkedIn copy | `copy/{slug}/` | FREE |
| **4** | `4-campaigns-leads` | Find companies & contacts | `leads/{slug}/` + DB | 💰 PAID |
| **5** | `5-leads-outreach` | Send messages (V2) | DB only | FREE |
| **6** | `6-campaign-review` | Analyze results (V2) | `results/{slug}-learnings.md` | FREE |

---

## **Folder Structure**

```
offers/{slug}/
├── positioning-canvas.md        ← Command 1
├── campaigns/{slug}/            ← Command 2
├── copy/{slug}/                 ← Command 3
├── leads/{slug}/                ← Command 4
├── research/ (optional)         ← Command 0
└── results/                     ← Command 6
```

---

## **Typical Workflow**

### **Step 1: Define Your Offer**
```bash
@.cursor/commands/1-new-offer.md create {name}
```

### **Step 2: Create 3-5 Campaign Ideas**
```bash
@.cursor/commands/2-offer-campaigns.md {slug} hiring-signals
@.cursor/commands/2-offer-campaigns.md {slug} tech-stack
@.cursor/commands/2-offer-campaigns.md {slug} pvp-approach
```

### **Step 3: Write Copy for Each Campaign**
```bash
@.cursor/commands/3-campaign-copy.md {slug} hiring-signals
@.cursor/commands/3-campaign-copy.md {slug} tech-stack
@.cursor/commands/3-campaign-copy.md {slug} pvp-approach
```

### **Step 4: Review & Pick Best Campaign**
- Review copy variations
- Compare signal quality
- Choose 1-2 campaigns to launch

### **Step 5: Find Leads (COSTS MONEY)**
```bash
@.cursor/commands/4-campaigns-leads.md {slug} hiring-signals
```

### **Step 6: Send Messages (Future)**
```bash
@.cursor/commands/5-leads-outreach.md {slug} hiring-signals
```

---

## **Cost Control Strategy**

| Free Phases | What You Do |
|-------------|-------------|
| 1-3 | Create unlimited campaigns + copy |
| Review | Pick the best 1-2 |

| Paid Phase | What You Spend |
|------------|---------------|
| 4 | API credits to find leads |

**Result:** Only spend money on campaigns you're confident in!

---

## **Key Files**

| Need | Location |
|------|----------|
| ICP | `{slug}/positioning-canvas.md` |
| Signals | `{slug}/campaigns/{campaign}/signals.md` |
| Copy | `{slug}/copy/{campaign}/email-v1.md` |
| Leads | `{slug}/leads/{campaign}/companies.csv` |

---

## **Common Commands**

### List All Campaigns
```bash
ls offers/{slug}/campaigns/
```

### List All Copy
```bash
ls offers/{slug}/copy/
```

### Review Leads
```bash
open offers/{slug}/leads/{campaign}/companies.csv
```

---

## **Tips**

✅ **DO:**
- Create 3-5 campaign ideas (free)
- Write copy for all (free)
- Pick best campaign based on copy quality + signal strength
- Only then find leads (paid)

❌ **DON'T:**
- Jump straight to finding leads
- Skip the copy step
- Launch campaign without reviewing copy first

---

**Need Help?** See `docs/REORGANIZED-commands.md` for full details.

