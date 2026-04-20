import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  IconDots,
  IconPencil,
  IconPlus,
  IconSearch,
  IconShieldLock,
  IconTrash,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import {
  deletePolicies,
  fetchPolicies,
} from "@/api/admin"
import {
  getErrorDescription,
  mapPolicySummary,
  normalizeListPayload,
} from "@/components/access-management/runtime"
import type { AccessPolicy } from "@/components/access-management/types"
import { usePopup } from "@/components/shared/popup"
import { useAuth } from "@/context/auth-context"

import { RiskBadge } from "@/components/access-policies/risk-badge"

const DEFAULT_PAGE_SIZE = 10

type BuildColumnsArgs = {
  onEdit: (policy: AccessPolicy) => void
  onDelete: (policy: AccessPolicy) => void
}

function buildColumns({ onEdit, onDelete }: BuildColumnsArgs): ColumnDef<AccessPolicy>[] {
  return [
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
            <p className="font-medium truncate max-w-64" title={policy.name}>{policy.name}</p>
            <p className="text-xs text-muted-foreground truncate max-w-64">{policy.description}</p>
          </div>
        </div>
      ),
      minWidth: "260px",
    },
    {
      id: "risk",
      header: "Risk",
      accessor: (policy) => <RiskBadge risk={policy.risk} />,
      minWidth: "120px",
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
      header: "Attached",
      accessor: (policy) => (
        <Badge variant="secondary" className="border-0">
          {policy.entityCount ?? policy.entities.length}
        </Badge>
      ),
      minWidth: "100px",
    },
    { id: "createdAt", header: "Created", accessor: "createdAt", minWidth: "110px" },
    {
      id: "actions",
      header: "",
      align: "right",
      accessor: (policy) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={(event) => event.stopPropagation()}
              aria-label={`Actions for ${policy.name}`}
            >
              <IconDots className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem onClick={() => onEdit(policy)}>
              <IconPencil className="size-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(policy)}>
              <IconTrash className="size-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      minWidth: "60px",
    },
  ]
}

export function AccessPoliciesPage() {
  const navigate = useNavigate()
  const { selectedClient } = useAuth()
  const { danger } = usePopup()

  const [policies, setPolicies] = useState<AccessPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [serverPage, setServerPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)

  const loadPolicies = useCallback(async () => {
    if (!selectedClient) {
      setPolicies([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")
    try {
      const raw = await fetchPolicies({
        clientid: selectedClient,
        count: pageSize,
        page: serverPage + 1,
        search: debouncedSearch,
      })
      if (raw === null) {
        setPolicies([])
        setTotalCount(0)
        return
      }
      const payload = normalizeListPayload(raw)
      setPolicies(payload.list.map((item) => mapPolicySummary(item)))
      setTotalCount(Number(payload.totalCount || payload.list.length))
    } catch (err) {
      console.error("[AccessPoliciesPage] load failed:", err)
      setError("Something went wrong while loading policies. Please try again.")
      setPolicies([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, pageSize, selectedClient, serverPage])

  useEffect(() => {
    const timer = globalThis.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => globalThis.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setServerPage(0)
  }, [debouncedSearch, selectedClient])

  useEffect(() => {
    void loadPolicies()
  }, [loadPolicies])

  function handleDelete(policy: AccessPolicy) {
    if (!selectedClient) return
    danger(
      "Delete Policy",
      `"${policy.name}" will be permanently removed. This cannot be undone.`,
      async () => {
        try {
          await deletePolicies([policy.backendPolicyId || policy.id], selectedClient)
          toast.success("Policy deleted.")
          await loadPolicies()
        } catch (err) {
          toast.error(getErrorDescription(err) || "Unable to delete this policy right now.")
        }
      },
    )
  }

  function handleEdit(policy: AccessPolicy) {
    navigate(`/access/policies/${policy.backendPolicyId || policy.id}/edit`)
  }

  const columns = buildColumns({ onEdit: handleEdit, onDelete: handleDelete })

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={loadPolicies}>Retry</Button>
      </div>
    )
  }

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize) || 1)
  const hasNoPolicies = !loading && policies.length === 0 && !debouncedSearch

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Policies</h1>
          <p className="text-sm text-muted-foreground">
            Manage permission policies and attach them to users, groups, or domains.
          </p>
        </div>
        <Button size="sm" className="melp-radius" onClick={() => navigate("/access/policies/new")}>
          <IconPlus className="size-4 mr-1.5" />
          New Policy
        </Button>
      </header>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-72">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search policies…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {hasNoPolicies ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><IconShieldLock /></EmptyMedia>
            <EmptyTitle>No policies yet</EmptyTitle>
            <EmptyDescription>
              Create your first policy to start granting access.
            </EmptyDescription>
          </EmptyHeader>
          <Button size="sm" className="melp-radius" onClick={() => navigate("/access/policies/new")}>
            <IconPlus className="size-4 mr-1.5" />
            Create policy
          </Button>
        </Empty>
      ) : (
        <DataTable<AccessPolicy>
          columns={columns}
          data={policies}
          rowKey={(policy) => policy.id}
          onRowClick={(policy) => navigate(`/access/policies/${policy.backendPolicyId || policy.id}`)}
          loading={loading}
          loadingRows={8}
          emptyState={<span>No policies match this search.</span>}
          paginated
          page={serverPage}
          pageCount={pageCount}
          totalRows={totalCount}
          pageSize={pageSize}
          onPageChange={setServerPage}
          onPageSizeChange={setPageSize}
        />
      )}

    </div>
  )
}
