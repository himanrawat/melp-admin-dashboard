import { useState } from "react"
import {
  IconSearch,
  IconDots,
  IconMail,
  IconMailForward,
  IconUserCheck,
  IconClock,
  IconX,
  IconCheck,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type InviteRecord = {
  id: string
  name: string
  email: string
  department: string
  invitedBy: string
  invitedAt: string
  status: "pending" | "accepted" | "expired" | "cancelled"
  source: "manual" | "bulk" | "invite"
}

const mockRecords: InviteRecord[] = [
  { id: "1", name: "Oliver Hayes", email: "oliver.hayes@company.com", department: "Engineering", invitedBy: "James William", invitedAt: "2026-03-25", status: "pending", source: "manual" },
  { id: "2", name: "Sophia Turner", email: "sophia.t@company.com", department: "Design", invitedBy: "James William", invitedAt: "2026-03-24", status: "accepted", source: "invite" },
  { id: "3", name: "Liam Chen", email: "liam.chen@company.com", department: "Marketing", invitedBy: "HR Manager", invitedAt: "2026-03-22", status: "pending", source: "bulk" },
  { id: "4", name: "Ava Martinez", email: "ava.m@company.com", department: "Sales", invitedBy: "James William", invitedAt: "2026-03-20", status: "accepted", source: "manual" },
  { id: "5", name: "Noah Williams", email: "noah.w@company.com", department: "Finance", invitedBy: "HR Manager", invitedAt: "2026-03-15", status: "expired", source: "bulk" },
  { id: "6", name: "Emma Davis", email: "emma.d@company.com", department: "Legal", invitedBy: "James William", invitedAt: "2026-03-10", status: "accepted", source: "invite" },
  { id: "7", name: "James Wilson", email: "james.w@company.com", department: "Support", invitedBy: "HR Manager", invitedAt: "2026-03-05", status: "cancelled", source: "manual" },
  { id: "8", name: "Isabella Brown", email: "isa.brown@company.com", department: "Engineering", invitedBy: "Tech Lead", invitedAt: "2026-02-28", status: "accepted", source: "bulk" },
]

const statusConfig = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-0", icon: IconClock },
  accepted: { label: "Accepted", className: "bg-success/10 text-success border-0", icon: IconCheck },
  expired: { label: "Expired", className: "bg-secondary text-muted-foreground border-0", icon: IconX },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-0", icon: IconX },
}

export function RegistrationListPage() {
  const [records, setRecords] = useState<InviteRecord[]>(mockRecords)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")

  const filtered = records.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || r.status === statusFilter
    const matchSource = sourceFilter === "all" || r.source === sourceFilter
    return matchSearch && matchStatus && matchSource
  })

  function handleCancel(id: string) {
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: "cancelled" as const } : r))
  }

  function handleResend(id: string) {
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: "pending" as const, invitedAt: new Date().toISOString().split("T")[0] } : r))
  }

  const pending = records.filter((r) => r.status === "pending").length
  const accepted = records.filter((r) => r.status === "accepted").length
  const expired = records.filter((r) => r.status === "expired").length

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Registration List</h1>
          <p className="text-sm text-muted-foreground">Track all user invitations and their registration status</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-warning/10 shrink-0">
              <IconClock className="size-4 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold">{pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-success/10 shrink-0">
              <IconUserCheck className="size-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Accepted</p>
              <p className="text-xl font-bold">{accepted}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-secondary shrink-0">
              <IconX className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expired</p>
              <p className="text-xl font-bold">{expired}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="bulk">Bulk Upload</SelectItem>
            <SelectItem value="invite">Invite Link</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium text-muted-foreground p-4">User</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Department</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Invited By</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Source</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Date</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                  <th className="text-right font-medium text-muted-foreground p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No records found.</td></tr>
                ) : filtered.map((r) => {
                  const cfg = statusConfig[r.status]
                  const initials = r.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                  return (
                    <tr key={r.id} className="border-b last:border-b-0 hover:bg-secondary/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{r.name}</p>
                            <p className="text-xs text-muted-foreground">{r.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{r.department}</td>
                      <td className="p-4 text-muted-foreground">{r.invitedBy}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className="text-xs capitalize">{r.source}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{r.invitedAt}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className={`text-xs ${cfg.className}`}>
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <IconDots className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><IconMail className="size-4 mr-2" /> View Details</DropdownMenuItem>
                            {(r.status === "pending" || r.status === "expired") && (
                              <DropdownMenuItem onClick={() => handleResend(r.id)}>
                                <IconMailForward className="size-4 mr-2" /> Resend Invite
                              </DropdownMenuItem>
                            )}
                            {r.status === "pending" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleCancel(r.id)}
                                >
                                  <IconX className="size-4 mr-2" /> Cancel Invite
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">
            Showing {filtered.length} of {records.length} records
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
