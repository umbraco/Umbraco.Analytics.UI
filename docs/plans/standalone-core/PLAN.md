# Plan: Standalone core package

18 tasks in 4 areas. Paths are under `src/Umbraco.Analytics.UI/Client/` unless they start with the repo root. The API reports live in `Client/api/`, not the repo root as `ARCHITECTURE.md`'s tree shows.

The order keeps the Umbraco package working after every task: swap points come first, pointing at the backoffice, so nothing changes. The core versions come after, then the core build and shipping.

Pending specs (52, all `it.skip`, no imports yet): `src/platform/umbraco/*.test.ts` (SAC-1 to SAC-4), `src/platform/core/*.test.ts` (SAC-5 to SAC-12) and `src/platform/build.test.ts` (SAC-13). Each task adds the imports and arrangement its specs need.

## Swap points (Umbraco build unchanged)

- [x] **T1** - story: SAC-1 (AC1–AC5). Add the `imports` field to `package.json` with `#platform/lit`, `#platform/uui`, `#platform/chart` and `#platform/base-element`, and their files in `src/platform/umbraco/` (ARCHITECTURE, What changes). `base-element.ts` exports `UauiLitElement = UmbLitElement` and the `UauiLocalize` type (`lang`, `term`, `date`, `number`). Point Vite, Vitest, tsc and Storybook at `src/platform/umbraco/` for now. `#platform/chart` resolves to the bare `@umbraco/analytics-ui/external/chart.js`, still external in the build.
  Acceptance: `npm run build`, `npm test` and `npm run check:api` pass, with no change to `api/analytics-ui.api.md` or the `wwwroot` file list.
  depends-on: none

- [x] **T2** - story: SAC-1 (AC1, AC5), SAC-13 (AC4). Switch every import of `@umbraco-cms/backoffice/external/lit`, `.../lit-element` and `.../external/uui` in components, tests and stories to `#platform/*`. Chart.js imports switch to `#platform/chart`. A lint rule in `eslint.config.js` allows `lit`, `@umbraco-ui/uui`, `chart.js` and `@umbraco-cms/*` only in `src/platform/`, `src/examples/` and `.storybook/`. Search and replace, no behaviour change.
  Acceptance: SAC-13 AC4 spec green. `npm run lint`, `npm test`, `npm run check:api` pass, report unchanged.
  depends-on: T1

- [x] **T3** - story: SAC-1 (AC1). `uauiFormatDateRange` in `src/date-helpers/date-helpers.ts` and the helpers in `src/internal/delta/delta-text.ts` take `UauiLocalize` (or a `Pick` of it) instead of `UmbLocalizationController` (ARCHITECTURE, Every component).
  Acceptance: `api/analytics-ui.api.md` unchanged in meaning: if api-extractor prints the parameter type differently, stop and ask before committing. Existing date-helper tests green.
  depends-on: T2. parallel-group: A

- [x] **T4** - story: SAC-4 (AC1–AC3). Add `#platform/context` with `src/platform/umbraco/context.ts`: re-exports `UmbContextToken`, `UmbBasicState`, `UmbObjectState`, the `Observable` type, and two helpers `consumeContext(host, token, callback)` and `observe(host, source, callback, alias)` that call the host's own methods. `src/table/table-context.ts`, `table-context.controller.ts`, `share-cell.element.ts` and `table-compare-badge.element.ts` use them.
  Acceptance: SAC-4 specs green in `src/platform/umbraco/context.test.ts`. `api/analytics-ui.api.md` unchanged.
  depends-on: T2. parallel-group: A

- [x] **T5** - story: SAC-3 (AC1–AC4). Split the date range dialog (ARCHITECTURE, Decisions). `src/date-range/date-range-dialog.element.ts` (internal, `uaui-date-range-dialog`) holds today's dialog content, takes the data as properties and fires `submit` with the value or `close`. Date fields use `uui-input type="date"`; styles use `UUITextStyles` (ARCHITECTURE guesses 3, 4). `#platform/date-range-opener` with `src/platform/umbraco/date-range-opener.ts` keeps `uaui-date-range-modal` (same name, manifest unchanged) as a thin `UmbModalBaseElement` around the dialog, opened through the modal manager. `date-range.element.ts` calls the opener.
  Acceptance: SAC-3 specs green in `src/platform/umbraco/date-range-opener.test.ts`. Existing date-range tests green. `umbraco-package.json` unchanged.
  depends-on: T2. parallel-group: A

