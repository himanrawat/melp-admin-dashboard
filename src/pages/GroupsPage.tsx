import { useState, useEffect, useCallback } from "react"
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
  IconFilter,
  IconDownload,
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
import { Textarea } from "@/components/ui/textarea"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { activateTeamGroup, addTeamMembers, archiveTeamGroup, fetchArchivedTeamGroups, fetchGroups, fetchTeamParticipants, fetchUsers } from "@/api/admin"
import { useAuth } from "@/context/auth-context"

type Group = {
  id: string
  name: string
  description: string
  type: "public" | "private"
  members: number
  status: "active" | "inactive"
  createdAt: string
}

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

type GroupFilters = {
  type: string
}

const EMPTY_FILTERS: GroupFilters = { type: "" }

function countActiveFilters(filters: GroupFilters): number {
  let count = 0
  if (filters.type) count++
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

function normalizeGroup(record: Record<string, unknown>, idx: number): Group {
  const statusFlag = record.isactive ?? record.isActive ?? record.status
  const normalizedStatus = statusFlag === 0 || statusFlag === false || statusFlag === "inactive" ? "inactive" : "active"
  const rawType = record.ispublic ?? record.type
  const normalizedType = rawType === false || rawType === 0 || rawType === "private" ? "private" : "public"
  return {
    id: String(record.groupId || record.groupid || record.id || idx),
    name: String(record.groupName || record.groupname || record.name || "Unnamed"),
    description: String(record.groupDesc || record.description || ""),
    type: normalizedType,
    members: Number(record.participants || record.participantcount || record.members || 0),
    status: normalizedStatus,
    createdAt: formatDisplayDate(record.createdAt || record.createddate),
  }
}

function AddGroupDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (g: Omit<Group, "id" | "createdAt" | "members">) => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<"public" | "private">("public")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    onAdd({ name, description, type, status: "active" })
    setName(""); setDescription(""); setType("public")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create New Group</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
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
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="melp-radius">Create Group</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function GroupsPage() {
  const { selectedClient } = useAuth()
  const [groupsByCategory, setGroupsByCategory] = useState<{
    all: Group[]
    active: Group[]
    archived: Group[]
  }>({ all: [], active: [], archived: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<GroupFilters>(EMPTY_FILTERS)
  const [addOpen, setAddOpen] = useState(false)
  const [detailsGroup, setDetailsGroup] = useState<Group | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [addMemberSearch, setAddMemberSearch] = useState("")
  const [addMemberResults, setAddMemberResults] = useState<AddableGroupUser[]>([])
  const [pendingMembers, setPendingMembers] = useState<Record<string, { melpid: string; admin: boolean }>>({})
  const [addMemberLoading, setAddMemberLoading] = useState(false)
  const [addMembersSubmitting, setAddMembersSubmitting] = useState(false)

  const loadGroups = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [activeResult, archivedResult] = await Promise.all([
        fetchGroups({ page: 1, pageSize: 200, search: "", clientid: selectedClient || undefined, isActive: 1 }),
        fetchArchivedTeamGroups({ groupType: 1, page: 1, pageSize: 200, search: "", clientid: selectedClient || undefined }),
      ])
      const activeList = (activeResult?.list || []) as Record<string, unknown>[]
      const archivedList = (archivedResult?.list || []) as Record<string, unknown>[]
      const activeGroups = activeList.map((group, idx) => normalizeGroup(group, idx))
      const archivedGroups = archivedList.map((group, idx) => ({ ...normalizeGroup(group, idx), status: "inactive" as const }))
      const allGroups = [...activeGroups, ...archivedGroups]
      setGroupsByCategory({ all: allGroups, active: activeGroups, archived: archivedGroups })
    } catch (err) {
      setError((err as Error).message || "Failed to load groups")
      setGroupsByCategory({ all: [], active: [], archived: [] })
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
      const mapped: GroupMember[] = list.map((participant, idx) => ({
        melpid: String(participant.usermelpid || participant.melpid || participant.userMelpId || idx),
        fullName: String(participant.fullname || participant.userFullName || participant.name || "Unknown"),
        email: String(participant.email || ""),
        profession: String(participant.profession || participant.professionName || "Not Mentioned"),
        department: String(participant.department || participant.departmentName || ""),
        imageUrl: String(participant.userimages || participant.imageUrl || participant.image || ""),
      }))
      setMembers(mapped)
    } catch {
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }, [selectedClient])

  useEffect(() => { loadGroups() }, [loadGroups])

  const activeCount = groupsByCategory.active.length
  const archivedCount = groupsByCategory.archived.length

  const getFilteredGroups = (tab: string) => {
    let list = [...groupsByCategory.all]
    if (tab === "active") list = [...groupsByCategory.active]
    else if (tab === "archived") list = [...groupsByCategory.archived]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q))
    }
    if (filters.type) list = list.filter((g) => g.type === filters.type)
    return list
  }

  function handleAdd(data: Omit<Group, "id" | "createdAt" | "members">) {
    setGroupsByCategory((prev) => {
      const newGroup: Group = { ...data, id: String(Date.now()), members: 0, createdAt: new Date().toISOString().split("T")[0] }
      return {
        all: [newGroup, ...prev.all],
        active: [newGroup, ...prev.active],
        archived: prev.archived,
      }
    })
  }

  async function handleToggleStatus(group: Group) {
    if (!selectedClient) return
    try {
      if (group.status === "active") {
        await archiveTeamGroup(group.id, selectedClient)
      } else {
        await activateTeamGroup(group.id, selectedClient)
      }
      await loadGroups()
    } catch (err) {
      setError((err as Error).message || "Failed to update group status")
    }
  }

  async function openGroupDetails(group: Group) {
    setDetailsGroup(group)
    setDetailsOpen(true)
    setAddMemberSearch("")
    setAddMemberResults([])
    setPendingMembers({})
    await loadParticipants(group.id)
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
      await Promise.all([loadParticipants(detailsGroup.id), loadGroups()])
    } catch (err) {
      setError((err as Error).message || "Failed to add members")
    } finally {
      setAddMembersSubmitting(false)
    }
  }

  function handleExport() {
    const rows = getFilteredGroups(activeTab)
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
  const [draft, setDraft] = useState<GroupFilters>(EMPTY_FILTERS)
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
            <DropdownMenuItem onClick={() => handleToggleStatus(g)}>
              {g.status === "active" ? <><IconUserX className="size-4 mr-2" /> Archive</> : <><IconUserCheck className="size-4 mr-2" /> Activate</>}
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="all">
            All Groups
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
              {groupsByCategory.all.length}
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
              placeholder="Search groups…"
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
                  <Label className="text-xs">Visibility</Label>
                  <Select value={draft.type || "__all__"} onValueChange={(v) => setDraft({ ...draft, type: v === "__all__" ? "" : v })}>
                    <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Types</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
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
            Export Groups
          </Button>
        </div>

        <TabsContent value="all" className="mt-4">
          <DataTable<Group> columns={groupColumns} data={getFilteredGroups("all")} rowKey={(g) => g.id} loading={loading} loadingRows={8} emptyState={<span>No groups found.</span>} paginated rowClassName={(g) => g.status === "inactive" ? "row-inactive" : undefined} />
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          <DataTable<Group> columns={groupColumns} data={getFilteredGroups("active")} rowKey={(g) => g.id} loading={loading} loadingRows={8} emptyState={<span>No active groups found.</span>} paginated />
        </TabsContent>
        <TabsContent value="archived" className="mt-4">
          <DataTable<Group> columns={groupColumns} data={getFilteredGroups("archived")} rowKey={(g) => g.id} loading={loading} loadingRows={8} emptyState={<span>No archived groups found.</span>} paginated rowClassName={(g) => g.status === "inactive" ? "row-inactive" : undefined} />
        </TabsContent>
      </Tabs>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{detailsGroup?.name || "Group Details"}</DialogTitle>
          </DialogHeader>
          {detailsGroup && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant={detailsGroup.status === "active" ? "outline" : "default"}
                  onClick={() => handleToggleStatus(detailsGroup)}
                >
                  {detailsGroup.status === "active" ? "Archive Group" : "Activate Group"}
                </Button>
              </div>

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
                            <Badge variant="secondary">In Group</Badge>
                          ) : (
                            <label className="text-xs flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => togglePendingMember(user, e.target.checked)}
                              />
                              Add
                            </label>
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

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Members ({members.length})</h4>
                {membersLoading ? (
                  <p className="text-sm text-muted-foreground">Loading members...</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members found.</p>
                    ) : members.map((member) => (
                      <div key={member.melpid} className="rounded-md border p-2">
                        <p className="text-sm font-medium">{member.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {[member.email, member.profession, member.department].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddGroupDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </div>
  )
}
