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
- **06-11-2026** (T1) `compact: false` is the same as leaving the option out; only `true` forces short.
- **06-11-2026** (T2) Text styles sit on the element's host; the clipping and `title` sit on an inner span, as `uaui-table-secondary-line` does. The title is the shown text ("114K cached"), not the exact amount, which the number keeps as its own hover title.
- **06-11-2026** (T2) Open for the user: the line's `title` may reach screen readers as a description, repeating "114K cached" after the exact "114,300 cached". axe passes; worth a VoiceOver check at T6.
- **06-11-2026** (T3) Orchestrator call, open for the user: a tile with no value shows no line (new rule R18), since a part of nothing reads wrong. KTD-1 AC6 now sets a value.
- **06-11-2026** (T3) Whether a line exists is decided in one place, `hasFigureDetail` in `figure-detail.element.ts`, used by the tile and the element, so an empty line never takes up room.
- **06-11-2026** (T4) Open for the user: KTD-4's "doesn't fit" cases use a 180px cell, not 200px. With Lato, 134.8K and a +18.7% badge fit a 200px tile by 0.4px, so 200px was a brittle threshold. 180px is the tile's smallest width. The "tops level" check allows 1.5px, since the badge is centred on the value as in the mockup.
- **06-11-2026** (T4) The tile measures on the next animation frame after a resize, so during a live resize one frame paints in the old layout.
