import { createClient } from "@supabase/supabase-js"
import { ContactsTableClient } from "@/components/contacts-table"

const TIME_ZONE = "America/New_York"

/**
 * CONTACTS PAGE – DATA SOURCES
 *
 * This page displays all contacts from the `contacts` table with:
 * - Contact details (name, title, email, LinkedIn, etc.)
 * - Company information (via contacts.company_id → companies)
 * - Campaign assignments (via campaign_contacts)
 * - Scheduled messages (via send_queue)
 * - Networking vs Cold indication (via linkedin_connections or contacts.source_tool)
 * - Filtering and sorting capabilities
 */

type ContactRow = {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  title: string | null
  department: string | null
  seniority: string | null
  email: string | null
  email_status: string | null
  email_verified: boolean | null
  phone: string | null
  linkedin_url: string | null
  linkedin_id: string | null
  connection_degree: number | null
  company_id: string
  company_name: string | null
  company_domain: string | null
  already_contacted: boolean | null
  last_contacted_at: string | null
  contact_count: number | null
  global_last_contacted_at: string | null
  global_contact_count: number | null
  global_last_reply_at: string | null
  global_status: string | null
  buyer_fit_score: number | null
  priority: string | null
  status: string | null
  source_tool: string
  eligible_for_outreach: boolean | null
  created_at: string | null
  updated_at: string | null
  // Aggregated data
  campaign_names: string[]
  campaign_ids: string[]
  campaign_details: Array<{ name: string; offer_name: string; offer_id: string }> // Campaign with offer info
  scheduled_count: number
  scheduled_for: string | null // Next scheduled message time
  sent_count: number
  scheduled_messages: Array<{ scheduled_for: string; subject: string; body: string; campaign_name: string }> // All scheduled messages
  sent_messages: Array<{ sent_at: string; subject: string; body: string; campaign_name: string }> // All sent messages
  is_networking: boolean // Is a LinkedIn connection
  is_cold: boolean // Is a cold email lead
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey)
}


