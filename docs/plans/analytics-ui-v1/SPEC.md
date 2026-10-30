# Spec

## Management API surface

None. The package has no server code. Products call their own APIs and pass data in.

## Frontend components

All elements live in `src/Umbraco.Analytics.UI/Client/src/<name>/` and are exported from `@umbraco-analytics/ui`. Every element:

- extends `UmbLitElement` and localizes every visible string, `aria-label` and placeholder
- uses `--uui-*` tokens and reads colours through the private `--_uax-*` tokens (ARCHITECTURE.md decision 6), and reads correctly in the light, dark and high-contrast themes
- raises events as `CustomEvent`s that bubble and are `composed`, with the payload in `detail`, except where it mirrors a UUI event, which keeps UUI's exact options (the KPI tile's `selected`/`deselected` are plain bubbling, cancelable, non-composed `Event`s, like `UUISelectableEvent`)
- passes an axe audit in its tests and in every Storybook story
- takes corner radius from `--uui-border-radius-*` tokens, so it follows the v18+ rounded backoffice

Screenshots are from the Phase 1 design ([`docs/design/phase-1`](../../design/phase-1/README.md)). They're the visual contract for layout and content. Where they show the older square 3px corners (panes, cards, pills), the v18+ rounded tokens win.

### Shared types

```ts
type UaxPoint = { date: string; value: number };              // date: ISO "2026-06-11"
type UaxSeries = { id: string; label: string; points: UaxPoint[]; color?: 1 | 2 | 3 | 4 }; // color: palette slot, defaults to the series' position
type UaxMarker = { id: string; date: string; title: string; description?: string };
type UaxGroupBy = "day" | "week" | "month";
type UaxChartKind = "line" | "area" | "bar" | "stacked-bar";
type UaxDateRange = { from: string; to: string; preset?: string };
type UaxCompare = { mode: "previous-period" | "previous-year" | "custom"; from: string; to: string };
```

### 1. Panes: `uui-box`, not a new element

![Pane with chart, header controls and totals](../../design/phase-1/screenshots/cmp-diff.png)

Products wrap each chart and table in the backoffice's own `uui-box`. It already has everything the design's pane needs, and it picks up the v18+ rounded corners by itself:

- the headline (property or `headline` slot, where the icon goes as a `uui-icon`)
- `header-actions` for the group-by, notes and date range controls
- the divider under the header
- `--uui-box-default-padding: 0` for every chart and table, so they run edge to edge. Each pads its own content, and the reload loading bar then sits directly under the header divider, full width

Storybook gets a "Pane" story showing this recipe, a chart and a table in one `uui-box`, so every product builds it the same way. There's no divider between a chart and a table that follows it, which the recipe shows.

### 2. `uax-kpi-tile`: KPI tile

![KPI tiles](../../design/phase-1/screenshots/kpi-size.png)

- Properties:
  - `label`
  - `value` (pre-formatted string)
  - `icon`
  - `delta`, `delta-unit` and `lower-is-better` (passed to `uax-delta-badge`)
  - `selectable`, `selected`
