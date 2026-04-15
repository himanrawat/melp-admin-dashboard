import { useEffect, useMemo, useState } from "react"
import {
  IconArrowLeft,
  IconLinkPlus,
  IconLoader2,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react"
import { toast } from "sonner"

import {
  assignPolicy,
  createPolicy as savePolicyRequest,
  deletePolicies,
  fetchDomains,
  fetchPolicies,
  fetchPolicyById,
  fetchPolicyFeatures,
  fetchUserGroups,
  fetchUsers,
  revokePolicies,
  updatePolicy,
} from "@/api/admin"
import {
  getErrorDescription,
  getStatusCodeFromError,
  mapDomainsToEntities,
  mapFeatureLibrary,
  mapGroupsToEntities,
  mapPolicyDetail,
  mapPolicySummary,
  mapUsersToEntities,
  normalizeListPayload,
} from "@/components/access-management/runtime"
import type {
  AccessEntityType,
  AccessFeature,
  AccessModule,
  AccessPolicy,
  PolicyEntity,
} from "@/components/access-management/types"
import { PolicyDetailView } from "@/components/access-management/shared"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import {
  StatusState,
  StatusStateActions,
  type StatusStateCode,
} from "@/components/shared/status-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/auth-context"

type PolicyView = "list" | "builder" | "metadata" | "detail" | "attach"

type DraftPolicy = {
  name: string
  description: string
}

const ENTITY_TYPE_TO_BACKEND: Record<AccessEntityType, "USER" | "USER_GROUP" | "DOMAIN"> = {
  User: "USER",
  "User Group": "USER_GROUP",
  Domain: "DOMAIN",
}

function createEmptyDraftPolicy(): DraftPolicy {
  return {
    name: "",
    description: "",
  }
}

function buildSelectedModules(
  moduleLibrary: AccessModule[],
  selectedLimits: Record<string, AccessFeature["limit"]>,
): AccessModule[] {
  return moduleLibrary
    .map((module) => {
      const features = module.features
        .map((feature) => {
          const nextLimit = selectedLimits[feature.id]
          if (!nextLimit) return null
          return {
            ...feature,
            enabled: true,
            limit: nextLimit,
          }
        })
        .filter((feature): feature is AccessFeature => Boolean(feature))

      if (features.length === 0) return null

      return {
        ...module,
        features,
      }
    })
    .filter((module): module is AccessModule => Boolean(module))
}

function seedFeatureSelections(policy: AccessPolicy): Record<string, AccessFeature["limit"]> {
  return policy.modules.reduce<Record<string, AccessFeature["limit"]>>((accumulator, module) => {
    module.features.forEach((feature) => {
      if (feature.enabled) {
        accumulator[feature.id] = feature.limit
      }
    })
    return accumulator
  }, {})
}

function buildPolicyRequestModules(
  moduleLibrary: AccessModule[],
  selectedLimits: Record<string, AccessFeature["limit"]>,
) {
  return buildSelectedModules(moduleLibrary, selectedLimits).map((module) => ({
    name: module.backendName || module.name,
    features: module.features.map((feature) => ({
      featureid: feature.backendFeatureId || feature.id,
      enable: true,
      limit: feature.limit === "Allow" ? 1 : 0,
    })),
  }))
}

function isPolicyDescriptionValid(value: string): boolean {
  return /^[a-zA-Z0-9\s.,()&/\-_:]+$/.test(value)
}

export function AccessPoliciesPage() {
  const { selectedClient, selectedClientName } = useAuth()

  const [view, setView] = useState<PolicyView>("list")
  const [builderMode, setBuilderMode] = useState<"create" | "edit">("create")
  const [draft, setDraft] = useState<DraftPolicy>(createEmptyDraftPolicy)
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [librarySearch, setLibrarySearch] = useState("")
  const [attachSearch, setAttachSearch] = useState("")
  const [attachType, setAttachType] = useState<AccessEntityType>("User Group")

  const [policies, setPolicies] = useState<AccessPolicy[]>([])
  const [policiesLoading, setPoliciesLoading] = useState(false)
  const [policiesStatusCode, setPoliciesStatusCode] = useState<StatusStateCode | undefined>()
  const [policiesStatusMessage, setPoliciesStatusMessage] = useState<string | undefined>()

  const [moduleLibrary, setModuleLibrary] = useState<AccessModule[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryStatusCode, setLibraryStatusCode] = useState<StatusStateCode | undefined>()
  const [libraryStatusMessage, setLibraryStatusMessage] = useState<string | undefined>()

  const [selectedPolicy, setSelectedPolicy] = useState<AccessPolicy | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailStatusCode, setDetailStatusCode] = useState<StatusStateCode | undefined>()
  const [detailStatusMessage, setDetailStatusMessage] = useState<string | undefined>()

  const [attachCandidates, setAttachCandidates] = useState<PolicyEntity[]>([])
  const [attachLoading, setAttachLoading] = useState(false)
  const [attachStatusCode, setAttachStatusCode] = useState<StatusStateCode | undefined>()
  const [attachStatusMessage, setAttachStatusMessage] = useState<string | undefined>()
  const [selectedAttachKeys, setSelectedAttachKeys] = useState<Set<string>>(new Set())

  const [selectedFeatureLimits, setSelectedFeatureLimits] = useState<Record<string, AccessFeature["limit"]>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selectedModules = useMemo(
    () => buildSelectedModules(moduleLibrary, selectedFeatureLimits),
    [moduleLibrary, selectedFeatureLimits],
  )

  const filteredPolicies = policies

  const filteredLibrary = useMemo(() => {
    const query = librarySearch.trim().toLowerCase()
    if (!query) return moduleLibrary

    return moduleLibrary.filter((module) => {
      if (module.name.toLowerCase().includes(query)) return true
      return module.features.some((feature) => feature.name.toLowerCase().includes(query))
    })
  }, [librarySearch, moduleLibrary])

  const filteredAttachCandidates = useMemo(() => {
    const query = attachSearch.trim().toLowerCase()
    if (!query) return attachCandidates

    return attachCandidates.filter((candidate) => {
      return (
        candidate.name.toLowerCase().includes(query) ||
        candidate.secondary.toLowerCase().includes(query)
      )
    })
  }, [attachCandidates, attachSearch])

  const policyColumns: ColumnDef<AccessPolicy>[] = [
    {
      id: "name",
      header: "Policy Name",
      sticky: true,
      accessor: (policy) => (
        <button type="button" className="block max-w-50 truncate text-left font-medium">
          {policy.name}
        </button>
      ),
      minWidth: "200px",
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
    { id: "createdAt", header: "Created", accessor: "createdAt", minWidth: "110px" },
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
      id: "entities",
      header: "Entities",
      accessor: (policy) => (
        <Badge variant="secondary" className="border-0">
          {policy.entityCount ?? policy.entities.length} attached
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

  const attachColumns: ColumnDef<PolicyEntity>[] = [
    { id: "name", header: "Name", accessor: "name", sticky: true, minWidth: "180px" },
    { id: "type", header: "Type", accessor: "type", minWidth: "120px" },
    {
      id: "details",
      header: "Details",
      accessor: (entity) => (
        <span className="text-sm text-muted-foreground">{entity.secondary}</span>
      ),
      minWidth: "180px",
    },
    {
      id: "availability",
      header: "Availability",
      accessor: "attachedAt",
      align: "right",
      minWidth: "120px",
    },
  ]

  useEffect(() => {
    if (!selectedClient) {
      setPolicies([])
      setPoliciesStatusCode(undefined)
      setPoliciesStatusMessage(undefined)
      return
    }

    let cancelled = false

    const loadPolicies = async () => {
      setPoliciesLoading(true)
      setPoliciesStatusCode(undefined)
      setPoliciesStatusMessage(undefined)

      try {
        const raw = await fetchPolicies({
          clientid: selectedClient,
          count: 200,
          page: 1,
          search,
        })

        if (cancelled) return

        if (raw === null) {
          setPolicies([])
          setPoliciesStatusCode(204)
          return
        }

        const payload = normalizeListPayload(raw)
        setPolicies(payload.list.map((item) => mapPolicySummary(item)))
        setPoliciesStatusCode(undefined)
      } catch (error) {
        if (cancelled) return
        setPolicies([])
        setPoliciesStatusCode(getStatusCodeFromError(error) ?? 500)
        setPoliciesStatusMessage(getErrorDescription(error))
      } finally {
        if (!cancelled) {
          setPoliciesLoading(false)
        }
      }
    }

    void loadPolicies()

    return () => {
      cancelled = true
    }
  }, [search, selectedClient])

  useEffect(() => {
    setModuleLibrary([])
    setLibraryStatusCode(undefined)
    setLibraryStatusMessage(undefined)
    setLibrarySearch("")
    setSelectedFeatureLimits({})
  }, [selectedClient])

  useEffect(() => {
    if (!selectedClient || (view !== "builder" && view !== "metadata")) return

    let cancelled = false

    const loadLibrary = async () => {
      setLibraryLoading(true)
      setLibraryStatusCode(undefined)
      setLibraryStatusMessage(undefined)

      try {
        const raw = await fetchPolicyFeatures(selectedClient)
        if (cancelled) return

        if (raw === null) {
          setModuleLibrary([])
          setLibraryStatusCode(204)
          return
        }

        setModuleLibrary(mapFeatureLibrary(raw))
      } catch (error) {
        if (cancelled) return
        setModuleLibrary([])
        setLibraryStatusCode(getStatusCodeFromError(error) ?? 500)
        setLibraryStatusMessage(getErrorDescription(error))
      } finally {
        if (!cancelled) {
          setLibraryLoading(false)
        }
      }
    }

    void loadLibrary()

    return () => {
      cancelled = true
    }
  }, [selectedClient, view])

  useEffect(() => {
    if (view !== "attach" || !selectedPolicy || !selectedClient) return

    let cancelled = false

    const loadCandidates = async () => {
      setAttachLoading(true)
      setAttachStatusCode(undefined)
      setAttachStatusMessage(undefined)

      try {
        let nextCandidates: PolicyEntity[] = []

        if (attachType === "User") {
          const raw = await fetchUsers({
            page: 1,
            pageSize: 100,
            clientid: selectedClient,
            category: 0,
            filters: attachSearch.trim()
              ? [
                  { column: "FULL_NAME", value: attachSearch.trim() },
                  { column: "EMAIL", value: attachSearch.trim() },
                ]
              : [],
          })

          if (raw === null) {
            if (cancelled) return
            setAttachCandidates([])
            setAttachStatusCode(204)
            return
          }

          nextCandidates = mapUsersToEntities(raw)
        }

        if (attachType === "User Group") {
          const raw = await fetchUserGroups({
            page: 1,
            count: 100,
            filters: {
              clientid: Number(selectedClient),
              query: attachSearch.trim(),
            },
          })

          if (raw === null) {
            if (cancelled) return
            setAttachCandidates([])
            setAttachStatusCode(204)
            return
          }

          nextCandidates = mapGroupsToEntities(raw)
        }

        if (attachType === "Domain") {
          const raw = await fetchDomains(selectedClient)
          if (raw === null) {
            if (cancelled) return
            setAttachCandidates([])
            setAttachStatusCode(204)
            return
          }

          nextCandidates = mapDomainsToEntities(raw)
        }

        if (cancelled) return

        setAttachCandidates(nextCandidates)
        setSelectedAttachKeys(new Set())
      } catch (error) {
        if (cancelled) return
        setAttachCandidates([])
        setAttachStatusCode(getStatusCodeFromError(error) ?? 500)
        setAttachStatusMessage(getErrorDescription(error))
      } finally {
        if (!cancelled) {
          setAttachLoading(false)
        }
      }
    }

    void loadCandidates()

    return () => {
      cancelled = true
    }
  }, [attachSearch, attachType, selectedClient, selectedPolicy, view])

  const loadPolicyDetail = async (policyRef: AccessPolicy | string) => {
    if (!selectedClient) return

    setView("detail")
    setDetailLoading(true)
    setDetailStatusCode(undefined)
    setDetailStatusMessage(undefined)

    try {
      const candidates =
        typeof policyRef === "string"
          ? [policyRef]
          : [
              policyRef.pkid,
              policyRef.backendPolicyId,
              policyRef.policyApiId,
              policyRef.id,
            ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index)

      let raw: unknown = null
      let lastError: unknown = null

      for (const candidate of candidates) {
        try {
          raw = await fetchPolicyById(candidate, selectedClient)
          lastError = null
          break
        } catch (error) {
          lastError = error
          const status = getStatusCodeFromError(error)
          if (status !== 401 && status !== 404) {
            throw error
          }
        }
      }

      if (lastError) throw lastError

      if (raw === null) {
        setSelectedPolicy(null)
        setDetailStatusCode(204)
        return
      }

      const mapped = mapPolicyDetail(raw)
      setSelectedPolicy(mapped)
      setDetailStatusCode(undefined)
    } catch (error) {
      setSelectedPolicy(null)
      setDetailStatusCode(getStatusCodeFromError(error) ?? 500)
      setDetailStatusMessage(getErrorDescription(error))
    } finally {
      setDetailLoading(false)
    }
  }

  const resetBuilder = () => {
    setBuilderMode("create")
    setEditingPolicyId(null)
    setDraft(createEmptyDraftPolicy())
    setSelectedFeatureLimits({})
    setLibrarySearch("")
  }

  const openCreateBuilder = () => {
    resetBuilder()
    setView("builder")
  }

  const openEditBuilder = () => {
    if (!selectedPolicy) return
    setBuilderMode("edit")
    setEditingPolicyId(selectedPolicy.backendPolicyId || selectedPolicy.id)
    setDraft({
      name: selectedPolicy.name,
      description: selectedPolicy.description,
    })
    setSelectedFeatureLimits(seedFeatureSelections(selectedPolicy))
    setView("builder")
  }

  const handleToggleFeature = (feature: AccessFeature, limit: AccessFeature["limit"]) => {
    setSelectedFeatureLimits((current) => {
      if (current[feature.id] === limit) {
        const next = { ...current }
        delete next[feature.id]
        return next
      }

      return {
        ...current,
        [feature.id]: limit,
      }
    })
  }

  const handleSavePolicy = async () => {
    if (!selectedClient) return

    const name = draft.name.trim()
    const description = draft.description.trim()
    const modules = buildPolicyRequestModules(moduleLibrary, selectedFeatureLimits)

    if (!name) {
      toast.error("Add a policy name before saving.")
      return
    }

    if (!description) {
      toast.error("Add a policy description before saving.")
      return
    }

    if (description.length > 200) {
      toast.error("Policy description must be 200 characters or fewer.")
      return
    }

    if (!isPolicyDescriptionValid(description)) {
      toast.error("Use only letters, numbers, spaces, and basic punctuation in the policy description.")
      return
    }

    if (modules.length === 0) {
      toast.error("Choose at least one permission before saving this policy.")
      return
    }

    setSaving(true)

    try {
      const payload = {
        clientid: Number(selectedClient),
        policyName: name,
        desc: description,
        modules,
      }

      if (builderMode === "edit" && editingPolicyId) {
        await updatePolicy(editingPolicyId, {
          ...payload,
          pkid: editingPolicyId,
        })
      } else {
        await savePolicyRequest(payload)
      }

      toast.success(builderMode === "edit" ? "Policy updated." : "Policy created.")
      const raw = await fetchPolicies({ clientid: selectedClient, count: 200, page: 1, search })
      if (raw === null) {
        setPolicies([])
        setPoliciesStatusCode(204)
      } else {
        const payload = normalizeListPayload(raw)
        setPolicies(payload.list.map((item) => mapPolicySummary(item)))
        setPoliciesStatusCode(undefined)
      }

      if (builderMode === "edit" && editingPolicyId) {
        await loadPolicyDetail(editingPolicyId)
        setView("detail")
      } else {
        resetBuilder()
        setView("list")
      }
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to save this policy right now.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePolicy = async () => {
    if (!selectedPolicy || !selectedClient) return

    const confirmed = window.confirm(`Delete ${selectedPolicy.name}?`)
    if (!confirmed) return

    setDeleting(true)

    try {
      await deletePolicies([selectedPolicy.backendPolicyId || selectedPolicy.id], selectedClient)
      toast.success("Policy deleted.")
      setSelectedPolicy(null)
      setView("list")

      const raw = await fetchPolicies({
        clientid: selectedClient,
        count: 200,
        page: 1,
        search,
      })

      if (raw === null) {
        setPolicies([])
        setPoliciesStatusCode(204)
        return
      }

      const payload = normalizeListPayload(raw)
      setPolicies(payload.list.map((item) => mapPolicySummary(item)))
      setPoliciesStatusCode(undefined)
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to delete this policy right now.")
    } finally {
      setDeleting(false)
    }
  }

  const handleAttachEntities = async () => {
    if (!selectedPolicy || !selectedClient || selectedAttachKeys.size === 0) return

    const add = filteredAttachCandidates
      .filter((candidate) => selectedAttachKeys.has(candidate.id))
      .map((candidate) => ({
        type: ENTITY_TYPE_TO_BACKEND[attachType],
        entityId: candidate.entityId || candidate.id,
      }))

    if (add.length === 0) {
      toast.error("Select at least one entity to attach.")
      return
    }

    setSaving(true)

    try {
      await assignPolicy(selectedPolicy.backendPolicyId || selectedPolicy.id, {
        clientid: Number(selectedClient),
        policyId: selectedPolicy.backendPolicyId || selectedPolicy.id,
        add,
      })
      toast.success(`${attachType} attached.`)
      setSelectedAttachKeys(new Set())
      await loadPolicyDetail(selectedPolicy)
      setView("detail")
    } catch (error) {
      toast.error(getErrorDescription(error) || `Unable to attach ${attachType.toLowerCase()}s right now.`)
    } finally {
      setSaving(false)
    }
  }

  const handleDetachEntities = async (entityIds?: string[]) => {
    if (!selectedPolicy) return

    const selectedIds = new Set(entityIds ?? [])
    if (selectedIds.size === 0) return

    const revokeIds = selectedPolicy.entities
      .filter((entity) => selectedIds.has(entity.id))
      .map((entity) => entity.activeId || entity.id)

    if (revokeIds.length === 0) return

    setSaving(true)

    try {
      await revokePolicies(selectedPolicy.backendPolicyId || selectedPolicy.id, revokeIds)
      toast.success("Entity access removed.")
      await loadPolicyDetail(selectedPolicy)
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to remove these entity assignments right now.")
    } finally {
      setSaving(false)
    }
  }

  if (!selectedClient) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <StatusState
          title="Choose a domain first"
          description="Access policies are scoped to the active domain. Pick a domain from the header to keep going."
        />
      </div>
    )
  }

  if (view === "detail") {
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
            <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView("list")}>
              <IconArrowLeft className="size-4" />
              Back to Policies
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Policy Detail</h1>
              <p className="text-sm text-muted-foreground">
                The selected policy could not be loaded right now.
              </p>
            </div>
          </div>

          <StatusState
            code={detailStatusCode}
            title={detailStatusCode === 204 ? "This policy is no longer available" : undefined}
            description={
              detailStatusCode === 204
                ? "It may have been deleted, moved out of this domain, or is no longer returned by the backend."
                : detailStatusMessage
            }
            actionSlot={
              <StatusStateActions
                secondaryLabel="Back"
                onSecondaryClick={() => setView("list")}
                primaryLabel="Open Create Policy"
                onPrimaryClick={openCreateBuilder}
              />
            }
          />
        </div>
      )
    }

    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
        <PolicyDetailView
          policy={selectedPolicy}
          onBack={() => setView("list")}
          onEdit={openEditBuilder}
          onDelete={deleting ? undefined : handleDeletePolicy}
          onAttachEntity={(type) => {
            setAttachType(type)
            setView("attach")
          }}
          onDetachEntities={handleDetachEntities}
        />
      </div>
    )
  }

  if (view === "builder") {
    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView("list")}>
            <IconArrowLeft className="size-4" />
            Back to Policies
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {builderMode === "create" ? "Create Policy" : "Edit Policy"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Choose modules and feature rules before moving to policy metadata.
              </p>
            </div>
            <Badge variant="outline">{selectedModules.length} selected modules</Badge>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Permission Library</h3>
              <div className="relative w-full sm:w-64">
                <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search modules…"
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {libraryStatusCode && libraryStatusCode !== 204 ? (
              <StatusState
                code={libraryStatusCode}
                compact
                description={libraryStatusMessage}
              />
            ) : libraryLoading ? (
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
                  Preparing permission library...
                </div>
                <p className="text-xs text-muted-foreground">
                  Loading modules and feature rules for the selected domain.
                </p>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-md border border-dashed p-4">
                      <div className="h-4 w-40 rounded bg-muted" />
                      <div className="mt-2 h-3 w-64 rounded bg-muted/80" />
                      <div className="mt-4 grid gap-2">
                        <div className="h-12 rounded bg-muted/60" />
                        <div className="h-12 rounded bg-muted/60" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredLibrary.length === 0 ? (
              <StatusState
                compact
                title={librarySearch ? "No modules match this search" : "No modules available yet"}
                description={
                  librarySearch
                    ? "Try another search term or clear the filter."
                    : "No permission modules are available for this domain yet. You can’t create a policy until the feature library is published."
                }
                actionSlot={
                  librarySearch ? (
                    <StatusStateActions secondaryLabel="Clear Search" onSecondaryClick={() => setLibrarySearch("")} />
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredLibrary.map((module) => (
                  <div key={module.id} className="rounded-md border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{module.name}</p>
                        <p className="text-xs text-muted-foreground">{module.description}</p>
                      </div>
                      <Badge variant="outline">{module.scope}</Badge>
                    </div>
                    <div className="mt-3 space-y-3">
                      {module.features.map((feature) => {
                        const currentLimit = selectedFeatureLimits[feature.id]
                        return (
                          <div key={feature.id} className="flex flex-col gap-3 rounded-md border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-medium">{feature.name}</p>
                              <p className="text-xs text-muted-foreground">{feature.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={currentLimit === "Allow" ? "default" : "outline"}
                                onClick={() => handleToggleFeature(feature, "Allow")}
                              >
                                Allow
                              </Button>
                              <Button
                                size="sm"
                                variant={currentLimit === "Deny" ? "default" : "outline"}
                                onClick={() => handleToggleFeature(feature, "Deny")}
                              >
                                Deny
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Selected Permissions ({selectedModules.length})</h3>
            {selectedModules.length === 0 ? (
              <StatusState
                compact
                title="No permissions selected"
                description="Selected modules will appear here once you choose at least one rule."
              />
            ) : (
              <div className="space-y-3">
                {selectedModules.map((module) => (
                  <div key={module.id} className="rounded-md border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{module.name}</p>
                      <Badge variant="secondary" className="border-0">
                        {module.features.length} rules
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {module.features.map((feature) => (
                        <Badge key={feature.id} variant="outline">
                          {feature.name}: {feature.limit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => setView("list")}>
            Cancel
          </Button>
          <Button className="melp-radius" disabled={selectedModules.length === 0 || libraryLoading} onClick={() => setView("metadata")}>
            Continue
          </Button>
        </div>
      </div>
    )
  }

  if (view === "metadata") {
    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView("builder")}>
            <IconArrowLeft className="size-4" />
            Back to Permission Builder
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {builderMode === "create" ? "Name and Describe Policy" : "Review Policy Metadata"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Finish the policy name and description before saving.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4 rounded-md border p-4">
            <h3 className="text-sm font-semibold">Policy Information</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Policy Name</Label>
              <Input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="e.g. Operations Core Access"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Describe who should use this policy and why it exists."
                rows={6}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                Required. Max 200 characters. Use letters, numbers, spaces, and basic punctuation only.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Policy Preview</h3>
            <div className="rounded-md border bg-muted/30 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{draft.name || "Untitled Policy"}</p>
                <Badge variant="outline">{selectedModules.length} modules</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {draft.description || "Policy description preview will appear here."}
              </p>
            </div>
            {selectedModules.length === 0 ? (
              <StatusState
                compact
                title="No modules connected"
                description="Go back to the permission builder to select at least one module."
              />
            ) : (
              <div className="space-y-3">
                {selectedModules.map((module) => (
                  <div key={module.id} className="rounded-md border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{module.name}</p>
                      <Badge variant="secondary" className="border-0">
                        {module.features.length} rules
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {module.features.map((feature) => (
                        <Badge key={feature.id} variant="outline">
                          {feature.name}: {feature.limit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => setView("list")}>
            Cancel
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setView("builder")}>
              Back
            </Button>
            <Button className="melp-radius" disabled={saving} onClick={handleSavePolicy}>
              {saving ? <IconLoader2 className="mr-1.5 size-4 animate-spin" /> : null}
              {builderMode === "create" ? "Create Policy" : "Save Policy"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (view === "attach") {
    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView("detail")}>
            <IconArrowLeft className="size-4" />
            Back to Policy Detail
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Attach {attachType}</h1>
            <p className="text-sm text-muted-foreground">
              Choose which {attachType.toLowerCase()}s should receive this policy.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["User", "User Group", "Domain"] as AccessEntityType[]).map((type) => (
            <Button
              key={type}
              variant={attachType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setAttachType(type)}
            >
              {type}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${attachType.toLowerCase()}s…`}
              value={attachSearch}
              onChange={(event) => setAttachSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex-1" />
          <Badge variant="secondary" className="border-0">
            {filteredAttachCandidates.length} results
          </Badge>
        </div>

        {attachStatusCode && attachStatusCode !== 204 ? (
          <StatusState
            code={attachStatusCode}
            title={`Unable to load ${attachType.toLowerCase()} candidates`}
            description={attachStatusMessage}
          />
        ) : (
          <DataTable<PolicyEntity>
            columns={attachColumns}
            data={filteredAttachCandidates}
            rowKey={(entity) => entity.id}
            loading={attachLoading}
            paginated
            selectable
            selectedKeys={selectedAttachKeys}
            onSelectionChange={setSelectedAttachKeys}
            emptyState={
              <StatusState
                compact
                title={attachSearch ? `No ${attachType.toLowerCase()}s match this search` : `No ${attachType.toLowerCase()} candidates available`}
                description={
                  attachSearch
                    ? "Try another search term or clear the filter."
                    : "This table is waiting for live attachment candidates from the backend."
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

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => setView("detail")}>
            Cancel
          </Button>
          <Button className="melp-radius" disabled={saving || selectedAttachKeys.size === 0} onClick={handleAttachEntities}>
            {saving ? <IconLoader2 className="mr-1.5 size-4 animate-spin" /> : <IconLinkPlus className="mr-1.5 size-4" />}
            Attach {attachType}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Policies</h1>
          <p className="text-sm text-muted-foreground">
            Manage permission policies, modules, and entity attachments.
          </p>
        </div>
        <Button size="sm" className="melp-radius" onClick={openCreateBuilder}>
          <IconPlus className="mr-1.5 size-4" />
          Create Policy
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search policies…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="border-0 text-[10px] px-1.5 py-0">
            {moduleLibrary.length} module templates
          </Badge>
          <Badge variant="secondary" className="border-0 text-[10px] px-1.5 py-0">
            {filteredPolicies.length} policies
          </Badge>
          <Badge variant="outline">{selectedClientName || selectedClient}</Badge>
        </div>
      </div>

      {policiesStatusCode && policiesStatusCode !== 204 ? (
        <StatusState
          code={policiesStatusCode}
          description={policiesStatusMessage}
          actionSlot={<StatusStateActions primaryLabel="Open Create Policy" onPrimaryClick={openCreateBuilder} />}
        />
      ) : (
        <DataTable<AccessPolicy>
          columns={policyColumns}
          data={filteredPolicies}
          rowKey={(policy) => policy.id}
          onRowClick={(policy) => void loadPolicyDetail(policy)}
          loading={policiesLoading}
          paginated
          emptyState={
            <StatusState
              compact
              title={search ? "No policies match this search" : "No policies created yet"}
              description={
                search
                  ? "Try another keyword or clear the search to see your full policy catalog."
                  : "Create your first policy to define access rules, then attach it to users, groups, or domains."
              }
              actionSlot={
                search ? (
                  <StatusStateActions secondaryLabel="Clear Search" onSecondaryClick={() => setSearch("")} />
                ) : (
                  <StatusStateActions primaryLabel="Create Policy" onPrimaryClick={openCreateBuilder} />
                )
              }
            />
          }
        />
      )}
    </div>
  )
}
