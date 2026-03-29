import { useCallback, useEffect, useMemo, useState } from "react"
import {
  IconSearch,
  IconFilter,
  IconDownload,
  IconArrowsSort,
  IconRefresh,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { fetchAuditLogs } from "@/api/admin"
import { useAuth } from "@/context/auth-context"

// ── Types ────────────────────────────────────────────────

type AuditLogRow = {
  id: string
  actionTime: string
  user: string
  action: string
  target: string
  details: string
  _category: string
}

const ALL_ACTIONS = [
  "ADMIN_ASSIGNED", "ADMIN_CREATED", "ADMIN_DEACTIVATED", "ADMIN_REMOVED",
  "DOMAIN_MERGED", "DOMAIN_UNMERGED", "GROUP_ACTIVATED", "GROUP_ARCHIVED",
  "MEMBER_ADDED", "MEMBER_REMOVED", "USER_ACTIVATED", "USER_DEACTIVATED",
  "USER_DELETED", "USER_INVITED", "USER_PASSWORD_RESET", "POLICY_CREATED",
  "POLICY_UPDATED", "POLICY_DELETED", "POLICY_ASSIGNED", "POLICY_REVOKED",
  "USER_GROUP_CREATED", "USER_GROUP_UPDATED", "USER_GROUP_MEMBER_ADDED",
  "USER_GROUP_MEMBER_REMOVED", "USER_GROUP_DELETED", "USER_GROUPS_ADDED",
  "USER_GROUPS_REMOVED",
]

const CATEGORY_MAP: Record<string, string[]> = {
  user: ["USER_ACTIVATED", "USER_DEACTIVATED", "USER_DELETED", "USER_INVITED", "USER_PASSWORD_RESET"],
  admin: ["ADMIN_ASSIGNED", "ADMIN_CREATED", "ADMIN_DEACTIVATED", "ADMIN_REMOVED"],
  group: ["GROUP_ACTIVATED", "GROUP_ARCHIVED", "MEMBER_ADDED", "MEMBER_REMOVED", "USER_GROUP_CREATED", "USER_GROUP_UPDATED", "USER_GROUP_MEMBER_ADDED", "USER_GROUP_MEMBER_REMOVED", "USER_GROUP_DELETED", "USER_GROUPS_ADDED", "USER_GROUPS_REMOVED"],
  policy: ["POLICY_CREATED", "POLICY_UPDATED", "POLICY_DELETED", "POLICY_ASSIGNED", "POLICY_REVOKED"],
  domain: ["DOMAIN_MERGED", "DOMAIN_UNMERGED"],
}

function classifyAction(action: string): string {
  for (const [cat, actions] of Object.entries(CATEGORY_MAP)) {
    if (actions.includes(action)) return cat
  }
  return "other"
}

function formatActionTime(value: unknown): string {
  if (!value) return "-"
  const date = new Date(Number(value) || String(value))
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatActionLabel(action: string): string {
  return action.replace(/_/g, " ")
}

// ── Main page ────────────────────────────────────────────

export function AuditLogsPage() {
  const { selectedClient } = useAuth()

  // ── Data state ─────────────────────────────────────────
  const [allRows, setAllRows] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // ── Server-side pagination ─────────────────────────────
  const [serverPage, setServerPage] = useState(1)
  const [pageSize] = useState(200)
  const [totalCount, setTotalCount] = useState(0)

  // ── UI state ───────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedActions, setSelectedActions] = useState<string[]>([])

  // ── Filter popover state ───────────────────────────────
  const [draftActions, setDraftActions] = useState<string[]>([])
  const [actionFilterText, setActionFilterText] = useState("")

  const actionsKey = useMemo(() => selectedActions.join("|"), [selectedActions])

  // ── Load logs from API ─────────────────────────────────
  const loadLogs = useCallback(async () => {
    if (!selectedClient) {
      setAllRows([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")
    try {
      const result = await fetchAuditLogs({
        clientid: selectedClient,
        page: serverPage,
        count: pageSize,
        search: "",
        sortAsc,
        actions: selectedActions,
      })
      const list = (result.list || []) as Record<string, unknown>[]
      const str = (v: unknown, fallback = "-"): string => {
        if (v == null) return fallback
        if (typeof v === "object") return JSON.stringify(v)
        return typeof v === "string" ? v : String(v as number | boolean)
      }

      const mapped: AuditLogRow[] = list.map((log, idx) => {
        const action = str(log.action)
        const targetType = str(log.targetType, "")
        const targetId = str(log.targetId, "")
        let target = "-"
        if (targetType) {
          target = targetId ? `${targetType} (${targetId})` : targetType
        }
        return {
          id: str(log.id, "") || str(log.auditId, "") || str(log.actionTime, "") || String(idx),
          actionTime: formatActionTime(log.actionTime),
          user: str(log.userFullName, "") || str(log.email, "") || str(log.userId, "") || "-",
          action,
          target,
          details: str(log.details),
          _category: classifyAction(action),
        }
      })
      setAllRows(mapped)
      setTotalCount(Number(result.totalCount || mapped.length || 0))
    } catch (err) {
      setError((err as Error).message || "Failed to load audit logs")
      setAllRows([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [serverPage, pageSize, selectedClient, selectedActions, sortAsc])

  useEffect(() => { loadLogs() }, [loadLogs, actionsKey])

  // ── Counts by category ─────────────────────────────────
  const counts = useMemo(() => {
    const c = { all: allRows.length, user: 0, admin: 0, group: 0, policy: 0, domain: 0 }
    for (const row of allRows) {
      const cat = row._category as keyof typeof c
      if (cat in c) c[cat]++
    }
    return c
  }, [allRows])

  // ── Filtering ──────────────────────────────────────────
  const getFilteredRows = useCallback((tab: string) => {
    let list = allRows
    if (tab !== "all") {
      list = list.filter((r) => r._category === tab)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.user.toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q) ||
          r.target.toLowerCase().includes(q) ||
          r.details.toLowerCase().includes(q),
      )
    }
    return list
  }, [allRows, search])

  // ── Filter popover helpers ─────────────────────────────
  const activeFilterCount = selectedActions.length

  function handleFilterOpen(open: boolean) {
    if (open) {
      setDraftActions(selectedActions)
      setActionFilterText("")
    }
  }

  function toggleDraftAction(action: string, checked: boolean) {
    if (checked) {
      if (draftActions.length >= 5) return
      if (!draftActions.includes(action)) setDraftActions((prev) => [...prev, action])
      return
    }
    setDraftActions((prev) => prev.filter((a) => a !== action))
  }

  function handleApplyFilters() {
    setSelectedActions(draftActions)
    setServerPage(1)
  }

  function handleResetFilters() {
    setDraftActions([])
    setSelectedActions([])
    setServerPage(1)
  }

  const filteredActionOptions = ALL_ACTIONS.filter((a) =>
    a.toLowerCase().includes(actionFilterText.toLowerCase()),
  )

  // ── Export ─────────────────────────────────────────────
  function handleExport() {
    const rows = getFilteredRows(activeTab)
    if (!rows.length) return
    const headers = ["Date", "User", "Action", "Target", "Details"]
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`
    const lines = [
      headers.join(","),
      ...rows.map((r) => [
        escapeCsv(r.actionTime),
        escapeCsv(r.user),
        escapeCsv(r.action),
        escapeCsv(r.target),
        escapeCsv(r.details),
      ].join(",")),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `melp-audit-logs-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  // ── Column definitions ─────────────────────────────────
  const columns: ColumnDef<AuditLogRow>[] = [
    { id: "actionTime", header: "Date", accessor: "actionTime", minWidth: "170px", sticky: true },
    {
      id: "user",
      header: "User",
      accessor: (r) => <span className="font-medium truncate block max-w-55" title={r.user}>{r.user}</span>,
      minWidth: "180px",
    },
    {
      id: "action",
      header: "Action",
      accessor: (r) => <span className="text-muted-foreground capitalize">{formatActionLabel(r.action)}</span>,
      minWidth: "200px",
    },
    {
      id: "target",
      header: "Target",
      accessor: (r) => <span className="truncate block max-w-50 text-muted-foreground" title={r.target}>{r.target}</span>,
      minWidth: "180px",
    },
    {
      id: "details",
      header: "Details",
      accessor: (r) => <span className="line-clamp-2 text-muted-foreground">{r.details}</span>,
      minWidth: "260px",
    },
  ]

  // ── Error state ────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={loadLogs}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            Track admin and directory actions across your domain
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSortAsc((prev) => !prev); setServerPage(1) }}
          >
            <IconArrowsSort className="size-4 mr-1.5" />
            {sortAsc ? "Oldest First" : "Newest First"}
          </Button>
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <IconRefresh className="size-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="all">
            All Logs
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
              {counts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="user">
            User
            <Badge variant="secondary" className="ml-1.5 bg-blue-500/10 text-blue-600 border-0 text-[10px] px-1.5 py-0">
              {counts.user}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="admin">
            Admin
            <Badge variant="secondary" className="ml-1.5 bg-[#ee4136]/10 text-[#ee4136] border-0 text-[10px] px-1.5 py-0">
              {counts.admin}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="group">
            Group
            <Badge variant="secondary" className="ml-1.5 bg-purple-500/10 text-purple-600 border-0 text-[10px] px-1.5 py-0">
              {counts.group}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="policy">
            Policy
            <Badge variant="secondary" className="ml-1.5 bg-amber-500/10 text-amber-600 border-0 text-[10px] px-1.5 py-0">
              {counts.policy}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="domain">
            Domain
            <Badge variant="secondary" className="ml-1.5 bg-teal-500/10 text-teal-600 border-0 text-[10px] px-1.5 py-0">
              {counts.domain}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, action, or target…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter popover */}
          <Popover onOpenChange={handleFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <IconFilter className="size-4" />
                Actions
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h4 className="text-sm font-semibold">Filter by Action</h4>
                {activeFilterCount > 0 && (
                  <button onClick={handleResetFilters} className="text-xs text-muted-foreground hover:text-foreground">
                    Clear all
                  </button>
                )}
              </div>
              <div className="p-4 space-y-3">
                <Input
                  placeholder="Search actions…"
                  value={actionFilterText}
                  onChange={(e) => setActionFilterText(e.target.value)}
                  className="h-8 text-sm"
                />
                <Label className="text-xs text-muted-foreground">
                  Selected: {draftActions.length}/5
                </Label>
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {filteredActionOptions.map((action) => {
                    const isChecked = draftActions.includes(action)
                    const disableCheck = !isChecked && draftActions.length >= 5
                    return (
                      <label key={action} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer">
                        <Checkbox
                          checked={isChecked}
                          disabled={disableCheck}
                          onCheckedChange={(checked) => toggleDraftAction(action, Boolean(checked))}
                        />
                        <span className="text-xs">{formatActionLabel(action)}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
                <PopoverClose asChild>
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>Reset</Button>
                </PopoverClose>
                <PopoverClose asChild>
                  <Button size="sm" onClick={handleApplyFilters}>Apply Filters</Button>
                </PopoverClose>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex-1" />

          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <IconDownload className="size-4 mr-1.5" />
            Export Logs
          </Button>
        </div>

        {/* Tab content */}
        {(["all", "user", "admin", "group", "policy", "domain"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <DataTable<AuditLogRow>
              columns={columns}
              data={getFilteredRows(tab)}
              rowKey={(r) => r.id}
              loading={loading}
              loadingRows={8}
              emptyState={<span>No logs found.</span>}
              paginated
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Server-side pagination hint */}
      {!loading && totalCount > pageSize && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={serverPage <= 1}
            onClick={() => setServerPage((p) => Math.max(1, p - 1))}
          >
            Load Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Batch {serverPage} of {Math.ceil(totalCount / pageSize)} ({totalCount} total)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={serverPage >= Math.ceil(totalCount / pageSize)}
            onClick={() => setServerPage((p) => p + 1)}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
