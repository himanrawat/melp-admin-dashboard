import { useState } from "react"
import {
  IconPlus,
  IconSearch,
  IconDots,
  IconShieldLock,
  IconPencil,
  IconTrash,
  IconCopy,
  IconCheck,
  IconX,
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Policy = {
  id: string
  name: string
  description: string
  resources: string[]
  effect: "allow" | "deny"
  status: "active" | "inactive"
  assignedTo: number
  createdAt: string
}

const mockPolicies: Policy[] = [
  { id: "1", name: "Full Access", description: "Unrestricted access to all platform resources", resources: ["Users", "Teams", "Domains", "Billing", "Settings", "Logs"], effect: "allow", status: "active", assignedTo: 1, createdAt: "2023-01-01" },
  { id: "2", name: "User Management", description: "Create, edit and deactivate user accounts", resources: ["Users:read", "Users:write", "Users:delete"], effect: "allow", status: "active", assignedTo: 2, createdAt: "2023-01-10" },
  { id: "3", name: "User Read", description: "View user profiles and directories", resources: ["Users:read"], effect: "allow", status: "active", assignedTo: 3, createdAt: "2023-01-15" },
  { id: "4", name: "Domain Access", description: "Manage domain settings and DNS records", resources: ["Domains:read", "Domains:write"], effect: "allow", status: "active", assignedTo: 1, createdAt: "2023-02-01" },
  { id: "5", name: "Billing", description: "Access subscription, invoices and payment methods", resources: ["Billing:read", "Billing:write"], effect: "allow", status: "active", assignedTo: 2, createdAt: "2023-02-15" },
  { id: "6", name: "Reports Read", description: "View analytics and exported reports", resources: ["Reports:read"], effect: "allow", status: "active", assignedTo: 4, createdAt: "2023-03-01" },
  { id: "7", name: "Audit Log Read", description: "Read-only access to system audit logs", resources: ["AuditLog:read"], effect: "allow", status: "active", assignedTo: 1, createdAt: "2023-03-10" },
  { id: "8", name: "Integration Access", description: "Manage third-party integrations and API keys", resources: ["Integrations:read", "Integrations:write"], effect: "allow", status: "active", assignedTo: 1, createdAt: "2023-04-01" },
  { id: "9", name: "Block External Sharing", description: "Prevent sharing data outside the organisation", resources: ["ExternalShare"], effect: "deny", status: "active", assignedTo: 0, createdAt: "2023-05-01" },
]

function PolicyCard({ policy, onDelete }: { policy: Policy; onDelete: () => void }) {
  const effectColor = policy.effect === "allow" ? "text-success" : "text-destructive"
  const effectBg = policy.effect === "allow" ? "bg-success/10" : "bg-destructive/10"

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className={`flex items-center justify-center size-9 rounded-lg ${effectBg} shrink-0 mt-0.5`}>
              <IconShieldLock className={`size-4 ${effectColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{policy.name}</p>
                <Badge
                  variant="secondary"
                  className={`text-xs border-0 ${policy.effect === "allow" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                >
                  {policy.effect === "allow" ? <IconCheck className="size-3 mr-1" /> : <IconX className="size-3 mr-1" />}
                  {policy.effect}
                </Badge>
                {policy.status === "inactive" && (
                  <Badge variant="secondary" className="text-xs">Inactive</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{policy.description}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0">
                <IconDots className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem><IconPencil className="size-4 mr-2" /> Edit Policy</DropdownMenuItem>
              <DropdownMenuItem><IconCopy className="size-4 mr-2" /> Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                <IconTrash className="size-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {policy.resources.map((r) => (
            <Badge key={r} variant="secondary" className="text-xs font-mono">{r}</Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <span>Assigned to {policy.assignedTo} group{policy.assignedTo !== 1 ? "s" : ""}</span>
          <span>Created {policy.createdAt}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function AddPolicyDialog({ open, onClose, onAdd }: {
  open: boolean
  onClose: () => void
  onAdd: (p: Omit<Policy, "id" | "createdAt" | "assignedTo">) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [effect, setEffect] = useState<"allow" | "deny">("allow")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    onAdd({ name, description, resources: [], effect, status: "active" })
    setName(""); setDescription(""); setEffect("allow")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Policy</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Policy Name</Label>
            <Input placeholder="e.g. User Management" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea placeholder="Describe what this policy controls" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Effect</Label>
            <Select value={effect} onValueChange={(v) => setEffect(v as "allow" | "deny")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="allow">Allow — grant access</SelectItem>
                <SelectItem value="deny">Deny — restrict access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="melp-radius">Create Policy</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AccessPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>(mockPolicies)
  const [search, setSearch] = useState("")
  const [effectFilter, setEffectFilter] = useState("all")
  const [addOpen, setAddOpen] = useState(false)

  const filtered = policies.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
    const matchEffect = effectFilter === "all" || p.effect === effectFilter
    return matchSearch && matchEffect
  })

  function handleAdd(data: Omit<Policy, "id" | "createdAt" | "assignedTo">) {
    setPolicies((prev) => [{ ...data, id: String(Date.now()), assignedTo: 0, createdAt: new Date().toISOString().split("T")[0] }, ...prev])
  }

  function handleDelete(id: string) {
    setPolicies((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Policies</h1>
          <p className="text-sm text-muted-foreground">Define and manage access control policies assigned to groups</p>
        </div>
        <Button size="sm" className="melp-radius" onClick={() => setAddOpen(true)}>
          <IconPlus className="size-4 mr-1.5" />
          New Policy
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Policies</p><p className="text-2xl font-bold mt-1">{policies.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Allow Policies</p><p className="text-2xl font-bold mt-1 text-success">{policies.filter((p) => p.effect === "allow").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Deny Policies</p><p className="text-2xl font-bold mt-1 text-destructive">{policies.filter((p) => p.effect === "deny").length}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search policies…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={effectFilter} onValueChange={setEffectFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Effect" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Effects</SelectItem>
            <SelectItem value="allow">Allow</SelectItem>
            <SelectItem value="deny">Deny</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Policies grid */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filtered.map((policy) => (
          <PolicyCard key={policy.id} policy={policy} onDelete={() => handleDelete(policy.id)} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">No policies found.</p>
        )}
      </div>

      <AddPolicyDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </div>
  )
}
