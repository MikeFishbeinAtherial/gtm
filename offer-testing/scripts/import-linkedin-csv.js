#!/usr/bin/env node

/**
 * Import LinkedIn Connections from CSV Export
 * 
 * LinkedIn allows you to export your connections as CSV with these columns:
 * - First Name, Last Name
 * - Email Address
 * - Company, Position
 * - Connected On (date)
 * - Tags, Notes
 * - Profile URL (sometimes)
 * 
 * This script reads the CSV and imports to Supabase.
 * 
 * Usage:
 *   1. Export your LinkedIn connections: Settings > Data Privacy > Get a copy of your data > Connections
 *   2. Save the CSV file as: data/linkedin-connections.csv
 *   3. Run: node scripts/import-linkedin-csv.js
 */

import dotenv from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
// CSV parsing - using simple manual parsing since csv-parse might not be installed
// If you prefer, install csv-parse: npm install csv-parse
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  
  // Parse rows
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parsing (handles quoted fields)
    const values = []
    let current = ''
    let inQuotes = false
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim()) // Last value
    
    // Create row object
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }
  
  return rows
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SECRET_KEY 
  || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

// Import Supabase client
const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Helper: Extract domain from company name or email
function extractDomain(company, email) {
  if (email && email.includes('@')) {
    return email.split('@')[1].toLowerCase()
  }
  if (company) {
    // Try to extract domain from company name (basic - may need enhancement)
    const clean = company.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
    // This is basic - you might want to use a company-to-domain lookup API
    return null // Return null for now, can enhance later
  }
  return null
}

// Helper: Parse LinkedIn profile URL to get linkedin_id if possible
function parseLinkedInUrl(url) {
  if (!url) return null
  
  // Extract from URL like: https://www.linkedin.com/in/username
  const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/)
  return match ? match[1] : null
}

// Helper: Generate linkedin_id from available data
function generateLinkedInId(row) {
  // Try to get from Profile URL
  const profileSlug = parseLinkedInUrl(row['Profile URL'] || row['Profile'] || row['LinkedIn'])
  if (profileSlug) {
    // Use profile slug as ID (we'll update with real ID later if needed)
    return profileSlug
  }
  
  // Fallback: Generate from name + company hash
  const crypto = await import('crypto')
  const name = `${row['First Name'] || ''} ${row['Last Name'] || ''} ${row['Company'] || ''}`.trim()
  if (name) {
    const hash = crypto.createHash('md5').update(name).digest('hex').substring(0, 16)
    return `temp_${hash}`
  }
  
  return null
}

