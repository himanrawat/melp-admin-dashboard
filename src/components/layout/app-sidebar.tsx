import * as React from "react"
import {
  IconChevronRight,
  IconCreditCard,
  IconDashboard,
  IconSettings,
  IconShield,
  IconUsers,
  IconUsersGroup,
  IconUserPlus,
  IconWorld,
  IconLayoutGrid,
} from "@tabler/icons-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavSecondary } from "@/components/layout/nav-secondary"
import { NavUser } from "@/components/layout/nav-user"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Admin",
    email: "admin@melp.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: IconDashboard,
      isActive: true,
    },
  ],
  navCollapsible: [
    {
      title: "Users",
      icon: IconUsers,
      isOpen: false,
      items: [
        { title: "All Users", url: "#" },
        { title: "Active Users", url: "#" },
        { title: "Inactive Users", url: "#" },
        { title: "Deleted Users", url: "#" },
      ],
    },
    {
      title: "Access Management",
      icon: IconShield,
      isOpen: false,
      items: [
        { title: "User Groups", url: "#" },
        { title: "Policies", url: "#" },
        { title: "Domain Access", url: "#" },
      ],
    },
    {
      title: "Registration",
      icon: IconUserPlus,
      isOpen: false,
      items: [
        { title: "Add User", url: "#" },
        { title: "Bulk Upload", url: "#" },
        { title: "User List", url: "#" },
      ],
    },
  ],
  navFlat: [
    {
      title: "Teams",
      url: "#",
      icon: IconUsersGroup,
    },
    {
      title: "Groups",
      url: "#",
      icon: IconLayoutGrid,
    },
    {
      title: "Domains",
      url: "#",
      icon: IconWorld,
    },
    {
      title: "Payments",
      url: "#",
      icon: IconCreditCard,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <IconLayoutGrid className="size-5!" />
                <span className="text-base font-semibold">Melp Admin</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Dashboard (top-level, no sub-items) */}
        <NavMain items={data.navMain} />

        {/* Collapsible sections: Users, Access Management, Registration */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navCollapsible.map((section) => (
                <Collapsible key={section.title} asChild defaultOpen={section.isOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={section.title}>
                        <section.icon />
                        <span>{section.title}</span>
                        <IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {section.items.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton asChild>
                              <a href={item.url}>
                                <span>{item.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Flat nav items: Teams, Groups, Domains, Payments */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navFlat.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings at the bottom */}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
