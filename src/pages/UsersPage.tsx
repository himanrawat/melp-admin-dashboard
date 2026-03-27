import { useState } from "react"
import { IconUserPlus, IconUpload } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { mockUsers as initialUsers, type User } from "@/components/users/users-data"
import { UsersStatCards } from "@/components/users/users-stat-cards"
import { UsersToolbar } from "@/components/users/users-toolbar"
import { UsersDataTable, DEFAULT_VISIBLE_COLS, type ColKey } from "@/components/users/users-data-table"
import { AddUserDialog } from "@/components/users/add-user-dialog"
import { InviteDialog } from "@/components/users/user-confirm-dialogs"

export function UsersPage() {
  // ── Data state ─────────────────────────────────────────
  const [users, setUsers] = useState<User[]>(initialUsers)

  // ── UI state ───────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE_COLS))

  // ── Dialog state ───────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  function handleToggleCol(key: ColKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  // ── Counts ─────────────────────────────────────────────
  const activeCount = users.filter((u) => u.status === "active").length
  const inactiveCount = users.filter((u) => u.status === "inactive").length
  const deletedCount = users.filter((u) => u.status === "deleted").length

  // ── Filtering ──────────────────────────────────────────
  const getFilteredUsers = (tab: string) => {
    let list = [...users]
    if (tab === "active") list = list.filter((u) => u.status === "active")
    else if (tab === "inactive") list = list.filter((u) => u.status === "inactive")
    else if (tab === "deleted") list = list.filter((u) => u.status === "deleted")

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    if (departmentFilter !== "all") list = list.filter((u) => u.department === departmentFilter)
    if (tab === "all" && statusFilter !== "all") list = list.filter((u) => u.status === statusFilter)
    return list
  }

  const departments = [...new Set(users.map((u) => u.department))].sort()

  // ── Mutations ──────────────────────────────────────────
  function handleAdd(data: Omit<User, "id" | "joinedAt">) {
    const newUser: User = {
      ...data,
      id: String(Date.now()),
      joinedAt: new Date().toISOString().split("T")[0],
    }
    setUsers((prev) => [newUser, ...prev])
  }

  function handleToggleStatus(id: string, newStatus: "active" | "inactive") {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: newStatus } : u))
  }

  // ── Shared table props ─────────────────────────────────
  const tableProps = {
    visibleCols,
    onToggleStatus: handleToggleStatus,
    onAdd: () => setAddOpen(true),
    onInvite: () => setInviteOpen(true),
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
              {users.length}
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
          <TabsTrigger value="deleted">
            Deleted
            <Badge variant="secondary" className="ml-1.5 bg-destructive/10 text-destructive border-0 text-[10px] px-1.5 py-0">
              {deletedCount}
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
        />

        <TabsContent value="all" className="mt-4">
          <UsersDataTable users={getFilteredUsers("all")} showStatusColumn tab="all" {...tableProps} />
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          <UsersDataTable users={getFilteredUsers("active")} tab="active" {...tableProps} />
        </TabsContent>
        <TabsContent value="inactive" className="mt-4">
          <UsersDataTable users={getFilteredUsers("inactive")} tab="inactive" {...tableProps} />
        </TabsContent>
        <TabsContent value="deleted" className="mt-4">
          <UsersDataTable users={getFilteredUsers("deleted")} tab="deleted" {...tableProps} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddUserDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}
