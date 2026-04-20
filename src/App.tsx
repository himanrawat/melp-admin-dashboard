import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { Toaster } from "sonner"
import { PopupProvider } from "@/components/shared/popup"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import { useAuth } from "@/context/auth-context"
import { fetchDomains } from "@/api/admin"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Domain } from "@/types"

import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { UsersPage } from "@/pages/UsersPage"
import { TeamsPage } from "@/pages/TeamsPage"
import { GroupsPage } from "@/pages/GroupsPage"
import { AccessGroupsPage } from "@/pages/AccessGroupsPage"
import { AccessPoliciesPage } from "@/pages/AccessPoliciesPage"
import { PolicyDetailPage } from "@/pages/PolicyDetailPage"
import { PolicyEditPage } from "@/pages/PolicyEditPage"
import { AccessDomainsPage } from "@/pages/AccessDomainsPage"
import { AuditLogsPage } from "@/pages/AuditLogsPage"
import { DomainsPage } from "@/pages/DomainsPage"
import { PaymentsPage } from "@/pages/PaymentsPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { ComponentsPage } from "@/pages/ComponentsPage"

function getTextValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value) return value
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }

  return ""
}

function getDomainId(domain: Domain): string {
  return getTextValue(domain.client_id, domain.clientid, domain.domain)
}

function getDomainName(domain: Domain): string {
  return getTextValue(domain.client_name, domain.domain, getDomainId(domain))
}

function PrivateRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}

function AppLayout() {
  const { authState, selectedClient, setSelectedClient, domains, setDomains } = useAuth()
  const [showDomainModal, setShowDomainModal] = useState(false)
  const [domainLoading, setDomainLoading] = useState(false)

  useEffect(() => {
    if (!authState) return
    if (domains.length > 0) return
    setDomainLoading(true)
    const curClient = selectedClient
    fetchDomains()
      .then((resp: unknown) => {
        const r = resp as Record<string, unknown>
        const list: Domain[] = Array.isArray(resp)
          ? resp
          : Array.isArray(r.data)
            ? (r.data as Domain[])
            : Array.isArray(r.domains)
              ? (r.domains as Domain[])
              : []
        setDomains(list)
        if (!curClient) {
          if (list.length > 0) {
            const first = list[0]
            setSelectedClient(getDomainId(first), getDomainName(first))
          }
          setShowDomainModal(true)
        }
      })
      .catch(() => setShowDomainModal(true))
      .finally(() => setDomainLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState, domains.length, setSelectedClient, setDomains])

  const handleDomainSelect = (id: string) => {
    const domain = domains.find((item) => getDomainId(item) === id)
    setSelectedClient(id, domain ? getDomainName(domain) : "")
    setShowDomainModal(false)
  }

  let domainModalContent: React.ReactNode
  if (domainLoading) {
    domainModalContent = <p className="text-sm text-muted-foreground">Loading domains...</p>
  } else if (domains.length === 0) {
    domainModalContent = (
      <p className="text-sm text-muted-foreground">No domains available for your account.</p>
    )
  } else {
    domainModalContent = (
      <div className="space-y-3">
        <Select
          value={domains.some((domain) => getDomainId(domain) === selectedClient) ? selectedClient : undefined}
          onValueChange={handleDomainSelect}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a domain" />
          </SelectTrigger>
          <SelectContent>
            {domains.map((domain) => {
              const id = getDomainId(domain)
              const name = getDomainName(domain)
              return (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">You can change the domain later from the header.</p>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader onSelectDomain={() => setShowDomainModal(true)} />
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
          <Route path="/access/policies/new" element={<PolicyEditPage />} />
          <Route path="/access/policies/:id" element={<PolicyDetailPage />} />
          <Route path="/access/policies/:id/edit" element={<PolicyEditPage />} />
          <Route path="/access/domains" element={<AccessDomainsPage />} />

          {/* Audit Logs */}
          <Route path="/audit-logs" element={<AuditLogsPage />} />

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

      <Dialog open={showDomainModal} onOpenChange={setShowDomainModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Domain</DialogTitle>
            <DialogDescription>Choose a domain to manage.</DialogDescription>
          </DialogHeader>
          {domainModalContent}
          {/*
          {domainLoading ? (
            <p className="text-sm text-muted-foreground">Loading domains…</p>
          ) : domains.length === 0 ? (
            <p className="text-sm text-muted-foreground">No domains available for your account.</p>
          ) : (
            <div className="space-y-3">
              <Select
                value={domains.some((d) => String(d.client_id || d.clientid || d.domain || '') === selectedClient) ? selectedClient : undefined}
                onValueChange={handleDomainSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((d) => {
                    const id = String(d.client_id || d.clientid || d.domain || '')
                    const name = String(d.client_name || d.domain || id)
                    return (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">You can change the domain later from the header.</p>
            </div>
          )} */}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <PopupProvider>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          } />
        </Routes>
      </PopupProvider>
    </BrowserRouter>
  )
}

export default App
