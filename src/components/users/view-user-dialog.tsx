import { useEffect, useMemo, useState } from "react"
import { IconCircleCheck, IconCircleX, IconMail, IconBuilding, IconCalendar, IconLinkPlus, IconLoader2, IconTrash } from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { StatusState, type StatusStateCode } from "@/components/shared/status-state"
import { fetchPolicies, fetchUserPolicyDetails, assignMultiplePolicies, removeMultiplePolicies } from "@/api/admin"
import { getErrorDescription, getStatusCodeFromError, mapPolicySummary, normalizeListPayload } from "@/components/access-management/runtime"
import type { AccessPolicy } from "@/components/access-management/types"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import type { User, UserStatus } from "@/components/users/users-data"

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  })
}

function StatusBadge({ status }: { status: UserStatus }) {
  const map: Record<UserStatus, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-success/10 text-success border-0" },
    inactive: { label: "Inactive", className: "bg-muted text-muted-foreground border-0" },
    deleted: { label: "Deleted", className: "bg-destructive/10 text-destructive border-0" },
  }
  return <Badge variant="secondary" className={map[status].className}>{map[status].label}</Badge>
}

export function ViewUserDialog({
  open,
  user,
  onClose,
}: {
  open: boolean
  user: User | null
  onClose: () => void
}) {
  const { selectedClient } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")
  const [loadingPolicies, setLoadingPolicies] = useState(false)
  const [policies, setPolicies] = useState<AccessPolicy[]>([])
  const [policyStatusCode, setPolicyStatusCode] = useState<StatusStateCode | undefined>()
  const [policyStatusMessage, setPolicyStatusMessage] = useState<string | undefined>()
  const [attachSearch, setAttachSearch] = useState("")
  const [attachablePolicies, setAttachablePolicies] = useState<AccessPolicy[]>([])
  const [attachLoading, setAttachLoading] = useState(false)
  const [selectedPolicyKeys, setSelectedPolicyKeys] = useState<Set<string>>(new Set())
  const [selectedAttachKeys, setSelectedAttachKeys] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const loadUserPolicies = async () => {
    const lookupId = user.userId || user.id
    if (!lookupId) return

    setLoadingPolicies(true)
    setPolicyStatusCode(undefined)
    setPolicyStatusMessage(undefined)

    try {
      const raw = await fetchUserPolicyDetails(lookupId)
      const record = (raw ?? {}) as Record<string, unknown>
      const nextPolicies = Array.isArray(record.policies)
        ? record.policies.map((policy) => mapPolicySummary(policy))
        : []
      setPolicies(nextPolicies)
      if (nextPolicies.length === 0) setPolicyStatusCode(204)
    } catch (error) {
      setPolicies([])
      setPolicyStatusCode(getStatusCodeFromError(error) ?? 500)
      setPolicyStatusMessage(getErrorDescription(error))
    } finally {
      setLoadingPolicies(false)
    }
  }

  useEffect(() => {
    if (!open || !user) return
    void loadUserPolicies()
    setActiveTab("overview")
    setAttachSearch("")
    setSelectedPolicyKeys(new Set())
    setSelectedAttachKeys(new Set())
  }, [open, user?.id])

  useEffect(() => {
    if (!open || activeTab !== "policies" || !selectedClient) return

    let cancelled = false
    const loadAttachablePolicies = async () => {
      setAttachLoading(true)
      try {
        const raw = await fetchPolicies({
          clientid: selectedClient,
          page: 1,
          count: 200,
          search: attachSearch,
        })
        if (cancelled) return
        if (raw === null) {
          setAttachablePolicies([])
          return
        }
        const attached = new Set(policies.map((policy) => policy.id))
        const payload = normalizeListPayload(raw)
        setAttachablePolicies(
          payload.list
            .map((policy) => mapPolicySummary(policy))
            .filter((policy) => !attached.has(policy.id)),
        )
      } catch {
        if (!cancelled) setAttachablePolicies([])
      } finally {
        if (!cancelled) setAttachLoading(false)
      }
    }

    void loadAttachablePolicies()
    return () => {
      cancelled = true
    }
  }, [activeTab, attachSearch, open, policies, selectedClient])

  const attachedPolicyColumns: ColumnDef<AccessPolicy>[] = [
    { id: "name", header: "Policy", accessor: "name", sticky: true, minWidth: "180px" },
    {
      id: "description",
      header: "Description",
      accessor: (policy) => <span className="block max-w-[20rem] truncate text-muted-foreground">{policy.description}</span>,
      minWidth: "220px",
    },
    {
      id: "entities",
      header: "Entities",
      accessor: (policy) => <Badge variant="secondary" className="border-0">{policy.entityCount ?? policy.entities.length}</Badge>,
      minWidth: "100px",
    },
  ]

  const attachablePolicyColumns: ColumnDef<AccessPolicy>[] = [
    { id: "name", header: "Policy", accessor: "name", sticky: true, minWidth: "180px" },
    {
      id: "description",
      header: "Description",
      accessor: (policy) => <span className="block max-w-[20rem] truncate text-muted-foreground">{policy.description}</span>,
      minWidth: "220px",
    },
    {
      id: "modules",
      header: "Modules",
      accessor: (policy) => <Badge variant="secondary" className="border-0">{policy.moduleCount ?? policy.modules.length}</Badge>,
      minWidth: "100px",
    },
  ]

  const canManagePolicies = Boolean(selectedClient && user.melpid)

  const handleAttachPolicies = async () => {
    if (!selectedClient || !user.melpid || selectedAttachKeys.size === 0) return

    const selectedPolicies = attachablePolicies.filter((policy) => selectedAttachKeys.has(policy.id))
    if (selectedPolicies.length === 0) return

    setSaving(true)
    try {
      await assignMultiplePolicies({
        clientid: Number(selectedClient),
        entityId: user.melpid,
        type: "USER",
        policies: selectedPolicies.map((policy) => policy.id),
      })
      toast.success("Policies attached to user.")
      setSelectedAttachKeys(new Set())
      await loadUserPolicies()
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to attach policies right now.")
    } finally {
      setSaving(false)
    }
  }

  const handleRemovePolicies = async () => {
    if (!selectedClient || !user.melpid || selectedPolicyKeys.size === 0) return

    const selectedPolicies = policies.filter((policy) => selectedPolicyKeys.has(policy.id))
    if (selectedPolicies.length === 0) return

    setSaving(true)
    try {
      await removeMultiplePolicies({
        clientid: Number(selectedClient),
        entityId: user.melpid,
        type: "USER",
        policies: selectedPolicies.map((policy) => policy.id),
      })
      toast.success("Policies removed from user.")
      setSelectedPolicyKeys(new Set())
      await loadUserPolicies()
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to remove policies right now.")
    } finally {
      setSaving(false)
    }
  }

  const attachedCountLabel = useMemo(() => `${policies.length} attached`, [policies.length])

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>Viewing details for {user.name}</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="overflow-hidden">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-2">
            <div className="flex flex-col items-center gap-3 py-4">
              <Avatar size="lg">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="font-semibold text-base">{user.name}</p>
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <StatusBadge status={user.status} />
                  {user.verified ? (
                    <div className="flex items-center gap-1 text-xs text-success">
                      <IconCircleCheck className="size-3.5" /> Verified
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <IconCircleX className="size-3.5" /> Pending
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-3 py-2 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <IconMail className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Email</p>
                  <p className="text-sm">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <IconBuilding className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Department</p>
                  <p className="text-sm">{user.department}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <IconCalendar className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Joined</p>
                  <p className="text-sm">{formatDate(user.joinedAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <IconLinkPlus className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Policy Coverage</p>
                  <p className="text-sm">{loadingPolicies ? "Loading..." : attachedCountLabel}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="policies" className="space-y-4 pt-2">
            {!canManagePolicies ? (
              <StatusState
                title="Policy management unavailable"
                description="This user record is missing the identifiers required by the legacy access API."
              />
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Assigned Policies</h3>
                    <p className="text-sm text-muted-foreground">Attach or remove permission policies for this user.</p>
                  </div>
                  <Button variant="outline" size="sm" disabled={saving || selectedPolicyKeys.size === 0} onClick={handleRemovePolicies}>
                    <IconTrash className="mr-1.5 size-4" />
                    Remove Selected
                  </Button>
                </div>

                {loadingPolicies ? (
                  <div className="flex justify-center py-8">
                    <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : policyStatusCode && policyStatusCode !== 204 ? (
                  <StatusState code={policyStatusCode} description={policyStatusMessage} />
                ) : (
                  <DataTable<AccessPolicy>
                    columns={attachedPolicyColumns}
                    data={policies}
                    rowKey={(policy) => policy.id}
                    paginated
                    selectable
                    selectedKeys={selectedPolicyKeys}
                    onSelectionChange={setSelectedPolicyKeys}
                    emptyState={<span>No policies attached to this user.</span>}
                  />
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Attach Policies</h3>
                      <p className="text-sm text-muted-foreground">Search the domain policy catalog and attach selected policies.</p>
                    </div>
                    <Button className="melp-radius" size="sm" disabled={saving || selectedAttachKeys.size === 0} onClick={handleAttachPolicies}>
                      <IconLinkPlus className="mr-1.5 size-4" />
                      Attach Selected
                    </Button>
                  </div>

                  <Input
                    value={attachSearch}
                    onChange={(event) => setAttachSearch(event.target.value)}
                    placeholder="Search policies..."
                  />

                  <DataTable<AccessPolicy>
                    columns={attachablePolicyColumns}
                    data={attachablePolicies}
                    rowKey={(policy) => policy.id}
                    loading={attachLoading}
                    paginated
                    selectable
                    selectedKeys={selectedAttachKeys}
                    onSelectionChange={setSelectedAttachKeys}
                    emptyState={<span>No additional policies available.</span>}
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
