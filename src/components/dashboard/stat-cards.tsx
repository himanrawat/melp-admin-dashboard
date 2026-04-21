import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  IconLoader2,
  IconUsers,
  IconUsersGroup,
  IconWorld,
} from "@tabler/icons-react"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  fetchArchivedTeamGroups,
  fetchDomains,
  fetchGroups,
  fetchTeams,
  fetchUsers,
} from "@/api/admin"
import { useAuth } from "@/context/auth-context"

type DashboardStats = {
  users: {
    total: number
    active: number
    inactive: number
  }
  teamGroups: {
    teams: number
    groups: number
    archived: number
  }
  domains: {
    total: number
    verified: number
    totalUsers: number
    avgPerDomain: number
  }
}

type DomainStatus = "verified" | "failed" | "pending"

const EMPTY_STATS: DashboardStats = {
  users: {
    total: 0,
    active: 0,
    inactive: 0,
  },
  teamGroups: {
    teams: 0,
    groups: 0,
    archived: 0,
  },
  domains: {
    total: 0,
    verified: 0,
    totalUsers: 0,
    avgPerDomain: 0,
  },
}

function extractList(value: unknown): unknown[] {
  const obj = value as Record<string, unknown> | null
  const data = obj?.data

  if (Array.isArray(value)) return value
  if (Array.isArray(obj?.list)) return obj.list
  if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray((data as Record<string, unknown>).list)) {
    return (data as Record<string, unknown>).list as unknown[]
  }
  if (Array.isArray(data)) return data

  return []
}

function extractTotalCount(value: unknown): number | undefined {
  const obj = value as Record<string, unknown> | null
  const direct = obj?.totalCount
  if (typeof direct === "number" && Number.isFinite(direct)) return direct

  const data = obj?.data
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = (data as Record<string, unknown>).totalCount
    if (typeof nested === "number" && Number.isFinite(nested)) return nested
  }

  return undefined
}

async function countPagedResults(
  fetchPage: (page: number, pageSize: number) => Promise<unknown>,
): Promise<number> {
  // Probe with a single record — the API returns totalCount in the envelope
  // so we don't need to download a full page of data just to get the count.
  const probe = await fetchPage(1, 1)
  const totalCount = extractTotalCount(probe)
  if (typeof totalCount === "number") return totalCount

  // Fallback: full pagination when totalCount is absent from the response.
  const pageSize = 200
  let page = 1
  let total = 0
  while (true) {
    const result = await fetchPage(page, pageSize)
    const tc = extractTotalCount(result)
    if (typeof tc === "number") return tc
    const list = extractList(result)
    total += list.length
    if (list.length < pageSize) return total
    page += 1
  }
}

function getDomainStatus(record: Record<string, unknown>): DomainStatus {
  if (
    record.verified === true ||
    record.isverified === true ||
    record.status === "verified"
  ) {
    return "verified"
  }

  if (record.status === "failed") {
    return "failed"
  }

  return "pending"
}

function normalizeDomain(record: Record<string, unknown>) {
  return {
    status: getDomainStatus(record),
    users: Number(record.activeUsers || record.usercount || record.users || 0),
  }
}

function formatMetric(value: number): string {
  return value.toLocaleString()
}

function LoadingCardAction() {
  return <IconLoader2 className="size-3.5 animate-spin text-muted-foreground" />
}

function RetryCardAction({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="text-xs font-medium text-destructive hover:underline"
    >
      Retry
    </button>
  )
}

function LabelCardAction({ content }: Readonly<{ content: string }>) {
  return <div className="text-xs font-medium text-muted-foreground">{content}</div>
}

