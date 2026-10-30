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

   html`<uax-delta-badge .value=${12.4}></uax-delta-badge>`;
   ```

## Elements

Every element is a Lit custom element. A name starting with `.` in a template, like `.series`, sets a property: pass objects and arrays that way. Live previews of each element and full example pages are in [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/).

Put charts and tables in a `uui-box` with `--uui-box-default-padding: 0`. They pad themselves.

### uax-kpi-tile

A headline number as a card. You format the value. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-kpi-tile--docs)

```ts
html`<uax-kpi-tile label="Revenue" value="€ 4,837.40" icon="icon-coin-dollar" .delta=${18.7}></uax-kpi-tile>`;
```

Add `selectable` (and `selected`, `deselectable`) to make it a metric picker. With `.deselectable=${false}`, pressing the selected tile does nothing (no event). `lower-is-better` flips the badge colours. `loading` shows a skeleton.

Say what the change is:

- `.delta=${0}` is "no change": a neutral badge ("0%" or "0 pp").
- `delta` unset is "unknown" (no comparison data): no badge.

Add `no-data` when the range has no data. The tile shows a dash and no badge, instead of "0", and says "No data yet" to screen readers (key `uaxAnalytics_emptyHeadline`).

### uax-delta-badge

The change against a comparison period. `12.4` means +12.4%. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-delta-badge--docs)

```ts
html`<uax-delta-badge .value=${-3.2} lower-is-better unit="points"></uax-delta-badge>`;
```

`unit` is `percent` or `points`. `size` is `md` or `sm`. `max-decimals` defaults to 1. A `value` of 0 is "no change" (neutral, "0%" or "0 pp"). With no `value` (or one that isn't a finite number) nothing is drawn.

### uax-time-series-chart

A metric over time. It only draws: pass the points. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-time-series-chart--docs)

```ts
import type { UaxSeries } from "@umbraco-analytics/ui";

const series: UaxSeries[] = [
  { id: "visitors", label: "Visitors", points: [{ date: "2026-06-01", value: 120 }, { date: "2026-06-02", value: 142 }] },
];

html`<uax-time-series-chart kind="area" group-by="day" .series=${series}></uax-time-series-chart>`;
```

`kind` is `line`, `area`, `bar` or `stacked-bar`. Add `.compareSeries` for last period's points and `.markers` (`{ id, date, title }`) for events on the x-axis. Set `.valueFormat` to `Intl.NumberFormat` options. Listen for `marker-click` (`UaxMarkerClickDetail`).

### uax-group-by

Day, week or month switch. Sets its own `value`, then raises `change`. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-group-by--docs)

```ts
import type { UaxGroupByChangeDetail } from "@umbraco-analytics/ui";

html`<uax-group-by
  .value=${this._groupBy}
  @change=${(e: CustomEvent<UaxGroupByChangeDetail>) => (this._groupBy = e.detail.value)}
></uax-group-by>`;
```

`.options` limits the choices, e.g. `.options=${["day", "week"]}`.

### uax-date-range

A button that opens a dialog to pick a range and a comparison. Put it in a `uui-box`'s `header-actions` slot. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-date-range--docs)

```ts
import type { UaxDateRangeChangeDetail } from "@umbraco-analytics/ui";

html`<uui-box headline="Visitors">
  <uax-date-range
    slot="header-actions"
    .value=${{ from: "2026-06-01", to: "2026-06-30" }}
    @change=${(e: CustomEvent<UaxDateRangeChangeDetail>) => this.#load(e.detail)}
  ></uax-date-range>
</uui-box>`;
```

Dates are `YYYY-MM-DD`. The package registers the dialog for you. `.presets`, `.maxDate` and `.allowCompare` adjust it. Comparison is on by default: turn it off with `.allowCompare=${false}`, as a boolean attribute can't say false.

### uax-data-table

Rows and columns. Each column names the cell that shows it. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-data-table--docs)

```ts
import { UAX_TABLE_CELL, type UaxTableColumn } from "@umbraco-analytics/ui";

