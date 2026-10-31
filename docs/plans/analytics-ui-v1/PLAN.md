# Plan: Analytics UI v1

**24 tasks in 6 areas.** Every task follows `CLAUDE.md`: UUI-style folder per element (`<name>.element.ts`, `.story.ts`, `.test.ts`, `index.ts`), `UmbLitElement`, Lit from `@umbraco-cms/backoffice/external/lit`, exported from `src/index.ts`, `api/ui.api.md` updated on purpose. Paths below are under `src/Umbraco.Analytics.UI/Client/`.

> [!IMPORTANT]
> **1 guess needs your OK.**
> T21's acceptance needs a running CMS 19 site. The repo has no test site, so it assumes a local site that references `Umbraco.Analytics.UI.csproj` (for example the Commerce v19 test site). Say if you'd rather add a small test site to this repo.

## Foundation

- [x] **T1** - story: FND-1 (AC1–AC3). Add `src/theme/tokens.css.ts` exporting a Lit `css` block that sets `--uaui-series-1`…`--uaui-series-4` and `--uaui-compare` from the UUI palette (ARCHITECTURE.md decision 6), plus `--uaui-tint-positive`, `--uaui-tint-negative` and `--uaui-tint-neutral` via `color-mix()` on `--uui-color-positive`, `--uui-color-danger` and `--uui-color-divider`. Every element adds it to its `styles`. Export from `src/theme/index.ts`.
  Acceptance: FND-1 specs green. A Storybook "Theme" story shows the swatches in light, dark and high-contrast.
  depends-on: none. parallel-group: A

- [x] **T2** - story: FND-2 (AC1, AC3). Add `src/lang/en.ts` with every built-in string under `uauiAnalytics_*` (UmbLocalizationDictionary shape). Make `vite.config.ts` a multi-entry build emitting `lang/en.js` beside `umbraco-analytics-ui.js`. Register the translations in `.storybook/preview.ts` and in a test helper, `src/internal/test/localization.ts`, so stories and tests render text, not keys.
  Acceptance: FND-2 AC1 and AC3 specs green. `npm run build` emits `../wwwroot/lang/en.js`.
  depends-on: none. parallel-group: A

- [x] **T3** - story: BDG-1 (AC1–AC6). Move `uaui-delta-badge` to `UmbLitElement` and format with `this.localize.number`. Restyle as the tinted pill (13px bold, `4px 8px`, radius from `--uui-border-radius-*`) using T1's tints. Add `size: "md" | "sm"`. Update its stories and tests.
  Acceptance: BDG-1 specs green, existing badge tests still green, axe clean in light and dark.
  depends-on: T1, T2. parallel-group: B

- [x] **T4** - story: FND-3 (AC1, AC2). Add `uaui-empty-state` in `src/empty-state/` (`headline`, `description`, `icon`), defaulting to the "No data yet" / "Try a wider date range." translations. Remove the now-unused `layout/` and `states/` placeholder folders and their exports from `src/index.ts`.
  Acceptance: FND-3 AC1 and AC2 specs green. FND-2 AC1 in `src/lang/localization.test.ts` retargeted from the test-only element to `uaui-empty-state`.
  depends-on: T2. parallel-group: B

- [x] **T5** - story: FND-3 (AC3–AC6). Add internal loading parts in `src/internal/loading/`: a skeleton block sized by its host, and a thin top-edge loading bar. They're not exported. A test host element in `src/internal/loading/loading.test.ts` exercises first-load and reload behaviour, which T9 and T15 then reuse.
  Acceptance: FND-3 AC3–AC6 specs green against the test host.
  depends-on: T1, T2. parallel-group: B

## Small elements

- [x] **T6** - story: KPI-1 (AC1–AC7). Add `uaui-kpi-tile`: `label`, `value` (string, shown as given), `icon`, `delta`, `delta-unit`, `lower-is-better`. Card style with the icon in a `--uaui-series-2` square, using `uaui-delta-badge`. It has a `loading` property using T5's skeleton. Equal heights come from the host being `display: block; height: 100%` inside a grid row.
  Acceptance: KPI-1 specs green. "Row of tiles" story matches `docs/design/phase-1/screenshots/kpi-size.png` apart from rounded corners.
  depends-on: T3, T5. parallel-group: C

- [x] **T7** - story: KPI-2 (AC1–AC4). Add `selectable` and `selected` to `uaui-kpi-tile`. When selectable, the tile renders as a `button` with `aria-pressed` and raises `select`.
  Acceptance: KPI-2 specs green, axe clean in both states.
  depends-on: T6

