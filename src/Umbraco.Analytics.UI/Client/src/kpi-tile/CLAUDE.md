# KPI tile

Rules for `src/kpi-tile/` that the code alone doesn't explain.

- The second line is a number plus a pattern with `{0}` ("{0} cached"), not a formatter function, so formatting stays in the tile and it works as an attribute. The tile fills `{0}` itself: Umbraco's `localize.term()` with no arguments returns a string term unchanged.
- The line's number is formatted like the value unless it has its own format, and goes short whenever the value is shown short. The 1,000,000 auto-short threshold is deliberate: lowering it would change every dashboard.
- A pattern without `{0}` is a plain note. The line hides on error, on no data and when the tile has no value. Room for it is reserved whenever `detail` is set, so the tile doesn't jump between loading and error.
- When the value, badge and line don't fit, the badge goes below the line, so the value and its line always sit together.
