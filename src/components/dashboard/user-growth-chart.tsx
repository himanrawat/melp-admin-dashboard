"use client"

import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { IconChevronRight } from "@tabler/icons-react"

const data = [
  { month: "Jan", registrations: 120, active: 98 },
  { month: "Feb", registrations: 145, active: 115 },
  { month: "Mar", registrations: 190, active: 160 },
  { month: "Apr", registrations: 210, active: 185 },
  { month: "May", registrations: 280, active: 240 },
  { month: "Jun", registrations: 320, active: 290 },
  { month: "Jul", registrations: 350, active: 310 },
]

const chartConfig: ChartConfig = {
  registrations: { label: "Registrations", color: "var(--foreground)" },
  active: { label: "Active", color: "var(--muted-foreground)" },
}

export function UserGrowthChart() {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>User Growth</CardTitle>
        <CardAction>
          <a href="#" className="text-xs flex items-center gap-0.5">
            Add Users <IconChevronRight className="size-3" />
          </a>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-45 sm:h-55 md:h-50 lg:h-55 w-full">
          <AreaChart data={data}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              fontSize={11}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              hide
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <defs>
              <linearGradient id="fillRegistrations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--muted-foreground)" stopOpacity={0.12} />
                <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              dataKey="registrations"
              type="monotone"
              fill="url(#fillRegistrations)"
              stroke="var(--foreground)"
              strokeWidth={1.5}
            />
            <Area
              dataKey="active"
              type="monotone"
              fill="url(#fillActive)"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
