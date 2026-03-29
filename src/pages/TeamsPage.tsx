import { useState, useEffect, useCallback } from "react"
import {
  IconPlus,
  IconSearch,
  IconDots,
  IconUsers,
  IconUserCheck,
  IconUserX,
  IconPencil,
  IconEye,
  IconFilter,
  IconDownload,
  IconKey,
  IconUserMinus,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import {
  activateTeamGroup,
  addTeamMembers,
  archiveTeamGroup,
  assignTeamAdmin,
  fetchArchivedTeamGroups,
  fetchTeamParticipants,
  fetchTeams,
  fetchUsers,
  removeTeamAdmin,
  removeTeamMember,
} from "@/api/admin"
import { useAuth } from "@/context/auth-context"

type Team = {
  id: string
  name: string
  department: string
  members: number
  lead: string
  status: "active" | "inactive"
  createdAt: string
  topics: string[]
}

type TeamMember = {
  melpid: string
  fullName: string
  email: string
  profession: string
  department: string
  imageUrl: string
  isAdmin: boolean
}

type AddableUser = {
  melpid: string
  fullName: string
  profession: string
  department: string
  imageUrl: string
}

type TeamFilters = {
  department: string
  lead: string
}

const EMPTY_FILTERS: TeamFilters = { department: "", lead: "" }

function countActiveFilters(filters: TeamFilters): number {
  let count = 0
  if (filters.department) count++
  if (filters.lead) count++
  return count
}

function formatDisplayDate(value: unknown): string {
  if (value === null || value === undefined) return "—"
  const raw = String(value).trim()
  if (!raw) return "—"
  const num = Number(raw)
  const date = Number.isFinite(num)
    ? new Date(num > 10_000_000_000 ? num : num * 1000)
    : new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })
}

function normalizeTeam(record: Record<string, unknown>, idx: number): Team {
  const statusFlag = record.isactive ?? record.isActive ?? record.status
  const normalizedStatus = statusFlag === 0 || statusFlag === false || statusFlag === "inactive" ? "inactive" : "active"
  const rawTopics = Array.isArray(record.topicList) ? record.topicList : []
  const topics = rawTopics
    .map((topic) => {
      if (typeof topic === "string") return topic
      if (topic && typeof topic === "object") {
        const value = (topic as Record<string, unknown>).topicName ?? (topic as Record<string, unknown>).name
        return value ? String(value) : ""
      }
      return ""
    })
    .filter((topic) => topic.trim().length > 0)
  return {
    id: String(record.groupId || record.groupid || record.id || idx),
    name: String(record.groupName || record.groupname || record.name || "Unnamed"),
    department: String(record.department || record.category || "General"),
    members: Number(record.participants || record.participantcount || record.members || 0),
    lead: String(record.ownerUsername || record.admin || record.lead || record.createdby || "—"),
    status: normalizedStatus,
    createdAt: formatDisplayDate(record.createdAt || record.createddate),
    topics,
  }
}

function AddTeamDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (t: Omit<Team, "id" | "createdAt">) => void }) {
  const [name, setName] = useState("")
  const [department, setDepartment] = useState("")
  const [lead, setLead] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !department || !lead) return
    onAdd({ name, department, lead, members: 0, status: "active", topics: [] })
    setName(""); setDepartment(""); setLead("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create New Team</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Team Name</Label>
            <Input placeholder="e.g. Engineering Core" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Department</Label>
            <Input placeholder="e.g. Engineering" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Team Lead</Label>
            <Input placeholder="Full name" value={lead} onChange={(e) => setLead(e.target.value)} />
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="melp-radius">Create Team</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TeamsPage() {
  const { selectedClient } = useAuth()
  const [teamsByCategory, setTeamsByCategory] = useState<{
    all: Team[]
    active: Team[]
    archived: Team[]
  }>({ all: [], active: [], archived: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<TeamFilters>(EMPTY_FILTERS)
  const [addOpen, setAddOpen] = useState(false)
  const [detailsTeam, setDetailsTeam] = useState<Team | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberActionLoading, setMemberActionLoading] = useState("")
  const [addMemberSearch, setAddMemberSearch] = useState("")
  const [addMemberResults, setAddMemberResults] = useState<AddableUser[]>([])
  const [addMemberLoading, setAddMemberLoading] = useState(false)
  const [pendingMembers, setPendingMembers] = useState<Record<string, { melpid: string; admin: boolean }>>({})
  const [addMembersSubmitting, setAddMembersSubmitting] = useState(false)

  const loadTeams = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [activeResult, archivedResult] = await Promise.all([
        fetchTeams({ page: 1, pageSize: 200, search: "", clientid: selectedClient || undefined, isActive: 1 }),
        fetchArchivedTeamGroups({ groupType: 0, page: 1, pageSize: 200, search: "", clientid: selectedClient || undefined }),
      ])
      const activeList = (activeResult?.list || []) as Record<string, unknown>[]
      const archivedList = (archivedResult?.list || []) as Record<string, unknown>[]
      const activeTeams = activeList.map((team, idx) => normalizeTeam(team, idx))
      const archivedTeams = archivedList.map((team, idx) => ({ ...normalizeTeam(team, idx), status: "inactive" as const }))
      const allTeams = [...activeTeams, ...archivedTeams]
      setTeamsByCategory({ all: allTeams, active: activeTeams, archived: archivedTeams })
    } catch (err) {
      setError((err as Error).message || "Failed to load teams")
      setTeamsByCategory({ all: [], active: [], archived: [] })
    } finally {
      setLoading(false)
    }
  }, [selectedClient])

  const loadParticipants = useCallback(async (groupId: string) => {
    if (!selectedClient) return
    setMembersLoading(true)
    try {
      const result = await fetchTeamParticipants(groupId, selectedClient, 1, 200)
      const list = (result.list || []) as Record<string, unknown>[]
      const mapped: TeamMember[] = list.map((participant, idx) => ({
        melpid: String(participant.usermelpid || participant.melpid || participant.userMelpId || idx),
        fullName: String(participant.fullname || participant.userFullName || participant.name || "Unknown"),
        email: String(participant.email || ""),
        profession: String(participant.profession || participant.professionName || "Not Mentioned"),
        department: String(participant.department || participant.departmentName || ""),
        imageUrl: String(participant.userimages || participant.imageUrl || participant.image || ""),
        isAdmin: Boolean(participant.isAdmin && Number(participant.isAdmin) !== 0),
      }))
      setMembers(mapped)
    } catch {
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }, [selectedClient])

  useEffect(() => { loadTeams() }, [loadTeams])

  const activeCount = teamsByCategory.active.length
  const archivedCount = teamsByCategory.archived.length

  const allTeams = teamsByCategory.all
  const departments = [...new Set(allTeams.map((t) => t.department))].sort()
  const leads = [...new Set(allTeams.map((t) => t.lead).filter((l) => l !== "—"))].sort()

  const getFilteredTeams = (tab: string) => {
    let list = [...teamsByCategory.all]
    if (tab === "active") list = [...teamsByCategory.active]
    else if (tab === "archived") list = [...teamsByCategory.archived]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.lead.toLowerCase().includes(q))
    }
    if (filters.department) list = list.filter((t) => t.department === filters.department)
    if (filters.lead) list = list.filter((t) => t.lead === filters.lead)
    return list
  }

  function handleAdd(data: Omit<Team, "id" | "createdAt">) {
    setTeamsByCategory((prev) => {
      const newTeam: Team = { ...data, id: String(Date.now()), createdAt: new Date().toISOString().split("T")[0], topics: data.topics || [] }
      return {
        all: [newTeam, ...prev.all],
        active: [newTeam, ...prev.active],
        archived: prev.archived,
      }
    })
  }

  async function handleToggleStatus(team: Team) {
    if (!selectedClient) return
    try {
      if (team.status === "active") {
        await archiveTeamGroup(team.id, selectedClient)
      } else {
        await activateTeamGroup(team.id, selectedClient)
      }
      await loadTeams()
    } catch (err) {
      setError((err as Error).message || "Failed to update team status")
    }
  }

  async function openTeamDetails(team: Team) {
    setDetailsTeam(team)
    setDetailsOpen(true)
    setAddMemberSearch("")
    setAddMemberResults([])
    setPendingMembers({})
    await loadParticipants(team.id)
  }

  async function searchUsersToAdd() {
    if (!selectedClient || !addMemberSearch.trim()) {
      setAddMemberResults([])
      return
    }
    setAddMemberLoading(true)
    try {
      const result = await fetchUsers({
        page: 1,
        pageSize: 10,
        clientid: selectedClient,
        category: 0,
        filters: [
          { column: "FULL_NAME", value: addMemberSearch.trim() },
          { column: "EMAIL", value: addMemberSearch.trim() },
          { column: "ACTIVE", value: "Y" },
        ],
        sort: { column: "FULL_NAME", asc: true },
      }) as Record<string, unknown>
      const rawList = (
        (result.data as Record<string, unknown> | undefined)?.list
        || result.list
        || []
      ) as Record<string, unknown>[]
      const mapped: AddableUser[] = rawList.map((raw, idx) => ({
        melpid: String(raw.melpid || raw.usermelpid || raw.userMelpId || idx),
        fullName: String(raw.fullname || raw.userFullName || raw.name || "Unknown"),
        profession: String(raw.professionName || raw.profession || ""),
        department: String(raw.departmentName || raw.department || ""),
        imageUrl: String(raw.imageUrl || raw.userimages || raw.image || ""),
      }))
      setAddMemberResults(mapped)
    } catch {
      setAddMemberResults([])
    } finally {
      setAddMemberLoading(false)
    }
  }

  function togglePendingMember(user: AddableUser, checked: boolean) {
    setPendingMembers((prev) => {
      if (!checked) {
        const clone = { ...prev }
        delete clone[user.melpid]
        return clone
      }
      return { ...prev, [user.melpid]: { melpid: user.melpid, admin: prev[user.melpid]?.admin ?? false } }
    })
  }

  function togglePendingAdmin(melpid: string, checked: boolean) {
    setPendingMembers((prev) => {
      const current = prev[melpid]
      if (!current) return prev
      return { ...prev, [melpid]: { ...current, admin: checked } }
    })
  }

  async function submitAddMembers() {
    if (!detailsTeam || !selectedClient) return
    const payload = Object.values(pendingMembers)
    if (payload.length === 0) return
    setAddMembersSubmitting(true)
    try {
      await addTeamMembers(detailsTeam.id, selectedClient, payload)
      setPendingMembers({})
      setAddMemberSearch("")
      setAddMemberResults([])
      await Promise.all([loadParticipants(detailsTeam.id), loadTeams()])
    } catch (err) {
      setError((err as Error).message || "Failed to add members")
    } finally {
      setAddMembersSubmitting(false)
    }
  }

  async function runMemberAction(
    actionKey: string,
    fn: () => Promise<unknown>,
  ) {
    setMemberActionLoading(actionKey)
    try {
      await fn()
      if (detailsTeam) {
        await Promise.all([loadParticipants(detailsTeam.id), loadTeams()])
      }
    } catch (err) {
      setError((err as Error).message || "Member action failed")
    } finally {
      setMemberActionLoading("")
    }
  }

  function handleExport() {
    const rows = getFilteredTeams(activeTab)
    if (!rows.length) return
    const headers = ["Team", "Department", "Team Lead", "Members", "Status", "Created"]
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`
    const lines = [
      headers.join(","),
      ...rows.map((t) => [
        escapeCsv(t.name),
        escapeCsv(t.department),
        escapeCsv(t.lead),
        String(t.members),
        escapeCsv(t.status),
        escapeCsv(t.createdAt),
      ].join(",")),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `melp-teams-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  // ── Filter popover state ──────────────────────────────
  const [draft, setDraft] = useState<TeamFilters>(EMPTY_FILTERS)
  const activeFilterCount = countActiveFilters(filters)

  function handleFilterOpen(open: boolean) {
    if (open) setDraft(filters)
  }
  function handleApplyFilters() {
    setFilters(draft)
  }
  function handleResetFilters() {
    setDraft(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
  }

  const teamColumns: ColumnDef<Team>[] = [
    {
      id: "name",
      header: "Team",
      sticky: true,
      accessor: (t) => <span className="font-medium truncate block max-w-55" title={t.name}>{t.name}</span>,
      minWidth: "220px",
    },
    { id: "department", header: "Department", accessor: "department", minWidth: "140px" },
    { id: "lead", header: "Team Lead", accessor: "lead", minWidth: "150px" },
    {
      id: "members",
      header: "Members",
      accessor: (t) => (
        <button
          type="button"
          className="flex items-center gap-1.5 text-left hover:text-primary"
          onClick={() => openTeamDetails(t)}
        >
          <IconUsers className="size-3.5 text-muted-foreground" />
          {t.members}
        </button>
      ),
      minWidth: "100px",
    },
    {
      id: "topics",
      header: "Topics",
      accessor: (t) => String(t.topics.length),
      minWidth: "90px",
    },
    { id: "createdAt", header: "Created", accessor: "createdAt", minWidth: "110px" },
    {
      id: "actions",
      header: "",
      align: "right",
      accessor: (t) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8"><IconDots className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openTeamDetails(t)}><IconEye className="size-4 mr-2" /> View Details</DropdownMenuItem>
            <DropdownMenuItem><IconPencil className="size-4 mr-2" /> Edit Team</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggleStatus(t)}>
              {t.status === "active" ? <><IconUserX className="size-4 mr-2" /> Archive</> : <><IconUserCheck className="size-4 mr-2" /> Activate</>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      minWidth: "60px",
    },
  ]

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={loadTeams}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-sm text-muted-foreground">Manage teams and their members across your organisation</p>
        </div>
        <Button size="sm" className="melp-radius" onClick={() => setAddOpen(true)}>
          <IconPlus className="size-4 mr-1.5" />
          New Team
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="all">
            All Teams
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
              {teamsByCategory.all.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            <Badge variant="secondary" className="ml-1.5 bg-success/10 text-success border-0 text-[10px] px-1.5 py-0">
              {activeCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
              {archivedCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search teams or leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter button */}
          <Popover onOpenChange={handleFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <IconFilter className="size-4" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h4 className="text-sm font-semibold">Filters</h4>
                {activeFilterCount > 0 && (
                  <button onClick={handleResetFilters} className="text-xs text-muted-foreground hover:text-foreground">
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid gap-3 p-4 max-h-96 overflow-y-auto">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Department</Label>
                  <Select value={draft.department || "__all__"} onValueChange={(v) => setDraft({ ...draft, department: v === "__all__" ? "" : v })}>
                    <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="All Departments" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Departments</SelectItem>
                      {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Team Lead</Label>
                  <Select value={draft.lead || "__all__"} onValueChange={(v) => setDraft({ ...draft, lead: v === "__all__" ? "" : v })}>
                    <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="All Leads" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Leads</SelectItem>
                      {leads.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
            Export Teams
          </Button>
        </div>

        <TabsContent value="all" className="mt-4">
          <DataTable<Team> columns={teamColumns} data={getFilteredTeams("all")} rowKey={(t) => t.id} loading={loading} loadingRows={8} emptyState={<span>No teams found.</span>} paginated rowClassName={(t) => t.status === "inactive" ? "row-inactive" : undefined} />
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          <DataTable<Team> columns={teamColumns} data={getFilteredTeams("active")} rowKey={(t) => t.id} loading={loading} loadingRows={8} emptyState={<span>No active teams found.</span>} paginated />
        </TabsContent>
        <TabsContent value="archived" className="mt-4">
          <DataTable<Team> columns={teamColumns} data={getFilteredTeams("archived")} rowKey={(t) => t.id} loading={loading} loadingRows={8} emptyState={<span>No archived teams found.</span>} paginated rowClassName={(t) => t.status === "inactive" ? "row-inactive" : undefined} />
        </TabsContent>
      </Tabs>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{detailsTeam?.name || "Team Details"}</DialogTitle>
          </DialogHeader>

          {detailsTeam && (
            <Tabs defaultValue="members" className="mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <TabsList>
                  <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
                  <TabsTrigger value="topics">Topics ({detailsTeam.topics.length})</TabsTrigger>
                </TabsList>
                <Button
                  size="sm"
                  variant={detailsTeam.status === "active" ? "outline" : "default"}
                  onClick={() => handleToggleStatus(detailsTeam)}
                >
                  {detailsTeam.status === "active" ? "Archive Team" : "Activate Team"}
                </Button>
              </div>

              <TabsContent value="members" className="mt-4 space-y-4">
                <div className="rounded-md border p-3 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Search users to add"
                      value={addMemberSearch}
                      onChange={(e) => setAddMemberSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") searchUsersToAdd()
                      }}
                    />
                    <Button type="button" variant="outline" onClick={searchUsersToAdd} disabled={addMemberLoading}>
                      {addMemberLoading ? "Searching..." : "Search"}
                    </Button>
                  </div>
                  {addMemberResults.length > 0 && (
                    <div className="max-h-56 overflow-y-auto space-y-2">
                      {addMemberResults.map((user) => {
                        const checked = Boolean(pendingMembers[user.melpid])
                        const alreadyMember = members.some((m) => m.melpid === user.melpid)
                        return (
                          <div key={user.melpid} className="flex items-center justify-between gap-3 rounded border p-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{user.fullName}</p>
                              <p className="text-xs text-muted-foreground truncate">{[user.profession, user.department].filter(Boolean).join(" · ")}</p>
                            </div>
                            {alreadyMember ? (
                              <Badge variant="secondary">In Team</Badge>
                            ) : (
                              <div className="flex items-center gap-2">
                                <label className="text-xs flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => togglePendingMember(user, e.target.checked)}
                                  />
                                  Add
                                </label>
                                {checked && (
                                  <label className="text-xs flex items-center gap-1.5">
                                    <input
                                      type="checkbox"
                                      checked={pendingMembers[user.melpid]?.admin || false}
                                      onChange={(e) => togglePendingAdmin(user.melpid, e.target.checked)}
                                    />
                                    Admin
                                  </label>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button size="sm" onClick={submitAddMembers} disabled={addMembersSubmitting || Object.keys(pendingMembers).length === 0}>
                      {addMembersSubmitting ? "Adding..." : "Add Members"}
                    </Button>
                  </div>
                </div>

                {membersLoading ? (
                  <p className="text-sm text-muted-foreground">Loading members...</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members found.</p>
                    ) : members.map((member) => (
                      <div key={member.melpid} className="flex items-center justify-between gap-3 rounded-md border p-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{member.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[member.email, member.profession, member.department].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.isAdmin ? <Badge variant="secondary">Admin</Badge> : <Badge variant="outline">Member</Badge>}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8"><IconDots className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {member.isAdmin ? (
                                <DropdownMenuItem
                                  disabled={memberActionLoading === `remove-admin-${member.melpid}`}
                                  onClick={() =>
                                    runMemberAction(
                                      `remove-admin-${member.melpid}`,
                                      () => removeTeamAdmin(detailsTeam.id, selectedClient || "", member.melpid),
                                    )
                                  }
                                >
                                  <IconUserMinus className="size-4 mr-2" />
                                  Remove Admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  disabled={memberActionLoading === `make-admin-${member.melpid}`}
                                  onClick={() =>
                                    runMemberAction(
                                      `make-admin-${member.melpid}`,
                                      () => assignTeamAdmin(detailsTeam.id, selectedClient || "", member.melpid),
                                    )
                                  }
                                >
                                  <IconKey className="size-4 mr-2" />
                                  Make Admin
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                disabled={memberActionLoading === `remove-${member.melpid}`}
                                onClick={() =>
                                  runMemberAction(
                                    `remove-${member.melpid}`,
                                    () => removeTeamMember(detailsTeam.id, selectedClient || "", member.melpid),
                                  )
                                }
                                className="text-destructive focus:text-destructive"
                              >
                                <IconUserMinus className="size-4 mr-2" />
                                Remove from Team
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="topics" className="mt-4">
                {detailsTeam.topics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No topics available for this team.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {detailsTeam.topics.map((topic) => (
                      <Badge key={topic} variant="outline">{topic}</Badge>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddTeamDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </div>
  )
}
