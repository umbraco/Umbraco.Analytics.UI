// Chart.js, re-exported as is, like the backoffice's `@umbraco-cms/backoffice/external/lit`.
// Built as its own entry (`external/chart.js/index.js`) and mapped in the import map as
// `@umbraco/analytics-ui/external/chart.js`, so a site loads one copy of Chart.js: ours and every product's.
// Our own code imports it by that bare specifier (lint enforced), never "chart.js" or a relative path: the CMS adds a
// cache-buster query to import map URLs, so a relative import would load a second copy (see vite.config.ts).
// This is Chart.js's API and types, not ours: it is kept out of `src/index.ts` and the API report.
// Its major is part of our compatibility promise, so a Chart.js major only comes with a CMS major.
export * from "chart.js";
