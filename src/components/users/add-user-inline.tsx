import { useState } from "react"
import { IconPencil, IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type AddUserDraft = {
  id: string
  name: string
  email: string
  phone: string
}

const emptyDraft = (): { name: string; email: string; phone: string } => ({
  name: "",
  email: "",
  phone: "",
})

export function AddUserInline({
  onSubmitAll,
  onCancel,
}: {
  onSubmitAll: (users: AddUserDraft[]) => Promise<void>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(emptyDraft())
  const [staged, setStaged] = useState<AddUserDraft[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<"name" | "email" | "phone", string>>>({})
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const next: Partial<Record<"name" | "email" | "phone", string>> = {}
    if (!draft.name.trim()) next.name = "Name is required"
    if (!draft.email.trim()) next.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) next.email = "Invalid email"
    if (!draft.phone.trim()) next.phone = "Phone is required"
    else if (!/^[+()\-\s0-9]{6,20}$/.test(draft.phone.trim())) next.phone = "Invalid phone"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleAddOrUpdate() {
    if (!validate()) return

    if (editingId) {
      setStaged((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? { ...r, name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim() }
            : r,
        ),
      )
      setEditingId(null)
    } else {
      setStaged((prev) => [
        ...prev,
        {
          id: `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: draft.name.trim(),
          email: draft.email.trim(),
          phone: draft.phone.trim(),
        },
      ])
    }

    setDraft(emptyDraft())
    setErrors({})
  }

  function handleEdit(row: AddUserDraft) {
    setDraft({ name: row.name, email: row.email, phone: row.phone })
    setEditingId(row.id)
    setErrors({})
  }

  function handleRemove(id: string) {
    setStaged((prev) => prev.filter((r) => r.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setDraft(emptyDraft())
      setErrors({})
    }
  }

  function handleCancel() {
    setDraft(emptyDraft())
    setStaged([])
    setEditingId(null)
    setErrors({})
    onCancel()
  }

  async function handleSubmitAll() {
    if (!staged.length) return
    try {
      setSubmitting(true)
      await onSubmitAll(staged)
      setStaged([])
      setDraft(emptyDraft())
      onCancel()
    } catch {
      // error handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Input form card */}
      <div className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="grid gap-1">
            <label htmlFor="add-user-name" className="text-xs font-medium text-muted-foreground">Name</label>
            <Input
              id="add-user-name"
              placeholder="e.g. James Doe"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid gap-1">
            <label htmlFor="add-user-email" className="text-xs font-medium text-muted-foreground">Email</label>
            <Input
              id="add-user-email"
              type="email"
              placeholder="user@company.com"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="grid gap-1">
            <label htmlFor="add-user-phone" className="text-xs font-medium text-muted-foreground">Phone Number</label>
            <Input
              id="add-user-phone"
              type="tel"
              placeholder="+1 555 000 0001"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" className="melp-radius" onClick={handleAddOrUpdate} disabled={submitting}>
            {editingId ? "Update User" : "Add User"}
          </Button>
        </div>
      </div>

      {/* Staged users table — outside the card, no background */}
      {staged.length > 0 && (
        <>
          <div className="rounded border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">User Name</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">User Email</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">User Phone Number</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staged.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm">{row.name}</TableCell>
                    <TableCell className="text-sm">{row.email}</TableCell>
                    <TableCell className="text-sm">{row.phone}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => handleEdit(row)}
                        >
                          <IconPencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemove(row.id)}
                        >
                          <IconTrash className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end">
            <Button
              size="sm"
              className="melp-radius"
              onClick={() => void handleSubmitAll()}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : `Submit ${staged.length} User${staged.length > 1 ? "s" : ""}`}
            </Button>
          </div>
        </>
      )}
    </>
  )
}
