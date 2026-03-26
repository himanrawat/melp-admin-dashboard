# Melp Admin Panel — Design Guide & Token System

> **Scope**: This is a documentation-only artifact. It explains the design system, token architecture, and component strategy for the Melp admin dashboard. **No code is produced** — only guidelines on *how* to apply the Melp design system using the chosen stack.

---

## 1. What I Understand

### 1.1 The Goal

Build an **admin dashboard** for Melp using:

| Layer | Technology | Why |
|-------|-----------|-----|
| UI Framework | **React** (latest, v19+) | Component model, ecosystem, shadcn compatibility |
| Styling | **Tailwind CSS v4.2** | CSS-first config, `@theme inline`, zero-config content detection |
| Component Library | **shadcn/ui** | Copy-paste ownership, Radix primitives, fully themeable |
| Design Language | **Melp Design System** | Brand consistency across products |

### 1.2 Key Design Decisions

| Decision | Detail |
|----------|--------|
| **No gradients** | Replace every gradient usage with the **solid brand color `#EE4136`** |
| **No shadows** | No `box-shadow` anywhere — flat, clean UI |
| **Don't override shadcn** | Don't create custom color classes per component. Set tokens once in `globals.css`, let shadcn classes (`bg-primary`, etc.) consume them automatically |
| **Tailwind v4.2** | CSS-first configuration — no `tailwind.config.js`; everything lives in CSS via `@theme inline` (explained in detail in Section 3.1) |
| **shadcn/ui** | Use its semantic token convention (`--primary`, `--primary-foreground`, etc.) as the backbone |
| **60-30-10 rule** | Still applies — 60% backgrounds, 30% text/UI, 10% brand accent (`#EE4136`) |
| **Asymmetric radius** | Melp's signature: `border-top-left-radius: 0` on buttons — preserved via custom CSS classes |
| **Montserrat font** | Primary typeface for all UI text |

### 1.3 What "Admin Panel" Means

The admin panel is an internal-facing tool. It will likely include:

- **Sidebar navigation** — collapsible, with icon + label entries
- **Data tables** — sortable, filterable, paginated (restaurants, users, orders, etc.)
- **Forms** — create/edit entities (CRUD)
- **Charts/analytics** — dashboards with KPI cards
- **Dialogs & sheets** — confirmations, detail panels
- **Toast/alert system** — feedback for operations
- **Auth pages** — login, forgot password (if needed)

---

## 2. The 60-30-10 Rule — Adapted for Solid Color

Since we're **dropping gradients**, the 10% accent layer simplifies to a single solid color.

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  60% — DOMINANT (Backgrounds & Surfaces)                   │
│  Light: #F5F5F7 (canvas), #FFFFFF (cards), #F2F2F2   │
│  Dark:  #1F1C1C (canvas), #35383F (cards), #383838   │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  30% — SECONDARY (Text, Borders, UI Chrome)                │
│  Light: #222020 (headings), #484445 (body), #737070  │
│  Dark:  #E5E5E5 (headings), #DDDADA (body), #898787  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  10% — ACCENT (CTAs, Active States, Brand Moments)         │
│  Solid: #EE4136 (brand red)                              │
│  Hover: #B9251C   Active: #99231B                      │
│  Soft:  rgba(238, 65, 54, 0.1)                           │
└────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **No gradients anywhere.** Every place the original design system used `linear-gradient(90deg, #F14C2F, #FF0059)` is now replaced with the flat solid `#EE4136`.

> [!IMPORTANT]
> **No shadows anywhere.** Do not add `box-shadow` to any element — no card shadows, no button shadows, no hover shadows. The UI is flat and clean. Elevation is communicated through background color contrast and borders only.

---

## 3. Token Architecture — Mapping Melp → shadcn/ui

### 3.1 How shadcn/ui Theming Works in Tailwind v4.2 — Explained

#### What is "CSS-first configuration"?

In **Tailwind v3**, you customized your theme in a JavaScript file (`tailwind.config.js`). You'd write something like:

```js
// OLD WAY — Tailwind v3 (we are NOT doing this)
module.exports = {
  theme: {
    colors: {
      primary: '#EE4136',
      background: '#F5F5F7',
    }
  }
}
```

In **Tailwind v4.2**, there is **no JavaScript config file**. Instead, you define everything directly **inside your CSS file** (`globals.css`). This is what "CSS-first" means — CSS is the single source of truth.

#### How it works — Step by Step

**Step 1: Define CSS variables** → Store your actual color values as standard CSS custom properties.

```css
:root {
  --primary: #EE4136;          /* The actual color value */
  --primary-foreground: #FFFFFF; /* The text color that goes ON the primary color */
}
```

At this point, these are just regular CSS variables. Tailwind doesn't know about them yet. You can't write `bg-primary` in your HTML.

**Step 2: Bridge them to Tailwind via `@theme inline`** → This tells Tailwind "create utility classes from these CSS variables."

```css
@theme inline {
  --color-primary: var(--primary);                    /* Creates: bg-primary, text-primary, border-primary */
  --color-primary-foreground: var(--primary-foreground); /* Creates: text-primary-foreground, etc. */
}
```

