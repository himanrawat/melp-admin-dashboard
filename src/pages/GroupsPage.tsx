import { useState, useEffect, useCallback, useRef } from "react"
import {
  IconPlus,
  IconSearch,
  IconDots,
  IconUsersGroup,
  IconLock,
  IconWorld,
  IconPencil,
  IconEye,
  IconUserCheck,
  IconUserX,
  IconDownload,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { activateTeamGroup, addTeamMembers, archiveTeamGroup, fetchArchivedTeamGroups, fetchGroups, fetchTeamParticipants, fetchUsers } from "@/api/admin"
import { useAuth } from "@/context/auth-context"
import { usePopup } from "@/components/shared/popup"

type Group = {
  id: string
  name: string
  description: string
  type: "public" | "private"
  members: number
  status: "active" | "inactive"
  createdAt: string
}

type GroupTab = "all" | "active" | "archived"
const DEFAULT_PAGE_SIZE = 10
const MEMBER_BATCH_SIZE = 10

type GroupMember = {
  melpid: string
  fullName: string
  email: string
  profession: string
  department: string
  imageUrl: string
}

type AddableGroupUser = {
  melpid: string
  fullName: string
  profession: string
  department: string
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

function normalizeGroup(record: Record<string, unknown>, idx: number): Group {
  const statusFlag = record.isactive ?? record.isActive ?? record.status
  const normalizedStatus = statusFlag === 0 || statusFlag === false || statusFlag === "inactive" ? "inactive" : "active"
  const rawType = record.ispublic ?? record.type
  const normalizedType = rawType === false || rawType === 0 || rawType === "private" ? "private" : "public"
  const memberCount = Number(
    record.participants ??
    record.participant_count ??
    record.participantcount ??
    record.participantCount ??
    record.membercount ??
    record.memberCount ??
    record.totalmembers ??
    record.totalMembers ??
    record.members ??
    0,
  )
  return {
    id: String(record.groupId || record.groupid || record.id || idx),
    name: String(record.groupName || record.groupname || record.name || "Unnamed"),
    description: String(record.groupDesc || record.description || ""),
    type: normalizedType,
    members: Number.isNaN(memberCount) ? 0 : memberCount,
    status: normalizedStatus,
    createdAt: formatDisplayDate(record.createdAt || record.createddate),
  }
}

function AddGroupSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (g: Omit<Group, "id" | "createdAt" | "members">) => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<"public" | "private">("public")

  function handleSubmit() {
    if (!name) return
    onAdd({ name, description, type, status: "active" })
    setName(""); setDescription(""); setType("public")
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Create New Group</SheetTitle></SheetHeader>
        <div className="flex flex-col gap-4 px-4 flex-1">
          <div className="flex flex-col gap-1.5">
            <Label>Group Name</Label>
            <Input placeholder="e.g. Engineering" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea placeholder="Brief description of this group" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Visibility</Label>
            <Select value={type} onValueChange={(v) => setType(v as "public" | "private")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public — visible to all members</SelectItem>
                <SelectItem value="private">Private — invite only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" className="melp-radius" onClick={handleSubmit}>Create Group</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function GroupsPage() {
  const { selectedClient } = useAuth()
  const { danger, warning } = usePopup()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<GroupTab>("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [serverPage, setServerPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [responsePageCount, setResponsePageCount] = useState(1)
  const [responseTotalCount, setResponseTotalCount] = useState(0)
  const [groupMemberCounts, setGroupMemberCounts] = useState<Record<string, number>>({})
  const [addOpen, setAddOpen] = useState(false)
  const [detailsGroup, setDetailsGroup] = useState<Group | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberPage, setMemberPage] = useState(0)
  const [memberPageCount, setMemberPageCount] = useState(1)
  const [memberTotalCount, setMemberTotalCount] = useState<number | null>(null)
  const [addMemberSearch, setAddMemberSearch] = useState("")
  const [addMemberResults, setAddMemberResults] = useState<AddableGroupUser[]>([])
  const [pendingMembers, setPendingMembers] = useState<Record<string, { melpid: string; admin: boolean }>>({})
  const [addMemberLoading, setAddMemberLoading] = useState(false)
  const [addMembersSubmitting, setAddMembersSubmitting] = useState(false)
  const membersScrollRef = useRef<HTMLDivElement | null>(null)
  const membersEndRef = useRef<HTMLDivElement | null>(null)
  const memberRequestIdRef = useRef(0)
  const memberLoadLockRef = useRef(false)

  const loadGroups = useCallback(async () => {
    if (!selectedClient) {
      setGroups([])
      setGroupMemberCounts({})
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
          groupType: 1,
          page: serverPage + 1,
          pageSize,
          search: debouncedSearch,
          clientid: selectedClient,
        })
        : await fetchGroups({
          page: serverPage + 1,
          pageSize,
          search: debouncedSearch,
          clientid: selectedClient,
          isActive: activeTab === "active" ? 1 : undefined,
        })
      const list = (result.list || []) as Record<string, unknown>[]
      const nextGroups = list.map((group, idx) => {
        const mapped = normalizeGroup(group, serverPage * pageSize + idx)
        return activeTab === "archived" ? { ...mapped, status: "inactive" as const } : mapped
      })
      setGroups(nextGroups)
      setGroupMemberCounts((prev) => {
        const next = { ...prev }
        nextGroups.forEach((group) => {
          next[group.id] = group.members
        })
        return next
      })
      setDetailsGroup((prev) => {
        if (!prev) return prev
        const latest = nextGroups.find((group) => group.id === prev.id)
        return latest ? { ...prev, ...latest } : prev
      })
      setResponsePageCount(Number(result.pageCount || 0))
      setResponseTotalCount(Number(result.totalCount || 0))
    } catch (err) {
      console.error("[GroupsPage] load failed:", err)
      setError("Something went wrong while loading groups. Please try again.")
      setGroups([])
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
      const mapped: GroupMember[] = list.map((participant, idx) => ({
        melpid: String(participant.usermelpid || participant.melpid || participant.userMelpId || idx),
        fullName: String(participant.fullname || participant.userFullName || participant.name || "Unknown"),
        email: String(participant.email || ""),
        profession: String(participant.profession || participant.professionName || "Not Mentioned"),
        department: String(participant.department || participant.departmentName || ""),
        imageUrl: String(participant.userimages || participant.imageUrl || participant.image || ""),
      }))
      setMembers((prev) => (page === 1 ? mapped : mergeMembers(prev, mapped)))
      setMemberPage(page)

      const nextTotalCount = result.totalCount !== undefined ? Number(result.totalCount) : undefined
      const nextPageCount = result.pageCount !== undefined ? Number(result.pageCount) : undefined

      if (nextTotalCount !== undefined && !Number.isNaN(nextTotalCount)) {
        setMemberTotalCount(nextTotalCount)
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
    void loadGroups()
  }, [loadGroups])

  const totalRows = responseTotalCount > 0
    ? responseTotalCount
    : responsePageCount > 0 && serverPage === responsePageCount - 1
      ? serverPage * pageSize + groups.length
      : responsePageCount > 1
        ? responsePageCount * pageSize
        : groups.length

  const pageCount = Math.max(
    1,
    responsePageCount || (totalRows > 0 ? Math.ceil(totalRows / pageSize) : 1),
  )
  const selectedGroupMemberCount = detailsGroup
    ? groupMemberCounts[detailsGroup.id] ?? detailsGroup.members
    : null
  const memberTotalRows = selectedGroupMemberCount ?? memberTotalCount ?? null
  const memberDisplayStart = memberTotalRows === null || memberTotalRows === 0 ? 0 : Math.max(1, (memberPage - 1) * MEMBER_BATCH_SIZE + 1)
  const memberDisplayEnd = memberTotalRows === null || memberTotalRows === 0 ? 0 : Math.min(memberPage * MEMBER_BATCH_SIZE, memberTotalRows)
  const hasMoreMembers = memberPage < memberPageCount && (memberTotalRows === null || memberTotalRows > members.length)

  useEffect(() => {
    if (!detailsOpen || !detailsGroup || !hasMoreMembers || membersLoading) return

    const root = membersScrollRef.current
    const sentinel = membersEndRef.current
    if (!root || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting || memberLoadLockRef.current) return
        void loadParticipants(detailsGroup.id, memberPage + 1)
      },
      { root, rootMargin: "0px 0px 160px 0px" },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [detailsGroup, detailsOpen, hasMoreMembers, loadParticipants, memberPage, membersLoading])

  function handleAdd(data: Omit<Group, "id" | "createdAt" | "members">) {
    if (activeTab === "archived") return

    const newGroup: Group = {
      ...data,
      id: String(Date.now()),
      members: 0,
      createdAt: new Date().toISOString().split("T")[0],
    }

    setGroups((prev) => [newGroup, ...prev].slice(0, pageSize))
    setGroupMemberCounts((prev) => ({ ...prev, [newGroup.id]: newGroup.members }))
    setResponseTotalCount((prev) => (prev > 0 ? prev + 1 : prev))
  }

  function handleToggleStatus(group: Group) {
    if (!selectedClient) return
    if (group.status === "active") {
      danger(
        "Archive Group",
        `"${group.name}" will be archived and hidden from active groups. You can restore it later.`,
        async () => {
          await archiveTeamGroup(group.id, selectedClient)
          await loadGroups()
        },
      )
    } else {
      warning(
        "Activate Group",
        `"${group.name}" will be restored and visible in active groups.`,
        async () => {
          await activateTeamGroup(group.id, selectedClient)
          await loadGroups()
        },
      )
    }
  }

  async function openGroupDetails(group: Group) {
    setDetailsGroup(group)
    setGroupMemberCounts((prev) => ({ ...prev, [group.id]: group.members }))
    setDetailsOpen(true)
    setMembers([])
    setMemberPage(0)
    setMemberPageCount(Math.max(1, Math.ceil(group.members / MEMBER_BATCH_SIZE) || 1))
    setMemberTotalCount(null)
    setAddMemberSearch("")
    setAddMemberResults([])
    setPendingMembers({})
    await loadParticipants(group.id, 1)
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
      const mapped: AddableGroupUser[] = rawList.map((raw, idx) => ({
        melpid: String(raw.melpid || raw.usermelpid || raw.userMelpId || idx),
        fullName: String(raw.fullname || raw.userFullName || raw.name || "Unknown"),
        profession: String(raw.professionName || raw.profession || ""),
        department: String(raw.departmentName || raw.department || ""),
      }))
      setAddMemberResults(mapped)
    } catch {
      setAddMemberResults([])
    } finally {
      setAddMemberLoading(false)
    }
  }

  function togglePendingMember(user: AddableGroupUser, checked: boolean) {
    setPendingMembers((prev) => {
      if (!checked) {
        const clone = { ...prev }
        delete clone[user.melpid]
        return clone
      }
      return { ...prev, [user.melpid]: { melpid: user.melpid, admin: false } }
    })
  }

  async function submitAddMembers() {
    if (!detailsGroup || !selectedClient) return
    const payload = Object.values(pendingMembers)
    if (payload.length === 0) return
    setAddMembersSubmitting(true)
    try {
      await addTeamMembers(detailsGroup.id, selectedClient, payload)
      setPendingMembers({})
      setAddMemberSearch("")
      setAddMemberResults([])
      await Promise.all([
        loadParticipants(detailsGroup.id, 1),
        loadGroups(),
      ])
    } catch (err) {
      console.error("[GroupsPage] add members failed:", err)
      setError("Failed to add members. Please try again.")
    } finally {
      setAddMembersSubmitting(false)
    }
  }

  function handleExport() {
    const rows = groups
    if (!rows.length) return
    const headers = ["Group", "Description", "Type", "Members", "Status", "Created"]
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`
    const lines = [
      headers.join(","),
      ...rows.map((g) => [
        escapeCsv(g.name),
        escapeCsv(g.description),
        escapeCsv(g.type),
        String(g.members),
        escapeCsv(g.status),
        escapeCsv(g.createdAt),
      ].join(",")),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `melp-groups-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  // ── Filter popover state ──────────────────────────────
  const groupColumns: ColumnDef<Group>[] = [
    {
      id: "name",
      header: "Group",
      sticky: true,
      accessor: (g) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-secondary shrink-0">
            <IconUsersGroup className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate max-w-50" title={g.name}>{g.name}</p>
            <div className="flex items-center gap-1">
              {g.type === "public" ? <IconWorld className="size-3 text-muted-foreground" /> : <IconLock className="size-3 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground capitalize">{g.type}</span>
            </div>
          </div>
        </div>
      ),
      minWidth: "200px",
    },
    { id: "description", header: "Description", accessor: (g) => <span className="whitespace-normal text-muted-foreground text-sm">{g.description}</span>, minWidth: "150px" },
    {
      id: "type",
      header: "Type",
      accessor: (g) => <Badge variant="outline" className="capitalize">{g.type}</Badge>,
      minWidth: "100px",
    },
    {
      id: "members",
      header: "Members",
      accessor: (g) => (
        <button
          type="button"
          className="flex items-center gap-1.5 text-left hover:text-primary"
          onClick={() => openGroupDetails(g)}
        >
          <IconUsersGroup className="size-3.5 text-muted-foreground" />
          {g.members}
        </button>
      ),
      minWidth: "100px",
    },
    { id: "createdAt", header: "Created", accessor: "createdAt", minWidth: "110px" },
    {
      id: "actions",
      header: "",
      align: "right",
      accessor: (g) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8"><IconDots className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openGroupDetails(g)}><IconEye className="size-4 mr-2" /> View Members</DropdownMenuItem>
            <DropdownMenuItem><IconPencil className="size-4 mr-2" /> Edit Group</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleToggleStatus(g)}
              className={g.status === "active" ? "text-destructive focus:text-destructive/90" : ""}
            >
              {g.status === "active"
                ? <><IconUserX className="size-4 mr-2 text-destructive" /> Archive</>
                : <><IconUserCheck className="size-4 mr-2" /> Activate</>}
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
        <Button variant="outline" size="sm" onClick={loadGroups}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-sm text-muted-foreground">Organise users into groups for easier management and access control</p>
        </div>
        <Button size="sm" className="melp-radius" onClick={() => setAddOpen(true)}>
          <IconPlus className="size-4 mr-1.5" />
          New Group
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as GroupTab)}>
        <TabsList variant="line">
          <TabsTrigger value="all">All Groups</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search groups…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1" />

          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <IconDownload className="size-4 mr-1.5" />
            Export Groups
          </Button>
        </div>

        <div className="mt-4">
          <DataTable<Group>
            columns={groupColumns}
            data={groups}
            rowKey={(g) => g.id}
            loading={loading}
            loadingRows={8}
            emptyState={
              <span>
                {activeTab === "archived"
                  ? "No archived groups found."
                  : activeTab === "active"
                    ? "No active groups found."
                    : "No groups found."}
              </span>
            }
            paginated
            page={serverPage}
            pageCount={pageCount}
            totalRows={totalRows}
            pageSize={pageSize}
            onPageChange={setServerPage}
            onPageSizeChange={setPageSize}
            rowClassName={(g) => g.status === "inactive" ? "row-inactive" : undefined}
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
          setDetailsGroup(null)
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
                  <IconUsersGroup className="size-5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <SheetTitle className="truncate">{detailsGroup?.name || "Group Details"}</SheetTitle>
                {detailsGroup && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    {detailsGroup.type === "public"
                      ? <><IconWorld className="size-3" /> Public</>
                      : <><IconLock className="size-3" /> Private</>}
                    <span>·</span>
                    {selectedGroupMemberCount ?? detailsGroup.members} members
                  </p>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable body */}
          <div ref={membersScrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {detailsGroup && (
              <>
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
                              <Badge variant="secondary" className="shrink-0">In Group</Badge>
                            ) : (
                              <label className="text-xs flex items-center gap-1.5 shrink-0 cursor-pointer">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => togglePendingMember(user, Boolean(v))}
                                />
                                Add
                              </label>
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
              </>
            )}
          </div>

          {/* Fixed footer */}
          <SheetFooter className="px-6 py-4 border-t shrink-0">
            {detailsGroup && (
              <Button
                variant="outline"
                size="sm"
                className={detailsGroup.status === "active" ? "text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive w-fit" : "w-fit"}
                onClick={() => handleToggleStatus(detailsGroup)}
              >
                {detailsGroup.status === "active"
                  ? <><IconUserX className="size-4 mr-1.5" />Archive Group</>
                  : <><IconUserCheck className="size-4 mr-1.5" />Activate Group</>}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AddGroupSheet open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </div>
  )
}
