# Leads Folder

This folder contains CSV exports of companies and contacts found for each campaign.

**Created by:** `4-campaigns-leads`

---

## Structure

```
leads/
└── {campaign-slug}/
    ├── companies.csv         ← All companies found
    ├── contacts.csv          ← All contacts at those companies
    └── summary.md            ← Stats and overview
```

---

## Purpose

- Export lead data from database for review
- Provide backups of campaign targets
- Enable external analysis (Excel, Google Sheets)
- Track lead sources and quality

---

## File Formats

### companies.csv
```csv
id,name,domain,size,industry,location,fit_score,signals,source,created_at
uuid,Acme Corp,acme.com,45,B2B SaaS,United States,9,"hiring_sdrs:3",theirstack,2024-12-20
```

### contacts.csv
```csv
id,company_id,name,title,linkedin_url,email,connection_degree,status,created_at
uuid,company-uuid,John Smith,VP Sales,linkedin.com/in/johnsmith,john@acme.com,2,queued,2024-12-20
```

### summary.md
```markdown
# Campaign Lead Summary: {Campaign Name}

## Stats
- Companies Found: 43
- Contacts Found: 89
- Ready for Outreach: 69
- Skipped: 21 (12 already connected, 8 already contacted, 1 no contact)

## Signal Performance
- Primary Signal: Hiring SDRs (47 companies)
- ICP Match Rate: 91% (43/47)
- Avg Contacts/Company: 2.1

## Top Companies (by fit score)
1. Acme Corp (9/10) - Hiring 3 SDRs
2. Beta Inc (9/10) - Hiring 2 SDRs, using Salesforce
3. Gamma LLC (8/10) - Hiring 5 sales roles
...
```

---

## Usage

### Step 1: Find Leads
```
@.cursor/commands/4-campaigns-leads.md {offer-slug} {campaign-slug}
```

This will:
1. Search APIs for companies
2. Find contacts at those companies
3. Save to database
4. Export CSV files to this folder

### Step 2: Review Leads
Open CSV files in Excel/Google Sheets to review before sending

### Step 3: Send Messages
```
@.cursor/commands/5-leads-outreach.md {offer-slug} {campaign-slug}
```

This reads from database (not CSVs) but CSVs are for your reference

---

## Notes

- CSV files are **exports** for review, not the source of truth
- Database is the source of truth for `5-leads-outreach`
- If you want to exclude companies, mark them in database (update status)
- CSVs are regenerated each time you run `4-campaigns-leads`

