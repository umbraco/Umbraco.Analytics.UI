# Architecture: KPI tile second line

`uaui-kpi-tile` gets three properties. A small internal element draws the line: it splits the pattern at `{0}` and puts the formatted number in its place, using the same formatter and figure element the value uses.

## Decisions
- **The names are `detail`, `detail-value` and `detail-format`**, after UUI's `detail` on `uui-ref-node` and `uui-card-media`.
- **A new internal element, `uaui-figure-detail`, draws the line**, in `src/internal/figure/`, not inline in the tile, so `uaui-stat` can use it later.
- **Products pass the pattern already translated**, from their own `this.localize.term("…")`. The tile doesn't look up `#key`.
- **A pattern with `{0}`**, not a formatter function. A pattern works as an attribute and keeps formatting in the tile.
- **The tile fills `{0}` itself**, not Umbraco's `localize.string`. `localize.string` only fills placeholders in a `#key` term, never in plain text. Umbraco's `localize.term()` with no arguments returns a string term unchanged, so a product's `"{0} cached"` arrives with `{0}` intact.
- **`detail-value` is a number only**, not number or string like `value`. A product with its own text puts it all in `detail`.
- **The number is drawn by `uaui-figure-value`**, as the value is. So a short number ("114K") has its exact amount on hover and for screen readers, with no new code.
- **The formatter decides "short like the value"**, not the tile. `UauiFigureFormatter` gets a way to format a number short on request, so the rule lives next to the 1,000,000 rule it extends.
- **The tile measures the real layout**, not a width breakpoint or a fixed number. A `ResizeObserver` on the row, value and badge reads their rendered widths and checks value + gap + badge against the row's width: the same test the browser uses to wrap a line. It runs again on resize and whenever the value, badge or font changes. Only tiles with a line are measured.
- **The DOM order is value, line, badge**, and CSS grid places the badge beside the value when it fits. Screen readers then hear the value and its part together.
- **The skeleton reserves the line only when `detail` is set**, so tiles without a line keep their height (brief).

## What changes

**Client**

```text
src/Umbraco.Analytics.UI/Client/
├─ src/internal/format/figure.ts                 # formats a number short on request
├─ src/internal/figure/figure-detail.element.ts  # NEW: the line; splits the pattern at {0}
├─ src/internal/figure/figure-detail.test.ts     # NEW
├─ src/kpi-tile/kpi-tile.element.ts              # detail, detailValue, detailFormat; skeleton height
├─ src/kpi-tile/kpi-tile.detail.test.ts          # NEW: tile with the line, incl. axe
├─ src/kpi-tile/kpi-tile.story.ts                # a story per state of the line
├─ api/analytics-ui.api.md                       # three new properties (needs sign-off)
└─ CHANGELOG.md                                  # one line under Added
```

- **Localization:** no new keys. All text on the line is the product's.

Not touched: `uaui-stat` (follow-up), `uaui-delta-badge` (brief), the 1,000,000 threshold (brief), theme tokens (the line uses `--uui-color-text-alt`, already used by the label).