const columns: UaxTableColumn[] = [
  { key: "title", label: "Page", elementName: UAX_TABLE_CELL.link, meta: { hrefKey: "url" }, searchable: true },
  { key: "views", label: "Views", elementName: UAX_TABLE_CELL.share, align: "end", sortable: true, sortAs: "number" },
];
const rows = [{ title: "Home", url: "https://example.com/", views: 1240 }];

html`<uax-data-table
  .columns=${columns}
  .rows=${rows}
  row-key="url"
  clickable-rows
  @row-click=${(e: CustomEvent<{ row: Record<string, unknown> }>) => this.#open(e.detail.row)}
></uax-data-table>`;
```

- **Client mode** (default): the table sorts, searches and pages the rows you give it.
- **Server mode**: set `mode="server"` and `total-rows` (the row count across every page). The table never reorders or filters. Load new rows on `sort-change`, `page-change` and `search`. Pass `.stats` (`{ [columnKey]: { total, max } }` across every page) so shares and bars stay right across pages.
- **Compare**: pass `.compareRows` and `row-key` to show a change badge on number, percent and share cells. Set `meta: { lowerIsBetter: true }` on a column where a fall is good.
- **Slots**: `toolbar` (above the header) and `footer` (left of the pager).
- **Rows**: `clickable-rows` makes rows keyboard-reachable and raises `row-click`.

Replace `rows` and `columns` with new arrays to update. Changing them in place isn't noticed.

### uax-table-search

A search box for the table's `toolbar` slot. A client table needs no wiring. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-table-search--docs)

```ts
html`<uax-data-table .columns=${columns} .rows=${rows}>
  <uax-table-search slot="toolbar"></uax-table-search>
</uax-data-table>`;
```

It raises `search` with `{ query }` 300ms after typing stops. In server mode, listen for it and load the matching rows.

### Cells

The built-in cells are named in `UAX_TABLE_CELL` and also work on their own. They take `column`, `item` and `value`. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-data-table-cells--docs)

```ts
const columns: UaxTableColumn[] = [
  { key: "name", label: "Name" }, // uax-text-cell, the default
  { key: "page", label: "Page", elementName: UAX_TABLE_CELL.link, meta: { hrefKey: "url" } }, // uax-link-cell, row: { page: "Home", url: "https://example.com/" }
  { key: "orders", label: "Orders", elementName: UAX_TABLE_CELL.number, valueFormat: { maximumFractionDigits: 0 } }, // uax-number-cell
  { key: "rate", label: "Rate", elementName: UAX_TABLE_CELL.percent }, // uax-percent-cell, 0.25 is "25%"
  { key: "views", label: "Views", elementName: UAX_TABLE_CELL.share }, // uax-share-cell
];
```

- **`uax-text-cell`**: plain text.
- **`uax-link-cell`**: a link. The URL is the item's `meta.hrefKey` value. Unsafe URLs show plain text.
- **`uax-number-cell`**: a number in the editor's culture, formatted with `valueFormat`. Shows a change badge when the table has a compare row.
- **`uax-percent-cell`**: a fraction as a percentage. Shows a change badge when the table has a compare row.
- **`uax-share-cell`**: the value, its percent of the column total and a bar. Reads the column's `total` and `max` from the table's `stats`, and shows a change badge when the table has a compare row.

Settings a cell reads live in the column's `meta`: `hrefKey` (link), `color` (share bar) and `lowerIsBetter` (what a good change is, for the badge).

To write your own cell, implement `UaxTableCellElement` and read the table's stats and compare rows from `UAX_TABLE_CONTEXT`. See the [custom cell example](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/examples-custom-cell-with-table-context--docs).

For the change badge, drop `uax-table-compare-badge` into your cell with the three properties the table gave it. It finds the compare row itself and reads `meta.lowerIsBetter`:

```ts
html`${value}<uax-table-compare-badge .column=${this.column} .item=${this.item} .value=${this.value}></uax-table-compare-badge>`;
```

```ts
import { UAX_TABLE_CONTEXT } from "@umbraco-analytics/ui";

