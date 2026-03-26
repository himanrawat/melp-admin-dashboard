import * as React from "react"
import {
  IconCreditCard,
  IconLayoutGrid,
  IconSettings,
  IconShield,
  IconUsers,
  IconUsersGroup,
  IconUserPlus,
  IconWorld,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Admin",
    email: "admin@melp.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Users",
      url: "#",
      icon: IconUsers,
      isActive: true,
      items: [
        { title: "All Users", url: "#" },
        { title: "Active Users", url: "#" },
        { title: "Inactive Users", url: "#" },
        { title: "Deleted Users", url: "#" },
      ],
    },
    {
      title: "Access Management",
      url: "#",
      icon: IconShield,
      items: [
        { title: "User Groups", url: "#" },
        { title: "Policies", url: "#" },
        { title: "Domain Access", url: "#" },
      ],
    },
    {
      title: "Registration",
      url: "#",
      icon: IconUserPlus,
      items: [
        { title: "Add User", url: "#" },
        { title: "Bulk Upload", url: "#" },
        { title: "User List", url: "#" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
      items: [
        { title: "General", url: "#" },
        { title: "Team", url: "#" },
        { title: "Billing", url: "#" },
      ],
    },
  ],
  projects: [
    {
      name: "Teams",
      url: "#",
      icon: IconUsersGroup,
    },
    {
      name: "Groups",
      url: "#",
      icon: IconLayoutGrid,
    },
    {
      name: "Domains",
      url: "#",
      icon: IconWorld,
    },
    {
      name: "Payments",
      url: "#",
      icon: IconCreditCard,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <IconLayoutGrid className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Melp Admin</span>
                  <span className="truncate text-xs">Dashboard</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
