# Brief: Empty periods in the time series chart

A product can't show a period that has no value, such as a day with no requests on a success rate chart. Sending 0 says "every request failed", and leaving the point out shrinks the chart to the days that have points and draws the line straight across the gap. Product developers building rate and average charts have this problem, and so do the editors reading those charts. Tracked in [#42](https://github.com/umbraco/Umbraco.Analytics.UI/issues/42).

## Why now
- Rates and averages (success rate, average duration) are the charts products are building now, and 0 misleads editors on every quiet day.
- Nothing is released yet, so the behaviour can still change freely.

## Done when
- A product passes `range` and leaves out a period with no value, and the x-axis still shows every period of `range`.
- A 7-day range with points on only 2 days shows 7 days on the x-axis.
- A point outside `range` still shows: the x-axis is every period of `range` plus any other date a point has.
- A line breaks at an empty period, with nothing drawn there. The compare line breaks the same way.
- An area's fill and a bar leave the empty period blank too.
- The tooltip and the hidden table say a short "No data" for the period, instead of showing 0 or a blank.
- A marker on an empty period shows. Today markers in gaps are dropped.
- Day, week, month and hour grouping all work, including days when the clocks change (23 or 25 hours).
- The "now" and unfinished-period marks and the compare line still land on the right period.
- The Commerce example's rate chart, over a range that starts before the store opened, shows every day, with nothing drawn before the opening day.
- Light and dark mode both work, and the axe check passes.
- `CHANGELOG.md` has a line saying the chart fills its x-axis from `range`.

## Must work with
- Umbraco CMS 19 (package major 19).
- One version shared by every product on a site, so a changed behaviour reaches every chart.
- A chart with no `range` works as it does today: the x-axis is the dates of the points.
- Counts still come from the product: it sends 0 where 0 is the right answer.
- No new public names. The `range` property and `uauiBucketsFor` helper already exist.

## Unknowns
- Whether the periods `uauiBucketsFor` returns at hour level match the chart's own hour keys on a clock-change day.
- Whether a long range at hour level makes too many slots to draw quickly.

## Not doing
- **A `null` value on a point.** Leaving the point out already means "no value". Adding `null` later doesn't break anything, so it waits until a product needs it.
- **Filling with 0.** The chart can't tell a count from a rate, so the product decides.
- **Reusing the KPI tile's "No data for this period" text.** It reads long in a tooltip row, so the chart gets its own short key.
