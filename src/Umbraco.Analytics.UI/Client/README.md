# @umbraco-analytics/ui

TypeScript types for Umbraco Analytics UI: shared backoffice charts, tables, KPI tiles and filters used by the analytics sections of Umbraco products.

> This npm package contains **types only**. The components themselves ship in the `Umbraco.Analytics.UI` NuGet package, which registers `@umbraco-analytics/ui` in the backoffice import map so every product on a site shares one copy.

## Using it in a backoffice extension

1. Reference the NuGet package from your package's project, with a range covering one CMS major:

   ```xml
   <PackageReference Include="Umbraco.Analytics.UI" Version="[19.0.0, 20.0.0)" />
   ```

2. Add the types as a dev dependency:

   ```bash
   npm install -D @umbraco-analytics/ui
   ```

3. Mark it as external in your bundler, so you use the backoffice's copy instead of bundling your own. For Vite:

   ```ts
   rollupOptions: {
     external: [/^@umbraco-cms\//, /^@umbraco-analytics\//],
   }
   ```

4. Import and use the components:

   ```ts
   import "@umbraco-analytics/ui";

   html`<uaui-delta-badge .value=${12.4}></uaui-delta-badge>`;
   ```

## Elements

Every element is a Lit custom element. A name starting with `.` in a template, like `.series`, sets a property: pass objects and arrays that way. Live previews of each element and full example pages are in [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/).

Put charts and tables in a `uui-box` with `--uui-box-default-padding: 0`. They pad themselves.

### uaui-kpi-tile

A headline number as a card. You format the value. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-kpi-tile--docs)

```ts
html`<uaui-kpi-tile label="Revenue" value="€ 4,837.40" icon="icon-coin-dollar" .delta=${18.7}></uaui-kpi-tile>`;
```

Add `selectable` (and `selected`, `deselectable`) to make it a metric picker. With `.deselectable=${false}`, pressing the selected tile does nothing (no event). `lower-is-better` flips the badge colours. `loading` shows a skeleton.

Say what the change is:

- `.delta=${0}` is "no change": a neutral badge ("0%" or "0 pp").
- `delta` unset is "unknown" (no comparison data): no badge.

Add `no-data` when the range has no data. The tile shows a dash and no badge, instead of "0", and says "No data yet" to screen readers (key `uauiAnalytics_emptyHeadline`).

Add `error` when the load failed. The tile keeps its label, shows a dash and no badge, and says "Something went wrong" to screen readers (key `uauiAnalytics_errorHeadline`). `error` wins over `loading`, `no-data` and `value`. The message is for screen readers only, so a page of tiles with no chart or table should show its own alert.

### uaui-delta-badge

The change against a comparison period. `12.4` means +12.4%. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-delta-badge--docs)

```ts
html`<uaui-delta-badge .value=${-3.2} lower-is-better unit="points"></uaui-delta-badge>`;
```

`unit` is `percent` or `points`. `size` is `md` or `sm`. `max-decimals` defaults to 1. A `value` of 0 is "no change" (neutral, "0%" or "0 pp"). With no `value` (or one that isn't a finite number) nothing is drawn.

### uaui-time-series-chart

A metric over time. It only draws: pass the points. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-time-series-chart--docs)

```ts
import type { UauiSeries } from "@umbraco-analytics/ui";

const series: UauiSeries[] = [
  { id: "visitors", label: "Visitors", points: [{ date: "2026-06-01", value: 120 }, { date: "2026-06-02", value: 142 }] },
];

html`<uaui-time-series-chart kind="area" group-by="day" .series=${series}></uaui-time-series-chart>`;
```

`kind` is `line`, `area`, `bar` or `stacked-bar`. Add `.compareSeries` for last period's points, plus `.range` and `.compare` (the `{ from, to }` that `uaui-date-range` emits) so they line up by bucket: compare points sit under the same bucket number of the current period, counted from each range's first bucket. Pass both: without them each side starts at its first point, so sparse data that omits a period's first days (or weeks, or months) shifts the compare out of line. Points on one date are added, so aggregate rates and averages first. Add `.markers` (`{ id, date, title }`) for events on the x-axis. Set `.valueFormat` to `Intl.NumberFormat` options. Listen for `marker-click` (`UauiMarkerClickDetail`).

