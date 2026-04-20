import { useEffect, useMemo, useState } from "react"
import {
  IconCheck,
  IconChevronRight,
  IconLoader2,
  IconSearch,
  IconShieldLock,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createPolicy, updatePolicy } from "@/api/admin"
import { getErrorDescription } from "@/components/access-management/runtime"
import type {
  AccessFeature,
  AccessModule,
  AccessPolicy,
} from "@/components/access-management/types"

type Mode = "create" | "edit"
type Selections = Record<string, AccessFeature["limit"]>

const DESCRIPTION_MAX = 200
const DESCRIPTION_RE = /^[a-zA-Z0-9\s.,()&/\-_:]+$/

type Props = {
  open: boolean
  onClose: () => void
  mode: Mode
  policy: AccessPolicy | null
  clientId: string
  modules: AccessModule[]
  modulesLoading: boolean
  onSaved: (policyId: string | null) => void
}

export function PolicyFormDialog({
  open,
  onClose,
  mode,
  policy,
  clientId,
  modules,
  modulesLoading,
  onSaved,
}: Readonly<Props>) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selected, setSelected] = useState<Selections>({})
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [moduleSearch, setModuleSearch] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(policy?.name ?? "")
    setDescription(policy?.description ?? "")
    setSelected(seedSelections(policy))
    setModuleSearch("")
    setActiveModuleId(null)
  }, [open, policy])

  useEffect(() => {
    if (!open || activeModuleId) return
    if (modules.length > 0) setActiveModuleId(modules[0].id)
  }, [open, modules, activeModuleId])

  const cleanName = name.trim()
  const cleanDescription = description.trim()
  const filteredModules = useFilteredModules(modules, moduleSearch)
  const activeModule = modules.find((module) => module.id === activeModuleId) ?? filteredModules[0] ?? null
  const selectedCount = Object.keys(selected).length

  const validation = validate(cleanName, cleanDescription, selected)

  function toggleFeature(feature: AccessFeature, limit: AccessFeature["limit"]) {
    setSelected((current) => {
      if (current[feature.id] === limit) {
        const next = { ...current }
        delete next[feature.id]
        return next
      }
      return { ...current, [feature.id]: limit }
    })
  }

  function setModuleFeaturesTo(module: AccessModule, limit: AccessFeature["limit"] | null) {
    setSelected((current) => {
      const next = { ...current }
      module.features.forEach((feature) => {
        if (limit === null) delete next[feature.id]
        else next[feature.id] = limit
      })
      return next
    })
  }

  async function handleSave() {
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    setSaving(true)
    try {
      const payload = {
        clientid: Number(clientId),
        policyName: cleanName,
        desc: cleanDescription,
        modules: buildRequestModules(modules, selected),
      }

      if (mode === "edit" && policy) {
        const editingId = policy.backendPolicyId || policy.id
        await updatePolicy(editingId, { ...payload, pkid: editingId })
        toast.success("Policy updated.")
        onSaved(editingId)
      } else {
        await createPolicy(payload)
        toast.success("Policy created.")
        onSaved(null)
      }
      onClose()
    } catch (err) {
      toast.error(getErrorDescription(err) || "Unable to save this policy right now.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value && !saving) onClose() }}>
      <DialogContent className="p-0 gap-0 max-w-5xl w-[95vw] h-[92vh] flex flex-col overflow-hidden">
        <DialogTitle className="sr-only">
          {mode === "create" ? "Create Policy" : "Edit Policy"}
        </DialogTitle>

        <header className="border-b px-6 py-4 shrink-0 flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-secondary shrink-0">
            <IconShieldLock className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold truncate">
              {mode === "create" ? "Create Policy" : "Edit Policy"}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              Set details and permissions in one place.
            </p>
          </div>
          <Badge variant="secondary" className="border-0 shrink-0">
            {selectedCount} rule{selectedCount === 1 ? "" : "s"}
          </Badge>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(260px,360px)_1fr] overflow-hidden">
          <aside className="border-b lg:border-b-0 lg:border-r overflow-y-auto p-5 space-y-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-name">Policy Name</Label>
              <Input
                id="policy-name"
                placeholder="e.g. Operations Core Access"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-description">Description</Label>
              <Textarea
                id="policy-description"
                placeholder="Describe who should use this policy and why."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                maxLength={DESCRIPTION_MAX}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Letters, numbers, and basic punctuation.</span>
                <span>{cleanDescription.length}/{DESCRIPTION_MAX}</span>
              </div>
            </div>
          </aside>

          <PermissionsPanel
            modules={modules}
            filteredModules={filteredModules}
            loading={modulesLoading}
            search={moduleSearch}
            onSearchChange={setModuleSearch}
            activeModule={activeModule}
            onActiveModuleChange={setActiveModuleId}
            selected={selected}
            onToggleFeature={toggleFeature}
            onBulkSet={setModuleFeaturesTo}
          />
        </div>

        <footer className="border-t px-6 py-3 shrink-0 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="melp-radius" onClick={handleSave} disabled={saving || !validation.valid}>
            {saving ? <IconLoader2 className="size-4 mr-1.5 animate-spin" /> : <IconCheck className="size-4 mr-1.5" />}
            {mode === "create" ? "Create Policy" : "Save Changes"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}

// ── Permissions panel ──────────────────────────────────────────────

type PermissionsPanelProps = {
  modules: AccessModule[]
  filteredModules: AccessModule[]
  loading: boolean
  search: string
  onSearchChange: (value: string) => void
  activeModule: AccessModule | null
  onActiveModuleChange: (id: string) => void
  selected: Selections
  onToggleFeature: (feature: AccessFeature, limit: AccessFeature["limit"]) => void
  onBulkSet: (module: AccessModule, limit: AccessFeature["limit"] | null) => void
}

function PermissionsPanel({
  modules,
  filteredModules,
  loading,
  search,
  onSearchChange,
  activeModule,
  onActiveModuleChange,
  selected,
  onToggleFeature,
  onBulkSet,
}: Readonly<PermissionsPanelProps>) {
  if (loading) {
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }

  if (modules.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground text-center">
        No permission modules available for this domain.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,280px)_1fr] overflow-hidden">
      <div className="border-b md:border-b-0 md:border-r flex flex-col overflow-hidden">
        <div className="p-3 border-b shrink-0 relative">
          <IconSearch className="absolute left-6 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search modules…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredModules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No modules match.</p>
          ) : (
            filteredModules.map((module) => (
              <ModuleListItem
                key={module.id}
                module={module}
                selected={selected}
                active={activeModule?.id === module.id}
                onClick={() => onActiveModuleChange(module.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden">
        {activeModule ? (
          <FeatureEditor
            module={activeModule}
            selected={selected}
            onToggleFeature={onToggleFeature}
            onBulkSet={onBulkSet}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a module to set permissions.
          </div>
        )}
      </div>
    </div>
  )
}

function ModuleListItem({
  module,
  selected,
  active,
  onClick,
}: Readonly<{ module: AccessModule; selected: Selections; active: boolean; onClick: () => void }>) {
  const count = countSelectedInModule(module, selected)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
        active ? "bg-secondary" : "hover:bg-secondary/50",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{module.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {module.features.length} {module.features.length === 1 ? "feature" : "features"}
        </p>
      </div>
      {count > 0 && (
        <Badge variant="secondary" className="border-0 shrink-0 text-xs">{count}</Badge>
      )}
      <IconChevronRight
        className={cn("size-4 shrink-0 text-muted-foreground transition-transform", active && "translate-x-0.5")}
      />
    </button>
  )
}

function FeatureEditor({
  module,
  selected,
  onToggleFeature,
  onBulkSet,
}: Readonly<{
  module: AccessModule
  selected: Selections
  onToggleFeature: (feature: AccessFeature, limit: AccessFeature["limit"]) => void
  onBulkSet: (module: AccessModule, limit: AccessFeature["limit"] | null) => void
}>) {
  return (
    <>
      <div className="px-5 py-4 border-b shrink-0 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold truncate">{module.name}</h3>
            <Badge variant="outline" className="shrink-0">{module.scope}</Badge>
          </div>
          {module.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{module.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" onClick={() => onBulkSet(module, "Allow")}>Allow all</Button>
          <Button size="sm" variant="outline" onClick={() => onBulkSet(module, null)}>Clear</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="divide-y">
          {module.features.map((feature) => {
            const current = selected[feature.id]
            return (
              <div
                key={feature.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{feature.name}</p>
                  {feature.description && (
                    <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant={current === "Allow" ? "secondary" : "outline"}
                    onClick={() => onToggleFeature(feature, "Allow")}
                    aria-label={`Allow ${feature.name}`}
                  >
                    Allow
                  </Button>
                  <Button
                    size="sm"
                    variant={current === "Deny" ? "secondary" : "outline"}
                    onClick={() => onToggleFeature(feature, "Deny")}
                    aria-label={`Deny ${feature.name}`}
                  >
                    Deny
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Helpers ──────────────────────────────────────────────────────

function useFilteredModules(modules: AccessModule[], search: string) {
  return useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return modules
    return modules.filter((module) =>
      module.name.toLowerCase().includes(query) ||
      module.features.some((feature) => feature.name.toLowerCase().includes(query)),
    )
  }, [modules, search])
}

function seedSelections(policy: AccessPolicy | null): Selections {
  if (!policy) return {}
  return policy.modules.reduce<Selections>((acc, module) => {
    module.features.forEach((feature) => {
      if (feature.enabled) acc[feature.id] = feature.limit
    })
    return acc
  }, {})
}

function countSelectedInModule(module: AccessModule, selected: Selections) {
  return module.features.reduce((count, feature) => (selected[feature.id] ? count + 1 : count), 0)
}

function buildRequestModules(library: AccessModule[], selected: Selections) {
  return library
    .map((module) => {
      const features = module.features
        .filter((feature) => Boolean(selected[feature.id]))
        .map((feature) => ({
          featureid: feature.backendFeatureId || feature.id,
          enable: true,
          limit: selected[feature.id] === "Allow" ? 1 : 0,
        }))
      if (features.length === 0) return null
      return { name: module.backendName || module.name, features }
    })
    .filter((module): module is NonNullable<typeof module> => Boolean(module))
}

function validate(name: string, description: string, selected: Selections) {
  if (!name) return { valid: false, error: "Add a policy name." }
  if (!description) return { valid: false, error: "Add a policy description." }
  if (description.length > DESCRIPTION_MAX) return { valid: false, error: `Description must be ${DESCRIPTION_MAX} characters or fewer.` }
  if (!DESCRIPTION_RE.test(description)) return { valid: false, error: "Use only letters, numbers, spaces, and basic punctuation." }
  if (Object.keys(selected).length === 0) return { valid: false, error: "Choose at least one permission." }
  return { valid: true, error: "" }
}
