import { createClient } from "@supabase/supabase-js"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDistanceToNow } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"

// Display all timestamps in Eastern Time. We append " ET" in the UI for clarity.
const TIME_ZONE = "America/New_York"

/**
 * LOGS PAGE – DATA SOURCES (what shows up)
 *
 * This page aggregates from TWO separate campaign systems:
 *
 * 1) NETWORKING (LinkedIn follow-up to existing connections)
 *    - Tables: networking_campaign_batches (campaign def) + networking_outreach (messages)
 *    - Scheduled: networking_outreach.status = 'pending', use scheduled_at
 *    - Sent: networking_outreach.status = 'sent', use sent_at
 *    - Failed: networking_outreach.status = 'failed'
 *    - Contact: linkedin_connections.full_name, current_company
 *
 * 2) COLD (cold email / cold outreach, from campaigns + send_queue)
 *    - Tables: campaigns (campaign def) + send_queue (scheduled) + outreach_history (sent)
 *    - Scheduled: send_queue.status IN ('pending','scheduled'), use scheduled_for
 *    - Sent: outreach_history (campaign_id, sent_at, etc.)
 *    - Failed: send_queue.status = 'failed'
 *    - Contact: contacts.full_name + companies.name, or outreach_history.contact_email
 *
 * Both streams are merged into a single FeedItem list, sorted by time. campaignType is
 * 'networking' | 'cold' so we can show it in the Type column and filter if needed.
 */

type FeedItem = {
  id: string
  type: "scheduled" | "sent" | "failed"
  timestamp: string
  contactName: string
  companyName: string
  message: string
  campaignName: string
  /** 'networking' = LinkedIn follow-up; 'cold' = cold email/outreach */
  campaignType: "networking" | "cold"
  channel: string
  status: string
}

