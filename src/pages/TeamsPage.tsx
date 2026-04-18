import { useState, useEffect, useCallback, useRef } from "react"
import {
  IconPlus,
  IconSearch,
  IconDots,
  IconUsers,
  IconUserCheck,
  IconUserX,
  IconPencil,
  IconEye,
  IconDownload,
  IconKey,
  IconUserMinus,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
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
import { usePopup } from "@/components/shared/popup"

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

type TeamTab = "all" | "active" | "archived"
const DEFAULT_PAGE_SIZE = 10
const MEMBER_BATCH_SIZE = 10

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

function mergeMembers<T extends { melpid: string }>(current: T[], next: T[]): T[] {
  if (current.length === 0) return next
  const seen = new Set(current.map((member) => member.melpid))
  return [...current, ...next.filter((member) => !seen.has(member.melpid))]
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
  const memberCount = Number(
    record.participants ??
    record.participantcount ??
    record.participantCount ??
    record.members ??
    0,
  )
  return {
    id: String(record.groupId || record.groupid || record.id || idx),
    name: String(record.groupName || record.groupname || record.name || "Unnamed"),
    department: String(record.department || record.category || "General"),
    members: Number.isNaN(memberCount) ? 0 : memberCount,
    lead: String(record.ownerUsername || record.admin || record.lead || record.createdby || "—"),
    status: normalizedStatus,
    createdAt: formatDisplayDate(record.createdAt || record.createddate),
    topics,
  }
}

function AddTeamSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (t: Omit<Team, "id" | "createdAt">) => void }) {
  const [name, setName] = useState("")
  const [department, setDepartment] = useState("")
  const [lead, setLead] = useState("")

  function handleSubmit() {
    if (!name || !department || !lead) return
    onAdd({ name, department, lead, members: 0, status: "active", topics: [] })
    setName(""); setDepartment(""); setLead("")
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Create New Team</SheetTitle></SheetHeader>
        <div className="flex flex-col gap-4 px-4 flex-1">
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
        </div>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" className="melp-radius" onClick={handleSubmit}>Create Team</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function TeamsPage() {
  const { selectedClient } = useAuth()
  const { danger, warning } = usePopup()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<TeamTab>("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [serverPage, setServerPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [responsePageCount, setResponsePageCount] = useState(1)
  const [responseTotalCount, setResponseTotalCount] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [detailsTeam, setDetailsTeam] = useState<Team | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsTab, setDetailsTab] = useState<"members" | "topics">("members")
  const [members, setMembers] = useState<TeamMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberPage, setMemberPage] = useState(0)
  const [memberPageCount, setMemberPageCount] = useState(1)
  const [memberTotalCount, setMemberTotalCount] = useState<number | null>(null)
  const [memberActionLoading, setMemberActionLoading] = useState("")
  const [addMemberSearch, setAddMemberSearch] = useState("")
  const [addMemberResults, setAddMemberResults] = useState<AddableUser[]>([])
  const [addMemberLoading, setAddMemberLoading] = useState(false)
  const [pendingMembers, setPendingMembers] = useState<Record<string, { melpid: string; admin: boolean }>>({})
  const [addMembersSubmitting, setAddMembersSubmitting] = useState(false)
  const membersScrollRef = useRef<HTMLDivElement | null>(null)
  const membersEndRef = useRef<HTMLDivElement | null>(null)
  const memberRequestIdRef = useRef(0)
  const memberLoadLockRef = useRef(false)

  const loadTeams = useCallback(async () => {
    if (!selectedClient) {
      setTeams([])
      setResponsePageCount(1)
      setResponseTotalCount(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")
    try {
      const result = activeTab === "archived"
        ? await fetchArchivedTeamGroups({
          groupType: 0,
          page: serverPage + 1,
          pageSize,
          search: debouncedSearch,
          clientid: selectedClient,
        })
        : await fetchTeams({
          page: serverPage + 1,
          pageSize,
          search: debouncedSearch,
          clientid: selectedClient,
          isActive: activeTab === "active" ? 1 : undefined,
        })
      const list = (result.list || []) as Record<string, unknown>[]
      setTeams(
        list.map((team, idx) => {
          const mapped = normalizeTeam(team, serverPage * pageSize + idx)
          return activeTab === "archived" ? { ...mapped, status: "inactive" as const } : mapped
        }),
      )
      setResponsePageCount(Number(result.pageCount || 0))
      setResponseTotalCount(Number(result.totalCount || 0))
    } catch (err) {
      console.error("[TeamsPage] load failed:", err)
      setError("Something went wrong while loading teams. Please try again.")
      setTeams([])
      setResponsePageCount(1)
      setResponseTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [activeTab, debouncedSearch, pageSize, selectedClient, serverPage])

  const loadParticipants = useCallback(async (
    groupId: string,
    page: number,
  ) => {
    if (!selectedClient) return
    const requestId = ++memberRequestIdRef.current
    memberLoadLockRef.current = true
    setMembersLoading(true)
    try {
      const result = await fetchTeamParticipants(groupId, selectedClient, page, MEMBER_BATCH_SIZE)
      if (requestId !== memberRequestIdRef.current) return
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
      setMembers((prev) => (page === 1 ? mapped : mergeMembers(prev, mapped)))
      setMemberPage(page)

      const nextTotalCount = result.totalCount !== undefined ? Number(result.totalCount) : undefined
      const nextPageCount = result.pageCount !== undefined ? Number(result.pageCount) : undefined

      if (nextTotalCount !== undefined && !Number.isNaN(nextTotalCount)) {
        setMemberTotalCount(nextTotalCount)
        setDetailsTeam((prev) => (prev && prev.id === groupId ? { ...prev, members: nextTotalCount } : prev))
      } else if (page === 1) {
        setMemberTotalCount(null)
      }

      if (nextPageCount !== undefined && !Number.isNaN(nextPageCount)) {
        setMemberPageCount(Math.max(1, nextPageCount))
      } else if (nextTotalCount !== undefined && !Number.isNaN(nextTotalCount)) {
        setMemberPageCount(Math.max(1, Math.ceil(nextTotalCount / MEMBER_BATCH_SIZE)))
      } else {
        setMemberPageCount((prev) => Math.max(prev, page))
      }
    } catch {
      if (requestId !== memberRequestIdRef.current) return
      if (page === 1) {
        setMembers([])
        setMemberPage(0)
        setMemberPageCount(1)
        setMemberTotalCount(null)
      }
    } finally {
      if (requestId === memberRequestIdRef.current) {
        setMembersLoading(false)
        memberLoadLockRef.current = false
      }
    }
  }, [selectedClient])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setServerPage(0)
  }, [activeTab, debouncedSearch, selectedClient])

  useEffect(() => {
    void loadTeams()
  }, [loadTeams])

  const totalRows = responseTotalCount > 0
    ? responseTotalCount
    : responsePageCount > 0 && serverPage === responsePageCount - 1
      ? serverPage * pageSize + teams.length
      : responsePageCount > 1
        ? responsePageCount * pageSize
        : teams.length

  const pageCount = Math.max(
    1,
    responsePageCount || (totalRows > 0 ? Math.ceil(totalRows / pageSize) : 1),
  )
  const memberTotalRows = memberTotalCount ?? detailsTeam?.members ?? null
  const memberDisplayStart = memberTotalRows === null || memberTotalRows === 0 ? 0 : Math.max(1, (memberPage - 1) * MEMBER_BATCH_SIZE + 1)
  const memberDisplayEnd = memberTotalRows === null || memberTotalRows === 0 ? 0 : Math.min(memberPage * MEMBER_BATCH_SIZE, memberTotalRows)
  const hasMoreMembers = memberPage < memberPageCount && (memberTotalRows === null || memberTotalRows > members.length)

  useEffect(() => {
    if (
      !detailsOpen ||
      !detailsTeam ||
      detailsTab !== "members" ||
      !hasMoreMembers ||
      membersLoading
    ) return

    const root = membersScrollRef.current
    const sentinel = membersEndRef.current
    if (!root || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting || memberLoadLockRef.current) return
        void loadParticipants(detailsTeam.id, memberPage + 1)
      },
      { root, rootMargin: "0px 0px 160px 0px" },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [detailsOpen, detailsTab, detailsTeam, hasMoreMembers, loadParticipants, memberPage, membersLoading])



  function handleAdd(data: Omit<Team, "id" | "createdAt">) {
    if (activeTab === "archived") return

    const newTeam: Team = {
      ...data,
      id: String(Date.now()),
      createdAt: new Date().toISOString().split("T")[0],
      topics: data.topics || [],
    }

    setTeams((prev) => [newTeam, ...prev].slice(0, pageSize))
    setResponseTotalCount((prev) => (prev > 0 ? prev + 1 : prev))
  }

  function handleToggleStatus(team: Team) {
    if (!selectedClient) return
    if (team.status === "active") {
      danger(
        "Archive Team",
        `"${team.name}" will be archived and hidden from active teams. You can restore it later.`,
        async () => {
          await archiveTeamGroup(team.id, selectedClient)
          await loadTeams()
        },
      )
    } else {
      warning(
        "Activate Team",
        `"${team.name}" will be restored and visible in active teams.`,
        async () => {
          await activateTeamGroup(team.id, selectedClient)
          await loadTeams()
        },
      )
    }
  }

  async function openTeamDetails(team: Team) {
    setDetailsTeam(team)
    setDetailsOpen(true)
    setDetailsTab("members")
    setMembers([])
    setMemberPage(0)
    setMemberPageCount(Math.max(1, Math.ceil(team.members / MEMBER_BATCH_SIZE) || 1))
    setMemberTotalCount(null)
    setAddMemberSearch("")
    setAddMemberResults([])
    setPendingMembers({})
    await loadParticipants(team.id, 1)
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
      })
      const rawList = result.list as Record<string, unknown>[]
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
      await Promise.all([
        loadParticipants(detailsTeam.id, 1),
        loadTeams(),
      ])
    } catch (err) {
      console.error("[TeamsPage] add members failed:", err)
      setError("Failed to add members. Please try again.")
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
        await Promise.all([
          loadParticipants(detailsTeam.id, 1),
          loadTeams(),
        ])
      }
    } catch (err) {
      console.error("[TeamsPage] member action failed:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setMemberActionLoading("")
    }
  }

  function handleExport() {
    const rows = teams
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
            <DropdownMenuItem
              onClick={() => handleToggleStatus(t)}
              className={t.status === "active" ? "text-destructive focus:text-destructive/90" : ""}
            >
              {t.status === "active" ? <><IconUserX className="size-4 mr-2 text-destructive" /> Archive</> : <><IconUserCheck className="size-4 mr-2" /> Activate</>}
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
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TeamTab)}>
        <TabsList variant="line">
          <TabsTrigger value="all">All Teams</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
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

          <div className="flex-1" />

          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <IconDownload className="size-4 mr-1.5" />
            Export Teams
          </Button>
        </div>

        <div className="mt-4">
          <DataTable<Team>
            columns={teamColumns}
            data={teams}
            rowKey={(t) => t.id}
            loading={loading}
            loadingRows={8}
            emptyState={
              <span>
                {activeTab === "archived"
                  ? "No archived teams found."
                  : activeTab === "active"
                    ? "No active teams found."
                    : "No teams found."}
              </span>
            }
            paginated
            page={serverPage}
            pageCount={pageCount}
            totalRows={totalRows}
            pageSize={pageSize}
            onPageChange={setServerPage}
            onPageSizeChange={setPageSize}
            rowClassName={(t) => t.status === "inactive" ? "row-inactive" : undefined}
          />
        </div>
      </Tabs>

      <Sheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open)
          if (open) return
          memberRequestIdRef.current += 1
          memberLoadLockRef.current = false
          setDetailsTeam(null)
          setDetailsTab("members")
          setMembers([])
          setMembersLoading(false)
          setMemberPage(0)
          setMemberPageCount(1)
          setMemberTotalCount(null)
        }}
      >
        <SheetContent side="right" className="sm:max-w-xl w-full flex flex-col p-0 gap-0">
          {/* Fixed header */}
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 rounded-lg shrink-0">
                <AvatarFallback className="rounded-lg bg-secondary">
                  <IconUsers className="size-5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <SheetTitle className="truncate">{detailsTeam?.name || "Team Details"}</SheetTitle>
                {detailsTeam && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    {detailsTeam.department}
                    {detailsTeam.lead !== "—" && (
                      <><span>·</span>{detailsTeam.lead}</>
                    )}
                    <span>·</span>
                    {detailsTeam.members} members
                  </p>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable body */}
          <div ref={membersScrollRef} className="flex-1 overflow-y-auto">
            {detailsTeam && (
              <Tabs value={detailsTab} onValueChange={(value) => setDetailsTab(value as "members" | "topics")} className="px-6 py-4">
                <TabsList>
                  <TabsTrigger value="members">
                    {memberTotalRows === null ? "Members" : `Members (${memberTotalRows})`}
                  </TabsTrigger>
                  <TabsTrigger value="topics">Topics ({detailsTeam.topics.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="mt-4 space-y-6">
                  {/* Add members */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Add Members</h4>
                    <InputGroup>
                      <InputGroupInput
                        placeholder="Search users to add"
                        value={addMemberSearch}
                        onChange={(e) => setAddMemberSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") searchUsersToAdd() }}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton variant="secondary" type="button" onClick={searchUsersToAdd} disabled={addMemberLoading}>
                          {addMemberLoading ? "Searching..." : "Search"}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    {addMemberResults.length > 0 && (
                      <div className="divide-y">
                        {addMemberResults.map((user) => {
                          const checked = Boolean(pendingMembers[user.melpid])
                          const alreadyMember = members.some((m) => m.melpid === user.melpid)
                          return (
                            <div key={user.melpid} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{user.fullName}</p>
                                <p className="text-xs text-muted-foreground truncate">{[user.profession, user.department].filter(Boolean).join(" · ")}</p>
                              </div>
                              {alreadyMember ? (
                                <Badge variant="secondary" className="shrink-0">In Team</Badge>
                              ) : (
                                <div className="flex items-center gap-3 shrink-0">
                                  <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(v) => togglePendingMember(user, Boolean(v))}
                                    />
                                    Add
                                  </label>
                                  {checked && (
                                    <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                                      <Checkbox
                                        checked={pendingMembers[user.melpid]?.admin || false}
                                        onCheckedChange={(v) => togglePendingAdmin(user.melpid, Boolean(v))}
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
                    {Object.keys(pendingMembers).length > 0 && (
                      <div className="flex justify-end">
                        {(() => {
                          const count = Object.keys(pendingMembers).length
                          const plural = count === 1 ? "" : "s"
                          const label = addMembersSubmitting ? "Adding..." : `Add ${count} Member${plural}`
                          return (
                            <Button size="sm" onClick={submitAddMembers} disabled={addMembersSubmitting}>
                              {label}
                            </Button>
                          )
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Members list */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">
                      {memberTotalRows === null ? "Members" : `Members (${memberTotalRows})`}
                    </h4>
                    {false && (
                        <div className="flex items-center gap-2">
                          <span>{memberDisplayStart}-{memberDisplayEnd} of {memberTotalRows}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-8"
                              disabled={memberPage === 0 || membersLoading}
                              onClick={() => setMemberPage(0)}
                              aria-label="First members page"
                            >
                              «
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-8"
                              disabled={memberPage === 0 || membersLoading}
                              onClick={() => setMemberPage((prev) => Math.max(0, prev - 1))}
                              aria-label="Previous members page"
                            >
                              ‹
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-8"
                              disabled={memberPage >= memberPageCount - 1 || membersLoading}
                              onClick={() => setMemberPage((prev) => Math.min(memberPageCount - 1, prev + 1))}
                              aria-label="Next members page"
                            >
                              ›
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-8"
                              disabled={memberPage >= memberPageCount - 1 || membersLoading}
                              onClick={() => setMemberPage(Math.max(0, memberPageCount - 1))}
                              aria-label="Last members page"
                            >
                              »
                            </Button>
                          </div>
                        </div>
                    )}
                    {membersLoading && members.length === 0 ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }, (_, index) => (
                          <div key={index} className="flex items-center gap-3 py-2.5">
                            <Skeleton className="size-8 shrink-0 rounded-lg" />
                            <div className="min-w-0 flex-1 space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-7 w-20 shrink-0" />
                            <Skeleton className="size-8 shrink-0" />
                          </div>
                        ))}
                      </div>
                    ) : members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members found.</p>
                    ) : (
                      <div className="divide-y">
                        {members.map((member) => (
                          <div key={member.melpid} className="flex items-center gap-3 py-2.5 first:pt-0">
                            <Avatar className="size-8 shrink-0 rounded-lg">
                              {member.imageUrl && <AvatarImage src={member.imageUrl} alt={member.fullName} />}
                              <AvatarFallback className="rounded-lg text-xs">
                                {member.fullName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{member.fullName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {[member.profession, member.department].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {member.isAdmin ? <Badge variant="secondary">Admin</Badge> : <Badge variant="outline">Member</Badge>}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8"><IconDots className="size-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {member.isAdmin ? (
                                    <DropdownMenuItem
                                      disabled={memberActionLoading === `remove-admin-${member.melpid}`}
                                      onClick={() => danger(
                                        "Remove Admin",
                                        `"${member.fullName}" will lose admin privileges but remain a member of this team.`,
                                        () => runMemberAction(`remove-admin-${member.melpid}`, () => removeTeamAdmin(detailsTeam.id, selectedClient || "", member.melpid)),
                                      )}
                                    >
                                      <IconUserMinus className="size-4 mr-2" />Remove Admin
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      disabled={memberActionLoading === `make-admin-${member.melpid}`}
                                      onClick={() => runMemberAction(`make-admin-${member.melpid}`, () => assignTeamAdmin(detailsTeam.id, selectedClient || "", member.melpid))}
                                    >
                                      <IconKey className="size-4 mr-2" />Make Admin
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    disabled={memberActionLoading === `remove-${member.melpid}`}
                                    onClick={() => danger(
                                      "Remove from Team",
                                      `"${member.fullName}" will be removed from this team and lose access to its content.`,
                                      () => runMemberAction(`remove-${member.melpid}`, () => removeTeamMember(detailsTeam.id, selectedClient || "", member.melpid)),
                                    )}
                                    className="text-destructive focus:text-destructive/90"
                                  >
                                    <IconUserMinus className="size-4 mr-2 text-destructive focus:text-destructive/90" />Remove from Team
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {members.length > 0 && (
                      <div ref={membersEndRef} className="py-1 text-center text-xs text-muted-foreground">
                        {membersLoading ? "Loading more members..." : hasMoreMembers ? "Scroll to load more" : ""}
                      </div>
                    )}
                  </div>
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
          </div>

          {/* Fixed footer */}
          <SheetFooter className="px-6 py-4 border-t shrink-0">
            {detailsTeam && (
              <Button
                variant="outline"
                size="sm"
                className={detailsTeam.status === "active" ? "text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive w-fit" : "w-fit"}
                onClick={() => handleToggleStatus(detailsTeam)}
              >
                {detailsTeam.status === "active"
                  ? <><IconUserX className="size-4 mr-1.5" />Archive Team</>
                  : <><IconUserCheck className="size-4 mr-1.5" />Activate Team</>}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AddTeamSheet open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </div>
  )
}
