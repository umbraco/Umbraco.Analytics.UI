# Spec

## Management API surface

None. The package has no server code. Products call their own APIs and pass data in.

## Frontend components

All elements live in `src/Umbraco.Analytics.UI/Client/src/<name>/` and are exported from `@umbraco-analytics/ui`. Every element:

- extends `UmbLitElement` and localizes every visible string, `aria-label` and placeholder
- uses `--uui-*` tokens and reads colours through the `--uaui-color-*` read tokens (ARCHITECTURE.md decision 6), and reads correctly in the light, dark and high-contrast themes
- raises events as `CustomEvent`s that bubble but are not `composed`, like UUI's `change`, with the payload in `detail` (an exported `Uaui…Detail` type). The exception is `retry` (`uaui-error-state` and the chart and table that re-raise it): a plain `Event` that bubbles, is not `composed` and has no detail. The KPI tile's `selected`/`deselected` are bubbling, cancelable, non-composed `CustomEvent`s with `detail` `{}`, like `UUISelectableEvent`
- passes an axe audit in its tests and in every Storybook story
- takes corner radius from `--uui-border-radius-*` tokens, so it follows the v18+ rounded backoffice

Screenshots are from the Phase 1 design ([`docs/design/phase-1`](../../design/phase-1/README.md)). They're the visual contract for layout and content. Where they show the older square 3px corners (panes, cards, pills), the v18+ rounded tokens win.

### Shared types

```ts
type UauiPoint = { date: string; value: number };              // date: ISO "2026-06-11"
type UauiSeries = { id: string; label: string; points: UauiPoint[]; color?: UauiColorSlot }; // color: palette slot, defaults to the series' position
type UauiMarker = { id: string; date: string; title: string; description?: string };
type UauiColorSlot = 1 | 2 | 3 | 4;                           // --uaui-series-1 to --uaui-series-4
type UauiGroupBy = "day" | "week" | "month";
type UauiChartKind = "line" | "area" | "bar" | "stacked-bar";
type UauiDateRange = { from: string; to: string; preset?: string };
type UauiCompare = { mode: "previous-period" | "previous-year" | "custom"; from: string; to: string };
type UauiDateSpan = { from: string; to: string };              // any range; a UauiDateRange or UauiCompare fits
type UauiDateBucket = { start: string; days: string[] };       // start: where the chart plots the bucket; days: only the days inside the range

// Event details
type UauiGroupByChangeDetail = { value: UauiGroupBy };
type UauiDateRangeChangeDetail = { value: UauiDateRange; compare?: UauiCompare };
type UauiMarkerClickDetail = { id: string };
type UauiSegmentedChangeDetail = { value: string };
```

**Date helpers** (public functions in `src/date-helpers/`, for products that use them without the picker; weeks start on Monday, not locale-dependent):

- `uauiPreviousPeriod(range)`: the same number of days straight before `range` (`UauiDateSpan`, or `undefined` for an invalid range).
- `uauiPreviousYear(range)`: the same dates one year earlier (`UauiDateSpan` or `undefined`).
- `uauiCompareFor(mode, range)`: a full `UauiCompare` for `previous-period` or `previous-year`. `custom` and invalid ranges give `undefined`.
- `uauiDaysIn(range)`: every day in the range, both ends included.
- `uauiDateBuckets(range, groupBy)`: `UauiDateBucket[]`. `start` is the day, the Monday of the week or the 1st of the month. `days` holds only days inside the range.
- `uauiFormatDateRange(localize, range, { showYear })`: the range as "May 25, 2026 to Jun 23, 2026", the label the date range button and the chart's `compare-label` use. It takes `this.localize`, so it follows the user's culture and the translated "{0} to {1}" term. `showYear: false` leaves the year off.

### 1. Panes: `uui-box`, not a new element

![Pane with chart, header controls and totals](../../design/phase-1/screenshots/cmp-diff.png)

Products wrap each chart and table in the backoffice's own `uui-box`. It already has everything the design's pane needs, and it picks up the v18+ rounded corners by itself:

