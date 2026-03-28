import { useState } from "react"
import {
  IconPlus,
  IconSearch,
  IconDots,
  IconWorld,
  IconLock,
  IconPencil,
  IconTrash,
  IconUsers,
  IconShieldCheck,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type DomainAccess = {
  id: string
  domain: string
  accessType: "full" | "restricted" | "blocked"
  allowedGroups: string[]
  activeUsers: number
  status: "active" | "inactive"
  lastModified: string
}

const mockDomainAccess: DomainAccess[] = [
  { id: "1", domain: "melp.com", accessType: "full", allowedGroups: ["Super Admins", "IT Administrators"], activeUsers: 156, status: "active", lastModified: "2024-03-01" },
  { id: "2", domain: "app.melp.com", accessType: "restricted", allowedGroups: ["Engineering", "HR Managers"], activeUsers: 45, status: "active", lastModified: "2024-03-10" },
  { id: "3", domain: "staging.melp.com", accessType: "restricted", allowedGroups: ["Engineering"], activeUsers: 24, status: "active", lastModified: "2024-02-15" },
  { id: "4", domain: "admin.melp.com", accessType: "restricted", allowedGroups: ["Super Admins"], activeUsers: 3, status: "active", lastModified: "2024-01-20" },
  { id: "5", domain: "legacy.melp.com", accessType: "blocked", allowedGroups: [], activeUsers: 0, status: "inactive", lastModified: "2023-12-01" },
  { id: "6", domain: "api.melp.com", accessType: "restricted", allowedGroups: ["Engineering", "IT Administrators"], activeUsers: 32, status: "active", lastModified: "2024-02-28" },
]

const accessTypeConfig = {
  full: { label: "Full Access", icon: IconShieldCheck, color: "text-success", bg: "bg-success/10" },
  restricted: { label: "Restricted", icon: IconShieldCheck, color: "text-warning", bg: "bg-warning/10" },
  blocked: { label: "Blocked", icon: IconLock, color: "text-destructive", bg: "bg-destructive/10" },
}

function AddDomainAccessDialog({ open, onClose, onAdd }: {
  open: boolean
  onClose: () => void
  onAdd: (d: Omit<DomainAccess, "id" | "lastModified" | "activeUsers">) => void
}) {
  const [domain, setDomain] = useState("")
  const [accessType, setAccessType] = useState<"full" | "restricted" | "blocked">("restricted")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!domain) return
    onAdd({ domain, accessType, allowedGroups: [], status: "active" })
    setDomain(""); setAccessType("restricted")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Configure Domain Access</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Domain</Label>
            <Input placeholder="e.g. app.company.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Access Type</Label>
            <Select value={accessType} onValueChange={(v) => setAccessType(v as "full" | "restricted" | "blocked")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Access — all authenticated users</SelectItem>
                <SelectItem value="restricted">Restricted — selected groups only</SelectItem>
                <SelectItem value="blocked">Blocked — no access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="melp-radius">Save Configuration</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AccessDomainsPage() {
  const [domains, setDomains] = useState<DomainAccess[]>(mockDomainAccess)
  const [search, setSearch] = useState("")
  const [accessFilter, setAccessFilter] = useState("all")
  const [addOpen, setAddOpen] = useState(false)

  const filtered = domains.filter((d) => {
    const matchSearch = d.domain.toLowerCase().includes(search.toLowerCase())
    const matchAccess = accessFilter === "all" || d.accessType === accessFilter
    return matchSearch && matchAccess
  })

  function handleAdd(data: Omit<DomainAccess, "id" | "lastModified" | "activeUsers">) {
    setDomains((prev) => [{ ...data, id: String(Date.now()), activeUsers: 0, lastModified: new Date().toISOString().split("T")[0] }, ...prev])
  }

  function handleDelete(id: string) {
    setDomains((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Domain Access</h1>
          <p className="text-sm text-muted-foreground">Control which groups can access each domain in your organisation</p>
        </div>
        <Button size="sm" className="melp-radius" onClick={() => setAddOpen(true)}>
          <IconPlus className="size-4 mr-1.5" />
          Configure Domain
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Domains</p><p className="text-2xl font-bold mt-1">{domains.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Restricted</p><p className="text-2xl font-bold mt-1 text-warning">{domains.filter((d) => d.accessType === "restricted").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Blocked</p><p className="text-2xl font-bold mt-1 text-destructive">{domains.filter((d) => d.accessType === "blocked").length}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search domains…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={accessFilter} onValueChange={setAccessFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Access Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="full">Full Access</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
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
                  <th className="text-left font-medium text-muted-foreground p-4">Domain</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Access Type</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Allowed Groups</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Active Users</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Last Modified</th>
                  <th className="text-right font-medium text-muted-foreground p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No domains found.</td></tr>
                ) : filtered.map((d) => {
                  const config = accessTypeConfig[d.accessType]
                  const Icon = config.icon
                  return (
                    <tr key={d.id} className="border-b last:border-b-0 hover:bg-secondary/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <IconWorld className="size-4 text-muted-foreground" />
                          <span className="font-medium">{d.domain}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${config.bg} ${config.color}`}>
                          <Icon className="size-3" />
                          {config.label}
                        </div>
                      </td>
                      <td className="p-4">
                        {d.allowedGroups.length === 0 ? (
                          <span className="text-muted-foreground text-xs">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {d.allowedGroups.slice(0, 2).map((g) => (
                              <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                            ))}
                            {d.allowedGroups.length > 2 && (
                              <Badge variant="secondary" className="text-xs">+{d.allowedGroups.length - 2}</Badge>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <IconUsers className="size-3.5" />
                          {d.activeUsers}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{d.lastModified}</td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <IconDots className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><IconPencil className="size-4 mr-2" /> Edit Access Rules</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(d.id)}>
                              <IconTrash className="size-4 mr-2" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AddDomainAccessDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </div>
  )
}
