import { IconShieldLock, IconUsersGroup, IconClipboardList, IconChevronRight } from "@tabler/icons-react"
import { Link } from "react-router-dom"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"

const accessData = [
  {
    label: "User Groups",
    icon: IconUsersGroup,
    count: 24,
    description: "Configured groups",
  },
  {
    label: "Policies",
    icon: IconShieldLock,
    count: 18,
    description: "Active policies",
  },
  {
    label: "Domain Access Rules",
    icon: IconClipboardList,
    count: 42,
    description: "Access rules defined",
  },
]

export function AccessSummary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Management</CardTitle>
        <CardAction>
          <Link to="/access" className="flex items-center gap-0.5 text-xs">
            Manage Access <IconChevronRight className="size-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {accessData.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-secondary">
                <item.icon className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xl font-bold">{item.count}</p>
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
