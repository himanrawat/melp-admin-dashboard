import { useState, useEffect, useCallback } from "react"
import { IconUserPlus, IconUpload, IconLoader2 } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { type User } from "@/components/users/users-data"
import { UsersStatCards } from "@/components/users/users-stat-cards"
import { UsersToolbar } from "@/components/users/users-toolbar"
import { UsersDataTable, DEFAULT_VISIBLE_COLS, type ColKey } from "@/components/users/users-data-table"
import { AddUserDialog } from "@/components/users/add-user-dialog"
import { InviteDialog } from "@/components/users/user-confirm-dialogs"
import { fetchUsers, fetchAdmins, manualInviteUsers } from "@/api/admin"
import { useAuth } from "@/context/auth-context"

export function UsersPage() {
  const { selectedClient } = useAuth()

  // ── Data state ─────────────────────────────────────────
  const [usersByCategory, setUsersByCategory] = useState<{
    all: User[]
    active: User[]
    inactive: User[]
    admin: User[]
  }>({ all: [], active: [], inactive: [], admin: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // ── UI state ───────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE_COLS))

  // ── Dialog state ───────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const MIN_COLS = 4

  const parseUserList = (raw: unknown): Record<string, unknown>[] => {
    const data = raw as Record<string, unknown>
    const list =
      (data?.data as Record<string, unknown>)?.list ||
      (data?.list as unknown[]) ||
      data?.data ||
      []

    return Array.isArray(list) ? (list as Record<string, unknown>[]) : []
  }

  const toStatus = (
    raw: Record<string, unknown>,
    fallback?: "active" | "inactive",
  ): User["status"] => {
    if (fallback) return fallback

    const activeValue = raw.isActive ?? raw.isactive ?? raw.active
    const normalized =
      typeof activeValue === "string"
        ? activeValue.trim().toUpperCase()
        : activeValue

    if (normalized === "Y" || normalized === "YES" || normalized === "1" || normalized === 1 || normalized === true) {
      return "active"
    }

    if (raw.status === "active" || raw.status === 1) return "active"

    return "inactive"
  }

  const isAdminUser = (raw: Record<string, unknown>): boolean => {
    const value = raw.adminStatus ?? raw.adminstatus ?? raw.isAdmin ?? raw.role
    if (typeof value === "boolean") return value
    if (typeof value === "number") return value === 1
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase()
      return normalized === "y" || normalized === "yes" || normalized === "1" || normalized === "admin" || normalized === "true"
    }
    return false
  }

  const formatDateValue = (value: unknown): string => {
    if (value === null || value === undefined) return ""

    const raw = String(value).trim()
    if (!raw) return ""
    if (raw === "0") return ""

    let date: Date
    if (/^\d+$/.test(raw)) {
      const num = Number(raw)
      if (!Number.isFinite(num) || num <= 0) return ""
      const millis = raw.length <= 10 ? num * 1000 : num
      date = new Date(millis)
    } else {
      date = new Date(raw)
    }

    if (Number.isNaN(date.getTime())) return raw
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    })
  }

  const mapUser = (
    raw: Record<string, unknown>,
    idx: number,
    fallback?: "active" | "inactive",
  ): User => ({
    id: String(raw.melpid || raw.userid || raw.userId || raw.id || raw.extension || `${fallback || "user"}-${idx}`),
    name: String(raw.fullname || raw.name || raw.fullName || `${raw.firstname || ""} ${raw.lastname || ""}`.trim() || "Unknown"),
    email: String(raw.email || raw.emailid || ""),
    avatar: String(raw.imageUrl || raw.profileImage || raw.profile || raw.avatar || ""),
    isAdmin: isAdminUser(raw),
    department: String(raw.departmentName || raw.department || raw.dept || "General"),
    designation: String(raw.professionName || raw.designation || raw.title || ""),
    location: String(raw.location || raw.cityname || raw.city || ""),
    status: toStatus(raw, fallback),
    joinedAt: formatDateValue(raw.addedOn || raw.createdDate || raw.createdate || raw.joinedAt || ""),
    deactivateDate: formatDateValue(raw.deactived_on || raw.deactivatedOn || ""),
  })

  // ── Load users from API ────────────────────────────────
  const loadUsers = useCallback(async () => {
    if (!selectedClient) {
      setUsersByCategory({ all: [], active: [], inactive: [], admin: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    setError("")
    try {
      const [allRes, activeRes, inactiveRes, adminRes] = await Promise.allSettled([
        fetchUsers({ page: 1, pageSize: 200, clientid: selectedClient, category: 0 }),
        fetchUsers({ page: 1, pageSize: 200, clientid: selectedClient, category: 1 }),
        fetchUsers({ page: 1, pageSize: 200, clientid: selectedClient, category: 2 }),
        fetchAdmins(selectedClient, 1),
      ])

      if (allRes.status === "rejected" || activeRes.status === "rejected" || inactiveRes.status === "rejected") {
        const firstError =
          (allRes.status === "rejected" && allRes.reason) ||
          (activeRes.status === "rejected" && activeRes.reason) ||
          (inactiveRes.status === "rejected" && inactiveRes.reason)
        throw firstError
      }

      if (adminRes.status === "rejected") {
        console.error("[UsersPage] admin users fetch failed:", adminRes.reason)
      }

      const allRaw = allRes.value
      const activeRaw = activeRes.value
      const inactiveRaw = inactiveRes.value
      const adminRaw = adminRes.status === "fulfilled" ? adminRes.value : { list: [] }

      const allUsers = parseUserList(allRaw).map((u, idx) => mapUser(u, idx))
      const activeUsers = parseUserList(activeRaw).map((u, idx) => mapUser(u, idx, "active"))
      const inactiveUsers = parseUserList(inactiveRaw).map((u, idx) => mapUser(u, idx, "inactive"))
      const fetchedAdminUsers = parseUserList(adminRaw).map((u, idx) => ({
        ...mapUser(u, idx),
        isAdmin: true,
      }))
      const allAdminUsers = allUsers.filter((u) => u.isAdmin)
      const adminUsers = fetchedAdminUsers.length > 0 ? fetchedAdminUsers : allAdminUsers

      console.groupCollapsed(`[UsersPage] User buckets for client ${selectedClient}`)
      console.log("all (category=0):", allUsers)
      console.log("active (category=1):", activeUsers)
      console.log("inactive (category=2):", inactiveUsers)
      console.log("admin (/admin/admins):", adminUsers)
      console.log("counts:", {
        all: allUsers.length,
        active: activeUsers.length,
        inactive: inactiveUsers.length,
        admin: adminUsers.length,
      })
      console.groupEnd()

      setUsersByCategory({
        all: allUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        admin: adminUsers,
      })
    } catch (err) {
      setError((err as Error).message || "Failed to load users")
      setUsersByCategory({ all: [], active: [], inactive: [], admin: [] })
    } finally {
      setLoading(false)
    }
  }, [selectedClient])

  useEffect(() => { loadUsers() }, [loadUsers])

  function handleToggleCol(key: ColKey) {
    setVisibleCols((prev) => {
      if (prev.has(key) && prev.size <= MIN_COLS) return prev
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  // ── Counts ─────────────────────────────────────────────
  const activeCount = usersByCategory.active.length
  const inactiveCount = usersByCategory.inactive.length
  const adminCount = usersByCategory.admin.length

  // ── Filtering ──────────────────────────────────────────
  const getFilteredUsers = (tab: string) => {
    let list = [...usersByCategory.all]
    if (tab === "active") list = [...usersByCategory.active]
    else if (tab === "inactive") list = [...usersByCategory.inactive]
    else if (tab === "admin") list = [...usersByCategory.admin]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    if (departmentFilter !== "all") list = list.filter((u) => u.department === departmentFilter)
    if (tab === "all" && statusFilter !== "all") {
        list = list.filter((u) => u.status === statusFilter)
    }
    return list
  }

  const users = [...usersByCategory.all]
  const departments = [...new Set(users.map((u) => u.department))].sort()

  // ── Mutations ──────────────────────────────────────────
  async function handleAdd(data: Omit<User, "id" | "joinedAt">) {
    try {
      await manualInviteUsers([{ email: data.email, name: data.name, department: data.department }])
      loadUsers()
    } catch {
      // Fallback to local addition
      const newUser: User = { ...data, id: String(Date.now()), joinedAt: new Date().toISOString().split("T")[0] }
      setUsersByCategory((prev) => ({
        ...prev,
        all: [newUser, ...prev.all],
      }))
    }
  }

  function handleToggleStatus(id: string, newStatus: "active" | "inactive") {
    setUsersByCategory((prev) => {
      const allUpdated = prev.all.map((u) => (u.id === id ? { ...u, status: newStatus } : u))
      const changedUser =
        allUpdated.find((u) => u.id === id) ||
        prev.active.find((u) => u.id === id) ||
        prev.inactive.find((u) => u.id === id)

      const nextActive = prev.active.filter((u) => u.id !== id)
      const nextInactive = prev.inactive.filter((u) => u.id !== id)
      const normalizedUser = changedUser ? { ...changedUser, status: newStatus as User["status"] } : undefined

      if (normalizedUser && newStatus === "active") nextActive.unshift(normalizedUser)
      if (normalizedUser && newStatus === "inactive") nextInactive.unshift(normalizedUser)

      return {
        all: allUpdated,
        active: nextActive,
        inactive: nextInactive,
        admin: prev.admin.map((u) => (u.id === id ? { ...u, status: newStatus } : u)),
      }
    })
  }

  function handleEdit(updated: User) {
    setUsersByCategory((prev) => ({
      all: prev.all.map((u) => u.id === updated.id ? updated : u),
      active: prev.active.map((u) => u.id === updated.id ? updated : u),
      inactive: prev.inactive.map((u) => u.id === updated.id ? updated : u),
      admin: prev.admin.map((u) => u.id === updated.id ? updated : u),
    }))
  }

  // ── Shared table props ─────────────────────────────────
  const tableProps = {
    visibleCols,
    onToggleStatus: handleToggleStatus,
    onEdited: handleEdit,
    onAdd: () => setAddOpen(true),
    onInvite: () => setInviteOpen(true),
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={loadUsers}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage and monitor all users across your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <IconUpload className="size-4 mr-1.5" />
            Bulk Upload
          </Button>
          <Button size="sm" className="melp-radius" onClick={() => setAddOpen(true)}>
            <IconUserPlus className="size-4 mr-1.5" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <UsersStatCards users={users} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="all">
            All Users
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
              {usersByCategory.all.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            <Badge variant="secondary" className="ml-1.5 bg-success/10 text-success border-0 text-[10px] px-1.5 py-0">
              {activeCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
              {inactiveCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="admin">
            Admin
            <Badge variant="secondary" className="ml-1.5 bg-amber-100 text-amber-700 border-0 text-[10px] px-1.5 py-0">
              {adminCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <UsersToolbar
          search={search}
          onSearchChange={setSearch}
          departmentFilter={departmentFilter}
          onDepartmentChange={setDepartmentFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          departments={departments}
          showStatusFilter={activeTab === "all"}
          visibleCols={visibleCols}
          onToggleCol={handleToggleCol}
          minCols={MIN_COLS}
        />

        <TabsContent value="all" className="mt-4">
          <UsersDataTable users={getFilteredUsers("all")} showStatusColumn tab="all" {...tableProps} />
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          <UsersDataTable users={getFilteredUsers("active")} showStatusColumn tab="active" {...tableProps} />
        </TabsContent>
        <TabsContent value="inactive" className="mt-4">
          <UsersDataTable users={getFilteredUsers("inactive")} showStatusColumn tab="inactive" {...tableProps} />
        </TabsContent>
        <TabsContent value="admin" className="mt-4">
          <UsersDataTable users={getFilteredUsers("admin")} showStatusColumn tab="admin" {...tableProps} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddUserDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}