Set `error` when the load failed: the chart shows `uaui-error-state` in place of the plot. Add `retryable` for a Retry button, and listen for `retry` on the chart. `error-headline` and `error-description` reword it. `error` wins over `loading`, and `loading` over the empty state.

### uaui-segmented

A row of options where one is selected, as a radio group: arrow keys move the selection, only the selected option is in the tab order. UUI has no segmented control (`uui-button-group` and `uui-tabs` have different semantics). Sets its own `value`, then raises `change`. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-segmented--docs)

```ts
import type { UauiSegmentedChangeDetail } from "@umbraco-analytics/ui";

html`<uaui-segmented
  label="Break down by"
  .value=${this._by}
  .options=${[{ value: "model", label: "Model" }, { value: "profile", label: "Profile" }]}
  @change=${(e: CustomEvent<UauiSegmentedChangeDetail>) => (this._by = e.detail.value)}
></uaui-segmented>`;
```

`label` is the group's accessible name (not shown). `uaui-group-by` is built on it.

### uaui-group-by

Day, week or month switch. Sets its own `value`, then raises `change`. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-group-by--docs)

```ts
import type { UauiGroupByChangeDetail } from "@umbraco-analytics/ui";

html`<uaui-group-by
  .value=${this._groupBy}
  @change=${(e: CustomEvent<UauiGroupByChangeDetail>) => (this._groupBy = e.detail.value)}
></uaui-group-by>`;
```

`.options` limits the choices, e.g. `.options=${["day", "week"]}`.

### uaui-date-range

A button that opens a dialog to pick a range and a comparison. Put it in a `uui-box`'s `header-actions` slot. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-date-range--docs)

```ts
import type { UauiDateRangeChangeDetail } from "@umbraco-analytics/ui";

html`<uui-box headline="Visitors">
  <uaui-date-range
    slot="header-actions"
    .value=${{ from: "2026-06-01", to: "2026-06-30" }}
    @change=${(e: CustomEvent<UauiDateRangeChangeDetail>) => this.#load(e.detail)}
  ></uaui-date-range>
</uui-box>`;
```

Dates are `YYYY-MM-DD`. The package registers the dialog for you. `.presets`, `.maxDate` and `.allowCompare` adjust it. Comparison is on by default: turn it off with `.allowCompare=${false}`, as a boolean attribute can't say false.

`today` (an ISO date, such as `today="2026-06-23"`) sets the day the presets, the default `value` and the default `max-date` count from. Leave it unset to use the browser's clock. Set it in demos and tests so presets match your fixed data. Text that isn't a real date is ignored.

#### Date helpers

Functions for the dates around the picker, so each product doesn't write its own. Ranges are `{ from, to }` ISO dates: a `UauiDateRange` or `UauiCompare` fits. A range that isn't valid (an unreal date, or `to` before `from`) gives `undefined`, or an empty list for the day and bucket helpers.

```ts
import { uauiCompareFor, uauiDateBuckets, uauiFormatDateRange } from "@umbraco-analytics/ui";

const range = { from: "2026-05-25", to: "2026-06-23" };
const compare = uauiCompareFor("previous-period", range); // { mode, from: "2026-04-25", to: "2026-05-24" }

// Chart points per bucket: a day, a week (Monday start) or a month, plotted at the bucket's `start`.
const points = uauiDateBuckets(range, "week").map(({ start, days }) => ({ date: start, value: sum(days) }));

// The label `uaui-date-range` shows, for the chart's compareLabel. Pass your element's `this.localize`.
html`<uaui-time-series-chart .compareLabel=${compare && uauiFormatDateRange(this.localize, compare)}></uaui-time-series-chart>`;
```

| Function | Gives |
| --- | --- |
| `uauiPreviousPeriod(range)` | The same number of days straight before `range`. |
| `uauiPreviousYear(range)` | The same dates one year earlier. |
| `uauiCompareFor(mode, range)` | A `UauiCompare` for `previous-period` or `previous-year`. `undefined` for `custom`. |
| `uauiDaysIn(range)` | Every ISO date in `range`, both ends included. |
| `uauiDateBuckets(range, groupBy)` | `{ start, days }[]` for `day`, `week` or `month`, the same buckets `uaui-group-by` offers. |
| `uauiFormatDateRange(localize, range, { showYear })` | Text such as "May 25, 2026 to Jun 23, 2026" in the user's culture. |

### uaui-data-table

Rows and columns. Each column names the cell that shows it. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-data-table--docs)

