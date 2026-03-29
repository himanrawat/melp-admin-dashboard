import { useEffect, useState } from "react"
import {
  IconArrowLeft,
  IconEdit,
  IconLoader2,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUserPlus,
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
import {
  StatusState,
  StatusStateActions,
  type StatusStateCode,
} from "@/components/shared/status-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/auth-context"

type GroupView = "list" | "editor" | "detail" | "attach" | "policy-detail"

type DraftGroup = {
  name: string
  description: string
  owners: string
  members: AccessUser[]
  policies: AccessPolicy[]
}

type EditorBaseline = {
  members: AccessUser[]
  policies: AccessPolicy[]
}

function createEmptyDraftGroup(): DraftGroup {
  return {
    name: "",
    description: "",
    owners: "",
    members: [],
    policies: [],
  }
}

function keyForUser(user: AccessUser): string {
  return user.userId || user.id
}

function keyForPolicy(policy: AccessPolicy): string {
  return policy.id
}

function getUserIdForCreate(user: AccessUser): string {
  return user.userId || user.id
}

function getParticipantId(user: AccessUser): string {
  return user.melpid || user.userId || user.id
}

export function AccessGroupsPage() {
  const { selectedClient } = useAuth()

  const [view, setView] = useState<GroupView>("list")
  const [groupSearch, setGroupSearch] = useState("")
  const [attachSearch, setAttachSearch] = useState("")
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

  const groupColumns: ColumnDef<AccessGroup>[] = [
    {
      id: "name",
      header: "Group Name",
      sticky: true,
      accessor: (group) => (
        <div className="min-w-0 max-w-48">
          <button type="button" className="block max-w-full truncate text-left font-medium">
            {group.name}
          </button>
          <p className="mt-0.5 line-clamp-3 max-w-48 whitespace-normal break-words text-xs text-muted-foreground">
            {group.description || "No description added yet."}
          </p>
        </div>
      ),
      minWidth: "200px",
    },
    {
      id: "users",
      header: "Users",
      accessor: (group) => (
        <Badge variant="secondary" className="border-0">
          {group.memberCount ?? group.users.length} members
        </Badge>
      ),
      minWidth: "140px",
    },
    {
      id: "permissions",
      header: "Policies",
      accessor: (group) => (
        <Badge variant="secondary" className="border-0">
          {group.policyAssigned ? "Attached" : "Not Assigned"}
        </Badge>
      ),
      minWidth: "140px",
    },
    {
      id: "owners",
      header: "Owners",
      accessor: (group) => (
        <span className="text-sm text-muted-foreground">
          {group.owners.length > 0 ? group.owners.join(", ") : "Pending"}
        </span>
      ),
      minWidth: "160px",
    },
    { id: "createdAt", header: "Created", accessor: "createdAt", minWidth: "120px" },
  ]

  const memberColumns: ColumnDef<AccessUser>[] = [
    { id: "name", header: "Name", accessor: "name", sticky: true, minWidth: "180px" },
    { id: "email", header: "Email", accessor: "email", minWidth: "200px" },
    { id: "title", header: "Role", accessor: "title", minWidth: "180px" },
    { id: "team", header: "Team", accessor: "team", minWidth: "140px" },
    {
      id: "status",
      header: "Status",
      accessor: (user) => (
        <Badge variant="secondary" className="border-0">
          {user.status}
        </Badge>
      ),
      align: "right",
      minWidth: "120px",
    },
  ]

  const dialogMemberColumns: ColumnDef<AccessUser>[] = [
    { id: "name", header: "Name", accessor: "name", minWidth: "120px" },
    { id: "email", header: "Email", accessor: "email", minWidth: "160px" },
    { id: "title", header: "Role", accessor: "title", minWidth: "120px" },
  ]

  const permissionColumns: ColumnDef<AccessPolicy>[] = [
    { id: "name", header: "Policy Name", accessor: "name", sticky: true, minWidth: "200px" },
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
          {policy.entityCount ?? policy.entities.length} entities
        </Badge>
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
        <span className="text-sm text-muted-foreground">{entity.secondary}</span>
      ),
      minWidth: "180px",
    },
    { id: "attachedAt", header: "Attached", accessor: "attachedAt", minWidth: "120px" },
  ]

  const resetEditorSelections = () => {
    setSelectedAttachPolicyKeys(new Set())
    setSelectedUserCandidateKeys(new Set())
    setUserDialogSearch("")
    setAttachSearch("")
  }

  const loadGroups = async () => {
    if (!selectedClient) return

    setGroupsLoading(true)
    setGroupsStatusCode(undefined)
    setGroupsStatusMessage(undefined)

    try {
      const raw = await fetchUserGroups({
        page: 1,
        count: 200,
        filters: {
          clientid: Number(selectedClient),
          query: groupSearch.trim(),
        },
      })

      if (raw === null) {
        setGroups([])
        setGroupsStatusCode(204)
        return
      }

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

      const groupMeta =
        groupResult.status === "fulfilled" && groupResult.value !== null
          ? mapAccessGroupDetail(groupResult.value)
          : null

      const membersPayload =
        membersResult.status === "fulfilled" && membersResult.value !== null
          ? extractGroupMembers(membersResult.value)
          : { members: [] as AccessUser[], group: null as AccessGroup | null }

      const policies =
        policiesResult.status === "fulfilled" && policiesResult.value !== null
          ? extractGroupPolicies(policiesResult.value)
          : []

      const mergedGroup: AccessGroup = {
        ...(groupMeta || group),
        name: groupMeta?.name || membersPayload.group?.name || group.name,
        description:
          groupMeta?.description || membersPayload.group?.description || group.description,
        createdAt: groupMeta?.createdAt || membersPayload.group?.createdAt || group.createdAt,
        memberCount:
          membersPayload.members.length ||
          groupMeta?.memberCount ||
          group.memberCount ||
          0,
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

  const loadPolicyDetail = async (policyId: string) => {
    if (!selectedClient) return

    setView("policy-detail")
    setPolicyDetailLoading(true)
    setPolicyDetailStatusCode(undefined)
    setPolicyDetailStatusMessage(undefined)

    try {
      const raw = await fetchPolicyById(policyId, selectedClient)

      if (raw === null) {
        setSelectedPolicyDetail(null)
        setPolicyDetailStatusCode(204)
        return
      }

      const detail = mapPolicyDetail(raw)
      if (!detail) {
        setSelectedPolicyDetail(null)
        setPolicyDetailStatusCode(204)
        return
      }

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
      setGroups([])
      setGroupsStatusCode(undefined)
      setGroupsStatusMessage(undefined)
      setSelectedGroup(null)
      setGroupMembers([])
      setGroupPolicies([])
      setSelectedGroupKeys(new Set())
      return
    }

    void loadGroups()
  }, [groupSearch, selectedClient])

  useEffect(() => {
    if (!userDialogOpen || !selectedClient) return

    let cancelled = false

    const loadUserCandidates = async () => {
      setUserCandidatesLoading(true)
      setUserCandidatesStatusCode(undefined)
      setUserCandidatesStatusMessage(undefined)

      try {
        const raw = await fetchUsers({
          page: 1,
          pageSize: 100,
          clientid: selectedClient,
          category: 0,
          filters: userDialogSearch.trim()
            ? [
                { column: "FULL_NAME", value: userDialogSearch.trim() },
                { column: "EMAIL", value: userDialogSearch.trim() },
              ]
            : [],
        })

        if (cancelled) return

        if (raw === null) {
          setUserCandidates([])
          setUserCandidatesStatusCode(204)
          return
        }

        const payload = normalizeListPayload(raw)
        setUserCandidates(payload.list.map((item) => mapAccessUser(item)))
      } catch (error) {
        if (cancelled) return
        setUserCandidates([])
        setUserCandidatesStatusCode(getStatusCodeFromError(error) ?? 500)
        setUserCandidatesStatusMessage(getErrorDescription(error))
      } finally {
        if (!cancelled) {
          setUserCandidatesLoading(false)
        }
      }
    }

    void loadUserCandidates()

    return () => {
      cancelled = true
    }
  }, [selectedClient, userDialogOpen, userDialogSearch])

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

  const openCreateEditor = () => {
    setEditorMode("create")
    setDraft(createEmptyDraftGroup())
    setBaseline(null)
    resetEditorSelections()
    setView("editor")
  }

  const openEditEditor = () => {
    if (!selectedGroup) return

    const nextDraft: DraftGroup = {
      name: selectedGroup.name,
      description: selectedGroup.description,
      owners: selectedGroup.owners.join(", "),
      members: groupMembers,
      policies: groupPolicies,
    }

    setEditorMode("edit")
    setDraft(nextDraft)
    setBaseline({
      members: groupMembers,
      policies: groupPolicies,
    })
    setSelectedUserCandidateKeys(new Set(nextDraft.members.map((user) => keyForUser(user))))
    setSelectedAttachPolicyKeys(new Set(nextDraft.policies.map((policy) => keyForPolicy(policy))))
    setUserDialogSearch("")
    setAttachSearch("")
    setView("editor")
  }

  const openAttachPicker = () => {
    setSelectedAttachPolicyKeys(new Set(draft.policies.map((policy) => keyForPolicy(policy))))
    setAttachSearch("")
    setView("attach")
  }

  const handleApplyUserSelection = () => {
    setDraft((current) => {
      const nextMembers = new Map(current.members.map((user) => [keyForUser(user), user]))

      userCandidates.forEach((user) => {
        const key = keyForUser(user)
        if (selectedUserCandidateKeys.has(key)) {
          nextMembers.set(key, user)
        } else {
          nextMembers.delete(key)
        }
      })

      return {
        ...current,
        members: Array.from(nextMembers.values()),
      }
    })

    setUserDialogOpen(false)
  }

  const handleApplyPolicySelection = () => {
    setDraft((current) => {
      const nextPolicies = new Map(current.policies.map((policy) => [keyForPolicy(policy), policy]))

      attachablePolicies.forEach((policy) => {
        const key = keyForPolicy(policy)
        if (selectedAttachPolicyKeys.has(key)) {
          nextPolicies.set(key, policy)
        } else {
          nextPolicies.delete(key)
        }
      })

      return {
        ...current,
        policies: Array.from(nextPolicies.values()),
      }
    })

    setView("editor")
  }

  const handleSaveGroup = async () => {
    if (!selectedClient) return

    const name = draft.name.trim()
    const description = draft.description.trim()

    if (!name) {
      toast.error("Add a group name before saving.")
      return
    }

    setSaving(true)

    try {
      if (editorMode === "create") {
        await createUserGroup({
          clientid: Number(selectedClient),
          groupName: name,
          description: description || "group desc",
          members: draft.members.map((user) => getUserIdForCreate(user)),
          policies: draft.policies.map((policy) => policy.id),
        })

        toast.success("User group created.")
        setDraft(createEmptyDraftGroup())
        setBaseline(null)
        setView("list")
        await loadGroups()
        return
      }

      if (!selectedGroup) return

      await updateUserGroup({
        clientid: Number(selectedClient),
        groupid: selectedGroup.id,
        groupName: name,
        description,
      })

      const originalMembers = baseline?.members || []
      const originalPolicies = baseline?.policies || []

      const originalMemberKeys = new Set(originalMembers.map((user) => keyForUser(user)))
      const nextMemberKeys = new Set(draft.members.map((user) => keyForUser(user)))

      const addedMembers = draft.members.filter((user) => !originalMemberKeys.has(keyForUser(user)))
      const removedMemberIds = originalMembers
        .filter((user) => !nextMemberKeys.has(keyForUser(user)))
        .map((user) => getParticipantId(user))

      if (addedMembers.length > 0) {
        await addUserGroupMembers(
          selectedGroup.id,
          selectedClient,
          addedMembers.map((user) => getParticipantId(user)),
        )
      }

      if (removedMemberIds.length > 0) {
        await removeUserGroupMembers(selectedGroup.id, selectedClient, removedMemberIds)
      }

      const originalPolicyKeys = new Set(originalPolicies.map((policy) => keyForPolicy(policy)))
      const nextPolicyKeys = new Set(draft.policies.map((policy) => keyForPolicy(policy)))

      const addedPolicyIds = draft.policies
        .filter((policy) => !originalPolicyKeys.has(keyForPolicy(policy)))
        .map((policy) => policy.id)

      const removedPolicyIds = originalPolicies
        .filter((policy) => !nextPolicyKeys.has(keyForPolicy(policy)))
        .map((policy) => policy.id)

      if (addedPolicyIds.length > 0) {
        await assignMultiplePolicies({
          clientid: Number(selectedClient),
          entityId: selectedGroup.id,
          type: "USER_GROUP",
          policies: addedPolicyIds,
        })
      }

      if (removedPolicyIds.length > 0) {
        await removeMultiplePolicies({
          clientid: Number(selectedClient),
          entityId: selectedGroup.id,
          type: "USER_GROUP",
          policies: removedPolicyIds,
        })
      }

      toast.success("User group updated.")
      await loadGroups()
      await loadGroupDetail({
        ...selectedGroup,
        name,
        description,
      })
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to save this user group right now.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCurrentGroup = async () => {
    if (!selectedGroup || !selectedClient) return

    const confirmed = window.confirm(`Delete ${selectedGroup.name}?`)
    if (!confirmed) return

    setDeleting(true)

    try {
      await deleteUserGroups([selectedGroup.id], selectedClient)
      toast.success("User group deleted.")
      setSelectedGroup(null)
      setGroupMembers([])
      setGroupPolicies([])
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

    const confirmed = window.confirm(
      `Delete ${selectedGroupKeys.size} selected group${selectedGroupKeys.size === 1 ? "" : "s"}?`,
    )
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

    const confirmed = window.confirm("Remove the selected members from this group?")
    if (!confirmed) return

    setSaving(true)

    try {
      const memberIds = groupMembers
        .filter((member) => selectedMemberKeys.has(keyForUser(member)))
        .map((member) => getParticipantId(member))

      await removeUserGroupMembers(selectedGroup.id, selectedClient, memberIds)
      toast.success("Members removed from the group.")
      setSelectedMemberKeys(new Set())
      await loadGroupDetail(selectedGroup)
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to remove these members right now.")
    } finally {
      setSaving(false)
    }
  }

  const handleRemovePolicies = async () => {
    if (!selectedGroup || !selectedClient || selectedPolicyKeys.size === 0) return

    const confirmed = window.confirm("Remove the selected policies from this group?")
    if (!confirmed) return

    setSaving(true)

    try {
      await removeMultiplePolicies({
        clientid: Number(selectedClient),
        entityId: selectedGroup.id,
        type: "USER_GROUP",
        policies: Array.from(selectedPolicyKeys),
      })
      toast.success("Policies removed from the group.")
      setSelectedPolicyKeys(new Set())
      await loadGroupDetail(selectedGroup)
    } catch (error) {
      toast.error(getErrorDescription(error) || "Unable to remove these policies right now.")
    } finally {
      setSaving(false)
    }
  }

  if (!selectedClient) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <StatusState
          title="Choose a domain first"
          description="User groups are scoped to the active domain. Pick a domain from the header to continue."
        />
      </div>
    )
  }

  if (view === "policy-detail") {
    if (policyDetailLoading) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (policyDetailStatusCode || !selectedPolicyDetail) {
      return (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          <div className="space-y-3">
            <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView("detail")}>
              <IconArrowLeft className="size-4" />
              Back to Group
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Policy Detail</h1>
              <p className="text-sm text-muted-foreground">
                The selected group policy could not be loaded right now.
              </p>
            </div>
          </div>

          <StatusState
            code={policyDetailStatusCode}
            description={policyDetailStatusMessage}
            actionSlot={<StatusStateActions secondaryLabel="Back" onSecondaryClick={() => setView("detail")} />}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView("detail")}>
            <IconArrowLeft className="size-4" />
            Back to Group
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{selectedPolicyDetail.name}</h1>
            <p className="text-sm text-muted-foreground">{selectedPolicyDetail.description}</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <DataTable<AccessModule>
            columns={moduleColumns}
            data={selectedPolicyDetail.modules}
            rowKey={(module) => module.id}
            emptyState={
              <StatusState
                compact
                title="No modules attached"
                description="This policy does not have any module rules yet."
              />
            }
          />
          <DataTable<PolicyEntity>
            columns={entityColumns}
            data={selectedPolicyDetail.entities}
            rowKey={(entity) => entity.id}
            emptyState={
              <StatusState
                compact
                title="No entities attached"
                description="This policy is not currently attached to any entities."
              />
            }
          />
        </div>
      </div>
    )
  }

  if (view === "attach") {
    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView("editor")}>
            <IconArrowLeft className="size-4" />
            Back to Editor
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Attach Permission Policies</h1>
            <p className="text-sm text-muted-foreground">
              Select policies to attach to this group.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search policies…"
              value={attachSearch}
              onChange={(event) => setAttachSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex-1" />
          <Badge variant="secondary" className="border-0">
            {attachablePolicies.length} results
          </Badge>
        </div>

        {attachStatusCode ? (
          <StatusState
            code={attachStatusCode}
            title="Unable to load attachable policies"
            description={attachStatusMessage}
          />
        ) : (
          <DataTable<AccessPolicy>
            columns={permissionColumns}
            data={attachablePolicies}
            rowKey={(policy) => policy.id}
            loading={attachLoading}
            paginated
            selectable
            selectedKeys={selectedAttachPolicyKeys}
            onSelectionChange={setSelectedAttachPolicyKeys}
            emptyState={
              <StatusState
                compact
                title={attachSearch ? "No policies match this search" : "No attachable policies available yet"}
                description={
                  attachSearch
                    ? "Try another keyword or clear the search."
                    : "This table is ready for the live policy library, but nothing is available right now."
                }
              />
            }
          />
        )}

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => setView("editor")}>
            Cancel
          </Button>
          <Button className="melp-radius" disabled={selectedAttachPolicyKeys.size === 0} onClick={handleApplyPolicySelection}>
            Attach Policies
          </Button>
        </div>
      </div>
    )
  }

  if (view === "editor") {
    const backTarget = selectedGroup && editorMode === "edit" ? "detail" : "list"

    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView(backTarget)}>
            <IconArrowLeft className="size-4" />
            Back to User Groups
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {editorMode === "create" ? "Create User Group" : "Edit User Group"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Add group details, members, and permission policies before saving.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-md border p-4">
          <h3 className="text-sm font-semibold">Group Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Group Name</Label>
              <Input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Audit Review Board"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Owners</Label>
              <Input
                value={draft.owners}
                onChange={(event) => setDraft((current) => ({ ...current, owners: event.target.value }))}
                placeholder="List the group owners"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Describe the purpose and scope of this user group."
                rows={4}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Add Users</h3>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedUserCandidateKeys(new Set(draft.members.map((user) => keyForUser(user))))
                  setUserDialogSearch("")
                  setUserDialogOpen(true)
                }}
              >
                <IconUserPlus className="mr-1.5 size-4" />
                Add Users
              </Button>
            </div>
            {draft.members.length === 0 ? (
              <StatusState
                compact
                title="No users selected"
                description="Open the member picker to add users to this group."
              />
            ) : (
              <DataTable<AccessUser>
                columns={memberColumns}
                data={draft.members}
                rowKey={(user) => keyForUser(user)}
                paginated
              />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Attach Permission Policies</h3>
              <Button variant="outline" onClick={openAttachPicker}>
                <IconPlus className="mr-1.5 size-4" />
                Add Permissions
              </Button>
            </div>
            {draft.policies.length === 0 ? (
              <StatusState
                compact
                title="No policies selected"
                description="Attached group policies will appear here once you choose them."
              />
            ) : (
              <DataTable<AccessPolicy>
                columns={permissionColumns}
                data={draft.policies}
                rowKey={(policy) => keyForPolicy(policy)}
                paginated
              />
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => setView(backTarget)}>
            Cancel
          </Button>
          <Button className="melp-radius" disabled={saving} onClick={handleSaveGroup}>
            {saving ? <IconLoader2 className="mr-1.5 size-4 animate-spin" /> : null}
            {editorMode === "create" ? "Create User Group" : "Save Group"}
          </Button>
        </div>

        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Users to Group</DialogTitle>
              <DialogDescription>
                Search users and choose who should belong to this access group.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative w-full">
                <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users…"
                  value={userDialogSearch}
                  onChange={(event) => setUserDialogSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
              {userCandidatesStatusCode ? (
                <StatusState code={userCandidatesStatusCode} description={userCandidatesStatusMessage} />
              ) : (
                <DataTable<AccessUser>
                  columns={dialogMemberColumns}
                  data={userCandidates}
                  rowKey={(user) => keyForUser(user)}
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
                      description={
                        userDialogSearch
                          ? "Try another keyword or clear the search."
                          : "This dialog is ready for live user search results in the current domain."
                      }
                    />
                  }
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApplyUserSelection}>Add Selected Users</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

    if (detailStatusCode || !selectedGroup) {
      return (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          <div className="space-y-3">
            <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView("list")}>
              <IconArrowLeft className="size-4" />
              Back to User Groups
            </Button>
            <div>
              <h1 className="text-2xl font-bold">User Group Detail</h1>
              <p className="text-sm text-muted-foreground">
                The selected group could not be loaded right now.
              </p>
            </div>
          </div>

          <StatusState
            code={detailStatusCode}
            description={detailStatusMessage}
            actionSlot={<StatusStateActions secondaryLabel="Back" onSecondaryClick={() => setView("list")} />}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setView("list")}>
            <IconArrowLeft className="size-4" />
            Back to User Groups
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">{selectedGroup.name}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedGroup.description || "This group does not have a description yet."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={openEditEditor}>
                <IconEdit className="mr-1.5 size-4" />
                Edit Group
              </Button>
              <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDeleteCurrentGroup}>
                {deleting ? (
                  <IconLoader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <IconTrash className="mr-1.5 size-4" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{selectedGroup.createdAt}</Badge>
          <Badge variant="secondary" className="border-0">
            {groupMembers.length} members
          </Badge>
          <Badge variant="secondary" className="border-0">
            {groupPolicies.length} policies
          </Badge>
        </div>

        <Tabs defaultValue="users">
          <TabsList variant="line">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={openEditEditor}>
                <IconUserPlus className="mr-1.5 size-4" />
                Add Users
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={saving || selectedMemberKeys.size === 0}
                onClick={handleRemoveMembers}
              >
                {saving ? (
                  <IconLoader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <IconTrash className="mr-1.5 size-4" />
                )}
                Remove Selected
              </Button>
            </div>
            <DataTable<AccessUser>
              columns={memberColumns}
              data={groupMembers}
              rowKey={(user) => keyForUser(user)}
              paginated
              selectable
              selectedKeys={selectedMemberKeys}
              onSelectionChange={setSelectedMemberKeys}
              emptyState={
                <StatusState
                  compact
                  title="No members assigned yet"
                  description="Group membership data is empty right now."
                />
              }
            />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={openEditEditor}>
                <IconPlus className="mr-1.5 size-4" />
                Add Permissions
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={saving || selectedPolicyKeys.size === 0}
                onClick={handleRemovePolicies}
              >
                {saving ? (
                  <IconLoader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <IconTrash className="mr-1.5 size-4" />
                )}
                Remove Selected
              </Button>
            </div>
            <DataTable<AccessPolicy>
              columns={permissionColumns}
              data={groupPolicies}
              rowKey={(policy) => keyForPolicy(policy)}
              onRowClick={(policy) => void loadPolicyDetail(policy.id)}
              paginated
              selectable
              selectedKeys={selectedPolicyKeys}
              onSelectionChange={setSelectedPolicyKeys}
              emptyState={
                <StatusState
                  compact
                  title="No policies attached yet"
                  description="Attach policies to define the access model for this group."
                />
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Groups</h1>
          <p className="text-sm text-muted-foreground">
            Manage access groups, group members, and attached policies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={deleting || selectedGroupKeys.size === 0}
            onClick={handleDeleteSelectedGroups}
          >
            {deleting ? (
              <IconLoader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <IconTrash className="mr-1.5 size-4" />
            )}
            Delete Selected
          </Button>
          <Button size="sm" className="melp-radius" onClick={openCreateEditor}>
            <IconPlus className="mr-1.5 size-4" />
            Create User Group
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search user groups…"
            value={groupSearch}
            onChange={(event) => setGroupSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex-1" />
        <Badge variant="secondary" className="border-0 text-[10px] px-1.5 py-0">
          {groups.length} groups
        </Badge>
      </div>

      {groupsStatusCode ? (
        <StatusState
          code={groupsStatusCode}
          title={groupsStatusCode === 204 ? "No user groups returned yet" : undefined}
          description={groupsStatusCode === 204 ? undefined : groupsStatusMessage}
          actionSlot={<StatusStateActions primaryLabel="Open Create Group" onPrimaryClick={openCreateEditor} />}
        />
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
              title={groupSearch ? "No groups match this search" : "No user groups created yet"}
              description={
                groupSearch
                  ? "Try another keyword or clear the search."
                  : "Create your first user group to start assigning members and policies."
              }
            />
          }
        />
      )}
    </div>
  )
}
