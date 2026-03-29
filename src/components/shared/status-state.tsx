import { type ComponentType, type ReactNode } from "react"
import {
  Ban,
  CircleDashed,
  CloudOff,
  FolderSearch,
  Lock,
  OctagonAlert,
  PackageOpen,
  TriangleAlert,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export type StatusStateCode = 204 | 400 | 401 | 403 | 404 | 409 | 500

type StatusTone = "neutral" | "warning" | "danger"

type StatusStateConfig = {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  code: string
  tone: StatusTone
}

const codeStateMap: Record<StatusStateCode, StatusStateConfig> = {
  204: {
    icon: PackageOpen,
    title: "Nothing here yet",
    description:
      "This section doesn't have any data to display right now. It will populate once content becomes available.",
    code: "204",
    tone: "neutral",
  },
  400: {
    icon: OctagonAlert,
    title: "Something went wrong",
    description:
      "We couldn't process the request due to missing or invalid information. Please check your input and try again.",
    code: "400",
    tone: "warning",
  },
  401: {
    icon: Lock,
    title: "Session expired",
    description:
      "You've been signed out for security reasons. Please sign in again to continue where you left off.",
    code: "401",
    tone: "warning",
  },
  403: {
    icon: Ban,
    title: "You don't have access",
    description:
      "Your current role doesn't include permission to view this content. Contact your administrator to request access.",
    code: "403",
    tone: "danger",
  },
  404: {
    icon: FolderSearch,
    title: "We couldn't find that",
    description:
      "The page or resource you're looking for doesn't exist or may have been moved. Double-check the URL or go back.",
    code: "404",
    tone: "warning",
  },
  409: {
    icon: TriangleAlert,
    title: "Update conflict",
    description:
      "Someone else may have made changes at the same time. Refresh the page and try your update again.",
    code: "409",
    tone: "warning",
  },
  500: {
    icon: CloudOff,
    title: "Something broke on our end",
    description:
      "We're having trouble processing this request. Please try again in a moment or reach out to support if it continues.",
    code: "500",
    tone: "danger",
  },
}

/** Icon background tones — using muted for neutral, amber for warnings, destructive for danger */
const toneIconClassMap: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-destructive/10 text-destructive",
}

export function StatusState({
  code,
  title,
  description,
  icon,
  actionSlot,
  compact = false,
  className,
}: {
  code?: StatusStateCode
  title?: string
  description?: string
  icon?: ComponentType<{ className?: string }>
  actionSlot?: ReactNode
  compact?: boolean
  className?: string
}) {
  const preset = code ? codeStateMap[code] : undefined
  const Icon = icon ?? preset?.icon ?? CircleDashed
  const finalTitle = title ?? preset?.title ?? "Nothing to show yet"
  const finalDescription =
    description ??
    preset?.description ??
    "There's nothing to display here at the moment. Check back later or try a different action."
  const finalCode = preset?.code
  const tone = preset?.tone ?? "neutral"

  return (
    <Empty
      className={cn(
        "rounded-lg border border-border/70",
        compact ? "p-8 md:p-8" : "p-10 md:p-12",
        className
      )}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <div
            className={cn(
              "flex items-center justify-center rounded-xl p-3",
              toneIconClassMap[tone]
            )}
          >
            <Icon className={compact ? "size-5" : "size-6"} />
          </div>
        </EmptyMedia>
        {finalCode ? (
          <p className={cn(
            "font-semibold tabular-nums tracking-tight text-foreground",
            compact ? "text-3xl" : "text-4xl"
          )}>
            {finalCode}
          </p>
        ) : null}
        <EmptyTitle className={compact ? "text-base" : "text-lg"}>
          {finalTitle}
        </EmptyTitle>
        <EmptyDescription className={compact ? "text-sm" : "text-sm leading-6"}>
          {finalDescription}
        </EmptyDescription>
      </EmptyHeader>
      {actionSlot ? (
        <EmptyContent>{actionSlot}</EmptyContent>
      ) : null}
    </Empty>
  )
}

export function StatusStateActions({
  primaryLabel,
  secondaryLabel,
  onPrimaryClick,
  onSecondaryClick,
}: {
  primaryLabel?: string
  secondaryLabel?: string
  onPrimaryClick?: () => void
  onSecondaryClick?: () => void
}) {
  if (!primaryLabel && !secondaryLabel) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {secondaryLabel ? (
        <Button variant="outline" onClick={onSecondaryClick}>
          {secondaryLabel}
        </Button>
      ) : null}
      {primaryLabel ? <Button onClick={onPrimaryClick}>{primaryLabel}</Button> : null}
    </div>
  )
}
