# Architecture

## Extension points

The package is a library of custom elements, not a feature hung off one extension point. It touches the backoffice in three places, all declared in `Client/public/umbraco-package.json`:

- **Import map** entry `@umbraco/analytics-ui`. Products import from it and mark it external, so every product on a site shares one loaded copy.
- **`localization` extension** (`en` first). Ships the package's own UI strings ("No data yet", "Compare to", "Per page", aria labels).
- **`modal` extension** for the date range dialog, with `elementName: "uaui-date-range-modal"`. The element is in the main bundle, which is always loaded by the time a product renders the picker that opens it.

No dashboard, section, workspace or Management API. The products keep those.

## Data model & persistence

None. Elements take plain data through properties and raise events. Nothing is stored. Remembering a date range or group-by between visits is the product's job (see SPEC.md, "The return").

## Connected systems

Not an entity, repository or API change, so version history, Deploy, uSync, search indexing, cache refreshers and notifications don't apply.

What every new element does touch:

- **Localization:** every visible string, `aria-label` and placeholder goes through `this.localize` with keys under `uauiAnalytics_*`.
- **Public API report:** each export lands in `Client/api/analytics-ui.api.md`. A change there needs reviewer sign-off.
- **Storybook and tests:** each element ships `<name>.story.ts` and `<name>.test.ts` with an axe audit, per `CLAUDE.md`.

## Key decisions

1. **Base class: `UmbLitElement`.** It gives `this.localize`, including `number()` and `date()`, which format with the editor's backoffice culture. Rejected: plain `LitElement`, which has no localization. `uaui-delta-badge` has moved over to it.

2. **Chart.js for the time-series chart.** It already covers smooth lines, area fill, filling the gap between two lines, and stacked bars, and it's what all three products use today. Rejected: hand-drawn SVG, which would mean rebuilding scales, tooltips and hit-testing.

3. **Markers through our own small Chart.js plugin**, drawing the dot on the x-axis, the dashed line and the hover target. It follows Engage v18's `annotation-dataset-generator.controller.ts` approach. Rejected: `chartjs-plugin-annotation` (Engage v13 bundled it). It's a heavy dependency for one feature, and its config would leak into our API.
   > ASSUMPTION (resolved, T12): Engage v18's approach covers everything Phase 1 shows. The markers plugin follows its bucketing; the differences are logged in DECISION-LOG.

4. **Chart.js stays private.** Public properties use our own types (`UauiSeries`, `UauiMarker`, `UauiChartKind`). No `ChartConfiguration` in the API, so we can swap the library within a major.

5. **Numbers in, formatting options alongside.** Charts and tables take raw numbers plus `valueFormat` (an `Intl.NumberFormatOptions` object, e.g. `{ style: "currency", currency: "EUR" }`). KPI tiles take a pre-formatted `value` string, since the product already formats its headline numbers.
   Rejected: formatter callback functions. They don't show in Storybook controls or docs, and products would each write slightly different ones.
   > ASSUMPTION (resolved): Intl options cover every unit the products show. AI's durations use `{ style: "unit", unit: "millisecond" }` in its page example, so no `unit` option was needed.

