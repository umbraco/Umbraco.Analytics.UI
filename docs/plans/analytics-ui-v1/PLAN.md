# Plan: Analytics UI v1

**24 tasks in 6 areas.** Every task follows `CLAUDE.md`: UUI-style folder per element (`<name>.element.ts`, `.story.ts`, `.test.ts`, `index.ts`), `UmbLitElement`, Lit from `@umbraco-cms/backoffice/external/lit`, exported from `src/index.ts`, `api/ui.api.md` updated on purpose. Paths below are under `src/Umbraco.Analytics.UI/Client/`.

> [!IMPORTANT]
> **1 guess needs your OK.**
> T21's acceptance needs a running CMS 19 site. The repo has no test site, so it assumes a local site that references `Umbraco.Analytics.UI.csproj` (for example the Commerce v19 test site). Say if you'd rather add a small test site to this repo.

## Foundation

- [x] **T1** - story: FND-1 (AC1–AC3). Add `src/theme/tokens.css.ts` exporting a Lit `css` block that sets `--uax-series-1`…`--uax-series-4` and `--uax-compare` from the UUI palette (ARCHITECTURE.md decision 6), plus `--uax-tint-positive`, `--uax-tint-negative` and `--uax-tint-neutral` via `color-mix()` on `--uui-color-positive`, `--uui-color-danger` and `--uui-color-divider`. Every element adds it to its `styles`. Export from `src/theme/index.ts`.
  Acceptance: FND-1 specs green. A Storybook "Theme" story shows the swatches in light, dark and high-contrast.
  depends-on: none. parallel-group: A

- [x] **T2** - story: FND-2 (AC1, AC3). Add `src/lang/en.ts` with every built-in string under `uaxAnalytics_*` (UmbLocalizationDictionary shape). Make `vite.config.ts` a multi-entry build emitting `lang/en.js` beside `umbraco-analytics-ui.js`. Register the translations in `.storybook/preview.ts` and in a test helper, `src/internal/test/localization.ts`, so stories and tests render text, not keys.
  Acceptance: FND-2 AC1 and AC3 specs green. `npm run build` emits `../wwwroot/lang/en.js`.
  depends-on: none. parallel-group: A

- [x] **T3** - story: BDG-1 (AC1–AC6). Move `uax-delta-badge` to `UmbLitElement` and format with `this.localize.number`. Restyle as the tinted pill (13px bold, `4px 8px`, radius from `--uui-border-radius-*`) using T1's tints. Add `size: "md" | "sm"`. Update its stories and tests.
  Acceptance: BDG-1 specs green, existing badge tests still green, axe clean in light and dark.
  depends-on: T1, T2. parallel-group: B

- [x] **T4** - story: FND-3 (AC1, AC2). Add `uax-empty-state` in `src/empty-state/` (`headline`, `description`, `icon`), defaulting to the "No data yet" / "Try a wider date range." translations. Remove the now-unused `layout/` and `states/` placeholder folders and their exports from `src/index.ts`.
  Acceptance: FND-3 AC1 and AC2 specs green. FND-2 AC1 in `src/lang/localization.test.ts` retargeted from the test-only element to `uax-empty-state`.
  depends-on: T2. parallel-group: B

- [x] **T5** - story: FND-3 (AC3–AC6). Add internal loading parts in `src/internal/loading/`: a skeleton block sized by its host, and a thin top-edge loading bar. They're not exported. A test host element in `src/internal/loading/loading.test.ts` exercises first-load and reload behaviour, which T9 and T15 then reuse.
  Acceptance: FND-3 AC3–AC6 specs green against the test host.
  depends-on: T1, T2. parallel-group: B

## Small elements

- [x] **T6** - story: KPI-1 (AC1–AC7). Add `uax-kpi-tile`: `label`, `value` (string, shown as given), `icon`, `delta`, `delta-unit`, `lower-is-better`. Card style with the icon in a `--uax-series-2` square, using `uax-delta-badge`. It has a `loading` property using T5's skeleton. Equal heights come from the host being `display: block; height: 100%` inside a grid row.
  Acceptance: KPI-1 specs green. "Row of tiles" story matches `docs/design/phase-1/screenshots/kpi-size.png` apart from rounded corners.
  depends-on: T3, T5. parallel-group: C

