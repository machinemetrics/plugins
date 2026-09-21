# Widget rules

Read this when the surface is a widget: a view that appears on a configurable MachineMetrics
dashboard. It covers what a widget must be (visual, single-message, sized for the dashboard
grid), the data-integrity rule, and the chart conventions that keep widgets honest. Pages and
forms follow SKILL.md, [recipes.md](recipes.md) (the canonical form and page-shell
compositions) and [house-style.md](house-style.md) instead.

## What a widget is

A widget is a dashboard tile. Operators and supervisors scan a wall of them, often from a
distance and often in a few seconds between other tasks, so a widget has stricter rules than
a full page. It is a chart with a title, not a report.

## Components

Widgets use only Carbide exports, extended through the customization layer for a legitimate
gap, exactly as SKILL.md describes. Do not build a lookalike from scratch when the library
already provides the control, and do not reach for raw HTML controls or a second *component*
library: the dashboard host themes and sizes every widget through the same components, and a
substitute is the one tile that reads differently. Charts are the sanctioned exception in
kind, not in source, they compose the Recharts primitives that ship alongside
`ChartContainer`, as the package's own chart preview does.

## Dimensions and containment

- Default to **100 percent width by 400 pixels high**. The dashboard grid allocates that
  slot, so a widget designed to other proportions is cropped or floats in empty space.
- The widget must be responsive within its slot. Dashboards are resized and viewed on
  differently sized screens, so charts resize with the container, text stays readable, and
  layout reflows rather than clipping.
- Nothing escapes the container. Use `overflow: hidden` or scrolling on the container and
  account for padding in the layout. If content cannot fit, drop the least important
  element rather than letting anything bleed past the tile edge, which overlaps the
  neighbouring widget.

## Visual, not textual

Every widget contains at least one chart, graph, gauge, metric-with-indicator, or other
visual encoding of the data, and visuals take about 80 percent of the space. A tile that is
mostly text has to be read, and dashboards are scanned, not read.

- Text is for titles (one line, stating the insight), labels (one to three words), a metric
  callout with its unit, and a short annotation on a specific point. It is not for
  paragraphs, bullet lists, or sentences that explain what the chart shows.
- A table counts as visual only when it carries visual encoding (sparklines, bars, color by
  status). A text-only table does not.
- Before choosing anything, name the chart. If the answer is "none", the widget is not yet
  designed.
- Check: cover every word except the title and axis labels. If the point is no longer
  clear, the widget relies on text and needs a better visualization.

## One message, with context

A widget answers one question. Combining several concepts into one tile forces the reader to
work out which part matters, so split them into separate widgets instead.

Show the "so what", not just the number: a comparison against goal, prior period, or plant
average; direction of change; the item that is out of tolerance highlighted in a
contrasting color with the rest muted. A bare chart with no reference point leaves the
reader to interpret it, which is the work the widget exists to do for them.

Make the hierarchy match importance: the primary insight is the largest, boldest element in
the most prominent position, supporting detail is smaller, and everything else is either
tertiary or removed.

## Data integrity

Use only data that was actually provided. Never invent, estimate, or fill gaps with
placeholder or example values: a plausible-looking wrong number on a production dashboard
drives real decisions, and no one can tell it apart from a real one. This restates the
Invariants rule in SKILL.md for the surface where it matters most.

When the ideal data is missing, adapt rather than stall:

- Build the most valuable accurate widget the available data supports. Show the periods
  that exist, aggregate totals when the breakdown is missing, switch to a chart type the
  available data can drive.
- Say plainly in the widget or in the report which data was unavailable.
- Ask for more data only when no accurate, useful subset can be built from what was given.
  An incomplete accurate widget ships; a complete fabricated one never does.

## Chart conventions

These are the rules that keep a widget from misleading at a glance.

- **Match the chart to the question.** Comparison: bars or lines. Part-to-whole: stacked bars
  or a pie with at most five slices. Trend: line or area. Distribution: histogram or
  scatter. Prefer the familiar type; novelty costs the reader time.
- **Honest scales.** Bars start at zero, similar charts share a scale, and no axis is
  compressed or stretched to make a change look larger. No dual-axis charts and no 3D:
  both distort comparison.
- **Limit series.** At most four lines per line chart, four bars per cluster, four segments
  per stack, five pie slices. Beyond that, split into small multiples or highlight one
  series and grey the rest.
- **Label directly, and say what the data is.** Put values and series names on the data
  where possible and drop the legend; include units. State the time period and, when it is
  not obvious from the dashboard, the data source (which machines, shift, or job). An
  accurate number with no period or scope reads as current plant-wide fact and is acted on
  as one. Remove gridlines, borders, and markers that do not help read a value.
- **Color carries meaning, never alone.** Meet WCAG AA contrast (4.5:1 text, 3:1
  graphics), pair color with a label, shape, or pattern, keep one meaning per color across
  a dashboard, and reserve saturated color for the element that matters. Use the
  semantic tokens and chart variables from the theme; hardcoded colors break dark mode.
- **Respect motion preferences.** Avoid animation or make it stoppable.
- **A chart is not the only way in.** Give the chart an accessible name stating the
  insight, and keep an equivalent text form of the data a screen reader can consume,
  the labeled values already on the tile count when they carry the full message; a
  visually-hidden summary or table works when they don't.

## Before finishing

1. There is a chart, graph, or visual encoding, and it takes most of the tile.
2. The title states the insight, and the primary insight is the most prominent element.
3. Every number comes from provided data, and missing data is named, not filled.
4. The widget is 100 percent wide, 400 pixels high by default, responsive, and nothing
   overflows the container at small or large sizes.
5. Scales are honest, series are within the limits above, units and the time period are
   stated, and no meaning depends on color alone.
6. Only Carbide components are used, in light and dark mode.

If any item fails, redesign the widget rather than adding text to compensate.
