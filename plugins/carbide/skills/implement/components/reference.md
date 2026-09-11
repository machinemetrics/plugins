# Carbide component reference

## Stable conventions

- **Appearance:** Use semantic tokens and current component appearance props. Never copy
  raw palette colors or assume variants are shared across components.
- **Layout:** Use `flex` and `grid` for spacing; avoid ad-hoc margins between siblings. Tailwind
  is an optional peer dependency: use its `gap-*` utilities only when Tailwind is installed in
  the consuming app, otherwise use plain CSS `gap` on the flex/grid container.
- **Setup:** Import library styles (e.g. `import '@machinemetrics/mm-react-components/styles'`) and wrap the app (or Carbide root) in `<div className="carbide">` so the theme and fonts apply. For dark mode, apply the compound class instead: `<div className="carbide dark">`.

## Component discovery

**When the package is installed in this project:** Check **agent-docs** at `node_modules/@machinemetrics/mm-react-components/agent-docs/`; use **agent-documentation-reference.md** as the index for existing components and patterns.

**When the package is not installed in this workspace:** agent-docs is not present. Use this reference and [widget-rules.md](widget-rules.md); recommend installing the package in the project (`npx -p @machinemetrics/mm-react-components mm-init`) for the full doc set.

## Select by behavior

Inventory structure, navigation, forms, data display, feedback, and overlays. Search the
current docs by the required behavior, verify the export, and preserve its documented
compound children. Do not rely on a static export catalog in this fallback.

## Layout decisions

Distinguish structural layout, navigation, temporary overlays, discrete content, and
bounded overflow. Search current docs for the primitive whose behavior matches the need.
Do not assume a content container provides page structure or scrolling.

## Widget rules summary

- **When to use**: Charts/graphs for trends, comparisons, distributions (with insight annotations). Icons/indicators for status, categories, severity. Metrics/numbers for single KPIs with context (vs target, trend). Text only for labels, brief context, annotations.
- **Insight-driven**: Add comparisons (vs average, vs goal), highlight what matters (color, sizing), show direction/trend (arrows, sparklines), explain significance.
- **Avoid**: Text-only widgets, generic charts without context, equal visual weight for all data, missing comparison or context.
- **Chart complexity**: Follow current guidance and reduce density when the insight becomes
  difficult to read.
- **Accessibility**: WCAG contrast (4.5:1 text, 3:1 graphics); never rely on color alone: use patterns, shapes, or labels; direct labels on data when possible.

For full widget and visualization rules, see [widget-rules.md](widget-rules.md).
