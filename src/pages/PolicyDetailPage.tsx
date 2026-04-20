import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  IconArrowLeft,
  IconLoader2,
  IconPencil,
  IconShieldLock,
  IconTrash,
  IconUserMinus,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  deletePolicies,
  fetchPolicyById,
  revokePolicies,
} from "@/api/admin"
import {
  getErrorDescription,
  mapPolicyDetail,
} from "@/components/access-management/runtime"
import type {
  AccessPolicy,
  PolicyEntity,
} from "@/components/access-management/types"
import { usePopup } from "@/components/shared/popup"
import { useAuth } from "@/context/auth-context"

import { AttachEntitiesPopover } from "@/components/access-policies/attach-entities-popover"
import { RiskBadge } from "@/components/access-policies/risk-badge"

const LIMIT_LABEL: Record<string, string> = {
  Allow: "Allowed",
  Deny: "Denied",
  Conditional: "Conditional",
}

export function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedClient } = useAuth()
  const { danger } = usePopup()

  const [policy, setPolicy] = useState<AccessPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const loadPolicy = useCallback(async () => {
    if (!id || !selectedClient) return
    setLoading(true)
    setError("")
    try {
      const raw = await fetchPolicyById(id, selectedClient)
      if (raw === null) {
        setError("Policy not found.")
        setPolicy(null)
      } else {
        setPolicy(mapPolicyDetail(raw))
      }
    } catch (err) {
      console.error("[PolicyDetailPage] load failed:", err)
      setError(getErrorDescription(err) || "Unable to load this policy.")
      setPolicy(null)
    } finally {
      setLoading(false)
    }
  }, [id, selectedClient])

  useEffect(() => {
    void loadPolicy()
  }, [loadPolicy])

  function handleEdit() {
    if (!policy) return
    navigate(`/access/policies/${policy.backendPolicyId || policy.id}/edit`)
  }

  function handleDelete() {
    if (!policy || !selectedClient) return
    danger(
      "Delete Policy",
      `"${policy.name}" will be permanently removed. This cannot be undone.`,
      async () => {
        setBusy(true)
        try {
          await deletePolicies([policy.backendPolicyId || policy.id], selectedClient)
          toast.success("Policy deleted.")
          navigate("/access/policies")
        } catch (err) {
          toast.error(getErrorDescription(err) || "Unable to delete this policy right now.")
        } finally {
          setBusy(false)
        }
      },
    )
  }

  function handleDetach(entity: PolicyEntity) {
    if (!policy) return
    danger(
      `Detach ${entity.type}`,
      `"${entity.name}" will lose access granted by this policy.`,
      async () => {
        setBusy(true)
        try {
          await revokePolicies(
            policy.backendPolicyId || policy.id,
            [entity.activeId || entity.id],
          )
          toast.success("Access removed.")
          await loadPolicy()
        } catch (err) {
          toast.error(getErrorDescription(err) || "Unable to remove this assignment.")
        } finally {
          setBusy(false)
        }
      },
    )
  }

  function handleBulkDetach(entities: PolicyEntity[], onDone: () => void) {
    if (!policy || entities.length === 0) return
    danger(
      `Detach ${entities.length} ${entities.length === 1 ? "entity" : "entities"}`,
      `${entities.length} ${entities.length === 1 ? "assignment" : "assignments"} will be removed from this policy.`,
      async () => {
        setBusy(true)
        try {
          await revokePolicies(
            policy.backendPolicyId || policy.id,
            entities.map((entity) => entity.activeId || entity.id),
          )
          toast.success(`${entities.length} ${entities.length === 1 ? "entity" : "entities"} detached.`)
          onDone()
          await loadPolicy()
        } catch (err) {
          toast.error(getErrorDescription(err) || "Unable to remove these assignments.")
        } finally {
          setBusy(false)
        }
      },
    )
  }

  if (loading) return <DetailLoading />
  if (error || !policy) {
    return (
      <div className="flex-1 p-4 lg:p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><IconShieldLock /></EmptyMedia>
            <EmptyTitle>Policy unavailable</EmptyTitle>
            <EmptyDescription>{error || "This policy could not be loaded."}</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={() => navigate("/access/policies")}>
            <IconArrowLeft className="size-4 mr-1.5" />
            Back to policies
          </Button>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 overflow-x-hidden h-[calc(100svh-4rem)]">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <button type="button" onClick={() => navigate("/access/policies")}>Policies</button>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate max-w-64">{policy.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex items-center justify-center size-11 rounded-lg bg-secondary shrink-0">
            <IconShieldLock className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{policy.name}</h1>
              <RiskBadge risk={policy.risk} />
            </div>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
              {policy.description || "No description provided."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {policy.modules.length} modules · {policy.entities.length} attached
              {policy.createdAt ? ` · Created ${policy.createdAt}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={busy}
          >
            {busy ? <IconLoader2 className="size-4 mr-1.5 animate-spin" /> : <IconTrash className="size-4 mr-1.5" />}
            Delete
          </Button>
          <Button size="sm" className="melp-radius" onClick={handleEdit}>
            <IconPencil className="size-4 mr-1.5" />
            Edit Policy
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 flex-1 min-h-0">
        <PermissionsCard policy={policy} />
        <EntitiesCard
          policy={policy}
          clientId={selectedClient || ""}
          busy={busy}
          onAttached={() => void loadPolicy()}
          onDetach={handleDetach}
          onBulkDetach={handleBulkDetach}
        />
      </div>

    </div>
  )
}

// ── Permissions card ─────────────────────────────────────────────

function PermissionsCard({ policy }: Readonly<{ policy: AccessPolicy }>) {
  const modulesWithFeatures = policy.modules.filter((module) => module.features.length > 0)

  return (
    <section className="rounded-lg border bg-card flex flex-col min-h-0 overflow-hidden">
      <header className="border-b px-5 py-3 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold">Permissions</h2>
        <Badge variant="secondary" className="border-0">
          {policy.modules.length} module{policy.modules.length === 1 ? "" : "s"}
        </Badge>
      </header>
      {modulesWithFeatures.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground text-center">
          No permission modules in this policy.
        </p>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto divide-y">
          {modulesWithFeatures.map((module) => (
            <div key={module.id} className="pb-4">
              <div className="sticky top-0 z-20 bg-card px-5 pt-4 pb-3 flex items-baseline justify-between gap-3 border-b">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{module.name}</p>
                  {module.scope && (
                    <p className="text-xs text-muted-foreground truncate">{module.scope}</p>
                  )}
                </div>
                <Badge variant="secondary" className="border-0 shrink-0">
                  {module.features.length} feature{module.features.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="mx-5 mt-3 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 h-9 text-xs">Feature</TableHead>
                      <TableHead className="px-4 h-9 text-xs text-right w-32">Access</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {module.features.map((feature) => (
                      <TableRow key={`${module.id}-${feature.id}`}>
                        <TableCell className="px-4 align-top">
                          <p className="text-sm truncate">{feature.name}</p>
                          {feature.description && (
                            <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
                          )}
                        </TableCell>
                        <TableCell className="px-4 text-right align-top">
                          <span className="text-xs font-medium text-muted-foreground">
                            {LIMIT_LABEL[feature.limit] ?? feature.limit}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Entities card ────────────────────────────────────────────────

type EntitiesCardProps = {
  policy: AccessPolicy
  clientId: string
  busy: boolean
  onAttached: () => void
  onDetach: (entity: PolicyEntity) => void
  onBulkDetach: (entities: PolicyEntity[], onDone: () => void) => void
}

type EntityTabKey = "all" | "User" | "User Group" | "Domain"

function EntitiesCard({
  policy,
  clientId,
  busy,
  onAttached,
  onDetach,
  onBulkDetach,
}: Readonly<EntitiesCardProps>) {
  const grouped = groupEntities(policy.entities)
  const [tab, setTab] = useState<EntityTabKey>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const visibleEntities = tab === "all" ? policy.entities : grouped[tab]

  useEffect(() => {
    setSelectedIds(new Set())
  }, [tab, policy.id])

  const selectedEntities = visibleEntities.filter((entity) => selectedIds.has(entity.id))
  const allVisibleSelected = visibleEntities.length > 0 && visibleEntities.every((entity) => selectedIds.has(entity.id))
  const someVisibleSelected = visibleEntities.some((entity) => selectedIds.has(entity.id))

  function toggleOne(entity: PolicyEntity, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(entity.id)
      else next.delete(entity.id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) visibleEntities.forEach((entity) => next.add(entity.id))
      else visibleEntities.forEach((entity) => next.delete(entity.id))
      return next
    })
  }

  function bulkDetach() {
    if (selectedEntities.length === 0) return
    onBulkDetach(selectedEntities, () => setSelectedIds(new Set()))
  }

  const selectionActive = selectedEntities.length > 0

  return (
    <section className="rounded-lg border bg-card flex flex-col min-h-0 overflow-hidden lg:max-h-full">
      <header className="border-b px-5 py-3 flex items-center justify-between shrink-0 gap-2">
        <h2 className="text-sm font-semibold">
          Attached
          {selectionActive && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {selectedEntities.length} selected
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {selectionActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={bulkDetach}
              disabled={busy}
            >
              <IconUserMinus className="size-4 mr-1.5" />
              Detach {selectedEntities.length}
            </Button>
          )}
          <AttachEntitiesPopover
            policy={policy}
            clientId={clientId}
            onAttached={onAttached}
            disabled={busy}
          />
        </div>
      </header>

      {policy.entities.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground text-center">
          No entities attached yet.
        </p>
      ) : (
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as EntityTabKey)}
          className="flex-1 min-h-0 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-5 mt-4 mb-3 shrink-0">
            <TabsTrigger value="all">All ({policy.entities.length})</TabsTrigger>
            <TabsTrigger value="User">Users ({grouped.User.length})</TabsTrigger>
            <TabsTrigger value="User Group">Groups ({grouped["User Group"].length})</TabsTrigger>
            <TabsTrigger value="Domain">Domains ({grouped.Domain.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="flex-1 min-h-0 overflow-y-auto mt-0">
            <EntityList
              entities={visibleEntities}
              busy={busy}
              selectedIds={selectedIds}
              allSelected={allVisibleSelected}
              someSelected={someVisibleSelected}
              onToggleOne={toggleOne}
              onToggleAll={toggleAll}
              onDetach={onDetach}
            />
          </TabsContent>
        </Tabs>
      )}
    </section>
  )
}

type EntityListProps = {
  entities: PolicyEntity[]
  busy: boolean
  selectedIds: Set<string>
  allSelected: boolean
  someSelected: boolean
  onToggleOne: (entity: PolicyEntity, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
  onDetach: (entity: PolicyEntity) => void
}

function EntityList({
  entities,
  busy,
  selectedIds,
  allSelected,
  someSelected,
  onToggleOne,
  onToggleAll,
  onDetach,
}: Readonly<EntityListProps>) {
  if (entities.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">None.</p>
  }
  let headerCheckedState: boolean | "indeterminate" = false
  if (allSelected) headerCheckedState = true
  else if (someSelected) headerCheckedState = "indeterminate"
  return (
    <Table>
      <TableHeader className="sticky top-0 bg-card z-10">
        <TableRow>
          <TableHead className="w-10 px-5">
            <Checkbox
              checked={headerCheckedState}
              onCheckedChange={(value) => onToggleAll(Boolean(value))}
              aria-label="Select all visible entities"
              disabled={busy}
            />
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="px-5 text-right w-24">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entities.map((entity) => {
          const checked = selectedIds.has(entity.id)
          return (
            <TableRow key={entity.id} data-state={checked ? "selected" : undefined}>
              <TableCell className="px-5">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => onToggleOne(entity, Boolean(value))}
                  aria-label={`Select ${entity.name}`}
                  disabled={busy}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-8 shrink-0 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs">{initials(entity.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{entity.name}</p>
                    {entity.secondary && (
                      <p className="text-xs text-muted-foreground truncate">{entity.secondary}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">{entity.type}</span>
              </TableCell>
              <TableCell className="px-5 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDetach(entity)}
                  disabled={busy}
                >
                  <IconUserMinus className="size-4 mr-1" />
                  Detach
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

// ── Loading skeleton ─────────────────────────────────────────────

function DetailLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────

function groupEntities(entities: PolicyEntity[]) {
  return entities.reduce<Record<PolicyEntity["type"], PolicyEntity[]>>(
    (acc, entity) => {
      acc[entity.type].push(entity)
      return acc
    },
    { User: [], "User Group": [], Domain: [] },
  )
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?"
}
