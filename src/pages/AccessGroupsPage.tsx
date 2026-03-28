import { useState, useEffect, useCallback } from "react"
import {
  IconPlus, IconSearch, IconDots, IconShieldCheck, IconShieldX, IconPencil, IconTrash, IconUsers, IconLoader2,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { fetchUserGroups } from "@/api/admin"
import { useAuth } from "@/context/auth-context"

type AccessGroup = { id: string; name: string; description: string; members: number; policies: string[]; status: "active" | "inactive"; createdAt: string }

function AddGroupDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (g: Omit<AccessGroup, "id" | "createdAt" | "members">) => void }) {
  const [name, setName] = useState(""); const [description, setDescription] = useState("")
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (!name) return; onAdd({ name, description, policies: [], status: "active" }); setName(""); setDescription(""); onClose() }
  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>Create Access Group</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
        <div className="flex flex-col gap-1.5"><Label>Group Name</Label><Input placeholder="e.g. IT Administrators" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label>Description</Label><Textarea placeholder="Describe the access level for this group" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        <DialogFooter className="mt-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" className="melp-radius">Create Group</Button></DialogFooter>
      </form></DialogContent></Dialog>
  )
}

export function AccessGroupsPage() {
  const { selectedClient } = useAuth()
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)

  const loadGroups = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const result = await fetchUserGroups({ page: 1, count: 200, filters: {} }) as Record<string, unknown>
      const list = (result?.list || []) as Record<string, unknown>[]
      const mapped: AccessGroup[] = (list as Record<string, unknown>[]).map((g, idx) => ({
        id: String(g.usergroupid || g.id || idx),
        name: String(g.usergroupname || g.name || "Unnamed"),
        description: String(g.description || ""),
        members: Number(g.usercount || g.members || 0),
        policies: Array.isArray(g.policies) ? (g.policies as string[]) : [],
        status: g.isactive === false || g.status === "inactive" ? "inactive" : "active",
        createdAt: String(g.createddate || g.createdAt || ""),
      }))
      setGroups(mapped)
    } catch (err) { setError((err as Error).message || "Failed to load groups"); setGroups([]) }
    finally { setLoading(false) }
  }, [selectedClient])

  useEffect(() => { loadGroups() }, [loadGroups])

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase()))
  function handleAdd(data: Omit<AccessGroup, "id" | "createdAt" | "members">) { setGroups((prev) => [{ ...data, id: String(Date.now()), members: 0, createdAt: new Date().toISOString().split("T")[0] }, ...prev]) }
  function handleDelete(id: string) { setGroups((prev) => prev.filter((g) => g.id !== id)) }

  if (loading) return <div className="flex flex-1 items-center justify-center p-8"><IconLoader2 className="size-8 animate-spin text-muted-foreground" /></div>
  if (error) return <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8"><p className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" onClick={loadGroups}>Retry</Button></div>

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-2xl font-bold">User Groups</h1><p className="text-sm text-muted-foreground">Define groups with specific access levels and assign users to them</p></div>
        <Button size="sm" className="melp-radius" onClick={() => setAddOpen(true)}><IconPlus className="size-4 mr-1.5" />New Group</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Groups</p><p className="text-2xl font-bold mt-1">{groups.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Groups</p><p className="text-2xl font-bold mt-1">{groups.filter((g) => g.status === "active").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Members</p><p className="text-2xl font-bold mt-1">{groups.reduce((a, g) => a + g.members, 0)}</p></CardContent></Card>
      </div>

      <div className="relative max-w-sm"><IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Search groups…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>

      <div className="flex flex-col gap-3">
        {filtered.map((group) => (
          <Card key={group.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center size-10 rounded-lg bg-secondary shrink-0 mt-0.5">
                    {group.status === "active" ? <IconShieldCheck className="size-5 text-primary" /> : <IconShieldX className="size-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{group.name}</p>
                      <Badge variant="secondary" className={group.status === "active" ? "bg-success/10 text-success border-0 text-xs" : "text-xs"}>{group.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{group.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><IconUsers className="size-3.5" />{group.members} members</span>
                      <Separator orientation="vertical" className="h-3" />
                      <span>Created {group.createdAt}</span>
                    </div>
                    {group.policies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">{group.policies.map((p) => (<Badge key={p} variant="secondary" className="text-xs">{p}</Badge>))}</div>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 shrink-0"><IconDots className="size-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><IconUsers className="size-4 mr-2" /> Manage Members</DropdownMenuItem>
                    <DropdownMenuItem><IconPencil className="size-4 mr-2" /> Edit Group</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(group.id)}><IconTrash className="size-4 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No groups found.</p>}
      </div>

      <AddGroupDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </div>
  )
}