- [x] **T7** - story: KPI-2 (AC1–AC4). Add `selectable` and `selected` to `uax-kpi-tile`. When selectable, the tile renders as a `button` with `aria-pressed` and raises `select`.
  Acceptance: KPI-2 specs green, axe clean in both states.
  depends-on: T6

- [x] **T7b** - story: KPI-2 (AC1–AC9). Align `uax-kpi-tile` selection with UUI's `SelectableMixin` (SPEC.md §2 "Selectable"): cancelable `selected`/`deselected` events, the tile sets its own `selected` unless cancelled, `deselectable` (default true), and `uui-card`'s look (2px `--uui-color-selected` border outside the card with glow; 33%/80% on hover; separate focus outline). Keep the toggle button and `aria-pressed`. Replaces T7's `select` event (unreleased alpha, so no deprecation).
  Acceptance: KPI-2 specs green, axe clean in 3 themes × 2 states, `api/ui.api.md` shows `deselectable` and the events in the JSDoc.
  depends-on: T7

- [x] **T8** - story: GRP-1 (AC1–AC4). Add `uax-group-by`: a radio group (`role="radiogroup"`, arrow-key navigation) styled as the design's segmented control. `value` and `options`, raising `change`.
  Acceptance: GRP-1 specs green, axe clean.
  depends-on: T2. parallel-group: C

## Time-series chart

- [x] **T9** - story: CHT-1 (AC1–AC7), FND-3 (AC2–AC6 for the chart). Add `uax-time-series-chart` with the shared types in `src/chart/types.ts` (SPEC.md "Shared types"). Wrap Chart.js in `src/chart/internal/` (register only the controllers and scales used, so the bundle stays small). Kinds `line` and `area` only in this task: smooth lines, y-axis from 0 with about 5 round ticks, x labels by `group-by`, `value-format` through `this.localize.number`. An HTML tooltip (not canvas), so later tasks can put `uax-delta-badge` in it. Legend, visually hidden data table, empty state (T4), and loading (T5). No Chart.js type in the public API (ARCHITECTURE.md decision 4).
  Acceptance: CHT-1 specs green. `api/ui.api.md` has no `chart.js` import. The "Line" and "Area" stories match `an-pin-tip.png` apart from markers.
  depends-on: T1, T2, T3, T4, T5

- [x] **T10** - story: CHT-2 (AC1–AC5). Add `compare-series` and `compare-label` for `line` and `area`: a dashed `--uax-compare` line, the gap filled between the lines, points matched by position, and the tooltip showing compare value and badge.
  Acceptance: CHT-2 specs green. "Compare" story matches `cmp-diff.png`.
  depends-on: T9

- [x] **T11** - story: CHT-3 (AC1–AC4). Add kinds `bar` and `stacked-bar`, with the compare total as a `--uax-compare` bar behind each current bar.
  Acceptance: CHT-3 specs green. "Stacked with compare" story matches `vis-cmp.png`.
  depends-on: T10

- [x] **T12** - story: CHT-4 (AC1–AC5). Add `markers` through a private Chart.js plugin in `src/chart/internal/markers-plugin.ts`, following Engage v18's `annotation-dataset-generator.controller.ts` (ARCHITECTURE.md decision 3). Each dot gets an HTML button overlay, so it's focusable in date order, shows the marker tooltip, and raises `marker-click`.
  Acceptance: CHT-4 specs green, axe clean with markers. "Markers" story matches `an-pin-tip.png`.
  depends-on: T11

## Date range

- [x] **T13** - story: DR-1 (AC1–AC8). Add `uax-date-range` (the button) and `uax-date-range-modal` with its token `UAX_DATE_RANGE_MODAL` in `src/date-range/`. The button opens the modal through `UMB_MODAL_MANAGER_CONTEXT`. The modal has presets (`presets` property, defaulting per SPEC.md), two date fields, inline validation and Save/Close. Dates and the button label are formatted with `this.localize.date`. Tests provide a modal manager context (see `umbraco-backoffice-testing`).
  Acceptance: DR-1 specs green, axe clean on the button and the open modal. FND-2 AC3 in `src/lang/localization.test.ts` retargeted from the test-only element to `uax-date-range`.
  depends-on: T2. parallel-group: D

- [x] **T14** - story: DR-2 (AC1–AC5). Add the Compare switch, compare modes (previous period, previous year, custom), `allow-compare`, the "Compare to:" line on the button, and custom-range validation.
  Acceptance: DR-2 specs green. Button story matches the date box in `cmp-diff.png`.
  depends-on: T13