type FeedResponse = {
  items: FeedItem[]
  errorMessage?: string
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

/** Format timestamp for display: include " ET" so Sent (and all) tabs show timezone explicitly. */
function formatTimestampEt(iso: string): string {
  return formatInTimeZone(new Date(iso), TIME_ZONE, "MMM d, yyyy h:mm a") + " ET"
}

async function getFeedItems(): Promise<FeedResponse> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { items: [], errorMessage: "Missing Supabase environment variables in .env.local." }
  }

  const items: FeedItem[] = []

  // ─── 1) NETWORKING: scheduled (pending) ─────────────────────────────────────
  const { data: netScheduled } = await supabase
    .from("networking_outreach")
    .select(
      `id, status, scheduled_at, personalized_message,
       linkedin_connections(full_name, current_company),
       networking_campaign_batches(name)`
    )
    .eq("status", "pending")
    .order("scheduled_at", { ascending: true })
    .limit(100)

  if (netScheduled) {
    netScheduled.forEach((r: any) => {
      const conn = r.linkedin_connections
      const batch = r.networking_campaign_batches
      items.push({
        id: r.id,
        type: "scheduled",
        timestamp: r.scheduled_at,
        contactName: conn?.full_name || "Unknown",
        companyName: conn?.current_company || "Unknown",
        message: r.personalized_message || "",
        campaignName: batch?.name || "Networking",
        campaignType: "networking",
        channel: "linkedin",
        status: r.status,
      })
    })
  }

  // ─── 2) NETWORKING: sent ───────────────────────────────────────────────────
  const { data: netSent } = await supabase
    .from("networking_outreach")
    .select(
      `id, status, sent_at, personalized_message,
       linkedin_connections(full_name, current_company),
       networking_campaign_batches(name)`
    )
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(100)

  if (netSent) {
    netSent.forEach((r: any) => {
      const conn = r.linkedin_connections
      const batch = r.networking_campaign_batches
      items.push({
        id: r.id,
        type: "sent",
        timestamp: r.sent_at,
        contactName: conn?.full_name || "Unknown",
        companyName: conn?.current_company || "Unknown",
        message: r.personalized_message || "",
        campaignName: batch?.name || "Networking",
        campaignType: "networking",
        channel: "linkedin",
        status: r.status,
      })
    })
  }

  // ─── 3) NETWORKING: failed ────────────────────────────────────────────────
  const { data: netFailed } = await supabase
    .from("networking_outreach")
    .select(
      `id, status, sent_at, scheduled_at, personalized_message,
       linkedin_connections(full_name, current_company),
       networking_campaign_batches(name)`
    )
    .eq("status", "failed")
    .order("scheduled_at", { ascending: false })
    .limit(50)

  if (netFailed) {
    netFailed.forEach((r: any) => {
      const conn = r.linkedin_connections
      const batch = r.networking_campaign_batches
      items.push({
        id: r.id,
        type: "failed",
        timestamp: r.sent_at || r.scheduled_at,
        contactName: conn?.full_name || "Unknown",
        companyName: conn?.current_company || "Unknown",
        message: r.personalized_message || "",
        campaignName: batch?.name || "Networking",
        campaignType: "networking",
        channel: "linkedin",
        status: r.status,
      })
    })
  }

  // ─── 4) COLD: scheduled (send_queue, status pending/scheduled) ─────────────
  const { data: coldScheduled } = await supabase
    .from("send_queue")
    .select(
      `id, status, scheduled_for, body, subject, channel,
       campaigns(name, campaign_type),
       contacts(full_name, companies(name))`
    )
    .in("status", ["pending", "scheduled"])
    .order("scheduled_for", { ascending: true })
    .limit(100)

  if (coldScheduled) {
    coldScheduled.forEach((r: any) => {
      const camp = r.campaigns
      const contact = r.contacts
      const company = contact?.companies ?? contact?.company
      const msg = [r.subject, r.body].filter(Boolean).join(" — ") || ""
      items.push({
        id: r.id,
        type: "scheduled",
        timestamp: r.scheduled_for,
        contactName: contact?.full_name || "Unknown",
        companyName: (company && typeof company === "object" && "name" in company ? (company as { name: string }).name : null) || "Unknown",
        message: msg,
        campaignName: camp?.name || "Cold",
        campaignType: "cold",
        channel: r.channel || "email",
        status: r.status,
      })
    })
  }

  // ─── 5) COLD: sent (outreach_history) ──────────────────────────────────────
  const { data: coldSent } = await supabase
    .from("outreach_history")
    .select(
      `id, sent_at, message_body, message_subject, contact_email, contact_linkedin_url, channel,
       campaigns(name, campaign_type)`
    )
    .order("sent_at", { ascending: false })
    .limit(100)

  if (coldSent) {
    coldSent.forEach((r: any) => {
      const camp = r.campaigns
      const contact = r.contact_email || r.contact_linkedin_url || "Unknown"
      const msg = [r.message_subject, r.message_body].filter(Boolean).join(" — ") || ""
      items.push({
        id: r.id,
        type: "sent",
        timestamp: r.sent_at,
        contactName: contact,
        companyName: "—",
        message: msg,
        campaignName: camp?.name || "Cold",
        campaignType: "cold",
        channel: r.channel || "email",
        status: "sent",
      })
    })
  }

  // ─── 6) COLD: failed (send_queue status = 'failed') ────────────────────────
  const { data: coldFailed } = await supabase
    .from("send_queue")
    .select(
      `id, status, scheduled_for, last_attempt_at, body, subject, channel,
       campaigns(name, campaign_type),
       contacts(full_name, companies(name))`
    )
    .eq("status", "failed")
    .order("scheduled_for", { ascending: false })
    .limit(50)

  if (coldFailed) {
    coldFailed.forEach((r: any) => {
      const camp = r.campaigns
      const contact = r.contacts
      const company = contact?.companies ?? contact?.company
      const ts = r.last_attempt_at || r.scheduled_for
      const msg = [r.subject, r.body].filter(Boolean).join(" — ") || ""
      items.push({
        id: r.id,
        type: "failed",
        timestamp: ts,
        contactName: contact?.full_name || "Unknown",
        companyName: (company && typeof company === "object" && "name" in company ? (company as { name: string }).name : null) || "Unknown",
        message: msg,
        campaignName: camp?.name || "Cold",
        campaignType: "cold",
        channel: r.channel || "email",
        status: r.status,
      })
    })
  }

  // Sort newest first.
  const sorted = items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return { items: sorted }
}