```ts
import { UAUI_TABLE_CELL, type UauiTableColumn } from "@umbraco-analytics/ui";

const columns: UauiTableColumn[] = [
  { key: "title", label: "Page", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "url" }, searchable: true },
  { key: "views", label: "Views", elementName: UAUI_TABLE_CELL.share, align: "end", sortable: true, sortAs: "number" },
];
const rows = [{ title: "Home", url: "https://example.com/", views: 1240 }];

html`<uaui-data-table
  .columns=${columns}
  .rows=${rows}
  row-key="url"
  clickable-rows
  @row-click=${(e: CustomEvent<{ row: Record<string, unknown> }>) => this.#open(e.detail.row)}
></uaui-data-table>`;
```

- **Client mode** (default): the table sorts, searches and pages the rows you give it.
- **Server mode**: set `mode="server"` and `total-rows` (the row count across every page). The table never reorders or filters. Load new rows on `sort-change`, `page-change` and `search`. Pass `.stats` (`{ [columnKey]: { total, max } }` across every page) so shares and bars stay right across pages. `UauiTableServerController` does this wiring for you (below).
- **Compare**: pass `.compareRows` and `row-key` to show a change badge on number, percent and share cells. Set `meta: { lowerIsBetter: true }` on a column where a fall is good.
- **Summary row**: slot content as `summary-<column key>` to show a row above the column headings: a `uaui-table-search` in the first column and a `uaui-table-total` over each number column (below). Each piece sits in its column's cell and takes its `align`. With nothing slotted there is no row. The row isn't sorted or paged, and you work out its numbers.
- **Slots**: `toolbar` (above everything), `summary-<key>` (above the headings, in a column), and `footer` (left of the pager).
- **Rows**: `clickable-rows` makes rows keyboard-reachable and raises `row-click`.

Replace `rows` and `columns` with new arrays to update. Changing them in place isn't noticed.

Set `error` when the load failed: the table keeps its header and shows `uaui-error-state` in place of the rows and pager. Add `retryable` for a Retry button, and listen for `retry` on the table. `error-headline` and `error-description` reword it. `error` wins over `loading`, and `loading` over the empty state.

#### UauiTableServerController

Wires a server-mode table so you only write the loader. It keeps the sort, page, page size and search, goes back to page 1 on a sort or search, aborts the request a newer one replaces (the `AbortSignal` it passes to `load`), drops an answer that arrives late, and sets `rows`, `compareRows`, `totalRows`, `stats`, `loading` and `error` on the table.

```ts
import { ref } from "@umbraco-cms/backoffice/external/lit";
import { UauiTableServerController } from "@umbraco-analytics/ui";

#pages = new UauiTableServerController(this, {
  sort: { key: "views", direction: "desc" },
  load: async ({ sort, page, pageSize, query }, signal) => {
    const response = await fetch(`/api/pages?page=${page}&size=${pageSize}&q=${query}`, { signal });
    return await response.json(); // { rows, totalRows, stats?, compareRows? }, plus any fields of your own
  },
});

html`<uaui-data-table ${ref(this.#pages.attach)} .columns=${columns}></uaui-data-table>`;
```

- It loads when the host connects. Call `this.#pages.reload({ resetPage: true })` when something the loader reads changes, such as the date range.
- `result` is the last answer, including your own fields. `loading` and `error` are there too, and the host redraws when they change. A failed request calls `onError` and shows the table's error state with Retry, which calls `reload()`. The next request clears it.

### uaui-table-search

A search box for the table's `toolbar` slot, or for the first column's `summary-<key>` slot. A client table needs no wiring. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-table-search--docs)

```ts
html`<uaui-data-table .columns=${columns} .rows=${rows}>
  <uaui-table-search slot="toolbar"></uaui-table-search>
</uaui-data-table>`;
```

It raises `search` with `{ query }` 300ms after typing stops. In server mode, listen for it and load the matching rows.

### uaui-table-total

One total for the table's summary row: a small label, the value and an optional change badge. Slot it into `summary-<column key>` and it sits over its column, ending on the right in an end-aligned column. `value` is shown as you give it. Give `current` and `previous` and the badge works out the change, or give `delta` (it wins). Set `delta-unit="points"` for a rate, and `lower-is-better` when a fall is good, as on `uaui-kpi-tile`.

```ts
html`<uaui-data-table .columns=${columns} .rows=${rows}>
  <uaui-table-search slot="summary-url"></uaui-table-search>
  <uaui-table-total slot="summary-views" label="Total views" value="272" .current=${272} .previous=${251}></uaui-table-total>
</uaui-data-table>`;
```

### Cells

The built-in cells are named in `UAUI_TABLE_CELL` and also work on their own. They take `column`, `item` and `value`. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-data-table-cells--docs)

```ts
const columns: UauiTableColumn[] = [
  { key: "name", label: "Name" }, // uaui-text-cell, the default
  { key: "page", label: "Page", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "url" } }, // uaui-link-cell, row: { page: "Home", url: "https://example.com/" }
  { key: "orders", label: "Orders", elementName: UAUI_TABLE_CELL.number, valueFormat: { maximumFractionDigits: 0 } }, // uaui-number-cell
  { key: "rate", label: "Rate", elementName: UAUI_TABLE_CELL.percent }, // uaui-percent-cell, 0.25 is "25%"
  { key: "views", label: "Views", elementName: UAUI_TABLE_CELL.share }, // uaui-share-cell
];
```

- **`uaui-text-cell`**: plain text.
- **`uaui-link-cell`**: a link. The URL is the item's `meta.hrefKey` value. Unsafe URLs show plain text.
- **`uaui-number-cell`**: a number in the editor's culture, formatted with `valueFormat`. Shows a change badge when the table has a compare row.
- **`uaui-percent-cell`**: a fraction as a percentage. Shows a change badge when the table has a compare row.
- **`uaui-share-cell`**: the value, its percent of the column total and a bar. Reads the column's `total` and `max` from the table's `stats`, and shows a change badge when the table has a compare row.

Settings a cell reads live in the column's `meta`: `hrefKey` (link), `color` (share bar) and `lowerIsBetter` (what a good change is, for the badge).

To write your own cell, implement `UauiTableCellElement` and read the table's stats and compare rows from `UAUI_TABLE_CONTEXT`. See the [custom cell example](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/examples-custom-cell-with-table-context--docs).

For the change badge, drop `uaui-table-compare-badge` into your cell with the three properties the table gave it. It finds the compare row itself and reads `meta.lowerIsBetter`:

```ts
html`${value}<uaui-table-compare-badge .column=${this.column} .item=${this.item} .value=${this.value}></uaui-table-compare-badge>`;
```

```ts
import { UAUI_TABLE_CONTEXT } from "@umbraco-analytics/ui";

this.consumeContext(UAUI_TABLE_CONTEXT, (context) => {
  this.observe(context?.stats, (stats) => (this._max = stats?.[this.column.key]?.max ?? 0), "_max");
});
```

### uaui-empty-state

A "nothing to show" message. The chart and table use it when they have no data. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-empty-state--docs)

