# Decision log: Standalone core package

- 08-11-2026: The core package follows package major = CMS major, and Cloud aligns to the CMS's UUI and Lit versions. Why: one version line is simpler, and Umbraco sites are the main consumer.
- 08-11-2026: Swap points chosen at build time (`#platform/*`), not a runtime adapter. Why: the Umbraco package keeps its exact public types and behaviour; a runtime adapter would change 26 public element types.
- 08-11-2026: The core doesn't depend on `@umbraco-cms/backoffice`. Why: it carries its own Lit and UUI copies, so the portal would load them twice.
- 08-11-2026: Core translations, table context and fallback icons are our own small code, with no new dependencies. Why: keeps the core to Lit, UUI and Chart.js only.
- 08-11-2026: Swap points land first, pointing at the backoffice, before any core code. Why: the Umbraco package keeps working and its API report stays unchanged after every task.
- 08-11-2026: Tests flip to the core build (T12) only after every core swap point exists. Why: until then the core can't run the full suite.