- One style only: a card with the icon in a pink square, as in every Phase 1 screenshot.
- Not used for table totals ("TOTAL PAGEVIEWS 272 +8.4%"). Those are a label and a number, which the product writes in the table's `toolbar` slot, using `uax-delta-badge` for the change.
- **Selectable:** follows UUI's `SelectableMixin` (as `uui-card` uses), so product code reads the same as for UUI cards. This lets a row of tiles switch which metric a chart shows, like Engage's `AnStatPanes`.
  - When `selectable`, the tile is a toggle button with `aria-pressed` (UUI cards don't expose their state to screen readers; this does).
  - Clicking, Enter or Space on an unselected tile raises a cancelable `selected` event, then sets `selected` unless the event was cancelled.
  - On a selected tile it raises a cancelable `deselected` event, then clears `selected`, unless the event was cancelled or `deselectable` is false (default true). A product keeping exactly one tile selected sets `deselectable` false and clears the others on `selected`.
  - Look matches `uui-card`: a 2px `--uui-color-selected` border just outside the card with a soft glow when selected; the same border at 33% on hover when not selected, 80% on hover when selected; focus is a separate `--uui-color-focus` outline.
- Tiles in one row keep the same height, even when a label wraps. The badge sits below the value when the tile is too narrow to fit both on one line (as in `kpi-size.png`).

### 3. `uax-delta-badge`: change badge (exists, needs restyling)

- Restyle to the design's tinted pill: a green or red tint behind the text, 13px bold, `4px 8px` padding. Flat values use a neutral tint.
- Add `size`: `"md"` (default) | `"sm"` (for table cells).
- Keep the current behaviour: signed number, `percent` or `points`, `lower-is-better`, rounding to `max-decimals`. Number formatting moves to `this.localize.number`.

### 4. `uax-time-series-chart`

![Line chart with comparison and markers](../../design/phase-1/screenshots/cmp-diff.png)
![Stacked bar chart with comparison](../../design/phase-1/screenshots/vis-cmp.png)
![Marker tooltip](../../design/phase-1/screenshots/an-pin-tip.png)

- Properties:
  - `kind` (`UaxChartKind`)
  - `series` (`UaxSeries[]`)
  - `compare-series` (`UaxSeries[]`, matched to `series` by `id`)
  - `compare-label`
  - `markers` (`UaxMarker[]`)
  - `group-by` (`UaxGroupBy`, sets the x-axis label format)
  - `value-format` (`Intl.NumberFormatOptions`)
  - `loading`
  - `empty-headline`, `empty-description`
- **Comparison, by kind:**
  - `line` and `area`: a dashed `--uax-compare` line, with the gap between the two lines shaded.
  - `bar` and `stacked-bar`: the comparison total is drawn as a bar behind each date's bars. For bar kinds, all compare series are summed per date and paired by position (no `id` matching), and the current total for that date is shown in the tooltip and hidden table whenever it's compared against two or more series.
  - Comparison points line up by position (day 1 with day 1), not by date. The two ranges are different dates.
- **Tooltip:** hovering a point shows a dark tooltip with the date, each series' value and, when comparing, the comparison value and a delta.
- **Markers:** each marker shows as a dot on the x-axis, with a dashed line up the chart.
  - Hovering or focusing a dot shows its title and description.
  - Clicking or pressing Enter raises `marker-click` with `{ id }`.
  - Dots are keyboard-focusable, in date order.
- **Legend:** one entry per series, plus the comparison range when comparing. A single series with no comparison has no legend, as in the design.
- **Height:** the plot height comes from the public CSS property `--uax-chart-height` (default 260px). The loading skeleton uses the same value.
- **Padding:** the chart pads its own content with the public CSS property `--uax-chart-padding` (default the design's 12px 24px 28px). The reload loading bar sits outside that padding, at the element's top edge and full width.
- **Other rules:**
  - The y-axis starts at 0, with about 5 ticks on round numbers.
  - X-axis labels rotate when crowded and never overlap.
  - Bar kinds have no smoothing.
- **Accessibility:** a visually hidden table holds the same data, for screen readers.

### 5. `uax-group-by`: Day / Week / Month switch

- Properties: `value` (`UaxGroupBy`), `options` (defaults to all three).
- A radio group. Arrow keys move between options. Changing raises `change` with `{ value }`.

### 6. `uax-date-range`: date range picker

![Date range button with comparison](../../design/phase-1/screenshots/cmp-diff.png)
![Date range dialog](../../design/phase-1/screenshots/01-dr-modal.png)

- Properties:
  - `value` (`UaxDateRange`)
  - `compare` (`UaxCompare | undefined`)
  - `presets` (defaults to last 7 days, last 30 days, last month, last year and custom; a product can pass its own, such as AI's last 24 hours)
  - `allow-compare` (default true)
  - `max-date` (default today)
- The button opens `uax-date-range-modal` through the backoffice modal manager.
  - **Save** closes the dialog and raises `change` with `{ value, compare }`.
  - **Close** discards the edits.
- **Presets:** choosing one fills both dates. Editing either date switches the preset to "Custom".
- **Compare:** turning it on shows the compare mode. "Previous period" and "Previous year" fill the comparison dates. "Custom" shows two more date fields.
- **The mistake:** an end date before the start, or a date after `max-date`, shows an inline error under the field and disables Save.

### 7. `uax-data-table`

![Table with share columns](../../design/phase-1/screenshots/an-table.png)

- Properties:
  - `columns`: `{ key, label, type, hrefKey?, valueFormat?, align?, color?, sortable? }[]`, where `type` is `"text" | "link" | "number" | "percent" | "share"`. `color` (1 to 4) picks a share bar's palette slot, like `UaxSeries.color`. `sortable` arrives with sorting
  - `rows`: `Record<string, unknown>[]`
  - `compare-rows` (matched by a `row-key` property)
  - `value-format` (per column, optional)
  - `sort` (`{ key, direction }`)
  - `mode` (`"client"` | `"server"`)
  - `page`, `page-size`, `total`
  - `loading`
  - `empty-headline`, `empty-description`
- Slots: `toolbar`, for the search box and totals above the header.
- **Padding:** the cells pad themselves. The `toolbar` slot pads itself with the public CSS property `--uax-table-padding` (default `12px 24px`), only when something is slotted. The reload loading bar sits outside it at the element's top edge, full width, so put the table in a `uui-box` with `--uui-box-default-padding: 0`.
- **`share` columns:** show the value, its percent of the column total, and a thin bar scaled to the column's largest value.
  - The first share column uses `--uax-series-1`, the second `--uax-series-2`.
  - When comparing, a small delta badge sits after the value.
- **`link` columns:** render an anchor. The row's `href` comes from the column's `hrefKey`.
- **Sorting:** clicking a sortable header toggles the direction and raises `sort-change`. In `client` mode the table also sorts itself.
- **Paging:** the footer has "Show rows" (10, 25, 50, 100) and "1–10 of 272". It raises `page-change` with `{ page, pageSize }`, and in `client` mode it also pages itself. The footer is hidden when everything fits on one page.
- **Search:** `uax-data-table` exports `uax-table-search` for the toolbar. It raises `search` with `{ query }`, 300ms after typing stops. In `client` mode the table filters rows on any `text` or `link` column.
- **Rows:** a row is clickable only when the product listens for `row-click`. Then it's keyboard-reachable and raises `row-click` with `{ row }`.

### 8. `uax-empty-state` and loading

- **`uax-empty-state`:** properties `headline`, `description`, `icon`. The data elements use it when they have no data. A product can also place it on its own.
- **Loading:** each data element (chart, table, KPI tile) has a `loading` property.
  - On first load it shows a skeleton the same size as the loaded element, so the page doesn't jump.
  - While reloading with data already shown, the old data stays visible under a thin loading bar at the top.

### 9. Theme and localization

- Products override the `--uax-*` colour names on any parent element. Elements read private `--_uax-*` copies (ARCHITECTURE.md decision 6). Default colours have a light and a dark shade, each at least 3:1 against the surface.
- Ships `en` translations for its own strings under `uaxAnalytics_*`. Generic verbs reuse Umbraco's keys (`buttons_save`, `general_close`, `general_loading`, `general_search`), so they're translated wherever the backoffice is. The package's `localization` extension has weight 200, so a product's own `localization` extension at the default weight (100) always overrides it.

### The five moments

| Moment | Applies? | What the elements do |
|---|---|---|
| First run | Yes | Data elements show `uax-empty-state` with the product's `empty-headline` and `empty-description`. Defaults: "No data yet" / "Try a wider date range." |
| The mistake | Date range only | Inline field error, Save disabled. The other elements take no input that can be wrong. |
| The wait | Yes | A skeleton on first load. On reload, the old data stays under a loading bar. |
| The finish | Date range only | The dialog closes and the button shows the new range. No toast: the data updating is the confirmation. |
| The return | Product's job | Elements don't store state. Products keep the date range, group-by, sort and page size between visits. `change` events carry everything needed to save them. |

### Later: not in v1

**Chart `lower-is-better`.** For metrics where a drop is good (bounce rate, refund rate): flip the gap shading colours and pass it to the tooltip badge. The chart treats higher as better until then.

**`uax-funnel` (conversion funnel).** Parked until a product commits to using it. Today none does:

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