## Core platform

- [x] **T6** - story: SAC-5 (AC1, AC3). `src/platform/core/lit.ts` re-exports what we use from `lit` (`css`, `html`, `nothing`, `LitElement`, the decorators, `ifDefined`, `ref`, `repeat`, and the types). `uui.ts` imports and so defines the UUI elements we use (box, breadcrumbs, button, dialog-layout, form-layout-item, icon, input, loader-bar, modal, select, symbol-sort, table, toggle) from `@umbraco-ui/uui`. `chart.ts` re-exports `chart.js`. Add a Vitest project `core` that resolves `#platform/*` to `src/platform/core/` and runs `src/platform/core/**/*.test.ts`.
  Acceptance: the `core` Vitest project runs. A spec that imports `#platform/uui` finds `uui-button` defined.
  depends-on: T2. parallel-group: B

- [x] **T7** - story: SAC-6 (AC1, AC2), SAC-7 (AC1–AC5), SAC-8 (AC1–AC5). `src/platform/core/localization.ts`: a controller with `lang`, `term(key, ...args)`, `date`, `number`, matching `UauiLocalize`. Culture: the element's nearest `lang`, then `<html lang>`, then `en`. Lookup: culture, then its language, then English. One dictionary store per page, seeded with `src/lang/en.ts` and English for the 8 reused Umbraco keys. Re-renders connected elements when a dictionary is added or `<html lang>` changes (one shared `MutationObserver`). `base-element.ts`: `UauiLitElement` is `LitElement` with reactive `lang` and `dir` and a `localize` controller. `public.ts` exports `registerUauiTranslations(culture, dictionary)`.
  Acceptance: SAC-6, SAC-7 and SAC-8 specs green in `src/platform/core/localization.test.ts`. `src/lang/localization.*.test.ts` also checks the 8 fallback keys exist.
  depends-on: T3, T6. parallel-group: C

- [x] **T8** - story: SAC-10 (AC1–AC3). `src/platform/core/context.ts`: a token type, a provider that answers `context-request` events (the community protocol, with `subscribe`), a small state class with `subscribe` and `value`, and `consumeContext` and `observe` helpers with the same signatures as T4's.
  Acceptance: SAC-10 specs green in `src/platform/core/context.test.ts`, one of them consuming with a hand-written `context-request` event as `@lit/context` sends it.
  depends-on: T4, T6. parallel-group: C

- [x] **T9** - story: SAC-9 (AC1–AC7). `src/platform/core/date-range-opener.ts`: puts `uaui-date-range-dialog` in a `uui-modal-dialog` inside a `uui-modal-container` on `document.body` (made on first use), resolves on `submit`, discards on `close` or Escape, removes the dialog when it closes and returns focus to the button.
  Acceptance: SAC-9 specs green in `src/platform/core/date-range-opener.test.ts`, with an axe check on the open dialog.
  depends-on: T5, T7. parallel-group: C

- [x] **T10** - story: SAC-11 (AC1–AC3). `src/platform/core/icons.ts`: the 6 SVGs our elements draw (alert, search, delete, calendar, navigation-left, navigation-right; user decision 08-11-2026), copied from the backoffice icon set, and one `document` listener for UUI's icon request event that answers only those names and only if no registry above has answered. Imported once by the core entry.
  Acceptance: SAC-11 specs green in `src/platform/core/icons.test.ts`.
  depends-on: T6. parallel-group: C

- [x] **T11** - story: SAC-12 (AC1, AC2). Check charts in the core take their colours from UUI's theme CSS and redraw on a stylesheet swap (`theme-watch.ts` should already do it). Fix only what fails.
  Acceptance: SAC-12 specs green in `src/platform/core/theme.test.ts`, loading UUI's light and dark theme CSS.
  depends-on: T7

## Core build and tests