- [x] **T7b** - story: KPI-2 (AC1–AC9). Align `uaui-kpi-tile` selection with UUI's `SelectableMixin` (SPEC.md §2 "Selectable"): cancelable `selected`/`deselected` events, the tile sets its own `selected` unless cancelled, `deselectable` (default true), and `uui-card`'s look (2px `--uui-color-selected` border outside the card with glow; 33%/80% on hover; separate focus outline). Keep the toggle button and `aria-pressed`. Replaces T7's `select` event (unreleased alpha, so no deprecation).
  Acceptance: KPI-2 specs green, axe clean in 3 themes × 2 states, `api/ui.api.md` shows `deselectable` and the events in the JSDoc.
  depends-on: T7

- [x] **T8** - story: GRP-1 (AC1–AC4). Add `uaui-group-by`: a radio group (`role="radiogroup"`, arrow-key navigation) styled as the design's segmented control. `value` and `options`, raising `change`.
  Acceptance: GRP-1 specs green, axe clean.
  depends-on: T2. parallel-group: C

## Time-series chart

- [x] **T9** - story: CHT-1 (AC1–AC7), FND-3 (AC2–AC6 for the chart). Add `uaui-time-series-chart` with the shared types in `src/chart/types.ts` (SPEC.md "Shared types"). Wrap Chart.js in `src/chart/internal/` (register only the controllers and scales used, so the bundle stays small). Kinds `line` and `area` only in this task: smooth lines, y-axis from 0 with about 5 round ticks, x labels by `group-by`, `value-format` through `this.localize.number`. An HTML tooltip (not canvas), so later tasks can put `uaui-delta-badge` in it. Legend, visually hidden data table, empty state (T4), and loading (T5). No Chart.js type in the public API (ARCHITECTURE.md decision 4).
  Acceptance: CHT-1 specs green. `api/ui.api.md` has no `chart.js` import. The "Line" and "Area" stories match `an-pin-tip.png` apart from markers.
  depends-on: T1, T2, T3, T4, T5

- [x] **T10** - story: CHT-2 (AC1–AC5). Add `compare-series` and `compare-label` for `line` and `area`: a dashed `--uaui-compare` line, the gap filled between the lines, points matched by position, and the tooltip showing compare value and badge.
  Acceptance: CHT-2 specs green. "Compare" story matches `cmp-diff.png`.
  depends-on: T9

- [x] **T11** - story: CHT-3 (AC1–AC4). Add kinds `bar` and `stacked-bar`, with the compare total as a `--uaui-compare` bar behind each current bar.
  Acceptance: CHT-3 specs green. "Stacked with compare" story matches `vis-cmp.png`.
  depends-on: T10

- [x] **T12** - story: CHT-4 (AC1–AC5). Add `markers` through a private Chart.js plugin in `src/chart/internal/markers-plugin.ts`, following Engage v18's `annotation-dataset-generator.controller.ts` (ARCHITECTURE.md decision 3). Each dot gets an HTML button overlay, so it's focusable in date order, shows the marker tooltip, and raises `marker-click`.
  Acceptance: CHT-4 specs green, axe clean with markers. "Markers" story matches `an-pin-tip.png`.
  depends-on: T11

## Date range

- [x] **T13** - story: DR-1 (AC1–AC8). Add `uaui-date-range` (the button) and `uaui-date-range-modal` with its token `UAUI_DATE_RANGE_MODAL` in `src/date-range/`. The button opens the modal through `UMB_MODAL_MANAGER_CONTEXT`. The modal has presets (`presets` property, defaulting per SPEC.md), two date fields, inline validation and Save/Close. Dates and the button label are formatted with `this.localize.date`. Tests provide a modal manager context (see `umbraco-backoffice-testing`).
  Acceptance: DR-1 specs green, axe clean on the button and the open modal. FND-2 AC3 in `src/lang/localization.test.ts` retargeted from the test-only element to `uaui-date-range`.
  depends-on: T2. parallel-group: D

- [x] **T14** - story: DR-2 (AC1–AC5). Add the Compare switch, compare modes (previous period, previous year, custom), `allow-compare`, the "Compare to:" line on the button, and custom-range validation.
  Acceptance: DR-2 specs green. Button story matches the date box in `cmp-diff.png`.
  depends-on: T13

## Data table

- [x] **T15** - story: TBL-1 (AC1–AC4, AC6, AC7), FND-3 (AC2–AC6 for the table). Add `uaui-data-table` built on `uui-table`. Column types `text`, `link`, `number`, `percent` and `share` (value, percent of column total, bar scaled to the column max; first share column `--uaui-series-1`, second `--uaui-series-2`). `value-format` per column, `toolbar` slot, empty state (T4), loading (T5). No sorting or paging yet.
  Acceptance: TBL-1 AC1–AC4, AC6 and AC7 specs green. "Share columns" story matches `an-table.png`.
  depends-on: T1, T2, T4, T5. parallel-group: D

