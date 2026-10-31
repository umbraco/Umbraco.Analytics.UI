# @umbraco/analytics-ui

TypeScript types for Umbraco Analytics UI: shared backoffice charts, tables, KPI tiles and filters used by the analytics sections of Umbraco products.

> This npm package contains **types only**. The components themselves ship in the `Umbraco.Analytics.UI` NuGet package, which registers `@umbraco/analytics-ui` in the backoffice import map so every product on a site shares one copy.

**Documentation, live previews and full page examples: [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/).** Start with [Getting started](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/guides-getting-started--docs).

## Install

1. Reference the NuGet package from your package's project, with a range that stays on one CMS major:

   ```xml
   <PackageReference Include="Umbraco.Analytics.UI" Version="[19.0.0, 19.999.999)" />
   ```

   Use `19.999.999` as the upper bound, not `20.0.0`: NuGet counts `20.0.0-alpha.1` as lower than `20.0.0`, so `[19.0.0, 20.0.0)` would let a 20 prerelease in. Raise the lower bound to the minor you build against.

2. Add the types as a dev dependency:

   ```bash
   npm install -D @umbraco/analytics-ui
   ```

3. Mark it as external in your bundler, so you use the backoffice's copy instead of bundling your own. For Vite:

   ```ts
   rollupOptions: {
     external: [/^@umbraco-cms\//, /^@umbraco\/analytics-ui(\/|$)/],
   }
   ```

4. Import it, then use the elements:

   ```ts
   import "@umbraco/analytics-ui";

   html`<uaui-delta-badge .value=${12.4}></uaui-delta-badge>`;
   ```

## Versioning

The package major matches the Umbraco CMS major. Minor and patch releases never break the public API: element names, attributes, events and types.

## Elements and helpers

Each links to its page in Storybook.

- [`uaui-kpi-tile`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-kpi-tile--docs)
- [`uaui-delta-badge`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-delta-badge--docs)
- [`uaui-time-series-chart`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-time-series-chart--docs)
- [`uaui-toggle-group`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-toggle-group--docs)
- [`uaui-group-by`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-group-by--docs)
- [`uaui-date-range`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-date-range--docs)
- [`uaui-data-table`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-data-table--docs)
- [`uaui-search-field`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-search-field--docs)
- [`uaui-table-total`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-data-table-total--docs)
- Table cells, [`uaui-text-cell`, `uaui-link-cell`, `uaui-number-cell`, `uaui-percent-cell` and `uaui-share-cell`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-data-table-cells--docs)
- [`uaui-table-compare-badge`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-data-table-compare-badge--docs)
- [`uaui-empty-state`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-empty-state--docs)
- [`uaui-error-state`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-error-state--docs)

Also public:

- `UAUI_TABLE_CELL` and `UAUI_TABLE_CONTEXT`: the cell element names, and what a custom cell reads from its table. See the [custom cell example](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/examples-custom-cell-with-table-context--docs).
- `UauiPaletteStyles`: the colour palette for your own elements. See [Theming and palette](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/guides-theming-and-palette--docs).
- `UauiTableServerController`: runs a table in `server` mode. See [Events, loading and errors](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/guides-events-loading-and-errors--docs).
- `uauiPreviousPeriod`, `uauiPreviousYear`, `uauiCompareFor`, `uauiDaysIn`, `uauiDateBuckets` and `uauiFormatDateRange`: the date helpers. See [Getting started](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/guides-getting-started--docs).
