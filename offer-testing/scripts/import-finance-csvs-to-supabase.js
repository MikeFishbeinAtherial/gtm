#!/usr/bin/env node

/**
 * Import Finance CSV files into Supabase raw tables
 * 
 * This script reads both CSV files and inserts all rows into Supabase
 * using the Supabase MCP execute_sql function.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple CSV parser (handles quoted fields)
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || null;
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  values.push(current.trim());
  
  return values;
}

// Escape SQL strings
function escapeSQL(str) {
  if (str === null || str === undefined || str === '') return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

// Generate INSERT statement for people
function generatePeopleInserts(rows) {
  if (rows.length === 0) return '';
  
  const values = rows.map(row => 
    `(${escapeSQL(row['Find people'] || '')}, ${escapeSQL(row['Company Name'] || '')}, ${escapeSQL(row['First Name'] || '')}, ${escapeSQL(row['Last Name'] || '')}, ${escapeSQL(row['Full Name'] || '')}, ${escapeSQL(row['Job Title'] || '')}, ${escapeSQL(row['Location'] || '')}, ${escapeSQL(row['Company Domain'] || '')}, ${escapeSQL(row['LinkedIn Profile'] || '')}, ${escapeSQL(row['Work Email'] || '')})`
  ).join(',\n  ');
  
  return `INSERT INTO finance_people_raw (find_people, company_name, first_name, last_name, full_name, job_title, location, company_domain, linkedin_profile, work_email)
VALUES
  ${values}
ON CONFLICT DO NOTHING;`;
}

// Generate INSERT statement for companies
function generateCompaniesInserts(rows) {
  if (rows.length === 0) return '';
  
  const values = rows.map(row => 
    `(${escapeSQL(row.id || '')}, ${escapeSQL(row.parent_id || '')}, ${escapeSQL(row.name || '')}, ${escapeSQL(row.url || '')}, ${escapeSQL(row.industry || '')}, ${row.total_employees || 'NULL'}, ${row.matching_people_count || 'NULL'}, ${row.matching_team_count || 'NULL'}, ${row.matching_job_post_count || 'NULL'}, ${escapeSQL(row.headquarters_raw || '')}, ${escapeSQL(row.headquarters_country || '')}, ${escapeSQL(row.headquarters_state || '')}, ${escapeSQL(row.domain || '')}, ${escapeSQL(row.linkedin_organization_url || '')})`
  ).join(',\n  ');
  
  return `INSERT INTO finance_companies_raw (sumble_id, parent_id, name, url, industry, total_employees, matching_people_count, matching_team_count, matching_job_post_count, headquarters_raw, headquarters_country, headquarters_state, domain, linkedin_organization_url)
VALUES
  ${values}
ON CONFLICT DO NOTHING;`;
}

async function main() {
  console.log('📖 Reading CSV files...\n');
  
  // Read people CSV
  const peoplePath = join(__dirname, '..', 'offers', 'finance', 'leads', 'finance_people_Find-people-Table-Default-view-export-1768587863277.csv');
  const peopleContent = readFileSync(peoplePath, 'utf8');
  const peopleData = parseCSV(peopleContent);
  
  console.log(`✅ People CSV: ${peopleData.rows.length} rows`);
  console.log(`   Headers: ${peopleData.headers.join(', ')}\n`);
  
  // Read companies CSV
  const companiesPath = join(__dirname, '..', 'offers', 'finance', 'leads', 'finance_companies_sumble_export_20260115_101247.csv');
  const companiesContent = readFileSync(companiesPath, 'utf8');
  const companiesData = parseCSV(companiesContent);
  
  console.log(`✅ Companies CSV: ${companiesData.rows.length} rows`);
  console.log(`   Headers: ${companiesData.headers.join(', ')}\n`);
  
  // Generate SQL
  const peopleSQL = generatePeopleInserts(peopleData.rows);
  const companiesSQL = generateCompaniesInserts(companiesData.rows);
  
  console.log('📝 Generated SQL statements:\n');
  console.log('--- PEOPLE INSERT (first 500 chars) ---');
  console.log(peopleSQL.substring(0, 500) + '...\n');
  console.log('--- COMPANIES INSERT (first 500 chars) ---');
  console.log(companiesSQL.substring(0, 500) + '...\n');
  
  // Write SQL to files for manual execution
  const peopleSQLPath = join(__dirname, '..', 'offers', 'finance', 'leads', 'finance_people_insert.sql');
  const companiesSQLPath = join(__dirname, '..', 'offers', 'finance', 'leads', 'finance_companies_insert.sql');
  
  const { writeFileSync } = await import('fs');
  writeFileSync(peopleSQLPath, peopleSQL);
  writeFileSync(companiesSQLPath, companiesSQL);
  
  console.log(`✅ SQL files written:`);
  console.log(`   ${peopleSQLPath}`);
  console.log(`   ${companiesSQLPath}\n`);
  console.log('💡 Next: Execute these SQL statements via Supabase MCP');
}

main().catch(console.error);
