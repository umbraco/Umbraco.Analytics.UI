# Spec

## Management API surface

None. The package has no server code. Products call their own APIs and pass data in.

## Frontend components

All elements live in `src/Umbraco.Analytics.UI/Client/src/<name>/` and are exported from `@umbraco-analytics/ui`. Every element:

- extends `UmbLitElement` and localizes every visible string, `aria-label` and placeholder
- uses `--uui-*` tokens and reads colours through the private `--_uan-*` tokens (ARCHITECTURE.md decision 6), and reads correctly in the light, dark and high-contrast themes
- raises events as `CustomEvent`s that bubble and are `composed`, with the payload in `detail`
- passes an axe audit in its tests and in every Storybook story
- takes corner radius from `--uui-border-radius-*` tokens, so it follows the v18+ rounded backoffice

Screenshots are from the Phase 1 design ([`docs/design/phase-1`](../../design/phase-1/README.md)). They're the visual contract for layout and content. Where they show the older square 3px corners (panes, cards, pills), the v18+ rounded tokens win.

### Shared types

```ts
type UanPoint = { date: string; value: number };              // date: ISO "2026-06-11"
type UanSeries = { id: string; label: string; points: UanPoint[] };
type UanMarker = { id: string; date: string; title: string; description?: string };
type UanGroupBy = "day" | "week" | "month";
type UanChartKind = "line" | "area" | "bar" | "stacked-bar";
type UanDateRange = { from: string; to: string; preset?: string };
type UanCompare = { mode: "previous-period" | "previous-year" | "custom"; from: string; to: string };
```

### 1. Panes: `uui-box`, not a new element

![Pane with chart, header controls and totals](../../design/phase-1/screenshots/cmp-diff.png)

Products wrap each chart and table in the backoffice's own `uui-box`. It already has everything the design's pane needs, and it picks up the v18+ rounded corners by itself:

- the headline (property or `headline` slot, where the icon goes as a `uui-icon`)
- `header-actions` for the group-by, notes and date range controls
- the divider under the header
- `--uui-box-default-padding: 0` for a table that runs edge to edge

Storybook gets a "Pane" story showing this recipe, a chart and a table in one `uui-box`, so every product builds it the same way. There's no divider between a chart and a table that follows it, which the recipe shows.

### 2. `uan-kpi-tile`: KPI tile

![KPI tiles](../../design/phase-1/screenshots/kpi-size.png)

- Properties:
  - `label`
  - `value` (pre-formatted string)
  - `icon`
  - `delta`, `delta-unit` and `lower-is-better` (passed to `uan-delta-badge`)
  - `selectable`, `selected`
- One style only: a card with the icon in a pink square, as in every Phase 1 screenshot.
- Not used for table totals ("TOTAL PAGEVIEWS 272 +8.4%"). Those are a label and a number, which the product writes in the table's `toolbar` slot, using `uan-delta-badge` for the change.
- **Selectable:** when `selectable`, the tile is a button. Clicking it raises `select` with `{}`, and `selected` draws its active state. This lets a row of tiles switch which metric a chart shows, like Engage's `AnStatPanes`.
- Tiles in one row keep the same height, even when a label wraps. The badge sits below the value when the tile is too narrow to fit both on one line (as in `kpi-size.png`).

### 3. `uan-delta-badge`: change badge (exists, needs restyling)

- Restyle to the design's tinted pill: a green or red tint behind the text, 13px bold, `4px 8px` padding. Flat values use a neutral tint.
- Add `size`: `"md"` (default) | `"sm"` (for table cells).
- Keep the current behaviour: signed number, `percent` or `points`, `lower-is-better`, rounding to `max-decimals`. Number formatting moves to `this.localize.number`.

### 4. `uan-time-series-chart`

![Line chart with comparison and markers](../../design/phase-1/screenshots/cmp-diff.png)
![Stacked bar chart with comparison](../../design/phase-1/screenshots/vis-cmp.png)
![Marker tooltip](../../design/phase-1/screenshots/an-pin-tip.png)

- Properties:
  - `kind` (`UanChartKind`)
  - `series` (`UanSeries[]`)
  - `compare-series` (`UanSeries[]`, matched to `series` by `id`)
  - `compare-label`
  - `markers` (`UanMarker[]`)
  - `group-by` (`UanGroupBy`, sets the x-axis label format)
  - `value-format` (`Intl.NumberFormatOptions`)
  - `loading`
  - `empty-headline`, `empty-description`
- **Comparison, by kind:**
  - `line` and `area`: a dashed `--uan-compare` line, with the gap between the two lines shaded.
  - `bar` and `stacked-bar`: the comparison total is drawn as a bar behind each current bar.
  - Comparison points line up by position (day 1 with day 1), not by date. The two ranges are different dates.
- **Tooltip:** hovering a point shows a dark tooltip with the date, each series' value and, when comparing, the comparison value and a delta.
- **Markers:** each marker shows as a dot on the x-axis, with a dashed line up the chart.
  - Hovering or focusing a dot shows its title and description.
  - Clicking or pressing Enter raises `marker-click` with `{ id }`.
  - Dots are keyboard-focusable, in date order.
- **Legend:** one entry per series, plus the comparison range when comparing.
- **Other rules:**
  - The y-axis starts at 0, with about 5 ticks on round numbers.
  - X-axis labels rotate when crowded and never overlap.
  - Bar kinds have no smoothing.
- **Accessibility:** a visually hidden table holds the same data, for screen readers.

### 5. `uan-group-by`: Day / Week / Month switch

