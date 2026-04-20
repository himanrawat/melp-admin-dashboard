import React from "react"
import { useAuth } from "@/context/auth-context"
import { Link, useLocation } from "react-router-dom"
import {
  IconLayoutDashboard,
  IconSettings,
  IconShieldLock,
  IconWorld,
  IconCreditCard,
  IconChevronRight,
  IconFolder,
  IconHistory,
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
  disabled?: boolean
  children?: { title: string; url: string }[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconLayoutDashboard,
  },
  {
    title: "Directories",
    url: "/users",
    icon: IconFolder,
    children: [
      { title: "Users", url: "/users" },
      { title: "Teams", url: "/teams" },
      { title: "Groups", url: "/groups" },
    ],
  },
  {
    title: "Access Management",
    url: "/access",
    icon: IconShieldLock,
    children: [
      { title: "User Groups", url: "/access/groups" },
      { title: "Policies", url: "/access/policies" },
      { title: "Domain Access", url: "/access/domains" },
    ],
  },
  {
    title: "Domains",
    url: "/domains",
    icon: IconWorld,
  },
  {
    title: "Audit Logs",
    url: "/audit-logs",
    icon: IconHistory,
  },
  {
    title: "Payments",
    url: "/payments",
    icon: IconCreditCard,
    disabled: true,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: IconSettings,
    disabled: true,
  },
]


function SidebarLogo() {
  const { open } = useSidebar()
  return open ? (
    <Logo className="w-44 h-full text-sidebar-accent-foreground" />
  ) : (
    <LogoShort className="w-full h-full text-sidebar-accent-foreground" />
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const { authState } = useAuth()

  const user = {
    name: authState?.user?.fullName || "Admin",
    email: authState?.user?.email || "",
    avatar: "",
  }

  function isItemActive(item: NavItem) {
    if (item.children) {
      return item.children.some((c) => pathname === c.url)
    }
    return pathname === item.url
  }

  function isChildActive(childUrl: string) {
    return pathname === childUrl
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-16 flex items-center justify-center px-3 mb-4">
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) =>
              item.children ? (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isItemActive(item)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isItemActive(item)}
                        size="md"
                      >
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                        <IconChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isChildActive(child.url)}
                              size="md"
                            >
                              <Link to={child.url}>
                                <span>{child.title}</span>
                              </Link>
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
                    asChild={!item.disabled}
                    tooltip={item.title}
                    isActive={isItemActive(item)}
                    size="md"
                    disabled={item.disabled}
                    className={item.disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : undefined}
                  >
                    {item.disabled ? (
                      <>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </>
                    ) : (
                      <Link to={item.url}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