The naming convention matters: `--color-X` creates Tailwind color classes for `X`. Similarly `--font-X` creates font classes, `--radius-X` creates radius classes.

**Step 3: Use in components** → Now Tailwind classes just work.

```html
<div class="bg-primary text-primary-foreground">Hello</div>
<!-- Renders with #EE4136 background and #FFFFFF text -->
```

#### Why this matters for us

- **One file** — `globals.css` is the single place where all design tokens live
- **shadcn reads these automatically** — shadcn components are built to use `bg-primary`, `text-muted-foreground`, etc. by default. When we set `--primary: #EE4136`, every shadcn `<Button>` automatically becomes Melp Red without us touching the component file
- **Dark mode is trivial** — just redefine the same variables under `.dark { }` and everything switches
- **No build-time dependency** — colors are resolved at runtime via CSS variables, so theme switching is instant

#### The semantic pairs convention

Every token comes in a **pair**: a base token for surfaces, and a `-foreground` token for text/icons that sit on that surface:

| Surface Token | Foreground Token | Meaning |
|--------------|-----------------|----------|
| `--primary` | `--primary-foreground` | Brand accent surface + text on it |
| `--card` | `--card-foreground` | Card background + card text |
| `--muted` | `--muted-foreground` | Muted surface + muted text |

This guarantees contrast — you always know what text color to use on any surface.

### 3.2 Complete Token Map

Below is the full mapping from Melp colors → shadcn semantic tokens:

#### Light Mode (`:root`)

| shadcn Token | Melp Color | Hex | Role |
|-------------|-----------|-----|------|
| `--background` | Off-White | `#F5F5F7` | Page canvas (60%) |
| `--foreground` | Deep Black | `#222020` | Default body text (30%) |
| `--card` | White | `#FFFFFF` | Card surfaces (60%) |
| `--card-foreground` | Deep Black | `#222020` | Card text |
| `--popover` | White | `#FFFFFF` | Dropdowns, popovers |
| `--popover-foreground` | Deep Black | `#222020` | Popover text |
| `--primary` | Melp Red | `#EE4136` | **Brand accent (10%)** — buttons, CTAs |
| `--primary-foreground` | White | `#FFFFFF` | Text on primary |
| `--secondary` | Light Grey | `#F2F2F2` | Secondary buttons, surfaces |
| `--secondary-foreground` | Deep Black 800 | `#484445` | Text on secondary |
| `--muted` | Light Grey | `#F2F2F2` | Muted backgrounds |
| `--muted-foreground` | Slate Grey 500 | `#737070` | Captions, helper text |
| `--accent` | Soft Pink | `#FFF5F7` | Hover/focus backgrounds |
| `--accent-foreground` | Melp Red 700 | `#B9251C` | Text on accent bg |
| `--destructive` | Error Red | `#DC2626` | Delete, danger actions |
| `--border` | Slate Grey 200 | `#D1D0D0` | Default borders |
| `--input` | Slate Grey 200 | `#D1D0D0` | Input borders |
| `--ring` | Melp Red | `#EE4136` | Focus rings |

#### Dark Mode (`.dark`)

| shadcn Token | Melp Color | Hex | Role |
|-------------|-----------|-----|------|
| `--background` | Slate Black | `#1F1C1C` | Page canvas |
| `--foreground` | Text White | `#E5E5E5` | Default body text |
| `--card` | Dark Accent | `#35383F` | Card surfaces |
| `--card-foreground` | Text White | `#E5E5E5` | Card text |
| `--popover` | Grey | `#383838` | Dropdowns, popovers |
| `--popover-foreground` | Text White | `#E5E5E5` | Popover text |
| `--primary` | Melp Red | `#EE4136` | Brand accent (stays same) |
| `--primary-foreground` | White | `#FFFFFF` | Text on primary |
| `--secondary` | Grey | `#383838` | Secondary surfaces |
| `--secondary-foreground` | Deep Black 200 | `#DDDADA` | Text on secondary |
| `--muted` | Grey | `#383838` | Muted backgrounds |
| `--muted-foreground` | Slate Grey 400 | `#898787` | Captions, helper text |
| `--accent` | Dark Accent | `#35383F` | Hover/focus backgrounds |
| `--accent-foreground` | Melp Red 400 | `#F87971` | Text on accent bg |
| `--destructive` | Error Red Light | `#F87171` | Danger (lighter for dark bg) |
| `--border` | Slate Grey 800 | `#464544` | Default borders |
| `--input` | Slate Grey 800 | `#464544` | Input borders |
| `--ring` | Melp Red 400 | `#F87971` | Focus rings |

#### Sidebar-Specific Tokens

| Token | Light | Dark | Notes |
|-------|-------|------|-------|
| `--sidebar` | `#FFFFFF` | `#1F1C1C` | Sidebar background |
| `--sidebar-foreground` | `#222020` | `#E5E5E5` | Sidebar text |
| `--sidebar-primary` | `#EE4136` | `#EE4136` | Active nav item |
| `--sidebar-primary-foreground` | `#FFFFFF` | `#FFFFFF` | Text on active item |
| `--sidebar-accent` | `#FFF5F7` | `#35383F` | Hover/expanded state |
| `--sidebar-accent-foreground` | `#B9251C` | `#F87971` | Text on hover |
| `--sidebar-border` | `#D1D0D0` | `#464544` | Sidebar dividers |
| `--sidebar-ring` | `#EE4136` | `#F87971` | Focus ring in sidebar |

