import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  IconArrowLeft,
  IconChevronRight,
  IconEdit,
  IconLoader2,
  IconPlus,
  IconSearch,
  IconShieldLock,
  IconTrash,
  IconUserPlus,
  IconUsers,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"

import {
  addUserGroupMembers,
  assignMultiplePolicies,
  createUserGroup,
  deleteUserGroups,
  fetchPolicies,
  fetchPolicyById,
  fetchUserGroupById,
  fetchUserGroupMembers,
  fetchUserGroupPolicies,
  fetchUserGroups,
  fetchUsers,
  removeMultiplePolicies,
  removeUserGroupMembers,
  updateUserGroup,
} from "@/api/admin"
import {
  extractGroupMembers,
  extractGroupPolicies,
  getErrorDescription,
  getStatusCodeFromError,
  mapAccessGroupDetail,
  mapAccessGroupSummary,
  mapAccessUser,
  mapPolicyDetail,
  mapPolicySummary,
  normalizeListPayload,
} from "@/components/access-management/runtime"
import type {
  AccessGroup,
  AccessModule,
  AccessPolicy,
  AccessUser,
  PolicyEntity,
} from "@/components/access-management/types"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { popupApi } from "@/components/shared/popup"
import {
  StatusState,
  StatusStateActions,
  type StatusStateCode,
} from "@/components/shared/status-state"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/context/auth-context"

type GroupView = "list" | "editor" | "detail" | "attach" | "policy-detail"

type DraftGroup = {
  name: string
  description: string
  members: AccessUser[]
  policies: AccessPolicy[]
}

type EditorBaseline = {
  members: AccessUser[]
  policies: AccessPolicy[]
}

function createEmptyDraftGroup(): DraftGroup {
  return { name: "", description: "", members: [], policies: [] }
}

function keyForUser(user: AccessUser): string { return user.userId || user.id }
function keyForPolicy(policy: AccessPolicy): string { return policy.id }
function getUserIdForCreate(user: AccessUser): string { return user.userId || user.id }
function getParticipantId(user: AccessUser): string { return user.melpid || user.userId || user.id }

function validateGroupName(name: string): string | false {
  if (name.length < 3 || name.length > 50) return "Group name must be between 3 and 50 characters."
  if (!/^[a-zA-Z0-9 ]+$/.test(name)) return "Group name can only contain letters, numbers, and spaces."
  return false
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"
}

