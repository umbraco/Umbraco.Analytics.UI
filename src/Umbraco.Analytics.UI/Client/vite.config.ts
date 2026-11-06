import { configDefaults, defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath } from "node:url";
import { minifyTemplates } from "./devops/minify-templates.ts";

/**
 * The shared Chart.js entry, as products import it. Our own code imports this bare specifier too, never a relative path:
 * the CMS stamps a cache-buster (`?umb__rnd=...`) on every import map URL, so a relative import from our main bundle would
 * resolve to a different URL than the product's `@umbraco/analytics-ui/external/chart.js`, and the browser would load
 * Chart.js twice. The build keeps it external (the import map resolves it); tests, tsc and Storybook alias it to the source.
 */
export const CHART_JS_ENTRY = "@umbraco/analytics-ui/external/chart.js";
export const chartJsAlias = [
    { find: /^@umbraco\/analytics-ui\/external\/chart\.js$/, replacement: fileURLToPath(new URL("./src/external/chart.js/index.ts", import.meta.url)) },
];

// Same browser matrix as Umbraco UI: Chromium locally, all three engines on CI.
const isCI = process.env.CI === "true" || !!process.env.TF_BUILD;
const browserInstances = isCI
    ? [{ browser: "chromium" as const }, { browser: "firefox" as const }, { browser: "webkit" as const }]
    : [{ browser: "chromium" as const }];

export default defineConfig({
    resolve: { alias: chartJsAlias },
    // Build only: shrinks the text of our css and html templates to keep the bundle in budget (see check:size).
    plugins: [minifyTemplates()],
    build: {
        lib: {
            // The translations are a second entry so the backoffice can load lang/en.js on its own.
            // Chart.js is a third, `external/chart.js/index.js`, mapped as `@umbraco/analytics-ui/external/chart.js`
            // (like the backoffice's `external/lit`). Our chart imports it by that bare specifier too, kept external
            // below, so the main bundle imports it through the import map and a site loads Chart.js once.
            entry: {
                "umbraco-analytics-ui": "src/index.ts",
                "lang/en": "src/lang/en.ts",
                "external/chart.js/index": "src/external/chart.js/index.ts",
            },
            formats: ["es"],
            fileName: (_format: string, entryName: string) => `${entryName}.js`
        },
        outDir: '../wwwroot/',
        emptyOutDir: true,
        sourcemap: true,
        rolldownOptions: {
            // Provided by the backoffice at runtime, and our own Chart.js entry, resolved by the import map.
            // chart.js itself is NOT external: it is bundled into the external/chart.js entry, the site's one copy.
            // `check:size` fails if the main bundle imports `./external/` instead of the bare specifier.
            external: [/^@umbraco-cms\//, CHART_JS_ENTRY],
        },
    },
    test: {
        include: ["src/**/*.test.ts"],
        // Timing specs are flaky while three engines share a small CI runner, so CI runs them alone
        // (`npm run test:perf`, vitest.perf.config.ts). Locally they stay in the normal run.
        exclude: isCI ? [...configDefaults.exclude, "src/internal/perf/**"] : configDefaults.exclude,
        // Three browser engines run at once on CI, and a canvas screenshot waits for the chart to settle,
        // so give a loaded machine more time than the defaults (15s per test, 1s per poll).
        testTimeout: 30_000,
        expect: { poll: { timeout: 5_000 } },
        browser: {
            enabled: true,
            // Hour tests need a time zone with DST and a fixed locale, whatever machine runs them.
            provider: playwright({ contextOptions: { timezoneId: "Europe/Copenhagen", locale: "en-US" } }),
            instances: browserInstances,
            headless: true,
        },
        setupFiles: ["./vitest.setup.ts"],
        onConsoleLog: (log: string) => {
            if (log.includes("Lit is in dev mode")) return false;
            return undefined;
        },
    },
});
