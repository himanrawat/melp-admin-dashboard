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
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 overflow-auto">

      {/* Main two-column layout: left content + right payments panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px] lg:items-start">

        {/* Left column */}
        <div className="flex flex-col gap-4">

          {/* Stat cards: 1 col on mobile, 3 cols on desktop */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCards />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <UserGrowthChart />
            </div>
            <div>
              <UserStatusBreakdown />
            </div>
          </div>
        </div>

        {/* Right column — Payments Overview */}
        <div className="lg:sticky lg:top-4 h-full">
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
