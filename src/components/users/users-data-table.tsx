import { useState } from "react"
import { IconDots, IconUserCheck, IconUserOff, IconKey, IconEye, IconPencil } from "@tabler/icons-react"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type User } from "@/components/users/users-data"
import { ViewUserDialog } from "@/components/users/view-user-dialog"
import { EditUserDialog } from "@/components/users/edit-user-dialog"
import { usePopup } from "@/components/shared/popup"

// ── Column registry ────────────────────────────────────────

export type ColKey = "name" | "email" | "department" | "designation" | "location" | "status" | "joinedAt" | "actions"

export const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "location", label: "Location" },
  { key: "joinedAt", label: "Joined" },
  { key: "actions", label: "Actions" },
]

export const DEFAULT_VISIBLE_COLS: ColKey[] = [
  "name", "email", "department", "joinedAt", "actions",
]

// ── Status badge ───────────────────────────────────────────

function StatusBadge({ status }: { status: User["status"] }) {
  if (status === "active")
    return <Badge className="bg-success/10 text-success border-0 capitalize">{status}</Badge>
  if (status === "inactive")
    return <Badge variant="secondary" className="capitalize">{status}</Badge>
  return <Badge className="bg-destructive/10 text-destructive border-0 capitalize">{status}</Badge>
}

// ── Row actions ────────────────────────────────────────────

function RowActions({
  user,
  onToggleStatus,
  onEdited,
}: {
  user: User
  onToggleStatus: (id: string, status: "active" | "inactive") => void
  onEdited: (updated: User) => void
}) {
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const { danger, warning } = usePopup()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <IconDots className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setViewOpen(true)}><IconEye className="size-4 mr-2" /> View Details</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}><IconPencil className="size-4 mr-2" /> Edit User</DropdownMenuItem>
          {user.status === "active" ? (
            <DropdownMenuItem
              onSelect={() => danger(
                "Deactivate User",
                `"${user.name}" will lose access immediately. You can reactivate them at any time.`,
                () => onToggleStatus(user.id, "inactive"),
              )}
              className="text-destructive focus:text-destructive"
            >
              <IconUserOff className="size-4 mr-2 text-destructive" />
              Deactivate
            </DropdownMenuItem>
          ) : user.status === "inactive" ? (
            <DropdownMenuItem
              onSelect={() => warning(
                "Activate User",
                `"${user.name}" will regain access to the platform.`,
                () => onToggleStatus(user.id, "active"),
              )}
            >
              <IconUserCheck className="size-4 mr-2" />
              Activate
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ViewUserDialog open={viewOpen} user={user} onClose={() => setViewOpen(false)} />
      <EditUserDialog open={editOpen} user={user} onClose={() => setEditOpen(false)} onSave={onEdited} />
    </>
  )
}

// ── UsersDataTable ─────────────────────────────────────────

export function UsersDataTable({
  users,
  visibleCols,
  loading,
  onToggleStatus,
  onEdited,
  selectable,
  selectedKeys,
  onSelectionChange,
}: {
  users: User[]
  visibleCols: Set<ColKey>
  tab?: string
  loading?: boolean
  onAdd?: () => void
  onInvite?: () => void
  onToggleStatus: (id: string, status: "active" | "inactive") => void
  onEdited?: (updated: User) => void
  selectable?: boolean
  selectedKeys?: Set<string>
  onSelectionChange?: (keys: Set<string>) => void
}) {
  const handleEdited = onEdited ?? (() => { })

  const allColDefs: Record<ColKey, ColumnDef<User>> = {
    name: {
      id: "name",
      header: "Name",
      sticky: true,
      accessor: (u) => (
        <div className="flex items-center gap-3">
          <div className="relative size-8 shrink-0">
            <div className="size-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
              {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            {u.avatar && (
              <img
                src={u.avatar}
                alt={u.name}
                className="absolute inset-0 size-8 rounded object-cover border"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
            )}
            {u.isAdmin && (
              <span className="absolute bottom-0 right-0 rounded bg-background p-0.5 border border-border">
                <IconKey className="size-2 text-[#ee4136]" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium truncate">{u.name}</span>
          </div>
        </div>
      ),
      minWidth: "180px",
    },
    email: {
      id: "email",
      header: "Email",
      accessor: "email",
      minWidth: "200px",
    },
    department: {
      id: "department",
      header: "Department",
      accessor: "department",
      minWidth: "140px",
    },
    designation: {
      id: "designation",
      header: "Designation",
      accessor: "designation",
      minWidth: "160px",
    },
    location: {
      id: "location",
      header: "Location",
      accessor: "location",
      minWidth: "120px",
    },
    status: {
      id: "status",
      header: "Status",
      accessor: (u) => <StatusBadge status={u.status} />,
      minWidth: "100px",
    },
    joinedAt: {
      id: "joinedAt",
      header: "Joined",
      accessor: "joinedAt",
      minWidth: "110px",
    },
    actions: {
      id: "actions",
      header: "",
      accessor: (u) => (
        <RowActions user={u} onToggleStatus={onToggleStatus} onEdited={handleEdited} />
      ),
      align: "right",
      minWidth: "60px",
    },
  }

  const columns = ALL_COLUMNS
    .filter((c) => {
      if (!visibleCols.has(c.key)) return false
      if (c.key === "status") return false
      return true
    })
    .map((c) => allColDefs[c.key])

  return (
    <DataTable<User>
      columns={columns}
      data={users}
      rowKey={(u) => u.id}
      loading={loading}
      loadingRows={8}
      emptyState={<span>No users found.</span>}
      paginated
      selectable={selectable}
      selectedKeys={selectedKeys}
      onSelectionChange={onSelectionChange}
      rowClassName={(u) => u.status === "inactive" ? "row-inactive" : undefined}
    />
  )
}
