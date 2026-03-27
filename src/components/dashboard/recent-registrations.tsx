import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { IconChevronRight } from "@tabler/icons-react"

const registrations = [
  {
    name: "Sarah Johnson",
    email: "sarah.j@company.com",
    domain: "marketing.melp.co",
    date: "Mar 24, 2026",
    status: "Active",
    initials: "SJ",
  },
  {
    name: "Mark Chen",
    email: "m.chen@company.com",
    domain: "engineering.melp.co",
    date: "Mar 23, 2026",
    status: "Pending",
    initials: "MC",
  },
  {
    name: "Lisa Patel",
    email: "l.patel@company.com",
    domain: "sales.melp.co",
    date: "Mar 22, 2026",
    status: "Active",
    initials: "LP",
  },
  {
    name: "James Wilson",
    email: "j.wilson@company.com",
    domain: "support.melp.co",
    date: "Mar 21, 2026",
    status: "Inactive",
    initials: "JW",
  },
]

function getBadgeClass(status: string) {
  if (status === "Active") return "bg-success/10 text-success border-0 text-xs shrink-0"
  if (status === "Pending") return "bg-warning/10 text-warning border-0 text-xs shrink-0"
  return "text-xs shrink-0"
}

export function RecentRegistrations() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Registrations</CardTitle>
        <CardAction>
          <a href="#" className="text-xs flex items-center gap-0.5">
            View all <IconChevronRight className="size-3" />
          </a>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {registrations.map((user) => (
            <div key={user.email} className="flex items-center gap-3">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <Badge
                    variant="secondary"
                    className={getBadgeClass(user.status)}
                  >
                    {user.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{user.domain}</span>
                  <span className="shrink-0">{user.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
