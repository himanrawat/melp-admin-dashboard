import type {
  AccessEntityType,
  AccessFeature,
  AccessGroup,
  AccessModule,
  AccessPolicy,
  AccessUser,
  PolicyEntity,
} from "@/components/access-management/types"
import type { StatusStateCode } from "@/components/shared/status-state"

type RecordLike = Record<string, unknown>

type ListPayload = {
  list: RecordLike[]
  totalCount: number
  pageCount: number
  pageSize: number
}

const accessDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
})

function asRecord(value: unknown): RecordLike | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as RecordLike
}

function unwrapPolicyRecord(value: unknown): RecordLike | null {
  const root = asRecord(value)
  if (!root) return null

  const candidates: Array<RecordLike | null> = [
    root,
    asRecord(root.data),
    asRecord(asRecord(root.data)?.data),
    asRecord(root.serviceResp),
    asRecord(asRecord(root.serviceResp)?.data),
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    const hasPolicyFields =
      "policyName" in candidate ||
      "policyname" in candidate ||
      "pkid" in candidate ||
      "policyId" in candidate ||
      "policyid" in candidate ||
      Array.isArray(candidate.modules) ||
      Array.isArray(candidate.entities)

    if (hasPolicyFields) return candidate
  }

  return root
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim() || fallback
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return fallback
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1
  if (typeof value === "string") {
    return ["true", "1", "yes", "active", "enabled"].includes(value.toLowerCase())
  }
  return false
}

function toTitleCase(value: string): string {
  if (!value) return ""
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function normalizeUserStatus(value: unknown): string {
  const raw = asString(value).trim()
  if (!raw) return "Active"

  const upper = raw.toUpperCase()
  if (upper === "Y" || upper === "1" || upper === "TRUE" || upper === "ACTIVE") {
    return "Active"
  }
  if (upper === "N" || upper === "0" || upper === "FALSE" || upper === "INACTIVE") {
    return "Inactive"
  }
  if (upper === "DELETED") return "Deleted"

  return toTitleCase(raw)
}

function toValidDate(value: number | string): Date | null {
  const candidate = new Date(value)
  return Number.isNaN(candidate.getTime()) ? null : candidate
}

function toUnixTimestampDate(value: number, isMilliseconds: boolean): Date | null {
  const normalized = isMilliseconds ? value : value * 1000
  return toValidDate(normalized)
}

function parseAccessDate(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return toUnixTimestampDate(value, value > 1_000_000_000_000)
  }

  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (/^\d+$/.test(trimmed)) {
    return toUnixTimestampDate(Number(trimmed), trimmed.length > 10)
  }

  return toValidDate(trimmed)
}

export function formatAccessDate(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-"

  const date = parseAccessDate(value)

  if (!date) return asString(value, "-")

  return accessDateFormatter.format(date)
}

export function normalizeListPayload(raw: unknown): ListPayload {
  if (Array.isArray(raw)) {
    return {
      list: raw.filter((item): item is RecordLike => Boolean(asRecord(item))),
      totalCount: raw.length,
      pageCount: raw.length > 0 ? 1 : 0,
      pageSize: raw.length,
    }
  }

  const root = asRecord(raw)
  if (!root) {
    return { list: [], totalCount: 0, pageCount: 0, pageSize: 0 }
  }

  const candidates: Array<RecordLike | null> = [
    root,
    asRecord(root.data),
    asRecord(asRecord(root.data)?.data),
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    const list = candidate.list
    if (Array.isArray(list)) {
      return {
        list: list.filter((item): item is RecordLike => Boolean(asRecord(item))),
        totalCount: asNumber(candidate.totalCount, list.length),
        pageCount: asNumber(candidate.pageCount, list.length > 0 ? 1 : 0),
        pageSize: asNumber(candidate.pageSize, list.length),
      }
    }
  }

  const directData = root.data
  if (Array.isArray(directData)) {
    return {
      list: directData.filter((item): item is RecordLike => Boolean(asRecord(item))),
      totalCount: directData.length,
      pageCount: directData.length > 0 ? 1 : 0,
      pageSize: directData.length,
    }
  }

  return { list: [], totalCount: 0, pageCount: 0, pageSize: 0 }
}

function inferEntityType(value: unknown): AccessEntityType {
  const raw = asString(value).toUpperCase()
  if (raw === "USER" || raw === "USERS") return "User"
  if (raw === "USER_GROUP" || raw === "GROUP" || raw === "USER GROUP") return "User Group"
  return "Domain"
}

function inferModuleScope(name: string): AccessModule["scope"] {
  const normalized = name.toLowerCase()
  if (normalized.includes("security") || normalized.includes("audit")) return "Security"
  if (normalized.includes("record") || normalized.includes("file")) return "Records"
  if (normalized.includes("user") || normalized.includes("people") || normalized.includes("group")) return "People"
  return "Workspace"
}

function inferRisk(name: string, modules: AccessModule[]): AccessPolicy["risk"] {
  const normalized = `${name} ${modules.map((module) => module.name).join(" ")}`.toLowerCase()
  if (normalized.includes("security") || normalized.includes("audit") || normalized.includes("compliance")) {
    return "Sensitive"
  }
  if (normalized.includes("core") || normalized.includes("admin") || normalized.includes("domain")) {
    return "Core"
  }
  return "Operational"
}