export function AccessGroupsPage() {
  const { selectedClient } = useAuth()
  const navigate = useNavigate()

  const [view, setView] = useState<GroupView>("list")
  const [groupSearch, setGroupSearch] = useState("")
  const [attachSearch, setAttachSearch] = useState("")
  const [memberSearch, setMemberSearch] = useState("")
  const [policySearch, setPolicySearch] = useState("")
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [userDialogSearch, setUserDialogSearch] = useState("")
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create")
  const [draft, setDraft] = useState<DraftGroup>(createEmptyDraftGroup)
  const [baseline, setBaseline] = useState<EditorBaseline | null>(null)

  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupsStatusCode, setGroupsStatusCode] = useState<StatusStateCode | undefined>()
  const [groupsStatusMessage, setGroupsStatusMessage] = useState<string | undefined>()
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(new Set())

  const [selectedGroup, setSelectedGroup] = useState<AccessGroup | null>(null)
  const [groupMembers, setGroupMembers] = useState<AccessUser[]>([])
  const [groupPolicies, setGroupPolicies] = useState<AccessPolicy[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailStatusCode, setDetailStatusCode] = useState<StatusStateCode | undefined>()
  const [detailStatusMessage, setDetailStatusMessage] = useState<string | undefined>()
  const [selectedMemberKeys, setSelectedMemberKeys] = useState<Set<string>>(new Set())
  const [selectedPolicyKeys, setSelectedPolicyKeys] = useState<Set<string>>(new Set())

  const [attachablePolicies, setAttachablePolicies] = useState<AccessPolicy[]>([])
  const [attachLoading, setAttachLoading] = useState(false)
  const [attachStatusCode, setAttachStatusCode] = useState<StatusStateCode | undefined>()
  const [attachStatusMessage, setAttachStatusMessage] = useState<string | undefined>()
  const [selectedAttachPolicyKeys, setSelectedAttachPolicyKeys] = useState<Set<string>>(new Set())

  const [userCandidates, setUserCandidates] = useState<AccessUser[]>([])
  const [userCandidatesLoading, setUserCandidatesLoading] = useState(false)
  const [userCandidatesStatusCode, setUserCandidatesStatusCode] = useState<StatusStateCode | undefined>()
  const [userCandidatesStatusMessage, setUserCandidatesStatusMessage] = useState<string | undefined>()
  const [selectedUserCandidateKeys, setSelectedUserCandidateKeys] = useState<Set<string>>(new Set())

  const [selectedPolicyDetail, setSelectedPolicyDetail] = useState<AccessPolicy | null>(null)
  const [policyDetailLoading, setPolicyDetailLoading] = useState(false)
  const [policyDetailStatusCode, setPolicyDetailStatusCode] = useState<StatusStateCode | undefined>()
  const [policyDetailStatusMessage, setPolicyDetailStatusMessage] = useState<string | undefined>()

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameDraftName, setRenameDraftName] = useState("")

  // ── Derived ────────────────────────────────────────────────────

  const filteredGroupMembers = groupMembers.filter((member) => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) return true
    return member.name.toLowerCase().includes(q) || member.email.toLowerCase().includes(q) || member.title.toLowerCase().includes(q)
  })

  const filteredGroupPolicies = groupPolicies.filter((policy) => {
    const q = policySearch.trim().toLowerCase()
    if (!q) return true
    return policy.name.toLowerCase().includes(q) || policy.description.toLowerCase().includes(q)
  })

  // ── Column definitions ─────────────────────────────────────────

  const groupColumns: ColumnDef<AccessGroup>[] = [
    {
      id: "name",
      header: "Group",
      sticky: true,
      accessor: (group) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-secondary shrink-0">
            <IconUsers className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate max-w-48" title={group.name}>{group.name}</p>
            {group.description && (
              <p className="text-xs text-muted-foreground truncate max-w-48">{group.description}</p>
            )}
          </div>
        </div>
      ),
      minWidth: "240px",
    },
    {
      id: "users",
      header: "Members",
      accessor: (group) => (
        <Badge variant="secondary" className="border-0">
          {group.memberCount ?? group.users.length}
        </Badge>
      ),
      minWidth: "100px",
    },
    {
      id: "permissions",
      header: "Policies",
      accessor: (group) => (
        <Badge variant="secondary" className="border-0">
          {group.policyAssigned ? "Assigned" : "None"}
        </Badge>
      ),
      minWidth: "100px",
    },
    { id: "createdAt", header: "Created", accessor: "createdAt", minWidth: "120px" },
    {
      id: "arrow",
      header: "",
      align: "right",
      accessor: () => <IconChevronRight className="size-4 text-muted-foreground" />,
      minWidth: "48px",
    },
  ]

  const memberColumns: ColumnDef<AccessUser>[] = [
    {
      id: "name",
      header: "Name",
      sticky: true,
      accessor: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8 shrink-0 rounded-lg">
            <AvatarFallback className="rounded-lg text-xs">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      ),
      minWidth: "200px",
    },
    { id: "title", header: "Role", accessor: "title", minWidth: "160px" },
    { id: "team", header: "Team", accessor: "team", minWidth: "140px" },
    {
      id: "status",
      header: "Status",
      accessor: (user) => (
        <Badge variant="secondary" className="border-0">{user.status}</Badge>
      ),
      minWidth: "100px",
    },
  ]

  const dialogMemberColumns: ColumnDef<AccessUser>[] = [
    { id: "name", header: "Name", accessor: "name", minWidth: "120px" },
    { id: "email", header: "Email", accessor: "email", minWidth: "160px" },
    { id: "title", header: "Role", accessor: "title", minWidth: "120px" },
  ]

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
        <Badge variant="secondary" className="border-0">{policy.moduleCount ?? policy.modules.length}</Badge>
      ),
      minWidth: "100px",
    },
    {
      id: "entities",
      header: "Entities",
      accessor: (policy) => (
        <Badge variant="secondary" className="border-0">{policy.entityCount ?? policy.entities.length}</Badge>
      ),
      minWidth: "100px",
    },
    { id: "createdAt", header: "Created", accessor: "createdAt", minWidth: "120px" },
  ]

  const moduleColumns: ColumnDef<AccessModule>[] = [
    { id: "name", header: "Module", accessor: "name", sticky: true, minWidth: "180px" },
    { id: "scope", header: "Scope", accessor: "scope", minWidth: "120px" },
    {
      id: "rules",
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
        <span className="text-sm text-muted-foreground">{entity.secondary}</span>
      ),
      minWidth: "180px",
    },
    { id: "attachedAt", header: "Attached", accessor: "attachedAt", minWidth: "120px" },
  ]

  // ── Data loaders ───────────────────────────────────────────────

  const loadGroups = async () => {
    if (!selectedClient) return
    setGroupsLoading(true)
    setGroupsStatusCode(undefined)
    setGroupsStatusMessage(undefined)
    try {
      const raw = await fetchUserGroups({ page: 1, count: 200, filters: { clientid: Number(selectedClient), query: groupSearch.trim() } })
      if (raw === null) { setGroups([]); setGroupsStatusCode(204); return }
      const payload = normalizeListPayload(raw)
      setGroups(payload.list.map((item) => mapAccessGroupSummary(item)))
      setGroupsStatusCode(undefined)
    } catch (error) {
      setGroups([])
      setGroupsStatusCode(getStatusCodeFromError(error) ?? 500)
      setGroupsStatusMessage(getErrorDescription(error))
    } finally {
      setGroupsLoading(false)
    }
  }

  const loadGroupDetail = async (group: AccessGroup) => {
    if (!selectedClient) return
    setSelectedGroup(group)
    setView("detail")
    setMemberSearch("")
    setPolicySearch("")
    setDetailLoading(true)
    setDetailStatusCode(undefined)
    setDetailStatusMessage(undefined)
    setSelectedMemberKeys(new Set())
    setSelectedPolicyKeys(new Set())
    try {
      const [groupResult, membersResult, policiesResult] = await Promise.allSettled([
        fetchUserGroupById(group.id, selectedClient),
        fetchUserGroupMembers(group.id, selectedClient, 1, 100),
        fetchUserGroupPolicies(group.id, selectedClient),
      ])
      const groupMeta = groupResult.status === "fulfilled" && groupResult.value !== null
        ? mapAccessGroupDetail(groupResult.value) : null
      const membersPayload = membersResult.status === "fulfilled" && membersResult.value !== null
        ? extractGroupMembers(membersResult.value)
        : { members: [] as AccessUser[], group: null as AccessGroup | null }
      const policies = policiesResult.status === "fulfilled" && policiesResult.value !== null
        ? extractGroupPolicies(policiesResult.value) : []
      const mergedGroup: AccessGroup = {
        ...(groupMeta || group),
        name: groupMeta?.name || membersPayload.group?.name || group.name,
        description: groupMeta?.description || membersPayload.group?.description || group.description,
        createdAt: groupMeta?.createdAt || membersPayload.group?.createdAt || group.createdAt,
        memberCount: membersPayload.members.length || groupMeta?.memberCount || group.memberCount || 0,
        policyAssigned: policies.length > 0 ? true : Boolean(group.policyAssigned),
        owners: groupMeta?.owners || group.owners,
        users: membersPayload.members,
        permissions: policies,
      }
      setSelectedGroup(mergedGroup)
      setGroupMembers(membersPayload.members)
      setGroupPolicies(policies)
      setDetailStatusCode(undefined)
    } catch (error) {
      setGroupMembers([])
      setGroupPolicies([])
      setDetailStatusCode(getStatusCodeFromError(error) ?? 500)
      setDetailStatusMessage(getErrorDescription(error))
    } finally {
      setDetailLoading(false)
    }
  }

  const loadPolicyDetail = async (policy: AccessPolicy) => {
    if (!selectedClient) return
    setView("policy-detail")
    setPolicyDetailLoading(true)
    setPolicyDetailStatusCode(undefined)
    setPolicyDetailStatusMessage(undefined)
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
      if (raw === null) { setSelectedPolicyDetail(null); setPolicyDetailStatusCode(204); return }
      const detail = mapPolicyDetail(raw)
      if (!detail) { setSelectedPolicyDetail(null); setPolicyDetailStatusCode(204); return }
      setSelectedPolicyDetail(detail)
    } catch (error) {
      setSelectedPolicyDetail(null)
      setPolicyDetailStatusCode(getStatusCodeFromError(error) ?? 500)
      setPolicyDetailStatusMessage(getErrorDescription(error))
    } finally {
      setPolicyDetailLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedClient) {
      setGroups([]); setGroupsStatusCode(undefined); setGroupsStatusMessage(undefined)
      setSelectedGroup(null); setGroupMembers([]); setGroupPolicies([])
      setSelectedGroupKeys(new Set())
      return
    }
    void loadGroups()
  }, [groupSearch, selectedClient])

  useEffect(() => {
    if (!userDialogOpen || !selectedClient) return
    let cancelled = false
    const load = async () => {
      setUserCandidatesLoading(true)
      setUserCandidatesStatusCode(undefined)
      setUserCandidatesStatusMessage(undefined)
      try {
        const raw = await fetchUsers({
          page: 1, pageSize: 100, clientid: selectedClient, category: 0,
          filters: userDialogSearch.trim()
            ? [{ column: "FULL_NAME", value: userDialogSearch.trim() }, { column: "EMAIL", value: userDialogSearch.trim() }]
            : [],
        })
        if (cancelled) return
        if (raw === null) { setUserCandidates([]); setUserCandidatesStatusCode(204); return }
        const payload = normalizeListPayload(raw)
        setUserCandidates(payload.list.map((item) => mapAccessUser(item)))
      } catch (error) {
        if (cancelled) return
        setUserCandidates([])
        setUserCandidatesStatusCode(getStatusCodeFromError(error) ?? 500)
        setUserCandidatesStatusMessage(getErrorDescription(error))
      } finally {
        if (!cancelled) setUserCandidatesLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [selectedClient, userDialogOpen, userDialogSearch])

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

  // ── Editor helpers ─────────────────────────────────────────────

  const openCreateEditor = () => {
    setEditorMode("create")
    setDraft(createEmptyDraftGroup())
    setBaseline(null)
    setSelectedAttachPolicyKeys(new Set())
    setSelectedUserCandidateKeys(new Set())
    setUserDialogSearch("")
    setAttachSearch("")
    setView("editor")
  }

  const openEditEditor = () => {
    if (!selectedGroup) return
    setRenameDialogOpen(false)
    const nextDraft: DraftGroup = {
      name: selectedGroup.name,
      description: selectedGroup.description,
      members: groupMembers,
      policies: groupPolicies,
    }
    setEditorMode("edit")
    setDraft(nextDraft)
    setBaseline({ members: groupMembers, policies: groupPolicies })
    setSelectedUserCandidateKeys(new Set(nextDraft.members.map(keyForUser)))
    setSelectedAttachPolicyKeys(new Set(nextDraft.policies.map(keyForPolicy)))
    setUserDialogSearch("")
    setAttachSearch("")
    setView("editor")
  }

  const openAttachPicker = () => {
    setSelectedAttachPolicyKeys(new Set(draft.policies.map(keyForPolicy)))
    setAttachSearch("")
    setView("attach")
  }

  const openUserPickerFromDetail = () => {
    setSelectedUserCandidateKeys(new Set(groupMembers.map(keyForUser)))
    setUserDialogSearch("")
    setUserDialogOpen(true)
  }

  // ── Actions ────────────────────────────────────────────────────

  const handleApplyUserSelection = async () => {
    if (view === "detail" && selectedGroup && selectedClient) {
      const existingKeys = new Set(groupMembers.map(keyForUser))
      const added = userCandidates.filter((u) => selectedUserCandidateKeys.has(keyForUser(u)) && !existingKeys.has(keyForUser(u)))
      if (added.length === 0) { setUserDialogOpen(false); return }
      setSaving(true)
      try {
        await addUserGroupMembers(selectedGroup.id, selectedClient, added.map(getParticipantId))
        toast.success("Users added to the group.")
        setUserDialogOpen(false)
        await loadGroupDetail(selectedGroup)
      } catch (error) {
        toast.error(getErrorDescription(error) || "Unable to add these users right now.")
      } finally {
        setSaving(false)
      }
      return
    }
    setDraft((cur) => {
      const next = new Map(cur.members.map((u) => [keyForUser(u), u]))
      userCandidates.forEach((u) => {
        const k = keyForUser(u)
        if (selectedUserCandidateKeys.has(k)) next.set(k, u)
        else next.delete(k)
      })
      return { ...cur, members: Array.from(next.values()) }
    })
    setUserDialogOpen(false)
  }

  const handleApplyPolicySelection = () => {
    setDraft((cur) => {
      const next = new Map(cur.policies.map((p) => [keyForPolicy(p), p]))
      attachablePolicies.forEach((p) => {
        const k = keyForPolicy(p)
        if (selectedAttachPolicyKeys.has(k)) next.set(k, p)
        else next.delete(k)
      })
      return { ...cur, policies: Array.from(next.values()) }
    })
    setView("editor")
  }

  const handleSaveGroup = async () => {
    if (!selectedClient) return
    const name = draft.name.trim()
    const nameError = validateGroupName(name)
    if (nameError) { toast.error(nameError); return }
    if (editorMode === "create" && draft.members.length < 2) {
      toast.error("Add at least 2 members before creating a group.")
      return
    }
    setSaving(true)
    try {
      if (editorMode === "create") {
        await createUserGroup({
          clientid: Number(selectedClient),
          groupName: name,
          description: draft.description.trim() || "group desc",
          members: draft.members.map(getUserIdForCreate),
          policies: draft.policies.map((p) => p.id),
        })
        toast.success("User group created.")
        setDraft(createEmptyDraftGroup())
        setBaseline(null)
        setView("list")
        await loadGroups()
        return
      }
      if (!selectedGroup) return
      await updateUserGroup({ clientid: Number(selectedClient), groupid: selectedGroup.id, groupName: name, description: draft.description.trim() })
      const origMembers = baseline?.members || []
      const origPolicies = baseline?.policies || []
      const origMemberKeys = new Set(origMembers.map(keyForUser))
      const nextMemberKeys = new Set(draft.members.map(keyForUser))
      const addedMembers = draft.members.filter((u) => !origMemberKeys.has(keyForUser(u)))
      const removedMemberIds = origMembers.filter((u) => !nextMemberKeys.has(keyForUser(u))).map(getParticipantId)
      if (addedMembers.length > 0) await addUserGroupMembers(selectedGroup.id, selectedClient, addedMembers.map(getParticipantId))
      if (removedMemberIds.length > 0) await removeUserGroupMembers(selectedGroup.id, selectedClient, removedMemberIds)
      const origPolicyKeys = new Set(origPolicies.map(keyForPolicy))
      const nextPolicyKeys = new Set(draft.policies.map(keyForPolicy))
      const addedPolicyIds = draft.policies.filter((p) => !origPolicyKeys.has(keyForPolicy(p))).map((p) => p.id)
      const removedPolicyIds = origPolicies.filter((p) => !nextPolicyKeys.has(keyForPolicy(p))).map((p) => p.id)
      if (addedPolicyIds.length > 0) await assignMultiplePolicies({ clientid: Number(selectedClient), entityId: selectedGroup.id, type: "USER_GROUP", policies: addedPolicyIds })
      if (removedPolicyIds.length > 0) await removeMultiplePolicies({ clientid: Number(selectedClient), entityId: selectedGroup.id, type: "USER_GROUP", policies: removedPolicyIds })
      toast.success("User group updated.")
      await loadGroups()
      await loadGroupDetail({ ...selectedGroup, name })
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to save this user group right now.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCurrentGroup = async () => {
    if (!selectedGroup || !selectedClient) return
    const confirmed = window.confirm(`Delete "${selectedGroup.name}"?`)
    if (!confirmed) return
    setDeleting(true)
    try {
      await deleteUserGroups([selectedGroup.id], selectedClient)
      toast.success("User group deleted.")
      setSelectedGroup(null); setGroupMembers([]); setGroupPolicies([])
      setSelectedGroupKeys(new Set())
      setView("list")
      await loadGroups()
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to delete this user group right now.")
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteSelectedGroups = async () => {
    if (!selectedClient || selectedGroupKeys.size === 0) return
    const confirmed = window.confirm(`Delete ${selectedGroupKeys.size} selected group${selectedGroupKeys.size === 1 ? "" : "s"}?`)
    if (!confirmed) return
    setDeleting(true)
    try {
      await deleteUserGroups(Array.from(selectedGroupKeys), selectedClient)
      toast.success("Selected groups deleted.")
      setSelectedGroupKeys(new Set())
      await loadGroups()
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to delete the selected groups right now.")
    } finally {
      setDeleting(false)
    }
  }

  const handleRemoveMembers = async () => {
    if (!selectedGroup || !selectedClient || selectedMemberKeys.size === 0) return
    popupApi.warning("Remove selected members?", "The selected users will be removed from this group.", async () => {
      setSaving(true)
      try {
        const memberIds = groupMembers.filter((m) => selectedMemberKeys.has(keyForUser(m))).map(getParticipantId)
        await removeUserGroupMembers(selectedGroup.id, selectedClient, memberIds)
        toast.success("Members removed from the group.")
        setSelectedMemberKeys(new Set())
        await loadGroupDetail(selectedGroup)
      } catch (error) {
        toast.error(getErrorDescription(error) || "Unable to remove these members right now.")
      } finally {
        setSaving(false)
      }
    })
  }

  const handleRemovePolicies = async () => {
    if (!selectedGroup || !selectedClient || selectedPolicyKeys.size === 0) return
    popupApi.warning("Remove selected policies?", "The selected policies will be detached from this group.", async () => {
      setSaving(true)
      try {
        await removeMultiplePolicies({ clientid: Number(selectedClient), entityId: selectedGroup.id, type: "USER_GROUP", policies: Array.from(selectedPolicyKeys) })
        toast.success("Policies removed from the group.")
        setSelectedPolicyKeys(new Set())
        await loadGroupDetail(selectedGroup)
      } catch (error) {
        toast.error(getErrorDescription(error) || "Unable to remove these policies right now.")
      } finally {
        setSaving(false)
      }
    })
  }

  const handleRenameGroup = async () => {
    if (!selectedGroup || !selectedClient) return
    const name = renameDraftName.trim()
    const nameError = validateGroupName(name)
    if (nameError) { toast.error(nameError); return }
    setSaving(true)
    try {
      await updateUserGroup({ clientid: Number(selectedClient), groupid: selectedGroup.id, groupName: name, description: selectedGroup.description })
      toast.success("Group renamed.")
      setRenameDialogOpen(false)
      setSelectedGroup({ ...selectedGroup, name })
      await loadGroups()
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to rename this group right now.")
    } finally {
      setSaving(false)
    }
  }

  // ── User picker dialog (shared) ────────────────────────────────

  const UserPickerDialog = (
    <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Users to Group</DialogTitle>
          <DialogDescription>Search and select users to add to this access group.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative w-full">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search users…"
              value={userDialogSearch}
              onChange={(e) => setUserDialogSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {userCandidatesStatusCode && userCandidatesStatusCode !== 204 ? (
            <StatusState code={userCandidatesStatusCode} description={userCandidatesStatusMessage} />
          ) : (
            <DataTable<AccessUser>
              columns={dialogMemberColumns}
              data={userCandidates}
              rowKey={keyForUser}
              loading={userCandidatesLoading}
              compact
              paginated
              maxBodyHeight="400px"
              selectable
              selectedKeys={selectedUserCandidateKeys}
              onSelectionChange={setSelectedUserCandidateKeys}
              emptyState={
                <StatusState
                  compact
                  title={userDialogSearch ? "No users match this search" : "No candidate users available"}
                  description={userDialogSearch ? "Try another keyword or clear the search." : "No eligible users are available to add right now."}
                  actionSlot={userDialogSearch ? <StatusStateActions secondaryLabel="Clear Search" onSecondaryClick={() => setUserDialogSearch("")} /> : undefined}
                />
              }
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button className="melp-radius" disabled={saving} onClick={() => void handleApplyUserSelection()}>
            {saving && <IconLoader2 className="size-4 mr-1.5 animate-spin" />}
            Add Selected Users
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // ── No client ──────────────────────────────────────────────────

  if (!selectedClient) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><IconUsers /></EmptyMedia>
            <EmptyTitle>No domain selected</EmptyTitle>
            <EmptyDescription>
              User groups are scoped to the active domain. Pick a domain from the header to continue.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  // ── Policy detail view ─────────────────────────────────────────

  if (view === "policy-detail") {
    if (policyDetailLoading) {
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
                <button type="button" onClick={() => setView("list")}>User Groups</button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {selectedGroup && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <button type="button" onClick={() => setView("detail")}>{selectedGroup.name}</button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-48">
                {selectedPolicyDetail?.name ?? "Policy Detail"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {policyDetailStatusCode || !selectedPolicyDetail ? (
          <>
            <header>
              <h1 className="text-2xl font-bold">Policy Detail</h1>
              <p className="text-sm text-muted-foreground">The selected group policy could not be loaded right now.</p>
            </header>
            <StatusState
              code={policyDetailStatusCode}
              title={policyDetailStatusCode === 204 ? "This policy is no longer available to the group" : undefined}
              description={policyDetailStatusCode === 204 ? "It may have been removed or is no longer assigned to this group." : policyDetailStatusMessage}
              actionSlot={<StatusStateActions secondaryLabel="Back" onSecondaryClick={() => setView("detail")} />}
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
                  <h1 className="text-2xl font-bold truncate">{selectedPolicyDetail.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">{selectedPolicyDetail.description}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => navigate(`/access/policies/${selectedPolicyDetail.backendPolicyId || selectedPolicyDetail.id}`)}
              >
                View full policy
              </Button>
            </header>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border bg-card flex flex-col overflow-hidden">
                <header className="border-b px-5 py-3 flex items-center justify-between shrink-0">
                  <h2 className="text-sm font-semibold">Permission Modules</h2>
                  <Badge variant="secondary" className="border-0">{selectedPolicyDetail.modules.length}</Badge>
                </header>
                <DataTable<AccessModule>
                  columns={moduleColumns}
                  data={selectedPolicyDetail.modules}
                  rowKey={(m) => m.id}
                  emptyState={<StatusState compact title="No modules" description="This policy has no permission modules." />}
                />
              </section>
              <section className="rounded-lg border bg-card flex flex-col overflow-hidden">
                <header className="border-b px-5 py-3 flex items-center justify-between shrink-0">
                  <h2 className="text-sm font-semibold">Attached Entities</h2>
                  <Badge variant="secondary" className="border-0">{selectedPolicyDetail.entities.length}</Badge>
                </header>
                <DataTable<PolicyEntity>
                  columns={entityColumns}
                  data={selectedPolicyDetail.entities}
                  rowKey={(e) => e.id}
                  emptyState={<StatusState compact title="No entities" description="This policy is not attached to any entities." />}
                />
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
                <button type="button" onClick={() => setView("list")}>User Groups</button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button type="button" onClick={() => setView("editor")}>
                  {editorMode === "create" ? "New Group" : selectedGroup?.name}
                </button>
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
          <p className="text-sm text-muted-foreground">Select policies to attach to this group.</p>
        </header>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
          {attachablePolicies.length > 0 && (
            <Badge variant="secondary" className="border-0 shrink-0">{attachablePolicies.length} policies</Badge>
          )}
        </div>

        {attachStatusCode && attachStatusCode !== 204 ? (
          <StatusState code={attachStatusCode} title="Unable to load policies" description={attachStatusMessage} />
        ) : (
          <DataTable<AccessPolicy>
            columns={policyColumns}
            data={attachablePolicies}
            rowKey={keyForPolicy}
            loading={attachLoading}
            paginated
            selectable
            selectedKeys={selectedAttachPolicyKeys}
            onSelectionChange={setSelectedAttachPolicyKeys}
            emptyState={
              <StatusState
                compact
                title={attachSearch ? "No policies match this search" : "No attachable policies available"}
                description={attachSearch ? "Try another keyword or clear the search." : "There are no unassigned policies available for this group right now."}
                actionSlot={attachSearch ? <StatusStateActions secondaryLabel="Clear Search" onSecondaryClick={() => setAttachSearch("")} /> : undefined}
              />
            }
          />
        )}

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <Button variant="ghost" size="sm" onClick={() => setView("editor")}>
            <IconArrowLeft className="size-4 mr-1.5" />
            Back
          </Button>
          <Button
            size="sm"
            className="melp-radius"
            disabled={selectedAttachPolicyKeys.size === 0}
            onClick={handleApplyPolicySelection}
          >
            Apply Selection
          </Button>
        </div>
      </div>
    )
  }

  // ── Editor view ────────────────────────────────────────────────

  if (view === "editor") {
    const backTarget = selectedGroup && editorMode === "edit" ? "detail" : "list"

    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button type="button" onClick={() => setView("list")}>User Groups</button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {editorMode === "edit" && selectedGroup && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <button type="button" onClick={() => setView("detail")}>{selectedGroup.name}</button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{editorMode === "create" ? "New Group" : "Edit Group"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <header>
          <h1 className="text-2xl font-bold">
            {editorMode === "create" ? "Create User Group" : "Edit User Group"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Add group details, members, and permission policies before saving.
          </p>
        </header>

        <div className="space-y-4 rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold">Group Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Group Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((cur) => ({ ...cur, name: e.target.value }))}
                placeholder="e.g. Audit Review Board"
                maxLength={50}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Description <span className="text-muted-foreground/60">(optional)</span>
              </Label>
              <Input
                value={draft.description}
                onChange={(e) => setDraft((cur) => ({ ...cur, description: e.target.value }))}
                placeholder="Brief description of this group"
                maxLength={200}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Members</h3>
                {draft.members.length > 0 && (
                  <p className="text-xs text-muted-foreground">{draft.members.length} selected</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedUserCandidateKeys(new Set(draft.members.map(keyForUser)))
                  setUserDialogSearch("")
                  setUserDialogOpen(true)
                }}
              >
                <IconUserPlus className="size-4 mr-1.5" />
                Add Users
              </Button>
            </div>
            {draft.members.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><IconUsers /></EmptyMedia>
                  <EmptyTitle>No users selected</EmptyTitle>
                  <EmptyDescription>Open the member picker to add users to this group.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <DataTable<AccessUser>
                columns={memberColumns}
                data={draft.members}
                rowKey={keyForUser}
                paginated
              />
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Permission Policies</h3>
                {draft.policies.length > 0 && (
                  <p className="text-xs text-muted-foreground">{draft.policies.length} attached</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={openAttachPicker}>
                <IconPlus className="size-4 mr-1.5" />
                Add Permissions
              </Button>
            </div>
            {draft.policies.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><IconShieldLock /></EmptyMedia>
                  <EmptyTitle>No policies selected</EmptyTitle>
                  <EmptyDescription>Attached group policies will appear here once you choose them.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <DataTable<AccessPolicy>
                columns={policyColumns}
                data={draft.policies}
                rowKey={keyForPolicy}
                paginated
              />
            )}
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <Button variant="ghost" size="sm" onClick={() => setView(backTarget)}>
            <IconArrowLeft className="size-4 mr-1.5" />
            Cancel
          </Button>
          <Button size="sm" className="melp-radius" disabled={saving} onClick={handleSaveGroup}>
            {saving && <IconLoader2 className="size-4 mr-1.5 animate-spin" />}
            {editorMode === "create" ? "Create Group" : "Save Group"}
          </Button>
        </div>

        {UserPickerDialog}
      </div>
    )
  }

  // ── Detail view ────────────────────────────────────────────────

  if (view === "detail") {
    if (detailLoading) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (detailStatusCode || !selectedGroup) {
      return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <button type="button" onClick={() => setView("list")}>User Groups</button>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Group Detail</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <header>
            <h1 className="text-2xl font-bold">User Group Detail</h1>
            <p className="text-sm text-muted-foreground">The selected group could not be loaded right now.</p>
          </header>
          <StatusState
            code={detailStatusCode}
            description={detailStatusMessage}
            actionSlot={<StatusStateActions secondaryLabel="Back" onSecondaryClick={() => setView("list")} />}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button type="button" onClick={() => setView("list")}>User Groups</button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-48">{selectedGroup.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center size-11 rounded-lg bg-secondary shrink-0">
              <IconUsers className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{selectedGroup.name}</h1>
              {selectedGroup.description && (
                <p className="text-sm text-muted-foreground mt-1">{selectedGroup.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {groupMembers.length} members · {groupPolicies.length} policies
                {selectedGroup.createdAt ? ` · Created ${selectedGroup.createdAt}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setRenameDraftName(selectedGroup.name); setRenameDialogOpen(true) }}
            >
              <IconEdit className="size-4 mr-1.5" />
              Rename
            </Button>
            <Button variant="outline" size="sm" onClick={openEditEditor}>
              <IconEdit className="size-4 mr-1.5" />
              Edit Group
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={handleDeleteCurrentGroup}
              className="text-destructive hover:text-destructive"
            >
              {deleting ? <IconLoader2 className="size-4 mr-1.5 animate-spin" /> : <IconTrash className="size-4 mr-1.5" />}
              Delete
            </Button>
          </div>
        </header>

        <Tabs defaultValue="users">
          <TabsList variant="line">
            <TabsTrigger value="users">
              Users
              <Badge variant="secondary" className="border-0 ml-1.5 text-xs h-5 px-1.5">{groupMembers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="permissions">
              Permissions
              <Badge variant="secondary" className="border-0 ml-1.5 text-xs h-5 px-1.5">{groupPolicies.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative w-full sm:w-72">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search users…"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {selectedMemberKeys.size > 0 && (
                  <Button variant="outline" size="sm" disabled={saving} onClick={handleRemoveMembers}>
                    {saving ? <IconLoader2 className="size-4 mr-1.5 animate-spin" /> : <IconTrash className="size-4 mr-1.5" />}
                    Remove {selectedMemberKeys.size}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={openUserPickerFromDetail}>
                  <IconUserPlus className="size-4 mr-1.5" />
                  Add Users
                </Button>
              </div>
            </div>
            <DataTable<AccessUser>
              columns={memberColumns}
              data={filteredGroupMembers}
              rowKey={keyForUser}
              paginated
              selectable
              selectedKeys={selectedMemberKeys}
              onSelectionChange={setSelectedMemberKeys}
              emptyState={
                <StatusState
                  compact
                  title={memberSearch ? "No users match this search" : "No members assigned yet"}
                  description={memberSearch ? "Try another keyword or clear the search." : "Group membership data is empty right now."}
                />
              }
            />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative w-full sm:w-72">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search policies…"
                  value={policySearch}
                  onChange={(e) => setPolicySearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {selectedPolicyKeys.size > 0 && (
                  <Button variant="outline" size="sm" disabled={saving} onClick={handleRemovePolicies}>
                    {saving ? <IconLoader2 className="size-4 mr-1.5 animate-spin" /> : <IconTrash className="size-4 mr-1.5" />}
                    Remove {selectedPolicyKeys.size}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={openEditEditor}>
                  <IconPlus className="size-4 mr-1.5" />
                  Add Permissions
                </Button>
              </div>
            </div>
            <DataTable<AccessPolicy>
              columns={policyColumns}
              data={filteredGroupPolicies}
              rowKey={keyForPolicy}
              onRowClick={(policy) => void loadPolicyDetail(policy)}
              paginated
              selectable
              selectedKeys={selectedPolicyKeys}
              onSelectionChange={setSelectedPolicyKeys}
              emptyState={
                <StatusState
                  compact
                  title={policySearch ? "No policies match this search" : "No policies attached yet"}
                  description={policySearch ? "Try another keyword or clear the search." : "Attach policies to define the access model for this group."}
                />
              }
            />
          </TabsContent>
        </Tabs>

        {UserPickerDialog}

        {/* Rename dialog */}
        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Rename Group</DialogTitle>
              <DialogDescription>Enter a new name for this user group.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Group Name</Label>
              <Input
                value={renameDraftName}
                onChange={(e) => setRenameDraftName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleRenameGroup() }}
                placeholder="e.g. Audit Review Board"
                maxLength={50}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
              <Button className="melp-radius" disabled={saving} onClick={() => void handleRenameGroup()}>
                {saving && <IconLoader2 className="size-4 mr-1.5 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────

  const hasNoGroups = !groupsLoading && groups.length === 0 && !groupsStatusCode

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Groups</h1>
          <p className="text-sm text-muted-foreground">
            Manage access groups, group members, and attached policies.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedGroupKeys.size > 0 && (
            <Button variant="outline" size="sm" disabled={deleting} onClick={handleDeleteSelectedGroups}>
              {deleting ? <IconLoader2 className="size-4 mr-1.5 animate-spin" /> : <IconTrash className="size-4 mr-1.5" />}
              Delete {selectedGroupKeys.size}
            </Button>
          )}
          <Button size="sm" className="melp-radius" onClick={openCreateEditor}>
            <IconPlus className="size-4 mr-1.5" />
            New Group
          </Button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-72">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search user groups…"
            value={groupSearch}
            onChange={(e) => setGroupSearch(e.target.value)}
            className="pl-9"
          />
          {groupSearch && (
            <button type="button" onClick={() => setGroupSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <IconX className="size-3.5" />
            </button>
          )}
        </div>
        {groups.length > 0 && (
          <Badge variant="secondary" className="border-0 shrink-0">{groups.length} groups</Badge>
        )}
      </div>

      {groupsStatusCode && groupsStatusCode !== 204 ? (
        <StatusState
          code={groupsStatusCode}
          description={groupsStatusMessage}
          actionSlot={<StatusStateActions primaryLabel="Create User Group" onPrimaryClick={openCreateEditor} />}
        />
      ) : hasNoGroups ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><IconUsers /></EmptyMedia>
            <EmptyTitle>No user groups yet</EmptyTitle>
            <EmptyDescription>
              Create your first user group to organize members and attach shared access policies.
            </EmptyDescription>
          </EmptyHeader>
          <Button size="sm" className="melp-radius" onClick={openCreateEditor}>
            <IconPlus className="size-4 mr-1.5" />
            Create User Group
          </Button>
        </Empty>
      ) : (
        <DataTable<AccessGroup>
          columns={groupColumns}
          data={groups}
          rowKey={(group) => group.id}
          onRowClick={(group) => void loadGroupDetail(group)}
          loading={groupsLoading}
          paginated
          selectable
          selectedKeys={selectedGroupKeys}
          onSelectionChange={setSelectedGroupKeys}
          emptyState={
            <StatusState
              compact
              title="No groups match this search"
              description="Try another keyword or clear the search to see all user groups."
              actionSlot={<StatusStateActions secondaryLabel="Clear Search" onSecondaryClick={() => setGroupSearch("")} />}
            />
          }
        />
      )}
    </div>
  )
}
