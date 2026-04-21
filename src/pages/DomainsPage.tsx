import { useState, useEffect, useCallback } from "react"
import {
  IconPlus, IconSearch, IconDots, IconWorld, IconShieldCheck, IconAlertTriangle, IconX, IconCopy, IconRefresh, IconTrash, IconClock, IconLoader2, IconFilter, IconArrowMerge, IconUnlink,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover"
import { fetchDomains, addDomainMerge, removeDomainMerge } from "@/api/admin"
import { useAuth } from "@/context/auth-context"

type Domain = { id: string; domain: string; type: "primary" | "alias" | "subdomain"; status: "verified" | "pending" | "failed"; users: number; addedAt: string; dnsRecord?: { type: string; name: string; value: string } }

type MergeDomain = {
  clientId: number
  clientName: string
  website: string
  verified: boolean
  activeUsers: number
  merged: boolean
}

type PageView = "list" | "merge"
type MergeTab = "available" | "merged"

const statusConfig = {
  verified: { label: "Verified", className: "bg-success/10 text-success border-0", icon: IconShieldCheck },
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-0", icon: IconClock },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-0", icon: IconX },
}
const typeConfig = {
  primary: { label: "Primary", className: "bg-primary/10 text-primary border-0" },
  alias: { label: "Alias", className: "" },
  subdomain: { label: "Subdomain", className: "" },
}

function AddDomainDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (domain: string, type: Domain["type"]) => void }) {
  const [domain, setDomain] = useState(""); const [type, setType] = useState<Domain["type"]>("alias")
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); if (!domain) return; onAdd(domain, type); setDomain(""); setType("alias"); onClose() }
  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>Add Domain</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
        <div className="flex flex-col gap-1.5"><Label>Domain Name</Label><Input placeholder="e.g. yourdomain.com" value={domain} onChange={(e) => setDomain(e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label>Domain Type</Label>
          <div className="flex gap-2">{(["primary", "alias", "subdomain"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors capitalize ${type === t ? "border-foreground bg-secondary" : "border-border hover:bg-secondary/50"}`}>{t}</button>
          ))}</div>
        </div>
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">After adding, you'll need to:</p>
          <p>1. Copy the DNS verification record</p><p>2. Add it to your DNS provider</p><p>3. Wait for propagation (up to 24h)</p>
        </div>
        <DialogFooter className="mt-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" className="melp-radius">Add Domain</Button></DialogFooter>
      </form></DialogContent></Dialog>
  )
}

function DnsRecordCard({ record }: { record: NonNullable<Domain["dnsRecord"]> }) {
  const [copied, setCopied] = useState(false)
  function copy(text: string) { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <div className="mt-3 p-3 rounded-lg border bg-secondary/30 text-xs">
      <p className="font-medium text-muted-foreground mb-2">DNS Verification Record</p>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="secondary" className="text-xs font-mono">{record.type}</Badge></div>
        <div className="flex justify-between items-start gap-2"><span className="text-muted-foreground shrink-0">Name</span><span className="font-mono text-right break-all">{record.name}</span></div>
        <div className="flex justify-between items-start gap-2"><span className="text-muted-foreground shrink-0">Value</span>
          <div className="flex items-center gap-1"><span className="font-mono text-right break-all">{record.value}</span>
            <button onClick={() => copy(record.value)} className="shrink-0 text-muted-foreground hover:text-foreground">{copied ? <IconShieldCheck className="size-3.5 text-success" /> : <IconCopy className="size-3.5" />}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DomainsPage() {
  const { selectedClient, setSelectedClient } = useAuth()

  // ── List view state ────────────────────────────────────────────
  const [view, setView] = useState<PageView>("list")
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [draftStatus, setDraftStatus] = useState("all")
  const [addOpen, setAddOpen] = useState(false)

  // ── Merge domain state ─────────────────────────────────────────
  const [mergeTab, setMergeTab] = useState<MergeTab>("available")
  const [allMergeDomains, setAllMergeDomains] = useState<MergeDomain[]>([])
  const [mergeLoading, setMergeLoading] = useState(false)
  const [selectedMergeIds, setSelectedMergeIds] = useState<Set<number>>(new Set())
  const [merging, setMerging] = useState(false)
  const [mergeSearch, setMergeSearch] = useState("")

  // ── Domain list loader ─────────────────────────────────────────
  const loadDomains = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const result = await fetchDomains(selectedClient || "")
      const obj = result as Record<string, unknown> | null
      const raw = Array.isArray(result) ? result
        : Array.isArray(obj?.data) ? obj.data
        : Array.isArray(obj?.list) ? obj.list
        : []
      const list = raw as Record<string, unknown>[]
      const mapped: Domain[] = list.map((d, idx) => ({
        id: String(d.client_id || d.clientid || d.domainid || d.id || idx),
        domain: String(d.website || d.client_name || d.domainname || d.domain || ""),
        type: d.primary === true || d.isPrimary === true || d.isprimary === true ? "primary" : d.type === "subdomain" ? "subdomain" : "alias",
        status: d.verified === true || d.isverified === true || d.status === "verified" ? "verified" : d.status === "failed" ? "failed" : "pending",
        users: Number(d.activeUsers || d.usercount || d.users || 0),
        addedAt: String(d.createddate || d.addedAt || ""),
      }))
      if (!selectedClient && list.length > 0) {
        const firstId = String(list[0].client_id || list[0].clientid || "")
        const firstName = String(list[0].client_name || list[0].clientname || "")
        if (firstId) setSelectedClient(firstId, firstName)
      }
      setDomains(mapped)
    } catch (err) { console.error("[DomainsPage] load failed:", err); setError("Something went wrong while loading domains. Please try again."); setDomains([]) }
    finally { setLoading(false) }
  }, [selectedClient, setSelectedClient])

  // ── Merge domain loader ─────────────────────────────────────────
  // Uses the same /AdminPanel/domains endpoint which returns all domains with
  // a `merged` boolean flag and excludes the current client's own domain.
  const loadMergeDomains = useCallback(async () => {
    if (!selectedClient) return
    setMergeLoading(true)
    try {
      const result = await fetchDomains(selectedClient)
      const obj = result as Record<string, unknown> | null
      const raw = Array.isArray(result) ? result
        : Array.isArray(obj?.data) ? obj.data
        : Array.isArray(obj?.list) ? obj.list
        : []
      const list = raw as Record<string, unknown>[]
      const mapped: MergeDomain[] = list
        // Exclude the current client's own domain (mirrors old: curClient != clientId)
        .filter((d) => String(d.client_id || d.clientid || "") !== selectedClient)
        .map((d) => ({
          clientId: Number(d.client_id || d.clientid || 0),
          clientName: String(d.client_name || d.clientname || ""),
          website: String(d.website || d.domain || ""),
          verified: d.verified === true || d.isverified === true,
          activeUsers: Number(d.activeUsers || d.usercount || 0),
          merged: d.merged === true,
        }))
      setAllMergeDomains(mapped)
    } catch (err) {
      console.error("[DomainsPage] merge domain load failed:", err)
      setAllMergeDomains([])
    } finally {
      setMergeLoading(false)
    }
  }, [selectedClient])

  useEffect(() => { loadDomains() }, [loadDomains])

  // Load merge domains when switching to merge view
  useEffect(() => {
    if (view === "merge") {
      void loadMergeDomains()
      setSelectedMergeIds(new Set())
    }
  }, [view, loadMergeDomains])

  // Reset selection when switching between available/merged sub-tabs
  useEffect(() => {
    setSelectedMergeIds(new Set())
  }, [mergeTab])

  // ── Merge domain handlers ──────────────────────────────────────
  // Payload: array of { domain: clientName, clientId: clientId }
  // matching the old PHP SPA: reqData = Object.values(selectedDomain).map(obj => obj)
  const handleMergeDomains = async () => {
    if (!selectedClient || selectedMergeIds.size === 0) return
    const payload = allMergeDomains
      .filter((d) => selectedMergeIds.has(d.clientId))
      .map((d) => ({ domain: d.clientName, clientId: d.clientId }))
    setMerging(true)
    try {
      await addDomainMerge(selectedClient, payload)
      toast.success("Domains merged successfully.")
      setSelectedMergeIds(new Set())
      await loadMergeDomains()
    } catch (err) {
      console.error("[DomainsPage] merge failed:", err)
      toast.error("Failed to merge domains. Please try again.")
    } finally {
      setMerging(false)
    }
  }

  const handleUnmergeDomains = async () => {
    if (!selectedClient || selectedMergeIds.size === 0) return
    const payload = allMergeDomains
      .filter((d) => selectedMergeIds.has(d.clientId))
      .map((d) => ({ domain: d.clientName, clientId: d.clientId }))
    setMerging(true)
    try {
      await removeDomainMerge(selectedClient, payload)
      toast.success("Domains unmerged successfully.")
      setSelectedMergeIds(new Set())
      await loadMergeDomains()
    } catch (err) {
      console.error("[DomainsPage] unmerge failed:", err)
      toast.error("Failed to unmerge domains. Please try again.")
    } finally {
      setMerging(false)
    }
  }

  function toggleMergeSelect(clientId: number) {
    setSelectedMergeIds((prev) => {
      const next = new Set(prev)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })
  }

  // ── List view derived values ───────────────────────────────────
  const filtered = domains.filter((d) => {
    const matchSearch = d.domain.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || d.status === statusFilter
    return matchSearch && matchStatus
  })

  function handleAdd(domain: string, type: Domain["type"]) {
    const newDomain: Domain = { id: String(Date.now()), domain, type, status: "pending", users: 0, addedAt: new Date().toISOString().split("T")[0], dnsRecord: { type: "TXT", name: `_melp-verify.${domain}`, value: `melp-verification=${Math.random().toString(36).slice(2, 18)}` } }
    setDomains((prev) => [newDomain, ...prev])
  }
  function handleDelete(id: string) { setDomains((prev) => prev.filter((d) => d.id !== id)) }

  const verified = domains.filter((d) => d.status === "verified").length
  const pending = domains.filter((d) => d.status === "pending").length

  // ── Merge domain filtered list ─────────────────────────────────
  const filteredMergeDomains = allMergeDomains.filter((d) => {
    const isCurrentTab = mergeTab === "available" ? !d.merged : d.merged
    const matchSearch = mergeSearch === "" ||
      d.clientName.toLowerCase().includes(mergeSearch.toLowerCase()) ||
      d.website.toLowerCase().includes(mergeSearch.toLowerCase())
    return isCurrentTab && matchSearch
  })

  if (loading) return <div className="flex flex-1 items-center justify-center p-8"><IconLoader2 className="size-8 animate-spin text-muted-foreground" /></div>
  if (error) return <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8"><p className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" onClick={loadDomains}>Retry</Button></div>

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Domains</h1>
          <p className="text-sm text-muted-foreground">Manage and verify the domains used by your organisation</p>
        </div>
        <div className="flex items-center gap-2">
          {view === "list" && (
            <Button size="sm" className="melp-radius" onClick={() => setAddOpen(true)}>
              <IconPlus className="size-4 mr-1.5" />Add Domain
            </Button>
          )}
        </div>
      </div>

      {/* ── View toggle ─────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-lg border p-1 w-fit">
        <button
          onClick={() => setView("list")}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
        >
          Your Domains
        </button>
        <button
          onClick={() => setView("merge")}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors flex items-center gap-1.5 ${view === "merge" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
        >
          <IconArrowMerge className="size-3.5" />
          Merge Domains
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          LIST VIEW
      ══════════════════════════════════════════════════════ */}
      {view === "list" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex items-center justify-center size-9 rounded-lg bg-secondary shrink-0"><IconWorld className="size-4 text-muted-foreground" /></div><div><p className="text-xs text-muted-foreground">Total Domains</p><p className="text-xl font-bold">{domains.length}</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex items-center justify-center size-9 rounded-lg bg-success/10 shrink-0"><IconShieldCheck className="size-4 text-success" /></div><div><p className="text-xs text-muted-foreground">Verified</p><p className="text-xl font-bold">{verified}</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex items-center justify-center size-9 rounded-lg bg-warning/10 shrink-0"><IconClock className="size-4 text-warning" /></div><div><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold">{pending}</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex items-center justify-center size-9 rounded-lg bg-secondary shrink-0"><IconWorld className="size-4 text-muted-foreground" /></div><div><p className="text-xs text-muted-foreground">Total Users</p><p className="text-xl font-bold">{domains.reduce((a, d) => a + d.users, 0)}</p></div></CardContent></Card>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm"><IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Search domains…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
            <Popover onOpenChange={(open) => { if (open) setDraftStatus(statusFilter) }}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <IconFilter className="size-4" />
                  Filter
                  {statusFilter !== "all" && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">1</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <h4 className="text-sm font-semibold">Filters</h4>
                  {statusFilter !== "all" && (
                    <button onClick={() => { setDraftStatus("all"); setStatusFilter("all") }} className="text-xs text-muted-foreground hover:text-foreground">Clear all</button>
                  )}
                </div>
                <div className="grid gap-3 p-4">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={draftStatus} onValueChange={(v) => setDraftStatus(v)}>
                      <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
                  <PopoverClose asChild>
                    <Button variant="outline" size="sm" onClick={() => { setDraftStatus("all"); setStatusFilter("all") }}>Reset</Button>
                  </PopoverClose>
                  <PopoverClose asChild>
                    <Button size="sm" onClick={() => setStatusFilter(draftStatus)}>Apply Filters</Button>
                  </PopoverClose>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-3">
            {filtered.length === 0 ? <p className="text-center text-muted-foreground py-12">No domains found.</p> : filtered.map((d) => {
              const sConfig = statusConfig[d.status]; const tConfig = typeConfig[d.type]; const SIcon = sConfig.icon
              return (
                <Card key={d.id}><CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex items-center justify-center size-10 rounded-lg bg-secondary shrink-0 mt-0.5"><IconWorld className="size-5 text-muted-foreground" /></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{d.domain}</p>
                          <Badge variant="secondary" className={`text-xs ${tConfig.className}`}>{tConfig.label}</Badge>
                          <Badge variant="secondary" className={`text-xs flex items-center gap-1 ${sConfig.className}`}><SIcon className="size-3" />{sConfig.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground"><span>{d.users} users</span><Separator orientation="vertical" className="h-3" /><span>Added {d.addedAt}</span></div>
                        {d.dnsRecord && d.status !== "verified" && <DnsRecordCard record={d.dnsRecord} />}
                        {d.status === "failed" && <div className="flex items-center gap-2 mt-2 text-xs text-destructive"><IconAlertTriangle className="size-3.5 shrink-0" />Verification failed. Check your DNS record and try again.</div>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 shrink-0"><IconDots className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {d.status !== "verified" && <DropdownMenuItem><IconRefresh className="size-4 mr-2" /> Retry Verification</DropdownMenuItem>}
                        {d.dnsRecord && <DropdownMenuItem><IconCopy className="size-4 mr-2" /> Copy DNS Record</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(d.id)} disabled={d.type === "primary"}><IconTrash className="size-4 mr-2" /> Remove Domain</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent></Card>
              )
            })}
          </div>

          <AddDomainDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          MERGE DOMAIN VIEW
      ══════════════════════════════════════════════════════ */}
      {view === "merge" && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold">
              {mergeTab === "available" ? "Manage Domain" : "Merged Domain"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Managing Your Domain Name in Your Admin Panel: Steps for Domain Control and Configuration
            </p>
          </div>

          {/* Sub-tabs: Manage Domain / Merged Domain */}
          <div className="flex items-center gap-4 border-b">
            <button
              onClick={() => setMergeTab("available")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors -mb-px ${mergeTab === "available" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Manage Domain
              {allMergeDomains.filter((d) => !d.merged).length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 border-0">
                  {allMergeDomains.filter((d) => !d.merged).length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setMergeTab("merged")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors -mb-px ${mergeTab === "merged" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Merged Domain
              {allMergeDomains.filter((d) => d.merged).length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 border-0">
                  {allMergeDomains.filter((d) => d.merged).length}
                </Badge>
              )}
            </button>
          </div>

          {/* Search + action button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={mergeTab === "available" ? "Search available domains…" : "Search merged domains…"}
                value={mergeSearch}
                onChange={(e) => setMergeSearch(e.target.value)}
                className="pl-9"
              />
              {mergeSearch && (
                <button type="button" onClick={() => setMergeSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <IconX className="size-3.5" />
                </button>
              )}
            </div>
            {selectedMergeIds.size > 0 && (
              mergeTab === "available" ? (
                <Button
                  size="sm"
                  className="melp-radius"
                  disabled={merging}
                  onClick={() => void handleMergeDomains()}
                >
                  {merging
                    ? <IconLoader2 className="size-4 mr-1.5 animate-spin" />
                    : <IconArrowMerge className="size-4 mr-1.5" />}
                  Merge Domain
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={merging}
                  onClick={() => void handleUnmergeDomains()}
                >
                  {merging
                    ? <IconLoader2 className="size-4 mr-1.5 animate-spin" />
                    : <IconUnlink className="size-4 mr-1.5" />}
                  Un Merge Domain
                </Button>
              )
            )}
          </div>

          {/* Domain list */}
          {mergeLoading ? (
            <div className="flex items-center justify-center py-12">
              <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMergeDomains.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">
              {mergeSearch
                ? "No domains match your search."
                : mergeTab === "available"
                  ? "No domains available to merge."
                  : "No domains have been merged yet."}
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="w-10 px-4 py-3"></th>
                    <th className="px-4 py-3 text-left font-medium">Client name</th>
                    <th className="px-4 py-3 text-left font-medium">Domain Name</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Users</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMergeDomains.map((d) => {
                    const isSelected = selectedMergeIds.has(d.clientId)
                    // Only verified domains can be selected for merging (mirrors old disableCheckBox logic)
                    const isDisabled = !d.verified && mergeTab === "available"
                    return (
                      <tr
                        key={d.clientId}
                        className={`border-t transition-colors ${isDisabled ? "opacity-50" : "hover:bg-muted/30 cursor-pointer"} ${isSelected ? "bg-muted/20" : ""}`}
                        onClick={() => { if (!isDisabled) toggleMergeSelect(d.clientId) }}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() => { if (!isDisabled) toggleMergeSelect(d.clientId) }}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-border size-4 accent-foreground cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{d.clientName || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d.website || "—"}</td>
                        <td className="px-4 py-3">
                          {d.verified ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-success/10 text-success">
                              <IconShieldCheck className="size-3" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-warning/10 text-warning">
                              <IconClock className="size-3" /> Unverified
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {d.activeUsers > 0 ? `${d.activeUsers} user${d.activeUsers > 1 ? "s" : ""}` : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