function normalizeFeatureLimit(value: unknown): AccessFeature["limit"] {
  const numeric = asNumber(value, 1)
  if (numeric === 1) return "Allow"
  if (numeric === 0) return "Deny"
  return "Conditional"
}

export function mapAccessFeature(raw: unknown): AccessFeature {
  const record = asRecord(raw) ?? {}
  const name = asString(record.feature || record.name, "Unnamed feature")

  return {
    id: asString(record.featureid || record.id, name),
    backendFeatureId: asString(record.featureid || record.id, name),
    name,
    description: asString(record.description, name),
    limit: normalizeFeatureLimit(record.limit),
    enabled: record.enable === undefined ? true : asBoolean(record.enable),
  }
}

export function mapAccessModule(raw: unknown): AccessModule {
  const record = asRecord(raw) ?? {}
  const name = asString(record.name || record.module, "Unnamed module")
  let rawFeatures: unknown[] = []
  if (Array.isArray(record.features)) {
    rawFeatures = record.features
  } else if (Array.isArray(record.permissions)) {
    rawFeatures = record.permissions
  }
  const features = rawFeatures.map((feature) => mapAccessFeature(feature))

  return {
    id: asString(record.id || record.module || record.name, name),
    backendName: name,
    name,
    description: asString(record.description, `Manage ${name} permissions.`),
    scope: inferModuleScope(name),
    features,
  }
}

export function mapFeatureLibrary(raw: unknown): AccessModule[] {
  const grouped = new Map<string, RecordLike[]>()

  normalizeListPayload(raw).list.forEach((item) => {
    const moduleName = asString(item.module || item.name, "General")
    const existing = grouped.get(moduleName) ?? []
    existing.push(item)
    grouped.set(moduleName, existing)
  })

  return Array.from(grouped.entries()).map(([name, features], index) =>
    mapAccessModule({
      id: `${name}-${index}`,
      name,
      description: `Manage ${name} permissions.`,
      features: features.map((feature) => ({
        featureid: asString(feature.featureid || feature.id),
        feature: asString(feature.feature || feature.name, "Unnamed feature"),
        description: asString(feature.description),
        limit: 1,
        enable: true,
      })),
    }),
  )
}

export function mapAccessUser(raw: unknown): AccessUser {
  const record = asRecord(raw) ?? {}
  const user = asRecord(record.user) ?? record
  const name = asString(
    user.fullname || user.fullName || user.name || user.userName || record.fullName,
    "Unknown user",
  )
  const melpid = asString(user.melpid || user.melpId || record.melpid || record.melpId)
  const userId = asString(user.userId || user.userid || record.userId || record.userid)

  return {
    id: asString(userId || melpid, name),
    userId,
    melpid,
    name,
    email: asString(user.email || record.email),
    title: asString(
      user.expertise ||
        user.professionName ||
        user.profession ||
        user.title ||
        user.workingas ||
        record.expertise ||
        record.professionName ||
        record.profession ||
        record.title ||
        record.workingas,
      "-",
    ),
    team: asString(
      user.departmentName ||
        user.department ||
        user.team ||
        user.location ||
        record.departmentName ||
        record.department ||
        record.team ||
        record.location,
      "-",
    ),
    status: normalizeUserStatus(user.status || record.status || user.isActive),
  }
}

export function mapUsersToEntities(raw: unknown): PolicyEntity[] {
  return normalizeListPayload(raw).list.map((item) => {
    const user = mapAccessUser(item)
    return {
      id: user.userId || user.id,
      entityId: user.userId || user.id,
      name: user.name,
      type: "User",
      secondary: user.email || user.title || "User",
      attachedAt: "Available",
    }
  })
}

export function mapGroupsToEntities(raw: unknown): PolicyEntity[] {
  return normalizeListPayload(raw).list.map((item) => {
    const group = mapAccessGroupSummary(item)
    return {
      id: group.id,
      entityId: group.id,
      name: group.name,
      type: "User Group",
      secondary: `${group.memberCount ?? group.users.length} members`,
      attachedAt: "Available",
    }
  })
}

export function mapDomainsToEntities(raw: unknown): PolicyEntity[] {
  return normalizeListPayload(raw).list.map((item, index) => {
    const record = asRecord(item) ?? {}
    const clientId = asString(record.client_id || record.clientid || record.domainid || record.id, `domain-${index}`)
    const domainName = asString(record.client_name || record.domain || record.website || record.domainname, clientId)
    const host = asString(record.domain || record.website || record.domainname, domainName)

    return {
      id: clientId,
      entityId: clientId,
      name: domainName,
      type: "Domain",
      secondary: host,
      attachedAt: "Available",
    }
  })
}

