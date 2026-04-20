"use client"

import {
  Label,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartData = [{ status: "users", active: 2651, inactive: 854, deleted: 337 }]

const totalUsers = chartData[0].active + chartData[0].inactive + chartData[0].deleted

const chartConfig = {
  active: {
    label: "Active",
    color: "var(--foreground)",
  },
  inactive: {
    label: "Inactive",
    color: "var(--muted-foreground)",
  },
  deleted: {
    label: "Deleted",
    color: "var(--border)",
  },
} satisfies ChartConfig

export function UserStatusBreakdown() {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>User Status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center flex-1 justify-center pb-2">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-50"
        >
          <RadialBarChart
            data={chartData}
            endAngle={180}
            innerRadius={60}
            outerRadius={90}
          >
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 16}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {totalUsers.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 4}
                          className="fill-muted-foreground text-xs"
                        >
                          Total Users
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
            <RadialBar
              dataKey="deleted"
              fill="var(--color-deleted)"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="inactive"
              fill="var(--color-inactive)"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="active"
              fill="var(--color-active)"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
          </RadialBarChart>
        </ChartContainer>
        <div className="flex gap-x-4 gap-y-2 text-xs w-full justify-center -mt-4 flex-wrap">
          {([
            { key: "active", label: "Active", value: chartData[0].active },
            { key: "inactive", label: "Inactive", value: chartData[0].inactive },
            { key: "deleted", label: "Deleted", value: chartData[0].deleted },
          ] as const).map((item) => (
            <div key={item.key} className="flex items-center gap-1.5">
              <div
                className="size-2 rounded-sm shrink-0"
                style={{ backgroundColor: `var(--color-${item.key})` }}
              />
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-semibold">{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