async function main() {
  console.log('📥 Importing LinkedIn Connections from CSV\n')
  console.log('='.repeat(60))

  // Step 1: Find CSV file
  const csvPath = path.join(__dirname, '..', 'data', 'linkedin-connections.csv')
  
  if (!existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`)
    console.log('\n💡 Steps to export LinkedIn connections:')
    console.log('   1. Go to LinkedIn Settings > Data Privacy')
    console.log('   2. Click "Get a copy of your data"')
    console.log('   3. Select "Connections"')
    console.log('   4. Request archive and download when ready')
    console.log('   5. Extract the CSV file')
    console.log(`   6. Save it as: ${csvPath}`)
    process.exit(1)
  }

  console.log(`\n1️⃣  Reading CSV file: ${csvPath}`)
  
  let rows
  try {
    const csvContent = readFileSync(csvPath, 'utf8')
    rows = parseCSV(csvContent)
    console.log(`   ✅ Found ${rows.length} connections in CSV`)
  } catch (error) {
    console.error(`❌ Error reading CSV: ${error.message}`)
    console.error(`   Stack: ${error.stack}`)
    process.exit(1)
  }

  // Step 2: Show CSV columns for debugging
  if (rows.length > 0) {
    console.log(`\n📋 CSV Columns found:`)
    console.log(`   ${Object.keys(rows[0]).join(', ')}`)
  }

  // Step 3: Import to Supabase
  console.log(`\n2️⃣  Importing to Supabase...`)
  
  let imported = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  for (const row of rows) {
    try {
      // Map CSV columns to our schema
      // LinkedIn CSV column names can vary, so we try multiple variations
      const firstName = row['First Name'] || row['FirstName'] || row['first_name'] || ''
      const lastName = row['Last Name'] || row['LastName'] || row['last_name'] || ''
      const fullName = row['Full Name'] || `${firstName} ${lastName}`.trim() || row['Name'] || ''
      const email = row['Email Address'] || row['Email'] || row['email'] || null
      const company = row['Company'] || row['company'] || null
      const position = row['Position'] || row['Position (Current)'] || row['Title'] || row['title'] || null
      const location = row['Location'] || row['location'] || null
      const connectedOn = row['Connected On'] || row['Connected'] || row['connected_at'] || null
      const tags = row['Tags'] || row['tags'] || null
      const notes = row['Notes'] || row['notes'] || null
      const profileUrl = row['Profile URL'] || row['Profile'] || row['LinkedIn'] || row['LinkedIn URL'] || null

      // Generate linkedin_id
      const linkedinId = generateLinkedInId(row)
      if (!linkedinId) {
        console.warn(`   ⚠️  Skipping row - no way to generate ID: ${fullName || 'Unknown'}`)
        skipped++
        continue
      }

      // Parse connected_at date
      let connectedAt = null
      if (connectedOn) {
        // LinkedIn exports dates in various formats, try to parse
        const date = new Date(connectedOn)
        if (!isNaN(date.getTime())) {
          connectedAt = date.toISOString()
        }
      }

      // Extract company domain
      const companyDomain = extractDomain(company, email)

      // Build connection data
      const connectionData = {
        linkedin_id: linkedinId,
        linkedin_url: profileUrl,
        first_name: firstName || null,
        last_name: lastName || null,
        full_name: fullName || null,
        current_company: company || null,
        current_title: position || null,
        location: location || null,
        company_domain: companyDomain,
        connected_at: connectedAt,
        tags: tags ? tags.split(',').map(t => t.trim()) : null,
        notes: notes || null,
        relationship_strength: 'unknown',
        priority: null,
        skip_outreach: false,
        raw_data: row, // Store full CSV row for reference
        updated_at: new Date().toISOString()
      }

      // Check if connection already exists
      const { data: existing } = await supabase
        .from('linkedin_connections')
        .select('id')
        .eq('linkedin_id', linkedinId)
        .single()

      if (existing) {
        // Update existing connection
        const { error } = await supabase
          .from('linkedin_connections')
          .update({
            ...connectionData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) {
          console.error(`   ❌ Error updating ${fullName}: ${error.message}`)
          errors++
        } else {
          updated++
          process.stdout.write(`\rImported: ${imported} | Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors}`)
        }
      } else {
        // Insert new connection
        const { error } = await supabase
          .from('linkedin_connections')
          .insert(connectionData)

        if (error) {
          console.error(`   ❌ Error inserting ${fullName}: ${error.message}`)
          errors++
        } else {
          imported++
          process.stdout.write(`\rImported: ${imported} | Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors}`)
        }
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 50))

    } catch (error) {
      console.error(`   ❌ Exception processing row: ${error.message}`)
      errors++
    }
  }

  console.log('\n')
  console.log('='.repeat(60))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total in CSV: ${rows.length}`)
  console.log(`✅ Imported: ${imported}`)
  console.log(`🔄 Updated: ${updated}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Errors: ${errors}`)
  console.log('='.repeat(60))

  // Step 4: Show stats
  console.log('\n📈 Connection Statistics:')
  const { data: stats } = await supabase
    .from('linkedin_connections')
    .select('id', { count: 'exact', head: true })

  console.log(`   Total connections in database: ${stats?.length || 0}`)

  // Count 2025 connections
  const { data: connections2025 } = await supabase
    .from('linkedin_connections')
    .select('id')
    .gte('connected_at', '2025-01-01')
    .lt('connected_at', '2026-01-01')

  console.log(`   Connections from 2025: ${connections2025?.length || 0}`)

  console.log('\n✅ Import complete!')
  console.log('\n💡 Next steps:')
  console.log('   1. Review connections in Supabase')
  console.log('   2. Run: node scripts/filter-2025-connections.js')
  console.log('   3. Create your campaign batch')
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
