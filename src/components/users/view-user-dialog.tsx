import { useEffect, useMemo, useState } from "react"
import {
  IconCircleCheck,
  IconCircleX,
  IconMail,
  IconBuilding,
  IconCalendar,
  IconLinkPlus,
  IconLoader2,
  IconExternalLink,
  IconUsersGroup,
  IconShieldCheck,
  IconArrowRight,
} from "@tabler/icons-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  fetchUserPolicyDetails,
  fetchUserGroups,
  fetchUserGroupMembers,
  fetchUserGroupPolicies,
} from "@/api/admin"
import {
  mapAccessGroupSummary,
  mapPolicySummary,
  normalizeListPayload,
  extractGroupPolicies,
} from "@/components/access-management/runtime"
import type { AccessGroup, AccessPolicy } from "@/components/access-management/types"
import { useAuth } from "@/context/auth-context"
import type { User, UserStatus } from "@/components/users/users-data"
import { useNavigate } from "react-router-dom"

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

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function ShieldIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="40" cy="40" r="40" className="fill-muted/60" />
      <path
        d="M40 16L56 22.4V38C56 47.6 49.12 56.56 40 59.2C30.88 56.56 24 47.6 24 38V22.4L40 16Z"
        className="fill-muted stroke-border"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M34 40l4 4 8-8"
        className="stroke-muted-foreground/40"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="3 3"
      />
    </svg>
  )
}

