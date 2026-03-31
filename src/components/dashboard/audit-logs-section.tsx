import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  IconChevronRight,
  IconClipboardList,
  IconLoader2,
  IconShieldCheck,
  IconUser,
  IconUsersGroup,
  IconWorld,
} from "@tabler/icons-react"
import { fetchAuditLogs } from "@/api/admin"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type AuditLogCategory = "user" | "admin" | "group" | "policy" | "domain" | "other"

type AuditLogPreview = {
  id: string
  actionTime: string
  action: string
  user: string
  target: string
  details: string
  category: AuditLogCategory
}

const CATEGORY_MAP: Record<Exclude<AuditLogCategory, "other">, string[]> = {
  user: ["USER_ACTIVATED", "USER_DEACTIVATED", "USER_DELETED", "USER_INVITED", "USER_PASSWORD_RESET"],
  admin: ["ADMIN_ASSIGNED", "ADMIN_CREATED", "ADMIN_DEACTIVATED", "ADMIN_REMOVED"],
  group: ["GROUP_ACTIVATED", "GROUP_ARCHIVED", "MEMBER_ADDED", "MEMBER_REMOVED", "USER_GROUP_CREATED", "USER_GROUP_UPDATED", "USER_GROUP_MEMBER_ADDED", "USER_GROUP_MEMBER_REMOVED", "USER_GROUP_DELETED", "USER_GROUPS_ADDED", "USER_GROUPS_REMOVED"],
  policy: ["POLICY_CREATED", "POLICY_UPDATED", "POLICY_DELETED", "POLICY_ASSIGNED", "POLICY_REVOKED"],
  domain: ["DOMAIN_MERGED", "DOMAIN_UNMERGED"],
}

function classifyAction(action: string): AuditLogCategory {
  for (const [category, actions] of Object.entries(CATEGORY_MAP)) {
    if (actions.includes(action)) return category as AuditLogCategory
  }
  return "other"
}

function formatActionTime(value: unknown): string {
  if (!value) return "-"
  const date = new Date(Number(value) || String(value))
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatActionLabel(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getLogIcon(category: AuditLogCategory) {
  if (category === "user") return IconUser
  if (category === "group") return IconUsersGroup
  if (category === "domain") return IconWorld
  if (category === "admin" || category === "policy") return IconShieldCheck
  return IconClipboardList
}

function normalizeText(value: unknown, fallback = "-"): string {
  if (value == null) return fallback
  if (typeof value === "object") return JSON.stringify(value)
  return typeof value === "string" ? value : String(value as number | boolean)
}

export function AuditLogsSection() {
  const { selectedClient } = useAuth()
  const [logs, setLogs] = useState<AuditLogPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadLogs = useCallback(async () => {
    if (!selectedClient) {
      setLogs([])
      setError("")
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")

    try {
      const result = await fetchAuditLogs({
        clientid: selectedClient,
        page: 1,
        count: 10,
        sortAsc: false,
      })

      const list = (result.list || []) as Record<string, unknown>[]
      const mapped = list.map((log, index) => {
        const action = normalizeText(log.action)
        const targetType = normalizeText(log.targetType, "")
        const targetId = normalizeText(log.targetId, "")
        const target = targetType ? (targetId ? `${targetType} (${targetId})` : targetType) : "-"

        return {
          id: normalizeText(log.id, "") || normalizeText(log.auditId, "") || normalizeText(log.actionTime, "") || String(index),
          actionTime: formatActionTime(log.actionTime),
          action,
          user: normalizeText(log.userFullName, "") || normalizeText(log.email, "") || normalizeText(log.userId, "") || "-",
          target,
          details: normalizeText(log.details),
          category: classifyAction(action),
        }
      })

      setLogs(mapped)
    } catch (err) {
      setError((err as Error).message || "Failed to load audit logs")
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [selectedClient])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
        <CardAction>
          <Link to="/audit-logs" className="flex items-center gap-0.5 text-xs">
            View logs <IconChevronRight className="size-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex min-h-44 items-center justify-center">
            <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={loadLogs}>
              Retry
            </Button>
          </div>
        ) : !selectedClient ? (
          <div className="flex min-h-44 items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">Select a client to view audit logs.</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex min-h-44 items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">No audit logs found yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const Icon = getLogIcon(log.category)
              const meta = [log.user, log.target].filter((value) => value && value !== "-").join(" | ")
              const details = log.details !== "-" ? log.details : ""

              return (
                <div key={log.id} className="flex gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium">{formatActionLabel(log.action)}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{log.actionTime}</span>
                    </div>
                    {meta ? (
                      <p className="truncate text-xs text-muted-foreground" title={meta}>
                        {meta}
                      </p>
                    ) : null}
                    {details ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground" title={details}>
                        {details}
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
