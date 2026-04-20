import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  IconArrowLeft,
  IconChevronRight,
  IconLinkPlus,
  IconLoader2,
  IconSearch,
  IconShieldLock,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"

import {
  assignMultiplePolicies,
  fetchDomainPolicies,
  fetchPolicies,
  fetchPolicyById,
  removeMultiplePolicies,
} from "@/api/admin"
import {
  getErrorDescription,
  getStatusCodeFromError,
  mapDomainPolicySummary,
  mapPolicyDetail,
  mapPolicySummary,
  normalizeListPayload,
} from "@/components/access-management/runtime"
import type {
  AccessModule,
  AccessPolicy,
  PolicyEntity,
} from "@/components/access-management/types"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import {
  StatusState,
  StatusStateActions,
  type StatusStateCode,
} from "@/components/shared/status-state"
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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/auth-context"

type DomainView = "overview" | "attach" | "policy-detail"

export function AccessDomainsPage() {
  const { domains, selectedClient, selectedClientName } = useAuth()
  const navigate = useNavigate()

  const [view, setView] = useState<DomainView>("overview")
  const [search, setSearch] = useState("")
  const [attachSearch, setAttachSearch] = useState("")

  const [attachedPolicies, setAttachedPolicies] = useState<AccessPolicy[]>([])
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewStatusCode, setOverviewStatusCode] = useState<StatusStateCode | undefined>()
  const [overviewStatusMessage, setOverviewStatusMessage] = useState<string | undefined>()
  const [selectedPolicyKeys, setSelectedPolicyKeys] = useState<Set<string>>(new Set())

  const [attachablePolicies, setAttachablePolicies] = useState<AccessPolicy[]>([])
  const [attachLoading, setAttachLoading] = useState(false)
  const [attachStatusCode, setAttachStatusCode] = useState<StatusStateCode | undefined>()
  const [attachStatusMessage, setAttachStatusMessage] = useState<string | undefined>()
  const [selectedAttachKeys, setSelectedAttachKeys] = useState<Set<string>>(new Set())

  const [selectedPolicy, setSelectedPolicy] = useState<AccessPolicy | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailStatusCode, setDetailStatusCode] = useState<StatusStateCode | undefined>()
  const [detailStatusMessage, setDetailStatusMessage] = useState<string | undefined>()

  const [saving, setSaving] = useState(false)

  const currentDomain = domains.find((domain) => {
    const domainId = String(domain.client_id || domain.clientid || domain.domain || "")
    return domainId === selectedClient
  })

  const domainName = selectedClientName || "Selected Domain"
  const domainEnvironment = currentDomain ? "Production" : "Pending"
  const domainHost = String(
    currentDomain?.domain ||
      currentDomain?.website ||
      selectedClientName ||
      selectedClient ||
      "pending-domain.example",
  )

  const filteredPolicies = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return attachedPolicies
    return attachedPolicies.filter((policy) =>
      policy.name.toLowerCase().includes(query) ||
      policy.description.toLowerCase().includes(query) ||
      (policy.contextLabel || "").toLowerCase().includes(query),
    )
  }, [attachedPolicies, search])

  const filteredAttachPolicies = useMemo(() => {
    const query = attachSearch.trim().toLowerCase()
    if (!query) return attachablePolicies
    return attachablePolicies.filter((policy) =>
      policy.name.toLowerCase().includes(query) ||
      policy.description.toLowerCase().includes(query),
    )
  }, [attachSearch, attachablePolicies])

  // ── Column definitions ─────────────────────────────────────────

  const policyColumns: ColumnDef<AccessPolicy>[] = [
    {
      id: "name",
      header: "Policy",
      sticky: true,
      accessor: (policy) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-secondary shrink-0">
            <IconShieldLock className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate max-w-48" title={policy.name}>{policy.name}</p>
            <p className="text-xs text-muted-foreground truncate max-w-48">{policy.description}</p>
          </div>
        </div>
      ),
      minWidth: "240px",
    },
    {
      id: "modules",
      header: "Modules",
      accessor: (policy) => (
        <Badge variant="secondary" className="border-0">
          {policy.moduleCount ?? policy.modules.length}
        </Badge>
      ),
      minWidth: "100px",
    },
    {
      id: "entities",
      header: "Entities",
      accessor: (policy) => (
        <Badge variant="secondary" className="border-0">
          {policy.entityCount ?? policy.entities.length}
        </Badge>
      ),
      minWidth: "100px",
    },
    {
      id: "risk",
      header: "Risk",
      accessor: (policy) => (
        <Badge variant="secondary" className="border-0 font-normal">{policy.risk}</Badge>
      ),
      minWidth: "100px",
    },
    {
      id: "arrow",
      header: "",
      align: "right",
      accessor: () => <IconChevronRight className="size-4 text-muted-foreground" />,
      minWidth: "48px",
    },
  ]

  const moduleColumns: ColumnDef<AccessModule>[] = [
    { id: "name", header: "Module", accessor: "name", sticky: true, minWidth: "180px" },
    { id: "scope", header: "Scope", accessor: "scope", minWidth: "120px" },
    {
      id: "features",
      header: "Rules",
      accessor: (module) => (
        <Badge variant="secondary" className="border-0">{module.features.length}</Badge>
      ),
      minWidth: "100px",
    },
  ]

  const entityColumns: ColumnDef<PolicyEntity>[] = [
    { id: "name", header: "Entity", accessor: "name", sticky: true, minWidth: "180px" },
    { id: "type", header: "Type", accessor: "type", minWidth: "120px" },
    {
      id: "details",
      header: "Details",
      accessor: (entity) => (
        <span className="block max-w-64 truncate text-muted-foreground">{entity.secondary}</span>
      ),
      minWidth: "180px",
    },
    { id: "attachedAt", header: "Attached", accessor: "attachedAt", minWidth: "120px" },
  ]

  // ── Data loaders ───────────────────────────────────────────────

  const loadAttachedPolicies = async () => {
    if (!selectedClient) return
    setOverviewLoading(true)
    setOverviewStatusCode(undefined)
    setOverviewStatusMessage(undefined)
    try {
      const raw = await fetchDomainPolicies(selectedClient, 1, 200)
      if (raw === null) { setAttachedPolicies([]); setOverviewStatusCode(204); return }
      const payload = normalizeListPayload(raw)
      setAttachedPolicies(payload.list.map((item) => mapDomainPolicySummary(item)))
      setOverviewStatusCode(undefined)
    } catch (error) {
      setAttachedPolicies([])
      setOverviewStatusCode(getStatusCodeFromError(error) ?? 500)
      setOverviewStatusMessage(getErrorDescription(error))
    } finally {
      setOverviewLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedClient) {
      setAttachedPolicies([])
      setOverviewStatusCode(undefined)
      setOverviewStatusMessage(undefined)
      return
    }
    void loadAttachedPolicies()
  }, [selectedClient])

  useEffect(() => {
    if (view !== "attach" || !selectedClient) return
    let cancelled = false
    const load = async () => {
      setAttachLoading(true)
      setAttachStatusCode(undefined)
      setAttachStatusMessage(undefined)
      try {
        const raw = await fetchPolicies({ clientid: selectedClient, count: 200, page: 1, search: attachSearch })
        if (cancelled) return
        if (raw === null) { setAttachablePolicies([]); setAttachStatusCode(204); return }
        const payload = normalizeListPayload(raw)
        setAttachablePolicies(payload.list.map((item) => mapPolicySummary(item)))
        setAttachStatusCode(undefined)
        setSelectedAttachKeys(new Set())
      } catch (error) {
        if (cancelled) return
        setAttachablePolicies([])
        setAttachStatusCode(getStatusCodeFromError(error) ?? 500)
        setAttachStatusMessage(getErrorDescription(error))
      } finally {
        if (!cancelled) setAttachLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [attachSearch, selectedClient, view])

  const loadPolicyDetail = async (policy: AccessPolicy) => {
    if (!selectedClient) return
    setView("policy-detail")
    setDetailLoading(true)
    setDetailStatusCode(undefined)
    setDetailStatusMessage(undefined)
    try {
      const candidates = [policy.pkid, policy.backendPolicyId, policy.policyApiId, policy.id]
        .filter((v, i, list): v is string => Boolean(v) && list.indexOf(v) === i)
      let raw: unknown = null
      let lastError: unknown = null
      for (const candidate of candidates) {
        try { raw = await fetchPolicyById(candidate, selectedClient); lastError = null; break }
        catch (error) {
          lastError = error
          const status = getStatusCodeFromError(error)
          if (status !== 401 && status !== 404) throw error
        }
      }
      if (lastError) throw lastError
      if (raw === null) { setSelectedPolicy(null); setDetailStatusCode(204); return }
      const detail = mapPolicyDetail(raw)
      if (!detail) { setSelectedPolicy(null); setDetailStatusCode(204); return }
      setSelectedPolicy(detail)
    } catch (error) {
      setSelectedPolicy(null)
      setDetailStatusCode(getStatusCodeFromError(error) ?? 500)
      setDetailStatusMessage(getErrorDescription(error))
    } finally {
      setDetailLoading(false)
    }
  }

  // ── Actions ────────────────────────────────────────────────────

  const handleAttachPolicies = async () => {
    if (!selectedClient || selectedAttachKeys.size === 0) return
    setSaving(true)
    try {
      await assignMultiplePolicies({
        clientid: Number(selectedClient),
        entityId: selectedClient,
        type: "DOMAIN",
        policies: Array.from(selectedAttachKeys),
      })
      toast.success("Policies attached to this domain.")
      setSelectedAttachKeys(new Set())
      setView("overview")
      await loadAttachedPolicies()
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to attach policies to this domain right now.")
    } finally {
      setSaving(false)
    }
  }

  const handleRemovePolicies = async () => {
    if (!selectedClient || selectedPolicyKeys.size === 0) return
    const confirmed = window.confirm("Remove the selected policies from this domain?")
    if (!confirmed) return
    setSaving(true)
    try {
      await removeMultiplePolicies({
        clientid: Number(selectedClient),
        entityId: selectedClient,
        type: "DOMAIN",
        policies: Array.from(selectedPolicyKeys),
      })
      toast.success("Policies removed from this domain.")
      setSelectedPolicyKeys(new Set())
      await loadAttachedPolicies()
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to remove policies from this domain right now.")
    } finally {
      setSaving(false)
    }
  }

  // ── No client selected ─────────────────────────────────────────

  if (!selectedClient) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><IconShieldLock /></EmptyMedia>
            <EmptyTitle>No domain selected</EmptyTitle>
            <EmptyDescription>
              Domain access is scoped to the active domain. Pick a domain from the header to continue.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  // ── Policy detail view ─────────────────────────────────────────

  if (view === "policy-detail") {
    if (detailLoading) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button type="button" onClick={() => setView("overview")}>Domain Access</button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-64">
                {selectedPolicy?.name ?? "Policy Detail"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {detailStatusCode || !selectedPolicy ? (
          <>
            <header>
              <h1 className="text-2xl font-bold">Policy Detail</h1>
              <p className="text-sm text-muted-foreground">
                The selected domain policy could not be loaded right now.
              </p>
            </header>
            <StatusState
              code={detailStatusCode}
              title={detailStatusCode === 204 ? "This policy is no longer available in domain access" : undefined}
              description={
                detailStatusCode === 204
                  ? "It may have been detached from this domain or is no longer available."
                  : detailStatusMessage
              }
              actionSlot={<StatusStateActions secondaryLabel="Back" onSecondaryClick={() => setView("overview")} />}
            />
          </>
        ) : (
          <>
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex items-center justify-center size-11 rounded-lg bg-secondary shrink-0">
                  <IconShieldLock className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold truncate">{selectedPolicy.name}</h1>
                    <Badge variant="secondary" className="border-0 font-normal">{selectedPolicy.risk}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{selectedPolicy.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedPolicy.modules.length} modules · {selectedPolicy.entities.length} entities
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/access/policies/${selectedPolicy.backendPolicyId || selectedPolicy.id}`)}
                className="shrink-0"
              >
                View full policy
              </Button>
            </header>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border bg-card flex flex-col overflow-hidden">
                <header className="border-b px-5 py-3 flex items-center justify-between shrink-0">
                  <h2 className="text-sm font-semibold">Permission Modules</h2>
                  <Badge variant="secondary" className="border-0">
                    {selectedPolicy.modules.length}
                  </Badge>
                </header>
                <div className="flex-1 overflow-hidden">
                  <DataTable<AccessModule>
                    columns={moduleColumns}
                    data={selectedPolicy.modules}
                    rowKey={(module) => module.id}
                    emptyState={
                      <StatusState compact title="No modules" description="This policy has no permission modules." />
                    }
                  />
                </div>
              </section>

              <section className="rounded-lg border bg-card flex flex-col overflow-hidden">
                <header className="border-b px-5 py-3 flex items-center justify-between shrink-0">
                  <h2 className="text-sm font-semibold">Attached Entities</h2>
                  <Badge variant="secondary" className="border-0">
                    {selectedPolicy.entities.length}
                  </Badge>
                </header>
                <div className="flex-1 overflow-hidden">
                  <DataTable<PolicyEntity>
                    columns={entityColumns}
                    data={selectedPolicy.entities}
                    rowKey={(entity) => entity.id}
                    emptyState={
                      <StatusState compact title="No entities" description="This policy is not attached to any entities." />
                    }
                  />
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Attach view ────────────────────────────────────────────────

  if (view === "attach") {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button type="button" onClick={() => setView("overview")}>Domain Access</button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Attach Policies</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <header>
          <h1 className="text-2xl font-bold">Attach Permission Policies</h1>
          <p className="text-sm text-muted-foreground">
            Select policies to attach to <span className="font-medium text-foreground">{domainName}</span>.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Current Domain Coverage</h3>
            <DataTable<AccessPolicy>
              columns={policyColumns}
              data={filteredPolicies}
              rowKey={(policy) => policy.id}
              emptyState={
                <StatusState
                  compact
                  title="No attached policies"
                  description="Current domain coverage will appear here once policies are attached."
                />
              }
            />
          </section>

          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold">
                Available Policies
                {selectedAttachKeys.size > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {selectedAttachKeys.size} selected
                  </span>
                )}
              </h3>
              <div className="relative w-full sm:w-72">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search policies…"
                  value={attachSearch}
                  onChange={(e) => setAttachSearch(e.target.value)}
                  className="pl-9"
                />
                {attachSearch && (
                  <button type="button" onClick={() => setAttachSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <IconX className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {attachStatusCode && attachStatusCode !== 204 ? (
              <StatusState code={attachStatusCode} description={attachStatusMessage} />
            ) : (
              <DataTable<AccessPolicy>
                columns={policyColumns}
                data={filteredAttachPolicies}
                rowKey={(policy) => policy.id}
                loading={attachLoading}
                paginated
                selectable
                selectedKeys={selectedAttachKeys}
                onSelectionChange={setSelectedAttachKeys}
                emptyState={
                  <StatusState
                    compact
                    title={attachSearch ? "No policies match this search" : "No attachable policies available"}
                    description={
                      attachSearch
                        ? "Try another search term or clear the filter."
                        : "All available policies may already be attached, or no policies have been created for this domain."
                    }
                    actionSlot={
                      attachSearch
                        ? <StatusStateActions secondaryLabel="Clear Search" onSecondaryClick={() => setAttachSearch("")} />
                        : undefined
                    }
                  />
                }
              />
            )}
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <Button variant="ghost" size="sm" onClick={() => setView("overview")} disabled={saving}>
            <IconArrowLeft className="size-4 mr-1.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            className="melp-radius"
            disabled={saving || selectedAttachKeys.size === 0}
            onClick={handleAttachPolicies}
          >
            {saving && <IconLoader2 className="size-4 mr-1.5 animate-spin" />}
            Attach {selectedAttachKeys.size > 0 ? `${selectedAttachKeys.size} ` : ""}Policies
          </Button>
        </div>
      </div>
    )
  }

  // ── Overview ───────────────────────────────────────────────────

  const hasNoPolicies = !overviewLoading && attachedPolicies.length === 0 && !overviewStatusCode

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Domain Access</h1>
          <p className="text-sm text-muted-foreground">
            Manage permission policies attached to the current domain.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedPolicyKeys.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={handleRemovePolicies}
            >
              {saving
                ? <IconLoader2 className="size-4 mr-1.5 animate-spin" />
                : <IconTrash className="size-4 mr-1.5" />}
              Remove {selectedPolicyKeys.size}
            </Button>
          )}
          <Button size="sm" className="melp-radius" onClick={() => setView("attach")}>
            <IconLinkPlus className="size-4 mr-1.5" />
            Add Permissions
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="border-0">{domainName}</Badge>
        <Badge variant="secondary" className="border-0">{domainEnvironment}</Badge>
        <Badge variant="outline" className="font-normal text-xs">{domainHost}</Badge>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-72">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search attached policies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <IconX className="size-3.5" />
            </button>
          )}
        </div>
        {attachedPolicies.length > 0 && (
          <Badge variant="secondary" className="border-0 shrink-0">
            {filteredPolicies.length} of {attachedPolicies.length}
          </Badge>
        )}
      </div>

      {overviewStatusCode && overviewStatusCode !== 204 ? (
        <StatusState
          code={overviewStatusCode}
          description={overviewStatusMessage}
          actionSlot={<StatusStateActions primaryLabel="Attach Policies" onPrimaryClick={() => setView("attach")} />}
        />
      ) : hasNoPolicies ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><IconShieldLock /></EmptyMedia>
            <EmptyTitle>No policies attached</EmptyTitle>
            <EmptyDescription>
              Attach a policy to this domain to start enforcing domain-level access rules.
            </EmptyDescription>
          </EmptyHeader>
          <Button size="sm" className="melp-radius" onClick={() => setView("attach")}>
            <IconLinkPlus className="size-4 mr-1.5" />
            Add Permissions
          </Button>
        </Empty>
      ) : (
        <DataTable<AccessPolicy>
          columns={policyColumns}
          data={filteredPolicies}
          rowKey={(policy) => policy.id}
          onRowClick={(policy) => void loadPolicyDetail(policy)}
          loading={overviewLoading}
          paginated
          selectable
          selectedKeys={selectedPolicyKeys}
          onSelectionChange={setSelectedPolicyKeys}
          emptyState={
            <StatusState
              compact
              title="No policies match this search"
              description="Try another keyword or clear the search to see all attached policies."
              actionSlot={<StatusStateActions secondaryLabel="Clear Search" onSecondaryClick={() => setSearch("")} />}
            />
          }
        />
      )}
    </div>
  )
}