- [x] **T16** - story: TBL-1 (AC5). Add `compare-rows` matched by `row-key`, with a `size="sm"` `uaui-delta-badge` after each share value.
  Acceptance: TBL-1 AC5 spec green.
  depends-on: T3, T15

- [x] **T17** - story: TBL-2 (AC1–AC4). Add sortable headers, the `sort` property, `sort-change`, and `mode` (`client` sorts itself, `server` doesn't).
  Acceptance: TBL-2 specs green, headers keyboard-operable.
  depends-on: T16

- [x] **T18** - story: TBL-3 (AC1–AC5). Add an optional `totals` input (column key → total, the share denominator, not a displayed total) so share percentages use the full total in server mode (DECISION-LOG), and decide how share bars scale in server mode (e.g. an optional per-column max, or scale to the total). Add the paging footer ("Show rows" 10/25/50/100, "1–10 of 272", previous and next), `page`, `page-size`, `total`, `page-change`. Client mode pages itself. The footer is hidden on one page.
  Acceptance: TBL-3 specs green.
  depends-on: T17

- [x] **T18b** - story: TBL-1 (all). Cells as elements, mirroring the CMS `umb-table` contract. Each built-in column type becomes a cell element (`uaui-text-cell`, `uaui-link-cell`, `uaui-number-cell`, `uaui-percent-cell`, `uaui-share-cell`) that receives `column`, `item` (the row) and `value`. A column's `type` picks one; a new `elementName` on `UauiTableColumn` picks a product's own element instead, created and reused like the CMS (same element reused while the name doesn't change). The share cell also gets table-derived extras (column total, column max, compare value) as extra properties, which plain product cells don't need. Also move the paging footer into an internal element (`uaui-table-pager`, not exported), so the table only composes it. No behaviour change: every existing table spec stays green.
  Acceptance: all table specs green unchanged; new specs for an `elementName` column (receives column/item/value, element reused across renders) and a built-in cell used on its own; axe ×3; `api/ui.api.md` shows `elementName` and the exported cell elements.
  depends-on: T18

- [x] **T18d** - story: TBL-1 (all). Decouple cells from the table API. Remove `type` from `UauiTableColumn`; every column names its cell with `elementName` (default the text cell), with exported constants for the built-in cell names. Alignment stays `align`; sorting gets `sortAs: "number" | "text"` or a compare function. The table provides a context (`UAUI_TABLE_CONTEXT`, an Umbraco context) with per-column stats (total, max, honouring `totals`/`maxes`) and the compare-row lookup; `uaui-share-cell` reads it instead of being special-cased, and product cells can too. The table no longer references any cell by name except the default. Unreleased, so no deprecation.
  Acceptance: all table specs green (updated for the new column shape only); a product cell can read column stats from the context (spec); the table source has no share-specific branching; `api/ui.api.md` reflects the new column shape and context.
  depends-on: T18b

- [x] **T18c** - story: none (docs). Storybook structure and coverage. Add an "Examples" section (ordered after Components, like UUI's Storybook) with full worked examples of the table: Top pages (link + share columns, toolbar search and totals, compare badges), Visitors (a custom cell element, e.g. visitor type with a coloured dot), Paged server (totals/maxes, sort resets the page), and a custom cell reading the table context (e.g. a product's own bar cell). Each example shows the product-side code in the docs panel. Move the existing full-table stories out of "Components › Data Table", which keeps only focused stories of the element's options. Also: a "Components › Data Table › Cells" page with each public cell (`uaui-text-cell`, `uaui-link-cell`, `uaui-number-cell`, `uaui-percent-cell`, `uaui-share-cell`) used on its own; an "Internal" story for each internal piece (pager, sort button, share bar, skeleton cell), each marked "Not public API". The published Storybook (GitHub Pages build) hides everything under "Internal"; local Storybook shows it.
  Acceptance: stories render with no errors in light, dark and high contrast; the production Storybook build has no "Internal" entries, the dev server does.
  depends-on: T18d

- [x] **T19** - story: TBL-4 (AC1–AC3). Add `uaui-search-field`, built like the CMS's own collection search box (find the CMS search input and copy its markup, icon position and spacing; the T15 story's hand-made search box has a misplaced icon, user feedback). Replace the story placeholders with it (300ms debounce, raises `search`). Client mode filters rows on columns marked `searchable` (column flag; if none are marked, all columns' text) and shows the empty state when nothing matches.
  Acceptance: TBL-4 specs green.
  depends-on: T18

- [x] **T20** - story: TBL-5 (AC1–AC3). Make rows clickable and focusable only when a `row-click` listener is attached. Click or Enter raises `row-click` with the row.
  Acceptance: TBL-5 specs green, axe clean in both modes.
  depends-on: T19

- [x] **T20b** - story: FND-1 (palette for product elements). Let product elements use the package's palette. Today the real defaults (`--_uaui-series-*`, tints, compare, text colours) are set inside our shadow roots, so a product's own cell or legend can't match our series colours in light, dark and high contrast. Expose the palette to product elements, mirroring how UUI ships its tokens (check UUI's own approach first, and copy it). Candidates: an exported `css` token block products add to their `static styles`, or theme-aware defaults on `:root` in the package stylesheet. Public `--uaui-*` overrides must keep winning. Update the T18c Custom cell example to use the palette instead of UUI colours, and the README token section.
  Acceptance: a product element outside our shadow roots renders `--uaui-series-1` and `--uaui-series-2` with the same colours as our share bars in all three themes (spec); a product override of `--uaui-series-1` still reaches both; API report updated.
  depends-on: T18d. Before T22, which needs it.

- [x] **T20c** - story: TBL-3 (layout only). Pager encapsulation (user feedback). The table owns a footer section (the top border, padding and placement, mirroring the toolbar section above the table); `uaui-table-pager` renders only its controls ("Show rows", the range, previous and next) with no border or padding of its own. The footer shows when the pager would (today's `#showPager` rule, not during the skeleton load) or when the public `footer` slot has content, and hides when neither. The footer has a public `footer` slot on the left of the pager (user approved, 30-10-2026).
  Acceptance: TBL-3 specs still green; pager story shows bare controls; table stories look unchanged apart from intended spacing; axe in 3 themes.
  depends-on: T18b

## Integration

- [x] **T21** - **wire: localization and date range modal into `umbraco-package.json`.** story: INT-1 (AC1–AC4). Add a `localization` extension (`culture: "en"`, `weight: 200`, `js: /App_Plugins/Umbraco.Analytics.UI/lang/en.js`) and a `modal` extension (alias `Uaui.Modal.DateRange`, `elementName: "uaui-date-range-modal"`) to `public/umbraco-package.json`.
  Acceptance (real backoffice, not unit tests):
  - On a CMS 19 site referencing `Umbraco.Analytics.UI.csproj`, `@umbraco/analytics-ui` resolves in the browser.
  - `uauiAnalytics_emptyHeadline` translates.
  - A test page using `uaui-date-range` opens the modal.
  - `dotnet pack` output's `umbraco-package.json` version equals the package version.
  - A spec reads the shipped manifest's localization weight and checks it equals `UAUI_LOCALIZATION_WEIGHT` (200), so the two can't drift.
  depends-on: T2, T13

## Docs and checks

- [x] **T22** - story: none (SPEC.md §1 pane recipe, plus page examples). Full page examples under "Examples › Pages" in Storybook, each rebuilding a product's current analytics screen from this package, with realistic fake data (`example.com`, invented products):
  - **Engage › Analytics › Pageviews and Visitors**: page header with group-by and date range (with compare), a chart pane (area with compare and markers; stacked bars for visitors) flowing into an edge-to-edge table pane (share columns, compare badges, search and totals, paging), matching the Phase 1 design.
  - **Commerce › Analytics**: a row of KPI tiles (revenue, orders, average order value, carts, conversion), a revenue line chart with compare, top products / top buyers / popular discounts tables, matching today's Commerce widgets in the new look.
  - **Umbraco AI › Usage**: summary KPI tiles (requests, input/output/total tokens, success rate, average duration), a stacked usage chart with series tabs replaced by selectable KPI tiles, and a breakdown table by model or profile.
  Each page uses `uui-box` panes with `--uui-box-default-padding: 0`, wires the events between parts (KPI select switches the chart metric, date range and group-by update the data, table sort/page/search), and shows its source in the docs panel. Any gap found (a missing option, an awkward event) is logged as a follow-up task, not patched silently.
  Acceptance: the three pages render with no errors in light, dark and high contrast; axe clean; each listed interaction works in Storybook.
  depends-on: T8, T12, T14, T20, T20b

- [x] **T23** - story: none (non-functional targets). Measure and record in `BUILD-LOG.md`:
  - the bundle size, gzipped
  - chart render time for 6 series × 366 points
  - table client-mode sort and page time for 1,000 rows
  - contrast in light, dark and high-contrast
  Fix anything over the SPEC.md targets, or raise it if a target needs changing.
  Acceptance: every SPEC.md non-functional target met or explicitly changed.
  depends-on: T12, T20

- [x] **T24** - story: none (docs). Update the repo `README.md` and `Client/README.md` with the element list and a short usage example per element, linking to Storybook.
  Acceptance: every exported element appears in both READMEs.
  depends-on: T21, T22


## Follow-ups (user picked 30-10-2026)

Run after whole-feature review round B. Each gets a builder, a review and its own commit. Public API changes update `api/ui.api.md`, both READMEs, stories and examples.

- [x] **T25** - Compare badges by composition (follow-ups 1 and 2). Built-in value cells (number, percent, share) show a compare badge through one shared piece instead of each cell special-casing it, and product cells can use the same piece. What "better" means is column metadata, not cell logic: `UauiTableColumn` gets a metadata bag (e.g. `meta`) that cells and the badge piece read, holding `lowerIsBetter`. Consider moving the cell-specific fields (`hrefKey`, `color`) into the same bag so the column type stops growing per cell; check the CMS `umb-table` column shape first and log the choice. User approved the shape 30-10-2026.
- [x] **T26** - KPI tile "no data" state (follow-up 3).
- [x] **T27** - Error state element for tiles, chart and table (follow-up 4), alongside `uaui-empty-state`.
- [x] **T28** - Compare-label formatter for a `UauiCompare` (follow-up 5); page examples drop `formatRange`.
- [x] **T29** - Public date helpers: previous period, previous year, range to day/week/month buckets (follow-up 6); page examples drop their own.
- [x] **T30** - A fixed "today" for the date range (follow-up 7). Presets are already configurable (a product passes its own list, each with an optional `range(today)`), but "today" always comes from the clock.
- [x] **T31** - Server-mode table helper (follow-up 8): sort, page, page size and query state plus a stale-response guard, so products don't rewrite it.
- [x] **T32** - Compare series aligned by date, not position, for week and month buckets (follow-up 9).
- [x] **T33** - Generic segmented control (follow-up 10); check UUI first; `uaui-group-by` built on it.
- [x] **T34** - Total aligned to its column (follow-up 11).
- [x] **T35** - Pressing a selected, non-deselectable KPI tile raises nothing (follow-up 12).
- [x] **T36** - KPI delta: "no change" vs "unknown" (follow-up 13).
- [x] **T37** - Page examples use the CMS `umb-body-layout` (headline, header and action slots) instead of a hand-made page header (follow-up 14); no new element. User: "try it and see": report how it looks in Storybook before settling. Dropped 30-10-2026: tried; user ruled it out because these screens render inside product workspaces/dashboards that already provide the layout.
- [x] **T38** - Date range button keeps the same height with compare on, without looking cramped. Show options in Storybook for the user to pick before building.
- [x] **T39** - The table pager becomes a generic compact pager (internal), and "Show rows" becomes a generic label (e.g. "Per page") under a translation key products can override.
- [x] **T40** - Localization audit: every fixed user-facing string (labels, aria-labels, titles, placeholders, sr-only text) goes through a `uauiAnalytics_*` or Umbraco key; a spec fails on new hard-coded text where practical.
- [x] **T41** - Page examples match CMS dashboard headers (no page h1, actions row, layout-1 padding). User request 30-10-2026.

## Follow-ups from T22

Gaps the page examples found. The user picked all of them on 30-10-2026 (see T25–T37 above).

1. Compare badges on number and percent cells (Commerce top buyers, AI success rate). Today only `uaui-share-cell` shows one.
2. Lower-is-better for table compare badges (AI average duration). The KPI tile has it; cells don't.
3. KPI tile "no data" state (Commerce, AI). A range with no data shows "0".
4. Error state element (all three). A failed load has nothing to show for tiles, chart or table.
5. Compare-label formatter for a `UauiCompare` (all three wrote `formatRange`).
6. Date helpers: previous period and range-to-buckets (all three wrote their own).
7. Date range presets with a fixed "today" (demos and tests).
8. Server-mode wiring helper (all three keep sort, page, pageSize and query state plus a stale-response guard).
9. Compare series aligned by date, not position, for week and month buckets (Engage, AI).
10. Generic segmented control; `uaui-group-by` is typed to day/week/month (AI breakdown uses a `uui-select`).
11. Total aligned to a column instead of free layout in the toolbar (Engage).
12. A non-deselectable tile re-raises `selected` when pressed again (Commerce, AI).
13. KPI delta for "no change" vs "unknown" on absolute (points) changes (AI success rate).
14. Shared page header (title plus date range and group-by actions), repeated by all three pages.
