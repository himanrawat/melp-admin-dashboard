import * as React from "react"
import {
  IconLayoutDashboard,
  IconSettings,
  IconUsers,
  IconShieldLock,
  IconUsersGroup,
  IconClipboardList,
  IconWorld,
  IconUserPlus,
  IconCreditCard,
  IconChevronRight,
} from "@tabler/icons-react"

import { Logo } from "@/assets/logo"
import { LogoShort } from "@/assets/logo-short"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type NavItem = {
  title: string
  url: string
  icon: React.ElementType
  isActive?: boolean
  children?: { title: string; url: string }[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "#",
    icon: IconLayoutDashboard,
    isActive: true,
  },
  {
    title: "Users",
    url: "#",
    icon: IconUsers,
    children: [
      { title: "All Users", url: "#" },
      { title: "Active Users", url: "#" },
      { title: "Inactive Users", url: "#" },
      { title: "Deleted Users", url: "#" },
    ],
  },
  {
    title: "Access Management",
    url: "#",
    icon: IconShieldLock,
    children: [
      { title: "User Groups", url: "#" },
      { title: "Policies", url: "#" },
      { title: "Domain Access", url: "#" },
    ],
  },
  {
    title: "Teams",
    url: "#",
    icon: IconUsersGroup,
  },
  {
    title: "Groups",
    url: "#",
    icon: IconClipboardList,
  },
  {
    title: "Registration",
    url: "#",
    icon: IconUserPlus,
    children: [
      { title: "Add User", url: "#" },
      { title: "Bulk Upload", url: "#" },
      { title: "User List", url: "#" },
    ],
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
  {
    title: "Settings",
    url: "#",
    icon: IconSettings,
  },
]

const data = {
  user: {
    name: "James William",
    email: "william01@gmail.com",
    avatar: "",
  },
}

function SidebarLogo() {
  const { open } = useSidebar()
  return open ? (
    <Logo className="w-full h-full text-sidebar-accent-foreground" />
  ) : (
    <LogoShort className="w-full h-full text-sidebar-accent-foreground" />
  )
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
              <SidebarLogo />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) =>
              item.children ? (
                <Collapsible key={item.title} asChild className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                        <IconChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.title}>
                            <SidebarMenuSubButton asChild>
                              <a href={child.url}>
                                <span>{child.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={item.isActive}
                  >
                    <a href={item.url}>
                      <item.icon className="size-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
