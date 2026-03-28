import { IconCreditCard, IconCalendar, IconChevronRight, IconAlertCircle } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

function UsageBar({
  label,
  used,
  total,
  unit,
}: {
  label: string
  used: number
  total: number
  unit: string
}) {
  const percentage = Math.round((used / total) * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {used.toLocaleString()}{unit ? ` ${unit}` : ""} <span className="text-muted-foreground font-normal">/ {total.toLocaleString()}{unit ? ` ${unit}` : ""}</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded bg-secondary overflow-hidden">
        <div
          className="h-full rounded bg-foreground/30"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export function PaymentsOverview() {
  return (
    <Card className="flex flex-col py-4 h-full">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardAction>
          <a href="#" className="text-xs flex items-center gap-0.5">
            Manage <IconChevronRight className="size-3" />
          </a>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 flex-1">
        {/* Plan */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 rounded-lg bg-secondary shrink-0">
              <IconCreditCard className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Plan</p>
              <p className="font-semibold text-sm">Professional</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-success/10 text-success border-0 text-xs">
            Active
          </Badge>
        </div>

        {/* Next Billing */}
        <div className="flex items-start gap-2.5">
          <div className="flex items-center justify-center size-9 rounded-lg bg-secondary shrink-0">
            <IconCalendar className="size-4 text-muted-foreground" />
          </div>
          <div className="flex-1 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Next Billing</p>
              <p className="font-semibold text-sm">Jan 15, 2026</p>
            </div>
            <p className="text-sm font-bold">$99.00</p>
          </div>
        </div>

        <Separator />

        {/* Usage */}
        <div className="space-y-3.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Usage This Month</p>
          <UsageBar label="Users" used={156} total={500} unit="" />
          <UsageBar label="Storage" used={45.6} total={100} unit="GB" />
          <UsageBar label="API Calls" used={12450} total={50000} unit="" />
        </div>

        <Separator />

        {/* Last Invoice */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Invoice</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">INV-2026-003</p>
              <p className="text-xs text-muted-foreground">Mar 15, 2026</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">$99.00</p>
              <Badge variant="secondary" className="bg-success/10 text-success border-0 text-xs">
                Paid
              </Badge>
            </div>
          </div>
        </div>

        {/* Payment due alert */}
        <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 flex items-start gap-2.5 mt-auto">
          <IconAlertCircle className="size-4 text-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-warning">Payment Due Soon</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              $99.00 scheduled for Jan 15, 2026
            </p>
          </div>
          <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 flex items-center gap-0.5 mt-0.5">
            View <IconChevronRight className="size-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
