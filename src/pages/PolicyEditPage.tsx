import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  IconArrowLeft,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconClipboardList,
  IconLoader2,
  IconPencil,
  IconSearch,
  IconShieldLock,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createPolicy, fetchPolicyById, fetchPolicyFeatures, updatePolicy } from "@/api/admin"
import {
  getErrorDescription,
  mapFeatureLibrary,
  mapPolicyDetail,
} from "@/components/access-management/runtime"
import type { AccessFeature, AccessModule, AccessPolicy } from "@/components/access-management/types"
import { useAuth } from "@/context/auth-context"

// ── Types ────────────────────────────────────────────────────────

type Mode = "create" | "edit"
type Selections = Record<string, AccessFeature["limit"]>

const DESCRIPTION_MAX = 200
const DESCRIPTION_RE = /^[a-zA-Z0-9\s.,()&/\-_:]+$/

// ── Page ─────────────────────────────────────────────────────────

export function PolicyEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedClient } = useAuth()
  const mode: Mode = id ? "edit" : "create"

  const [policy, setPolicy] = useState<AccessPolicy | null>(null)
  const [pageLoading, setPageLoading] = useState(mode === "edit")
  const [pageError, setPageError] = useState("")

  const [modules, setModules] = useState<AccessModule[]>([])
  const [modulesLoading, setModulesLoading] = useState(true)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selected, setSelected] = useState<Selections>({})
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState("")
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)

  // Review panel state
  const [reviewOpen, setReviewOpen] = useState(true)
  // Mobile step: "modules" | "features"
  const [mobileStep, setMobileStep] = useState<"modules" | "features">("modules")
  // Mobile review bottom sheet
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false)
  // Tablet review drawer
  const [tabletReviewOpen, setTabletReviewOpen] = useState(false)

  const hasUnsavedChanges = useRef(false)

  // Load policy (edit mode)
  useEffect(() => {
    if (mode !== "edit" || !id || !selectedClient) {
      setPageLoading(false)
      return
    }
    setPageLoading(true)
    fetchPolicyById(id, selectedClient)
      .then((raw) => {
        if (raw === null) { setPageError("Policy not found."); return }
        const p = mapPolicyDetail(raw)
        if (!p) { setPageError("Policy not found."); return }
        setPolicy(p)
        setName(p.name)
        setDescription(p.description)
        setSelected(seedSelections(p))
      })
      .catch((err) => setPageError(getErrorDescription(err) || "Unable to load this policy."))
      .finally(() => setPageLoading(false))
  }, [id, mode, selectedClient])

  // Load module library
  useEffect(() => {
    if (!selectedClient) return
    setModulesLoading(true)
    fetchPolicyFeatures(selectedClient)
      .then((raw) => setModules(raw === null ? [] : mapFeatureLibrary(raw)))
      .catch(() => setModules([]))
      .finally(() => setModulesLoading(false))
  }, [selectedClient])

  // Auto-select first module
  useEffect(() => {
    if (modules.length > 0 && !activeModuleId) {
      setActiveModuleId(modules[0].id)
    }
  }, [modules, activeModuleId])

  // Track unsaved changes
  useEffect(() => { hasUnsavedChanges.current = true }, [name, description, selected])

  const cleanName = name.trim()
  const cleanDescription = description.trim()
  const selectedCount = Object.keys(selected).length
  const validation = validate(cleanName, cleanDescription, selected)

  const { filteredModules, matchedFeatureIds } = useFilteredModules(modules, search)
  const activeModule = modules.find((m) => m.id === activeModuleId) ?? filteredModules[0] ?? null

  function toggleFeature(feature: AccessFeature, limit: AccessFeature["limit"]) {
    setSelected((cur) => {
      if (cur[feature.id] === limit) {
        const next = { ...cur }
        delete next[feature.id]
        return next
      }
      return { ...cur, [feature.id]: limit }
    })
  }

  function setModuleFeatures(module: AccessModule, limit: AccessFeature["limit"] | null) {
    setSelected((cur) => {
      const next = { ...cur }
      module.features.forEach((f) => {
        if (limit === null) delete next[f.id]
        else next[f.id] = limit
      })
      return next
    })
  }

  async function handleSave() {
    if (!validation.valid) { toast.error(validation.error); return }
    if (!selectedClient) return
    setSaving(true)
    try {
      const payload = {
        clientid: Number(selectedClient),
        policyName: cleanName,
        desc: cleanDescription,
        modules: buildRequestModules(modules, selected),
      }
      if (mode === "edit" && policy) {
        const editingId = policy.backendPolicyId || policy.id
        await updatePolicy(editingId, { ...payload, pkid: editingId })
        toast.success("Policy updated.")
        navigate(`/access/policies/${editingId}`)
      } else {
        await createPolicy(payload)
        toast.success("Policy created.")
        navigate("/access/policies")
      }
    } catch (err) {
      toast.error(getErrorDescription(err) || "Unable to save this policy right now.")
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (mode === "edit" && policy) navigate(`/access/policies/${policy.backendPolicyId || policy.id}`)
    else navigate("/access/policies")
  }

  // ── Loading / Error states ──────────────────────────────────────

  if (pageLoading) return <PageLoading />
  if (pageError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive">{pageError}</p>
          <Button variant="outline" size="sm" onClick={handleBack}>
            <IconArrowLeft className="size-4 mr-1.5" /> Back
          </Button>
        </div>
      </div>
    )
  }

  const reviewModules = modules.filter((m) => m.features.some((f) => selected[f.id]))
  const liveDisplayName = cleanName || (mode === "edit" ? "Edit Policy" : "New Policy")

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100svh-4rem)] overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="shrink-0 border-b bg-card px-4 lg:px-6 py-3 flex flex-col gap-3">
        {/* Row 1: back + breadcrumb + actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={handleBack} aria-label="Back">
              <IconArrowLeft className="size-4" />
            </Button>
            <Breadcrumb className="hidden sm:block">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <button type="button" onClick={() => navigate("/access/policies")}>Policies</button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                {mode === "edit" && policy && (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <button type="button" onClick={handleBack}>{liveDisplayName}</button>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                )}
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate max-w-48">
                    {mode === "edit" ? `Edit ${liveDisplayName}` : liveDisplayName}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <span className="sm:hidden text-sm font-semibold truncate max-w-40">
              {mode === "edit" ? `Edit ${liveDisplayName}` : liveDisplayName}
            </span>
          </div>
        </div>

        {/* Row 2: name + description (inline editable) + search */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 w-full justify-between py-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <InlineField
              id="policy-name"
              label="Policy Name"
              value={name}
              onChange={setName}
              placeholder="e.g. Operations Core Access"
              singleLine
              autoFocus={mode === "create"}
            />
            <InlineField
              id="policy-description"
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Describe who should use this policy and why."
              maxLength={DESCRIPTION_MAX}
              charCount={cleanDescription.length}
            />
          </div>

          {/* Search — right-aligned on sm+ */}
          <div className="relative w-full sm:w-64 shrink-0 sm:mt-0 mt-1">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search modules and permissions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <IconX className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content area ────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {modulesLoading ? (
          <div className="flex-1 p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : modules.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
            No permission modules available for this domain.
          </div>
        ) : (
          <>
            {/* ── Desktop: 2 col + review sidebar ───────────────── */}
            <div className="hidden lg:flex flex-1 min-w-0 overflow-hidden">
              {/* Module list */}
              <div className="w-64 xl:w-72 shrink-0 border-r flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto scrollbar-slim p-2">
                  {filteredModules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No modules match.</p>
                  ) : (
                    filteredModules.map((module) => (
                      <DesktopModuleItem
                        key={module.id}
                        module={module}
                        selected={selected}
                        active={activeModule?.id === module.id}
                        search={search}
                        onClick={() => setActiveModuleId(module.id)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Feature editor */}
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r">
                {activeModule ? (
                  <FeatureEditor
                    module={activeModule}
                    selected={selected}
                    search={search}
                    matchedFeatureIds={matchedFeatureIds}
                    onToggleFeature={toggleFeature}
                    onBulkSet={setModuleFeatures}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    Select a module to set permissions.
                  </div>
                )}
              </div>

              {/* Review sidebar */}
              <ReviewSidebar
                modules={reviewModules}
                selected={selected}
                open={reviewOpen}
                onToggle={() => setReviewOpen((v) => !v)}
              />
            </div>

            {/* ── Tablet: 2 col + bottom drawer ─────────────────── */}
            <div className="hidden md:flex lg:hidden flex-1 flex-col min-h-0 overflow-hidden">
              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Module list */}
                <div className="w-52 shrink-0 border-r flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto scrollbar-slim p-2">
                    {filteredModules.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No modules match.</p>
                    ) : (
                      filteredModules.map((module) => (
                        <DesktopModuleItem
                          key={module.id}
                          module={module}
                          selected={selected}
                          active={activeModule?.id === module.id}
                          search={search}
                          onClick={() => setActiveModuleId(module.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
                {/* Feature editor */}
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                  {activeModule ? (
                    <FeatureEditor
                      module={activeModule}
                      selected={selected}
                      search={search}
                      matchedFeatureIds={matchedFeatureIds}
                      onToggleFeature={toggleFeature}
                      onBulkSet={setModuleFeatures}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                      Select a module.
                    </div>
                  )}
                </div>
              </div>

              {/* Tablet bottom review drawer */}
              <TabletReviewDrawer
                modules={reviewModules}
                selected={selected}
                open={tabletReviewOpen}
                onToggle={() => setTabletReviewOpen((v) => !v)}
                totalRules={selectedCount}
              />
            </div>

            {/* ── Mobile: step-based flow ────────────────────────── */}
            <div className="flex md:hidden flex-1 flex-col min-h-0 overflow-hidden">
              {mobileStep === "modules" ? (
                <div className="flex-1 overflow-y-auto scrollbar-slim p-2">
                  {filteredModules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 px-4">No modules match your search.</p>
                  ) : (
                    filteredModules.map((module) => (
                      <MobileModuleItem
                        key={module.id}
                        module={module}
                        selected={selected}
                        search={search}
                        onClick={() => {
                          setActiveModuleId(module.id)
                          setMobileStep("features")
                        }}
                      />
                    ))
                  )}
                </div>
              ) : (
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="shrink-0 px-4 py-2.5 border-b flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMobileStep("modules")}
                      className="gap-1.5 text-sm"
                    >
                      <IconArrowLeft className="size-4" />
                      Modules
                    </Button>
                    {activeModule && (
                      <span className="font-medium text-sm truncate">{activeModule.name}</span>
                    )}
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {activeModule ? (
                      <FeatureEditor
                        module={activeModule}
                        selected={selected}
                        search={search}
                        matchedFeatureIds={matchedFeatureIds}
                        onToggleFeature={toggleFeature}
                        onBulkSet={setModuleFeatures}
                      />
                    ) : null}
                  </div>
                </div>
              )}

              {/* Mobile FAB */}
              <button
                type="button"
                onClick={() => setReviewSheetOpen(true)}
                className={cn(
                  "absolute bottom-6 right-5 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg",
                  "bg-primary text-primary-foreground text-sm font-medium",
                  "transition-transform active:scale-95 z-30",
                )}
                aria-label={`Review rules (${selectedCount})`}
              >
                <IconClipboardList className="size-4" />
                Review
                {selectedCount > 0 && (
                  <span className="bg-primary-foreground text-primary text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                    {selectedCount}
                  </span>
                )}
              </button>

              {/* Mobile bottom sheet */}
              <MobileReviewSheet
                modules={reviewModules}
                selected={selected}
                open={reviewSheetOpen}
                onClose={() => setReviewSheetOpen(false)}
                totalRules={selectedCount}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Fixed footer ─────────────────────────────────────────── */}
      <div className="shrink-0 border-t bg-background px-4 lg:px-6 py-3 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={handleBack} disabled={saving}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="melp-radius"
          onClick={handleSave}
          disabled={saving || !validation.valid}
        >
          {saving
            ? <IconLoader2 className="size-4 mr-1.5 animate-spin" />
            : ""}
          {mode === "create" ? "Create Policy" : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}

// ── InlineField ───────────────────────────────────────────────────

type InlineFieldProps = {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  singleLine?: boolean
  autoFocus?: boolean
  maxLength?: number
  charCount?: number
}

function InlineField({ id, label, value, onChange, placeholder, singleLine, autoFocus, maxLength, charCount }: Readonly<InlineFieldProps>) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
          {charCount !== undefined && maxLength !== undefined && (
            <span className="text-xs text-muted-foreground">{charCount}/{maxLength}</span>
          )}
        </div>
        {singleLine ? (
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-7 text-sm"
            autoFocus={autoFocus ?? true}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditing(false) }}
          />
        ) : (
          <Textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={2}
            maxLength={maxLength}
            className="text-sm resize-none py-1.5 min-h-14"
            autoFocus
            onBlur={() => setEditing(false)}
          />
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 text-left max-w-full w-fit"
      title={`Edit ${label}`}
    >
      {value ? (
        <span className={singleLine ? "text-sm font-medium truncate max-w-xs" : "text-xs text-muted-foreground truncate max-w-sm"}>
          {value}
        </span>
      ) : (
        <span className={`${singleLine ? "text-sm" : "text-xs"} text-muted-foreground/50 italic`}>{placeholder}</span>
      )}
      <IconPencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  )
}

// ── Desktop Module Item ───────────────────────────────────────────

function DesktopModuleItem({
  module, selected, active, search, onClick,
}: Readonly<{
  module: AccessModule
  selected: Selections
  active: boolean
  search: string
  onClick: () => void
}>) {
  const count = countSelectedInModule(module, selected)
  const query = search.trim().toLowerCase()
  const nameMatch = query && module.name.toLowerCase().includes(query)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-left text-sm transition-colors group",
        active ? "bg-secondary" : "hover:bg-secondary/50",
        query && !nameMatch && !module.features.some((f) => f.name.toLowerCase().includes(query)) && "opacity-40",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium truncate", count > 0 && "text-foreground")}>
          <Highlight text={module.name} query={query} />
        </p>
        <p className="text-xs text-muted-foreground">
          {module.features.length} {module.features.length === 1 ? "feature" : "features"}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {count > 0 && (
          <Badge variant="secondary" className="border-0 text-xs h-5 px-1.5 bg-primary/10 text-primary">
            {count}
          </Badge>
        )}
        <IconChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", active && "translate-x-0.5")} />
      </div>
    </button>
  )
}

// ── Mobile Module Item ────────────────────────────────────────────

function MobileModuleItem({
  module, selected, search, onClick,
}: Readonly<{
  module: AccessModule
  selected: Selections
  search: string
  onClick: () => void
}>) {
  const count = countSelectedInModule(module, selected)
  const query = search.trim().toLowerCase()
  const matchesFeature = query && module.features.some((f) => f.name.toLowerCase().includes(query))

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-left transition-colors active:bg-secondary/70 hover:bg-secondary/40 border border-transparent hover:border-border/50",
        "mb-1",
        query && !module.name.toLowerCase().includes(query) && !matchesFeature && "opacity-40",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "flex items-center justify-center size-9 rounded-lg shrink-0",
          count > 0 ? "bg-primary/10" : "bg-secondary",
        )}>
          <IconShieldLock className={cn("size-4", count > 0 ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">
            <Highlight text={module.name} query={query} />
          </p>
          <p className="text-xs text-muted-foreground">
            {module.features.length} features
            {count > 0 && ` · ${count} rule${count === 1 ? "" : "s"} set`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {count > 0 && (
          <div className="size-2 rounded-full bg-primary" />
        )}
        <IconChevronRight className="size-4 text-muted-foreground" />
      </div>
    </button>
  )
}

// ── Feature Editor ────────────────────────────────────────────────

type FeatureEditorProps = {
  module: AccessModule
  selected: Selections
  search: string
  matchedFeatureIds: Set<string>
  onToggleFeature: (feature: AccessFeature, limit: AccessFeature["limit"]) => void
  onBulkSet: (module: AccessModule, limit: AccessFeature["limit"] | null) => void
}

function FeatureEditor({ module, selected, search, matchedFeatureIds, onToggleFeature, onBulkSet }: Readonly<FeatureEditorProps>) {
  const query = search.trim().toLowerCase()

  return (
    <>
      <div className="px-5 py-3 border-b shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate">{module.name}</h3>
            <Badge variant="outline" className="shrink-0 text-xs h-5">{module.scope}</Badge>
          </div>
          {module.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{module.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onBulkSet(module, "Allow")}>
            Allow all
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onBulkSet(module, null)}>
            Clear
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-slim px-5 py-2">
        {module.features.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No features in this module.</p>
        ) : (
          <div className="divide-y">
            {module.features.map((feature) => {
              const current = selected[feature.id]
              const dimmed = query && !matchedFeatureIds.has(feature.id)
              return (
                <div
                  key={feature.id}
                  className={cn(
                    "flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 transition-opacity",
                    dimmed && "opacity-30",
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <Highlight text={feature.name} query={query} />
                    </p>
                    {feature.description && (
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "h-7 text-xs transition-all",
                        current === "Allow" && "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400",
                      )}
                      onClick={() => onToggleFeature(feature, "Allow")}
                      aria-pressed={current === "Allow"}
                      aria-label={`Allow ${feature.name}`}
                    >
                      {current === "Allow" && <IconCheck className="size-3 mr-1" />}
                      Allow
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "h-7 text-xs transition-all",
                        current === "Deny" && "bg-red-50 border-red-300 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400",
                      )}
                      onClick={() => onToggleFeature(feature, "Deny")}
                      aria-pressed={current === "Deny"}
                      aria-label={`Deny ${feature.name}`}
                    >
                      {current === "Deny" && <IconCheck className="size-3 mr-1" />}
                      Deny
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ── Desktop Review Sidebar ────────────────────────────────────────

function ReviewSidebar({
  modules, selected, open, onToggle,
}: Readonly<{
  modules: AccessModule[]
  selected: Selections
  open: boolean
  onToggle: () => void
}>) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const totalRules = Object.keys(selected).length

  function toggleAccordion(id: string) {
    setExpandedIds((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={cn(
      "shrink-0 flex flex-col border-l bg-muted/20 transition-all duration-200 overflow-hidden",
      open ? "w-64 xl:w-72" : "w-10",
    )}>
      <div className="flex items-center justify-between px-3 py-3 border-b shrink-0">
        {open && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold truncate">Review</span>
            {totalRules > 0 && (
              <Badge variant="secondary" className="border-0 text-xs h-5 px-1.5">
                {totalRules}
              </Badge>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={onToggle}
          aria-label={open ? "Collapse review panel" : "Expand review panel"}
        >
          <IconChevronRight className={cn("size-4 transition-transform", open && "rotate-180")} />
        </Button>
      </div>

      {open && (
        <div className="flex-1 overflow-y-auto scrollbar-slim py-2">
          {modules.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <IconClipboardList className="size-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No rules set yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Allow or deny features on the left to see them here.</p>
            </div>
          ) : (
            modules.map((module) => {
              const moduleRules = module.features.filter((f) => selected[f.id])
              const isExpanded = expandedIds.has(module.id)
              return (
                <div key={module.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(module.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold truncate">{module.name}</span>
                      <Badge variant="secondary" className="border-0 text-xs h-4 px-1 shrink-0">
                        {moduleRules.length}
                      </Badge>
                    </div>
                    <IconChevronDown className={cn("size-3.5 text-muted-foreground shrink-0 transition-transform", isExpanded && "rotate-180")} />
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-2.5 space-y-1">
                      {moduleRules.map((feature) => (
                        <div key={feature.id} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground truncate">{feature.name}</span>
                          <LimitPill limit={selected[feature.id]!} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── Tablet Review Drawer ──────────────────────────────────────────

function TabletReviewDrawer({
  modules, selected, open, onToggle, totalRules,
}: Readonly<{
  modules: AccessModule[]
  selected: Selections
  open: boolean
  onToggle: () => void
  totalRules: number
}>) {
  return (
    <div className={cn(
      "shrink-0 border-t bg-background transition-all duration-200 overflow-hidden",
      open ? "max-h-64" : "max-h-11",
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 h-11 text-left hover:bg-secondary/40 transition-colors"
      >
        <IconChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        <span className="text-sm font-medium">Review</span>
        {totalRules > 0 && (
          <Badge variant="secondary" className="border-0 text-xs h-5 px-1.5">
            {totalRules} rules
          </Badge>
        )}
        {modules.length === 0 && (
          <span className="text-xs text-muted-foreground">No rules set yet</span>
        )}
      </button>

      {open && (
        <div className="overflow-y-auto scrollbar-slim max-h-52 px-5 pb-3 flex flex-wrap gap-2">
          {modules.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Set permissions above to see them here.</p>
          ) : (
            modules.map((module) => {
              const moduleRules = module.features.filter((f) => selected[f.id])
              return (
                <div key={module.id} className="rounded-md border bg-card px-3 py-2 min-w-36">
                  <p className="text-xs font-semibold mb-1.5">{module.name}</p>
                  <div className="space-y-1">
                    {moduleRules.map((feature) => (
                      <div key={feature.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground truncate">{feature.name}</span>
                        <LimitPill limit={selected[feature.id]!} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── Mobile Review Sheet ───────────────────────────────────────────

function MobileReviewSheet({
  modules, selected, open, onClose, totalRules,
}: Readonly<{
  modules: AccessModule[]
  selected: Selections
  open: boolean
  onClose: () => void
  totalRules: number
}>) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleAccordion(id: string) {
    setExpandedIds((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-background rounded-t-2xl shadow-xl max-h-[75vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Review</h3>
            {totalRules > 0 && (
              <Badge variant="secondary" className="border-0">
                {totalRules} rule{totalRules === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <IconX className="size-4" />
          </Button>
        </div>
        <div className="overflow-y-auto scrollbar-slim flex-1">
          {modules.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <IconClipboardList className="size-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No rules set yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Go back and allow or deny features.</p>
            </div>
          ) : (
            <div className="divide-y">
              {modules.map((module) => {
                const moduleRules = module.features.filter((f) => selected[f.id])
                const isExpanded = expandedIds.has(module.id)
                return (
                  <div key={module.id}>
                    <button
                      type="button"
                      onClick={() => toggleAccordion(module.id)}
                      className="w-full flex items-center justify-between gap-2 px-5 py-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{module.name}</span>
                        <Badge variant="secondary" className="border-0 text-xs h-5 px-1.5">
                          {moduleRules.length}
                        </Badge>
                      </div>
                      <IconChevronDown className={cn("size-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-3 space-y-2">
                        {moduleRules.map((feature) => (
                          <div key={feature.id} className="flex items-center justify-between gap-2">
                            <span className="text-sm text-muted-foreground">{feature.name}</span>
                            <LimitPill limit={selected[feature.id]!} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Highlight ─────────────────────────────────────────────────────

function Highlight({ text, query }: Readonly<{ text: string; query: string }>) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200 text-amber-900 dark:bg-amber-800/60 dark:text-amber-200 rounded-sm px-0">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ── LimitPill ─────────────────────────────────────────────────────

function LimitPill({ limit }: Readonly<{ limit: AccessFeature["limit"] }>) {
  return (
    <span className={cn(
      "text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0",
      limit === "Allow" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
      limit === "Deny" && "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
      limit === "Conditional" && "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    )}>
      {limit}
    </span>
  )
}

// ── Page loading skeleton ─────────────────────────────────────────

function PageLoading() {
  return (
    <div className="flex flex-col h-[calc(100svh-4rem)] overflow-hidden">
      <div className="shrink-0 border-b px-4 lg:px-6 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      <div className="shrink-0 border-b px-4 lg:px-6 py-2.5">
        <Skeleton className="h-8 w-80" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r p-3 space-y-2">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
        <div className="flex-1 p-5 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

function useFilteredModules(modules: AccessModule[], search: string) {
  return useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return { filteredModules: modules, matchedFeatureIds: new Set<string>() }

    const matchedFeatureIds = new Set<string>()
    const filteredModules = modules.filter((module) => {
      const moduleMatch = module.name.toLowerCase().includes(query)
      const featureMatches = module.features.filter((f) => f.name.toLowerCase().includes(query))
      featureMatches.forEach((f) => matchedFeatureIds.add(f.id))
      return moduleMatch || featureMatches.length > 0
    })
    return { filteredModules, matchedFeatureIds }
  }, [modules, search])
}

function seedSelections(policy: AccessPolicy): Selections {
  return policy.modules.reduce<Selections>((acc, module) => {
    module.features.forEach((f) => { if (f.enabled) acc[f.id] = f.limit })
    return acc
  }, {})
}

function countSelectedInModule(module: AccessModule, selected: Selections) {
  return module.features.reduce((count, f) => (selected[f.id] ? count + 1 : count), 0)
}

function buildRequestModules(library: AccessModule[], selected: Selections) {
  return library
    .map((module) => {
      const features = module.features
        .filter((f) => Boolean(selected[f.id]))
        .map((f) => ({
          featureid: f.backendFeatureId || f.id,
          enable: true,
          limit: selected[f.id] === "Allow" ? 1 : 0,
        }))
      if (features.length === 0) return null
      return { name: module.backendName || module.name, features }
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
}

function validate(name: string, description: string, selected: Selections) {
  if (!name) return { valid: false, error: "Add a policy name." }
  if (!description) return { valid: false, error: "Add a policy description." }
  if (description.length > DESCRIPTION_MAX) return { valid: false, error: `Description must be ${DESCRIPTION_MAX} characters or fewer.` }
  if (!DESCRIPTION_RE.test(description)) return { valid: false, error: "Use only letters, numbers, spaces, and basic punctuation." }
  if (Object.keys(selected).length === 0) return { valid: false, error: "Choose at least one permission." }
  return { valid: true, error: "" }
}