#### Chart Tokens

| Token | Light | Dark | Color Name |
|-------|-------|------|------------|
| `--chart-1` | `#EE4136` | `#F87971` | Melp Red (brand) |
| `--chart-2` | `#10B981` | `#6EE7B7` | Success Green |
| `--chart-3` | `#F59E0B` | `#FBBF24` | Warning Amber |
| `--chart-4` | `#216BDE` | `#60A5FA` | Info Blue |
| `--chart-5` | `#FF0059` | `#FF5C7A` | Melp Pink |

### 3.3 Additional Custom Tokens (Beyond shadcn defaults)

These extend the shadcn palette for admin-specific needs:

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--success` | `#10B981` | `#6EE7B7` | Success states |
| `--success-foreground` | `#FFFFFF` | `#065F46` | Text on success |
| `--warning` | `#F59E0B` | `#FBBF24` | Warning states |
| `--warning-foreground` | `#FFFFFF` | `#78350F` | Text on warning |
| `--info` | `#216BDE` | `#60A5FA` | Info states |
| `--info-foreground` | `#FFFFFF` | `#1E3A8A` | Text on info |

To make these available as Tailwind classes, they'd be registered via `@theme inline`:

```
@theme inline {
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
}
```

This enables classes like `bg-success`, `text-warning-foreground`, etc.

---

## 3A. The "Don't Override" Principle

> [!CAUTION]
> This is the single most important principle for developers working on this project.

### The Problem It Solves

Without this rule, developers would:
- Create a `.btn-primary { background: #EE4136; }` custom class — **duplicating** what `bg-primary` already does
- Write `<Card className="bg-white border-gray-200">` — **hardcoding** colors that won't respond to dark mode
- Add `shadow-lg` to individual cards — **inconsistently** applying effects

### The Rule

**Don't add color/shadow/gradient classes to individual components.** Instead:

1. **Set the token values once** in `globals.css` under `:root` and `.dark`
2. **Let shadcn's built-in classes consume those tokens** — `bg-primary`, `text-muted-foreground`, `border-border`, etc.
3. **Never hardcode hex values** in component files or inline styles

### How It Works in Practice

| Scenario | ❌ Wrong | ✅ Right | Why |
|----------|---------|---------|-----|
| Card background | `<Card className="bg-white">` | `<Card>` (no extra class) | shadcn Card already uses `--card` token |
| Button color | `<Button className="bg-[#EE4136]">` | `<Button>` (default variant) | shadcn Button default uses `--primary` token |
| Muted text | `<p className="text-gray-500">` | `<p className="text-muted-foreground">` | Uses semantic token, auto-adapts to dark mode |
| Border | `<div className="border-gray-300">` | `<div className="border-border">` | Uses `--border` token |
| Page background | `<main className="bg-[#F5F5F7]">` | `<main className="bg-background">` | Uses `--background` token |

### The Flow

```
globals.css (:root)         →   @theme inline              →   Component
--primary: #EE4136          →   --color-primary: var(...)   →   <Button> uses bg-primary
--card: #FFFFFF             →   --color-card: var(...)      →   <Card> uses bg-card
--border: #D1D0D0           →   --color-border: var(...)    →   <Input> uses border-input
```

The developer never touches colors. They set up `globals.css` once, and every shadcn component automatically picks up the right Melp colors.

---

## 4. How the CSS File Should Be Structured (`globals.css`)

The single `globals.css` file replaces both the old `tailwind.config.ts` and the global styles. Here's the conceptual structure:

```
┌─────────────────────────────────────────────────┐
│  1. @import "tailwindcss"                       │
│  2. @import "shadcn/tailwind.css"               │  ← shadcn base styles
│  3. @custom-variant dark (&:is(.dark *))        │  ← dark mode strategy
│  4. @theme inline { ... }                       │  ← expose CSS vars to Tailwind
│  5. :root { ... }                               │  ← light mode tokens
│  6. .dark { ... }                               │  ← dark mode tokens
│  7. @layer base { ... }                         │  ← base resets & defaults
│  8. @layer components { ... }                   │  ← custom component classes
│  9. Google Font @import (Montserrat)            │
└─────────────────────────────────────────────────┘
```

### Key Sections Explained

| Section | Purpose |
|---------|---------|
| `@import "tailwindcss"` | Loads the Tailwind v4 engine (replaces `@tailwind base/components/utilities`) |
| `@import "shadcn/tailwind.css"` | Loads shadcn base component styles |
| `@custom-variant dark` | Tells Tailwind that `.dark` class toggles dark mode |
| `@theme inline` | Bridges CSS variables → Tailwind utility classes (`bg-primary`, etc.) |
| `:root` / `.dark` | Where all the Melp color values live |
| `@layer base` | Global defaults: `body { @apply bg-background text-foreground }` |
| `@layer components` | Custom Melp-specific classes (e.g., `btn-melp`, asymmetric radius) |

