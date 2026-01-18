# TheirStack Support Message - Data Recovery Request

## Message to Send

**To:** support@theirstack.com (or their support email)

**Subject:** Need Company Data from API Calls - Credits Used But Data Not Saved

---

Hi TheirStack Support,

I'm writing to request help recovering company data from API calls I made recently. Here's what happened:

## What Happened

I used your **Company Search API** (`/v1/companies/search`) to find finance companies matching specific hiring signals. The API calls were successful (credits were deducted), but my script encountered an issue before I could save the data to my database.

## Details

**API Used:** Company Search API (`/v1/companies/search`)  
**Date Range:** January 15-18, 2026 (approximately)  
**Credits Used:** All available credits (I can see usage in my dashboard)  
**API Endpoint:** `/v1/companies/search`  
**Method:** POST

**Search Parameters Used:**
- `job_filters.job_title_pattern_or`: ["Head of Data", "Director of Data", "VP Data", "Chief Data Officer", "CDO", "Head of AI", "AI Engineer", "Machine Learning", "ML Engineer", "Data Scientist", "Data Engineer", "Quant", "Quantitative Research", "Automation", "Platform Engineer"]
- `job_filters.job_description_pattern_or`: ["Snowflake", "Databricks", "dbt", "BigQuery", "Redshift", "Airflow", "Kubernetes", "LLM", "large language model", "machine learning", "NLP", "vector database"]
- `company_description_pattern_or`: ["hedge fund", "private equity", "asset management", "investment management", "alternative investment"]
- `limit`: 25 (per page)
- `page`: Multiple pages (0-10)
- `order_by`: [{ field: 'employee_count', desc: true }]

## The Problem

My script made multiple API calls to your Company Search API and received responses with company data. However:

1. **Script Issue:** The script encountered an error or timeout before saving the data to my database
2. **No Data Saved:** I don't have the company data that was returned in the API responses
3. **Credits Spent:** I can see in my dashboard that credits were used for these calls
4. **No JSON Backup:** The script was supposed to save results to JSON files, but those files weren't created (likely due to the script failure)

## What I Need

I need the **company data** that was returned in the API responses. Specifically:

- Company names
- Company domains
- Company descriptions
- Job postings found (if included)
- Technologies found (if included)
- Any other company data that was returned

## Questions

1. **Can you provide the raw API responses** from my Company Search API calls from January 15-18, 2026?
2. **Do you have API logs** that show the exact responses returned?
3. **Is there a way to export** my API usage history with the actual data returned?
4. **Can you provide request/response logs** for these specific API calls?

## Why This Matters

I spent credits on these API calls expecting to receive company data. While the API calls succeeded (credits were deducted), I don't have the data that was returned. This is critical for my lead generation workflow.

## What I've Done

I've already:
- Checked my database - no TheirStack companies saved
- Checked for JSON backup files - none found
- Reviewed my script logs - script failed before saving
- Updated my scripts to prevent this in the future (immediate JSON backups)

## Next Steps

If you can provide the API response data, I can:
- Import it into my database
- Continue with my lead generation workflow
- Ensure this doesn't happen again with better error handling

Thank you for your help!

---

**Account Information:**
- Email: [your email]
- API Key: [if needed for verification]

**Timeline:**
- API calls made: January 15-18, 2026
- Credits used: [check your dashboard]
- Issue discovered: January 18, 2026

---

## Alternative Shorter Version

Hi TheirStack Support,

I used your Company Search API (`/v1/companies/search`) on January 15-18, 2026 to find finance companies. The API calls succeeded (credits were deducted), but my script failed before I could save the returned company data.

Can you provide the company data that was returned in those API responses? I need:
- Company names and domains
- Company descriptions
- Job postings found
- Technologies found

I can see the credits were used in my dashboard, but I don't have the actual data that was returned. This is critical for my lead generation workflow.

Thank you!
