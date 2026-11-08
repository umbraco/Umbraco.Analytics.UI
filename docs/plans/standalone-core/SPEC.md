# Spec: Standalone core package

> [!IMPORTANT]
> **3 guesses need your OK.**
>
> 1. The core's peer ranges are the ones CMS 19 ships: `lit` `^3.3.1` and `@umbraco-ui/uui` `^2.1.1`.\
>    *If not:* the Cloud team's answer on their versions changes them.
> 2. Icons a product passes in (such as a KPI tile's `icon`) need the host's own icon registry in the core. We only bring the icons our own elements draw.\
>    *If not:* ship the whole backoffice icon set with the core, which is large.
> 3. The core bundle budget is 10% above the Umbraco bundle's, for the fallback icons and translation code.\
>    *If not:* set a different number in `check:size`.

## Endpoints
None.

## Rules

**Umbraco package**

- **R1** `api/analytics-ui.api.md` is unchanged by this feature.
- **R2** The `wwwroot` output has the same files, element names and import map entries as before.
- **R3** Every existing test still passes against the Umbraco build's swap points.
- **R4** Inside the backoffice, a product's own `localization` extension still overrides our keys, and the user's culture still sets the language.
- **R5** The date range dialog still opens through the backoffice modal manager and closes with Escape, Close or Save as before.
- **R6** A custom cell that reads `UAUI_TABLE_CONTEXT` with `consumeContext` still gets columns, stats and compare rows.

**Core package**

- **R7** Importing `@umbraco/analytics-ui-core` on a page with only Lit, UUI and the UUI theme CSS defines every public `uaui-*` element, with no errors in the console.
- **R8** The core's files import nothing from `@umbraco-cms/*` (checked in the build).
- **R9** The core's public exports are the Umbraco package's, plus `registerUauiTranslations`, with the same element names, attributes, properties and events.
- **R10** With no translations registered, every element shows English text, including the 8 reused Umbraco words.
- **R11** `registerUauiTranslations(culture, dictionary)` adds or overrides keys for a culture. Elements already on the page re-render with the new text.
- **R12** An element reads its culture from its nearest `lang` attribute, then `<html lang>`, then `en`. Changing `<html lang>` re-renders elements with the new text and number and date formats.
- **R13** A key missing in the chosen culture falls back to its language (`da` for `da-DK`), then English.
- **R14** The date range button opens its dialog in `uui-modal-dialog`. Focus moves into it, Escape and Close discard changes, Save fires `change`, and focus returns to the button.
- **R15** A custom cell inside `uaui-data-table` can read the table context by firing a `context-request` event (as `@lit/context`'s consumer does) and gets updates when rows or columns change.
- **R16** Icons our own elements draw (alert, search, calendar, pager arrows, check, wrong, time, inbox, chart, chart-curve, block, undo, delete) show with no icon registry on the page.
- **R17** When a host's icon registry answers for a name, its icon is used, not ours.
- **R18** Light and dark mode follow the UUI theme CSS on the page, and charts redraw when it changes, as in the backoffice.
- **R19** The core bundle stays within its budget in `check:size` (see guess 3), and doesn't contain Lit, UUI or Chart.js.

**Both**

- **R20** One `npm run build` builds both, and CI publishes both npm packages with the version from `version.json`.
- **R21** `npm run check:api` checks both API reports.
- **R22** The axe check passes for every element in both builds' tests.

## Screens
No screens change, so there are no mockups. The date range dialog keeps its look in both builds.

## Targets
- No slower first draw than today inside the backoffice: the Umbraco build has the same code paths.
- Core bundle size: see R19.