- [x] **T12** - story: SAC-13 (AC5), SAC-1 (AC4). Flip the default: every existing test runs in the `core` Vitest project. A second project `umbraco` runs `src/platform/umbraco/**/*.test.ts` and a smoke set (each element renders, with axe) (ARCHITECTURE guess 5). Move `src/internal/localization/register.ts` into `src/platform/umbraco/`. Make the core isolation guard catch any `@umbraco-cms` import in any core spec file, not just its own page: alias `@umbraco-cms/*` to a throwing stub in the `core` project (DECISION-LOG T7, T9). Storybook stays on `umbraco`.
  Acceptance: `npm test` runs both projects green. SAC-1 AC4 and SAC-13 AC5 specs green.
  depends-on: T7, T8, T9, T10, T11

- [x] **T13** - story: SAC-5 (AC3, AC5), SAC-13 (AC1). `vite.config.core.ts` builds `src/index.ts` plus `src/platform/core/public.ts` with `#platform/*` on core, to `dist/core/`, keeping `lit`, `@umbraco-ui/uui` and `chart.js` external. `npm run build` runs both builds. `devops/check-bundle-size.js` checks the core file against its budget (SPEC guess 3) and fails on any `@umbraco-cms/` import in it. The core build sets rolldown `output.comments.legal: true`, and a check fails if the built core file lacks the Lucide licence ("ISC License") from `icons.ts` (DECISION-LOG T10). Add `tsconfig.core.json` that type-checks all of `src/**` with `#platform/*` on core, run in `build`; then delete the interim `tsconfig.structural.json` and `src/platform/structural-check/` and their `build:app` step (DECISION-LOG T3).
  Acceptance: SAC-5 AC3 and AC5 green in `src/platform/core/core-bundle.test.ts`, SAC-13 AC1 green in `src/platform/build.test.ts`. `wwwroot` file list unchanged.
  depends-on: T12

- [ ] **T14** - story: SAC-5 (AC4), SAC-13 (AC3). `api-extractor.core.json` writes `api/analytics-ui-core.api.md` from the core types. `build:api` and `check:api` run it with the others.
  Acceptance: SAC-5 AC4 and SAC-13 AC3 specs green. New report committed for sign-off. `api/analytics-ui.api.md` unchanged.
  depends-on: T13

- [ ] **T15** - **wire: the core into a plain page.** story: SAC-5 (AC1, AC2). A browser test in `src/platform/core/core-bundle.test.ts` imports the built `dist/core` file on a page with only `lit`, `@umbraco-ui/uui` and UUI's theme CSS, then renders each public element.
  Acceptance: SAC-5 AC1 and AC2 green against the real build output, not the source.
  depends-on: T13

## Shipping

- [ ] **T16** - **wire: the core npm package.** story: SAC-13 (AC2). A `package.json` for `@umbraco/analytics-ui-core` (ARCHITECTURE guesses 1, 2): ESM entry and types from `dist/core`, peer `lit` `^3.3.1` and `@umbraco-ui/uui` `^2.1.1` (SPEC guess 1), dependency `chart.js` at today's range. `devops/publish/` syncs its version from `version.json` and packs it beside `@umbraco/analytics-ui`.
  Acceptance: SAC-13 AC2 green. `npm pack` of the core, installed into an empty folder with Vite, renders a `uaui-kpi-tile`.
  depends-on: T14, T15

- [ ] **T17** - **wire: the core into the pipeline.** story: SAC-13 (AC1, AC2). `azure-pipelines.yml` builds, tests and publishes the core package to the same npm feeds as `@umbraco/analytics-ui` (`npm - Nightly`, `npm - Pre-releases`, npm.org for releases).
  Acceptance: a pipeline run on the topic branch has both npm `.tgz` files as artifacts with the same version.
  depends-on: T16

- [ ] **T18** - story: SAC-13. Docs: `CLAUDE.md` import rules point at `#platform/*`, and say only `src/platform/` may touch Lit, UUI, Chart.js or `@umbraco-cms/*` directly. `CHANGELOG.md` gets an `### Added` line for `@umbraco/analytics-ui-core`. A Storybook docs page in `src/docs/` on using the core outside Umbraco: install, peer packages, theme CSS, `registerUauiTranslations`, icons a host must register (SPEC guess 2).
  Acceptance: `npm run lint`, `npm test`, `npm run build` pass. The docs page shows in Storybook.
  depends-on: T16
