import { useState } from "react"
import {
  IconPlus,
  IconSearch,
  IconDots,
  IconUsers,
  IconUserCheck,
  IconUserX,
  IconPencil,
  IconTrash,
  IconEye,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

type Team = {
  id: string
  name: string
  department: string
  members: number
  lead: string
  status: "active" | "inactive"
  createdAt: string
}

const mockTeams: Team[] = [
  { id: "1", name: "Engineering Core", department: "Engineering", members: 24, lead: "Alice Johnson", status: "active", createdAt: "2023-01-10" },
  { id: "2", name: "Product Design", department: "Design", members: 8, lead: "Bob Smith", status: "active", createdAt: "2023-02-14" },
  { id: "3", name: "Sales West", department: "Sales", members: 15, lead: "Carol Davis", status: "active", createdAt: "2023-03-05" },
  { id: "4", name: "Data & Analytics", department: "Engineering", members: 10, lead: "David Lee", status: "active", createdAt: "2023-04-20" },
  { id: "5", name: "Customer Success", department: "Support", members: 12, lead: "Eva White", status: "active", createdAt: "2023-05-15" },
  { id: "6", name: "Marketing Growth", department: "Marketing", members: 7, lead: "Frank Brown", status: "inactive", createdAt: "2023-06-01" },
  { id: "7", name: "DevOps & Infra", department: "Engineering", members: 6, lead: "Grace Wilson", status: "active", createdAt: "2023-07-10" },
  { id: "8", name: "Finance Ops", department: "Finance", members: 5, lead: "Henry Clark", status: "active", createdAt: "2023-08-22" },
  { id: "9", name: "HR Partners", department: "HR", members: 4, lead: "Ivy Taylor", status: "inactive", createdAt: "2023-09-03" },
  { id: "10", name: "Legal & Compliance", department: "Legal", members: 3, lead: "Jack Martin", status: "active", createdAt: "2023-10-18" },
]

const departments = ["Engineering", "Design", "Sales", "Support", "Marketing", "Finance", "HR", "Legal"]

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ElementType
  accent?: string
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div
          className="flex items-center justify-center size-10 rounded-lg"
          style={{ background: accent ? `color-mix(in srgb, ${accent} 12%, transparent)` : undefined }}
        >
          <Icon className="size-5" style={{ color: accent }} />
        </div>
      </CardContent>
    </Card>
  )
}

function AddTeamDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (t: Omit<Team, "id" | "createdAt">) => void
}) {
  const [name, setName] = useState("")
  const [department, setDepartment] = useState("")
  const [lead, setLead] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !department || !lead) return
    onAdd({ name, department, lead, members: 0, status: "active" })
    setName(""); setDepartment(""); setLead("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Team Name</Label>
            <Input placeholder="e.g. Engineering Core" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Team Lead</Label>
            <Input placeholder="Full name" value={lead} onChange={(e) => setLead(e.target.value)} />
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="melp-radius">Create Team</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>(mockTeams)
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [addOpen, setAddOpen] = useState(false)

  const totalMembers = teams.reduce((acc, t) => acc + t.members, 0)
  const activeCount = teams.filter((t) => t.status === "active").length
  const inactiveCount = teams.filter((t) => t.status === "inactive").length

  const filtered = teams.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.lead.toLowerCase().includes(search.toLowerCase())
    const matchDept = deptFilter === "all" || t.department === deptFilter
    const matchStatus = statusFilter === "all" || t.status === statusFilter
    return matchSearch && matchDept && matchStatus
  })

  const uniqueDepts = [...new Set(teams.map((t) => t.department))].sort()

  function handleAdd(data: Omit<Team, "id" | "createdAt">) {
    setTeams((prev) => [{ ...data, id: String(Date.now()), createdAt: new Date().toISOString().split("T")[0] }, ...prev])
  }

  function handleDelete(id: string) {
    setTeams((prev) => prev.filter((t) => t.id !== id))
  }

  function handleToggleStatus(id: string) {
    setTeams((prev) => prev.map((t) => t.id === id ? { ...t, status: t.status === "active" ? "inactive" : "active" } : t))
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-sm text-muted-foreground">Manage teams and their members across your organisation</p>
        </div>
        <Button size="sm" className="melp-radius" onClick={() => setAddOpen(true)}>
          <IconPlus className="size-4 mr-1.5" />
          New Team
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Teams" value={teams.length} icon={IconUsers} accent="var(--color-primary)" />
        <StatCard label="Active Teams" value={activeCount} icon={IconUserCheck} accent="var(--color-success)" />
        <StatCard label="Inactive Teams" value={inactiveCount} icon={IconUserX} accent="var(--color-muted-foreground)" />
        <StatCard label="Total Members" value={totalMembers} icon={IconUsers} accent="var(--color-info)" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search teams or leads…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {uniqueDepts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
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
                  <th className="text-left font-medium text-muted-foreground p-4">Team</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Department</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Team Lead</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Members</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Created</th>
                  <th className="text-right font-medium text-muted-foreground p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">No teams found.</td>
                  </tr>
                ) : (
                  filtered.map((team) => (
                    <tr key={team.id} className="border-b last:border-b-0 hover:bg-secondary/30 transition-colors">
                      <td className="p-4 font-medium">{team.name}</td>
                      <td className="p-4 text-muted-foreground">{team.department}</td>
                      <td className="p-4">{team.lead}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <IconUsers className="size-3.5 text-muted-foreground" />
                          {team.members}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="secondary"
                          className={
                            team.status === "active"
                              ? "bg-success/10 text-success border-0"
                              : "bg-secondary text-muted-foreground border-0"
                          }
                        >
                          {team.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{team.createdAt}</td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <IconDots className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <IconEye className="size-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <IconPencil className="size-4 mr-2" /> Edit Team
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(team.id)}>
                              {team.status === "active" ? (
                                <><IconUserX className="size-4 mr-2" /> Deactivate</>
                              ) : (
                                <><IconUserCheck className="size-4 mr-2" /> Activate</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(team.id)}
                            >
                              <IconTrash className="size-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">
            Showing {filtered.length} of {teams.length} teams
          </div>
        </CardContent>
      </Card>

      <AddTeamDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </div>
  )
}
