# Brief: Hourly buckets

Charts can only show one bar per day, week or month, so a "Today" view is a single bar. Editors can't see *when* in the day something happened, like a sudden spike in AI token use. Tracked in [#38](https://github.com/umbraco/Umbraco.Analytics.UI/issues/38).

## Why now
- Umbraco AI's usage dashboard is moving onto this library for v19. On v17/v18 it has a "Last 24 hours" view with hourly bars, and it loses that view until this lands.
- Editors use that view to spot a spike (an agent stuck in a loop burning tokens) or check a change made an hour ago.
- Nothing is released yet, so renaming `today` to `now` costs only a find and replace for the team.
- Commerce (orders today) and Engage (visits today) will use it too, so it meets the "two products need it" rule.

## Done when
- A product shows "Today" or "Yesterday" as 24 hourly bars, and any range up to 2 days as hourly bars.
- Hour labels, the "now" line and the incomplete hatching all work at hour level, in the editor's time zone. On a two-day range, labels show the day too.
- The compare period lines up hour for hour.
- The 23-hour and 25-hour days where clocks change draw the right number of bars.
- Products that only use day, week and month see no change, apart from renaming `today` to `now`.
- The AI dashboard can bring back a short-range hourly view.
- Hourly bars, the `today` to `now` rename, and the "Today" and "Yesterday" presets ship together, in one release.

## Must work with
- Umbraco CMS 19 (package major 19).
- Chart.js 4, bundled as it is today.
- One version shared by every product on a site.

## Unknowns
- How hourly points carry the editor's time zone, and what happens when the product's server counts hours in UTC.
- How the group-by control learns the range is short enough to offer "Hour".

## Not doing
- **Minute bars.** An hour is the smallest bar size.
- **A rolling "last 24 hours".** It starts partway through a day, so the date picker's range type would have to change for every product. "Today", "Yesterday" or a two-day range covers the same need.
- **Hourly bars in `uaui-category-chart`.** Its bars have no order in time, so a "now" line or incomplete hatching doesn't fit there.
- **Hourly bars on ranges over 2 days.** Too many bars to read.
- **Keeping `today` as deprecated.** Nothing is released, so it's dropped outright.
- **Renaming the date picker's `today`.** It's a plain date that presets count from, so the name still fits.
