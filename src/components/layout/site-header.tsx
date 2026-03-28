import { Search, Bell, Sun, Moon } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "@/hooks/use-theme"
import { useAuth } from "@/context/auth-context"

export function SiteHeader({ onSelectDomain }: { onSelectDomain?: () => void }) {
  const { theme, toggleTheme } = useTheme()
  const { authState, selectedClientName } = useAuth()

  const firstName = authState?.user?.fullName?.split(" ")[0] || "Admin"

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-card px-4 lg:px-6">
      {/* Left side: sidebar trigger + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4 shrink-0"
        />
        <button
          onClick={onSelectDomain}
          className="min-w-0 text-left disabled:pointer-events-none"
          disabled={!onSelectDomain}
        >
          <h1 className="text-lg sm:text-xl font-semibold truncate">Dashboard</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Welcome back, {firstName}
            {selectedClientName
              ? ` · ${selectedClientName}`
              : onSelectDomain ? " · Click to select domain" : ""}
          </p>
        </button>
      </div>

      {/* Right side: search + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search — icon-only on mobile, full bar on md+ */}
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded md:hidden"
          aria-label="Search"
        >
          <Search className="size-4 text-muted-foreground" />
        </Button>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-48 lg:w-64 pl-9 pr-12 bg-secondary border-none"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
            /
          </kbd>
        </div>

        {/* Dark / Light mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded"
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
        <Button variant="ghost" size="icon" className="size-9 rounded relative">
          <Bell className="size-4" />
          <span className="absolute top-1 right-1 size-2 bg-primary rounded" />
        </Button>
      </div>
    </header>
  )
}
