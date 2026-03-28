import { useState, useEffect, useCallback } from "react"
import {
  IconSearch, IconDots, IconMail, IconMailForward, IconUserCheck, IconClock, IconX, IconCheck, IconLoader2,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { fetchRegistrationRequests } from "@/api/admin"
import { useAuth } from "@/context/auth-context"

type InviteRecord = { id: string; name: string; email: string; department: string; invitedBy: string; invitedAt: string; status: "pending" | "accepted" | "expired" | "cancelled"; source: "manual" | "bulk" | "invite" }

const statusConfig = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-0", icon: IconClock },
  accepted: { label: "Accepted", className: "bg-success/10 text-success border-0", icon: IconCheck },
  expired: { label: "Expired", className: "bg-secondary text-muted-foreground border-0", icon: IconX },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-0", icon: IconX },
}

export function RegistrationListPage() {
  const { selectedClient } = useAuth()
  const [records, setRecords] = useState<InviteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")

  const loadRecords = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const result = await fetchRegistrationRequests({ clientid: selectedClient || "", pagenumber: 1, pagesize: 200 }) as Record<string, unknown>
      const list = (result?.list || result?.data || []) as Record<string, unknown>[]
      const mapped: InviteRecord[] = list.map((r, idx) => ({
        id: String(r.requestid || r.id || idx),
        name: String(r.fullname || r.name || `${r.firstname || ""} ${r.lastname || ""}`.trim() || "Unknown"),
        email: String(r.email || r.emailid || ""),
        department: String(r.department || ""),
        invitedBy: String(r.invitedby || r.createdby || ""),
        invitedAt: String(r.createddate || r.invitedAt || ""),
        status: r.status === 1 || r.status === "accepted" ? "accepted"
          : r.status === 4 || r.status === "expired" ? "expired"
          : r.status === 5 || r.status === "cancelled" ? "cancelled"
          : "pending",
        source: r.source === "bulk" ? "bulk" : r.source === "invite" ? "invite" : "manual",
      }))
      setRecords(mapped)
    } catch (err) { setError((err as Error).message || "Failed to load records"); setRecords([]) }
    finally { setLoading(false) }
  }, [selectedClient])

  useEffect(() => { loadRecords() }, [loadRecords])

  const filtered = records.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || r.status === statusFilter
    const matchSource = sourceFilter === "all" || r.source === sourceFilter
    return matchSearch && matchStatus && matchSource
  })

  function handleCancel(id: string) { setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: "cancelled" as const } : r)) }
  function handleResend(id: string) { setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: "pending" as const, invitedAt: new Date().toISOString().split("T")[0] } : r)) }

  const pending = records.filter((r) => r.status === "pending").length
  const accepted = records.filter((r) => r.status === "accepted").length
  const expired = records.filter((r) => r.status === "expired").length

  if (loading) return <div className="flex flex-1 items-center justify-center p-8"><IconLoader2 className="size-8 animate-spin text-muted-foreground" /></div>
  if (error) return <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8"><p className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" onClick={loadRecords}>Retry</Button></div>

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Registration List</h1><p className="text-sm text-muted-foreground">Track all user invitations and their registration status</p></div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex items-center justify-center size-9 rounded-lg bg-warning/10 shrink-0"><IconClock className="size-4 text-warning" /></div><div><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold">{pending}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex items-center justify-center size-9 rounded-lg bg-success/10 shrink-0"><IconUserCheck className="size-4 text-success" /></div><div><p className="text-xs text-muted-foreground">Accepted</p><p className="text-xl font-bold">{accepted}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex items-center justify-center size-9 rounded-lg bg-secondary shrink-0"><IconX className="size-4 text-muted-foreground" /></div><div><p className="text-xs text-muted-foreground">Expired</p><p className="text-xl font-bold">{expired}</p></div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm"><IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="accepted">Accepted</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}><SelectTrigger className="w-[130px]"><SelectValue placeholder="Source" /></SelectTrigger><SelectContent><SelectItem value="all">All Sources</SelectItem><SelectItem value="manual">Manual</SelectItem><SelectItem value="bulk">Bulk Upload</SelectItem><SelectItem value="invite">Invite Link</SelectItem></SelectContent></Select>
      </div>

      <Card><CardContent className="p-0"><div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b">
            <th className="text-left font-medium text-muted-foreground p-4">User</th>
            <th className="text-left font-medium text-muted-foreground p-4">Department</th>
            <th className="text-left font-medium text-muted-foreground p-4">Invited By</th>
            <th className="text-left font-medium text-muted-foreground p-4">Source</th>
            <th className="text-left font-medium text-muted-foreground p-4">Date</th>
            <th className="text-left font-medium text-muted-foreground p-4">Status</th>
            <th className="text-right font-medium text-muted-foreground p-4">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No records found.</td></tr>
            ) : filtered.map((r) => {
              const cfg = statusConfig[r.status]
              const initials = r.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              return (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-secondary/30 transition-colors">
                  <td className="p-4"><div className="flex items-center gap-2.5"><Avatar className="size-8"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar><div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.email}</p></div></div></td>
                  <td className="p-4 text-muted-foreground">{r.department}</td>
                  <td className="p-4 text-muted-foreground">{r.invitedBy}</td>
                  <td className="p-4"><Badge variant="secondary" className="text-xs capitalize">{r.source}</Badge></td>
                  <td className="p-4 text-muted-foreground">{r.invitedAt}</td>
                  <td className="p-4"><Badge variant="secondary" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge></td>
                  <td className="p-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><IconDots className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><IconMail className="size-4 mr-2" /> View Details</DropdownMenuItem>
                        {(r.status === "pending" || r.status === "expired") && <DropdownMenuItem onClick={() => handleResend(r.id)}><IconMailForward className="size-4 mr-2" /> Resend Invite</DropdownMenuItem>}
                        {r.status === "pending" && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleCancel(r.id)}><IconX className="size-4 mr-2" /> Cancel Invite</DropdownMenuItem></>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t text-xs text-muted-foreground">Showing {filtered.length} of {records.length} records</div>
      </CardContent></Card>
    </div>
  )
}
