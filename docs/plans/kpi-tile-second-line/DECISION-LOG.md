# Decision log: KPI tile second line

- **06-11-2026** User decision: the second line is a number plus a pattern with a `{0}` placeholder ("{0} cached"), not a formatter function. It matches Umbraco's placeholder style, works as an attribute, and keeps formatting in the tile. A function would hand formatting back to the product.
- **06-11-2026** User decision: the number is formatted like the value by default, with its own format override.
- **06-11-2026** User decision: the line takes the value's format, and shortens whenever the value is shown short (including on its own from 1,000,000 up). The 1,000,000 threshold stays. Rejected: a lower threshold for the line only, or everywhere (every dashboard would change).
- **06-11-2026** User approved the brief's other guesses: KPI tile only (`uaui-stat` a follow-up), a pattern without `{0}` is a plain note, the line hides on error and no data, tiles without the line keep their height.
- **06-11-2026** (design) The tile fills `{0}` itself: Umbraco's `localize.string` only fills placeholders inside `#key` terms, and `localize.term()` with no arguments returns a string term unchanged (checked in the CMS 19 localization controller).
- **06-11-2026** (design) The line's number goes through `uaui-figure-value`, so a short number gets its exact amount for hover and screen readers, as the value does.
- **06-11-2026** User decision (review comment): when the badge wraps, it goes below the line, so the value and the line always sit together.
- **06-11-2026** User decision (review comment, refined): the badge stays beside the value when they fit on one line, with the line under both; only when they don't fit does the badge go below the line. Replaces the earlier entry where the badge always sat beside the value-and-line block.
- **06-11-2026** User approved SPEC.md and ARCHITECTURE.md with their guesses: names `detail`/`detail-value`/`detail-format`, internal `uaui-figure-detail`, product passes the translated pattern, 13px grey line, "…" with hover title, only `{0}` filled.
- **06-11-2026** (plan) Layout measuring (T4) comes after the line renders (T3), so the formatting rules can be tested on a plain row first; the skeleton height (T5) waits for T4 because it is sized from the final layout.
- **06-11-2026** (plan) Added the AI usage example's cached-tokens line (T7) as the real-use check, since its fake data already has `cachedInputTokens`.
