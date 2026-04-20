import { StatCards } from "@/components/dashboard/stat-cards"
import { RecentRegistrations } from "@/components/dashboard/recent-registrations"
import { AuditLogsSection } from "@/components/dashboard/audit-logs-section"
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

          {/* Recent Registrations & Access Management */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RecentRegistrations />
            <AccessSummary />
          </div>
        </div>

        {/* Right column — Subscription */}
        <div className="xl:sticky xl:top-4 xl:self-start h-full">
          <PaymentsOverview />
        </div>
      </div>

      {/* Audit logs: full width */}
      <AuditLogsSection />

    </div>
  )
}
