import { StatCards } from "@/components/dashboard/stat-cards"
import { UserGrowthChart } from "@/components/dashboard/user-growth-chart"
import { UserStatusBreakdown } from "@/components/dashboard/user-status-breakdown"
import { RecentRegistrations } from "@/components/dashboard/recent-registrations"
import { RecentActivities } from "@/components/dashboard/recent-activities"
import { DomainOverview } from "@/components/dashboard/domain-overview"
import { AccessSummary } from "@/components/dashboard/access-summary"
import { PaymentsOverview } from "@/components/dashboard/payments-overview"

export function DashboardPage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:p-6 overflow-x-hidden overflow-y-auto">

      {/* Main two-column layout: left content + right payments panel */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px] xl:items-start">

        {/* Left column */}
        <div className="flex flex-col gap-4 min-w-0">

          {/* Stat cards: 1 col mobile, 2 cols tablet, 3 cols desktop */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCards />
          </div>

          {/* Charts row: stacked mobile, side-by-side tablet+ */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5 lg:grid-cols-3">
            <div className="md:col-span-3 lg:col-span-2">
              <UserGrowthChart />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <UserStatusBreakdown />
            </div>
          </div>
        </div>

        {/* Right column — Payments Overview */}
        <div className="xl:sticky xl:top-4 xl:self-start h-full">
          <PaymentsOverview />
        </div>
      </div>

      {/* Bottom row: 3-col cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RecentRegistrations />
        <DomainOverview />
        <AccessSummary />
      </div>

      {/* Recent activities: full width */}
      <RecentActivities />

    </div>
  )
}