- Properties: `value` (`UanGroupBy`), `options` (defaults to all three).
- A radio group. Arrow keys move between options. Changing raises `change` with `{ value }`.

### 6. `uan-date-range`: date range picker

![Date range button with comparison](../../design/phase-1/screenshots/cmp-diff.png)
![Date range dialog](../../design/phase-1/screenshots/01-dr-modal.png)

- Properties:
  - `value` (`UanDateRange`)
  - `compare` (`UanCompare | undefined`)
  - `presets` (defaults to last 7 days, last 30 days, last month, last year and custom; a product can pass its own, such as AI's last 24 hours)
  - `allow-compare` (default true)
  - `max-date` (default today)
- The button opens `uan-date-range-modal` through the backoffice modal manager.
  - **Save** closes the dialog and raises `change` with `{ value, compare }`.
  - **Close** discards the edits.
- **Presets:** choosing one fills both dates. Editing either date switches the preset to "Custom".
- **Compare:** turning it on shows the compare mode. "Previous period" and "Previous year" fill the comparison dates. "Custom" shows two more date fields.
- **The mistake:** an end date before the start, or a date after `max-date`, shows an inline error under the field and disables Save.

### 7. `uan-data-table`

![Table with share columns](../../design/phase-1/screenshots/an-table.png)

- Properties:
  - `columns`: `{ key, label, type, sortable?, align? }[]`, where `type` is `"text" | "link" | "number" | "percent" | "share"`
  - `rows`: `Record<string, unknown>[]`
  - `compare-rows` (matched by a `row-key` property)
  - `value-format` (per column, optional)
  - `sort` (`{ key, direction }`)
  - `mode` (`"client"` | `"server"`)
  - `page`, `page-size`, `total`
  - `loading`
  - `empty-headline`, `empty-description`
- Slots: `toolbar`, for the search box and totals above the header.
- **`share` columns:** show the value, its percent of the column total, and a thin bar scaled to the column's largest value.
  - The first share column uses `--uan-series-1`, the second `--uan-series-2`.
  - When comparing, a small delta badge sits after the value.
- **`link` columns:** render an anchor. The row's `href` comes from the column's `hrefKey`.
- **Sorting:** clicking a sortable header toggles the direction and raises `sort-change`. In `client` mode the table also sorts itself.
- **Paging:** the footer has "Show rows" (10, 25, 50, 100) and "1–10 of 272". It raises `page-change` with `{ page, pageSize }`, and in `client` mode it also pages itself. The footer is hidden when everything fits on one page.
- **Search:** `uan-data-table` exports `uan-table-search` for the toolbar. It raises `search` with `{ query }`, 300ms after typing stops. In `client` mode the table filters rows on any `text` or `link` column.
- **Rows:** a row is clickable only when the product listens for `row-click`. Then it's keyboard-reachable and raises `row-click` with `{ row }`.

### 8. `uan-empty-state` and loading

- **`uan-empty-state`:** properties `headline`, `description`, `icon`. The data elements use it when they have no data. A product can also place it on its own.
- **Loading:** each data element (chart, table, KPI tile) has a `loading` property.
  - On first load it shows a skeleton the same size as the loaded element, so the page doesn't jump.
  - While reloading with data already shown, the old data stays visible under a thin loading bar at the top.

### 9. Theme and localization

- Products override the `--uan-*` colour names on any parent element. Elements read private `--_uan-*` copies (ARCHITECTURE.md decision 6). Default colours have a light and a dark shade, each at least 3:1 against the surface.
- Ships `en` translations for every built-in string under `uanAnalytics_*`. Products can override them with their own `localization` extension.

### The five moments

| Moment | Applies? | What the elements do |
|---|---|---|
| First run | Yes | Data elements show `uan-empty-state` with the product's `empty-headline` and `empty-description`. Defaults: "No data yet" / "Try a wider date range." |
| The mistake | Date range only | Inline field error, Save disabled. The other elements take no input that can be wrong. |
| The wait | Yes | A skeleton on first load. On reload, the old data stays under a loading bar. |
| The finish | Date range only | The dialog closes and the button shows the new range. No toast: the data updating is the confirmation. |
| The return | Product's job | Elements don't store state. Products keep the date range, group-by, sort and page size between visits. `change` events carry everything needed to save them. |

### Later: not in v1

**`uan-funnel` (conversion funnel).** Parked until a product commits to using it. Today none does:

- Engage's funnel is on Campaign Reporting, which exists only in the design.
- Commerce's cart conversion widget is a line chart and a table. A funnel would mean redesigning it.

When it comes back, the starting point is [`funnel-final.png`](../../design/phase-1/screenshots/funnel-final.png) and the "Conversion funnel" notes in [`design-notes.md`](../../design/phase-1/design-notes.md). Confirm with design which label style is final, the banners in `funnel-final.png` or the plain labels in `commerce-final.png`. Adding it is a new element, so it won't break anything.

## Non-functional targets

- **Accessibility:** zero axe violations in every story, in light and dark. Every interactive part (KPI tile when selectable, markers, group-by, sort headers, pager, rows) is reachable and usable by keyboard.
- **Contrast:** text, badges and chart labels are at least 4.5:1 against their background in light, dark and high-contrast.
- **Public API:** no Chart.js type appears in `api/ui.api.md`.
- > ASSUMPTION: the chart renders 6 series × 366 daily points in under 100ms on a mid-range laptop.
- > ASSUMPTION: in `client` mode the table stays responsive (sort or page in under 50ms) up to 1,000 rows. Above that, products use `server` mode.
- > ASSUMPTION: the built bundle, including Chart.js, is under 120 KB gzipped.
