import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

// ── InputGroup ──────────────────────────────────────────────
// Wraps an input + inline addon (button/text) into a single
// visually-merged control. The border and radius are applied
// on the group; inner elements lose their own border/radius
// on the shared edges.

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn("flex h-9 w-full items-stretch", className)}
      {...props}
    />
  )
}

// ── InputGroupInput ─────────────────────────────────────────

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input-group-input"
      className={cn(
        // base input styles (mirrors Input component)
        "min-w-0 flex-1 bg-transparent px-3 py-1 text-base md:text-sm",
        "placeholder:text-muted-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "outline-none transition-[color,box-shadow]",
        // border — full border on group container, remove right border so it merges with addon
        "rounded-l-md border border-r-0 border-input shadow-xs",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:z-10",
        "dark:bg-input/30",
        className,
      )}
      {...props}
    />
  )
}

// ── InputGroupAddon ─────────────────────────────────────────

const addonVariants = cva("flex shrink-0 items-stretch", {
  variants: {
    align: {
      "inline-end": "rounded-r-md border border-input shadow-xs overflow-hidden",
      "inline-start": "rounded-l-md border border-r-0 border-input shadow-xs overflow-hidden",
    },
  },
  defaultVariants: { align: "inline-end" },
})

function InputGroupAddon({
  className,
  align,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof addonVariants>) {
  return (
    <div
      data-slot="input-group-addon"
      className={cn(addonVariants({ align }), className)}
      {...props}
    />
  )
}

// ── InputGroupButton ────────────────────────────────────────

function InputGroupButton({
  className,
  variant = "secondary",
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      data-slot="input-group-button"
      className={cn(
        buttonVariants({ variant, size }),
        // remove all radius — the addon container owns the radius
        "rounded-none h-full px-3",
        className,
      )}
      {...props}
    />
  )
}

export { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton }
