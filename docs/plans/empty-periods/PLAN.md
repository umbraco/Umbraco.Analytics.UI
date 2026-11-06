# Plan: Empty periods in the time series chart

**7 tasks in 4 areas.** Pending specs for every story are in the files each task's Acceptance names. T1 comes first: every other task needs the empty slots it makes. T3 and T4 run one after the other, because both change `chart-renderer.ts`.

Paths are under `src/Umbraco.Analytics.UI/Client/src/`. The time zone in tests is pinned to `Europe/Copenhagen`, as the chart tests already are.

## Slots

- [x] **T1** - story: EMP-1 (AC1–AC8). In `chart/internal/chart-data.ts`, `UauiChartAnchors` gains `to`. When the anchors have both `from` and `to`, `buildChartData` builds its date list from the internal `dateBuckets({ from, to }, groupBy, weekStart)` (in `internal/date/date-math.ts`), each bucket's `start` run through the file's own `keyOf`, merged with the points' dates (each once, sorted). Without both, the list is the points' dates as today (SPEC R1–R4; ARCHITECTURE, Decisions). Points are not moved to their bucket's start. In `chart/time-series-chart.element.ts`, `#derive` passes `to: range?.to` beside `from`.
  Acceptance: EMP-1 specs green in `chart/time-series-chart.empty-slots.test.ts`. Existing `chart/internal/chart-data.test.ts`, compare and hourly chart tests green.
  depends-on: none

- [ ] **T2** - story: EMP-5 (AC1–AC6). Check that markers, the now line, the unfinished mark and compare points find empty slots through the fuller date list (SPEC R11, R12), with no change to `chart/internal/bucket-lookup.ts` or `incomplete-index.ts` expected. Fix only what a spec shows is wrong.
  Acceptance: EMP-5 specs green in `chart/time-series-chart.empty-marks.test.ts`. Existing markers, now and incomplete tests green.
  depends-on: T1. parallel-group: B

## Drawing

- [ ] **T3** - story: EMP-2 (AC1–AC5). In `chart/internal/chart-renderer.ts`, the series line (`#lineDataset`) and the compare line (`#compareLineDataset`) set `spanGaps: false` (SPEC R5). A value whose neighbours on both sides are `null` (or the chart's edge) gets a dot of radius 2, even when `showDots` is off or the line has a compare line, through a scriptable `pointRadius` (SPEC R6). No new plugin, no `Chart.defaults` change.
  Acceptance: EMP-2 specs green in `chart/time-series-chart.empty-lines.test.ts`. `time-series-chart.isolation.test.ts` and the existing screenshot tests green (update a screenshot only where a gap is now drawn, and say which in the commit).
  depends-on: T1. parallel-group: B

## Tooltip and table

- [ ] **T4** - story: EMP-3 (AC1). The tooltip's hovered slot comes from the mouse's x position on the x scale, not from Chart.js's nearest drawn point, so an empty slot can be hovered (ARCHITECTURE, Decisions). On an empty slot, the tooltip sits at the top of the plot. In `chart/internal/chart-renderer.ts`'s tooltip `external` handler and the `UauiChartHover` it raises.
  Acceptance: EMP-3 AC1 spec green in `chart/time-series-chart.empty-tooltip.test.ts`. Existing tooltip and hover tests green.
  depends-on: T3

- [ ] **T5** - story: EMP-3 (AC2–AC6), EMP-4 (AC1, AC2). Add `chartNoData: "No data"` to `lang/en.ts` (key `uauiAnalytics_chartNoData`). `#renderTooltip` in `chart/time-series-chart.element.ts` gives every shown series a row; a row whose value is `null` reads the key's text, with no compare change (SPEC R7, R8). `chart/internal/chart-tooltip.element.ts` accepts a row with no value. `chart/internal/chart-data-table.element.ts`'s `#cell` (and `#shareCell` through it) reads the key's text for an empty value, compare cells included (SPEC R9).
  Acceptance: EMP-3 AC2–AC6 and EMP-4 AC1–AC2 specs green in `chart/time-series-chart.empty-tooltip.test.ts`. Localization tests green (no unused or missing key). Existing tooltip and table tests green.
  depends-on: T4

- [ ] **T6** - story: EMP-4 (AC3). A "Empty periods" story in `chart/time-series-chart.story.ts`: a 14-day success rate chart with `range`, four empty days and a lone value, plus a compare series, matching `docs/plans/empty-periods/mockups/empty-periods-chart.png`. Axe in light and dark mode.
  Acceptance: EMP-4 AC3 spec green in `chart/time-series-chart.empty-tooltip.test.ts`. The story renders in Storybook in light and dark mode and matches the mockup.
  depends-on: T3, T5

## Shipping

- [ ] **T7** - story: EMP-6 (AC1–AC3). No example data changes (SPEC R13). Add the CHANGELOG line under `## [Unreleased]`, `### Changed` (SPEC R10).
  Acceptance: EMP-6 specs green in `examples/pages/commerce/commerce-analytics-page.empty-days.test.ts`. `npm run check:api` shows no change. `npm run lint`, `npm test`, `npm run build` and `npm run check:size` pass.
  depends-on: T1. parallel-group: B
