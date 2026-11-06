# Changelog

What changed in each release of `Umbraco.Analytics.UI` (NuGet) and `@umbraco/analytics-ui` (npm). Both packages share one version. Usage for every element is in [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version numbers follow [Semantic Versioning](https://semver.org/). The package major matches the Umbraco CMS major.

## [Unreleased]

The first release, for Umbraco CMS 19.

### Added

- KPI tiles and figures: `uaui-kpi-tile`, `uaui-stat` and `uaui-delta-badge`.
- `uaui-kpi-tile`: `detail`, `detail-value` and `detail-format` show a short line under the value, such as "114,300 cached". `{0}` in `detail` is replaced with `detail-value`, formatted like the value.
- Charts: `uaui-time-series-chart`, `uaui-category-chart` and `uaui-funnel`.
- Tables: `uaui-data-table` with sorting, search and paging (client or server mode), ready-made cells, and `uaui-table-compare-badge` and `uaui-table-skeleton-cell` for your own cells.
- Filters: `uaui-date-range`, `uaui-group-by`, `uaui-toggle-group` and `uaui-search-field`.
- States: `uaui-empty-state` and `uaui-error-state`, with `UauiLoadStateMixin` for the same loading, error and empty rules in your own elements.
- Chart.js, mapped as `@umbraco/analytics-ui/external/chart.js`, so every product on a site shares one copy, with `uauiChartColors`, `uauiChartOptions` and `uauiWatchTheme` to give your own charts the same look.
- Date helpers for comparison periods and time buckets (`uauiBucketsFor`), and `uauiGroupByOptions`, which gives `uaui-group-by` the options for a range.
- Hourly charts: `group-by="hour"` on `uaui-time-series-chart` draws one bar per local hour. Offered by `uauiGroupByOptions` for ranges of two days or fewer. `uauiBucketsFor` gives hour buckets as UTC instants.
- `now` on `uaui-time-series-chart`: a date or a date and time. Labelled "Now" by hour and "Today" otherwise. `incomplete-from` is also read as a moment.
- `today` and `yesterday` presets for `uaui-date-range`, not in the default list. Add them to `presets`.
- A one-day range reads as one date ("Nov 5, 2026").

### Changed

- Breaking, for anyone on a prerelease build: `today` on `uaui-time-series-chart` is now `now`, and `uauiDateBuckets`, `UauiDateBucket` and `UauiDateBucketsOptions` are now `uauiBucketsFor`, `UauiBucket` and `UauiBucketsForOptions`. A bucket also has an `end`.
