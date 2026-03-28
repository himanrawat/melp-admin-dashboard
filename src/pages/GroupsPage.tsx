import { useState, useEffect, useCallback } from "react"
import {
  IconPlus, IconSearch, IconDots, IconUsersGroup, IconLock, IconWorld, IconPencil, IconTrash, IconEye, IconLoader2,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { fetchGroups } from "@/api/admin"
import { useAuth } from "@/context/auth-context"

type Group = { id: string; name: string; description: string; type: "public" | "private"; members: number; status: "active" | "inactive"; createdAt: string }

function StatBlock({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold mt-1">{value}</p>{sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}</CardContent></Card>
  )
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
          <div className="flex flex-col gap-1.5"><Label>Group Name</Label><Input placeholder="e.g. Engineering" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="flex flex-col gap-1.5"><Label>Description</Label><Textarea placeholder="Brief description of this group" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
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
          <DialogFooter className="mt-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" className="melp-radius">Create Group</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function GroupsPage() {
  const { selectedClient } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [addOpen, setAddOpen] = useState(false)

  const loadGroups = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const result = await fetchGroups({ page: 1, pageSize: 200, search: "", clientid: selectedClient || undefined })
      console.log("[GroupsPage] raw API response:", result)
      const list = result?.list || []
      const mapped: Group[] = (list as Record<string, unknown>[]).map((g, idx) => ({
        id: String(g.groupid || g.id || idx),
        name: String(g.groupname || g.name || "Unnamed"),
        description: String(g.description || ""),
        type: g.ispublic === false || g.type === "private" ? "private" : "public",
        members: Number(g.participantcount || g.members || 0),
        status: g.isactive === false || g.status === "inactive" ? "inactive" : "active",
        createdAt: String(g.createddate || g.createdAt || ""),
      }))
      console.log("[GroupsPage] mapped groups:", mapped)
      setGroups(mapped)
    } catch (err) {
      setError((err as Error).message || "Failed to load groups"); setGroups([])
    } finally { setLoading(false) }
  }, [selectedClient])

  useEffect(() => { loadGroups() }, [loadGroups])

  const totalMembers = groups.reduce((acc, g) => acc + g.members, 0)
  const publicCount = groups.filter((g) => g.type === "public").length
  const privateCount = groups.filter((g) => g.type === "private").length

  const filtered = groups.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === "all" || g.type === typeFilter
    const matchStatus = statusFilter === "all" || g.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  function handleAdd(data: Omit<Group, "id" | "createdAt" | "members">) {
    setGroups((prev) => [{ ...data, id: String(Date.now()), members: 0, createdAt: new Date().toISOString().split("T")[0] }, ...prev])
  }
  function handleDelete(id: string) { setGroups((prev) => prev.filter((g) => g.id !== id)) }

  if (loading) return <div className="flex flex-1 items-center justify-center p-8"><IconLoader2 className="size-8 animate-spin text-muted-foreground" /></div>
  if (error) return <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8"><p className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" onClick={loadGroups}>Retry</Button></div>

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Groups</h1><p className="text-sm text-muted-foreground">Organise users into groups for easier management and access control</p></div>
        <Button size="sm" className="melp-radius" onClick={() => setAddOpen(true)}><IconPlus className="size-4 mr-1.5" />New Group</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBlock label="Total Groups" value={groups.length} />
        <StatBlock label="Public Groups" value={publicCount} sub="Visible to all" />
        <StatBlock label="Private Groups" value={privateCount} sub="Invite only" />
        <StatBlock label="Total Members" value={totalMembers} sub="Across all groups" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm"><IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Search groups…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="public">Public</SelectItem><SelectItem value="private">Private</SelectItem></SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-12">No groups found.</p>
        ) : (
          filtered.map((group) => (
            <Card key={group.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center size-9 rounded-lg bg-secondary"><IconUsersGroup className="size-4 text-muted-foreground" /></div>
                    <div>
                      <p className="font-semibold text-sm">{group.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {group.type === "public" ? <IconWorld className="size-3 text-muted-foreground" /> : <IconLock className="size-3 text-muted-foreground" />}
                        <span className="text-xs text-muted-foreground capitalize">{group.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className={group.status === "active" ? "bg-success/10 text-success border-0 text-xs" : "text-xs"}>{group.status}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7"><IconDots className="size-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><IconEye className="size-4 mr-2" /> View Members</DropdownMenuItem>
                        <DropdownMenuItem><IconPencil className="size-4 mr-2" /> Edit Group</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(group.id)}><IconTrash className="size-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{group.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                  <span className="flex items-center gap-1"><IconUsersGroup className="size-3.5" />{group.members} members</span>
                  <span>Since {group.createdAt}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddGroupDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </div>
  )
}
