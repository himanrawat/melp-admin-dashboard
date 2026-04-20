import { useMemo, useState, type ReactNode } from "react"
import {
  IconArrowLeft,
  IconCalendarTime,
  IconChevronLeft,
  IconChevronRight,
  IconInbox,
  IconLayersIntersect,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUsersGroup,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

import type { AccessEntityType, AccessPolicy, AccessUser } from "@/components/access-management/types"

export type AccessPreviewState =
  | "empty"
  | "search-empty"
  | "204"
  | "401"
  | "403"
  | "404"
  | "500"

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function EntityTypeBadge({ type }: Readonly<{ type: AccessEntityType }>) {
  const styles: Record<AccessEntityType, string> = {
    User: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    "User Group": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    Domain: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  }

  return (
    <Badge variant="secondary" className={cn("border-0", styles[type])}>
      {type}
    </Badge>
  )
}

export function RiskBadge({ risk }: Readonly<{ risk: AccessPolicy["risk"] }>) {
  const styles: Record<AccessPolicy["risk"], string> = {
    Core: "bg-info/10 text-info",
    Sensitive: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    Operational: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  }

  return (
    <Badge variant="secondary" className={cn("border-0", styles[risk])}>
      {risk}
    </Badge>
  )
}

export function ManagementHero({
  eyebrow = "Access Management",
  title,
  description,
  meta,
  actionSlot,
}: Readonly<{
  eyebrow?: string
  title: string
  description: string
  meta?: ReactNode
  actionSlot?: ReactNode
}>) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {eyebrow}
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
          </div>
          {actionSlot ? <div className="flex flex-wrap items-center gap-2">{actionSlot}</div> : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
}: Readonly<{
  label: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}>) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export function SectionCard({
  title,
  description,
  actionSlot,
  children,
}: Readonly<{
  title: string
  description?: string
  actionSlot?: ReactNode
  children: ReactNode
}>) {
  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-col gap-4 border-b border-border/70 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actionSlot ? <div className="flex flex-wrap items-center gap-2">{actionSlot}</div> : null}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: Readonly<{
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}>) {
  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  )
}

