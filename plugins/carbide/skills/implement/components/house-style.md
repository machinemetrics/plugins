# MachineMetrics house style

Carbide primitives decide *what* to render; this file decides *how dense* it looks. Every
rule below is what shipped MachineMetrics apps actually do, match it so a new surface reads
as part of the product instead of a default shadcn page.

## Embedded host apps: the host owns overlay chrome

**Check this before you build any overlay.** If the app has `@machinemetrics/mm-react-tools`
in its dependencies, the `mmdev create` embedded template installs it, the app is meant to
render *inside* a MachineMetrics host (app-gallery, dashboard) as an iframe. The host, not
the app, owns every full-viewport surface.

The hook and command names below are those of mm-react-tools 4.x. The
*rule*, host owns the chrome, app renders bare content, does not depend on the names, so
confirm the names against the version the app actually has installed before you write the
call, the same way you confirm a mm-react-components export exists before importing it.

In an embedded app, do **not** use the mm-react-components `Dialog`, `Sheet`, `AlertDialog`,
`Toaster`/`toast`, or any other self-mounted full-screen overlay. Two overlay layers stack,
the app's backdrop is clipped to the iframe, and the host's own chrome is bypassed. Use the
host commands instead:

- **Detect the mode first.** `useMMAppParams().isEmbedded` is the only supported signal.
  Branch on it; never assume one mode.
- **Sidesheets / detail views.** Render the detail *bare*, no `Sheet` wrapper, and let the
  host frame it. `useMMAppCommands().launchModal(absoluteUrl, options)` is what opens it;
  the host defaults to its sidesheet variant, and `{ variant: 'overlay' }` asks for
  full-screen instead.
- **Full-screen.** Same `launchModal`, with an **absolute** URL (`globalThis.location.origin`
  plus the route) because the host loads it in a fresh iframe. Register the save affordance
  with `useMMAppModalSave(handler, deps)` so the host's Save button drives your handler.
- **Confirms.** `useMMAppCommands().confirm({ header, body, choices })` resolves to the chosen
  value, or `false` on dismissal. Guard it (`if (confirm) ...`) and fall back for standalone.
- **Toasts.** `useMMAppCommands().toast(...)` when embedded, with a standalone shim around the
  library `toast` for local dev. See knowledge-client's `hooks/useToast.ts`, which branches on
  `isEmbedded` and exposes one call signature to the rest of the app.

Every command is a runtime property of the object `useMMAppCommands()` returns, not a
top-level package export, so read the installed package's own types and source for the
current surface, treat each command as optional, and guard before calling. Working call
sites: knowledge-client
`src/hooks/useToast.ts`, job-docs-client `src/components/DocumentDetailsSheet/DocumentDetailsBody.tsx`.

## Density and typography

- **Body text is `text-sm`.** `text-base` is effectively unused in shipped apps; do not rely
  on the browser default size.
- **Secondary text is `text-sm text-muted-foreground`**, or `text-xs text-muted-foreground`
  for the tightest metadata (timestamps, counts, log lines).
- **Dialog and section titles: `text-lg font-semibold`** on a real heading element.
- **Page / brand titles: `text-lg font-medium`** (knowledge-client's nav `h1` is
  `text-lg font-medium text-foreground leading-tight md:text-xl`).
- **Table headers: `font-medium`**, not `font-bold`, plus `p-2` on the cell.

## Spacing

- **Space with flex and `gap-*`, not `space-y-*`.** Shipped apps use `gap-` roughly 10–60×
  more often than `space-y-`; `flex flex-col gap-*` is the grouping idiom. Reserve `space-y-*`
  for a run of prose or log lines with no flex container.
- `gap-2` is the default step, and `gap-1` the tight one (label to its value, icon to its
  text). Step up to `gap-3`/`gap-4` between distinct groups, and `gap-6` between major card
  sections.
- **Padding:** `p-4` for a body or content region, `p-6` for cards and dialog bodies, `p-2`
  for compact table cells.
- **Control height:** `h-8` for toolbar, filter-bar, and icon-only actions (including the
  sortable-header button). Full-size inputs and primary buttons keep their default height,
  do not shrink a form field to `h-8` to match a toolbar.

## Buttons and footers

- **Dialog footer: `mt-6 flex justify-end gap-2`.** Cancel comes **first** with
  `variant="outline"`; the primary action is second and last in the DOM. Exactly one primary
  action per surface.
- A confirm dialog whose two choices are equally weighted may instead use `flex gap-3` with
  `flex-1` buttons, the outline-then-primary order still holds.
- An **in-card** form footer is the one exception to `justify-end`: `TicketForm` uses
  `flex gap-2 border-t border-border bg-muted/30 px-6 py-4` and leads with the submit button.
  Follow that only inside a `CardFooter`, never in a dialog or sheet.
- **Confirm icon badge.** One shape and one size for every confirmation dialog: the
  `EmptyMedia variant="icon"` badge, `size-10 rounded-lg`, wrapping a `size-6` icon. Only the
  tint varies, `bg-primary/10 text-primary` normally, `bg-destructive/10 text-destructive`
  for a destructive confirm. Do not hand-build a rounded square, and do not vary the
  geometry per dialog.

## Icons

lucide-react, at `h-4 w-4`. Icons that annotate rather than act take `text-muted-foreground`.
In a sortable table header the sort indicator is `ml-2 h-4 w-4 text-muted-foreground`.

## Color tokens

Style through the semantic token **families**, never a raw color or a palette step:

- surface and text, `--background`/`--foreground`, `--card`/`--card-foreground`,
  `--popover`/`--popover-foreground`
- emphasis, `--primary`/`--primary-foreground`, `--secondary`, `--accent`
- recessive layering, `--muted`/`--muted-foreground`, plus fractional utilities for banding
  (`bg-muted/40` on a card header, `bg-muted/30` on a footer, `bg-muted/15` on a body)
- danger, `--destructive`/`--destructive-foreground`
- edges and focus, `--border`, `--input`, `--ring`
- charts, `--chart-1` … `--chart-5`, the *only* source of series color
- corners, the radius scale `--radius`, `--radius-sm`, `--radius-md`, `--radius-lg`,
  `--radius-xl`

The shipped theme stylesheet is **the authority** for every token name and value, including
the palette scales and component tokens not listed here. `src/` is not published; read it in
the installed package at
`node_modules/@machinemetrics/mm-react-components/dist/themes/carbide.css` (the
`./themes/carbide` export). Look a token up there rather than trusting a list in any
document; nothing here is generated from it.

## The Tailwind caveat

Embedded MachineMetrics clients typically have **no Tailwind build of their own**, no
`tailwind.config`, no `tailwindcss` dependency. They import the library's precompiled CSS:

```css
@import '@machinemetrics/mm-react-components/styles';
@import '@machinemetrics/mm-react-components/themes/carbide';
```

That stylesheet contains only the utilities the library's own sources needed. A class the
library never used, most importantly any **arbitrary-value** class such as `min-h-[300px]`
or `max-w-[200px]`, has no rule to match and is a silent no-op: no error, just an unstyled
element. Prefer a plain scale class the library itself already uses. When a specific value is
genuinely required, the escape hatch is a small scoped plain-CSS rule (or a `style` prop),
never a bracketed class.