export default async function Home() {
  const { items, errorMessage } = await getFeedItems()
  const scheduledCount = items.filter((i) => i.type === "scheduled").length
  const sentCount = items.filter((i) => i.type === "sent").length
  const failedCount = items.filter((i) => i.type === "failed").length

  return (
    <main className="min-h-screen bg-background p-8 font-sans">
      <div className="mx-auto max-w-[1400px] space-y-8">
        {/* Header: All campaigns, not a single one */}
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">System Logs</h1>
            <p className="text-sm text-muted-foreground">All campaigns (networking + cold)</p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1 bg-accent/50 border border-border rounded-none">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              <span className="font-medium text-foreground">LIVE</span>
            </div>
            <div className="text-muted-foreground self-center">
              {formatInTimeZone(new Date(), TIME_ZONE, "MMM d, yyyy")} ET
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="border border-destructive/30 bg-destructive/5 text-destructive px-4 py-3 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          <div className="border border-border p-4 bg-card">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Scheduled</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{scheduledCount}</div>
          </div>
          <div className="border border-border p-4 bg-card">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sent</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{sentCount}</div>
          </div>
          <div className="border border-border p-4 bg-card">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Failed</div>
            <div className="text-2xl font-bold mt-1 text-destructive">{failedCount}</div>
          </div>
          <div className="border border-border p-4 bg-card">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{items.length}</div>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="h-9 w-auto bg-transparent border-0 p-0 gap-6">
              <TabsTrigger value="all" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 font-medium text-sm data-[state=active]:text-foreground text-muted-foreground shadow-none">
                All Logs
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 font-medium text-sm data-[state=active]:text-foreground text-muted-foreground shadow-none">
                Scheduled
              </TabsTrigger>
              <TabsTrigger value="sent" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 font-medium text-sm data-[state=active]:text-foreground text-muted-foreground shadow-none">
                Sent
              </TabsTrigger>
              <TabsTrigger value="failed" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 font-medium text-sm data-[state=active]:text-foreground text-muted-foreground shadow-none">
                Failed
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-0">
            <LogTable items={items} />
          </TabsContent>
          <TabsContent value="scheduled" className="mt-0">
            <LogTable items={items.filter((i) => i.type === "scheduled")} />
          </TabsContent>
          <TabsContent value="sent" className="mt-0">
            <LogTable items={items.filter((i) => i.type === "sent")} />
          </TabsContent>
          <TabsContent value="failed" className="mt-0">
            <LogTable items={items.filter((i) => i.type === "failed")} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

function LogTable({ items }: { items: FeedItem[] }) {
  return (
    <div className="border border-border bg-card">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="w-[220px] font-medium text-xs text-muted-foreground uppercase tracking-wider">
              Timestamp (ET)
            </TableHead>
            <TableHead className="w-[100px] font-medium text-xs text-muted-foreground uppercase tracking-wider">
              Status
            </TableHead>
            <TableHead className="w-[100px] font-medium text-xs text-muted-foreground uppercase tracking-wider">
              Type
            </TableHead>
            <TableHead className="w-[240px] font-medium text-xs text-muted-foreground uppercase tracking-wider">
              Contact
            </TableHead>
            <TableHead className="w-[160px] font-medium text-xs text-muted-foreground uppercase tracking-wider">
              Channel
            </TableHead>
            <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider">
              Message Preview
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No logs found. Data comes from networking_outreach + send_queue + outreach_history.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={`${item.campaignType}-${item.id}`} className="group hover:bg-muted/20 border-border">
                <TableCell className="align-top py-4 text-muted-foreground whitespace-nowrap font-mono text-xs">
                  <div className="text-foreground">{formatTimestampEt(item.timestamp)}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </div>
                </TableCell>
                <TableCell className="align-top py-4">
                  <Badge
                    variant="outline"
                    className={`rounded-none font-medium text-[10px] px-2 py-0.5 border ${
                      item.status === "sent"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : item.status === "pending" || item.status === "scheduled"
                        ? "bg-secondary text-secondary-foreground border-border"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="align-top py-4">
                  <Badge
                    variant="outline"
                    className={`rounded-none font-medium text-[10px] px-2 py-0.5 border ${
                      item.campaignType === "networking"
                        ? "bg-primary/5 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {item.campaignType}
                  </Badge>
                </TableCell>
                <TableCell className="align-top py-4">
                  <div className="font-medium text-foreground text-sm">{item.contactName}</div>
                  <div className="text-muted-foreground text-xs truncate max-w-[200px] mt-0.5">
                    {item.companyName}
                  </div>
                </TableCell>
                <TableCell className="align-top py-4 text-sm text-muted-foreground">{item.channel}</TableCell>
                <TableCell className="align-top py-4">
                  <div className="max-w-[500px] font-mono text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors line-clamp-2">
                    {item.message}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
