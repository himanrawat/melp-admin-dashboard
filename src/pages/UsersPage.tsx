import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react"
import { IconUserPlus, IconUpload, IconLoader2 } from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { usePopup } from "@/components/shared/popup"
import { type User } from "@/components/users/users-data"
import { UsersToolbar, type UserFilters, EMPTY_FILTERS } from "@/components/users/users-toolbar"
import { UsersDataTable, DEFAULT_VISIBLE_COLS, type ColKey } from "@/components/users/users-data-table"
import { AddUserInline, type AddUserDraft } from "@/components/users/add-user-inline"
import { BulkUploadInline } from "@/components/users/bulk-upload-inline"
import { InviteDialog } from "@/components/users/user-confirm-dialogs"
import {
  fetchUsers,
  manualInviteUsers,
  bulkInviteUsers,
  activateAdmin,
  deactivateAdmin,
  fetchDepartments,
  fetchTitles,
  exportUsers,
} from "@/api/admin"
import { getErrorDescription, getStatusCodeFromError } from "@/components/access-management/runtime"
import { useAuth } from "@/context/auth-context"

type UserTab = "all" | "active" | "inactive" | "admin"

const MIN_COLS = 4
const DEFAULT_PAGE_SIZE = 10
const DEFAULT_SORT = { column: "FULL_NAME", asc: true } as const

const compareAlphabetically = (left: string, right: string) =>
  left.localeCompare(right, undefined, { sensitivity: "base" })

const getCategoryForTab = (tab: UserTab): 0 | 1 | 2 | 3 | undefined => {
  if (tab === "all") return 0
  if (tab === "active") return 1
  if (tab === "inactive") return 2
  if (tab === "admin") return 3
  return undefined
}

const getFallbackStatusForTab = (
  tab: UserTab,
): "active" | "inactive" | undefined => {
  if (tab === "active") return "active"
  if (tab === "inactive") return "inactive"
  return undefined
}

const toTextValue = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed || undefined
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }
  return undefined
}

const pickTextValue = (...values: unknown[]): string => {
  for (const value of values) {
    const textValue = toTextValue(value)
    if (textValue) return textValue
  }
  return ""
}

const buildFullName = (firstName: unknown, lastName: unknown): string => {
  return [toTextValue(firstName), toTextValue(lastName)].filter(Boolean).join(" ").trim()
}

const formatDateValue = (value: unknown): string => {
  const raw = toTextValue(value)
  if (!raw || raw === "0") return ""

  let date: Date
  if (/^\d+$/.test(raw)) {
    const num = Number(raw)
    if (!Number.isFinite(num) || num <= 0) return ""
    const millis = raw.length <= 10 ? num * 1000 : num
    date = new Date(millis)
  } else {
    date = new Date(raw)
  }

  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

const toStatus = (
  raw: Record<string, unknown>,
  fallback?: "active" | "inactive",
): User["status"] => {
  if (fallback) return fallback

  const activeValue = raw.isActive ?? raw.isactive ?? raw.active
  const normalized =
    typeof activeValue === "string"
      ? activeValue.trim().toUpperCase()
      : activeValue

  if (
    normalized === "Y" ||
    normalized === "YES" ||
    normalized === "1" ||
    normalized === 1 ||
    normalized === true
  ) {
    return "active"
  }

  if (raw.status === "active" || raw.status === 1) return "active"
  return "inactive"
}

const isAdminUser = (raw: Record<string, unknown>): boolean => {
  const value = raw.adminStatus ?? raw.adminstatus ?? raw.isAdmin ?? raw.role
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    return normalized === "y" || normalized === "yes" || normalized === "1" || normalized === "admin" || normalized === "super" || normalized === "true"
  }
  return false
}

const isVerifiedUser = (raw: Record<string, unknown>): boolean | undefined => {
  const value = raw.verified ?? raw.isVerified ?? raw.isverified ?? raw.emailVerified ?? raw.verifiedStatus
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["y", "yes", "1", "true", "verified", "active"].includes(normalized)) return true
    if (["n", "no", "0", "false", "pending", "unverified", "inactive"].includes(normalized)) return false
  }
  return undefined
}

