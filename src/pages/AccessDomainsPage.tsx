import { useEffect, useMemo, useState } from "react"
import {
  IconArrowLeft,
  IconLinkPlus,
  IconLoader2,
  IconSearch,
  IconTrash,
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/auth-context"

type DomainView = "overview" | "attach" | "policy-detail"

export function AccessDomainsPage() {
  const { domains, selectedClient, selectedClientName } = useAuth()

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
    return attachedPolicies.filter((policy) => {
      return (
        policy.name.toLowerCase().includes(query) ||
        policy.description.toLowerCase().includes(query) ||
        (policy.contextLabel || "").toLowerCase().includes(query)
      )
    })
  }, [attachedPolicies, search])

  const filteredAttachPolicies = useMemo(() => {
    const query = attachSearch.trim().toLowerCase()
    if (!query) return attachablePolicies
    return attachablePolicies.filter((policy) => {
      return (
        policy.name.toLowerCase().includes(query) ||
        policy.description.toLowerCase().includes(query)
      )
    })
  }, [attachSearch, attachablePolicies])

  const policyColumns: ColumnDef<AccessPolicy>[] = [
    {
      id: "name",
      header: "Policy Name",
      sticky: true,
      accessor: (policy) => (
        <button type="button" className="block max-w-56 truncate text-left font-medium">
          {policy.name}
        </button>
      ),
      minWidth: "220px",
    },
    {
      id: "description",
      header: "Description",
      accessor: (policy) => (
        <span className="block max-w-[16rem] line-clamp-3 whitespace-normal break-words text-muted-foreground">
          {policy.description}
        </span>
      ),
      minWidth: "180px",
    },
    {
      id: "entities",
      header: "Entities",
      accessor: (policy) => (
        <Badge variant="secondary" className="border-0">
          {policy.entityCount ?? policy.entities.length} entities
        </Badge>
      ),
      minWidth: "100px",
    },
    {
      id: "modules",
      header: "Modules",
      accessor: (policy) => (
        <Badge variant="secondary" className="border-0">
          {policy.moduleCount ?? policy.modules.length} modules
        </Badge>
      ),
      minWidth: "100px",
    },
    {
      id: "risk",
      header: "Risk",
      accessor: (policy) => <Badge variant="outline">{policy.risk}</Badge>,
      minWidth: "100px",
    },
  ]

  const moduleColumns: ColumnDef<AccessModule>[] = [
    { id: "name", header: "Module", accessor: "name", sticky: true, minWidth: "180px" },
    { id: "scope", header: "Scope", accessor: "scope", minWidth: "120px" },
    {
      id: "features",
      header: "Rules",
      accessor: (module) => (
        <Badge variant="secondary" className="border-0">
          {module.features.length} rules
        </Badge>
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
        <span className="block max-w-[16rem] truncate text-muted-foreground">
          {entity.secondary}
        </span>
      ),
      minWidth: "180px",
    },
    { id: "attachedAt", header: "Attached", accessor: "attachedAt", minWidth: "120px" },
  ]

  const loadAttachedPolicies = async () => {
    if (!selectedClient) return

    setOverviewLoading(true)
    setOverviewStatusCode(undefined)
    setOverviewStatusMessage(undefined)

    try {
      const raw = await fetchDomainPolicies(selectedClient, 1, 200)

      if (raw === null) {
        setAttachedPolicies([])
        setOverviewStatusCode(204)
        return
      }

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

    const loadAttachablePolicies = async () => {
      setAttachLoading(true)
      setAttachStatusCode(undefined)
      setAttachStatusMessage(undefined)

      try {
        const raw = await fetchPolicies({
          clientid: selectedClient,
          count: 200,
          page: 1,
          search: attachSearch,
        })

        if (cancelled) return

        if (raw === null) {
          setAttachablePolicies([])
          setAttachStatusCode(204)
          return
        }

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
        if (!cancelled) {
          setAttachLoading(false)
        }
      }
    }

    void loadAttachablePolicies()

    return () => {
      cancelled = true
    }
  }, [attachSearch, selectedClient, view])

  const loadPolicyDetail = async (policyId: string) => {
    if (!selectedClient) return

    setView("policy-detail")
    setDetailLoading(true)
    setDetailStatusCode(undefined)
    setDetailStatusMessage(undefined)

    try {
      const raw = await fetchPolicyById(policyId, selectedClient)

      if (raw === null) {
        setSelectedPolicy(null)
        setDetailStatusCode(204)
        return
      }

      const detail = mapPolicyDetail(raw)
      if (!detail) {
        setSelectedPolicy(null)
        setDetailStatusCode(204)
        return
      }

      setSelectedPolicy(detail)
    } catch (error) {
      setSelectedPolicy(null)
      setDetailStatusCode(getStatusCodeFromError(error) ?? 500)
      setDetailStatusMessage(getErrorDescription(error))
    } finally {
      setDetailLoading(false)
    }
  }

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

  if (!selectedClient) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <StatusState
          title="Choose a domain first"
          description="Domain access is scoped to the active domain. Pick a domain from the header to continue."
        />
      </div>
    )
  }

  if (view === "policy-detail") {
    if (detailLoading) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (detailStatusCode || !selectedPolicy) {
      return (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          <div className="space-y-3">
            <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView("overview")}>
              <IconArrowLeft className="size-4" />
              Back to Domain Access
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Policy Detail</h1>
              <p className="text-sm text-muted-foreground">
                The selected domain policy could not be loaded right now.
              </p>
            </div>
          </div>

          <StatusState
            code={detailStatusCode}
            title={detailStatusCode === 204 ? "This policy is no longer available in domain access" : undefined}
            description={
              detailStatusCode === 204
                ? "It may have been detached from this domain or is no longer available from the backend."
                : detailStatusMessage
            }
            actionSlot={<StatusStateActions secondaryLabel="Back" onSecondaryClick={() => setView("overview")} />}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView("overview")}>
            <IconArrowLeft className="size-4" />
            Back to Domain Access
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">{selectedPolicy.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedPolicy.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{selectedPolicy.risk}</Badge>
              <Badge variant="secondary" className="border-0">
                {selectedPolicy.moduleCount ?? selectedPolicy.modules.length} modules
              </Badge>
              <Badge variant="secondary" className="border-0">
                {selectedPolicy.entityCount ?? selectedPolicy.entities.length} entities
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Permission Modules</h3>
            <DataTable<AccessModule>
              columns={moduleColumns}
              data={selectedPolicy.modules}
              rowKey={(module) => module.id}
              emptyState={
                <StatusState
                  compact
                  title="No modules attached"
                  description="This policy does not have any module rules yet."
                />
              }
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Attached Entities</h3>
            <DataTable<PolicyEntity>
              columns={entityColumns}
              data={selectedPolicy.entities}
              rowKey={(entity) => entity.id}
              emptyState={
                <StatusState
                  compact
                  title="No entities attached"
                  description="This policy is not currently attached to any users, groups, or domains."
                />
              }
            />
          </div>
        </div>
      </div>
    )
  }

  if (view === "attach") {
    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView("overview")}>
            <IconArrowLeft className="size-4" />
            Back to Domain Access
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Attach Permission Policies</h1>
            <p className="text-sm text-muted-foreground">
              Select policies to attach to <span className="font-medium text-foreground">{domainName}</span>.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Current Domain Coverage</h3>
            <DataTable<AccessPolicy>
              columns={policyColumns}
              data={filteredPolicies}
              rowKey={(policy) => policy.id}
              emptyState={
                <StatusState
                  compact
                  title="No attached policies available"
                  description="Current-domain coverage will render here once policies are attached."
                />
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold">Available Policies</h3>
              <div className="relative w-full sm:w-72">
                <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search policies…"
                  value={attachSearch}
                  onChange={(event) => setAttachSearch(event.target.value)}
                  className="pl-9"
                />
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
                    title={attachSearch ? "No attachable policies match this search" : "No attachable policies available yet"}
                    description={
                      attachSearch
                        ? "Try another search term or clear the filter."
                        : "All available policies may already be attached, or no policies have been created for this domain yet."
                    }
                    actionSlot={
                      attachSearch ? (
                        <StatusStateActions secondaryLabel="Clear Search" onSecondaryClick={() => setAttachSearch("")} />
                      ) : undefined
                    }
                  />
                }
              />
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => setView("overview")}>
            Cancel
          </Button>
          <Button className="melp-radius" disabled={saving || selectedAttachKeys.size === 0} onClick={handleAttachPolicies}>
            {saving ? <IconLoader2 className="mr-1.5 size-4 animate-spin" /> : null}
            Attach Policies
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Domain Access</h1>
          <p className="text-sm text-muted-foreground">
            Manage permission policies attached to the current domain.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={saving || selectedPolicyKeys.size === 0} onClick={handleRemovePolicies}>
            <IconTrash className="mr-1.5 size-4" />
            Remove
          </Button>
          <Button size="sm" className="melp-radius" onClick={() => setView("attach")}>
            <IconLinkPlus className="mr-1.5 size-4" />
            Add Permissions
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{domainName}</Badge>
        <Badge variant="outline">{domainEnvironment}</Badge>
        <Badge variant="outline">{domainHost}</Badge>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search attached policies…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="border-0 text-[10px] px-1.5 py-0">
            {filteredPolicies.length} policies
          </Badge>
        </div>
      </div>

      {overviewStatusCode && overviewStatusCode !== 204 ? (
        <StatusState
          code={overviewStatusCode}
          description={overviewStatusMessage}
          actionSlot={<StatusStateActions primaryLabel="Open Attach Flow" onPrimaryClick={() => setView("attach")} />}
        />
      ) : (
        <DataTable<AccessPolicy>
          columns={policyColumns}
          data={filteredPolicies}
          rowKey={(policy) => policy.id}
          onRowClick={(policy) => void loadPolicyDetail(policy.id)}
          loading={overviewLoading}
          paginated
          selectable
          selectedKeys={selectedPolicyKeys}
          onSelectionChange={setSelectedPolicyKeys}
          emptyState={
            <StatusState
              compact
              title={search ? "No attached policies match this search" : "No policies attached to this domain"}
              description={
                search
                  ? "Try another keyword or clear the search to see the full attached-policy list."
                  : "Attach a policy to this domain to start enforcing domain-level access rules."
              }
              actionSlot={
                search ? (
                  <StatusStateActions secondaryLabel="Clear Search" onSecondaryClick={() => setSearch("")} />
                ) : (
                  <StatusStateActions primaryLabel="Attach Policy" onPrimaryClick={() => setView("attach")} />
                )
              }
            />
          }
        />
      )}
    </div>
  )
}
