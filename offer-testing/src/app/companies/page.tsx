import { createClient } from "@supabase/supabase-js"
import { CompaniesTableClient } from "@/components/companies-table"

const TIME_ZONE = "America/New_York"

/**
 * COMPANIES PAGE – DATA SOURCES
 *
 * This page displays all companies from the `companies` table with:
 * - Company details (name, domain, size, industry, etc.)
 * - Campaign assignments (via campaign_contacts → contacts → companies)
 * - Scheduled messages (via send_queue → contacts → companies)
 * - Networking vs Cold indication (via linkedin_connections or contacts.source_tool)
 * - Filtering and sorting capabilities
 */

type CompanyRow = {
  id: string
  name: string
  domain: string | null
  url: string | null
  description: string | null
  size: string | null
  size_exact: number | null
  vertical: string | null
  industry: string | null
  headquarters_city: string | null
  headquarters_state: string | null
  headquarters_country: string | null
  fit_score: number | null
  priority: string | null
  status: string | null
  source_tool: string
  created_at: string | null
  updated_at: string | null
  // Aggregated data
  campaign_names: string[]
  campaign_ids: string[]
  scheduled_count: number
  sent_count: number
  contact_count: number
  is_networking: boolean // Has LinkedIn connection
  is_cold: boolean // Has cold email contact
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

function ColumnHeader({
  children,
  tooltip,
}: {
  children: React.ReactNode
  tooltip: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider cursor-help">
            {children}
          </TableHead>
        </TooltipTrigger>
        <TooltipContent className="max-w-md">
          <p className="text-xs whitespace-pre-line">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default async function CompaniesPage() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-[1800px]">
          <h1 className="text-2xl font-bold mb-4">Companies</h1>
          <p className="text-destructive">Missing Supabase environment variables.</p>
        </div>
      </main>
    )
  }

  // Fetch all companies with basic info
  const { data: companiesData } = await supabase
    .from("companies")
    .select("id, name, domain, url, description, size, size_exact, vertical, industry, headquarters_city, headquarters_state, headquarters_country, fit_score, priority, status, source_tool, created_at, updated_at")
    .order("created_at", { ascending: false })

  if (!companiesData || companiesData.length === 0) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-[1800px]">
          <h1 className="text-2xl font-bold mb-4">Companies</h1>
          <p className="text-muted-foreground">No companies found.</p>
        </div>
      </main>
    )
  }

  const companyIds = companiesData.map((c) => c.id)

  // Get contacts for these companies
  const { data: contactsData } = await supabase
    .from("contacts")
    .select("id, company_id, source_tool, linkedin_url")
    .in("company_id", companyIds)

  // Get campaign assignments via campaign_contacts
  const contactIds = (contactsData || []).map((c) => c.id)
  let campaignMap: Record<string, { names: Set<string>; ids: Set<string> }> = {}

  if (contactIds.length > 0) {
    const { data: campaignContacts } = await supabase
      .from("campaign_contacts")
      .select("contact_id, campaigns(name, id)")
      .in("contact_id", contactIds)

    if (campaignContacts) {
      campaignContacts.forEach((cc: any) => {
        const contact = contactsData?.find((c) => c.id === cc.contact_id)
        if (contact?.company_id) {
          const cid = contact.company_id
          if (!campaignMap[cid]) campaignMap[cid] = { names: new Set(), ids: new Set() }
          if (cc.campaigns?.name) campaignMap[cid].names.add(cc.campaigns.name)
          if (cc.campaigns?.id) campaignMap[cid].ids.add(cc.campaigns.id)
        }
      })
    }
  }

  // Get scheduled messages from send_queue
  let scheduledMap: Record<string, number> = {}
  let sentMap: Record<string, number> = {}

  if (contactIds.length > 0) {
    const { data: sendQueue } = await supabase
      .from("send_queue")
      .select("contact_id, status")
      .in("contact_id", contactIds)

    if (sendQueue) {
      sendQueue.forEach((sq: any) => {
        const contact = contactsData?.find((c) => c.id === sq.contact_id)
        if (contact?.company_id) {
          const cid = contact.company_id
          if (sq.status === "pending" || sq.status === "scheduled") {
            scheduledMap[cid] = (scheduledMap[cid] || 0) + 1
          }
          if (sq.status === "sent") {
            sentMap[cid] = (sentMap[cid] || 0) + 1
          }
        }
      })
    }
  }

  // Check for LinkedIn connections (networking)
  const { data: linkedinConnections } = await supabase
    .from("linkedin_connections")
    .select("linkedin_url")

  const linkedinUrls = new Set((linkedinConnections || []).map((lc) => lc.linkedin_url).filter(Boolean))

  // Build company rows
  const companies: CompanyRow[] = companiesData.map((c: any) => {
    const contacts = (contactsData || []).filter((ct) => ct.company_id === c.id)
    const campaigns = campaignMap[c.id] || { names: new Set(), ids: new Set() }
    const hasLinkedInContact = contacts.some((ct) => ct.linkedin_url && linkedinUrls.has(ct.linkedin_url))
    const hasColdContact = contacts.some((ct) => ct.source_tool && ct.source_tool !== "linkedin")

    return {
      id: c.id,
      name: c.name,
      domain: c.domain,
      url: c.url,
      description: c.description,
      size: c.size,
      size_exact: c.size_exact,
      vertical: c.vertical,
      industry: c.industry,
      headquarters_city: c.headquarters_city,
      headquarters_state: c.headquarters_state,
      headquarters_country: c.headquarters_country,
      fit_score: c.fit_score,
      priority: c.priority,
      status: c.status,
      source_tool: c.source_tool,
      created_at: c.created_at,
      updated_at: c.updated_at,
      campaign_names: Array.from(campaigns.names),
      campaign_ids: Array.from(campaigns.ids),
      scheduled_count: scheduledMap[c.id] || 0,
      sent_count: sentMap[c.id] || 0,
      contact_count: contacts.length,
      is_networking: hasLinkedInContact,
      is_cold: hasColdContact,
    }
  })

  // Get unique campaigns for filter
  const allCampaigns = Array.from(
    new Set(companies.flatMap((c) => c.campaign_names))
  ).sort()

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Companies</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {companies.length} companies • Data from `companies` table
            </p>
          </div>
        </div>

        <CompaniesTableClient companies={companies} allCampaigns={allCampaigns} />
      </div>
    </main>
  )
}