## Data table

- [x] **T15** - story: TBL-1 (AC1–AC4, AC6, AC7), FND-3 (AC2–AC6 for the table). Add `uax-data-table` built on `uui-table`. Column types `text`, `link`, `number`, `percent` and `share` (value, percent of column total, bar scaled to the column max; first share column `--uax-series-1`, second `--uax-series-2`). `value-format` per column, `toolbar` slot, empty state (T4), loading (T5). No sorting or paging yet.
  Acceptance: TBL-1 AC1–AC4, AC6 and AC7 specs green. "Share columns" story matches `an-table.png`.
  depends-on: T1, T2, T4, T5. parallel-group: D

- [ ] **T16** - story: TBL-1 (AC5). Add `compare-rows` matched by `row-key`, with a `size="sm"` `uax-delta-badge` after each share value.
  Acceptance: TBL-1 AC5 spec green.
  depends-on: T3, T15

- [ ] **T17** - story: TBL-2 (AC1–AC4). Add sortable headers, the `sort` property, `sort-change`, and `mode` (`client` sorts itself, `server` doesn't).
  Acceptance: TBL-2 specs green, headers keyboard-operable.
  depends-on: T16

- [ ] **T18** - story: TBL-3 (AC1–AC5). Add an optional `totals` input (column key → total, the share denominator, not a displayed total) so share percentages use the full total in server mode (DECISION-LOG), and decide how share bars scale in server mode (e.g. an optional per-column max, or scale to the total). Add the paging footer ("Show rows" 10/25/50/100, "1–10 of 272", previous and next), `page`, `page-size`, `total`, `page-change`. Client mode pages itself. The footer is hidden on one page.
  Acceptance: TBL-3 specs green.
  depends-on: T17

- [ ] **T19** - story: TBL-4 (AC1–AC3). Add `uax-table-search` (300ms debounce, raises `search`). Client mode filters rows on `text` and `link` columns and shows the empty state when nothing matches.
  Acceptance: TBL-4 specs green.
  depends-on: T18

- [ ] **T20** - story: TBL-5 (AC1–AC3). Make rows clickable and focusable only when a `row-click` listener is attached. Click or Enter raises `row-click` with the row.
  Acceptance: TBL-5 specs green, axe clean in both modes.
  depends-on: T19

## Integration

- [ ] **T21** - **wire: localization and date range modal into `umbraco-package.json`.** story: INT-1 (AC1–AC4). Add a `localization` extension (`culture: "en"`, `weight: 200`, `js: /App_Plugins/Umbraco.Analytics.UI/lang/en.js`) and a `modal` extension (alias `Uax.Modal.DateRange`, `elementName: "uax-date-range-modal"`) to `public/umbraco-package.json`.
  Acceptance (real backoffice, not unit tests):
  - On a CMS 19 site referencing `Umbraco.Analytics.UI.csproj`, `@umbraco-analytics/ui` resolves in the browser.
  - `uaxAnalytics_emptyHeadline` translates.
  - A test page using `uax-date-range` opens the modal.
  - `dotnet pack` output's `umbraco-package.json` version equals the package version.
  - A spec reads the shipped manifest's localization weight and checks it equals `UAX_LOCALIZATION_WEIGHT` (200), so the two can't drift.
  depends-on: T2, T13

## Docs and checks

- [ ] **T22** - story: none (SPEC.md §1, pane recipe). Add a "Pane" story in `src/internal/stories/pane.story.ts`: a `uui-box` with icon headline, `uax-group-by` and `uax-date-range` in `header-actions`, a chart, then an edge-to-edge table with no divider between them.
  Acceptance: story matches the layout of `cmp-diff.png` with rounded corners, axe clean.
  depends-on: T8, T12, T14, T20

- [ ] **T23** - story: none (non-functional targets). Measure and record in `BUILD-LOG.md`:
  - the bundle size, gzipped
  - chart render time for 6 series × 366 points
  - table client-mode sort and page time for 1,000 rows
  - contrast in light, dark and high-contrast
  Fix anything over the SPEC.md targets, or raise it if a target needs changing.
  Acceptance: every SPEC.md non-functional target met or explicitly changed.
  depends-on: T12, T20

- [ ] **T24** - story: none (docs). Update the repo `README.md` and `Client/README.md` with the element list and a short usage example per element, linking to Storybook.
  Acceptance: every exported element appears in both READMEs.
  depends-on: T21, T22
