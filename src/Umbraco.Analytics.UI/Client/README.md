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

## Your own charts: the shared Chart.js

The package also ships Chart.js, so your own charts use the site's one copy instead of bundling another:

```ts
import { ArcElement, Chart, DoughnutController } from "@umbraco/analytics-ui/external/chart.js";
```

It is Chart.js as is, with its own types (`chart.js` is installed with this package for them), plus three helpers that give your chart the package's look and follow the backoffice theme: `uauiChartColors(host)`, `uauiChartOptions(host, type)` and `uauiWatchTheme(host, chart)` (see the "Custom charts with Chart.js" guide in Storybook). The helpers follow this package's semver; the Chart.js types they use follow Chart.js's. The external rule in step 3 already covers it. Never import from `"chart.js"` in backoffice code, and never by a path to the file: the first bundles a second copy, and the second misses the backoffice's cache-busting query on import map URLs, so the browser loads a second copy.

Chart.js's registry and defaults are shared by every product on the site, so:

- Register the controllers, elements and scales you use with `Chart.register` (they're shared, and that's fine).
- Never change `Chart.defaults` or `Chart.overrides`. Set options on your chart.
- Pass your own and third-party plugins in your chart's `plugins` array. Never register them globally.

See [Custom charts with Chart.js](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/guides-custom-charts-with-chart-js--docs) for an example.

## Versioning

The package major matches the Umbraco CMS major. Minor and patch releases never break the public API: element names, attributes, events and types. That includes Chart.js's major: a new Chart.js major only comes with a new CMS major.

## Elements and helpers

Each links to its page in Storybook.

- [`uaui-kpi-tile`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-kpi-tile--docs)
- [`uaui-delta-badge`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-delta-badge--docs)
- [`uaui-time-series-chart`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-time-series-chart--docs)
- [`uaui-category-chart`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-category-chart--docs)
- [`uaui-funnel`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-funnel--docs)
- [`uaui-toggle-group`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-toggle-group--docs)
- [`uaui-group-by`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-group-by--docs)
- [`uaui-date-range`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-date-range--docs)
- [`uaui-data-table`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-data-table--docs)
- [`uaui-search-field`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-search-field--docs)
- [`uaui-stat`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-stat--docs)
- Table cells, [`uaui-text-cell`, `uaui-link-cell`, `uaui-number-cell`, `uaui-percent-cell`, `uaui-share-cell`, `uaui-status-cell`, `uaui-date-cell` and `uaui-progress-cell`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-data-table-cells--docs)
- [`uaui-table-compare-badge`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-data-table-compare-badge--docs)
- [`uaui-table-skeleton-cell`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-data-table-skeleton-cell--docs)
- [`uaui-empty-state`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-empty-state--docs)
- [`uaui-error-state`](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/components-error-state--docs)

Also public:

- `UauiLoadStateMixin` and `UauiLoadStateMixinInterface`: the load states every data element shares (`loading`, `error`, `error-headline`, `error-description`, `retryable`, `empty-headline`, `empty-description`), the error > loading > empty rule and the `retry` event, for your own elements too.
- `UauiChartMixin` and `UauiChartMixinInterface`: built on the load states, the settings both charts share (`series`, `compare-series`, `y-scale`, `value-format`, `lower-is-better`, `compare-label`), with the same attribute names and defaults on each.
- `UAUI_TABLE_CELL` and `UAUI_TABLE_CONTEXT`: the cell element names, and what a custom cell reads from its table. See the [custom cell example](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/examples-custom-cell-with-table-context--docs).
- `UauiPaletteStyles`: the colour palette for your own elements (8 series slots; `uauiChartColors(host).series` from `@umbraco/analytics-ui/external/chart.js` now has 8 entries, so code cycling with `i % series.length` gives series 5 and up new colours). See [Theming and palette](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/guides-theming-and-palette--docs).
- `UauiTableServerController`: runs a table in `server` mode. See [Events, loading and errors](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/guides-events-loading-and-errors--docs).
- `uauiPresetRange`, `uauiPreviousPeriod`, `uauiPreviousYear`, `uauiCompareFor`, `uauiDaysIn`, `uauiTimeBuckets`, `uauiGroupByOptions` and `uauiFormatDateRange`: the date helpers. See [Getting started](https://umbraco.github.io/Umbraco.Analytics.UI/?path=/docs/guides-getting-started--docs).
