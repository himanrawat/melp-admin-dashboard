import { Search, Bell, Sun, Moon } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "@/hooks/use-theme"

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-card px-4 lg:px-6">
      {/* Left side: sidebar trigger + page title */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Welcome back, James</p>
        </div>
      </div>

      {/* Right side: search + actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-64 pl-9 pr-12 bg-secondary border-none"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
            /
          </kbd>
        </div>

        {/* Dark / Light mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>

        {/* Notification */}
        <Button variant="ghost" size="icon" className="size-9 rounded-full relative">
          <Bell className="size-4" />
          <span className="absolute top-1 right-1 size-2 bg-primary rounded-full" />
        </Button>
      </div>
    </header>
  )
}