this.consumeContext(UAX_TABLE_CONTEXT, (context) => {
  this.observe(context?.stats, (stats) => (this._max = stats?.[this.column.key]?.max ?? 0), "_max");
});
```

### uax-empty-state

A "nothing to show" message. The chart and table use it when they have no data. [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-empty-state--docs)

```ts
html`<uax-empty-state headline="No orders yet" description="Orders show up here once a customer checks out."></uax-empty-state>`;
```

An empty string hides that line. `icon` is a backoffice icon name.

### Full pages

[Examples > Pages](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/examples-pages-commerce--docs) in Storybook rebuild the Commerce, Engage and Umbraco AI analytics pages from these elements, with the code beside each.

## Using the palette in your own elements

Our elements read their colours from `--uax-*` custom properties. To colour your own cell, legend or chart key the same way, add `UaxPaletteStyles` to the element's styles and read the resolved name:

```ts
import { css, html, LitElement } from "@umbraco-cms/backoffice/external/lit";
import { UaxPaletteStyles } from "@umbraco-analytics/ui";

class MyLegend extends LitElement {
  render() {
    return html`<span class="dot"></span>`;
  }

  static styles = [
    UaxPaletteStyles,
    css`
      .dot {
        background-color: var(--uax-color-series-1);
      }
    `,
  ];
}
```

The colour is the one our share bars use, in the light, dark and high contrast themes.

| Read this | For | Override it with |
| --- | --- | --- |
| `--uax-color-series-1` to `--uax-color-series-4` | lines and bars | `--uax-series-1` to `--uax-series-4` |
| `--uax-color-fill-1` to `--uax-color-fill-4` | area fills (use at low opacity) | `--uax-series-N` |
| `--uax-color-bar-1` to `--uax-color-bar-4` | livelier bars | `--uax-bar-N`, then `--uax-series-N` |
| `--uax-color-compare` | the compare period | `--uax-compare` |
| `--uax-color-compare-bar` | the compare bar (45% of compare) | `--uax-compare` |
| `--uax-color-marker`, `--uax-color-marker-hover` | chart markers | `--uax-marker` |
| `--uax-color-gap-positive`, `--uax-color-gap-negative` | shading between a series and its compare line | `--uax-gap-positive`, `--uax-gap-negative` |
| `--uax-color-tint-positive`, `-negative`, `-neutral` | pill and track backgrounds | `--uax-tint-*` |
| `--uax-color-text-positive`, `-negative`, `-neutral` | text on those tints | `--uax-text-*` |

Notes:

- `--uax-color-*` are read-only. Override with `--uax-*` only; setting `--uax-color-*` is unsupported.
- To override, set `--uax-*` (for example `--uax-series-1: #0a7`) on an ancestor, so it reaches both your elements and ours. Setting it on your own `:host` only changes your element.
- The block sets `color-scheme` on the element's `:host`. Its subtree inherits it, slotted children included, which aligns native controls and scrollbars with the UUI theme. With no UUI theme it resets to `normal`.
- The palette is tested to 3:1 for lines and bars in all three themes. If you override a colour, you own its contrast.

## Events

All events bubble. None is composed, so they don't cross shadow roots.

| Element | Event | `detail` |
| --- | --- | --- |
| `uax-group-by` | `change` | `{ value }` |
| `uax-date-range` | `change` | `{ value, compare }` |
| `uax-time-series-chart` | `marker-click` | `{ id }` |
| `uax-kpi-tile` | `selected`, `deselected` | `{}` (cancelable) |
| `uax-table-search` | `search` | `{ query }` |
| `uax-data-table` | `sort-change` | `{ key, direction }` |
| `uax-data-table` | `page-change` | `{ page, pageSize }` |
| `uax-data-table` | `row-click` | `{ row }` |

Elements set their own `value`, `sort`, `page` and `query` before raising the event, as UUI inputs do.

## Translations

Text comes from `uaxAnalytics_*` keys. English ships with the package as a `localization` extension at weight 200. To change a string or add a culture, register your own `localization` extension with those keys. Yours wins at the default weight of 100. Numbers and dates use the backoffice user's culture.

## Versioning

The package major matches the Umbraco CMS major. Minor and patch releases never break the public API: element names, attributes, events and types.
