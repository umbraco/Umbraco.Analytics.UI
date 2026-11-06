# Changelog

What changed in each release of `Umbraco.Analytics.UI` (NuGet) and `@umbraco/analytics-ui` (npm). Both packages share one version. Usage for every element is in [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version numbers follow [Semantic Versioning](https://semver.org/). The package major matches the Umbraco CMS major.

## [Unreleased]

The first release, for Umbraco CMS 19.

### Added

- KPI tiles and figures: `uaui-kpi-tile`, `uaui-stat` and `uaui-delta-badge`.
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
- `uaui-time-series-chart` fills its x-axis with every period of `range` (by `group-by` and `week-start`), so a period with no point keeps its slot. Lines and compare lines break where a period has no point, and a lone value shows as a dot. Leave a point out for a period with no value (a rate or an average) and send 0 for counts. Without `range` the axis is the points' dates, as before.
- Hovering any period of `uaui-time-series-chart`, or any category of `uaui-category-chart`, empty or not, shows the tooltip. It lists every shown series and says "No data" for one with no value there. The hidden table of `uaui-time-series-chart` and `uaui-category-chart` reads "No data" for an empty cell instead of a blank.

### Fixed

- `uaui-time-series-chart`: the dots of the complete part of a line that also has an unfinished part (`incomplete-from`) now have the same rim width as on a line with none.
