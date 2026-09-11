# Frontend component structure (universal)

Summary of base vs. customization layer and composition patterns. Adapt to your project (e.g. shadcn/ui, Radix, or an internal design system).

## Rules

| Layer | Rule |
|-------|------|
| **Base** (vendor / CLI-installed / design system) | Do not modify. Updated by CLI or upstream; customizations here are lost. |
| **App / customization** (e.g. `ui/`, `components/app/`) | Customize here only. Re-export from base; override via composition. |

## Composition

Compose base components in the customization layer and preserve their documented public,
theming, and accessibility contracts. Use the installed package's current guidance for
implementation mechanics. Re-export unchanged behavior rather than forking it.

## Theming

- Use semantic CSS variables for colors and spacing; support light/dark via variables.
- Add design-system attributes (e.g. `data-slot`, `data-variant`) when the theme stylesheet targets them.
- Single compiled CSS entry for the library or app so consumers get one import.

## Adding and updating

- **New behavior:** Use Carbide components as the base when applicable. Compose or
  customize, and add a primitive only after recording a legitimate gap.
- **Update base:** Use the project's documented update workflow and verify customizations
  against the installed public contract.
- **Troubleshooting:** Check public exports and version-matched package docs before changing
  a wrapper.

When in doubt: customize in the app layer, not the base.
