import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('slug', 'finance')
    .maybeSingle()

  if (!offer) {
    console.error('Finance offer not found')
    process.exit(1)
  }

  const { count: totalContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', offer.id)

  const { data: contactsWithEmail } = await supabase
    .from('contacts')
    .select('id, email, email_status')
    .eq('offer_id', offer.id)
    .not('email', 'is', null)

  const verifiedEmails = (contactsWithEmail || []).filter(
    c => c.email && c.email_status !== 'failed'
  ).length

  console.log(`\n📊 Contact Metrics for Finance Offer\n`)
  console.log(`Total Contacts: ${totalContacts || 0}`)
  console.log(`Contacts with Email: ${verifiedEmails}`)
  console.log(`Contacts without Email: ${(totalContacts || 0) - verifiedEmails}`)
  console.log(`Email Success Rate: ${totalContacts ? ((verifiedEmails / totalContacts) * 100).toFixed(1) : 0}%`)
}

main().catch(console.error)