```ts
html`<uaui-empty-state headline="No orders yet" description="Orders show up here once a customer checks out."></uaui-empty-state>`;
```

An empty string hides that line. `icon` is a backoffice icon name.

### uaui-error-state

A "could not load" message. The chart and table show it when their `error` is set. The KPI tile shows a dash instead, with no Retry. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-error-state--docs)

```ts
html`<uaui-error-state retryable @retry=${() => this.#load()}></uaui-error-state>`;
```

Without `headline` and `description` it says "Something went wrong" and "The data could not be loaded." (keys `uauiAnalytics_errorHeadline` and `uauiAnalytics_errorDescription`). An empty string hides that line. `retryable` shows a Retry button (Umbraco's `general_retry`) that raises `retry`. `icon` is a backoffice icon name. The text is announced when it appears (`role="alert"`).

### Full pages

[Examples > Pages](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/examples-pages-commerce--docs) in Storybook rebuild the Commerce, Engage and Umbraco AI analytics pages from these elements, with the code beside each.

## Using the palette in your own elements

Our elements read their colours from `--uaui-*` custom properties. To colour your own cell, legend or chart key the same way, add `UauiPaletteStyles` to the element's styles and read the resolved name:

```ts
import { css, html, LitElement } from "@umbraco-cms/backoffice/external/lit";
import { UauiPaletteStyles } from "@umbraco-analytics/ui";

class MyLegend extends LitElement {
  render() {
    return html`<span class="dot"></span>`;
  }

  static styles = [
    UauiPaletteStyles,
    css`
      .dot {
        background-color: var(--uaui-color-series-1);
      }
    `,
  ];
}
```

The colour is the one our share bars use, in the light, dark and high contrast themes.

| Read this | For | Override it with |
| --- | --- | --- |
| `--uaui-color-series-1` to `--uaui-color-series-4` | lines and bars | `--uaui-series-1` to `--uaui-series-4` |
| `--uaui-color-fill-1` to `--uaui-color-fill-4` | area fills (use at low opacity) | `--uaui-series-N` |
| `--uaui-color-bar-1` to `--uaui-color-bar-4` | livelier bars | `--uaui-bar-N`, then `--uaui-series-N` |
| `--uaui-color-compare` | the compare period | `--uaui-compare` |
| `--uaui-color-compare-bar` | the compare bar (45% of compare) | `--uaui-compare` |
| `--uaui-color-marker`, `--uaui-color-marker-hover` | chart markers | `--uaui-marker` |
| `--uaui-color-gap-positive`, `--uaui-color-gap-negative` | shading between a series and its compare line | `--uaui-gap-positive`, `--uaui-gap-negative` |
| `--uaui-color-tint-positive`, `-negative`, `-neutral` | pill and track backgrounds | `--uaui-tint-*` |
| `--uaui-color-text-positive`, `-negative`, `-neutral` | text on those tints | `--uaui-text-*` |

Notes:

- `--uaui-color-*` are read-only. Override with `--uaui-*` only; setting `--uaui-color-*` is unsupported.
- To override, set `--uaui-*` (for example `--uaui-series-1: #0a7`) on an ancestor, so it reaches both your elements and ours. Setting it on your own `:host` only changes your element.
- The block sets `color-scheme` on the element's `:host`. Its subtree inherits it, slotted children included, which aligns native controls and scrollbars with the UUI theme. With no UUI theme it resets to `normal`.
- The palette is tested to 3:1 for lines and bars in all three themes. If you override a colour, you own its contrast.

## Events

All events bubble. None is composed, so they don't cross shadow roots.

| Element | Event | `detail` |
| --- | --- | --- |
| `uaui-segmented` | `change` | `{ value }` |
| `uaui-group-by` | `change` | `{ value }` |
| `uaui-date-range` | `change` | `{ value, compare }` |
| `uaui-time-series-chart` | `marker-click` | `{ id }` |
| `uaui-error-state` | `retry` | none |
| `uaui-time-series-chart` | `retry` | none |
| `uaui-data-table` | `retry` | none |
| `uaui-kpi-tile` | `selected`, `deselected` | `{}` (cancelable) |
| `uaui-table-search` | `search` | `{ query }` |
| `uaui-data-table` | `sort-change` | `{ key, direction }` |
| `uaui-data-table` | `page-change` | `{ page, pageSize }` |
| `uaui-data-table` | `row-click` | `{ row }` |

Elements set their own `value`, `sort`, `page` and `query` before raising the event, as UUI inputs do.

## Translations

Text comes from `uauiAnalytics_*` keys. English ships with the package as a `localization` extension at weight 200. To change a string or add a culture, register your own `localization` extension with those keys. Yours wins at the default weight of 100. Numbers and dates use the backoffice user's culture.

## Versioning

The package major matches the Umbraco CMS major. Minor and patch releases never break the public API: element names, attributes, events and types.
