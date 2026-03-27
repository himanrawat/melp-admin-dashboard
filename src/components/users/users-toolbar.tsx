import { IconSearch, IconDownload, IconColumns3, IconCheck } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type ColKey, ALL_COLUMNS } from "@/components/users/users-data-table"

export function UsersToolbar({
  search,
  onSearchChange,
  departmentFilter,
  onDepartmentChange,
  statusFilter,
  onStatusChange,
  departments,
  showStatusFilter,
  visibleCols,
  onToggleCol,
}: {
  search: string
  onSearchChange: (value: string) => void
  departmentFilter: string
  onDepartmentChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  departments: string[]
  showStatusFilter: boolean
  visibleCols: Set<ColKey>
  onToggleCol: (key: ColKey) => void
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
      {/* Search */}
      <div className="relative w-full sm:w-72">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Department filter */}
      <Select value={departmentFilter} onValueChange={onDepartmentChange}>
        <SelectTrigger size="sm">
          <SelectValue placeholder="All Departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter — only on All tab */}
      {showStatusFilter && (
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Columns toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <IconColumns3 className="size-4 mr-1.5" />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {ALL_COLUMNS.filter((c) => !(c.key === "status" && !showStatusFilter)).map((col) => (
            <DropdownMenuItem
              key={col.key}
              onSelect={(e) => { e.preventDefault(); onToggleCol(col.key) }}
              className="flex items-center justify-between cursor-pointer"
            >
              {col.label}
              {visibleCols.has(col.key) && <IconCheck className="size-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Export */}
      <Button variant="outline" size="sm">
        <IconDownload className="size-4 mr-1.5" />
        Export CSV
      </Button>
    </div>
  )
}
