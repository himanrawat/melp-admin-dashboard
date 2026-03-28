import {
  IconUsers,
  IconUsersGroup,
  IconWorld,
  IconTrendingUp,
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

export function StatCards() {
  return (
    <>
      {/* Card 1 — Users */}
      <Card className="flex flex-col py-4">
        <CardHeader>
          <div className="flex items-center justify-center size-8 rounded-lg bg-secondary">
            <IconUsers className="size-4 text-muted-foreground" />
          </div>
          <CardAction>
            <div className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
              <IconTrendingUp className="size-3" />
              +12.5%
            </div>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 flex-1">
          <CardTitle className="text-2xl font-bold">3,842</CardTitle>
          <p className="text-xs text-muted-foreground -mt-2">Total Users</p>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm font-semibold">2,651</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div>
              <p className="text-sm font-semibold">854</p>
              <p className="text-xs text-muted-foreground">Inactive</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="">
          <Button size="sm" variant="outline" className="melp-radius w-full cursor-pointer">View all users</Button>
        </CardFooter>
      </Card>

      {/* Card 2 — Teams & Groups */}
      <Card className="flex flex-col py-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-secondary">
              <IconUsersGroup className="size-4 text-muted-foreground" />
            </div>
          </div>
          <CardAction>
            <div className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
              <IconTrendingUp className="size-3" />
              +6
            </div>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 flex-1">
          <CardTitle className="text-2xl font-bold">202</CardTitle>
          <p className="text-xs text-muted-foreground -mt-2">Teams & Groups</p>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm font-semibold">164</p>
              <p className="text-xs text-muted-foreground">Teams</p>
            </div>
            <div>
              <p className="text-sm font-semibold">38</p>
              <p className="text-xs text-muted-foreground">Groups</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className=" gap-2">
          <Button size="sm" variant="outline" className="melp-radius cursor-pointer flex-1">View Teams</Button>
          <Button size="sm" variant="outline" className="flex-1 cursor-pointer">View Groups</Button>
        </CardFooter>
      </Card>

      {/* Card 3 — Domains */}
      <Card className="flex flex-col py-4">
        <CardHeader>
          <div className="flex items-center justify-center size-8 rounded-lg bg-secondary">
            <IconWorld className="size-4 text-muted-foreground" />
          </div>
          <CardAction>
            <div className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
              <IconTrendingUp className="size-3" />
              +2
            </div>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 flex-1">
          <CardTitle className="text-2xl font-bold">23</CardTitle>
          <p className="text-xs text-muted-foreground -mt-2">Active Domains</p>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm font-semibold">970</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
            <div>
              <p className="text-sm font-semibold">42</p>
              <p className="text-xs text-muted-foreground">Avg / Domain</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="">
          <Button size="sm" variant="outline" className="melp-radius w-full cursor-pointer">Add a domain</Button>
        </CardFooter>
      </Card>
    </>
  )
}