type PolicyGroup = AccessGroup & { policies: AccessPolicy[] }

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
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("overview")

  const [loadingPolicies, setLoadingPolicies] = useState(false)
  const [policies, setPolicies] = useState<AccessPolicy[]>([])

  const [loadingGroups, setLoadingGroups] = useState(false)
  const [policyGroups, setPolicyGroups] = useState<PolicyGroup[]>([])

  if (!user) return null

  const loadUserPolicies = async () => {
    const lookupId = user.userId || user.id
    if (!lookupId) return
    setLoadingPolicies(true)
    try {
      const raw = await fetchUserPolicyDetails(lookupId)
      const record = (raw ?? {}) as Record<string, unknown>
      const next = Array.isArray(record.policies)
        ? record.policies.map((p) => mapPolicySummary(p))
        : []
      setPolicies(next)
    } catch {
      setPolicies([])
    } finally {
      setLoadingPolicies(false)
    }
  }

  const loadPolicyGroups = async () => {
    if (!selectedClient || !user.melpid) return
    setLoadingGroups(true)
    try {
      const raw = await fetchUserGroups({ count: 200 })
      const allGroups = normalizeListPayload(raw).list.map((item) => mapAccessGroupSummary(item))
      const groupsWithPolicies = allGroups.filter((g) => g.policyAssigned !== false)
      const results: PolicyGroup[] = []
      await Promise.all(
        groupsWithPolicies.map(async (group) => {
          try {
            const membersRaw = await fetchUserGroupMembers(group.id, selectedClient, 1, 200)
            const members = normalizeListPayload(membersRaw).list
            const isMember = members.some((m) => {
              const r = m as Record<string, unknown>
              return r.melpid === user.melpid || r.userId === user.userId || r.userid === user.userId
            })
            if (!isMember) return
            const policiesRaw = await fetchUserGroupPolicies(group.id, selectedClient)
            const groupPolicies = extractGroupPolicies(policiesRaw)
            if (groupPolicies.length === 0) return
            results.push({ ...group, users: [], permissions: groupPolicies, policies: groupPolicies })
          } catch { /* skip */ }
        })
      )
      setPolicyGroups(results)
    } catch {
      setPolicyGroups([])
    } finally {
      setLoadingGroups(false)
    }
  }

  useEffect(() => {
    if (!open || !user) return
    void loadUserPolicies()
    setActiveTab("overview")
    setPolicyGroups([])
  }, [open, user?.id])

  useEffect(() => {
    if (!open || activeTab !== "policies") return
    void loadPolicyGroups()
  }, [open, activeTab])

  const directCount = policies.length
  const groupCount = policyGroups.length
  const totalCount = directCount + groupCount
  const isLoading = loadingPolicies || loadingGroups

  const attachedCountLabel = useMemo(() => `${directCount} direct`, [directCount])

  const statusRing: Record<UserStatus, string> = {
    active: "ring-2 ring-success/50",
    inactive: "ring-2 ring-muted-foreground/30",
    deleted: "ring-2 ring-destructive/40",
  }

  return (
    <Sheet open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-110 w-full flex flex-col gap-0 p-0 overflow-hidden">

        {/* Fixed header */}
        <SheetHeader className="px-5 pt-5 pb-4 shrink-0">
          <SheetTitle className="text-base">User Profile</SheetTitle>
          <SheetDescription className="text-xs">Viewing details for {user.name}</SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <div className="px-5 shrink-0">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
              <TabsTrigger value="policies" className="flex-1 gap-1.5">
                Policies
                {totalCount > 0 && (
                  <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] border-0 bg-primary/10 text-primary">
                    {totalCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ─── Overview ─── */}
          <TabsContent value="overview" className="flex-1 overflow-y-auto px-5 py-4 space-y-4 mt-0">
            <div className="flex items-center gap-3 py-4">
              <div className={`rounded p-0.5 ${statusRing[user.status] ?? ""}`}>
                <Avatar size="lg">
                  {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                  <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </div>
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

            <div className="flex flex-col gap-1">
              <InfoCard icon={<IconMail className="size-4 text-muted-foreground" />} label="Email" value={user.email} />
              <InfoCard icon={<IconBuilding className="size-4 text-muted-foreground" />} label="Department" value={user.department} />
              <InfoCard icon={<IconCalendar className="size-4 text-muted-foreground" />} label="Joined" value={formatDate(user.joinedAt)} />
              <InfoCard
                icon={<IconLinkPlus className="size-4 text-muted-foreground" />}
                label="Policy Coverage"
                value={loadingPolicies ? "Loading…" : attachedCountLabel}
              />
            </div>
          </TabsContent>

          {/* ─── Policies ─── */}
          <TabsContent value="policies" className="flex-1 overflow-y-auto mt-0 flex flex-col min-h-0">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : totalCount === 0 ? (
              /* ── Empty state ── */
              <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
                <ShieldIllustration />
                <div className="space-y-1.5">
                  <p className="font-semibold text-sm">No policies assigned</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {user.name} hasn't been added to any policy groups yet.<br />
                    Go to User Management to assign policies via groups.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 melp-radius"
                  onClick={() => { onClose(); navigate("/users") }}
                >
                  Go to User Management
                  <IconArrowRight className="size-3.5" />
                </Button>
              </div>
            ) : (
              /* ── Policy list ── */
              <div className="flex flex-col flex-1 min-h-0">
                {/* CTA strip */}
                <div className="px-5 pt-4 pb-3 shrink-0">
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5">
                    <p className="text-xs text-muted-foreground">
                      Manage policies from User Management
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 shrink-0 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
                      onClick={() => { onClose(); navigate("/users") }}
                    >
                      Open <IconExternalLink className="size-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
                  {/* Direct policies */}
                  {directCount > 0 && (
                    <section className="space-y-2">
                      <div className="flex items-center gap-2">
                        <IconShieldCheck className="size-3.5 text-muted-foreground" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Direct Policies
                        </p>
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] border-0 ml-auto">
                          {directCount}
                        </Badge>
                      </div>
                      <ul className="space-y-1.5">
                        {policies.map((policy) => (
                          <li
                            key={policy.id}
                            className="flex items-center gap-3 rounded-lg border bg-card px-3.5 py-2.5"
                          >
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/8">
                              <IconShieldCheck className="size-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{policy.name}</p>
                              {policy.description && policy.description !== "-" && (
                                <p className="text-xs text-muted-foreground truncate">{policy.description}</p>
                              )}
                            </div>
                            <Badge variant="secondary" className="h-5 shrink-0 border-0 text-[10px]">
                              {policy.risk}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Policy groups */}
                  {groupCount > 0 && (
                    <section className="space-y-2">
                      <div className="flex items-center gap-2">
                        <IconUsersGroup className="size-3.5 text-muted-foreground" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Via Groups
                        </p>
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] border-0 ml-auto">
                          {groupCount}
                        </Badge>
                      </div>
                      <ul className="space-y-1.5">
                        {policyGroups.map((group) => (
                          <li
                            key={group.id}
                            className="rounded-lg border bg-card px-3.5 py-2.5 space-y-2"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                                <IconUsersGroup className="size-3.5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{group.name}</p>
                                {group.description && (
                                  <p className="text-xs text-muted-foreground truncate">{group.description}</p>
                                )}
                              </div>
                              <Badge variant="secondary" className="h-5 shrink-0 border-0 text-[10px]">
                                {group.policies.length} {group.policies.length === 1 ? "policy" : "policies"}
                              </Badge>
                            </div>
                            <ul className="ml-9 space-y-1 border-l pl-3">
                              {group.policies.map((policy) => (
                                <li key={policy.id} className="flex items-center gap-1.5">
                                  <IconShieldCheck className="size-3 shrink-0 text-muted-foreground/60" />
                                  <span className="text-xs truncate">{policy.name}</span>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
