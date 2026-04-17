import { useMemo, useState } from "react"
import { IconDotsVertical, IconPencil, IconPlus, IconTrash, IconUserPlus } from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type AddUserDraft = {
  id: string
  name: string
  email: string
  phone: string
}

const createRow = (): AddUserDraft => ({
  id: `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: "",
  email: "",
  phone: "",
})

export function AddUserDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (users: AddUserDraft[]) => Promise<void>
}) {
  const [rows, setRows] = useState<AddUserDraft[]>([createRow()])
  const [errors, setErrors] = useState<Record<string, Partial<Record<"name" | "email" | "phone", string>>>>({})
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const rowCount = rows.length

  const canSubmit = useMemo(
    () => rows.some((r) => r.name.trim() || r.email.trim() || r.phone.trim()),
    [rows],
  )

  function setRowValue(id: string, key: keyof AddUserDraft, value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
  }

  function handleAddRow() {
    setRows((prev) => [...prev, createRow()])
  }

  function handleDeleteRow(id: string) {
    setRows((prev) => (prev.length <= 1 ? [createRow()] : prev.filter((r) => r.id !== id)))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function validateRows() {
    const nextErrors: Record<string, Partial<Record<"name" | "email" | "phone", string>>> = {}
    let hasError = false

    for (const row of rows) {
      const rowHasData = row.name.trim() || row.email.trim() || row.phone.trim()
      if (!rowHasData) continue

      const rowErrors: Partial<Record<"name" | "email" | "phone", string>> = {}
      if (!row.name.trim()) rowErrors.name = "Full name is required"
      if (!row.email.trim()) rowErrors.email = "Email is required"
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) rowErrors.email = "Invalid email"
      if (!row.phone.trim()) rowErrors.phone = "Phone number is required"
      else if (!/^[+()\-\s0-9]{6,20}$/.test(row.phone.trim())) rowErrors.phone = "Invalid phone number"

      if (Object.keys(rowErrors).length) {
        nextErrors[row.id] = rowErrors
        hasError = true
      }
    }

    setErrors(nextErrors)
    return !hasError
  }

  async function handleSubmit() {
    if (!validateRows()) return

    const payload = rows.filter((r) => r.name.trim() || r.email.trim() || r.phone.trim())
    if (!payload.length) return

    try {
      setSubmitting(true)
      setSubmitError("")
      await onAdd(payload)
      setRows([createRow()])
      setErrors({})
      onClose()
    } catch (err) {
      console.error("[AddUserDialog] submit failed:", err)
      setSubmitError("Unable to add users. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setRows([createRow()])
    setErrors({})
    setSubmitError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUserPlus className="size-5" />
            Add Users
          </DialogTitle>
          <DialogDescription>
            Add one or more users with full name, email and phone number.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid gap-3 py-2">
            {rows.map((row, index) => (
              <div key={row.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">User #{index + 1}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <IconDotsVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          const el = document.getElementById(`add-user-name-${row.id}`)
                          el?.focus()
                        }}
                      >
                        <IconPencil className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => handleDeleteRow(row.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <IconTrash className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`add-user-name-${row.id}`}>Full Name</Label>
                    <Input
                      id={`add-user-name-${row.id}`}
                      placeholder="e.g. James Doe"
                      value={row.name}
                      onChange={(e) => setRowValue(row.id, "name", e.target.value)}
                    />
                    {errors[row.id]?.name && <p className="text-xs text-destructive">{errors[row.id]?.name}</p>}
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`add-user-email-${row.id}`}>Email</Label>
                    <Input
                      id={`add-user-email-${row.id}`}
                      type="email"
                      placeholder="user@company.com"
                      value={row.email}
                      onChange={(e) => setRowValue(row.id, "email", e.target.value)}
                    />
                    {errors[row.id]?.email && <p className="text-xs text-destructive">{errors[row.id]?.email}</p>}
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`add-user-phone-${row.id}`}>Phone Number</Label>
                    <Input
                      id={`add-user-phone-${row.id}`}
                      type="tel"
                      placeholder="+1 555 000 0001"
                      value={row.phone}
                      onChange={(e) => setRowValue(row.id, "phone", e.target.value)}
                    />
                    {errors[row.id]?.phone && <p className="text-xs text-destructive">{errors[row.id]?.phone}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{rowCount} row{rowCount > 1 ? "s" : ""} added</p>
          <Button variant="outline" size="sm" onClick={handleAddRow} disabled={submitting}>
            <IconPlus className="mr-1.5 size-4" />
            Add Row
          </Button>
        </div>

        {submitError && <p className="text-xs text-destructive">{submitError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel User</Button>
          <Button onClick={() => void handleSubmit()} className="melp-radius" disabled={submitting || !canSubmit}>
            {submitting ? "Adding..." : "Add User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
