# Copy Folder

This folder contains email and LinkedIn copy variations for each campaign.

**Created by:** `3-campaign-copy`

---

## Structure

```
copy/
└── {campaign-slug}/
    ├── README.md                    ← Copy index and A/B test plan
    ├── email-v1.md                  ← Email variation 1
    ├── email-v2.md                  ← Email variation 2
    ├── email-v3.md                  ← Email variation 3 (optional)
    ├── linkedin-connection-v1.md    ← LinkedIn connection request v1
    ├── linkedin-connection-v2.md    ← LinkedIn connection request v2
    ├── linkedin-message-v1.md       ← LinkedIn follow-up message v1
    └── linkedin-message-v2.md       ← LinkedIn follow-up message v2
```

---

## Purpose

- Store all copy variations for A/B testing
- Include personalization placeholders ({{company_name}}, etc.)
- Separate email from LinkedIn copy
- Track which variations perform best

---

## Usage

### Step 1: Generate Copy
```
@.cursor/commands/3-campaign-copy.md {offer-slug} {campaign-slug}
```

### Step 2: Review & Edit
Open files in this folder and refine messaging

### Step 3: Use in Outreach
`5-leads-outreach` will read these files and personalize for each contact

---

## Personalization Variables

All copy uses these placeholders:
- `{{company_name}}` - Company name
- `{{contact_first_name}}` - Contact's first name
- `{{contact_title}}` - Contact's job title
- `{{signal_observation}}` - Specific signal (e.g., "hiring 3 SDRs")
- `{{industry}}` - Company industry
- `{{company_size}}` - Employee count

These are replaced with real data when sending.

---

## A/B Testing

Start with 50/50 split between v1 and v2, then optimize based on:
- Open rates (email subject lines)
- Reply rates (body copy)
- Meeting book rates (CTA effectiveness)

