import { useState, useEffect, useCallback, useRef } from "react"
import { IconUserPlus, IconUpload, IconLoader2 } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { type User } from "@/components/users/users-data"
import { UsersToolbar, type UserFilters, EMPTY_FILTERS } from "@/components/users/users-toolbar"
import { UsersDataTable, DEFAULT_VISIBLE_COLS, type ColKey } from "@/components/users/users-data-table"
import { AddUserInline, type AddUserDraft } from "@/components/users/add-user-inline"
import { InviteDialog } from "@/components/users/user-confirm-dialogs"
import { fetchUsers, fetchAdmins, manualInviteUsers, bulkInviteUsers } from "@/api/admin"
import { useAuth } from "@/context/auth-context"

// ── Main page ─────────────────────────────────────────────

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
  const [filters, setFilters] = useState<UserFilters>(EMPTY_FILTERS)
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE_COLS))
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)

  // ── Dialog / upload state ─────────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const bulkInputRef = useRef<HTMLInputElement>(null)

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
    if (filters.department) list = list.filter((u) => u.department === filters.department)
    if (filters.designation) list = list.filter((u) => u.designation === filters.designation)
    if (filters.location) list = list.filter((u) => u.location === filters.location)
    if (filters.joiningDateRange?.from) {
      list = list.filter((u) => {
        if (!u.joinedAt) return false
        const d = new Date(u.joinedAt)
        if (filters.joiningDateRange!.from && d < filters.joiningDateRange!.from) return false
        if (filters.joiningDateRange!.to && d > filters.joiningDateRange!.to) return false
        return true
      })
    }
    if (filters.deactiveDateRange?.from) {
      list = list.filter((u) => {
        if (!u.deactivateDate) return false
        const d = new Date(u.deactivateDate)
        if (filters.deactiveDateRange!.from && d < filters.deactiveDateRange!.from) return false
        if (filters.deactiveDateRange!.to && d > filters.deactiveDateRange!.to) return false
        return true
      })
    }
    return list
  }

  const users = [...usersByCategory.all]
  const departments = [...new Set(users.map((u) => u.department))].sort()
  const designations = [...new Set(users.map((u) => u.designation).filter(Boolean))].sort()
  const locations = [...new Set(users.map((u) => u.location).filter(Boolean))].sort()

  // ── Mutations ──────────────────────────────────────────
  async function handleAdd(rows: AddUserDraft[]): Promise<void> {
    const inviteUsers = rows
      .filter((r) => r.name.trim() || r.email.trim() || r.phone.trim())
      .map((r) => {
        const [firstName, ...rest] = r.name.trim().split(/\s+/)
        const lastName = rest.join(" ")
        return {
          email: r.email.trim(),
          name: r.name.trim(),
          firstName: firstName || r.name.trim(),
          lastName,
          phone: r.phone.trim(),
        }
      })

    try {
      await manualInviteUsers(inviteUsers)
      await loadUsers()
      alert(`${inviteUsers.length} user${inviteUsers.length > 1 ? "s" : ""} added successfully.`)
    } catch (err) {
      throw new Error((err as Error)?.message || "Failed to add user")
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

  function handleExportUsersData() {
    const rows = getFilteredUsers(activeTab)
    if (!rows.length) return

    const headers = [
      "Name",
      "Email",
      "Department",
      "Designation",
      "Location",
      "Status",
      "Joined Date",
      "Active/Deactive Date",
      "Admin",
    ]

    const escapeCsv = (value: string) => `"${value.replace(/"/g, "\"\"")}"`
    const lines = [
      headers.join(","),
      ...rows.map((u) => [
        escapeCsv(u.name || ""),
        escapeCsv(u.email || ""),
        escapeCsv(u.department || ""),
        escapeCsv(u.designation || ""),
        escapeCsv(u.location || ""),
        escapeCsv(u.status || ""),
        escapeCsv(u.joinedAt || ""),
        escapeCsv(u.deactivateDate || ""),
        escapeCsv(u.isAdmin ? "Yes" : "No"),
      ].join(",")),
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    const stamp = new Date().toISOString().slice(0, 10)
    anchor.href = url
    anchor.download = `melp-users-${activeTab}-${stamp}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  async function handleBulkFileSelected(file: File) {
    const allowedTypes = new Set([
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ])
    const ext = file.name.toLowerCase()
    const hasAllowedExt = ext.endsWith(".csv") || ext.endsWith(".xlsx") || ext.endsWith(".xls")
    const hasAllowedType = allowedTypes.has(file.type)

    if (!(hasAllowedExt || hasAllowedType)) {
      alert("Please upload CSV or Excel file only")
      if (bulkInputRef.current) bulkInputRef.current.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Maximum upload file size is 5 MB")
      if (bulkInputRef.current) bulkInputRef.current.value = ""
      return
    }

    try {
      setBulkUploading(true)
      await bulkInviteUsers(file, true)
      await loadUsers()
      alert("File uploaded successfully.")
    } catch (err) {
      const message = (err as Error)?.message || "Bulk upload failed"
      alert(message)
    } finally {
      setBulkUploading(false)
      if (bulkInputRef.current) bulkInputRef.current.value = ""
    }
  }

  // ── Shared table props ─────────────────────────────────
  const tableProps = {
    visibleCols,
    loading,
    onToggleStatus: handleToggleStatus,
    onEdited: handleEdit,
    onAdd: () => setAddOpen(true),
    onInvite: () => setInviteOpen(true),
    selectable: true,
    selectedKeys,
    onSelectionChange: setSelectedKeys,
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
          <input
            ref={bulkInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleBulkFileSelected(file)
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={bulkUploading}
            onClick={() => bulkInputRef.current?.click()}
          >
            {bulkUploading ? <IconLoader2 className="size-4 mr-1.5 animate-spin" /> : <IconUpload className="size-4 mr-1.5" />}
            Bulk Upload
          </Button>
          <Button
            size="sm"
            className="melp-radius"
            onClick={() => setAddOpen(!addOpen)}
            variant={addOpen ? "secondary" : "default"}
          >
            <IconUserPlus className="size-4 mr-1.5" />
            Add User
          </Button>
        </div>
      </div>

      {/* Inline add-user section — hides tabs/table when open */}
      {addOpen ? (
        <AddUserInline
          onSubmitAll={handleAdd}
          onCancel={() => setAddOpen(false)}
        />
      ) : (

      /* Tabs */
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
            <Badge variant="secondary" className="ml-1.5 bg-[#ee4136]/10 text-[#ee4136] border-0 text-[10px] px-1.5 py-0">
              {adminCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <UsersToolbar
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          departments={departments}
          designations={designations}
          locations={locations}
          visibleCols={visibleCols}
          onToggleCol={handleToggleCol}
          onExport={handleExportUsersData}
          minCols={MIN_COLS}
        />

        <TabsContent value="all" className="mt-4">
          <UsersDataTable users={getFilteredUsers("all")} tab="all" {...tableProps} />
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          <UsersDataTable users={getFilteredUsers("active")} tab="active" {...tableProps} />
        </TabsContent>
        <TabsContent value="inactive" className="mt-4">
          <UsersDataTable users={getFilteredUsers("inactive")} tab="inactive" {...tableProps} />
        </TabsContent>
        <TabsContent value="admin" className="mt-4">
          <UsersDataTable users={getFilteredUsers("admin")} tab="admin" {...tableProps} />
        </TabsContent>
      </Tabs>
      )}

      {/* Dialogs */}
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}
