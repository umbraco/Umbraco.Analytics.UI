# Charts

Rules for `src/chart/` that the code alone doesn't explain.

- A point left out means "no value". There is no `value: null`; it can be added later without breaking anything, but not taken back. The chart never fills a gap with 0: it can't tell a count from a rate, so products send 0 for counts themselves.
- With `range` set, the x-axis has a slot for every bucket in it. Empty slots stay blank (lines use `spanGaps: false`, a lone value gets a dot), and the tooltip and hidden table say "No data". Hover is picked from the x position, because Chart.js's index mode skips null points.
- Hourly bars live in `uaui-time-series-chart`, not the category chart. Hours are UTC instants inside the chart, so the repeated hour on the day clocks go back stays two hours. Day, week and month cut date-times to the day as written, so a `T00:00:00Z` day point doesn't move for editors west of UTC.
- At hour level, compare lines up by wall-clock hour (2 PM under 2 PM yesterday), not elapsed hours. On the day clocks go back, the compare value goes on the first 2 AM bar only.
- "Hour" is offered only for ranges of 2 days or less (`uauiGroupByOptions(range)`); the chart itself draws hourly for any range. Ranges stay whole days.
- `now` takes a date or a date and time; the chart says "Today" or "Now" from group-by.
- Specs run with the browser pinned to Europe/Copenhagen (`vite.config.ts`), so clock-change specs (29-03-2026, 25-10-2026) run the same everywhere.
