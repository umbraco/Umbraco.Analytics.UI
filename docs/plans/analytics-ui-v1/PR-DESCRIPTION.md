[Plan folder](https://github.com/umbraco/Umbraco.Analytics.UI/tree/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/docs/plans/analytics-ui-v1)

> [!IMPORTANT]
> **7 choices were made without you.** Please check each one. Everything here is public API or visible behaviour, so it is cheap to change now and breaking to change after 19.0.0 ships.
>
> **1. Design: `stats` entries need both `total` and `max`**\
> Plan said: `stats` is `{ [columnKey]: { total, max } }` for server mode. Nothing about partial entries.\
> Built: [`UauiTableColumnStats` has both fields required](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/table/types.ts#L98). A product that only knows the grand total has to compute a max too. The builder logged this as waiting for sign-off.
>
> - **A. Accept `Partial<UauiTableColumnStats>` per entry, and fall back to the rows for a missing field** *(recommended)*. Loosening later is non-breaking, but doing it now saves every product a workaround.
> - B. Keep both required.
>
> **2. Design: `UauiTableServerController` owns 12 table properties**\
> Plan said: nothing about a server-mode helper. It came from a T22 follow-up.\
> Built: [the controller sets `mode`, `sort`, `page`, `pageSize`, `query`, `rows`, `compareRows`, `totalRows`, `stats`, `loading`, `error` and `retryable` on the table directly](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/table/table-server.controller.ts#L221). A page attaches it with `${ref(controller.attach)}` and must not bind those properties itself, or the two fight.
>
> - **A. Keep it.** It is small, works on any Lit host, and the docs say which properties it owns *(recommended)*.
> - B. Make the controller expose the values and let the page bind them. More template code, but nothing hidden.
> - C. Drop it from the public API for v1 and keep it in the examples only.
>
> **3. Design: errors are a separate `uaui-error-state` element**\
> Plan said: nothing about an error state. It came from a T22 follow-up.\
> Built: [a new public element](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/error-state/error-state.element.ts#L16) with `role="alert"` and an optional Retry button, not a `variant="error"` on `uaui-empty-state`. The CMS has neither to copy.
>
> - **A. Keep the separate element.** Only the error needs a role, a button and an event *(recommended)*.
> - B. Fold it into `uaui-empty-state` as a variant, so products learn one element.
>
> **4. Design: `allow-compare` can't be turned off in HTML**\
> Plan said: `allow-compare` (default true).\
> Built: [a plain `{ type: Boolean }` attribute that defaults to true](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/date-range/date-range.element.ts#L47). `allow-compare="false"` still means true, so the only way off is `.allowCompare=${false}`. The docs say so.
>
> - **A. Keep it.** Same pattern as UUI's `deselectable`, and products use Lit property bindings anyway *(recommended)*.
> - B. Rename to `hide-compare`, default false, so the attribute works in plain HTML.
>
> **5. Behavior: weeks always start on Monday**\
> Plan said: nothing about the first day of the week.\
> Built: [week buckets start on Monday for every culture](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/internal/date/date-math.ts#L130). This drives the chart's week grouping, marker buckets and the public `uauiDateBuckets` helper. A US editor would expect Sunday.
>
> - **A. Keep Monday for v1 and add an optional `weekStart` later.** Adding it is non-breaking *(recommended)*.
> - B. Follow the editor's culture now. The same data would then group differently per editor.
>
> **6. Behavior: points on the same date add up**\
> Plan said: nothing about two points with one date.\
> Built: [the chart sums them](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/chart/internal/chart-data.ts#L43), for series, compare points and the compare total. Right for counts, wrong for rates and averages; the TSDoc warns products to aggregate those first. Last-wins was rejected because the compare total can't mix the two rules.
>
> - **A. Keep summing, as documented** *(recommended)*.
> - B. Last point wins, and the compare total uses the same rule.
>
> **7. UI: a KPI tile with no data says "No data yet" for a past period**\
> Plan said: `no-data` shows a dash with the hidden text "No data yet".\
> Built: [the tile reuses the empty-state key `uauiAnalytics_emptyHeadline`](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/kpi-tile/kpi-tile.element.ts#L120). A screen reader hears "No data yet" for last year too, which reads oddly. The text is hidden, so sighted editors only see the dash.
>
> - **A. Add a tile-specific key, such as "No data for this period"** *(recommended)*. One extra translation.
> - B. Keep the shared key, so one override rewords every no-data message.

## Why the change

Engage, Commerce and Umbraco AI each build their own analytics charts, tables, KPI tiles and date filters, so this adds one shared set, matching the Engage Phase 1 design, that all three can load from a single copy on a site.

## What it looks like

**Where to find it:**

- Storybook › Components (each public element), Examples › Pages › Engage / Commerce / Umbraco AI (full screens with fake data), Examples (tables with custom cells).
- Storybook › Internal holds internal pieces. These show in `npm run storybook` only and are dropped from the published build.
- In a real backoffice: a throwaway CMS 19.0.0-beta1 site with a test dashboard (Content › "T21 Analytics" tab › date range button). This site isn't in the repo.

**Who can see it:** nobody yet, on its own. The package adds no section, dashboard or permission. Editors see these elements on Engage, Commerce and AI analytics screens once those products move to it, under whatever access those screens already have.

Engage page example, with the CMS dashboard header style (an `h2` beside the controls).

![Engage page example](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/docs/plans/analytics-ui-v1/screenshots/page-engage.png?raw=true)

| Commerce | Umbraco AI |
|---|---|
| ![Commerce page example](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/docs/plans/analytics-ui-v1/screenshots/page-commerce.png?raw=true) | ![Umbraco AI page example](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/docs/plans/analytics-ui-v1/screenshots/page-ai.png?raw=true) |

Chart with comparison and with markers.

| Compare (light) | Markers (dark) |
|---|---|
| ![Chart compare](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/docs/plans/analytics-ui-v1/screenshots/chart-compare-light.png?raw=true) | ![Chart markers](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/docs/plans/analytics-ui-v1/screenshots/chart-markers-dark.png?raw=true) |

KPI tiles and the date range dialog.

| KPI tiles | Date range dialog |
|---|---|
| ![KPI tiles](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/docs/plans/analytics-ui-v1/screenshots/kpi-tile-light.png?raw=true) | ![Date range dialog](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/docs/plans/analytics-ui-v1/screenshots/date-range-compare-light.png?raw=true) |

Smoke test in a real CMS 19 backoffice: the import map, translations and the date range modal load from the package.

| Dashboard | Date range modal |
|---|---|
| ![CMS 19 dashboard](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/docs/plans/analytics-ui-v1/screenshots/int-1-dashboard.png?raw=true) | ![CMS 19 date range modal](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/docs/plans/analytics-ui-v1/screenshots/int-1-date-range-modal.png?raw=true) |

## How to verify

All commands run in `src/Umbraco.Analytics.UI/Client`.

1. `npm ci`, then `npx playwright install chromium` once. Both finish without errors.
2. `npm test`. About 938 specs pass in Chromium. On macOS, two WebKit Tab specs may fail if you run WebKit; see Good to know.
3. `npm run check:api`. API Extractor completes with no change to `api/ui.api.md`.
4. `npm run build`, then `npm run check:size`. The bundle reports about 93 KB gzip, under the 120 KB budget.
5. `npm run test:perf`. The chart and table timing specs pass (chart under 100 ms, table sort and page under 50 ms).
6. `npm run storybook` and open http://localhost:6006:
   - Examples › Pages › Engage › Pageviews: chart with a dashed compare line and shaded gaps, a column toolbar above the table headings, share bars with change badges.
   - Same page, Failing API: the chart and table show "Something went wrong" with Retry. Retry loads again and fails again.
   - Examples › Pages › Commerce › Slow API: skeletons on first load, then data. Changing the date range keeps the old data under a thin loading bar.
   - Components › KPI Tile › Selectable Row: click, Enter and Space select a tile. Pressing the selected tile again in a one-selected row does nothing.
   - Components › Date Range: open the dialog, set an end date before the start. An inline error shows and Save is disabled. Turn Compare on and save: the button shows a second "vs …" line and stays 40px tall.
   - Components › Data Table › Paged (client): sort, change "Per page", page to the end. Focus stays on a pager button.
   - Switch the Storybook theme to dark and high contrast on any of the above. Colours change, and text stays readable.
7. Optional: add the package to a CMS 19 site (project reference), render `uaui-date-range` in a test dashboard, and open the dialog. It opens with no console errors, and "No data yet" comes from the package's translations.

## Good to know

- The public API in `src/Umbraco.Analytics.UI/Client/api/ui.api.md` is new and becomes frozen for the v19 major once released. It needs a reviewer's sign-off.
- Two WebKit Tab specs fail on macOS only. They failed before this branch too, and pass in the Linux container CI uses.
- Storybook publishing to GitHub Pages is wired up, but Pages still has to be turned on for the repo (pending IT).
- `main` has open Dependabot alerts. This PR doesn't change any dependency versions.
- The new CI steps (`test:perf`, `check:size`, the Linux screenshot container) have not run on real GitHub or Azure DevOps runners yet. Watch the first run.
- `SPEC.md` links to a Phase 1 design folder that isn't in this repo, because the design isn't public yet. Those links are broken on GitHub on purpose.

## Change outline

Where the code lives. Everything under `src/` is new except `delta-badge/`, which was restyled.

```text
src/Umbraco.Analytics.UI/Client/
├── api/ui.api.md              # public API report, needs sign-off
├── public/umbraco-package.json # changed: localization + modal extensions
└── src/
    ├── index.ts               # the public barrel: everything below except internal/ and examples/
    ├── kpi-tile/              # uaui-kpi-tile
    ├── delta-badge/           # uaui-delta-badge (restyled)
    ├── chart/                 # uaui-time-series-chart, Chart.js kept private
    │   └── internal/          # tooltip, marker tooltip, legend, hidden data table
    ├── table/                 # uaui-data-table, server controller, table context
    │   ├── cells/             # text, link, number, percent, share cells
    │   └── internal/          # sort button, share bar, skeleton cell
    ├── search-field/          # uaui-search-field
    ├── date-range/            # uaui-date-range button + dialog (dialog internal)
    ├── date-helpers/          # uauiPreviousPeriod, uauiDateBuckets, uauiFormatDateRange, ...
    ├── toggle-group/             # uaui-toggle-group
    ├── group-by/              # uaui-group-by, built on uaui-toggle-group
    ├── empty-state/           # uaui-empty-state
    ├── error-state/           # uaui-error-state
    ├── theme/                 # UauiPaletteStyles, --uaui-* tokens
    ├── lang/                  # en translations + localization guard specs
    ├── internal/              # pager, loading, date maths, formats, test helpers
    └── examples/              # Storybook only: Engage, Commerce, AI pages
```

The public API, by kind. Event details are exported as `Uaui…Detail` types. Every event bubbles and is not composed.

- **Elements:** `uaui-kpi-tile`, `uaui-delta-badge`, `uaui-time-series-chart`, `uaui-data-table`, `uaui-search-field`, `uaui-table-compare-badge`, `uaui-table-total`, `uaui-date-range`, `uaui-toggle-group`, `uaui-group-by`, `uaui-empty-state`, `uaui-error-state`
- **Table cells:** `uaui-text-cell`, `uaui-link-cell`, `uaui-number-cell`, `uaui-percent-cell`, `uaui-share-cell`, named in `UAUI_TABLE_CELL`
- **Table extras:** `UauiTableServerController`, `UAUI_TABLE_CONTEXT`, `UauiTableColumnMeta` (products merge their own keys in)
- **Functions:** `uauiPreviousPeriod`, `uauiPreviousYear`, `uauiCompareFor`, `uauiDaysIn`, `uauiDateBuckets`, `uauiFormatDateRange`
- **Styles:** `UauiPaletteStyles`, with `--uaui-*` names to override and `--uaui-color-*` names to read
- **Events:** `selected`/`deselected` (tile), `change` (date range, group by, toggle group), `marker-click`, `sort-change`, `page-change`, `search`, `row-click`, `retry` (a plain `Event`)

How a server-mode table loads a page. The page owns the loader; the controller owns the table's paging state.

```text
page element
└── new UauiTableServerController(host, { load, pageSize })
    ├── attach(table)                  # via ${ref(controller.attach)}
    │   └── listens for sort-change, page-change, search
    ├── hostConnected → #load
    ├── sort-change / search → page = 1 → #load
    ├── page-change → #load
    ├── table retry / reload() → #load
    └── #load
        ├── abort the previous request (AbortSignal)
        ├── table.loading = true
        ├── await load(state, signal)  # the product's own API call
        │   ├── ok → table.rows, compareRows, totalRows, stats
        │   ├── aborted or stale → dropped, not an error
        │   └── failed → table.error, onError(error)
        └── table.loading = false
```

What the package adds to the backoffice. Nothing an editor sees on its own.

| Change | Type | Name | Where it appears |
|---|---|---|---|
| **New** | Localization | Uaui English (weight 200) | Package strings; a product's own at weight 100 wins |
| **New** | Modal | Date range dialog | Opened by `uaui-date-range` |
| | Import map | `@umbraco-analytics/ui` | One shared copy for every product on a site |

<details>
<summary>Checked and fine (24)</summary>

- Prefix `uan` → `uax` for elements, types, CSS and keys (user decision).
- Prefix `uax` → `uaui`, same scope (user decision).
- Paired light and dark palette, CMS 19 pink, brighter dark selected border (user decisions).
- KPI tile selection copies UUI's `SelectableMixin`, keeps `aria-pressed`, and a selected non-deselectable tile raises nothing (user decisions).
- Screenshot specs run in the Linux Playwright container only (user decision).
- `v19/dev` and `v19/main` branches, `v{major}/topic/*` names; [`version.json`](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/version.json#L12) publishes from `v\d+/main` (user decision).
- Cells as elements with a table context, internal pager, componentized chart and dialog (user decisions).
- Storybook Examples and Internal sections; Internal stories left out of the published build (user decisions).
- Page examples for Engage, Commerce and AI, with Slow and Failing API stories (user decisions).
- Table footer section and public `footer` slot (user decision).
- `--uaui-color-*` read names and `UauiPaletteStyles` (user decision).
- T25 to T41 follow-ups: compare badge and column `meta`, segmented control, chart `.range`/`.compare`, two-line date button, "Per page", CMS dashboard header styles, localization rule (user picks).
- Performance and bundle targets agreed and guarded by `test:perf` and `check:size`.
- `stats` and `totalRows` names from the whole-feature review.
- `UauiTableColumnMeta` uses interface merging, so a typo in a built-in key fails to compile ([types.ts](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/table/types.ts#L9)).
- `uauiFormatDateRange` takes any `{ date, term }` object, so it follows the editor's culture and translated term ([date-helpers.ts](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/date-helpers/date-helpers.ts#L61)).
- `retry` is a plain bubbling `Event` with no detail, as there is nothing to carry ([error-state.element.ts](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/error-state/error-state.element.ts#L35)).
- KPI tile in error has no Retry, so a row of tiles doesn't show four buttons.
- `marker-click` is not composed, like every other event ([time-series-chart.element.ts](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/chart/time-series-chart.element.ts#L534)).
- The column toolbar sits above the column headings, as in the design's totals row ([data-table.element.ts](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/table/data-table.element.ts#L647)).
- The date button puts its content in `uui-button`'s `extra` slot with an empty default-slot child, so it can ellipsize and UUI doesn't draw the label twice ([date-range.element.ts](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/date-range/date-range.element.ts#L122)).
- `--umb-header-layout-height` went with the reverted `umb-body-layout` attempt; nothing in the code reads it.
- Link cells only link `http:`, `https:`, `mailto:`, `tel:` and relative URLs, since visitor URLs are untrusted ([safe-href.ts](https://github.com/umbraco/Umbraco.Analytics.UI/blob/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/src/Umbraco.Analytics.UI/Client/src/table/internal/safe-href.ts#L1)).
- No new runtime dependency: `chart.js` and `@umbraco-cms/backoffice` were already there.
- `npm run check:api` passes on this commit, and no Chart.js type is in the API report.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01V2t3cmixbeHr2w2dcfhqbt
