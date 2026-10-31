[Plan folder](https://github.com/umbraco/Umbraco.Analytics.UI/tree/d61d934cb810a86a1bc7037d61f48b4ddbf24c85/docs/plans/analytics-ui-v1)

> [!NOTE]
> **7 choices were made during the build. All are now decided.**
>
> 1. **`stats` entries:** a product may give only `total` or only `max` per column (`UauiTableStatsInput`); the missing one comes from the rows.
> 2. **`UauiTableServerController`:** kept. It sets the table's server-mode properties itself, as documented.
> 3. **`uaui-error-state`:** kept as its own element.
> 4. **`allow-compare`:** kept as a plain Boolean, like UUI's `deselectable`. Turn it off with `.allowCompare=${false}`.
> 5. **Week start:** added now. `week-start` on the chart and `uauiDateBuckets(range, groupBy, { weekStart })`, ISO 1 (Monday) to 7 (Sunday), the same numbers as `Intl.Locale#getWeekInfo().firstDay`. Default Monday.
> 6. **Points on the same date:** kept. They add up, as documented.
> 7. **KPI tile with no data:** its hidden text is now "No data for this period".

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
3. `npm run check:api`. API Extractor completes with no change to `api/analytics-ui.api.md`.
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

- The public API in `src/Umbraco.Analytics.UI/Client/api/analytics-ui.api.md` is new and becomes frozen for the v19 major once released. It needs a reviewer's sign-off.
- Two WebKit Tab specs fail on macOS only. They failed before this branch too, and pass in the Linux container CI uses.
- Storybook publishing to GitHub Pages is wired up, but Pages still has to be turned on for the repo (pending IT).
- `main` has open Dependabot alerts. This PR doesn't change any dependency versions.
- The new CI steps (`test:perf`, `check:size`, the Linux screenshot container) have not run on real GitHub or Azure DevOps runners yet. Watch the first run.
- `SPEC.md` links to a Phase 1 design folder that isn't in this repo, because the design isn't public yet. Those links are broken on GitHub on purpose.

## Change outline

Where the code lives. Everything under `src/` is new except `delta-badge/`, which was restyled.

```text
src/Umbraco.Analytics.UI/Client/
├── api/analytics-ui.api.md  # public API report, needs sign-off
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
| | Import map | `@umbraco/analytics-ui` | One shared copy for every product on a site |

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
