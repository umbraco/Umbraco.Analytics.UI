# Plan: KPI tile second line

7 tasks in 3 areas. Paths are under `src/Umbraco.Analytics.UI/Client/`. Pending specs: `src/kpi-tile/kpi-tile.detail.test.ts` (KTD-1 to KTD-6) and `src/internal/figure/figure-detail.test.ts`.

## Core

- [x] **T1** - story: KTD-2 (groundwork for AC1–AC5). `UauiFigureFormatter.figure()` in `src/internal/format/figure.ts` takes an optional `{ compact?: boolean }`: `compact: true` shows the number short at any size (same 3 significant digits, `exact` set), unless `valueFormat` sets `notation`. Without it, today's 1,000,000 rule is unchanged (ARCHITECTURE, Decisions: the formatter decides "short like the value"). Keep it internal.
  Acceptance: new cases in `src/internal/format/figure.test.ts` (create it if missing): 412000 with `compact: true` gives `{ text: "412K", exact: "412,000" }`; with `notation: "standard"` it stays "412,000"; existing tile and stat compact tests still green.
  depends-on: none. parallel-group: A

- [ ] **T2** - story: KTD-1 (AC1, AC5, AC7, AC9–AC12), KTD-4 (AC6). New internal element `uaui-figure-detail` in `src/internal/figure/figure-detail.element.ts` (ARCHITECTURE, Decisions). Properties only: `pattern?: string`, `figure?: UauiFigureText`. Splits `pattern` at every `{0}` and renders the text parts as text with a `uaui-figure-value` in each gap. No `{0}`: renders the pattern as given. A `{0}` with no `figure`, or an empty pattern: renders nothing. Styles: 13px, weight 400, `--uui-color-text-alt`, `tabular-nums`, one line cut with "…" and a `title` of the full shown text (SPEC R0, R6, R7, R16, R17). Not exported from `src/index.ts`.
  Acceptance: `src/internal/figure/figure-detail.test.ts` green, with an axe check.
  depends-on: none. parallel-group: A

## Tile

- [ ] **T3** - story: KTD-1 (AC1–AC8), KTD-2 (AC1–AC5), KTD-3 (AC1–AC5), KTD-5 (AC1–AC3), KTD-6 (AC3). `uaui-kpi-tile` gains `detail` (attr `detail`), `detailValue` (attr `detail-value`, `type: Number`) and `detailFormat` (attr `detail-format`, `type: Object`), with JSDoc in the class comment's style (SPEC, Element). Renders `uaui-figure-detail` after the value, before the badge in the DOM, with the figure from `#formatter`-style formatting of `detailValue` in `detailFormat ?? valueFormat`, `compact: true` when the value's figure has an `exact` (shown short) and the line's format sets no `notation` (R2–R5). Hidden on `error`, `no-data`, no `detail` (R8–R10). Keep a separate `UauiFigureFormatter` instance for the line so the two caches don't thrash. Layout stays the existing flex row for now.
  Acceptance: KTD-1, KTD-2, KTD-3 AC1–AC5, KTD-5 and KTD-6 AC3 specs green in `src/kpi-tile/kpi-tile.detail.test.ts`. Existing kpi-tile tests green.
  depends-on: T1, T2

- [ ] **T4** - story: KTD-4 (AC1–AC7), KTD-3 (AC6). With a line, the row becomes a grid with areas `"value badge" "detail detail"`, or `"value" "detail" "badge"` when wrapped (mockup). A `ResizeObserver` on the row, value and badge sets the wrapped state when value width + column gap + badge width exceeds the row's width (ARCHITECTURE, Decisions: measure the real layout). It re-checks after each render that changes the value, badge or line, and disconnects in `disconnectedCallback`. Only tiles with a line and a badge are observed; tiles without a line keep today's flex row (R12, R15).
  Acceptance: KTD-4 and KTD-3 AC6 specs green. `kpi-tile.narrow.test.ts` green unchanged.
  depends-on: T3

- [ ] **T5** - story: KTD-6 (AC1, AC2). When `detail` is set, the skeleton's `--_uaui-skeleton-height` (wide and inside the `< 240px` container query) grows to a loaded tile with its line, measured from the T4 layout: on narrow tiles that's the wrapped layout with the badge (R13). Without `detail`, today's 48px and 76px stay.
  Acceptance: KTD-6 AC1 and AC2 specs green.
  depends-on: T4

## Shipping

- [ ] **T6** - **wire: the line into Storybook and the public API.** story: KTD-5 (AC3). `kpi-tile.story.ts` gets a story per state: with a line, plain note, short number matching the value, badge wrapped below the line, long line cut, loading with a line, error. Update the element's docs page if it lists properties. Run `npm run check:api` and commit the `api/analytics-ui.api.md` change. Add one `### Added` line to `CHANGELOG.md` under `## [Unreleased]`: `uaui-kpi-tile`: `detail`, `detail-value` and `detail-format` show a short line under the value, such as "114.3K cached".
  Acceptance: Storybook builds and each new story renders as the mockup, checked by eye in light and dark. Story axe checks pass. `npm run lint`, `npm test`, `npm run build` pass.
  depends-on: T5

- [ ] **T7** - **wire: cached input tokens into the AI usage example.** story: KTD-1 (AC1). In `src/examples/pages/ai/ai-usage-page.element.ts`, the Input tokens tile sets `detail` "{0} cached" (through an example-local string, as the page's other labels are) and `detailValue` from `summary.cachedInputTokens`.
  Acceptance: the AI example page in Storybook shows "… cached" under Input tokens, short like the value, and hides it on error and no data.
  depends-on: T5. parallel-group: B (with T6)
