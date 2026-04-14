import { createContext, useCallback, useContext, useState } from "react"
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoTriangle,
} from "@tabler/icons-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

// ── Types ───────────────────────────────────────────────────

type PopupVariant = "danger" | "success" | "warning"

type PopupOptions = {
  variant: PopupVariant
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
}

type PopupContextValue = {
  popup: (options: PopupOptions) => void
  danger: (title: string, message: string, onConfirm?: () => void | Promise<void>) => void
  success: (title: string, message: string, onConfirm?: () => void) => void
  warning: (title: string, message: string, onConfirm?: () => void | Promise<void>) => void
}

// ── Variant config ──────────────────────────────────────────

const VARIANT_CONFIG: Record<
  PopupVariant,
  {
    icon: typeof IconAlertTriangle
    iconClass: string
    bgClass: string
    confirmVariant: "destructive" | "default"
    defaultConfirmLabel: string
    defaultCancelLabel: string | null
  }
> = {
  danger: {
    icon: IconAlertTriangle,
    iconClass: "text-destructive",
    bgClass: "bg-destructive/10",
    confirmVariant: "destructive",
    defaultConfirmLabel: "Confirm",
    defaultCancelLabel: "Cancel",
  },
  success: {
    icon: IconCircleCheck,
    iconClass: "text-success",
    bgClass: "bg-success/10",
    confirmVariant: "default",
    defaultConfirmLabel: "OK",
    defaultCancelLabel: null,
  },
  warning: {
    icon: IconInfoTriangle,
    iconClass: "text-warning",
    bgClass: "bg-warning/10",
    confirmVariant: "default",
    defaultConfirmLabel: "OK",
    defaultCancelLabel: "Cancel",
  },
}

// ── Imperative singleton (for non-React code) ──────────────

let _instance: PopupContextValue | null = null

export const popupApi = {
  danger(title: string, message: string, onConfirm?: () => void | Promise<void>) {
    _instance?.danger(title, message, onConfirm)
  },
  success(title: string, message: string, onConfirm?: () => void) {
    _instance?.success(title, message, onConfirm)
  },
  warning(title: string, message: string, onConfirm?: () => void | Promise<void>) {
    _instance?.warning(title, message, onConfirm)
  },
}

// ── Context ─────────────────────────────────────────────────

const PopupContext = createContext<PopupContextValue | null>(null)

// ── Provider + Dialog ───────────────────────────────────────

export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<PopupOptions | null>(null)
  const [loading, setLoading] = useState(false)

  const showPopup = useCallback((opts: PopupOptions) => {
    setOptions(opts)
    setOpen(true)
    setLoading(false)
  }, [])

  const danger = useCallback(
    (title: string, message: string, onConfirm?: () => void | Promise<void>) =>
      showPopup({ variant: "danger", title, message, onConfirm }),
    [showPopup],
  )

  const success = useCallback(
    (title: string, message: string, onConfirm?: () => void) =>
      showPopup({ variant: "success", title, message, onConfirm }),
    [showPopup],
  )

  const warning = useCallback(
    (title: string, message: string, onConfirm?: () => void | Promise<void>) =>
      showPopup({ variant: "warning", title, message, onConfirm }),
    [showPopup],
  )

  // Register singleton for imperative access
  _instance = { popup: showPopup, danger, success, warning }

  function handleClose() {
    if (loading) return
    setOpen(false)
    options?.onCancel?.()
  }

  async function handleConfirm() {
    if (!options) return
    const result = options.onConfirm?.()
    if (result instanceof Promise) {
      setLoading(true)
      try {
        await result
      } finally {
        setLoading(false)
      }
    }
    setOpen(false)
  }

  const config = options ? VARIANT_CONFIG[options.variant] : null
  const Icon = config?.icon
  const confirmLabel = options
    ? options.confirmLabel || (options.variant === "success" ? config!.defaultConfirmLabel : options.title)
    : ""

  return (
    <PopupContext.Provider value={{ popup: showPopup, danger, success, warning }}>
      {children}

      <AlertDialog open={open} onOpenChange={(v) => !v && handleClose()}>
        {options && config && Icon && (
          <AlertDialogContent className="sm:max-w-sm">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                {/* <div
                  className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${config.bgClass}`}
                >
                  <Icon className={`size-5 ${config.iconClass}`} />
                </div> */}
                <div>
                  <AlertDialogTitle>{options.title}</AlertDialogTitle>
                  <AlertDialogDescription className="mt-0.5">
                    {options.message}
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {config.defaultCancelLabel !== null && (
                <AlertDialogCancel onClick={handleClose} disabled={loading}>
                  {options.cancelLabel || config.defaultCancelLabel}
                </AlertDialogCancel>
              )}
              <AlertDialogAction
                onClick={handleConfirm}
                disabled={loading}
                className={
                  config.confirmVariant === "destructive"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "melp-radius"
                }
              >
                {loading ? "Please wait…" : confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </PopupContext.Provider>
  )
}

// ── Hook ────────────────────────────────────────────────────

export function usePopup(): PopupContextValue {
  const ctx = useContext(PopupContext)
  if (!ctx) {
    throw new Error("usePopup must be used within a PopupProvider")
  }
  return ctx
}
