import { IconUserPlus, IconShieldCheck, IconWorld, IconUsers, IconChevronRight } from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"

const activities = [
  {
    icon: IconUserPlus,
    title: "New User Registered",
    description: "Sarah Johnson joined marketing.melp.co domain.",
    time: "2 hours ago",
  },
  {
    icon: IconShieldCheck,
    title: "Policy Updated",
    description: "Admin access policy updated for engineering team.",
    time: "5 hours ago",
  },
  {
    icon: IconWorld,
    title: "Domain Added",
    description: "New domain hr.melp.co created and configured.",
    time: "Yesterday",
  },
  {
    icon: IconUsers,
    title: "Team Created",
    description: "Product Design team added with 12 members.",
    time: "Yesterday",
  },
]

export function RecentActivities() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
        <CardAction>
          <a href="#" className="text-xs flex items-center gap-0.5">
            View all <IconChevronRight className="size-3" />
          </a>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.title} className="flex gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg shrink-0 bg-secondary">
                <activity.icon className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate">{activity.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{activity.time}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
