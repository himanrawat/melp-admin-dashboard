import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { IconEye, IconEyeOff, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Logo } from "@/assets/logo"
import { useAuth } from "@/context/auth-context"

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true })
  }, [isAuthenticated, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!email || !password) {
      setError("Please enter your email and password.")
      return
    }
    setLoading(true)
    try {
      await login({ email, password })
      navigate("/dashboard")
    } catch (err) {
      setError((err as Error).message || "Unable to login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-foreground text-background p-12">
        <div className="h-10 w-fit">
          <Logo className="h-full w-auto text-white" />
        </div>

        <div>
          <blockquote className="text-2xl font-semibold leading-snug text-white">
            "Melp gives us a single place to manage every user, team, and domain across the organisation — it just works."
          </blockquote>
          <div className="mt-6">
            <p className="text-sm font-medium text-white/90">Sarah Mitchell</p>
            <p className="text-sm text-white/50">Head of IT, Apex Technologies</p>
          </div>
        </div>

        <p className="text-xs text-white/30">© {new Date().getFullYear()} Melp Inc. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-10 h-10 w-fit lg:hidden">
          <Logo className="h-full w-auto text-foreground" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your admin account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(v) => setRemember(Boolean(v))}
                disabled={loading}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Remember me for 30 days
              </Label>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Submit */}
            <Button type="submit" className="melp-radius w-full mt-1" disabled={loading}>
              {loading && <IconLoader2 className="size-4 mr-2 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Having trouble?{" "}
            <a href="mailto:support@melp.com" className="underline hover:text-foreground transition-colors">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
