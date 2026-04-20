import { useCallback, useEffect, useState } from "react"
import { IconLinkPlus, IconLoader2, IconPlus, IconSearch } from "@tabler/icons-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  assignPolicy,
  fetchDomains,
  fetchUserGroups,
  fetchUsers,
} from "@/api/admin"
import {
  getErrorDescription,
  mapDomainsToEntities,
  mapGroupsToEntities,
  mapUsersToEntities,
} from "@/components/access-management/runtime"
import type {
  AccessEntityType,
  AccessPolicy,
  PolicyEntity,
} from "@/components/access-management/types"

const ENTITY_TYPES: AccessEntityType[] = ["User", "User Group", "Domain"]

const ENTITY_TYPE_TO_BACKEND: Record<AccessEntityType, "USER" | "USER_GROUP" | "DOMAIN"> = {
  User: "USER",
  "User Group": "USER_GROUP",
  Domain: "DOMAIN",
}

type Props = {
  policy: AccessPolicy | null
  clientId: string
  onAttached: () => void
  disabled?: boolean
}

export function AttachEntitiesPopover({
  policy,
  clientId,
  onAttached,
  disabled,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false)
  const [entityType, setEntityType] = useState<AccessEntityType>("User")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [candidates, setCandidates] = useState<PolicyEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const attachedIds = new Set(policy?.entities.map((entity) => entity.entityId || entity.id) ?? [])

  const runSearch = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const mapped = await fetchCandidates(entityType, clientId, debouncedSearch)
      setCandidates(mapped)
    } catch (err) {
      toast.error(getErrorDescription(err) || `Failed to search ${entityType.toLowerCase()}s.`)
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }, [clientId, entityType, debouncedSearch])

  useEffect(() => {
    if (!open) return
    setSearch("")
    setDebouncedSearch("")
    setSelected(new Set())
    setCandidates([])
  }, [open, entityType])

  useEffect(() => {
    const timer = globalThis.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => globalThis.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!open) return
    void runSearch()
  }, [open, runSearch])

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function submit() {
    if (!policy || !clientId || selected.size === 0) return
    const add = candidates
      .filter((candidate) => selected.has(candidate.id))
      .map((candidate) => ({
        type: ENTITY_TYPE_TO_BACKEND[entityType],
        entityId: candidate.entityId || candidate.id,
      }))

    setSubmitting(true)
    try {
      await assignPolicy(policy.backendPolicyId || policy.id, {
        clientid: Number(clientId),
        policyId: policy.backendPolicyId || policy.id,
        add,
      })
      toast.success(`${entityType} attached.`)
      onAttached()
      setOpen(false)
    } catch (err) {
      toast.error(getErrorDescription(err) || `Unable to attach ${entityType.toLowerCase()}s.`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled || !policy}>
          <IconPlus className="size-4 mr-1.5" />
          Attach
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <Tabs value={entityType} onValueChange={(value) => setEntityType(value as AccessEntityType)}>
          <div className="p-3 border-b">
            <TabsList className="w-full">
              {ENTITY_TYPES.map((type) => (
                <TabsTrigger key={type} value={type} className="flex-1 text-xs">
                  {type === "User Group" ? "Groups" : `${type}s`}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="p-3 border-b relative">
            <IconSearch className="absolute left-6 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${entityType.toLowerCase()}s…`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="max-h-72 overflow-y-auto px-3 py-2">
            <CandidateList
              loading={loading}
              candidates={candidates}
              attachedIds={attachedIds}
              selected={selected}
              onToggle={toggle}
              searchActive={Boolean(debouncedSearch)}
              entityType={entityType}
            />
          </div>

          <div className="p-3 border-t flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="melp-radius"
              onClick={submit}
              disabled={submitting || selected.size === 0}
            >
              {submitting
                ? <IconLoader2 className="size-4 mr-1.5 animate-spin" />
                : <IconLinkPlus className="size-4 mr-1.5" />}
              Attach{selected.size > 0 ? ` ${selected.size}` : ""}
            </Button>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

type CandidateListProps = {
  loading: boolean
  candidates: PolicyEntity[]
  attachedIds: Set<string>
  selected: Set<string>
  onToggle: (id: string, checked: boolean) => void
  searchActive: boolean
  entityType: AccessEntityType
}

function CandidateList({
  loading,
  candidates,
  attachedIds,
  selected,
  onToggle,
  searchActive,
  entityType,
}: Readonly<CandidateListProps>) {
  if (loading) {
    return (
      <div className="space-y-2 py-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 py-1.5">
            <Skeleton className="size-4 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        {searchActive ? "No results." : `No ${entityType.toLowerCase()}s available.`}
      </p>
    )
  }

  return (
    <div className="divide-y">
      {candidates.map((candidate) => {
        const alreadyAttached = attachedIds.has(candidate.entityId || candidate.id)
        const checked = selected.has(candidate.id)
        return (
          <div key={candidate.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{candidate.name}</p>
              {candidate.secondary && (
                <p className="text-xs text-muted-foreground truncate">{candidate.secondary}</p>
              )}
            </div>
            {alreadyAttached ? (
              <Badge variant="secondary" className="shrink-0 text-xs">Attached</Badge>
            ) : (
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => onToggle(candidate.id, Boolean(value))}
                aria-label={`Select ${candidate.name}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

async function fetchCandidates(
  entityType: AccessEntityType,
  clientId: string,
  search: string,
): Promise<PolicyEntity[]> {
  if (entityType === "User") {
    const raw = await fetchUsers({
      page: 1,
      pageSize: 50,
      clientid: clientId,
      category: 0,
      filters: search
        ? [
            { column: "FULL_NAME", value: search },
            { column: "EMAIL", value: search },
          ]
        : [],
    })
    return raw === null ? [] : mapUsersToEntities(raw)
  }

  if (entityType === "User Group") {
    const raw = await fetchUserGroups({
      page: 1,
      count: 50,
      filters: { clientid: Number(clientId), query: search },
    })
    return raw === null ? [] : mapGroupsToEntities(raw)
  }

  const raw = await fetchDomains(clientId)
  if (raw === null) return []
  const all = mapDomainsToEntities(raw)
  if (!search) return all
  const query = search.toLowerCase()
  return all.filter((entity) =>
    entity.name.toLowerCase().includes(query) ||
    entity.secondary.toLowerCase().includes(query),
  )
}
