import { IconWorld, IconUsers, IconChevronRight } from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"

const domains = [
  { name: "engineering.melp.co", users: 482, teams: 12 },
  { name: "marketing.melp.co", users: 156, teams: 6 },
  { name: "sales.melp.co", users: 234, teams: 8 },
  { name: "support.melp.co", users: 98, teams: 4 },
]

export function DomainOverview() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Domains</CardTitle>
        <CardAction>
          <a href="#" className="text-xs flex items-center gap-0.5">
            Add Domain <IconChevronRight className="size-3" />
          </a>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {domains.map((domain) => (
            <div key={domain.name} className="flex items-center gap-3">
              <div className="flex items-center justify-center size-8 rounded-lg bg-secondary shrink-0">
                <IconWorld className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{domain.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <IconUsers className="size-3" />
                    {domain.users}
                  </span>
                  <span>{domain.teams} teams</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
