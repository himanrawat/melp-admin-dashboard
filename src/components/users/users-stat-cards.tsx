import {
  IconUsers,
  IconUserCheck,
  IconUserOff,
  IconTrash,
  IconTrendingUp,
} from "@tabler/icons-react"
import { Card, CardContent } from "@/components/ui/card"
import type { User } from "@/components/users/users-data"

function StatCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string
  value: number
  change?: string
  icon: React.ElementType
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex items-center justify-center size-9 rounded-lg bg-secondary shrink-0">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold leading-tight">{value.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
        </div>
        {change && (
          <div className="flex items-center gap-0.5 text-[10px] font-medium text-success shrink-0">
            <IconTrendingUp className="size-3" />
            {change}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function UsersStatCards({ users }: { users: User[] }) {
  const totalUsers = users.filter((u) => u.status !== "deleted").length
  const activeCount = users.filter((u) => u.status === "active").length
  const inactiveCount = users.filter((u) => u.status === "inactive").length
  const deletedCount = users.filter((u) => u.status === "deleted").length

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Total Users"
        value={totalUsers}
        change="+12.5%"
        icon={IconUsers}
      />
      <StatCard
        label="Active Users"
        value={activeCount}
        change="+8.2%"
        icon={IconUserCheck}
      />
      <StatCard
        label="Inactive Users"
        value={inactiveCount}
        icon={IconUserOff}
      />
      <StatCard
        label="Deleted Users"
        value={deletedCount}
        icon={IconTrash}
      />
    </div>
  )
}
