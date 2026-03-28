import { useState } from "react"
import {
  IconBuilding,
  IconUser,
  IconBell,
  IconShieldLock,
  IconDevices,
  IconCheck,
  IconLoader2,
  IconAlertTriangle,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function SaveButton({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <Button type="submit" className="melp-radius" disabled={saving}>
      {saving ? (
        <><IconLoader2 className="size-4 mr-1.5 animate-spin" /> Saving…</>
      ) : saved ? (
        <><IconCheck className="size-4 mr-1.5" /> Saved</>
      ) : (
        "Save Changes"
      )}
    </Button>
  )
}

function OrganisationTab() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    orgName: "Melp Technologies",
    website: "https://melp.com",
    industry: "Technology",
    size: "100-500",
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    language: "en",
  })

  function handleChange(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    setSaved(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => { setSaving(false); setSaved(true) }, 1000)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Organisation Details</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Organisation Name</Label>
              <Input value={form.orgName} onChange={(e) => handleChange("orgName", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => handleChange("website", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Industry</Label>
              <Select value={form.industry} onValueChange={(v) => handleChange("industry", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Technology", "Finance", "Healthcare", "Education", "Retail", "Manufacturing", "Other"].map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Organisation Size</Label>
              <Select value={form.size} onValueChange={(v) => handleChange("size", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["1-10", "11-50", "51-100", "100-500", "500-1000", "1000+"].map((s) => (
                    <SelectItem key={s} value={s}>{s} employees</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Regional Settings</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Timezone</Label>
              <Select value={form.timezone} onValueChange={(v) => handleChange("timezone", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney"].map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date Format</Label>
              <Select value={form.dateFormat} onValueChange={(v) => handleChange("dateFormat", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"].map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Language</Label>
              <Select value={form.language} onValueChange={(v) => handleChange("language", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SaveButton saving={saving} saved={saved} />
      </div>
    </form>
  )
}

function ProfileTab() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    firstName: "James",
    lastName: "William",
    email: "william01@gmail.com",
    phone: "+1 (555) 012-3456",
    designation: "System Administrator",
    location: "New York, NY",
  })

  function handleChange(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    setSaved(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => { setSaving(false); setSaved(true) }, 1000)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Profile Picture</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-xl font-semibold">JW</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" size="sm">Upload Photo</Button>
              <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2 MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>First Name</Label>
              <Input value={form.firstName} onChange={(e) => handleChange("firstName", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Last Name</Label>
              <Input value={form.lastName} onChange={(e) => handleChange("lastName", e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email Address</Label>
            <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => handleChange("location", e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Job Title</Label>
            <Input value={form.designation} onChange={(e) => handleChange("designation", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SaveButton saving={saving} saved={saved} />
      </div>
    </form>
  )
}

type NotifSetting = { label: string; description: string; email: boolean; push: boolean }

function NotificationsTab() {
  const [settings, setSettings] = useState<NotifSetting[]>([
    { label: "New User Registrations", description: "When a new user signs up or is added", email: true, push: true },
    { label: "User Status Changes", description: "When a user is activated or deactivated", email: true, push: false },
    { label: "Payment Reminders", description: "Billing due dates and payment confirmations", email: true, push: true },
    { label: "Domain Verification", description: "When a domain is verified or fails", email: true, push: false },
    { label: "Security Alerts", description: "Suspicious logins or policy violations", email: true, push: true },
    { label: "Weekly Digest", description: "A summary of activity from the past week", email: true, push: false },
    { label: "System Announcements", description: "Product updates and maintenance notices", email: false, push: false },
  ])

  function toggle(idx: number, channel: "email" | "push") {
    setSettings((prev) => prev.map((s, i) => i === idx ? { ...s, [channel]: !s[channel] } : s))
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-[1fr_auto_auto] text-xs font-medium text-muted-foreground px-4 py-2 border-b">
          <span>Notification</span>
          <span className="w-16 text-center">Email</span>
          <span className="w-16 text-center">Push</span>
        </div>
        {settings.map((s, i) => (
          <div key={s.label}>
            <div className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3">
              <div>
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
              <div className="w-16 flex justify-center">
                <Switch checked={s.email} onCheckedChange={() => toggle(i, "email")} />
              </div>
              <div className="w-16 flex justify-center">
                <Switch checked={s.push} onCheckedChange={() => toggle(i, "push")} />
              </div>
            </div>
            {i < settings.length - 1 && <Separator />}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function SecurityTab() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [twoFAEnabled, setTwoFAEnabled] = useState(true)

  const activeSessions = [
    { device: "Chrome on macOS", location: "New York, USA", lastActive: "Active now", current: true },
    { device: "Safari on iPhone", location: "New York, USA", lastActive: "2 hours ago", current: false },
    { device: "Chrome on Windows", location: "Chicago, USA", lastActive: "3 days ago", current: false },
  ]

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => { setSaving(false); setSaved(true) }, 1000)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Change Password */}
      <Card>
        <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 max-w-sm">
            <div className="flex flex-col gap-1.5">
              <Label>Current Password</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>New Password</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Confirm New Password</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <SaveButton saving={saving} saved={saved} />
          </form>
        </CardContent>
      </Card>

      {/* 2FA */}
      <Card>
        <CardContent className="p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-success/10 shrink-0">
              <IconShieldLock className="size-5 text-success" />
            </div>
            <div>
              <p className="font-semibold text-sm">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground mt-0.5">Add an extra layer of security to your account with 2FA.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {twoFAEnabled && <Badge variant="secondary" className="bg-success/10 text-success border-0 text-xs">Enabled</Badge>}
            <Switch checked={twoFAEnabled} onCheckedChange={setTwoFAEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Active sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Active Sessions</CardTitle>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
              Revoke All Other Sessions
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {activeSessions.map((session, i) => (
            <div key={i}>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center size-9 rounded-lg bg-secondary shrink-0">
                    <IconDevices className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{session.device}</p>
                      {session.current && (
                        <Badge variant="secondary" className="bg-success/10 text-success border-0 text-xs">Current</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{session.location} · {session.lastActive}</p>
                  </div>
                </div>
                {!session.current && (
                  <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive">Revoke</Button>
                )}
              </div>
              {i < activeSessions.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/20">
        <CardHeader><CardTitle className="text-base text-destructive">Danger Zone</CardTitle></CardHeader>
        <CardContent className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Delete Account</p>
            <p className="text-xs text-muted-foreground mt-0.5">Permanently delete your admin account. This action cannot be undone.</p>
          </div>
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0">
            <IconAlertTriangle className="size-4 mr-1.5" />
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your organisation and account preferences</p>
      </div>

      <Tabs defaultValue="organisation">
        <TabsList variant="line">
          <TabsTrigger value="organisation">
            <IconBuilding className="size-4 mr-1.5" />
            Organisation
          </TabsTrigger>
          <TabsTrigger value="profile">
            <IconUser className="size-4 mr-1.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <IconBell className="size-4 mr-1.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <IconShieldLock className="size-4 mr-1.5" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organisation" className="mt-4"><OrganisationTab /></TabsContent>
        <TabsContent value="profile" className="mt-4"><ProfileTab /></TabsContent>
        <TabsContent value="notifications" className="mt-4"><NotificationsTab /></TabsContent>
        <TabsContent value="security" className="mt-4"><SecurityTab /></TabsContent>
      </Tabs>
    </div>
  )
}
