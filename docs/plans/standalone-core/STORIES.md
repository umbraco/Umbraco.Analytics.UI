# Stories: Standalone core package

**13 stories, 52 criteria.** Story ids are used by `PLAN.md` and the spec files, so never renumber them.

"The Umbraco build" means tests run with `#platform/*` pointing at `src/platform/umbraco/`. "The core build" means they point at `src/platform/core/`, on a page with Lit, UUI and the UUI theme CSS and nothing from `@umbraco-cms/*`.

**Umbraco package stays the same**

- [SAC-1](#sac-1-products-see-no-change) Products see no change, 5 criteria
- [SAC-2](#sac-2-umbraco-translations-still-win) Umbraco translations still win, 3 criteria
- [SAC-3](#sac-3-the-date-range-dialog-in-the-backoffice) The date range dialog in the backoffice, 4 criteria
- [SAC-4](#sac-4-custom-cells-in-the-backoffice) Custom cells in the backoffice, 3 criteria

**Core runs without Umbraco**

- [SAC-5](#sac-5-the-core-loads-on-its-own) The core loads on its own, 5 criteria
- [SAC-6](#sac-6-english-out-of-the-box) English out of the box, 2 criteria
- [SAC-7](#sac-7-the-host-adds-its-own-text) The host adds its own text, 5 criteria
- [SAC-8](#sac-8-the-culture-follows-lang) The culture follows `lang`, 5 criteria
- [SAC-9](#sac-9-the-date-range-dialog-in-the-core) The date range dialog in the core, 7 criteria
- [SAC-10](#sac-10-custom-cells-in-the-core) Custom cells in the core, 3 criteria
- [SAC-11](#sac-11-icons-in-the-core) Icons in the core, 3 criteria
- [SAC-12](#sac-12-light-and-dark-in-the-core) Light and dark in the core, 2 criteria

**Shipping**

- [SAC-13](#sac-13-one-build-one-release) One build, one release, 5 criteria

<details>
<summary>Ready and Done</summary>

**Ready:** the role, capability and value are all stated. Given/When/Then criteria cover the happy path. Out of scope is explicit. It passes INVEST.

**Done:**
- Every criterion passes as an executable spec, sad paths included.
- `api/analytics-ui.api.md` is unchanged. `api/analytics-ui-core.api.md` is new, committed and signed off.
- `CHANGELOG.md` has an `### Added` line for the core package.
- `npm run lint`, `npm test` and `npm run build` pass.

</details>

---

## SAC-1: Products see no change

As a product developer on Engage, Commerce or Umbraco AI,
I want the Umbraco package to stay exactly as it is,
so that I don't change any code when the core is split out.

```
AC1 — The public API report doesn't move
  Given the split is built
  When  npm run check:api runs
  Then  api/analytics-ui.api.md has no changes

AC2 — The Umbraco output has the same files
  Given the split is built
  When  the wwwroot folder is listed
  Then  it holds umbraco-analytics-ui.js, lang/en.js, external/chart.js/index.js and umbraco-package.json, as before

AC3 — The import map is the same
  Given the split is built
  When  umbraco-package.json is read
  Then  its import map has exactly @umbraco/analytics-ui and @umbraco/analytics-ui/external/chart.js

AC4 — Elements are still Umbraco elements
  Given the Umbraco build
  When  a uaui-kpi-tile is created
  Then  it is an instance of UmbLitElement

AC5 — The Umbraco bundle loads Lit and UUI from the backoffice
  Given the Umbraco build's main bundle
  When  its imports are read
  Then  Lit and UUI come only from @umbraco-cms/backoffice/external/*
```

## SAC-2: Umbraco translations still win

As a product developer,
I want my product's own `localization` extension to keep overriding our text in the backoffice,
so that my dashboards read the way my product needs.

```
AC1 — Our English text shows
  Given the Umbraco build with the package's English registered
  When  a uaui-empty-state renders with no text set
  Then  it shows the package's English headline

AC2 — A product's override wins
  Given a localization extension at weight 100 that sets uauiAnalytics_emptyHeadline to "Nothing yet"
  When  a uaui-empty-state renders
  Then  it shows "Nothing yet"

AC3 — The user's culture sets the language
  Given a Danish dictionary for uauiAnalytics_emptyHeadline and the backoffice culture "da-DK"
  When  a uaui-empty-state renders
  Then  it shows the Danish text
```

## SAC-3: The date range dialog in the backoffice

As an editor in the backoffice,
I want the date range dialog to work as it does today,
so that nothing changes for me.

```
AC1 — The button opens the dialog through the modal manager
  Given a uaui-date-range in the Umbraco build
  When  its button is clicked
  Then  the modal manager has one open modal with alias Uaui.Modal.DateRange

AC2 — Save keeps the new range
  Given the dialog is open with 01-06-2026 to 30-06-2026 picked
  When  Save is clicked
  Then  the element's value is { from: "2026-06-01", to: "2026-06-30" }

AC3 — Save fires change
  Given the dialog is open with a new range picked
  When  Save is clicked
  Then  one change event fires with the new value

Sad path

AC4 — Close throws away edits
  Given the dialog is open with a new range picked
  When  Close is clicked
  Then  the element's value is unchanged
```

## SAC-4: Custom cells in the backoffice

As a product developer,
I want my custom table cell to keep reading `UAUI_TABLE_CONTEXT` with `consumeContext`,
so that my cell code doesn't change.

```
AC1 — The cell gets the columns
  Given a custom UmbLitElement cell inside a uaui-data-table in the Umbraco build
  When  it consumes UAUI_TABLE_CONTEXT and observes columns
  Then  it receives the table's columns

AC2 — The cell gets the stats
  Given the same cell
  When  it observes stats
  Then  it receives each column's total and largest value

AC3 — The cell sees changes
  Given the same cell observing columns
  When  the table's columns change
  Then  the cell receives the new columns
```

## SAC-5: The core loads on its own

As a Cloud portal developer,
I want to import one npm package on a page without Umbraco,
so that I can use the analytics components in the portal.

```
AC1 — Every public element is defined
  Given the core build on a page with Lit, UUI and the UUI theme CSS
  When  @umbraco/analytics-ui-core is imported
  Then  every public uaui-* element name is a defined custom element

AC2 — No errors on load
  Given the same page
  When  the core is imported and a uaui-kpi-tile is rendered
  Then  the console has no errors

AC3 — Nothing from Umbraco is in the core
  Given the core build output
  When  its imports are read
  Then  none start with @umbraco-cms/

AC4 — Same public names as the Umbraco package
  Given both API reports
  When  their exports are compared
  Then  the core has every Umbraco export plus registerUauiTranslations, and nothing else

AC5 — Lit, UUI and Chart.js aren't bundled in
  Given the core build output
  When  check:size runs
  Then  the core file is within its budget and imports lit, @umbraco-ui/uui and chart.js rather than containing them
```

## SAC-6: English out of the box

As a Cloud portal developer,
I want every element to show English text before I register anything,
so that the components work the moment I add them.

```
AC1 — Our own keys show English
  Given the core build with no translations registered
  When  a uaui-empty-state renders
  Then  it shows the package's English headline

AC2 — The reused Umbraco words show English
  Given the core build with no translations registered
  When  a uaui-error-state renders with a retry button
  Then  the button reads "Retry"
```

## SAC-7: The host adds its own text

As a Cloud portal developer,
I want to register my own text per culture,
so that the components read in the portal's languages.

```
AC1 — A registered culture's text shows
  Given registerUauiTranslations("da", { uauiAnalytics_emptyHeadline: "Ingen data" }) and lang "da"
  When  a uaui-empty-state renders
  Then  it shows "Ingen data"

AC2 — Registering overrides our English
  Given registerUauiTranslations("en", { uauiAnalytics_emptyHeadline: "Nothing yet" })
  When  a uaui-empty-state renders with lang "en"
  Then  it shows "Nothing yet"

AC3 — Elements already on the page update
  Given a uaui-empty-state already rendered with lang "da"
  When  registerUauiTranslations("da", ...) runs afterwards
  Then  the element shows the Danish text

Sad path

AC4 — A missing key falls back to the language
  Given a "da" dictionary with the key and an empty "da-DK" dictionary
  When  a uaui-empty-state renders with lang "da-DK"
  Then  it shows the "da" text

AC5 — A key missing everywhere falls back to English
  Given a "da" dictionary without the key
  When  a uaui-empty-state renders with lang "da"
  Then  it shows the English text
```

## SAC-8: The culture follows `lang`

As a Cloud portal developer,
I want each element to pick its language and number format from `lang`,
so that it matches the rest of the portal.

```
AC1 — The element's own lang wins
  Given <html lang="en"> and a uaui-stat with lang "da-DK" and value 1234.5
  When  it renders
  Then  the value reads "1.234,5"

AC2 — The nearest parent's lang is used
  Given a uaui-stat inside <div lang="da-DK"> with value 1234.5
  When  it renders
  Then  the value reads "1.234,5"

AC3 — <html lang> is used when nothing nearer sets it
  Given <html lang="da-DK"> and a uaui-stat with value 1234.5
  When  it renders
  Then  the value reads "1.234,5"

AC4 — Changing <html lang> re-renders
  Given a rendered uaui-stat with value 1234.5 and <html lang="en-US">
  When  <html lang> changes to "da-DK"
  Then  the value reads "1.234,5"

Sad path

AC5 — No lang anywhere means English
  Given no lang on the element, its parents or <html>
  When  a uaui-stat renders with value 1234.5
  Then  the value reads "1,234.5"
```

## SAC-9: The date range dialog in the core

As a Cloud portal user,
I want the date range button to open a dialog that works like the backoffice's,
so that I can pick a period.

```
AC1 — The button opens a UUI modal dialog
  Given a uaui-date-range in the core build
  When  its button is clicked
  Then  a uui-modal-dialog holding the date range dialog is open

AC2 — Focus moves into the dialog
  Given the dialog has just opened
  When  focus is read
  Then  it is inside the dialog

AC3 — Save keeps the new range
  Given the dialog is open with 01-06-2026 to 30-06-2026 picked
  When  Save is clicked
  Then  the element's value is { from: "2026-06-01", to: "2026-06-30" }

AC4 — Save fires change
  Given the dialog is open with a new range picked
  When  Save is clicked
  Then  one change event fires with the new value

AC5 — Focus returns to the button
  Given the dialog is open
  When  it closes by Save, Close or Escape
  Then  focus is on the date range button

Sad path

AC6 — Close throws away edits
  Given the dialog is open with a new range picked
  When  Close is clicked
  Then  the element's value is unchanged

AC7 — Escape throws away edits
  Given the dialog is open with a new range picked
  When  Escape is pressed
  Then  no change event fires
```

## SAC-10: Custom cells in the core

As a Cloud portal developer,
I want my custom cell to read the table's context with the standard `context-request` event,
so that I can build cells with `@lit/context` or plain code.

```
AC1 — A context-request gets the context
  Given a custom cell inside a uaui-data-table in the core build
  When  it fires a context-request event for UAUI_TABLE_CONTEXT
  Then  its callback receives the table context

AC2 — The context gives the columns
  Given the cell has the context
  When  it subscribes to columns
  Then  it receives the table's columns

AC3 — The cell sees changes
  Given the cell subscribed to columns with subscribe set on the request
  When  the table's columns change
  Then  the cell receives the new columns
```

## SAC-11: Icons in the core

As a Cloud portal user,
I want the icons our elements draw to show without any setup,
so that empty states, errors, search and the pager look right.

```
AC1 — Our icons show with no registry
  Given the core build with no icon registry on the page
  When  a uaui-error-state renders
  Then  its uui-icon has an SVG for icon-alert

AC2 — Every built-in icon is covered
  Given the core build with no icon registry on the page
  When  each of icon-alert, icon-search, icon-delete, icon-calendar, icon-navigation-left and icon-navigation-right is requested
  Then  each resolves to an SVG

Sad path

AC3 — The host's registry wins
  Given a uui-icon-registry around the element that has its own icon-alert
  When  a uaui-error-state renders inside it
  Then  the icon is the registry's, not ours
```

## SAC-12: Light and dark in the core

As a Cloud portal user,
I want charts to follow the portal's light or dark theme,
so that they stay readable.

```
AC1 — Colours come from the UUI theme on the page
  Given the core build with UUI's light theme CSS
  When  a uaui-time-series-chart renders
  Then  its line colour matches the theme's custom property

AC2 — Switching theme redraws the chart
  Given a rendered chart with the light theme
  When  the page's theme stylesheet is swapped for the dark one
  Then  the chart's colours change to the dark theme's
```

## SAC-13: One build, one release

As a maintainer,
I want one build and one pipeline run to produce both packages,
so that they never drift apart.

```
AC1 — One build makes both
  Given a clean checkout
  When  npm run build runs
  Then  both wwwroot and dist/core are produced

AC2 — Both npm packages share the version
  Given version.json says 19.1.0
  When  both npm packages are packed
  Then  both package.json files say 19.1.0

AC3 — check:api checks both reports
  Given a change to a core-only export
  When  npm run check:api runs
  Then  it fails on api/analytics-ui-core.api.md

AC4 — Lint stops real imports outside the platform folder
  Given a component that imports from "lit"
  When  npm run lint runs
  Then  it fails

AC5 — axe passes in both builds
  Given the element tests
  When  they run on the core build and the Umbraco smoke set
  Then  every axe check passes
```
