import {
  IconCreditCard,
  IconCalendar,
  IconCash,
  IconTrendingUp,
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

function SubscriptionCard({
  label,
  value,
  sub,
  icon: Icon,
  badge,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  badge?: string
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {badge && (
            <Badge variant="secondary" className="bg-success/10 text-success border-0 text-xs mt-1">
              {badge}
            </Badge>
          )}
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="flex items-center justify-center size-10 rounded-lg bg-secondary">
          <Icon className="size-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function UsageBar({
  label,
  used,
  total,
  unit,
  color,
}: {
  label: string
  used: number
  total: number
  unit: string
  color: string
}) {
  const percentage = Math.round((used / total) * 100)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used.toLocaleString()} / {total.toLocaleString()} {unit} ({percentage}%)
        </span>
      </div>
      <Progress
        value={percentage}
        className="h-2 bg-secondary"
        style={{ ["--progress-color" as string]: color }}
      />
    </div>
  )
}

function OverviewTab() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Subscription Details */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="Plan" value="Professional" />
            <DetailRow label="Billing Cycle" value="Monthly" />
            <DetailRow label="Users Included" value="500" />
            <DetailRow label="Current Users" value="156" />
            <DetailRow label="Storage" value="100 GB" />
            <DetailRow label="Started On" value="January 15, 2020" />
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button className="melp-radius">Upgrade Plan</Button>
              <Button variant="outline">Cancel Subscription</Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <UsageBar label="Users" used={156} total={500} unit="" color="var(--chart-1)" />
            <UsageBar label="Storage" used={45.6} total={100} unit="GB" color="var(--chart-4)" />
            <UsageBar label="API Calls" used={12450} total={50000} unit="" color="var(--chart-2)" />
          </CardContent>
        </Card>
      </div>

      {/* Sidebar cards */}
      <div className="space-y-4">
        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center h-8 px-2 rounded border bg-secondary text-xs font-bold">
                VISA
              </div>
              <div>
                <p className="text-sm font-medium">**** **** **** 4242</p>
                <p className="text-xs text-muted-foreground">Expires 12/2026</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Update Payment Method
            </Button>
          </CardContent>
        </Card>

        {/* Payment Due */}
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-warning/10 shrink-0">
                <IconCalendar className="size-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-semibold">Payment Due Soon</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your next payment of $99.00 is scheduled for January 15, 2026.
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  View Invoice
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InvoicesTab() {
  const invoices = [
    { id: "INV-2026-003", date: "Mar 15, 2026", amount: "$99.00", status: "Paid" },
    { id: "INV-2026-002", date: "Feb 15, 2026", amount: "$99.00", status: "Paid" },
    { id: "INV-2026-001", date: "Jan 15, 2026", amount: "$99.00", status: "Pending" },
    { id: "INV-2025-012", date: "Dec 15, 2025", amount: "$99.00", status: "Paid" },
    { id: "INV-2025-011", date: "Nov 15, 2025", amount: "$99.00", status: "Paid" },
  ]

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left font-medium text-muted-foreground p-4">Invoice</th>
                <th className="text-left font-medium text-muted-foreground p-4">Date</th>
                <th className="text-left font-medium text-muted-foreground p-4">Amount</th>
                <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                <th className="text-right font-medium text-muted-foreground p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b last:border-b-0">
                  <td className="p-4 font-medium">{inv.id}</td>
                  <td className="p-4 text-muted-foreground">{inv.date}</td>
                  <td className="p-4">{inv.amount}</td>
                  <td className="p-4">
                    <Badge
                      variant="secondary"
                      className={
                        inv.status === "Paid"
                          ? "bg-success/10 text-success border-0"
                          : "bg-warning/10 text-warning border-0"
                      }
                    >
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" className="text-xs">
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function PlansTab() {
  const plans = [
    { name: "Starter", price: "$29", users: "50", storage: "10 GB", api: "5,000", current: false },
    { name: "Professional", price: "$99", users: "500", storage: "100 GB", api: "50,000", current: true },
    { name: "Enterprise", price: "$299", users: "Unlimited", storage: "1 TB", api: "500,000", current: false },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan.name} className={plan.current ? "border-foreground/20" : ""}>
          <CardContent className="p-6">
            {plan.current && (
              <Badge variant="secondary" className="bg-success/10 text-success border-0 text-xs mb-3">
                Current Plan
              </Badge>
            )}
            <h3 className="text-lg font-bold">{plan.name}</h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-sm text-muted-foreground"> /month</span>
            </div>
            <Separator className="my-4" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Users</span>
                <span className="font-medium">{plan.users}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium">{plan.storage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Calls</span>
                <span className="font-medium">{plan.api}</span>
              </div>
            </div>
            <Button
              variant={plan.current ? "outline" : "default"}
              className={`w-full mt-6 ${!plan.current ? "melp-radius" : ""}`}
              disabled={plan.current}
            >
              {plan.current ? "Current Plan" : "Upgrade"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function PaymentsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payments & Billing</h1>
          <p className="text-sm text-muted-foreground">Manage your subscription and billing information</p>
        </div>
        <Button variant="outline" size="sm">
          Download All Invoices
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SubscriptionCard
          label="Current Plan"
          value="Professional"
          icon={IconCreditCard}
          badge="Active"
        />
        <SubscriptionCard
          label="Monthly Cost"
          value="$99.00"
          sub="Billed monthly"
          icon={IconCash}
        />
        <SubscriptionCard
          label="Next Billing Date"
          value="Jan 15, 2026"
          sub="In 38 days"
          icon={IconCalendar}
        />
        <SubscriptionCard
          label="Total Spent"
          value="$4,950"
          sub="~ 50 months"
          icon={IconTrendingUp}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="plans" className="mt-4">
          <PlansTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
