# Stories: Empty periods in the time series chart

**6 stories, 31 criteria.** Story ids are used by `PLAN.md` and the spec files, so never renumber them.

Every criterion runs with the browser's time zone pinned to `Europe/Copenhagen` and the backoffice culture `en-US`, as the chart tests already do.

**Time series chart**

- [EMP-1](#emp-1-every-period-gets-a-slot) Every period gets a slot, 8 criteria
- [EMP-2](#emp-2-lines-break-at-empty-periods) Lines break at empty periods, 5 criteria
- [EMP-3](#emp-3-the-tooltip-says-no-data) The tooltip says no data, 6 criteria
- [EMP-4](#emp-4-the-hidden-table-says-no-data) The hidden table says no data, 3 criteria
- [EMP-5](#emp-5-marks-on-empty-periods) Marks on empty periods, 6 criteria

**Shipping**

- [EMP-6](#emp-6-commerce-example-shows-empty-days) Commerce example shows empty days, 3 criteria

<details>
<summary>Ready and Done</summary>

**Ready:** the role, capability and value are all stated. Given/When/Then criteria cover the happy path. Out of scope is explicit. It passes INVEST.

**Done:**
- Every criterion passes as an executable spec, sad paths included.
- The chart has a Storybook story with empty periods, and it passes axe in light and dark.
- `api/analytics-ui.api.md` is unchanged (`npm run check:api`), and `time-series-chart.isolation.test.ts` is green.
- `CHANGELOG.md` has the `### Changed` line from SPEC R10.
- `npm run lint`, `npm test` and `npm run build` pass, and `npm run check:size` stays under its limit.

</details>

---

## EMP-1: Every period gets a slot

As a product developer,
I want the chart to show every period of the range, even ones I send no point for,
so that a rate chart keeps its full time axis on quiet days.

```
AC1 — Every day of the range
  Given the range 2026-10-24 to 2026-10-30, group-by "day", and points on 2026-10-25 and 2026-10-28 only
  When  the chart draws
  Then  the x-axis has 7 slots, 2026-10-24 to 2026-10-30

AC2 — Every week of the range
  Given the range 2026-10-01 to 2026-10-31, group-by "week", week-start 1, and one point on 2026-10-12
  When  the chart draws
  Then  the slots are 2026-09-28, 2026-10-05, 2026-10-12, 2026-10-19 and 2026-10-26

AC3 — Every month of the range
  Given the range 2026-01-15 to 2026-04-10, group-by "month", and one point on 2026-02-01
  When  the chart draws
  Then  the slots are 2026-01-01, 2026-02-01, 2026-03-01 and 2026-04-01

AC4 — Every hour of the range
  Given the range 2026-11-05 to 2026-11-05, group-by "hour", and points at 09:00 and 14:00 local time
  When  the chart draws
  Then  the x-axis has 24 slots

AC5 — No range keeps today's axis
  Given no range, group-by "day", and points on 2026-10-25 and 2026-10-28
  When  the chart draws
  Then  the x-axis has 2 slots, 2026-10-25 and 2026-10-28

Sad path

AC6 — A point outside the range keeps its slot
  Given the range 2026-10-24 to 2026-10-26 and points on 2026-10-25 and 2026-10-29
  When  the chart draws
  Then  the slots are 2026-10-24, 2026-10-25, 2026-10-26 and 2026-10-29

AC7 — The day clocks go forward
  Given the range 2026-03-29 to 2026-03-29, group-by "hour", and one point at 12:00 local time
  When  the chart draws
  Then  the x-axis has 23 slots

AC8 — The day clocks go back
  Given the range 2026-10-25 to 2026-10-25, group-by "hour", and one point at 12:00 local time
  When  the chart draws
  Then  the x-axis has 25 slots
```

Out of scope: points are not moved to their bucket's start (ARCHITECTURE, Decisions). An invalid range adds no slots, as `uauiBucketsFor` returns none.

## EMP-2: Lines break at empty periods

As an editor,
I want a line to stop where a period has no value,
so that I don't read a trend across days that had no data.

```
AC1 — A series line breaks
  Given a line series with values on 2026-10-24 and 2026-10-26 and none on 2026-10-25
  When  the chart draws
  Then  the series' line does not join 2026-10-24 to 2026-10-26

AC2 — A compare line breaks
  Given a line series with a compare series that has no point in the slot of 2026-10-25
  When  the chart draws
  Then  the compare line does not join across that slot

AC3 — An area leaves the period unfilled
  Given kind "area" and a series with no value on 2026-10-25
  When  the chart draws
  Then  nothing is filled in the slot of 2026-10-25

AC4 — A lone value shows as a dot
  Given a 60-day range (dots off) and a series with a value on one day whose neighbours both have none
  When  the chart draws
  Then  that value is drawn as a dot

Sad path

AC5 — A value with a neighbour stays dotless
  Given a 60-day range (dots off) and a series with values on two days next to each other
  When  the chart draws
  Then  neither value is drawn as a dot
```

## EMP-3: The tooltip says no data

As an editor,
I want hovering a period with no value to say so,
so that I can tell "no data" apart from 0.

```
AC1 — An empty period can be hovered
  Given a chart whose slot 2026-10-26 has no value in any series
  When  I hover the slot of 2026-10-26
  Then  the tooltip shows with the heading "Oct 26, 2026"

AC2 — An empty series reads "No data"
  Given a chart whose series "Success rate" has no value on 2026-10-26
  When  I hover the slot of 2026-10-26
  Then  the "Success rate" row reads "No data"

AC3 — The compare value still shows
  Given a series with no value on 2026-10-26 and a compare value of 95.2 in that slot
  When  I hover the slot of 2026-10-26
  Then  the tooltip shows the compare value 95.2

AC4 — Each series gets a row
  Given two series, "Succeeded" with a value of 40 and "Failed" with none, on 2026-10-26
  When  I hover the slot of 2026-10-26
  Then  the tooltip has a "Succeeded" row reading 40 and a "Failed" row reading "No data"

Sad path

AC5 — No change badge on "No data"
  Given a series with no value on 2026-10-26 and a compare value in that slot
  When  I hover the slot of 2026-10-26
  Then  the series row has no change badge

AC6 — No total for an empty period
  Given kind "bar" with two series and neither has a value on 2026-10-26
  When  I hover the slot of 2026-10-26
  Then  the tooltip has no total row
```

## EMP-4: The hidden table says no data

As an editor using a screen reader,
I want the chart's table to say when a period has no data,
so that I don't hear a blank cell and guess.

```
AC1 — An empty value cell
  Given a series with no value on 2026-10-26
  When  the hidden table renders
  Then  that series' cell for 2026-10-26 reads "No data"

AC2 — An empty compare cell
  Given a compare series with no point in the slot of 2026-10-26
  When  the hidden table renders
  Then  the compare cell for 2026-10-26 reads "No data"

Sad path

AC3 — Accessible in both themes
  Given a chart with empty periods
  When  axe runs in light and in dark mode
  Then  it has no violations
```

## EMP-5: Marks on empty periods

As an editor,
I want events, "now" and compare values to show on days that had no data,
so that a quiet day still tells me what happened on it.

```
AC1 — A marker on an empty day
  Given the range 2026-10-24 to 2026-10-30, no point on 2026-10-26, and a marker on 2026-10-26
  When  the chart draws
  Then  the marker shows in the slot of 2026-10-26

AC2 — "Now" on an empty day
  Given the range 2026-10-24 to 2026-10-30, now 2026-10-30T10:00, and no point on 2026-10-30
  When  the chart draws
  Then  the now line is in the slot of 2026-10-30

AC3 — Unfinished from an empty day
  Given the range 2026-10-24 to 2026-10-30, incomplete-from 2026-10-29, and no point on 2026-10-29
  When  the chart draws
  Then  the unfinished part starts at the slot of 2026-10-29

AC4 — A compare point on an empty day
  Given the range 2026-10-24 to 2026-10-30 compared with 2026-10-17 to 2026-10-23, no current point on 2026-10-26, and a compare point on 2026-10-19
  When  the chart draws
  Then  the compare value sits in the slot of 2026-10-26

Sad path

AC5 — A marker outside every slot
  Given the range 2026-10-24 to 2026-10-30 and a marker on 2026-11-02
  When  the chart draws
  Then  no marker is shown

AC6 — A compare point past the range
  Given the range 2026-10-24 to 2026-10-30 compared with 2026-10-17 to 2026-10-23, and a compare point on 2026-10-25
  When  the chart draws
  Then  that compare point is not drawn
```

## EMP-6: Commerce example shows empty days

As a product developer copying the Commerce example,
I want its rate chart to show the days before the store opened as empty,
so that I can see the pattern working: leave a rate out, send 0 for a count.

```
AC1 — Every day of the range
  Given the Commerce page with the range 2025-12-25 to 2026-01-07 and the metric "Cart conversion"
  When  the chart draws
  Then  the x-axis has 14 slots

AC2 — Nothing before the store opened
  Given the Commerce page with the range 2025-12-25 to 2026-01-07 and the metric "Cart conversion"
  When  the chart draws
  Then  the series has no value in the slots 2025-12-25 to 2025-12-31

Sad path

AC3 — Counts still show 0
  Given the Commerce page with the range 2025-12-25 to 2026-01-07 and the metric "Orders"
  When  the chart draws
  Then  the series' value in the slot 2025-12-25 is 0
```