---

## 5. Typography

### Font: Montserrat

All text uses Montserrat. In Tailwind v4.2, the font-family is registered via `@theme inline`:

```
@theme inline {
  --font-sans: "Montserrat", ui-sans-serif, system-ui, sans-serif;
}
```

This makes `font-sans` use Montserrat by default across the app.

### Scale

| Role | HTML | Size | Weight | Tailwind Class |
|------|------|------|--------|---------------|
| Page Title | `<h1>` | 48px / 3rem | 700 (Bold) | `text-5xl font-bold` |
| Section Title | `<h2>` | 36px / 2.25rem | 500 (Medium) | `text-4xl font-medium` |
| Subsection | `<h3>` | 24px / 1.5rem | 400 (Regular) | `text-2xl font-normal` |
| Component Title | `<h4>` | 20px / 1.25rem | 500 (Medium) | `text-xl font-medium` |
| Body | `<p>` | 16px / 1rem | 400 (Regular) | `text-base` |
| Small Body | `<p>` | 14px / 0.875rem | 400 (Regular) | `text-sm` |
| Caption | `<span>` | 12px / 0.75rem | 300 (Light) | `text-xs font-light` |

### Admin Dashboard Specific

In admin panels, the most common text sizes are:

- **Data table cells**: `text-sm` (14px)
- **Table headers**: `text-xs font-medium uppercase tracking-wider`
- **KPI card values**: `text-3xl font-bold`
- **KPI card labels**: `text-sm text-muted-foreground`
- **Sidebar nav items**: `text-sm font-medium`
- **Page titles**: `text-2xl font-bold` (not full `text-5xl` — admin panels are denser)
- **Breadcrumbs**: `text-sm text-muted-foreground`

---

## 6. Radius System

### Base Radius

shadcn derives all radii from a single `--radius` variable. The Melp design system defines several radii; for the admin panel, a good base value is:

```
--radius: 0.625rem;   /* 10px */
```

This generates the full scale:

| Token | Calculation | Value | Use |
|-------|------------|-------|-----|
| `radius-sm` | `--radius × 0.6` | 6px | Small chips, badges |
| `radius-md` | `--radius × 0.8` | 8px | Inputs, small cards |
| `radius-lg` | `= --radius` | 10px | Cards, dialogs |
| `radius-xl` | `--radius × 1.4` | 14px | Large cards |
| `radius-2xl` | `--radius × 1.8` | 18px | Buttons (Melp brand) |

### Melp's Signature: Asymmetric Radius

Melp buttons use `border-top-left-radius: 0` with rounded other corners. This is **not natively supported** by a single Tailwind class. It requires a custom utility or component class:

```css
/* In @layer components */
.melp-radius {
  border-radius: var(--radius-2xl);
  border-top-left-radius: 0;
}
```

Usage: `<Button className="melp-radius">Save</Button>`

Or, using arbitrary Tailwind syntax:
```
rounded-2xl rounded-tl-none
```

---

## 7. Component Strategy — Using shadcn/ui

### 7.1 Philosophy

shadcn/ui components are **copied into your project** (not imported from `node_modules`). This gives full ownership. The components consume the CSS tokens we defined, so theming "just works."

### 7.2 Admin-Relevant Components

| shadcn Component | Admin Use Case | Notes |
|-----------------|---------------|-------|
| **Sidebar** | Main navigation | Collapsible, multi-level, icon + label |
| **Data Table** | Entity lists (restaurants, users, orders) | With `@tanstack/react-table` |
| **Dialog** | Confirmations, create/edit forms | Modal overlay |
| **Sheet** | Detail panels, filters | Slide-in from side |
| **Form** | All CRUD forms | With `react-hook-form` + `zod` |
| **Input / Textarea / Select** | Form fields | Themed via `--input` token |
| **Button** | All actions | Override with Melp asymmetric radius |
| **Badge** | Status indicators | Success, warning, error variants |
| **Card** | KPI cards, stat blocks | Uses `--card` / `--card-foreground` |
| **Chart** | Analytics dashboards | Uses `--chart-1` through `--chart-5` |
| **Tabs** | Content sections | Settings, detail views |
| **Toast / Sonner** | Operation feedback | Success/error notifications |
| **Dropdown Menu** | Row actions, user menu | Three-dot menus in tables |
| **Breadcrumb** | Page hierarchy | Standard admin pattern |
| **Avatar** | User profiles | In sidebar, header |
| **Skeleton** | Loading states | Placeholder while data loads |
| **Alert** | System messages | Info, warning, error alerts |
| **Pagination** | Table pagination | Part of data table setup |
| **Command** | Quick search / command palette | ⌘K search pattern |

### 7.3 The Only Customization Needed on shadcn Button

shadcn's `<Button>` uses `--primary` and `--primary-foreground` tokens by default, so the color will **automatically** be Melp Red (`#EE4136`) without any manual color overrides.

The **only** customization needed is Melp's **asymmetric radius**:

1. After running `npx shadcn@latest add button`, open the generated `components/ui/button.tsx`
2. Modify the `buttonVariants` base styles:
   - Add `rounded-2xl rounded-tl-none` to the base variant
   - **Do not add any shadows** — buttons are flat
   - **Do not add any color overrides** — the tokens handle it
   - Keep all shadcn variants as-is (ghost, outline, secondary, destructive, link)

### 7.4 Button Variant Mapping

| Melp Design System | shadcn Variant | Token Used | Developer Action |
|--------------------|---------------|------------|------------------|
| `btn-primary` | `default` | `bg-primary text-primary-foreground` | None — automatic |
| `btn-secondary` | `secondary` | `bg-secondary text-secondary-foreground` | None — automatic |
| `btn-outline` | `outline` | `border-input bg-background` | None — automatic |
| `btn-ghost` | `ghost` | Transparent, hover tinted | None — automatic |
| `btn-danger` | `destructive` | `bg-destructive text-destructive-foreground` | None — automatic |
| `btn-soft` | Custom variant | `bg-primary/10 text-primary` | Add to `buttonVariants` once |
| `btn-success` | Custom variant | `bg-success text-success-foreground` | Add to `buttonVariants` once |

---

## 8. Dark Mode Strategy

### Toggle Mechanism

shadcn uses the `.dark` class on the `<html>` element. This is already configured via:

```
@custom-variant dark (&:is(.dark *));
```

### Implementation Approach

1. Use shadcn's `useTheme()` hook (from `next-themes` or a custom provider)
2. Store preference in `localStorage`
3. Respect `prefers-color-scheme` as the default
4. Provide a toggle in the admin header (sun/moon icon button)

### What Changes in Dark Mode

| Element | Light | Dark |
|---------|-------|------|
| Page canvas | `#F5F5F7` | `#1F1C1C` |
| Cards | `#FFFFFF` | `#35383F` |
| Text | `#222020` | `#E5E5E5` |
| Borders | `#D1D0D0` | `#464544` |
| Brand accent | `#EE4136` | `#EE4136` (unchanged) |
| Hover accent text | `#B9251C` | `#F87971` (lighter) |
| Focus rings | `#EE4136` | `#F87971` |

> [!NOTE]
> The brand solid color `#EE4136` stays the **same** in both modes. Only supporting accent colors (hover, focus, soft backgrounds) shift for contrast.

---

## 9. Accessibility

### Contrast Ratios

| Pair | Ratio | Passes? |
|------|-------|---------|
| `#222020` on `#FFFFFF` | ~18.5:1 | ✅ AAA |
| `#484445` on `#FFFFFF` | ~9.8:1 | ✅ AAA |
| `#EE4136` on `#FFFFFF` | ~4.9:1 | ✅ AA (large text + UI) |
| `#FFFFFF` on `#EE4136` | ~4.9:1 | ✅ AA |
| `#E5E5E5` on `#1F1C1C` | ~16.8:1 | ✅ AAA |
| `#EE4136` on `#1F1C1C` | ~5.2:1 | ✅ AA |

### Requirements for Admin Panel

- All text ≥16px: minimum 4.5:1 contrast
- Text <16px: minimum 4.5:1 contrast  
- UI elements (borders, icons): minimum 3:1 contrast
- Focus indicators: visible 2px outline on all interactive elements
- Touch targets: minimum 44×44px for all clickable elements
- Keyboard navigation: full tab-through support (shadcn provides this via Radix)
- Screen reader support: proper `aria-label` on icon-only buttons, `aria-hidden` on decorative icons
- Loading states: `aria-busy="true"` + visually hidden text

---

## 10. Recommended Project Structure

```
melp-admin-dashboard/
├── src/
│   ├── app/                        # Pages / routes
│   │   ├── layout.tsx              # Root layout (font, theme provider)
│   │   ├── page.tsx                # Dashboard home
│   │   ├── restaurants/            # Restaurant management
│   │   ├── users/                  # User management
│   │   ├── orders/                 # Order management
│   │   ├── analytics/              # Charts & KPIs
│   │   └── settings/               # App settings
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn components (auto-generated)
│   │   │   ├── button.tsx          # Customized with Melp radius
│   │   │   ├── sidebar.tsx
│   │   │   ├── data-table.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── app-sidebar.tsx     # Main sidebar navigation
│   │   │   ├── header.tsx          # Top bar with search, user menu
│   │   │   └── breadcrumbs.tsx
│   │   └── shared/                 # Reusable composed components
│   │       ├── kpi-card.tsx
│   │       ├── status-badge.tsx
│   │       └── data-table-toolbar.tsx
│   │
│   ├── styles/
│   │   └── globals.css             # ALL design tokens + Tailwind config
│   │
│   ├── lib/
│   │   └── utils.ts                # cn() utility (from shadcn)
│   │
│   └── hooks/                      # Custom hooks
│       └── use-theme.ts
│
├── components.json                 # shadcn configuration
└── package.json
```

---

## 11. How to Apply the Design (Step-by-Step)

### Step 1: Initialize the Project

- Set up a React project (Vite or Next.js)
- Install Tailwind CSS v4.2 (`@tailwindcss/vite` or `@tailwindcss/postcss`)
- Initialize shadcn: `npx shadcn@latest init`

### Step 2: Configure `globals.css`

- Replace the default shadcn theme tokens with the Melp token map (Section 3.2)
- Add Montserrat font import
- Register custom tokens via `@theme inline`
- Add the `melp-radius` utility class

### Step 3: Install shadcn Components

```
npx shadcn@latest add sidebar button card input dialog sheet
npx shadcn@latest add data-table form select textarea badge
npx shadcn@latest add tabs toast dropdown-menu breadcrumb
npx shadcn@latest add avatar skeleton alert pagination command chart
```

### Step 4: Customize Components

- Modify `button.tsx` to add Melp's asymmetric radius + shadow
- Add custom variants (soft, success) to the button variants
- Configure sidebar with Melp sidebar tokens

### Step 5: Build Layouts

- Create the admin shell: sidebar + header + main content area
- Implement dark mode toggle using theme provider
- Set up routing for each admin section

### Step 6: Build Pages

- Dashboard (KPI cards + charts)
- Entity list pages (data tables)
- Entity detail/edit pages (forms + sheets)

---

## 12. Developer Rules — The Consistency Playbook

These rules are **mandatory** for every developer working on this project. They ensure that the design stays consistent regardless of who is building which page.

---

### Rule 1: Never Hardcode Colors

| ❌ Banned | ✅ Required | Why |
|-----------|------------|-----|
| `bg-[#EE4136]` | `bg-primary` | Hardcoded values won't update if tokens change |
| `text-[#222020]` | `text-foreground` | Breaks dark mode |
| `border-[#D1D0D0]` | `border-border` | Inconsistent across components |
| `bg-white` | `bg-card` or `bg-background` | `bg-white` doesn't flip in dark mode |
| `text-gray-500` | `text-muted-foreground` | Tailwind's default gray ≠ Melp's slate grey |

**The rule**: If you're reaching for a hex value or a Tailwind default color (`gray-*`, `red-*`, `slate-*`), stop. Find the corresponding semantic token instead.

---

### Rule 2: Never Add Shadows

| ❌ Banned | ✅ Required |
|-----------|------------|
| `shadow-sm`, `shadow-md`, `shadow-lg` | No shadow class at all |
| `shadow-[any custom value]` | Remove it |
| `box-shadow` in inline styles | Remove it |
| `hover:shadow-*` | Use `hover:bg-*` for hover states instead |

**The rule**: Elevation is communicated through **background color contrast** and **borders**, never shadows. A card on a page is differentiated by `bg-card` on `bg-background`, not by a drop shadow.

---

### Rule 3: Never Add Gradients

| ❌ Banned | ✅ Required |
|-----------|------------|
| `bg-gradient-to-r` | `bg-primary` (solid) |
| `linear-gradient(...)` in CSS | `background: var(--primary)` |
| `from-[#F14C2F] to-[#FF0059]` | `bg-primary` |

**The rule**: `#EE4136` solid is the only brand color. No gradients, no transitions between colors.

---

### Rule 4: Don't Override shadcn Component Styles

| ❌ Wrong | ✅ Right |
|---------|--------|
| `<Card className="bg-white border-gray-200 shadow-md">` | `<Card>` |
| `<Button className="bg-red-500 text-white">` | `<Button>` |
| `<Input className="border-gray-300 focus:ring-red-500">` | `<Input>` |
| `<Badge className="bg-green-100 text-green-800">` | `<Badge variant="success">` |

**The rule**: shadcn components already consume the tokens we defined. Adding extra color/shadow classes on individual component instances creates inconsistency. If a component doesn't look right, the fix goes in `globals.css` (the token), **not** on the component usage.

**Exception**: Layout utilities like `className="w-full mt-4"` are fine — they don't affect theming.

---

### Rule 5: One Primary CTA Per Section

```
┌─────────────────────────────────────────────┐
│  Section                                    │
│                                             │
│  [Secondary]  [Ghost]  [■ Primary CTA ■]    │  ← Only ONE primary
│                                             │
└─────────────────────────────────────────────┘
```

**The rule**: Never place two `<Button variant="default">` (Melp Red) buttons in the same visible viewport section. Use `secondary`, `outline`, or `ghost` for other actions.

---

### Rule 6: Use Semantic Token Classes, Not Generic Ones

| Context | ❌ Generic | ✅ Semantic |
|---------|-----------|-------------|
| Page background | `bg-gray-50` | `bg-background` |
| Card surface | `bg-white` | `bg-card` |
| Primary text | `text-black` | `text-foreground` |
| Secondary text | `text-gray-500` | `text-muted-foreground` |
| Border | `border-gray-200` | `border-border` |
| Input border | `border-gray-300` | `border-input` |
| Hover bg | `hover:bg-gray-100` | `hover:bg-accent` |
| Focus ring | `ring-blue-500` | `ring-ring` |

**The rule**: Tailwind's default palette (`gray-*`, `red-*`, `blue-*`) does not exist in this project. Only semantic tokens exist.

---

### Rule 7: Melp Radius on Buttons Only

| Component | Radius |
|-----------|--------|
| Buttons | `rounded-2xl rounded-tl-none` (Melp signature) |
| Cards | `rounded-lg` (standard shadcn) |
| Inputs | `rounded-md` (standard shadcn) |
| Dialogs | `rounded-lg` (standard shadcn) |
| Badges | `rounded-md` (standard shadcn) |

**The rule**: The asymmetric radius is a **button-only** brand element. Do not apply it to cards, inputs, dialogs, or any other component.

---

### Rule 8: Dark Mode Must Be Automatic

**The rule**: Never write dark-mode-specific classes in component files. All dark mode behavior must flow through the CSS tokens in `globals.css`.

| ❌ Wrong | ✅ Right |
|---------|--------|
| `<div className="bg-white dark:bg-gray-800">` | `<div className="bg-card">` |
| `<p className="text-black dark:text-white">` | `<p className="text-foreground">` |

You should **never** need to write `dark:` prefixes. If you find yourself needing `dark:`, it means you're using a non-semantic class.

---

### Rule 9: Where Fixes Go

| Problem | Fix Location | How |
|---------|-------------|-----|
| "Primary button is wrong color" | `globals.css` → `:root` → `--primary` | Change the token value |
| "Card border is too dark" | `globals.css` → `:root` → `--border` | Change the token value |
| "Button needs larger radius" | `button.tsx` → `buttonVariants` | Change once, affects all buttons |
| "Need a new color variant" | `globals.css` → add token + `@theme inline` | Extend the system |
| ❌ "This one card needs different bg" | **Don't** — find out why it's different | Likely a token issue, not a component issue |

---

### Rule 10: The Decision Tree

When building any component, follow this:

```
Do I need a color?          → Use a semantic token class (bg-primary, text-muted-foreground)
Do I need a shadow?         → No. Never.
Do I need a gradient?       → No. Never.
Is the component from shadcn? → Use it as-is, don't add color overrides
Does it look wrong?         → Fix the token in globals.css, not the component
Do I need dark mode?        → It's automatic if you used tokens
Do I need a new color?      → Add a new token pair in globals.css + @theme inline
```

---

### Rule 11: Don't Let shadcn Overwrite Our Design System

> [!CAUTION]
> shadcn CLI operations (`npx shadcn@latest add`, `npx shadcn@latest init`, component updates) **will try to inject or overwrite** token values in `globals.css`. If you accept those changes blindly, the Melp design system is destroyed.

#### The Danger

When you run `npx shadcn@latest add button`, shadcn may:
- Overwrite `:root` and `.dark` blocks in `globals.css` with **its own default colors** (neutral grays in `oklch` format)
- Reset `--primary` from `#EE4136` to shadcn's default dark/light neutral
- Add shadows or other styles that conflict with Melp's flat design
- Reset `--radius` to its own default

#### The Protection Workflow

| Step | Action |
|------|--------|
| **Before** adding any shadcn component | **Back up `globals.css`** — copy it or commit it to git |
| **During** `npx shadcn add ...` | If prompted about overwriting styles, **decline** or review carefully |
| **After** adding a component | **Immediately diff `globals.css`** against your backup. Revert any token changes shadcn made |
| **Always** | Git-commit `globals.css` before any shadcn operation so you can `git checkout` if needed |

#### What to Watch For

| shadcn might inject | Our Melp value | Action |
|--------------------|---------------|--------|
| `--primary: oklch(0.205 0 0)` | `--primary: #EE4136` | **Revert** — keep Melp's value |
| `--background: oklch(1 0 0)` | `--background: #F5F5F7` | **Revert** — keep Melp's value |
| `--radius: 0.625rem` (may reset) | `--radius: 0.625rem` | **Verify** — confirm it matches |
| New `box-shadow` properties | None | **Delete** — we don't use shadows |
| New color tokens we don't have | — | **Evaluate** — keep only if the component needs it, set to Melp-appropriate values |

#### The Rule

**`globals.css` is sacred.** Only one person (the design system owner) should modify it. When adding shadcn components:
1. Only accept the **component `.tsx` file** — that goes into `components/ui/`
2. **Never blindly accept** changes to `globals.css`, `@theme inline`, or `:root`/`.dark` blocks
3. If a new component needs a new token (e.g., `--sidebar-*`), add it **manually** with Melp-appropriate color values
4. After every shadcn operation, run `git diff globals.css` and review every line

---

## 13. Summary of Key Principles

| # | Principle | Rule |
|---|-----------|------|
| 1 | **60-30-10** | 60% neutrals, 30% text/chrome, 10% `#EE4136` |
| 2 | **No gradients** | Solid `#EE4136` everywhere — no `linear-gradient`, no `bg-gradient-*` |
| 3 | **No shadows** | No `box-shadow` anywhere — flat UI, elevation via color contrast + borders |
| 4 | **Don't override** | Never add colors to component instances — let tokens flow through |
| 5 | **One primary CTA** | Maximum one `#EE4136` button per visible section |
| 6 | **Asymmetric radius** | `rounded-2xl rounded-tl-none` on buttons only → Melp signature |
| 7 | **Montserrat everywhere** | Single typeface, weight variation for hierarchy |
| 8 | **Semantic tokens only** | No Tailwind default palette — only `bg-primary`, `text-foreground`, etc. |
| 9 | **Accessibility first** | 4.5:1 contrast, keyboard nav, ARIA labels, 44px touch targets |
| 10 | **Dark mode is automatic** | Tokens handle it — never write `dark:` prefix classes |
| 11 | **Fixes go to tokens** | If it looks wrong, fix `globals.css`, not the component |
| 12 | **Protect from shadcn** | `globals.css` is sacred — never let `npx shadcn add` overwrite Melp tokens |

---

## 14. Layout Architecture — Component Structure

### 14.1 Directory Structure

```
src/
├── components/
│   ├── ui/                          # shadcn/ui primitives — DO NOT EDIT
│   │   ├── button.tsx               # (only exception: Melp radius added here)
│   │   ├── card.tsx
│   │   ├── sidebar.tsx
│   │   ├── chart.tsx
│   │   └── ... (20 files)
│   │
│   ├── layout/                      # App shell — sidebar, header, navigation
│   │   ├── app-sidebar.tsx          # Main sidebar: logo, nav groups, user menu
│   │   ├── site-header.tsx          # Top header: sidebar trigger, page title
│   │   ├── nav-main.tsx             # Primary nav items (Dashboard, Analytics, etc.)
│   │   ├── nav-documents.tsx        # Document shortcuts section
│   │   ├── nav-secondary.tsx        # Bottom nav (Settings, Help, Search)
│   │   └── nav-user.tsx             # User avatar + dropdown menu
│   │
│   └── dashboard/                   # Dashboard page-specific components
│       ├── section-cards.tsx         # 4 KPI metric cards (Revenue, Customers, etc.)
│       ├── chart-area-interactive.tsx # Area chart with time range selector
│       ├── data-table.tsx           # Draggable data table with tabs
│       └── data.json                # Sample data for the table
│
├── pages/                           # Page compositions
│   └── DashboardPage.tsx            # Composes: SectionCards + Chart + DataTable
│
├── hooks/
│   └── use-mobile.ts                # Responsive breakpoint hook
│
├── lib/
│   └── utils.ts                     # cn() utility (Tailwind class merger)
│
└── styles/
    └── globals.css                  # ALL design tokens (SACRED — Section 12, Rule 11)
```

### 14.2 The Layout Shell

The app uses a **sidebar-inset** layout pattern from shadcn:

```
┌─────────────────────────────────────────────────────────┐
│  SidebarProvider                                        │
│  ┌──────────┬──────────────────────────────────────┐    │
│  │          │  SidebarInset                        │    │
│  │          │  ┌──────────────────────────────────┐ │    │
│  │ AppSidebar │  │ SiteHeader (border-b)           │ │    │
│  │          │  ├──────────────────────────────────┤ │    │
│  │          │  │                                  │ │    │
│  │          │  │  Page Content (DashboardPage)    │ │    │
│  │          │  │                                  │ │    │
│  │          │  └──────────────────────────────────┘ │    │
│  └──────────┴──────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**In code** (`App.tsx`):
```tsx
<SidebarProvider>
  <AppSidebar variant="inset" />
  <SidebarInset>
    <SiteHeader />
    <DashboardPage />       {/* ← swap this for other pages */}
  </SidebarInset>
</SidebarProvider>
```

### 14.3 Component Organization Rules

| Category | Directory | What goes here | Who edits |
|----------|-----------|---------------|-----------|
| **UI Primitives** | `components/ui/` | shadcn components (button, card, input, etc.) | Only when customizing variants (e.g., Melp radius on button) |
| **Layout** | `components/layout/` | App shell, sidebar, header, navigation | Rarely — only for structural changes |
| **Feature** | `components/<feature>/` | Page-specific components (dashboard/, users/, etc.) | Frequently — this is where new features go |
| **Pages** | `pages/` | Page-level compositions that assemble feature components | When adding new routes |
| **Hooks** | `hooks/` | Custom React hooks | As needed |
| **Utilities** | `lib/` | Helper functions | Rarely |

### 14.4 Adding a New Page

When adding a new page (e.g., Restaurants):

1. **Create a feature directory**: `src/components/restaurants/`
2. **Create feature components** inside it (table, form, filters)
3. **Create a page composition**: `src/pages/RestaurantsPage.tsx`
4. **Swap the page** in `App.tsx` (or add a router)

```
src/
├── components/
│   └── restaurants/              # NEW feature directory
│       ├── restaurant-table.tsx
│       ├── restaurant-form.tsx
│       └── restaurant-filters.tsx
├── pages/
│   ├── DashboardPage.tsx
│   └── RestaurantsPage.tsx       # NEW page
```

> [!IMPORTANT]
> **Never put feature components in `ui/` or `layout/`.** Those directories are reserved for reusable infrastructure. Feature components go in their own `components/<feature>/` directory.

