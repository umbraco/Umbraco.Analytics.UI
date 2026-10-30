# Architecture

## Extension points

The package is a library of custom elements, not a feature hung off one extension point. It touches the backoffice in three places, all declared in `Client/public/umbraco-package.json`:

- **Import map** entry `@umbraco-analytics/ui`. Products import from it and mark it external, so every product on a site shares one loaded copy.
- **`localization` extension** (`en` first). Ships the package's own UI strings ("No data yet", "Compare to", "Show rows", aria labels).
- **`modal` extension** for the date range dialog, with `elementName: "uan-date-range-modal"`. The element is in the main bundle, which is always loaded by the time a product renders the picker that opens it.

No dashboard, section, workspace or Management API. The products keep those.

## Data model & persistence

None. Elements take plain data through properties and raise events. Nothing is stored. Remembering a date range or group-by between visits is the product's job (see SPEC.md, "The return").

## Connected systems

Not an entity, repository or API change, so version history, Deploy, uSync, search indexing, cache refreshers and notifications don't apply.

What every new element does touch:

- **Localization:** every visible string, `aria-label` and placeholder goes through `this.localize` with keys under `uanAnalytics_*`.
- **Public API report:** each export lands in `Client/api/ui.api.md`. A change there needs reviewer sign-off.
- **Storybook and tests:** each element ships `<name>.story.ts` and `<name>.test.ts` with an axe audit, per `CLAUDE.md`.

## Key decisions

1. **Base class: `UmbLitElement`.** It gives `this.localize`, including `number()` and `date()`, which format with the editor's backoffice culture. Rejected: plain `LitElement`, which has no localization. `uan-delta-badge` currently uses `LitElement` and moves over.

2. **Chart.js for the time-series chart.** It already covers smooth lines, area fill, filling the gap between two lines, and stacked bars, and it's what all three products use today. Rejected: hand-drawn SVG, which would mean rebuilding scales, tooltips and hit-testing.

3. **Markers through our own small Chart.js plugin**, drawing the dot on the x-axis, the dashed line and the hover target. It follows Engage v18's `annotation-dataset-generator.controller.ts` approach. Rejected: `chartjs-plugin-annotation` (Engage v13 bundled it). It's a heavy dependency for one feature, and its config would leak into our API.
   > ASSUMPTION: Engage v18's approach covers everything Phase 1 shows. Check its source before building.

4. **Chart.js stays private.** Public properties use our own types (`UanSeries`, `UanMarker`, `UanChartKind`). No `ChartConfiguration` in the API, so we can swap the library within a major.

5. **Numbers in, formatting options alongside.** Charts and tables take raw numbers plus `valueFormat` (an `Intl.NumberFormatOptions` object, e.g. `{ style: "currency", currency: "EUR" }`). KPI tiles take a pre-formatted `value` string, since the product already formats its headline numbers.
   Rejected: formatter callback functions. They don't show in Storybook controls or docs, and products would each write slightly different ones.
   > ASSUMPTION: Intl options cover every unit the products show today (counts, currency, percent, durations in seconds or ms, compact "14.3k"). Durations may need a `unit` option: check AI's `_formatMs` before building.

6. **Colours: public names for products, private names for elements, a shade per theme.**
   - **Products override** the public names on any ancestor: `--uan-series-1` to `--uan-series-4`, `--uan-compare`, `--uan-tint-positive`, `--uan-tint-negative`, `--uan-tint-neutral`, and the text colours that sit on those tints, `--uan-text-positive`, `--uan-text-negative`, `--uan-text-neutral`. Tint and text overrides come as a pair: a product that overrides either owns the 4.5:1 contrast between them. The KPI tile's icon square has its own pair, `--uan-kpi-icon-bg` (default spanish pink in every theme) and `--uan-kpi-icon-fg` (default space cadet), because series-2 is maroon in light and a dark glyph on it fails 3:1. A product that overrides either owns the 3:1 between them.
   - **Elements read** private copies, resolved on each element's `:host`: `--_uan-series-1: var(--uan-series-1, <default>)`. They never declare a public name themselves, because that would hide an ancestor's override. An element that reads `--uan-*` directly gets nothing when no product has set it.
   - **Defaults pair a light and a dark shade** with CSS `light-dark()`, since the UUI palette is the same in every theme. The dark theme only sets the custom property `--uui-color-scheme: dark`, so each element's `:host` sets `color-scheme: var(--uui-color-scheme, normal)`, as UUI's own inputs do, for `light-dark()` to pick the right shade. A resolved `--_uan-*` value is a `light-dark(...)` string, not a colour: code that needs the colour (the Chart.js wrapper) reads it back as a computed `color`. The design's colours are kept where they read. Where one doesn't (navy and violet blue in dark, pink, yellow and orange in light), a lighter or darker UUI palette shade replaces it in that theme. Lines and bars need 3:1 against the surface.
     - Starting points: series 1 navy (`--uui-palette-space-cadet`), 2 pink (`--uui-palette-spanish-pink`), 3 yellow (`--uui-palette-sunglow`), 4 violet blue (`--uui-palette-violet-blue`), compare orange (`--uui-palette-deep-saffron`).
   - Tints (delta pills, diff shading, share-bar tracks) use `color-mix()` on semantic tokens such as `--uui-color-positive`, which already change per theme. The design's hard-coded `rgba(...)` values would break dark mode.
   - The token stylesheet is internal (`src/internal/theme/`), not exported. The public contract is the `--uan-*` names only.

7. **Table supports client and server modes.** In `client` mode it sorts, searches and pages the rows it's given. In `server` mode it only raises `sort-change`, `search` and `page-change`, and the product passes back the new page. Engage needs server mode, because its tables can have thousands of rows. Commerce and AI lists are short. Rejected: server-only, which would make every small table write paging code.

8. **Composition over options for headers.** The design puts search plus totals ("TOTAL PAGEVIEWS 272 +8.4%") above the table, and group-by, notes and date range in the chart's header. These are slots (`toolbar`, `actions`), filled with our elements or the product's own (such as Engage's notes control). Rejected: built-in totals and notes properties, which would grow the API for one product's layout.

9. **Group-by is a UUI-styled radio group.** It's a short, fixed list (day, week, month), not an entity choice, so a picker doesn't apply. It's a radio group, not a select, because the design shows all options at once and switching is one click.

10. **Design reference replaces mockups.** The devkit normally draws a static mockup per screen. Here, the Phase 1 export in `docs/design/phase-1` is that mockup, and SPEC.md links its screenshots. The elements are building blocks, not screens. Storybook stories become the reviewed, living version.
