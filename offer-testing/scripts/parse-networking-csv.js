// Parse CSV and prepare campaign data
const fs = require('fs')
const path = require('path')

const csvPath = '/Users/mikefishbein/Downloads/Craft-Messaging-Default-view-export-1766364721966.csv'
const csvContent = fs.readFileSync(csvPath, 'utf-8')

// Simple CSV parser that handles quoted fields
function parseCSV(text) {
  const lines = []
  let currentLine = []
  let currentField = ''
  let inQuotes = false
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"'
        i++
      } else {
        // Toggle quotes
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      currentLine.push(currentField)
      currentField = ''
    } else if (char === '\n' && !inQuotes) {
      // Line separator
      currentLine.push(currentField)
      lines.push(currentLine)
      currentLine = []
      currentField = ''
    } else {
      currentField += char
    }
  }
  
  // Last field/line
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField)
    lines.push(currentLine)
  }
  
  return lines
}

const rows = parseCSV(csvContent)
const headers = rows[0]

console.log('📋 CSV Headers:')
headers.forEach((h, i) => console.log(`  ${i}: ${h}`))

// Find key column indices
const urlIndex = headers.findIndex(h => h.includes('LI Person URL') || h.includes('LinkedIn'))
const firstNameIndex = headers.findIndex(h => h === 'First Name')
const lastNameIndex = headers.findIndex(h => h === 'Last Name')

console.log('\n📍 Key Columns:')
console.log(`  LinkedIn URL: Column ${urlIndex} (${headers[urlIndex]})`)
console.log(`  First Name: Column ${firstNameIndex} (${headers[firstNameIndex]})`)
console.log(`  Last Name: Column ${lastNameIndex} (${headers[lastNameIndex]})`)

// Extract contacts
const contacts = []
for (let i = 1; i < rows.length; i++) {
  const row = rows[i]
  const url = row[urlIndex]?.trim()
  const firstName = row[firstNameIndex]?.trim()
  const lastName = row[lastNameIndex]?.trim()
  
  if (url && firstName) {
    contacts.push({
      first_name: firstName,
      last_name: lastName || '',
      linkedin_url: url
    })
  }
}

console.log(`\n✅ Extracted ${contacts.length} valid contacts`)

// Show first 5
console.log('\n📝 First 5 contacts:')
contacts.slice(0, 5).forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.first_name} ${c.last_name} - ${c.linkedin_url}`)
})

// Save to JSON for import
const outputPath = path.join(__dirname, '../data/networking-contacts.json')
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, JSON.stringify(contacts, null, 2))

console.log(`\n💾 Saved to: ${outputPath}`)
console.log(`\n🎯 Ready to import ${contacts.length} contacts into campaign`)

