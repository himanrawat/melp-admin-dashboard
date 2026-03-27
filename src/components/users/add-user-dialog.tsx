import { useState } from "react"
import { IconUserPlus } from "@tabler/icons-react"
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
import { DEPARTMENTS, LOCATIONS, DESIGNATIONS, type User, type UserStatus } from "@/components/users/users-data"

type FormData = {
  name: string
  email: string
  department: string
  designation: string
  location: string
  deactivateDate: string
  status: UserStatus
}

const defaultForm: FormData = {
  name: "",
  email: "",
  department: "",
  designation: "",
  location: "",
  deactivateDate: "",
  status: "active",
}

export function AddUserDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (user: Omit<User, "id" | "joinedAt">) => void
}) {
  const [form, setForm] = useState<FormData>(defaultForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  function validate() {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.name.trim())        errs.name        = "Name is required"
    if (!form.email.trim())       errs.email       = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email"
    if (!form.department)         errs.department  = "Department is required"
    if (!form.designation.trim()) errs.designation = "Designation is required"
    if (!form.location)           errs.location    = "Location is required"
    return errs
  }

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onAdd({
      name: form.name,
      email: form.email,
      department: form.department,
      designation: form.designation,
      location: form.location,
      deactivateDate: form.deactivateDate || undefined,
      status: form.status,
    })
    setForm(defaultForm)
    setErrors({})
    onClose()
  }

  function handleClose() {
    setForm(defaultForm)
    setErrors({})
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUserPlus className="size-5" />
            Add New User
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new user to your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="add-name">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="add-name"
              placeholder="e.g. Aarav Sharma"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="add-email">Email Address <span className="text-destructive">*</span></Label>
            <Input
              id="add-email"
              type="email"
              placeholder="user@company.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Department <span className="text-destructive">*</span></Label>
              <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.department && <p className="text-xs text-destructive">{errors.department}</p>}
            </div>

            <div className="grid gap-1.5">
              <Label>Location <span className="text-destructive">*</span></Label>
              <Select value={form.location} onValueChange={(v) => setForm((f) => ({ ...f, location: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Designation <span className="text-destructive">*</span></Label>
            <Select value={form.designation} onValueChange={(v) => setForm((f) => ({ ...f, designation: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select designation" />
              </SelectTrigger>
              <SelectContent>
                {DESIGNATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.designation && <p className="text-xs text-destructive">{errors.designation}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as UserStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="add-deactivate-date">Deactivate Date</Label>
              <Input
                id="add-deactivate-date"
                type="date"
                value={form.deactivateDate}
                onChange={(e) => setForm((f) => ({ ...f, deactivateDate: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="melp-radius">Add User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