const mapUser = (
  raw: Record<string, unknown>,
  idx: number,
  fallback?: "active" | "inactive",
): User => {
  const fallbackId = `${fallback || "user"}-${idx}`
  const fullName = buildFullName(raw.firstname, raw.lastname)

  return {
    id: pickTextValue(raw.melpid, raw.userid, raw.userId, raw.id, raw.extension) || fallbackId,
    userId: pickTextValue(raw.userid, raw.userId, raw.id),
    melpid: pickTextValue(raw.melpid),
    name: pickTextValue(raw.fullname, raw.name, raw.fullName, fullName) || "Unknown",
    email: pickTextValue(raw.email, raw.emailid),
    avatar: pickTextValue(raw.imageUrl, raw.profileImage, raw.profile, raw.avatar),
    isAdmin: isAdminUser(raw),
    department: pickTextValue(raw.departmentName, raw.department, raw.dept) || "General",
    designation: pickTextValue(raw.professionName, raw.designation, raw.title),
    location: pickTextValue(raw.location, raw.cityname, raw.city),
    status: toStatus(raw, fallback),
    joinedAt: formatDateValue(pickTextValue(raw.addedOn, raw.createdDate, raw.createdate, raw.joinedAt)),
    deactivateDate: formatDateValue(pickTextValue(raw.deactived_on, raw.deactivatedOn)),
    verified: isVerifiedUser(raw),
  }
}

const formatFilterDate = (date: Date): string => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
}

const formatDateRangeFilter = (range: UserFilters["joiningDateRange"]): string | undefined => {
  if (!range?.from) return undefined
  const end = range.to ?? range.from
  return `${formatFilterDate(range.from)},${formatFilterDate(end)}`
}

const buildUserFilters = (
  search: string,
  filters: UserFilters,
): { column: string; value: string }[] => {
  const next: { column: string; value: string }[] = []
  const query = search.trim()

  if (query) {
    next.push(
      { column: "FULL_NAME", value: query },
      { column: "EMAIL", value: query },
    )
  }

  if (filters.department) {
    next.push({ column: "DEPARTMENT_NAME", value: filters.department })
  }

  if (filters.designation) {
    next.push({ column: "PROFESSION_NAME", value: filters.designation })
  }

  const joiningDate = formatDateRangeFilter(filters.joiningDateRange)
  if (joiningDate) {
    next.push({ column: "ADDED_ON", value: joiningDate })
  }

  const deactiveDate = formatDateRangeFilter(filters.deactiveDateRange)
  if (deactiveDate) {
    next.push({ column: "DEACTIVED_ON", value: deactiveDate })
  }

  return next
}

const extractLookupItems = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw

  const obj = raw as Record<string, unknown> | null
  if (!obj) return []

  if (Array.isArray(obj.list)) return obj.list
  if (Array.isArray(obj.data)) return obj.data

  const nestedData = obj.data as Record<string, unknown> | undefined
  if (nestedData && typeof nestedData === "object" && Array.isArray(nestedData.list)) {
    return nestedData.list
  }

  return []
}

const parseLookupOptions = (raw: unknown, keys: string[]): string[] => {
  const values = extractLookupItems(raw)
    .map((item) => {
      if (typeof item === "string") return item.trim()
      if (typeof item === "number" && Number.isFinite(item)) return String(item)
      if (!item || typeof item !== "object") return undefined

      const record = item as Record<string, unknown>
      for (const key of keys) {
        const value = toTextValue(record[key])
        if (value) return value
      }

      return undefined
    })
    .filter((value): value is string => Boolean(value))

  return [...new Set(values)].sort(compareAlphabetically)
}

const mergeLookupOptions = (...sources: string[][]): string[] => {
  return [...new Set(sources.flat().filter(Boolean))].sort(compareAlphabetically)
}

