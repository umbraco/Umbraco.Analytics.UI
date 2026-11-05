# Plan: Hourly buckets

**12 tasks in 4 areas.** 57 pending specs are in place for every story, in the files each task's Acceptance names. Shared chart set-up is in `chart/internal/hourly-fixtures.ts`. Specs that call a helper that doesn't exist yet read it from the module namespace; the task that builds it swaps in a plain import. The chart tasks (T5 to T9) run one after another, because they all change `uaui-time-series-chart`.

Paths are under `src/Umbraco.Analytics.UI/Client/src/`. The time zone in tests is pinned to `Europe/Copenhagen` (SPEC, Targets).

## Foundation

- [x] **T1** - story: HRS-1 (internal groundwork for AC1–AC3, AC6, AC7). Add `internal/date/hour-math.ts` (ARCHITECTURE, Decisions): parse a point's date as a moment (`Z`, offset, no offset = local, plain date = local midnight), the UTC instant of the local hour that contains it, the next hour's instant, the elapsed-hour offset, and the wall-clock offset (day × 24 + local hour) from a local date. `BucketUnit` in `internal/date/date-math.ts` gains `"hour"`, and `bucketStart`, `bucketEnd` and `bucketOffset` route `"hour"` to `hour-math.ts`. `date-math.ts` itself stays time-zone free. Pin the test browser's time zone and locale in `vite.config.ts` (`playwright({ contextOptions: { timezoneId: "Europe/Copenhagen", locale: "en-US" } })`).
  Acceptance: new `internal/date/hour-math.test.ts` green, covering 2026-11-05, 2026-03-29 (23 hours) and 2026-10-25 (25 hours). Existing `date-math.test.ts` still green.
  depends-on: none. parallel-group: A

- [x] **T2** - story: HRS-1 (AC1–AC7). Rename `uauiDateBuckets` to `uauiTimeBuckets` and `UauiDateBucket` to `UauiTimeBucket` in `date-helpers/date-helpers.ts`, with no deprecated alias (nothing is released). Every bucket gains `end` (R21). With `"hour"`, buckets run from the range's first local midnight to the midnight after its last day, `start`/`end` as UTC instants and `days` the one local date (R20). Update `src/index.ts` exports, every caller in `examples/pages/`, and the README.
  Acceptance: HRS-1 specs green in `date-helpers/date-helpers.hourly.test.ts`. Existing `date-helpers.test.ts` green after the rename. `npm run check:api` shows the rename and `end`.
  depends-on: T1

## Controls

- [x] **T3** - story: HRS-8 (AC1–AC7). Add `"today"` and `"yesterday"` to the built-in table and `UauiBuiltInPresetId` in `internal/date/date-math.ts` (not to `defaultPresets`). Add `dateRangeToday` "Today" and `dateRangeYesterday` "Yesterday" to `lang/en.ts`, and map them in the dialog's `presetTerms`. Update the `UauiDatePreset` and `uauiPresetRange` docs.
  Acceptance: HRS-8 specs green in `date-range/date-range.presets-today.test.ts`. Localization tests green.
  depends-on: T1 (both change `date-math.ts`)

- [x] **T4** - story: HRS-9 (AC1–AC3). `uauiFormatDateRange` returns the one date when `from` equals `to` (R30). The date range button uses it, so it follows.
  Acceptance: HRS-9 specs green in `date-range/date-range.one-day.test.ts`. Existing date range tests green.
  depends-on: none. parallel-group: A

## Time series chart

- [x] **T5** - story: HRS-4 (AC9). Rename the chart's `today` to `now` (attribute `now`), with no behaviour change yet: `chart/internal/today-plugin.ts` becomes `now-plugin.ts`, `TODAY_LABEL_ROOM` becomes `NOW_LABEL_ROOM`, and every story, test and example (`engage`, `workflow`) moves to `now`. `today` is removed, not deprecated.
  Acceptance: HRS-4 AC9 spec green in `chart/time-series-chart.now.test.ts`. Every existing chart test green with `now` in place of `today`. `npm run check:api` shows `today` out and `now` in.
  depends-on: none. parallel-group: A

