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
  campaign_names: string[]
  campaign_ids: string[]
  scheduled_count: number
  sent_count: number
  contact_count: number
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

export function CompaniesTableClient({
  companies,
  allCampaigns,
}: {
  companies: CompanyRow[]
  allCampaigns: string[]
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [campaignFilter, setCampaignFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortColumn, setSortColumn] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const filteredAndSorted = useMemo(() => {
    let filtered = companies.filter((c) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        if (
          !c.name.toLowerCase().includes(search) &&
          !c.domain?.toLowerCase().includes(search) &&
          !c.vertical?.toLowerCase().includes(search) &&
          !c.industry?.toLowerCase().includes(search)
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
      let aVal: any = a[sortColumn as keyof CompanyRow]
      let bVal: any = b[sortColumn as keyof CompanyRow]

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
  }, [companies, searchTerm, campaignFilter, typeFilter, statusFilter, sortColumn, sortDirection])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center border-b border-border pb-4">
        <Input
          placeholder="Search by name, domain, vertical, industry..."
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
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="disqualified">Disqualified</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="responded">Responded</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          Showing {filteredAndSorted.length} of {companies.length}
        </div>
      </div>

      {/* Table */}
      <div className="border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border">
                <ColumnHeader
                  tooltip={`Company name\nSource: companies.name\nUnique identifier for the company.`}
                >
                  Name
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Domain name (normalized, no www)\nSource: companies.domain\nUsed for deduplication and enrichment.`}
                >
                  Domain
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Company size category\nSource: companies.size\nValues: 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+`}
                >
                  Size
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Exact employee count if available\nSource: companies.size_exact\nMore precise than size category.`}
                >
                  Size Exact
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Business vertical/segment\nSource: companies.vertical\nE.g., "investment_firm", "bank", "credit_union"`}
                >
                  Vertical
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Industry classification\nSource: companies.industry\nStandard industry categorization.`}
                >
                  Industry
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Headquarters location\nSource: companies.headquarters_city, headquarters_state, headquarters_country\nCompany's primary location.`}
                >
                  Location
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Fit score (1-10)\nSource: companies.fit_score\nHow well the company matches our ICP. Higher is better.`}
                >
                  Fit Score
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Priority level\nSource: companies.priority\nValues: high, medium, low\nUsed for outreach prioritization.`}
                >
                  Priority
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Current status\nSource: companies.status\nValues: new, qualified, disqualified, contacted, responded, meeting, converted, rejected`}
                >
                  Status
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Source tool that found this company\nSource: companies.source_tool\nValues: parallel, theirstack, exa, manual\nTracks where the data came from.`}
                >
                  Source
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Type of lead\nComputed from contacts:\n- Networking: Has LinkedIn connection (linkedin_connections)\n- Cold: Has cold email contact (contacts.source_tool != linkedin)`}
                >
                  Type
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Campaigns this company is assigned to\nSource: campaign_contacts → campaigns\nVia contacts at this company. Shows all campaign names.`}
                >
                  Campaigns
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Number of contacts at this company\nSource: COUNT(contacts) WHERE company_id = company.id\nTotal people we have records for.`}
                >
                  Contacts
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Messages scheduled to send\nSource: send_queue WHERE status IN ('pending','scheduled')\nCount of pending/scheduled messages for contacts at this company.`}
                >
                  Scheduled
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`Messages already sent\nSource: send_queue WHERE status = 'sent'\nCount of sent messages for contacts at this company.`}
                >
                  Sent
                </ColumnHeader>
                <ColumnHeader
                  tooltip={`When company was discovered\nSource: companies.created_at\nTimestamp when the company was first added to the database.`}
                >
                  Created
                </ColumnHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={17} className="h-24 text-center text-muted-foreground">
                    No companies match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((company) => (
                  <TableRow key={company.id} className="hover:bg-muted/20 border-border">
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {company.domain || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{company.size || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {company.size_exact ? company.size_exact.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{company.vertical || "—"}</TableCell>
                    <TableCell className="text-sm">{company.industry || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[company.headquarters_city, company.headquarters_state, company.headquarters_country]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      {company.fit_score != null ? (
                        <Badge
                          variant="outline"
                          className={
                            company.fit_score >= 8
                              ? "bg-primary/10 text-primary border-primary/20"
                              : company.fit_score >= 6
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {company.fit_score}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {company.priority ? (
                        <Badge
                          variant="outline"
                          className={
                            company.priority === "high"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : company.priority === "medium"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {company.priority}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {company.status || "new"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {company.source_tool}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {company.is_networking && (
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">
                            Networking
                          </Badge>
                        )}
                        {company.is_cold && (
                          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                            Cold
                          </Badge>
                        )}
                        {!company.is_networking && !company.is_cold && (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {company.campaign_names.length > 0 ? (
                        <div className="max-w-[200px]">
                          {company.campaign_names.slice(0, 2).map((name, i) => (
                            <div key={i} className="truncate">
                              {name}
                            </div>
                          ))}
                          {company.campaign_names.length > 2 && (
                            <div className="text-muted-foreground/70">
                              +{company.campaign_names.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">{company.contact_count}</TableCell>
                    <TableCell className="text-center font-medium">
                      {company.scheduled_count > 0 ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {company.scheduled_count}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">{company.sent_count || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {company.created_at
                        ? formatInTimeZone(new Date(company.created_at), TIME_ZONE, "MMM d, yyyy")
                        : "—"}
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
