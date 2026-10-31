# Umbraco Analytics UI

Shared backoffice charts, tables, KPI tiles and filters for the analytics sections of Umbraco products (Engage, Commerce, Umbraco AI).

> Shared by Engage, Commerce and Umbraco AI. No one product owns it: a change has to work for all three.

## What it is

- A Razor Class Library that ships built web components to `App_Plugins/Umbraco.Analytics.UI`.
- Registers `@umbraco/analytics-ui` in the backoffice import map, so every product on a site loads the same single copy.
- Components only draw. Products fetch their own data and pass it in.
- Chart.js is bundled inside and is not part of the public API.

## Elements

Usage and API are in [Storybook](https://umbraco.github.io/Umbraco.Analytics.UI/): guides, live previews of every element and state, and full example pages (Commerce, Engage, Umbraco AI). Install steps are in the [package README](src/Umbraco.Analytics.UI/Client/README.md).

| Element | What it does |
|---|---|
| `uaui-kpi-tile` | A headline number as a card, with an icon and a change badge. Can be selectable. |
| `uaui-delta-badge` | The change against a comparison period, e.g. "▲ 12.4%". |
| `uaui-time-series-chart` | Lines, areas, bars or stacked bars over time, with compare, markers and a legend. |
| `uaui-toggle-group` | Toggle group: a row of options, exactly one selected. |
| `uaui-group-by` | Day, week or month switch for a chart. |
| `uaui-date-range` | Button and dialog to pick a date range and a comparison. |
| `uaui-data-table` | Sortable, searchable, pageable table. Client or server mode. |
| `uaui-search-field` | Search box that raises `search` as you type. Works anywhere; in a table, put it in the `toolbar` or `toolbar-start` slot and the table filters itself. |
| `uaui-table-total` | One total for the table's column toolbar: label, value and change badge, over its column. |
| `uaui-text-cell`, `uaui-link-cell`, `uaui-number-cell`, `uaui-percent-cell`, `uaui-share-cell` | Table cells. Name one in a column's `elementName`, or write your own. |
| `uaui-table-compare-badge` | The change badge of a table cell: finds the compare row and shows how a value moved. Use it in your own cells. |
| `uaui-empty-state` | "Nothing to show" message. The chart and table use it too. |
| `uaui-error-state` | "Could not load" message, with an optional Retry button. The chart and table show it when their `error` is set. The KPI tile shows a dash instead, with no Retry. |

Also public: `UAUI_TABLE_CELL` (the cell element names), `UAUI_TABLE_CONTEXT` (what a custom cell reads from its table), `UauiPaletteStyles` (the colour palette for your own elements), `UauiTableServerController` (runs a table in `server` mode) and the date helpers `uauiPreviousPeriod`, `uauiPreviousYear`, `uauiCompareFor`, `uauiDaysIn`, `uauiDateBuckets` and `uauiFormatDateRange`.

## Packages

| Package | Feed | Purpose |
|---|---|---|
| `Umbraco.Analytics.UI` | NuGet | Puts the files on the site. Products reference it with a range that stays on one major, e.g. `[19.0.0, 19.999.999)` (not `20.0.0`, which lets a 20 prerelease in). |
| `@umbraco/analytics-ui` | npm | Types only. Products add it as a dev dependency and mark `@umbraco/analytics-ui` as external in Vite. |

Both share the version in `version.json`. The package major tracks the CMS major.

## Repo layout

```
src/Umbraco.Analytics.UI/
  Umbraco.Analytics.UI.csproj   RCL, no C# code
  Client/
    src/<component>/            one folder per component
    src/examples/               Storybook examples, incl. full pages
    src/index.ts                public API
    public/umbraco-package.json import map registration
    api/                        API Extractor report (committed)
  wwwroot/                      build output (gitignored)
```

## Local development

```bash
cd src/Umbraco.Analytics.UI/Client
npm install
npx playwright install chromium   # once, for browser tests
npm run build            # types + API report + bundle to ../wwwroot
npm run watch            # rebuild on change
npm run storybook        # component previews on http://localhost:6006
npm test                 # browser tests (Chromium locally; Chromium, Firefox, WebKit on CI)
npm run lint
```

Tooling matches Umbraco UI (UUI): Storybook 10 with the light, dark and high-contrast backoffice themes, and Vitest browser mode with Playwright, `vitest-browser-lit` and an axe-core accessibility matcher.

The README test (`src/internal/readme/readme.test.ts`) fails when a public element is missing from either README, or when a Storybook link in a README or guide page points at a page that doesn't exist. Add new elements to both READMEs. The guides are MDX pages in `Client/src/docs/`.

Each component lives in its own folder:

```
src/delta-badge/
  delta-badge.element.ts   the component
  delta-badge.story.ts     Storybook stories
  delta-badge.test.ts      browser tests, including an a11y audit
  index.ts
```

To try changes inside a product, reference `src/Umbraco.Analytics.UI/Umbraco.Analytics.UI.csproj` from the product's test site instead of the NuGet package.

CMS packages (`Umbraco.Cms.*`) restore from nuget.org only (see `NuGet.config`). A CMS prerelease can be on MyGet too with different contents, which breaks the lock file check on CI. To build against a CMS nightly, add the MyGet feeds to the `Umbraco.Cms.*` mapping and refresh `packages.lock.json`.

## Release

Versions follow the CMS major (19.x is for CMS 19). Branches: `v19/dev` for development, `v19/main` for releases, work on `v19/topic/<name>`.

Uses the shared `umbraco/Umbraco.Build` pipeline (`azure-pipelines.yml`), run by the [Umbraco.Analytics.UI pipeline](https://dev.azure.com/umbraco/Umbraco%20Extensions/_build?definitionId=820) in the Umbraco Extensions Azure DevOps project. Tag `release-{version}` on the release branch. Prereleases go to MyGet, stable releases to NuGet.org and npm.

To publish a nightly or prerelease build from any branch: Run pipeline, pick the branch, set **Prerelease** to `nightly` or `prerelease` and **Release** to `skip`. Both packages go to the MyGet `umbraconightly` or `umbracoprereleases` feed (NuGet and npm).

Not set up yet, needed before the first public release: an npmjs.org service connection (`NPM`), a release approval environment and the Dependency-Track variable group for SBOM uploads. See the TODO in `azure-pipelines.yml`.

The template runs the root `package.json` `ci:*` scripts to install, build and pack the client. A `ClientTests` stage then runs lint, the browser tests in Chromium, Firefox and WebKit, and a Storybook build. Publishing waits for it to pass.

## CI and Storybook

| Where | When | What |
|---|---|---|
| GitHub Actions (`.github/workflows/storybook.yml`) | Pull requests into `v19/dev`, `v19/main`, `release/*`, `hotfix/*`, and pushes to `v19/main` | Lint, build, API check, browser tests. On `v19/main`, also publishes Storybook to GitHub Pages at https://umbraco.github.io/Umbraco.Analytics.UI/. |
| Azure DevOps (`azure-pipelines.yml`, Umbraco Extensions project) | `release/*`, `hotfix/*`, `release-*` tags, or run by hand | Build, pack, SBOM, client tests, then MyGet / NuGet.org / npm. Storybook is attached to the run as an artifact. |