export function StatCards() {
  const { selectedClient } = useAuth()
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadStats = useCallback(async () => {
    if (!selectedClient) {
      setStats(EMPTY_STATS)
      setError("")
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")

    try {
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        activeTeams,
        archivedTeams,
        activeGroups,
        archivedGroups,
        domainsResult,
      ] = await Promise.all([
        countPagedResults((page, pageSize) => fetchUsers({ page, pageSize, clientid: selectedClient, category: 0 })),
        countPagedResults((page, pageSize) => fetchUsers({ page, pageSize, clientid: selectedClient, category: 1 })),
        countPagedResults((page, pageSize) => fetchUsers({ page, pageSize, clientid: selectedClient, category: 2 })),
        countPagedResults((page, pageSize) => fetchTeams({ page, pageSize, clientid: selectedClient, isActive: 1 })),
        countPagedResults((page, pageSize) => fetchArchivedTeamGroups({ groupType: 0, page, pageSize, clientid: selectedClient })),
        countPagedResults((page, pageSize) => fetchGroups({ page, pageSize, clientid: selectedClient, isActive: 1 })),
        countPagedResults((page, pageSize) => fetchArchivedTeamGroups({ groupType: 1, page, pageSize, clientid: selectedClient })),
        fetchDomains(selectedClient),
      ])

      const rawDomains = extractList(domainsResult) as Record<string, unknown>[]
      const domains = rawDomains.map(normalizeDomain)
      const verifiedDomains = domains.filter((domain) => domain.status === "verified").length
      const totalDomainUsers = domains.reduce((sum, domain) => sum + domain.users, 0)
      const avgPerDomain = domains.length > 0 ? Math.round(totalDomainUsers / domains.length) : 0

      setStats({
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
        },
        teamGroups: {
          teams: activeTeams + archivedTeams,
          groups: activeGroups + archivedGroups,
          archived: archivedTeams + archivedGroups,
        },
        domains: {
          total: domains.length,
          verified: verifiedDomains,
          totalUsers: totalDomainUsers,
          avgPerDomain,
        },
      })
    } catch (err) {
      console.error("[StatCards] load failed:", err)
      setError("Something went wrong while loading stats. Please try again.")
      setStats(EMPTY_STATS)
    } finally {
      setLoading(false)
    }
  }, [selectedClient])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  const usersActiveRate =
    stats.users.total > 0 ? `${Math.round((stats.users.active / stats.users.total) * 100)}% active` : "No users"
  const archivedGroupsLabel =
    stats.teamGroups.archived > 0 ? `${stats.teamGroups.archived.toLocaleString()} archived` : "All active"
  const verifiedDomainsLabel =
    stats.domains.total > 0 ? `${stats.domains.verified.toLocaleString()} verified` : "No domains"
  const getMetricText = (value: number) => (loading ? "..." : formatMetric(value))
  const renderCardAction = (content: string) => {
    if (loading) {
      return <LoadingCardAction />
    }

    if (error) {
      return <RetryCardAction onRetry={loadStats} />
    }

    return <LabelCardAction content={content} />
  }

  return (
    <>
      {/* Card 1 — Users */}
      <Card className="flex flex-col py-4">
        <CardHeader>
          <div className="flex items-center justify-center size-8 rounded-lg bg-secondary">
            <IconUsers className="size-4 text-muted-foreground" />
          </div>
          <CardAction>
            {renderCardAction(usersActiveRate)}
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 flex-1">
          <CardTitle className="text-2xl font-bold">{getMetricText(stats.users.total)}</CardTitle>
          <p className="text-xs text-muted-foreground -mt-2">Total Users</p>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm font-semibold">{getMetricText(stats.users.active)}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div>
              <p className="text-sm font-semibold">{getMetricText(stats.users.inactive)}</p>
              <p className="text-xs text-muted-foreground">Inactive</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="">
          <Button asChild size="sm" variant="outline" className="melp-radius w-full cursor-pointer">
            <Link to="/users">View all users</Link>
          </Button>
        </CardFooter>
      </Card>

      {/* Card 2 — Teams & Groups */}
      <Card className="flex flex-col py-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-secondary">
              <IconUsersGroup className="size-4 text-muted-foreground" />
            </div>
          </div>
          <CardAction>
            {renderCardAction(archivedGroupsLabel)}
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 flex-1">
          <CardTitle className="text-2xl font-bold">
            {getMetricText(stats.teamGroups.teams + stats.teamGroups.groups)}
          </CardTitle>
          <p className="text-xs text-muted-foreground -mt-2">Teams & Groups</p>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm font-semibold">{getMetricText(stats.teamGroups.teams)}</p>
              <p className="text-xs text-muted-foreground">Teams</p>
            </div>
            <div>
              <p className="text-sm font-semibold">{getMetricText(stats.teamGroups.groups)}</p>
              <p className="text-xs text-muted-foreground">Groups</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className=" gap-2">
          <Button asChild size="sm" variant="outline" className="melp-radius cursor-pointer flex-1">
            <Link to="/teams">View Teams</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1 cursor-pointer">
            <Link to="/groups">View Groups</Link>
          </Button>
        </CardFooter>
      </Card>

      {/* Card 3 — Domains */}
      <Card className="flex flex-col py-4">
        <CardHeader>
          <div className="flex items-center justify-center size-8 rounded-lg bg-secondary">
            <IconWorld className="size-4 text-muted-foreground" />
          </div>
          <CardAction>
            {renderCardAction(verifiedDomainsLabel)}
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 flex-1">
          <CardTitle className="text-2xl font-bold">{getMetricText(stats.domains.total)}</CardTitle>
          <p className="text-xs text-muted-foreground -mt-2">Domains</p>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm font-semibold">{getMetricText(stats.domains.totalUsers)}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
            <div>
              <p className="text-sm font-semibold">{getMetricText(stats.domains.avgPerDomain)}</p>
              <p className="text-xs text-muted-foreground">Avg / Domain</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="">
          <Button asChild size="sm" variant="outline" className="melp-radius w-full cursor-pointer">
            <Link to="/domains">Manage domains</Link>
          </Button>
        </CardFooter>
      </Card>
    </>
  )
}
