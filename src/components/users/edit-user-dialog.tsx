import { useState, useEffect } from "react"
import { IconEdit } from "@tabler/icons-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DEPARTMENTS, type User, type UserStatus } from "@/components/users/users-data"

export function EditUserDialog({
  open,
  user,
  onClose,
  onSave,
}: {
  open: boolean
  user: User | null
  onClose: () => void
  onSave: (updated: User) => void
}) {
  const [form, setForm] = useState<User | null>(null)
  const [errors, setErrors] = useState<{ name?: string; email?: string; department?: string }>({})

  useEffect(() => {
    if (user) setForm({ ...user })
  }, [user])

  function validate() {
    const errs: { name?: string; email?: string; department?: string } = {}
    if (!form?.name.trim()) errs.name = "Name is required"
    if (!form?.email.trim()) errs.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form?.email ?? "")) errs.email = "Invalid email"
    if (!form?.department) errs.department = "Department is required"
    return errs
  }

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    if (form) onSave(form)
    setErrors({})
    onClose()
  }

  if (!form) return null

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconEdit className="size-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update the details for <span className="font-medium">{user?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-name">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="edit-name"
              value={form.name}
              onChange={(e) => setForm((f) => f ? { ...f, name: e.target.value } : f)}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-email">Email Address <span className="text-destructive">*</span></Label>
            <Input
              id="edit-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => f ? { ...f, email: e.target.value } : f)}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label>Department <span className="text-destructive">*</span></Label>
            <Select value={form.department} onValueChange={(v) => setForm((f) => f ? { ...f, department: v } : f)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.department && <p className="text-xs text-destructive">{errors.department}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => f ? { ...f, status: v as UserStatus } : f)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-verified"
              checked={form.verified}
              onCheckedChange={(v) => setForm((f) => f ? { ...f, verified: !!v } : f)}
            />
            <Label htmlFor="edit-verified" className="font-normal">Mark as verified</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="melp-radius">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