export function UsersPage() {
  const { selectedClient } = useAuth()
  const { success: showSuccess } = usePopup()

  const getBulkUploadFeedback = (error: unknown): string => {
    const statusCode = getStatusCodeFromError(error)
    const apiMessage = getErrorDescription(error)

    if (apiMessage && !/^\d{3}$/.test(apiMessage.trim())) {
      return apiMessage
    }

    switch (statusCode) {
      case 204:
        return "The file was received, but no users were added. Check that it contains valid user rows and try again."
      case 400:
        return "We couldn't process this file. Check the template format and required columns, then try again."
      case 401:
        return "Your session expired while uploading. Sign in again and retry the upload."
      case 403:
        return "You don't have permission to bulk upload users for this account."
      case 404:
        return "The bulk upload service is unavailable right now. Try again in a moment."
      case 409:
        return "Some users in this file already exist or conflict with current records. Review the file and retry."
      case 500:
        return "We couldn't complete the bulk upload right now. Try again in a moment."
      default:
        return "Bulk upload failed. Please review the file and try again."
    }
  }

  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [designations, setDesignations] = useState<string[]>([])
  const [filterOptionsClientId, setFilterOptionsClientId] = useState<string | null>(null)
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [activeTab, setActiveTab] = useState<UserTab>("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filters, setFilters] = useState<UserFilters>(EMPTY_FILTERS)
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE_COLS))
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [serverPage, setServerPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [responsePageCount, setResponsePageCount] = useState(1)
  const [responseTotalCount, setResponseTotalCount] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)

  const filterKey = useMemo(() => JSON.stringify({
    department: filters.department,
    designation: filters.designation,
    joiningFrom: filters.joiningDateRange?.from?.toISOString() || "",
    joiningTo: filters.joiningDateRange?.to?.toISOString() || "",
    deactiveFrom: filters.deactiveDateRange?.from?.toISOString() || "",
    deactiveTo: filters.deactiveDateRange?.to?.toISOString() || "",
  }), [filters])

  const userFilters = useMemo(
    () => buildUserFilters(debouncedSearch, filters),
    [debouncedSearch, filters],
  )

  const activeCategory = getCategoryForTab(activeTab)
  const activeFallbackStatus = getFallbackStatusForTab(activeTab)

  const totalRows = responseTotalCount > 0
    ? responseTotalCount
    : responsePageCount > 0 && serverPage === responsePageCount - 1
      ? serverPage * pageSize + users.length
      : responsePageCount > 1
        ? responsePageCount * pageSize
        : users.length

  const pageCount = Math.max(
    1,
    responsePageCount || (totalRows > 0 ? Math.ceil(totalRows / pageSize) : 1),
  )

  const departmentOptions = useMemo(
    () => mergeLookupOptions(departments, users.map((user) => user.department).filter(Boolean)),
    [departments, users],
  )

  const designationOptions = useMemo(
    () => mergeLookupOptions(designations, users.map((user) => user.designation).filter(Boolean)),
    [designations, users],
  )

  const handleFilterOpenChange = useCallback((open: boolean) => {
    if (!open || !selectedClient || filterOptionsLoading || filterOptionsClientId === selectedClient) {
      return
    }

    setFilterOptionsLoading(true)

    void Promise.allSettled([
      fetchDepartments(selectedClient),
      fetchTitles(selectedClient),
    ]).then(([departmentsResult, titlesResult]) => {
      if (departmentsResult.status === "fulfilled") {
        setDepartments(
          parseLookupOptions(departmentsResult.value, [
            "departmentName",
            "department",
            "name",
            "label",
            "value",
          ]),
        )
      } else {
        setDepartments([])
      }

      if (titlesResult.status === "fulfilled") {
        setDesignations(
          parseLookupOptions(titlesResult.value, [
            "professionName",
            "designation",
            "title",
            "name",
            "label",
            "value",
          ]),
        )
      } else {
        setDesignations([])
      }

      setFilterOptionsClientId(selectedClient)
      setFilterOptionsLoading(false)
    }).catch((err) => {
      console.error("[UsersPage] filter lookup load failed:", err)
      setFilterOptionsLoading(false)
    })
  }, [filterOptionsClientId, filterOptionsLoading, selectedClient])

  const triggerReload = useCallback(() => {
    setReloadToken((prev) => prev + 1)
    setFilterOptionsClientId(null)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setServerPage(0)
  }, [activeTab, debouncedSearch, filterKey, selectedClient])

  useEffect(() => {
    setSelectedKeys(new Set())
  }, [activeTab, serverPage, pageSize, debouncedSearch, filterKey])

  useEffect(() => {
    setDepartments([])
    setDesignations([])
    setFilterOptionsClientId(null)
    setFilterOptionsLoading(false)
  }, [selectedClient])

  useEffect(() => {
    if (!selectedClient) {
      setUsers([])
      setResponsePageCount(1)
      setResponseTotalCount(0)
      setLoading(false)
      return
    }

    if (activeCategory === undefined) {
      setUsers([])
      setResponsePageCount(1)
      setResponseTotalCount(0)
      setLoading(false)
      return
    }

    let cancelled = false

    const loadUsers = async () => {
      setLoading(true)
      setError("")

      try {
        const pageResult = await fetchUsers({
          page: serverPage + 1,
          pageSize,
          clientid: selectedClient,
          category: activeCategory,
          filters: userFilters,
          sort: DEFAULT_SORT,
        })

        if (cancelled) return

        setUsers(
          pageResult.list
            .map((user, idx) =>
              mapUser(
                user as Record<string, unknown>,
                serverPage * pageSize + idx,
                activeFallbackStatus,
              ),
            )
            .filter((user) => activeTab !== "admin" || user.isAdmin),
        )
        setResponsePageCount(Number(pageResult.pageCount || 0))
        setResponseTotalCount(Number(pageResult.totalCount || 0))
      } catch (err) {
        console.error("[UsersPage] load failed:", err)
        if (!cancelled) {
          setError("Something went wrong while loading users. Please try again.")
          setUsers([])
          setResponsePageCount(1)
          setResponseTotalCount(0)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadUsers()
    return () => {
      cancelled = true
    }
  }, [
    activeCategory,
    activeFallbackStatus,
    activeTab,
    pageSize,
    reloadToken,
    selectedClient,
    serverPage,
    userFilters,
  ])

  const handleToggleCol = (key: ColKey) => {
    setVisibleCols((prev) => {
      if (prev.has(key) && prev.size <= MIN_COLS) return prev
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleAdd(rows: AddUserDraft[]): Promise<void> {
    const inviteUsers = rows
      .filter((r) => r.name.trim() || r.email.trim() || r.phone.trim())
      .map((r) => {
        const [firstName, ...rest] = r.name.trim().split(/\s+/)
        const lastName = rest.join(" ")
        return {
          email: r.email.trim(),
          name: r.name.trim(),
          firstName: firstName || r.name.trim(),
          lastName,
          phone: r.phone.trim(),
        }
      })

    try {
      await manualInviteUsers(inviteUsers)
      setServerPage(0)
      triggerReload()
      showSuccess("Users Added", `${inviteUsers.length} user${inviteUsers.length > 1 ? "s" : ""} added successfully.`)
    } catch (err) {
      console.error("[UsersPage] add user failed:", err)
      throw new Error("Failed to add user. Please try again.")
    }
  }

  function handleToggleStatus(id: string, newStatus: "active" | "inactive") {
    setUsers((prev) => prev.map((user) => (
      user.id === id ? { ...user, status: newStatus } : user
    )))
  }

  function handleEdit(updated: User) {
    setUsers((prev) => prev.map((user) => (
      user.id === updated.id ? updated : user
    )))
  }

  async function handleToggleAdmin(id: string, userId: string, makeAdmin: boolean) {
    if (!selectedClient) return

    try {
      if (makeAdmin) {
        await activateAdmin(selectedClient, userId)
      } else {
        await deactivateAdmin(selectedClient, userId)
      }

      setUsers((prev) => prev.map((user) => (
        user.id === id ? { ...user, isAdmin: makeAdmin } : user
      )))

      toast.success(makeAdmin ? "Admin privileges granted." : "Admin privileges removed.")
    } catch (err) {
      console.error("[UsersPage] toggle admin failed:", err)
      toast.error(makeAdmin ? "Failed to grant admin privileges. Please try again." : "Failed to remove admin privileges. Please try again.")
    }
  }

  const handleExportUsersData = useCallback(async () => {
    if (!selectedClient) return

    if (activeCategory === undefined) {
      return
    }

    try {
      const { blob, filename } = await exportUsers({
        clientid: Number(selectedClient),
        category: activeCategory,
        filters: userFilters,
        sort: DEFAULT_SORT,
      })

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      const stamp = new Date().toISOString().slice(0, 10)
      anchor.href = url
      anchor.download = filename || `melp-users-${activeTab}-${stamp}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("[UsersPage] export failed:", err)
      toast.error(getErrorDescription(err) || "Failed to export users.")
    }
  }, [activeCategory, activeTab, selectedClient, userFilters])

  async function handleBulkFileSelected(file: File) {
    const allowedTypes = new Set([
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ])
    const ext = file.name.toLowerCase()
    const hasAllowedExt = ext.endsWith(".csv") || ext.endsWith(".xlsx") || ext.endsWith(".xls")
    const hasAllowedType = allowedTypes.has(file.type)

    if (!(hasAllowedExt || hasAllowedType)) {
      toast.error("Please upload a CSV or Excel file only.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maximum upload file size is 5 MB.")
      return
    }

    try {
      setBulkUploading(true)
      await bulkInviteUsers(file, true)
      setServerPage(0)
      triggerReload()
      setBulkOpen(false)
      toast.success("Users were uploaded successfully.")
    } catch (err) {
      toast.error(getBulkUploadFeedback(err))
    } finally {
      setBulkUploading(false)
    }
  }

  const tableProps = {
    visibleCols,
    loading,
    page: serverPage,
    pageCount,
    pageSize,
    totalRows,
    onPageChange: (page: number) => setServerPage(page),
    onPageSizeChange: (size: number) => {
      setPageSize(size)
      setServerPage(0)
    },
    onToggleStatus: handleToggleStatus,
    onToggleAdmin: handleToggleAdmin,
    onEdited: handleEdit,
    onAdd: () => setAddOpen(true),
    onInvite: () => setInviteOpen(true),
    selectable: true,
    selectedKeys,
    onSelectionChange: setSelectedKeys,
  }

  let mainContent: ReactNode = null
  if (addOpen) {
    mainContent = (
      <AddUserInline
        onSubmitAll={handleAdd}
        onCancel={() => setAddOpen(false)}
      />
    )
  } else if (!bulkOpen) {
    mainContent = (
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as UserTab)}>
        <TabsList variant="line">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <UsersToolbar
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          departments={departmentOptions}
          designations={designationOptions}
          visibleCols={visibleCols}
          onToggleCol={handleToggleCol}
          onExport={() => { void handleExportUsersData() }}
          onFilterOpenChange={handleFilterOpenChange}
          minCols={MIN_COLS}
        />

        <TabsContent value="all" className="mt-4">
          <UsersDataTable users={users} tab="all" {...tableProps} />
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          <UsersDataTable users={users} tab="active" {...tableProps} />
        </TabsContent>
        <TabsContent value="inactive" className="mt-4">
          <UsersDataTable users={users} tab="inactive" {...tableProps} />
        </TabsContent>
        <TabsContent value="admin" className="mt-4">
          <UsersDataTable users={users} tab="admin" {...tableProps} />
        </TabsContent>
      </Tabs>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={triggerReload}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage and monitor all users across your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={bulkUploading}
            onClick={() => {
              setBulkOpen(!bulkOpen)
              setAddOpen(false)
            }}
            className={bulkOpen ? "bg-muted" : ""}
          >
            {bulkUploading ? <IconLoader2 className="size-4 mr-1.5 animate-spin" /> : <IconUpload className="size-4 mr-1.5" />}
            Bulk Upload
          </Button>
          <Button
            size="sm"
            className="melp-radius"
            onClick={() => {
              setAddOpen(!addOpen)
              setBulkOpen(false)
            }}
            variant={addOpen ? "secondary" : "default"}
          >
            <IconUserPlus className="size-4 mr-1.5" />
            Add User
          </Button>
        </div>
      </div>

      {bulkOpen && (
        <BulkUploadInline
          onFileSelected={(file) => void handleBulkFileSelected(file)}
          onCancel={() => setBulkOpen(false)}
          uploading={bulkUploading}
        />
      )}
      {mainContent}
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}
