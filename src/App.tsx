import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"

import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { UsersPage } from "@/pages/UsersPage"
import { TeamsPage } from "@/pages/TeamsPage"
import { GroupsPage } from "@/pages/GroupsPage"
import { AccessGroupsPage } from "@/pages/AccessGroupsPage"
import { AccessPoliciesPage } from "@/pages/AccessPoliciesPage"
import { AccessDomainsPage } from "@/pages/AccessDomainsPage"
import { RegistrationAddPage } from "@/pages/RegistrationAddPage"
import { RegistrationBulkPage } from "@/pages/RegistrationBulkPage"
import { RegistrationListPage } from "@/pages/RegistrationListPage"
import { DomainsPage } from "@/pages/DomainsPage"
import { PaymentsPage } from "@/pages/PaymentsPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { ComponentsPage } from "@/pages/ComponentsPage"

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Directories */}
          <Route path="/users" element={<UsersPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/groups" element={<GroupsPage />} />

          {/* Access Management */}
          <Route path="/access" element={<Navigate to="/access/groups" replace />} />
          <Route path="/access/groups" element={<AccessGroupsPage />} />
          <Route path="/access/policies" element={<AccessPoliciesPage />} />
          <Route path="/access/domains" element={<AccessDomainsPage />} />

          {/* Registration */}
          <Route path="/registration" element={<Navigate to="/registration/add" replace />} />
          <Route path="/registration/add" element={<RegistrationAddPage />} />
          <Route path="/registration/bulk" element={<RegistrationBulkPage />} />
          <Route path="/registration/list" element={<RegistrationListPage />} />

          {/* Domains */}
          <Route path="/domains" element={<DomainsPage />} />

          {/* Payments */}
          <Route path="/payments" element={<PaymentsPage />} />

          {/* Settings */}
          <Route path="/settings" element={<SettingsPage />} />

          {/* Dev */}
          <Route path="/components" element={<ComponentsPage />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </SidebarInset>
    </SidebarProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
