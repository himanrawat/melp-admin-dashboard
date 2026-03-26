import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import { DashboardPage } from "@/pages/DashboardPage"

function App() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <DashboardPage />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
