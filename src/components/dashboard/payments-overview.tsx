import { IconCreditCard, IconRocket } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function PaymentsOverview() {
  return (
    <Card className="flex flex-col py-4 h-full">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <Badge variant="secondary" className="bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200 border-0 text-xs">
          Coming Soon
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-col items-center justify-center gap-4 flex-1 py-12">
        <div className="flex items-center justify-center size-14 rounded-2xl bg-secondary">
          <IconCreditCard className="size-7 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-sm font-semibold text-foreground">Subscription Management</p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
            Plan details, billing, usage tracking, and invoices will appear here.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
          <IconRocket className="size-3.5" />
          <span>Launching soon</span>
        </div>
      </CardContent>
    </Card>
  )
}
