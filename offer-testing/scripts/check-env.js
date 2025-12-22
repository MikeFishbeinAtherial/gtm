// Helper to check your .env.local configuration
const fs = require('fs')
const path = require('path')

console.log('🔍 Checking your .env.local configuration...\n')

const envPath = path.join(__dirname, '../.env.local')

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!\n')
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=')
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim()
    }
  }
})

console.log('📋 Current configuration:\n')
console.log('UNIPILE_API_KEY:', env.UNIPILE_API_KEY ? '✓ Set (' + env.UNIPILE_API_KEY.substring(0, 10) + '...)' : '❌ Missing')
console.log('UNIPILE_DSN:', env.UNIPILE_DSN ? env.UNIPILE_DSN : '❌ Missing')
console.log('')

// Check DSN format
if (env.UNIPILE_DSN) {
  const dsn = env.UNIPILE_DSN
  
  console.log('🔍 Analyzing your DSN...\n')
  
  // Check if it has protocol
  if (!dsn.startsWith('http://') && !dsn.startsWith('https://')) {
    console.log('❌ DSN is missing protocol (https://)')
    console.log('   Current:', dsn)
    console.log('   Should be: https://' + dsn + '/api/v1')
    console.log('')
    console.log('✏️  Update your .env.local to:')
    console.log('   UNIPILE_DSN=https://' + dsn + '/api/v1')
  } else if (!dsn.includes('/api/v1')) {
    console.log('⚠️  DSN might be missing /api/v1 path')
    console.log('   Current:', dsn)
    console.log('   Should probably be:', dsn + '/api/v1')
    console.log('')
    console.log('✏️  Update your .env.local to:')
    console.log('   UNIPILE_DSN=' + dsn + '/api/v1')
  } else {
    console.log('✅ DSN format looks correct!')
    console.log('   ' + dsn)
  }
} else {
  console.log('❌ UNIPILE_DSN is not set in .env.local')
  console.log('')
  console.log('Based on what Unipile provided, it should be:')
  console.log('UNIPILE_DSN=https://api24.unipile.com:15421/api/v1')
  console.log('')
  console.log('(But check your Unipile dashboard for the exact value)')
}

console.log('')
console.log('=' .repeat(60))
console.log('💡 CORRECT FORMAT:')
console.log('=' .repeat(60))
console.log('UNIPILE_API_KEY=2HdAnLfuG.8z5MjY+YB9oo3jxLmwpWbHTcvsJ6anI4dQj2uDG3XKo=')
console.log('UNIPILE_DSN=https://api24.unipile.com:15421/api/v1')
console.log('                ^^^^^^^                       ^^^^^^^')
console.log('                protocol                      path')
console.log('=' .repeat(60))
console.log('')
console.log('After updating .env.local, run:')
console.log('  node scripts/test-unipile.js')

