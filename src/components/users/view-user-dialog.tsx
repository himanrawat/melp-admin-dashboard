import { IconCircleCheck, IconCircleX, IconMail, IconBuilding, IconCalendar } from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import type { User, UserStatus } from "@/components/users/users-data"

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  })
}

function StatusBadge({ status }: { status: UserStatus }) {
  const map: Record<UserStatus, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-success/10 text-success border-0" },
    inactive: { label: "Inactive", className: "bg-muted text-muted-foreground border-0" },
    deleted: { label: "Deleted", className: "bg-destructive/10 text-destructive border-0" },
  }
  return <Badge variant="secondary" className={map[status].className}>{map[status].label}</Badge>
}

export function ViewUserDialog({
  open,
  user,
  onClose,
}: {
  open: boolean
  user: User | null
  onClose: () => void
}) {
  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>Viewing details for {user.name}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-4">
          <Avatar size="lg">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="font-semibold text-base">{user.name}</p>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <StatusBadge status={user.status} />
              {user.verified ? (
                <div className="flex items-center gap-1 text-xs text-success">
                  <IconCircleCheck className="size-3.5" /> Verified
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <IconCircleX className="size-3.5" /> Pending
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 py-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-secondary shrink-0">
              <IconMail className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Email</p>
              <p className="text-sm">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-secondary shrink-0">
              <IconBuilding className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Department</p>
              <p className="text-sm">{user.department}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-secondary shrink-0">
              <IconCalendar className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Joined</p>
              <p className="text-sm">{formatDate(user.joinedAt)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
