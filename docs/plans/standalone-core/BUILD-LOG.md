# Build log: Standalone core package

- **T1** `0adf2cb`: `#platform/lit|uui|chart|base-element` swap points. Verified: build, test, lint, check:api, storybook:build pass; API reports and `umbraco-analytics-ui.js` byte-identical to HEAD; a scratch copy with chart files and kpi-tile switched over built with no namespace shim. Took 3 review rounds.
- **T2** `38817a2`: 193 files import through `#platform/*`; lint rule bans the real packages outside `src/platform/`, `src/examples/`, `.storybook/`. Verified: lint, test (2660 passed), build, check:api, storybook:build pass; every `wwwroot` .js byte-identical to HEAD; public types have no `UauiLitElement`. SAC-13 AC4 green (2 scenarios). 2 review rounds.