export function PageSizePopover({
  value,
  onValueChange,
}: Readonly<{
  value: number
  onValueChange: (value: number) => void
}>) {
  const options = [10, 25, 50]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Page Size
          <Badge variant="secondary" className="ml-1 border-0">
            {value}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-2">
        <div className="space-y-1">
          {options.map((option) => (
            <Button
              key={option}
              variant={option === value ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-between"
              onClick={() => onValueChange(option)}
            >
              <span>{option} rows</span>
              {option === value ? <Badge variant="secondary">Active</Badge> : null}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function TableEmptyState({
  title,
  description,
  colSpan,
}: Readonly<{
  title: string
  description: string
  colSpan: number
}>) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="p-0">
        <Empty className="border-0 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <div className="flex items-center justify-center rounded-xl bg-muted p-3 text-muted-foreground">
                <IconInbox className="size-5" />
              </div>
            </EmptyMedia>
            <EmptyTitle className="text-base">{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </TableCell>
    </TableRow>
  )
}

export function TablePagination({
  countLabel,
  pageSize,
  onPageSizeChange,
}: Readonly<{
  countLabel: string
  pageSize: number
  onPageSizeChange: (value: number) => void
}>) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{countLabel}</p>
      <div className="flex flex-wrap items-center gap-2">
        <PageSizePopover value={pageSize} onValueChange={onPageSizeChange} />
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" disabled>
            <IconChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" className="min-w-10">
            1
          </Button>
          <Button variant="outline" size="icon-sm" disabled>
            <IconChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SubviewHeader({
  label,
  title,
  description,
  onBack,
  actionSlot,
}: Readonly<{
  label: string
  title: string
  description: string
  onBack: () => void
  actionSlot?: ReactNode
}>) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={onBack}>
              <IconArrowLeft className="size-4" />
              {label}
            </Button>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          </div>
          {actionSlot ? <div className="flex flex-wrap items-center gap-2">{actionSlot}</div> : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function UserAvatarStack({ users }: Readonly<{ users: AccessUser[] }>) {
  const showAll = users.length <= 3
  const visible = showAll ? users : users.slice(0, 2)
  const remaining = users.length - visible.length

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex cursor-pointer">
            <AvatarGroup>
              {visible.map((user) => (
                <Avatar key={user.id} size="sm">
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              ))}
              {remaining > 0 ? <AvatarGroupCount>+{remaining}</AvatarGroupCount> : null}
            </AvatarGroup>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-60">
          <div className="flex flex-col gap-0.5">
            {users.map((user) => (
              <span key={user.id}>{user.name}</span>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function ModuleFeatureBadge({ limit }: Readonly<{ limit: "Allow" | "Deny" | "Conditional" }>) {
  const styles = {
    Allow: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    Deny: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    Conditional: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  }

  return (
    <Badge variant="secondary" className={cn("border-0", styles[limit])}>
      {limit}
    </Badge>
  )
}

export function PolicyDetailView({
  policy,
  onBack,
  onEdit,
  onDelete,
  onAttachEntity,
  onDetachEntities,
}: Readonly<{
  policy: AccessPolicy
  onBack: () => void
  onEdit?: () => void
  onDelete?: () => void
  onAttachEntity?: (type: AccessEntityType) => void
  onDetachEntities?: (entityIds: string[]) => void
}>) {
  const [permissionSearch, setPermissionSearch] = useState("")
  const [entitySearch, setEntitySearch] = useState("")
  const [selectedEntities, setSelectedEntities] = useState<string[]>([])

  const filteredModules = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase()
    if (!query) return policy.modules

    return policy.modules.filter((module) => {
      if (module.name.toLowerCase().includes(query)) return true
      return module.features.some((feature) => {
        return (
          feature.name.toLowerCase().includes(query) ||
          feature.description.toLowerCase().includes(query)
        )
      })
    })
  }, [permissionSearch, policy.modules])

  const filteredEntities = useMemo(() => {
    const query = entitySearch.trim().toLowerCase()
    if (!query) return policy.entities

    return policy.entities.filter((entity) => {
      return (
        entity.name.toLowerCase().includes(query) ||
        entity.type.toLowerCase().includes(query.toLowerCase()) ||
        entity.secondary.toLowerCase().includes(query)
      )
    })
  }, [entitySearch, policy.entities])

  const entityIds = filteredEntities.map((entity) => entity.id)
  const allEntitiesSelected = entityIds.length > 0 && entityIds.every((id) => selectedEntities.includes(id))

  const toggleEntity = (id: string) => {
    setSelectedEntities((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )
  }

  const toggleAllEntities = () => {
    setSelectedEntities(allEntitiesSelected ? [] : entityIds)
  }

  return (
    <div className="flex flex-col gap-6">
      <SubviewHeader
        label="Back"
        title={policy.name}
        description={policy.description}
        onBack={onBack}
        actionSlot={
          <>
            {onEdit ? (
              <Button variant="outline" onClick={onEdit}>
                Edit Policy
              </Button>
            ) : null}
            {onDelete ? (
              <Button variant="destructive" onClick={onDelete}>
                <IconTrash className="size-4" />
                Delete Policy
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Modules"
          value={String(policy.modules.length)}
          description="Permission modules included in this policy."
          icon={IconLayersIntersect}
        />
        <StatCard
          label="Attached Entities"
          value={String(policy.entities.length)}
          description="Users, groups, or domains covered by this policy."
          icon={IconUsersGroup}
        />
        <StatCard
          label="Created"
          value={policy.createdAt}
          description="Initial policy creation date in the legacy access model."
          icon={IconCalendarTime}
        />
      </div>

      <Card className="border-border/70">
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge risk={policy.risk} />
            <Badge variant="outline">{policy.modules.length} modules</Badge>
            <Badge variant="outline">{policy.entities.length} attached entities</Badge>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            This shared policy detail surface will be reused anywhere the SPA drilled into a policy, including
            the Policies list, User Groups permissions view, and Domain Access.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="permissions">
        <TabsList variant="line">
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-4">
          <SectionCard
            title="Permission Modules"
            description="Every selected module mirrors the SPA structure of module + feature access rules."
            actionSlot={
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <SearchField
                  value={permissionSearch}
                  onChange={setPermissionSearch}
                  placeholder="Search modules or features"
                  className="sm:w-72"
                />
                {onEdit ? (
                  <Button variant="outline" onClick={onEdit}>
                    Edit Permissions
                  </Button>
                ) : null}
              </div>
            }
          >
            <div className="grid gap-4 p-4">
              {filteredModules.map((module) => (
                <Card key={module.id} className="border-border/70">
                  <CardHeader className="gap-3 border-b border-border/70 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{module.name}</CardTitle>
                        <CardDescription className="mt-1">{module.description}</CardDescription>
                      </div>
                      <Badge variant="outline">{module.scope}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-4">Feature</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="pr-4 text-right">Rule</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {module.features.map((feature) => (
                          <TableRow key={feature.id}>
                            <TableCell className="px-4 font-medium">{feature.name}</TableCell>
                            <TableCell className="whitespace-normal text-sm text-muted-foreground">
                              {feature.description}
                            </TableCell>
                            <TableCell>
                              <Badge variant={feature.enabled ? "secondary" : "outline"} className="border-0">
                                {feature.enabled ? "Enabled" : "Disabled"}
                              </Badge>
                            </TableCell>
                            <TableCell className="pr-4 text-right">
                              <ModuleFeatureBadge limit={feature.limit} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="entities" className="space-y-4">
          <SectionCard
            title="Attached Entities"
            description="The same policy can be attached to users, user groups, or domains."
            actionSlot={
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <SearchField
                  value={entitySearch}
                  onChange={setEntitySearch}
                  placeholder="Search attached entities"
                  className="sm:w-72"
                />
                {onAttachEntity ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        <IconPlus className="size-4" />
                        Attach Entity
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Choose entity type</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onAttachEntity("User")}>Attach User</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAttachEntity("User Group")}>
                        Attach User Group
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAttachEntity("Domain")}>Attach Domain</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
                <Button
                  variant="outline"
                  disabled={selectedEntities.length === 0}
                  onClick={() => onDetachEntities?.(selectedEntities)}
                >
                  Detach Selected
                </Button>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 px-4">
                      <Checkbox checked={allEntitiesSelected} onCheckedChange={toggleAllEntities} />
                    </TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="pr-4 text-right">Attached</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntities.length === 0 ? (
                    <TableEmptyState
                      colSpan={5}
                      title="No attached entities match this search"
                      description="Phase 1 keeps the interaction local, but the final shape of the entities table is ready for real data."
                    />
                  ) : (
                    filteredEntities.map((entity) => (
                      <TableRow key={entity.id}>
                        <TableCell className="px-4">
                          <Checkbox
                            checked={selectedEntities.includes(entity.id)}
                            onCheckedChange={() => toggleEntity(entity.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{entity.name}</TableCell>
                        <TableCell>
                          <EntityTypeBadge type={entity.type} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entity.secondary}</TableCell>
                        <TableCell className="pr-4 text-right text-sm text-muted-foreground">{entity.attachedAt}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function SelectionCount({ count, noun }: Readonly<{ count: number; noun: string }>) {
  return (
    <Badge variant="secondary" className="border-0">
      {count} {noun}
    </Badge>
  )
}

export function PreviewStateSelect({
  value,
  onValueChange,
}: Readonly<{
  value: AccessPreviewState
  onValueChange: (value: AccessPreviewState) => void
}>) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as AccessPreviewState)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Preview state" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="empty">Empty State</SelectItem>
        <SelectItem value="search-empty">Search Empty</SelectItem>
        <SelectItem value="204">204 No Content</SelectItem>
        <SelectItem value="401">401 Unauthorized</SelectItem>
        <SelectItem value="403">403 Forbidden</SelectItem>
        <SelectItem value="404">404 Not Found</SelectItem>
        <SelectItem value="500">500 Error</SelectItem>
      </SelectContent>
    </Select>
  )
}