export function mapPolicyEntity(raw: unknown): PolicyEntity {
  const record = asRecord(raw) ?? {}
  return {
    id: asString(record.pkid || record.activeId || record.id || record.entityId || record.policyId, "entity"),
    activeId: asString(record.pkid || record.activeId || record.id || record.entityId || record.policyId),
    entityId: asString(record.entityId || record.pkid || record.id || record.policyId),
    name: asString(record.entityName || record.name || record.policyName, "Unknown entity"),
    type: inferEntityType(record.type),
    secondary: asString(record.secondary || record.policyDesc || record.desc || record.email || record.entityName, "-"),
    attachedAt: formatAccessDate(record.createdAt || record.attachedAt || record.lastUpdate),
  }
}

export function mapPolicySummary(raw: unknown): AccessPolicy {
  const record = unwrapPolicyRecord(raw) ?? {}
  const modules = Array.isArray(record.modules) ? record.modules.map((module) => mapAccessModule(module)) : []
  const entities = Array.isArray(record.entities) ? record.entities.map((entity) => mapPolicyEntity(entity)) : []
  const name = asString(record.policyName || record.policyname || record.name, "Untitled Policy")
  const pkid = asString(record.pkid || record.id)
  const policyApiId = asString(record.policyId || record.policyid)
  const backendPolicyId = asString(pkid || policyApiId, name)
  const uiPolicyId = asString(policyApiId || pkid, name)

  return {
    id: uiPolicyId,
    backendPolicyId,
    policyApiId: policyApiId || undefined,
    pkid: pkid || undefined,
    name,
    description: asString(record.desc || record.policyDesc || record.description, "-"),
    createdAt: formatAccessDate(record.createdAt || record.createDate || record.creationTime),
    risk: inferRisk(name, modules),
    modules,
    entities,
    moduleCount: modules.length || asNumber(record.moduleCount || record.modulesCount),
    entityCount: entities.length || asNumber(record.assignedCount || record.entityCount || record.totalCount),
    contextLabel: asString(record.entityName || record.type),
  }
}

export function mapPolicyDetail(raw: unknown): AccessPolicy | null {
  const record = unwrapPolicyRecord(raw)
  if (!record) return null
  const summary = mapPolicySummary(record)

  return {
    ...summary,
    modules: Array.isArray(record.modules) ? record.modules.map((module) => mapAccessModule(module)) : summary.modules,
    entities: Array.isArray(record.entities) ? record.entities.map((entity) => mapPolicyEntity(entity)) : summary.entities,
    moduleCount: Array.isArray(record.modules) ? record.modules.length : summary.moduleCount,
    entityCount: Array.isArray(record.entities) ? record.entities.length : summary.entityCount,
  }
}

export function mapAccessGroupSummary(raw: unknown): AccessGroup {
  const record = asRecord(raw) ?? {}
  return {
    id: asString(record.groupid || record.groupId || record.id, "group"),
    name: asString(record.groupName || record.groupname || record.name, "Untitled Group"),
    description: asString(record.description || record.desc, ""),
    createdAt: formatAccessDate(record.createDate || record.createdAt || record.creationTime),
    owners: [],
    users: [],
    permissions: [],
    memberCount: asNumber(record.memberCount || record.totalMembers),
    policyAssigned: record.policyAssigned === undefined ? undefined : asBoolean(record.policyAssigned),
  }
}

export function mapAccessGroupDetail(raw: unknown): AccessGroup | null {
  const record = asRecord(raw)
  if (!record) return null
  const summary = mapAccessGroupSummary(record)
  const users = Array.isArray(record.users) ? record.users.map((user) => mapAccessUser(user)) : []

  return {
    ...summary,
    users,
    memberCount: asNumber(record.memberCount, users.length || summary.memberCount || 0),
  }
}

export function extractGroupMembers(raw: unknown): { members: AccessUser[]; group?: AccessGroup | null } {
  const detail = mapAccessGroupDetail(raw)
  if (detail && detail.users.length > 0) {
    return { members: detail.users, group: detail }
  }

  return {
    members: normalizeListPayload(raw).list.map((item) => mapAccessUser(item)),
    group: detail,
  }
}

export function extractGroupPolicies(raw: unknown): AccessPolicy[] {
  if (typeof raw === "string") return []
  const record = asRecord(raw)
  if (record && Array.isArray(record.policLIST)) {
    return record.policLIST.map((item) => mapPolicySummary(item))
  }
  return normalizeListPayload(raw).list.map((item) => mapPolicySummary(item))
}

export function mapDomainPolicySummary(raw: unknown): AccessPolicy {
  const summary = mapPolicySummary(raw)
  return {
    ...summary,
    description: summary.description === "-" ? asString(asRecord(raw)?.policyDesc, "-") : summary.description,
    contextLabel: asString(asRecord(raw)?.entityName, summary.contextLabel || "Current Domain"),
  }
}

export function getStatusCodeFromError(error: unknown): StatusStateCode | undefined {
  const status = asNumber(asRecord(error)?.status)
  if ([204, 400, 401, 403, 404, 409, 500].includes(status)) {
    return status as StatusStateCode
  }
  return undefined
}

export function getErrorDescription(error: unknown): string | undefined {
  const record = asRecord(error)
  const body = asRecord(record?.body)
  return (
    asString(body?.message) ||
    asString(body?.reason) ||
    asString(record?.message) ||
    undefined
  )
}
