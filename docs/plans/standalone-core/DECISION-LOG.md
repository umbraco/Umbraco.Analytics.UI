# Decision log: Standalone core package

- 08-11-2026: The core package follows package major = CMS major, and Cloud aligns to the CMS's UUI and Lit versions. Why: one version line is simpler, and Umbraco sites are the main consumer.
- 08-11-2026: Swap points chosen at build time (`#platform/*`), not a runtime adapter. Why: the Umbraco package keeps its exact public types and behaviour; a runtime adapter would change 26 public element types.
- 08-11-2026: The core doesn't depend on `@umbraco-cms/backoffice`. Why: it carries its own Lit and UUI copies, so the portal would load them twice.
- 08-11-2026: Core translations, table context and fallback icons are our own small code, with no new dependencies. Why: keeps the core to Lit, UUI and Chart.js only.
- 08-11-2026: Swap points land first, pointing at the backoffice, before any core code. Why: the Umbraco package keeps working and its API report stays unchanged after every task.
- 08-11-2026: Tests flip to the core build (T12) only after every core swap point exists. Why: until then the core can't run the full suite.
- 08-11-2026 (T1): Swap points resolve through `package.json` `imports`; the library build also aliases `#platform/lit|uui|chart` straight to the external specifiers, because `export *` from an external module adds a namespace shim to the bundle. Storybook drops those aliases, since there the specifiers aren't external.
- 08-11-2026 (T1): `UauiLocalize.lang` is a method, matching `UmbLocalizationController.lang()`. The type lives in shared `src/platform/localize.ts` so both platforms use one copy.
- 08-11-2026 (T1): `UauiLitElement` is a named re-export of `UmbLitElement`, so the API report still says `extends UmbLitElement`. Accepted cost: a migrated bundle imports `UmbLitElement` under two names (~22 bytes).
- 08-11-2026 (T1): `@linkcode` defined in `tsdoc.json`, because API Extractor now reads lit-html's doc comments, which use it. Silences only that tag.
- 08-11-2026 (T1): `cleanse-pkg.js` removes the `imports` field from the published types package.
