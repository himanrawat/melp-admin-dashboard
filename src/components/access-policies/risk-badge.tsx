import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AccessPolicy } from "@/components/access-management/types"

export function RiskBadge({ risk, className }: Readonly<{ risk: AccessPolicy["risk"]; className?: string }>) {
  return (
    <Badge variant="outline" className={cn("border-0 bg-secondary text-secondary-foreground font-normal", className)}>
      {risk}
    </Badge>
  )
}