6. **Colours: override names and read names for products, resolved on each element, a shade per theme.**
   - **Products override** the public names on any ancestor: `--uaui-series-1` to `--uaui-series-4`, `--uaui-compare`, `--uaui-tint-positive`, `--uaui-tint-negative`, `--uaui-tint-neutral`, and the text colours that sit on those tints, `--uaui-text-positive`, `--uaui-text-negative`, `--uaui-text-neutral`. Tint and text overrides come as a pair: a product that overrides either owns the 4.5:1 contrast between them. Charts add `--uaui-gap-positive` and `--uaui-gap-negative` (the shading between a series and its compare line). KPI tiles add `--uaui-kpi-icon-bg`, `--uaui-kpi-icon-fg` and `--uaui-kpi-selected` (selection border). The KPI tile's icon square has its own pair, `--uaui-kpi-icon-bg` (default spanish pink in every theme) and `--uaui-kpi-icon-fg` (default space cadet), because series-2 is maroon in light and a dark glyph on it fails 3:1. A product that overrides either owns the 3:1 between them.
   - **Elements read** resolved copies (`--uaui-color-*`, read-only, public so products can read them too), resolved on each element's `:host`: `--uaui-color-series-1: var(--uaui-series-1, <default>)`. They never declare a public name themselves, because that would hide an ancestor's override. An element that reads `--uaui-*` directly gets nothing when no product has set it.
   - **Defaults pair a light and a dark shade** with CSS `light-dark()`, since the UUI palette is the same in every theme. The dark theme only sets the custom property `--uui-color-scheme: dark`, so each element's `:host` sets `color-scheme: var(--uui-color-scheme, normal)`, as UUI's own inputs do, for `light-dark()` to pick the right shade. A resolved `--uaui-color-*` value is a `light-dark(...)` string, not a colour: code that needs the colour (the Chart.js wrapper) reads it back as a computed `color`. The design's colours are kept where they read. Where one doesn't (navy and violet blue in dark, pink, yellow and orange in light), a lighter or darker UUI palette shade replaces it in that theme. Lines and bars need 3:1 against the surface.
     - Starting points: series 1 navy (`--uui-palette-space-cadet`), 2 pink (`--uui-palette-spanish-pink`), 3 yellow (`--uui-palette-sunglow`), 4 violet blue (`--uui-palette-violet-blue`), compare orange (`--uui-palette-deep-saffron`).
   - Area fills under a line use a livelier hue than the line at 12% alpha by default (in light, violet-blue under the navy series 1 line, sunglow under series 3), from `--uaui-color-fill-N` tokens beside the series tokens. When a product overrides `--uaui-series-N`, the fill follows that colour at 12% alpha.
   - Tints (delta pills, diff shading, share-bar tracks) use `color-mix()` on semantic tokens such as `--uui-color-positive`, which already change per theme. The design's hard-coded `rgba(...)` values would break dark mode.
   - The token block lives in `src/theme/` and is exported as `UauiPaletteStyles` (T20b), so a product's own elements add it to their `static styles` and read the same resolved `--uaui-color-*` colours as ours. Overrides are still the `--uaui-*` names.

7. **Table supports client and server modes.** In `client` mode it sorts, searches and pages the rows it's given. In `server` mode it only raises `sort-change`, `search` and `page-change`, and the product passes back the new page. Engage needs server mode, because its tables can have thousands of rows. Commerce and AI lists are short. Rejected: server-only, which would make every small table write paging code.

8. **Composition over options for headers.** The design puts search above the table, a totals row in the column toolbar above its headings, and group-by, notes and date range in the chart's header. These are slots (`toolbar`, `toolbar-start`, `toolbar-<column key>`), filled with our elements or the product's own (such as Engage's notes control). Totals are composition too: a product slots content into the column toolbar, one slot per column, so it lines up with that column. Rejected: built-in totals and notes properties, which would grow the API for one product's layout.

9. **Group-by is a UUI-styled radio group.** It's a short, fixed list (day, week, month), not an entity choice, so a picker doesn't apply. It's a radio group, not a select, because the design shows all options at once and switching is one click.

10. **Design reference replaces mockups.** The devkit normally draws a static mockup per screen. Here, the Phase 1 export in `docs/design/phase-1` is that mockup, and SPEC.md links its screenshots. The elements are building blocks, not screens. Storybook stories become the reviewed, living version.

11. **Consistent with UUI.** Where UUI already solves an interaction, our elements mirror its API and look, so product code and editors' experience read the same as for UUI elements. Examples: KPI tile selection follows `SelectableMixin` and `uui-card`; panes are `uui-box` itself. We deviate only to close a UUI gap, such as accessibility (the KPI tile keeps `aria-pressed`), and log it. Rejected: designing our own conventions, which would make the backoffice feel inconsistent and give products two patterns to learn.

12. **Componentized, internally where possible.** Each distinct UI piece is its own small element (table cells, the pager, chart tooltip and legend, the chart's marker buttons and their tooltip as `uaui-chart-markers`) that composite elements compose. Pieces stay internal unless products need them, so the public API stays small. Rejected: large elements that render every part inline, which are harder to test, review and reuse.