export default async function ContactsPage() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-[1800px]">
          <h1 className="text-2xl font-bold mb-4">Contacts</h1>
          <p className="text-destructive">Missing Supabase environment variables.</p>
        </div>
      </main>
    )
  }

  // Fetch all contacts with company info
  const { data: contactsData } = await supabase
    .from("contacts")
    .select(
      `id, full_name, first_name, last_name, title, department, seniority, email, email_status, email_verified, phone, linkedin_url, linkedin_id, connection_degree, company_id, already_contacted, last_contacted_at, contact_count, global_last_contacted_at, global_contact_count, global_last_reply_at, global_status, buyer_fit_score, priority, status, source_tool, eligible_for_outreach, created_at, updated_at,
       companies(name, domain)`
    )
    .order("created_at", { ascending: false })

  if (!contactsData || contactsData.length === 0) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-[1800px]">
          <h1 className="text-2xl font-bold mb-4">Contacts</h1>
          <p className="text-muted-foreground">No contacts found.</p>
        </div>
      </main>
    )
  }

  const contactIds = contactsData.map((c) => c.id)

  // Get campaign assignments with offer info
  let campaignMap: Record<string, { names: Set<string>; ids: Set<string>; details: Array<{ name: string; offer_name: string; offer_id: string }> }> = {}

  if (contactIds.length > 0) {
    const { data: campaignContacts } = await supabase
      .from("campaign_contacts")
      .select("contact_id, campaigns(name, id, offer_id, offers(name))")
      .in("contact_id", contactIds)

    if (campaignContacts) {
      campaignContacts.forEach((cc: any) => {
        const cid = cc.contact_id
        if (!campaignMap[cid]) {
          campaignMap[cid] = { names: new Set(), ids: new Set(), details: [] }
        }
        if (cc.campaigns?.name) {
          campaignMap[cid].names.add(cc.campaigns.name)
          if (cc.campaigns?.id) campaignMap[cid].ids.add(cc.campaigns.id)
          // Add campaign with offer info
          const detail = {
            name: cc.campaigns.name,
            offer_name: cc.campaigns.offers?.name || "Unknown",
            offer_id: cc.campaigns.offer_id || "",
          }
          // Avoid duplicates
          if (!campaignMap[cid].details.find((d) => d.name === detail.name && d.offer_id === detail.offer_id)) {
            campaignMap[cid].details.push(detail)
          }
        }
      })
    }
  }

  // Get scheduled and sent messages with full details
  let scheduledMap: Record<string, { count: number; next: string | null; messages: Array<{ scheduled_for: string; subject: string; body: string; campaign_name: string }> }> = {}
  let sentMap: Record<string, { count: number; messages: Array<{ sent_at: string; subject: string; body: string; campaign_name: string }> }> = {}

  if (contactIds.length > 0) {
    const { data: sendQueue } = await supabase
      .from("send_queue")
      .select("contact_id, status, scheduled_for, sent_at, subject, body, campaigns(name)")
      .in("contact_id", contactIds)

    if (sendQueue) {
      sendQueue.forEach((sq: any) => {
        const cid = sq.contact_id
        if (sq.status === "pending" || sq.status === "scheduled") {
          if (!scheduledMap[cid]) scheduledMap[cid] = { count: 0, next: null, messages: [] }
          scheduledMap[cid].count += 1
          if (sq.scheduled_for && (!scheduledMap[cid].next || sq.scheduled_for < scheduledMap[cid].next!)) {
            scheduledMap[cid].next = sq.scheduled_for
          }
          // Add message details
          scheduledMap[cid].messages.push({
            scheduled_for: sq.scheduled_for,
            subject: sq.subject || "",
            body: sq.body || "",
            campaign_name: sq.campaigns?.name || "Unknown",
          })
        }
        if (sq.status === "sent") {
          if (!sentMap[cid]) sentMap[cid] = { count: 0, messages: [] }
          sentMap[cid].count += 1
          // Add sent message details
          sentMap[cid].messages.push({
            sent_at: sq.sent_at || sq.scheduled_for || "",
            subject: sq.subject || "",
            body: sq.body || "",
            campaign_name: sq.campaigns?.name || "Unknown",
          })
        }
      })
    }

    // Also check outreach_history for sent messages (by email)
    const emails = contactsData.filter((c) => c.email).map((c) => c.email!)
    if (emails.length > 0) {
      const { data: outreachHistory } = await supabase
        .from("outreach_history")
        .select("contact_email, sent_at, message_subject, message_body, campaigns(name)")
        .in("contact_email", emails)

      if (outreachHistory) {
        outreachHistory.forEach((oh: any) => {
          // Find contact by email
          const contact = contactsData.find((c) => c.email && c.email === oh.contact_email)
          if (contact) {
            const cid = contact.id
            if (!sentMap[cid]) sentMap[cid] = { count: 0, messages: [] }
            sentMap[cid].count += 1
            sentMap[cid].messages.push({
              sent_at: oh.sent_at || "",
              subject: oh.message_subject || "",
              body: oh.message_body || "",
              campaign_name: oh.campaigns?.name || "Unknown",
            })
          }
        })
      }
    }
  }

  // Check for LinkedIn connections (networking)
  const { data: linkedinConnections } = await supabase
    .from("linkedin_connections")
    .select("linkedin_url")

  const linkedinUrls = new Set((linkedinConnections || []).map((lc) => lc.linkedin_url).filter(Boolean))

  // Build contact rows
  const contacts: ContactRow[] = contactsData.map((c: any) => {
    const campaigns = campaignMap[c.id] || { names: new Set(), ids: new Set(), details: [] }
    const scheduled = scheduledMap[c.id] || { count: 0, next: null, messages: [] }
    const sent = sentMap[c.id] || { count: 0, messages: [] }
    const isLinkedInConnection = c.linkedin_url && linkedinUrls.has(c.linkedin_url)
    const isColdLead = c.source_tool && c.source_tool !== "linkedin"

    return {
      id: c.id,
      full_name: c.full_name,
      first_name: c.first_name,
      last_name: c.last_name,
      title: c.title,
      department: c.department,
      seniority: c.seniority,
      email: c.email,
      email_status: c.email_status,
      email_verified: c.email_verified,
      phone: c.phone,
      linkedin_url: c.linkedin_url,
      linkedin_id: c.linkedin_id,
      connection_degree: c.connection_degree,
      company_id: c.company_id,
      company_name: c.companies?.name || null,
      company_domain: c.companies?.domain || null,
      already_contacted: c.already_contacted,
      last_contacted_at: c.last_contacted_at,
      contact_count: c.contact_count,
      global_last_contacted_at: c.global_last_contacted_at,
      global_contact_count: c.global_contact_count,
      global_last_reply_at: c.global_last_reply_at,
      global_status: c.global_status,
      buyer_fit_score: c.buyer_fit_score,
      priority: c.priority,
      status: c.status,
      source_tool: c.source_tool,
      eligible_for_outreach: c.eligible_for_outreach,
      created_at: c.created_at,
      updated_at: c.updated_at,
      campaign_names: Array.from(campaigns.names),
      campaign_ids: Array.from(campaigns.ids),
      campaign_details: campaigns.details,
      scheduled_count: scheduled.count,
      scheduled_for: scheduled.next,
      scheduled_messages: scheduled.messages,
      sent_count: sent.count,
      sent_messages: sent.messages,
      is_networking: isLinkedInConnection,
      is_cold: isColdLead,
    }
  })

  // Get unique campaigns for filter
  const allCampaigns = Array.from(
    new Set(contacts.flatMap((c) => c.campaign_names))
  ).sort()

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Contacts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {contacts.length} contacts • Data from `contacts` table
            </p>
          </div>
        </div>

        <ContactsTableClient contacts={contacts} allCampaigns={allCampaigns} />
      </div>
    </main>
  )
}
