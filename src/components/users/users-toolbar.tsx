import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"
import { IconSearch, IconDownload, IconColumns3, IconCheck, IconFilter } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover"
import { type ColKey, ALL_COLUMNS } from "@/components/users/users-data-table"

export type UserFilters = {
  department: string
  designation: string
  joiningDateRange: DateRange | undefined
  deactiveDateRange: DateRange | undefined
}

export const EMPTY_FILTERS: UserFilters = {
  department: "",
  designation: "",
  joiningDateRange: undefined,
  deactiveDateRange: undefined,
}

function countActiveFilters(filters: UserFilters): number {
  let count = 0
  if (filters.department) count++
  if (filters.designation) count++
  if (filters.joiningDateRange?.from) count++
  if (filters.deactiveDateRange?.from) count++
  return count
}

function DateRangePicker({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  placeholder?: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          id={id}
          size="sm"
          className={cn(
            "h-8 w-full justify-start px-2.5 text-sm font-normal",
            !value?.from && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-1.5 size-3.5 shrink-0" />
          {value?.from ? (
            value.to ? (
              <span className="truncate">
                {format(value.from, "LLL dd, y")} - {format(value.to, "LLL dd, y")}
              </span>
            ) : (
              format(value.from, "LLL dd, y")
            )
          ) : (
            <span>{placeholder ?? "Pick a date range"}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}

export function UsersToolbar({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  departments,
  designations,
  visibleCols,
  onToggleCol,
  onExport,
  onFilterOpenChange,
  minCols,
}: {
  search: string
  onSearchChange: (value: string) => void
  filters: UserFilters
  onFiltersChange: (filters: UserFilters) => void
  departments: string[]
  designations: string[]
  visibleCols: Set<ColKey>
  onToggleCol: (key: ColKey) => void
  onExport: () => void
  onFilterOpenChange?: (open: boolean) => void
  minCols?: number
}) {
  const atMin = minCols !== undefined && visibleCols.size <= minCols
  const [draft, setDraft] = useState<UserFilters>(filters)
  const activeCount = countActiveFilters(filters)

  function handleOpen(open: boolean) {
    if (open) setDraft(filters)
    onFilterOpenChange?.(open)
  }

  function handleApply() {
    onFiltersChange(draft)
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS)
    onFiltersChange(EMPTY_FILTERS)
  }

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

      {/* Filter button */}
      <Popover onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <IconFilter className="size-4" />
            Filter
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h4 className="text-sm font-semibold">Filters</h4>
            {activeCount > 0 && (
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid gap-3 p-4 max-h-96 overflow-y-auto">
            {/* Department */}
            <div className="grid gap-1.5">
              <Label className="text-xs">Department</Label>
              <Select value={draft.department || "__all__"} onValueChange={(v) => setDraft({ ...draft, department: v === "__all__" ? "" : v })}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Designation */}
            <div className="grid gap-1.5">
              <Label className="text-xs">Designation</Label>
              <Select value={draft.designation || "__all__"} onValueChange={(v) => setDraft({ ...draft, designation: v === "__all__" ? "" : v })}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="All Designations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Designations</SelectItem>
                  {designations.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Joining Date Range */}
            <div className="grid gap-1.5">
              <Label className="text-xs">Joining Date</Label>
              <DateRangePicker
                id="joining-date-range"
                value={draft.joiningDateRange}
                onChange={(range) => setDraft({ ...draft, joiningDateRange: range })}
                placeholder="Select joining date range"
              />
            </div>

            {/* Deactive Date Range */}
            <div className="grid gap-1.5">
              <Label className="text-xs">Deactive Date</Label>
              <DateRangePicker
                id="deactive-date-range"
                value={draft.deactiveDateRange}
                onChange={(range) => setDraft({ ...draft, deactiveDateRange: range })}
                placeholder="Select deactive date range"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
            <PopoverClose asChild>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </PopoverClose>
            <PopoverClose asChild>
              <Button size="sm" onClick={handleApply}>
                Apply Filters
              </Button>
            </PopoverClose>
          </div>
        </PopoverContent>
      </Popover>

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
          {ALL_COLUMNS.map((col) => {
            const isChecked = visibleCols.has(col.key)
            const isDisabled = isChecked && atMin
            return (
              <DropdownMenuItem
                key={col.key}
                onSelect={(e) => { e.preventDefault(); if (!isDisabled) onToggleCol(col.key) }}
                className="flex items-center justify-between cursor-pointer aria-disabled:opacity-50 aria-disabled:cursor-not-allowed"
                aria-disabled={isDisabled}
              >
                {col.label}
                {isChecked && <IconCheck className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Export */}
      <Button variant="outline" size="sm" onClick={onExport}>
        <IconDownload className="size-4 mr-1.5" />
        Export User Roster
      </Button>
    </div>
  )
}