- the headline (property or `headline` slot, where the icon goes as a `uui-icon`)
- `header-actions` for the group-by, notes and date range controls
- the divider under the header
- `--uui-box-default-padding: 0` for every chart and table, so they run edge to edge. Each pads its own content, and the reload loading bar then sits directly under the header divider, full width

Storybook gets a "Pane" story showing this recipe, a chart and a table in one `uui-box`, so every product builds it the same way. There's no divider between a chart and a table that follows it, which the recipe shows.

### 2. `uaui-kpi-tile`: KPI tile

![KPI tiles](../../design/phase-1/screenshots/kpi-size.png)

- Properties:
  - `label`
  - `value` (pre-formatted string)
  - `icon`
  - `delta`, `delta-unit` and `lower-is-better` (passed to `uaui-delta-badge`)
  - `selectable`, `selected`
  - `no-data`: the metric has no data for the period (see below)
  - `error`: the data could not be loaded (see below)
- One style only: a card with the icon in a pink square, as in every Phase 1 screenshot.
- Not used for table totals ("TOTAL PAGEVIEWS 272 +8.4%"). Those are a label and a number, which the product slots into the table's summary row (`summary-<column key>`, §7), using `uaui-delta-badge` for the change.
- **Selectable:** follows UUI's `SelectableMixin` (as `uui-card` uses), so product code reads the same as for UUI cards. This lets a row of tiles switch which metric a chart shows, like Engage's `AnStatPanes`.
  - When `selectable`, the tile is a toggle button with `aria-pressed` (UUI cards don't expose their state to screen readers; this does).
  - Clicking, Enter or Space on an unselected tile raises a cancelable `selected` event, then sets `selected` unless the event was cancelled.
  - On a selected tile it raises a cancelable `deselected` event, then clears `selected`, unless the event was cancelled or `deselectable` is false (default true). A product keeping exactly one tile selected sets `deselectable` false and clears the others on `selected`.
  - A selected tile with `deselectable` false raises nothing when pressed. This departs from `uui-card`, which raises `selected` again.
  - Look matches `uui-card`: a 2px `--uui-color-selected` border just outside the card with a soft glow when selected; the same border at 33% on hover when not selected, 80% on hover when selected; focus is a separate `--uui-color-focus` outline.
- **No data:** `no-data` shows a dash (hidden from screen readers) with the hidden text "No data yet" and no change badge. The tile keeps its height and stays selectable. With `loading` it keeps the dash and is busy. It is a boolean on purpose: an unset `value` means "not loaded yet", and a formatted "0" is a real value.
- **Error:** `error` shows the label, a dash and no badge, with the hidden text "Something went wrong". The tile has no Retry button (a row of tiles would each show one) and stays selectable. `error` wins over `no-data` and `loading`, and the tile is not busy.
- Tiles in one row keep the same height, even when a label wraps. The badge sits below the value when the tile is too narrow to fit both on one line (as in `kpi-size.png`).

### 3. `uaui-delta-badge`: change badge (exists, needs restyling)

- Restyle to the design's tinted pill: a green or red tint behind the text, 13px bold, `4px 8px` padding. Flat values use a neutral tint.
- Add `size`: `"md"` (default) | `"sm"` (for table cells).
- Keep the current behaviour: signed number, `percent` or `points`, `lower-is-better`, rounding to `max-decimals`. Number formatting moves to `this.localize.number`.

### 4. `uaui-time-series-chart`

![Line chart with comparison and markers](../../design/phase-1/screenshots/cmp-diff.png)
![Stacked bar chart with comparison](../../design/phase-1/screenshots/vis-cmp.png)
![Marker tooltip](../../design/phase-1/screenshots/an-pin-tip.png)

- Properties:
  - `kind` (`UauiChartKind`)
  - `series` (`UauiSeries[]`)
  - `compare-series` (`UauiSeries[]`, matched to `series` by `id`)
  - `compare-label`
  - `markers` (`UauiMarker[]`)
  - `group-by` (`UauiGroupBy`, sets the x-axis label format)
  - `value-format` (`Intl.NumberFormatOptions`)
  - `range` (`UauiDateRange`), `compare` (`UauiCompare`): the period starts, to align compare points (see Comparison)
  - `loading`
  - `empty-headline`, `empty-description`
  - `error`, `error-headline`, `error-description`, `retryable`: see Error
- **Error:** `error` replaces the plot, legend and hidden table with `uaui-error-state` (§8), passing on `error-headline`, `error-description` and `retryable`. The canvas stays in the DOM, hidden, so a retry doesn't rebuild the chart. The chart re-raises the state's `retry` from its own host. Precedence is error, then loading, then empty: an element in error is not `aria-busy` and shows no skeleton or loading bar. `error` is a plain property, so the product decides what an error is.
- **Comparison, by kind:**
  - `line` and `area`: a dashed `--uaui-compare` line, with the gap between the two lines shaded.
  - `bar` and `stacked-bar`: the comparison total is drawn as a bar behind each date's bars. For bar kinds, all compare series are summed per date and aligned by bucket offset like any compare series (no `id` matching), and the current total for that date is shown in the tooltip and hidden table whenever it's compared against two or more series.
  - Comparison points line up by bucket offset, not by date: the Nth day, week or month (per `group-by`) from the compare range start sits under the Nth from the current range start. The chart takes optional `range` (`UauiDateRange`) and `compare` (`UauiCompare`) for those starts, as `uaui-date-range` emits them; without them each side starts at its first point, which misaligns when sparse data omits the first buckets. A shorter compare leaves trailing dates empty. Points on the same date add up (series, compare and compare total alike).
- **Tooltip:** hovering a point shows a dark tooltip with the date, each series' value and, when comparing, the comparison value and a delta.
- **Markers:** each marker shows as a dot on the x-axis, with a dashed line up the chart.
  - Hovering or focusing a dot shows its title and description.
  - Clicking or pressing Enter raises `marker-click` with `{ id }` (`UauiMarkerClickDetail`).
  - Dots are keyboard-focusable, in date order.
- **Legend:** one entry per series, plus the comparison range when comparing. A single series with no comparison has no legend, as in the design.
- **Height:** the plot height comes from the public CSS property `--uaui-chart-height` (default 260px). The loading skeleton uses the same value.
- **Padding:** the chart pads its own content with the public CSS property `--uaui-chart-padding` (default the design's 12px 24px 28px). The reload loading bar sits outside that padding, at the element's top edge and full width.
- **Other rules:**
  - The y-axis starts at 0, with about 5 ticks on round numbers.
  - X-axis labels rotate when crowded and never overlap.
  - Bar kinds have no smoothing.
- **Accessibility:** a visually hidden table holds the same data, for screen readers.

### 5. `uaui-group-by` and `uaui-segmented`: Day / Week / Month switch

**`uaui-segmented`** (public) is a segmented control: a row of options with exactly one selected, built as a radio group. UUI has no such control (`uui-button-group` has no selection, `uui-tabs` switches panels, `uui-radio-group` draws radio circles).

- Properties: `value` (the selected option's `value`), `options` (`{ value, label }[]`) and `label` (the group's accessible name, not shown).
- Arrow keys move the selection and focus to the next or previous option, wrapping at the ends. Only the selected option is in the tab order (the first when `value` matches no option).
- Clicking another option sets `value` and raises `change` with `{ value }` (`UauiSegmentedChangeDetail`). Clicking the selected option raises nothing.
- Put it in a `uui-box`'s `header-actions` slot.

**`uaui-group-by`** is `uaui-segmented` with the day, week and month options.

- Properties: `value` (`UauiGroupBy`), `options` (defaults to all three).
- It re-raises its own `change` with `{ value }` (`UauiGroupByChangeDetail`).

### 6. `uaui-date-range`: date range picker

![Date range button with comparison](../../design/phase-1/screenshots/cmp-diff.png)
![Date range dialog](../../design/phase-1/screenshots/01-dr-modal.png)

- Properties:
  - `value` (`UauiDateRange`)
  - `compare` (`UauiCompare | undefined`)
  - `presets` (defaults to last 7 days, last 30 days, last month, last year and custom; a product can pass its own, such as AI's last 24 hours)
  - `allow-compare` (default true). A plain boolean attribute, like `deselectable` and UUI's: it can't say false, so turn it off with the property, `.allowCompare=${false}`
  - `max-date` (default today)
  - `today` (an ISO date). Presets, the default `value` and the default `max-date` count from it. Unset uses the clock, and text that isn't a real date is ignored, so a typo can't break the picker. `max-date` still wins for the latest allowed date. A `value` the product sets stays as given. Examples set it so presets match their fixed data.
- With a comparison on, the button stays as tall as `uaui-group-by` (40px) and shows two lines: the range on line 1, "vs Apr 25 to May 24" on line 2 in the small, alt text style. The year is left off line 2 only when the range and both compare dates share a year. The button's accessible name is the purpose plus both lines as shown. Both lines are cut with an ellipsis in a narrow header. Without a comparison the button is unchanged.
- The button opens `uaui-date-range-modal` through the backoffice modal manager.
  - **Save** closes the dialog and raises `change` with `{ value, compare }` (`UauiDateRangeChangeDetail`).
  - **Close** discards the edits.
- **Presets:** choosing one fills both dates. Editing either date switches the preset to "Custom".
- **Compare:** turning it on shows the compare mode. "Previous period" and "Previous year" fill the comparison dates. "Custom" shows two more date fields.
- **The mistake:** an end date before the start, or a date after `max-date`, shows an inline error under the field and disables Save.

### 7. `uaui-data-table`

![Table with share columns](../../design/phase-1/screenshots/an-table.png)

- Properties:
  - `columns`: `{ key, label, elementName?, meta?, valueFormat?, align?, width?, sortable?, sortAs?, searchable? }[]`. `elementName` picks the cell (default the text cell; constants in `UAUI_TABLE_CELL`). `valueFormat` is per column (`Intl.NumberFormatOptions`). `width` is a CSS width, as in the CMS `umb-table`. `meta` holds what cells read: `hrefKey`, `color` (1 to 4, a share bar's palette slot) and `lowerIsBetter` (for compare badges).
  - `rows`: `Record<string, unknown>[]`
  - `compare-rows`, matched to `rows` by the `row-key` property (the key in each row that identifies it). When several compare rows share a key, the last wins
  - `stats`: `{ [columnKey]: { total, max } }` (`UauiTableStats`) across every page, for share percents and bar scales in `server` mode. A column without an entry uses the rows the table holds
  - `sort` (`{ key, direction }`)
  - `mode` (`"client"` | `"server"`)
  - `page`, `page-size`, `total-rows` (the row count across every page, `server` mode)
  - `query` (the search text; the table sets it from a `uaui-table-search` in the `toolbar` slot)
  - `clickable-rows` (makes rows openable and raises `row-click`)
  - `loading`
  - `empty-headline`, `empty-description`
  - `error`, `error-headline`, `error-description`, `retryable`
- **Error:** `error` shows `uaui-error-state` (§8) in place of the rows, passing on `error-headline`, `error-description` and `retryable`. The header stays. The rows, summary row, skeleton, "No results" and pager go. The table re-raises the state's `retry` from its own host. Precedence is error, then loading, then empty: the table in error is not `aria-busy` and shows no skeleton or loading bar. `error` is a plain property, so the product decides what an error is.
- **Loading:** cells take an optional `loading` flag and draw their own placeholder, so loading rows match loaded rows. A cell without `loading` gets a generic placeholder.
- **Cells are elements**, as in the CMS `umb-table`: each gets `column`, `item` (the row) and `value`. A column names its cell with `elementName` (default the text cell); the package ships ready-made cells (`uaui-share-cell` and others, with exported name constants). Columns have no `type`: alignment is `align`, sorting is `sortAs` (number, text or a compare function). Cells that need table-wide data (column total and max, compare rows) read it from the table's context, so the table doesn't special-case any cell.
- Slots: `toolbar`, for the search box (or any free layout above the header), `summary-<column key>` for totals, and `footer`, left of the pager.
- **Summary row:** content slotted as `summary-<column key>` sits in that column's cell, so it lines up with the header and the numbers below and takes the column's `align`. It is a row of the table, directly under the header, and is not sorted, searched or paged. It stays hidden while nothing is slotted for a column the table has. Content that arrives later shows it. A slot for an unknown column draws nothing. In `error` it is hidden.
- **Padding:** the cells pad themselves. The `toolbar` slot pads itself with the public CSS property `--uaui-table-padding` (default `12px 24px`), only when something is slotted. The reload loading bar sits outside it at the element's top edge, full width, so put the table in a `uui-box` with `--uui-box-default-padding: 0`.
- **Share cells (`UAUI_TABLE_CELL.share`):** show the value, its percent of the column total, and a thin bar scaled to the column's largest value.
  - The first share column uses `--uaui-series-1`, the second `--uaui-series-2`.
  - When comparing, a compare badge sits after the value.
- **Compare badges:** number, percent and share cells show a change badge when the table has a compare row for the row. `uaui-table-compare-badge` is the public piece behind them, and a product's own cell uses it with `column`, `item` and `value`. A column's `meta.lowerIsBetter` makes a fall positive.
- **Link cells (`UAUI_TABLE_CELL.link`):** render an anchor. The row's `href` comes from the column's `meta.hrefKey`.
- **Sorting:** clicking a sortable header toggles the direction and raises `sort-change`. In `client` mode the table also sorts itself.
- **Paging:** the footer is an internal compact pager (`uaui-compact-pager`, no table wording; its text comes from the `pager*` keys, so a product rewords it with its own localization). It has "Per page" (10, 25, 50, 100) and "1–10 of 272". It raises `page-change` with `{ page, pageSize }`, and in `client` mode it also pages itself. The footer is hidden when the rows fit on one page at the smallest page size the editor could need (row count ≤ the smaller of the current page size and 10), so a table at 50 rows per page can still go back to 10.
- **Search:** `uaui-data-table` exports `uaui-table-search` for the toolbar. It raises `search` with `{ query }`, 300ms after typing stops. In `client` mode the table filters rows on columns marked `searchable`; if none are marked, on every column's text.
- **`UauiTableServerController`** (public) runs the server side of a `server` table, so a page doesn't write the wiring again. It is a Lit `ReactiveController` that works on any host: create it on the page, attach it with `${ref(controller.attach)}`, and don't bind the properties it sets.
  - **Options:** `load(state, signal)` (required, returns the rows and any fields of your own), `sort`, `page` (default 1), `pageSize` (default 10), `query`, `onError(error)` and `retryable` (default true).
  - **Sets on the table:** `mode="server"`, `sort`, `page`, `pageSize`, `query`, `rows`, `compareRows`, `totalRows`, `stats`, `loading`, `error` and `retryable`. `result` hands back the last good answer with your own fields.
  - **When it loads:** when the host connects, and on the table's `sort-change`, `page-change` and `search`. A sort or search goes back to page 1, and a search with the same query loads nothing. `reload({ resetPage })` is for changes it can't see, such as the date range.
  - **Newer wins:** a newer request aborts the one before it (the `AbortSignal` passed to `load`), and a late answer is also dropped by a request counter, because a loader may ignore the signal. An aborted request is not an error.
  - **Failure:** any other rejection sets `error` (on the controller and the table), keeps the old rows in `result`, clears `loading` and calls `onError`. The table's `retry` calls `reload()`. The error clears when the next request starts, so a retry shows the skeleton or the old rows under a loading bar.
  - **Disconnected host:** it starts nothing (`reload` and table events do nothing). The host leaving aborts the request, and the state is loaded as it is on reconnect.
- **Rows:** a row is clickable only when the product sets `clickable-rows` (an element can't tell whether `row-click` has a listener). Then it's keyboard-reachable (Enter or Space) and raises `row-click` with `{ row }`. Clicks on links and buttons inside a row stay with them.

### 8. `uaui-empty-state`, `uaui-error-state` and loading

- **`uaui-empty-state`:** properties `headline`, `description`, `icon`. The data elements use it when they have no data. A product can also place it on its own.
- **`uaui-error-state`:** a separate public element (not a variant of the empty state: an error needs a role, a Retry action and an event). Same layout and look as the empty state, with an alert icon.
  - Properties: `headline`, `description`, `icon` and `retryable` (default false).
  - Without `headline` or `description` it shows "Something went wrong" and "The data could not be loaded." An empty string hides that line.
  - `retryable` shows a Retry button that raises `retry` (a plain `Event`, bubbling, not composed, no detail). Without it there is no button.
  - The text is announced when it appears (`role="alert"`).
  - The chart and table show it when `error` is set. The KPI tile shows a dash instead.
- **Loading:** each data element (chart, table, KPI tile) has a `loading` property.
  - On first load it shows a skeleton the same size as the loaded element, so the page doesn't jump.
  - While reloading with data already shown, the old data stays visible under a thin loading bar at the top.

### 9. Theme and localization

- Products override the `--uaui-*` colour names on any parent element. Elements read resolved `--uaui-color-*` copies (ARCHITECTURE.md decision 6). Default colours have a light and a dark shade, each at least 3:1 against the surface.
- Ships `en` translations for its own strings under `uauiAnalytics_*`. Generic verbs reuse Umbraco's keys (`buttons_save`, `general_close`, `general_loading`, `general_search`), so they're translated wherever the backoffice is. The package's `localization` extension has weight 200, so a product's own `localization` extension at the default weight (100) always overrides it.

### The five moments

| Moment | Applies? | What the elements do |
|---|---|---|
| First run | Yes | Data elements show `uaui-empty-state` with the product's `empty-headline` and `empty-description`. Defaults: "No data yet" / "Try a wider date range." |
| The mistake | Date range only | Inline field error, Save disabled. The other elements take no input that can be wrong. |
| An error | Yes | The chart and table show `uaui-error-state`, with Retry when `retryable`. The tile shows a dash. Error wins over loading and empty. |
| The wait | Yes | A skeleton on first load. On reload, the old data stays under a loading bar. |
| The finish | Date range only | The dialog closes and the button shows the new range. No toast: the data updating is the confirmation. |
| The return | Product's job | Elements don't store state. Products keep the date range, group-by, sort and page size between visits. `change` events carry everything needed to save them. |

### Later: not in v1

**Chart `lower-is-better`.** For metrics where a drop is good (bounce rate, refund rate): flip the gap shading colours and pass it to the tooltip badge. The chart treats higher as better until then.

**`uaui-funnel` (conversion funnel).** Parked until a product commits to using it. Today none does:

- Engage's funnel is on Campaign Reporting, which exists only in the design.
- Commerce's cart conversion widget is a line chart and a table. A funnel would mean redesigning it.

When it comes back, the starting point is [`funnel-final.png`](../../design/phase-1/screenshots/funnel-final.png) and the "Conversion funnel" notes in [`design-notes.md`](../../design/phase-1/design-notes.md). Confirm with design which label style is final, the banners in `funnel-final.png` or the plain labels in `commerce-final.png`. Adding it is a new element, so it won't break anything.

## Non-functional targets

- **Accessibility:** zero axe violations in every story, in light and dark. Every interactive part (KPI tile when selectable, markers, group-by, sort headers, pager, rows) is reachable and usable by keyboard.
- **Contrast:** text, badges and chart labels are at least 4.5:1 against their background in light, dark and high-contrast.
- **Public API:** no Chart.js type appears in `api/ui.api.md`.
- **Chart speed:** the chart renders 6 series × 366 daily points in under 100ms on a mid-range laptop.
- **Table speed:** in `client` mode the table stays responsive (sort or page in under 50ms) up to 1,000 rows. Above that, products use `server` mode.
- **Bundle size:** the built bundle, including Chart.js, is under 120 KB gzipped.

The last three were agreed by the user on 30-10-2026 after T23 measured them. `test:perf` and `check:size` guard them in CI.