- [x] **T6** - story: HRS-2 (AC1–AC8), HRS-6 (AC4, AC5). `UauiGroupBy` in `group-by/group-by.element.ts` gains `"hour"` (only the type here; the label is T10). In `chart/internal/chart-data.ts`, normalise each point's date per unit: cut to the day for day, week and month (unchanged, R6), the local hour's UTC instant for hour (R1, R2). Add hour entries to the chart's axis and tooltip formats (`{ year, month: "short", day, hour: "numeric" }` for tooltip and table), formatted through a new `format-date.ts` helper in local time (R26). Update `UauiPoint.date` and `UauiMarker.date` docs in `chart/types.ts`. Add a "By hour" story.
  Acceptance: HRS-2 specs green in `chart/time-series-chart.hourly.test.ts`, and HRS-6 AC4–AC5 in `chart/time-series-chart.hour-labels.test.ts`. Existing chart tests green. axe clean at hour level.
  depends-on: T1, T5

- [x] **T7** - story: HRS-3 (AC1–AC4). At hour level, compare points line up by wall-clock offset from the start of each range (R7), the repeated hour's compare points add up (R8), and each keeps its own date for the tooltip (R9). Day, week and month keep their current alignment.
  Acceptance: HRS-3 specs green in `chart/time-series-chart.hourly-compare.test.ts`. Existing compare tests green.
  depends-on: T6. parallel-group: B

- [x] **T8** - story: HRS-4 (AC1–AC8), HRS-5 (AC1–AC3). `now` and `incomplete-from` are read as moments at every unit (R11): `marker-buckets.ts` and `incomplete-index.ts` find the hour bucket at hour level. The line's label is `chartNow` "Now" at hour level, `chartToday` otherwise (R13). Tooltip and hidden table use `chartNowDate` "{0} (now)" and `chartNowIncompleteDate` "{0} (now, incomplete)" at hour level (R14). Add the three keys to `lang/en.ts`. Add a "Today by hour, so far" story.
  Acceptance: HRS-4 AC1–AC8 green in `chart/time-series-chart.now.test.ts`, HRS-5 in `chart/time-series-chart.incomplete-hours.test.ts`. `time-series-chart.incomplete.test.ts` and `time-series-chart.isolation.test.ts` green.
  depends-on: T7

- [x] **T9** - story: HRS-6 (AC1–AC3, AC6, AC7). Hour-level x-axis ticks in `chart/internal/chart-renderer.ts`: one label every 3 hours on up to 24 dates, every 6 above that, and each day's first hour shows `{ weekday: "short", month: "short", day: "numeric" }` in bold (R28). On the day clocks go back, the tooltip for the two repeated hours adds `timeZoneName: "short"` (R29). Ticks are set per chart, no `Chart.defaults` change.
  Acceptance: HRS-6 AC1–AC3, AC6, AC7 specs green in `chart/time-series-chart.hour-labels.test.ts`. A screenshot test of the one-day and two-day stories.
  depends-on: T8

- [ ] **T10** - story: HRS-7 (AC1–AC6). `uaui-group-by` gets the "Hour" label (`groupByHour`); its default `options` stay day, week and month (R17). Add `uauiGroupByOptions(range)` to `date-helpers/date-helpers.ts` (R18), exported from `src/index.ts`. Add a "With hour" story.
  Acceptance: HRS-7 specs green in `group-by/group-by.hour.test.ts`. axe clean.
  depends-on: T6. parallel-group: B

## Shipping

- [ ] **T11** - **wire: hourly view into the AI usage example.** story: HRS-10 (AC1, AC2). `examples/pages/ai/`: add the `today` and `yesterday` presets, pass `uauiGroupByOptions(range)` to the group-by, switch to the first option when the range changes (R19), make hourly fake data with `uauiTimeBuckets`, and set `now` and `incomplete-from` from the clock.
  Acceptance: HRS-10 specs green in `examples/pages/ai/ai-usage-page.test.ts`. In Storybook, the AI usage page shows Today by hour with the now line and hatching, matching `mockups/hourly-chart.png`.
  depends-on: T2, T3, T4, T7, T8, T9, T10

- [ ] **T12** - story: all. Docs and API: README sections for hourly charts, `now`, `uauiTimeBuckets`, `uauiGroupByOptions` and the two presets. Commit the `api/analytics-ui.api.md` change for sign-off. `npm run lint`, `npm test`, `npm run build`, `npm run check:size`.
  Acceptance: all four commands pass. The API report diff lists only the changes in ARCHITECTURE's "Public API" line.
  depends-on: T11
