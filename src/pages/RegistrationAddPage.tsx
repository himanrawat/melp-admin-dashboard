import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  IconUserPlus,
  IconMail,
  IconCheck,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const departments = ["Engineering", "Design", "Sales", "Support", "Marketing", "Finance", "HR", "Legal", "Operations"]
const roles = ["Member", "Manager", "Admin", "Read Only"]

export function RegistrationAddPage() {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    location: "",
    role: "Member",
    sendInvite: true,
  })

  function handleChange(field: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 lg:p-6">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="flex items-center justify-center size-16 rounded-full bg-success/10">
            <IconCheck className="size-8 text-success" />
          </div>
          <div>
            <h2 className="text-xl font-bold">User Registered!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {form.firstName} {form.lastName} has been added to the system.
              {form.sendInvite && " An invitation email has been sent."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSubmitted(false)}>Add Another</Button>
            <Button className="melp-radius" onClick={() => navigate("/users")}>View Users</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Add User</h1>
          <p className="text-sm text-muted-foreground">Register a new user and optionally send them an invitation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Main form */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={form.firstName}
                      onChange={(e) => handleChange("firstName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={form.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@company.com"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Work Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Work Information</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Department <span className="text-destructive">*</span></Label>
                    <Select value={form.department} onValueChange={(v) => handleChange("department", v)}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="designation">Job Title</Label>
                    <Input
                      id="designation"
                      placeholder="e.g. Software Engineer"
                      value={form.designation}
                      onChange={(e) => handleChange("designation", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Role</Label>
                    <Select value={form.role} onValueChange={(v) => handleChange("role", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g. New York, NY"
                      value={form.location}
                      onChange={(e) => handleChange("location", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Invite */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invitation</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <IconMail className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    An invitation email will be sent to the user with instructions to set up their password.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sendInvite"
                    checked={form.sendInvite}
                    onCheckedChange={(v) => handleChange("sendInvite", Boolean(v))}
                  />
                  <Label htmlFor="sendInvite" className="text-sm font-normal cursor-pointer">
                    Send invitation email
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{form.firstName || form.lastName ? `${form.firstName} ${form.lastName}`.trim() : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium truncate max-w-[150px]">{form.email || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{form.department || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium">{form.role}</span>
                </div>
                <Separator className="my-2" />
                <Button type="submit" className="melp-radius w-full">
                  <IconUserPlus className="size-4 mr-1.5" />
                  Register User
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/users")}>
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
