"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatInTimeZone } from "date-fns-tz"

const TIME_ZONE = "America/New_York"

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
  campaign_names: string[]
  campaign_ids: string[]
  campaign_details: Array<{ name: string; offer_name: string; offer_id: string }>
  scheduled_count: number
  scheduled_for: string | null
  scheduled_messages: Array<{ scheduled_for: string; subject: string; body: string; campaign_name: string }>
  sent_count: number
  sent_messages: Array<{ sent_at: string; subject: string; body: string; campaign_name: string }>
  is_networking: boolean
  is_cold: boolean
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

export function ContactsTableClient({
  contacts,
  allCampaigns,
}: {
  contacts: ContactRow[]
  allCampaigns: string[]
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [campaignFilter, setCampaignFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortColumn, setSortColumn] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const filteredAndSorted = useMemo(() => {
    let filtered = contacts.filter((c) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        if (
          !c.full_name?.toLowerCase().includes(search) &&
          !c.email?.toLowerCase().includes(search) &&
          !c.company_name?.toLowerCase().includes(search) &&
          !c.title?.toLowerCase().includes(search)
        ) {
          return false
        }
      }

      // Campaign filter
      if (campaignFilter !== "all") {
        if (!c.campaign_names.includes(campaignFilter)) {
          return false
        }
      }

      // Type filter
      if (typeFilter === "networking" && !c.is_networking) return false
      if (typeFilter === "cold" && !c.is_cold) return false
      if (typeFilter === "both" && (!c.is_networking || !c.is_cold)) return false

      // Status filter
      if (statusFilter !== "all" && c.status !== statusFilter) return false

      return true
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortColumn as keyof ContactRow]
      let bVal: any = b[sortColumn as keyof ContactRow]

      if (aVal === null || aVal === undefined) aVal = ""
      if (bVal === null || bVal === undefined) bVal = ""

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()

      if (sortDirection === "asc") {
        return aStr.localeCompare(bStr)
      } else {
        return bStr.localeCompare(aStr)
      }
    })

    return filtered
  }, [contacts, searchTerm, campaignFilter, typeFilter, statusFilter, sortColumn, sortDirection])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center border-b border-border pb-4">
        <Input
          placeholder="Search by name, email, company, title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {allCampaigns.map((campaign) => (
              <SelectItem key={campaign} value={campaign}>
                {campaign}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="networking">Networking Only</SelectItem>
            <SelectItem value="cold">Cold Only</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="enriched">Enriched</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="responded">Responded</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          Showing {filteredAndSorted.length} of {contacts.length}
        </div>
      </div>

      {/* Table - Due to space, showing key columns only. Full table in page.tsx */}
      <div className="border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border">
                <ColumnHeader tooltip={`Full name\nSource: contacts.full_name\nPerson's complete name.`}>Name</ColumnHeader>
                <ColumnHeader tooltip={`Email address\nSource: contacts.email\nPrimary email for outreach. Shows if contact has email or needs one.`}>Email</ColumnHeader>
                <ColumnHeader tooltip={`Email verification status\nSource: contacts.email_status\nValues: unknown, valid, invalid, risky, failed`}>Email Status</ColumnHeader>
                <ColumnHeader tooltip={`Job title\nSource: contacts.title\nCurrent position at their company.`}>Title</ColumnHeader>
                <ColumnHeader tooltip={`Company name\nSource: contacts.company_id → companies.name\nThe company they work for.`}>Company</ColumnHeader>
                <ColumnHeader tooltip={`Campaign and Offer\nSource: campaign_contacts → campaigns → offers\nShows campaign name and associated offer for each contact.`}>Campaign / Offer</ColumnHeader>
                <ColumnHeader tooltip={`Copy Preview\nSource: send_queue.subject, send_queue.body\nShows the subject line and first line of the message being sent.`}>Copy Preview</ColumnHeader>
                <ColumnHeader tooltip={`Scheduled Date\nSource: send_queue.scheduled_for WHERE status IN ('pending','scheduled')\nWhen messages are scheduled to be sent.`}>Scheduled Date</ColumnHeader>
                <ColumnHeader tooltip={`Sent Date\nSource: send_queue.sent_at or outreach_history.sent_at\nWhen messages were actually sent.`}>Sent Date</ColumnHeader>
                <ColumnHeader tooltip={`Type of lead\nComputed:\n- Networking: Has LinkedIn connection (linkedin_connections)\n- Cold: Has cold email contact (contacts.source_tool != linkedin)`}>Type</ColumnHeader>
                <ColumnHeader tooltip={`Messages scheduled to send\nSource: send_queue WHERE status IN ('pending','scheduled')\nCount of pending/scheduled messages.`}>Scheduled Count</ColumnHeader>
                <ColumnHeader tooltip={`Messages already sent\nSource: send_queue WHERE status = 'sent'\nCount of sent messages.`}>Sent Count</ColumnHeader>
                <ColumnHeader tooltip={`Buyer fit score (1-10)\nSource: contacts.buyer_fit_score\nHow well the contact matches our buyer persona.`}>Fit Score</ColumnHeader>
                <ColumnHeader tooltip={`Priority level\nSource: contacts.priority\nValues: high, medium, low`}>Priority</ColumnHeader>
                <ColumnHeader tooltip={`Contact status\nSource: contacts.status\nCurrent status in the outreach process.`}>Status</ColumnHeader>
                <ColumnHeader tooltip={`When contact was discovered\nSource: contacts.created_at\nTimestamp when added to database.`}>Created</ColumnHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} className="h-24 text-center text-muted-foreground">
                    No contacts match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((contact) => (
                  <TableRow key={contact.id} className="hover:bg-muted/20 border-border">
                    <TableCell className="font-medium">{contact.full_name || "—"}</TableCell>
                    <TableCell>
                      {contact.email ? (
                        <div>
                          <a href={`mailto:${contact.email}`} className="text-primary hover:underline text-xs font-mono">
                            {contact.email}
                          </a>
                          <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[10px]">
                            Has Email
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                          No Email
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.email_status ? (
                        <Badge
                          variant="outline"
                          className={
                            contact.email_status === "valid"
                              ? "bg-primary/10 text-primary border-primary/20 text-[10px]"
                              : contact.email_status === "invalid" || contact.email_status === "failed"
                              ? "bg-destructive/10 text-destructive border-destructive/20 text-[10px]"
                              : "bg-muted text-muted-foreground text-[10px]"
                          }
                        >
                          {contact.email_status}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{contact.title || "—"}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{contact.company_name || "—"}</div>
                        {contact.company_domain && (
                          <div className="text-xs text-muted-foreground font-mono">{contact.company_domain}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {contact.campaign_details.length > 0 ? (
                        <div className="max-w-[250px] space-y-1">
                          {contact.campaign_details.map((detail, i) => (
                            <div key={i} className="border-b border-border/50 pb-1 last:border-0">
                              <div className="font-medium">{detail.name}</div>
                              <div className="text-muted-foreground">Offer: {detail.offer_name}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No campaigns</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[300px]">
                      {contact.scheduled_messages.length > 0 ? (
                        <div className="space-y-2">
                          {contact.scheduled_messages.slice(0, 1).map((msg, i) => (
                            <div key={i} className="border-l-2 border-primary/30 pl-2">
                              <div className="font-medium text-[10px] text-muted-foreground">Subject:</div>
                              <div className="truncate">{msg.subject || "—"}</div>
                              <div className="font-medium text-[10px] text-muted-foreground mt-1">Preview:</div>
                              <div className="line-clamp-2 text-[10px]">{msg.body?.substring(0, 100) || "—"}...</div>
                            </div>
                          ))}
                          {contact.scheduled_messages.length > 1 && (
                            <div className="text-muted-foreground/70 text-[10px]">+{contact.scheduled_messages.length - 1} more scheduled</div>
                          )}
                        </div>
                      ) : contact.sent_messages.length > 0 ? (
                        <div className="space-y-2">
                          {contact.sent_messages.slice(0, 1).map((msg, i) => (
                            <div key={i} className="border-l-2 border-muted pl-2">
                              <div className="font-medium text-[10px] text-muted-foreground">Subject:</div>
                              <div className="truncate">{msg.subject || "—"}</div>
                              <div className="font-medium text-[10px] text-muted-foreground mt-1">Preview:</div>
                              <div className="line-clamp-2 text-[10px]">{msg.body?.substring(0, 100) || "—"}...</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {contact.scheduled_messages.length > 0 ? (
                        <div className="space-y-1">
                          {contact.scheduled_messages.slice(0, 2).map((msg, i) => (
                            <div key={i}>
                              {formatInTimeZone(new Date(msg.scheduled_for), TIME_ZONE, "MMM d, h:mm a")} ET
                            </div>
                          ))}
                          {contact.scheduled_messages.length > 2 && (
                            <div className="text-muted-foreground/70">+{contact.scheduled_messages.length - 2} more</div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {contact.sent_messages.length > 0 ? (
                        <div className="space-y-1">
                          {contact.sent_messages.slice(0, 2).map((msg, i) => (
                            <div key={i}>
                              {formatInTimeZone(new Date(msg.sent_at), TIME_ZONE, "MMM d, h:mm a")} ET
                            </div>
                          ))}
                          {contact.sent_messages.length > 2 && (
                            <div className="text-muted-foreground/70">+{contact.sent_messages.length - 2} more</div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {contact.is_networking && (
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">
                            Networking
                          </Badge>
                        )}
                        {contact.is_cold && (
                          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                            Cold
                          </Badge>
                        )}
                        {!contact.is_networking && !contact.is_cold && (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {contact.scheduled_count > 0 ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {contact.scheduled_count}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">{contact.sent_count || "—"}</TableCell>
                    <TableCell>
                      {contact.buyer_fit_score != null ? (
                        <Badge
                          variant="outline"
                          className={
                            contact.buyer_fit_score >= 8
                              ? "bg-primary/10 text-primary border-primary/20"
                              : contact.buyer_fit_score >= 6
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {contact.buyer_fit_score}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.priority ? (
                        <Badge
                          variant="outline"
                          className={
                            contact.priority === "high"
                              ? "bg-destructive/10 text-destructive border-destructive/20 text-[10px]"
                              : contact.priority === "medium"
                              ? "bg-primary/10 text-primary border-primary/20 text-[10px]"
                              : "bg-muted text-muted-foreground text-[10px]"
                          }
                        >
                          {contact.priority}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{contact.status || "new"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {contact.created_at ? formatInTimeZone(new Date(contact.created_at), TIME_ZONE, "MMM d, yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
