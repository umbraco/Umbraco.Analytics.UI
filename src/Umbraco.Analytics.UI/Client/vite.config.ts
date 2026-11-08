import { configDefaults, defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath } from "node:url";
import { minifyTemplates } from "./devops/minify-templates.ts";
import { lintText } from "./devops/lint-text-command.ts";

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

/**
 * The Umbraco build's swap points. They are aliased straight to the external specifiers, not to the re-export files
 * in src/platform/umbraco/ (which tsc and tests use through package.json `imports`): an `export *` from an external
 * module makes the bundler add a namespace-merge shim. Only valid where those specifiers stay external, which is the
 * library build alone: Storybook's build bundles them, so .storybook/main.ts drops these aliases (see isPlatformBuildAlias).
 */
const platformBuildAlias = [
    { find: /^#platform\/lit$/, replacement: "@umbraco-cms/backoffice/external/lit" },
    { find: /^#platform\/uui$/, replacement: "@umbraco-cms/backoffice/external/uui" },
    { find: /^#platform\/chart$/, replacement: CHART_JS_ENTRY },
];

/** The core test project's swap points: #platform/* resolves to src/platform/core/ (the Umbraco project uses package.json `imports`). */
export const coreTestAlias = ["lit", "uui", "chart", "base-element", "context", "date-range-opener"].map((name) => ({
    find: new RegExp(`^#platform/${name}$`),
    replacement: fileURLToPath(new URL(`./src/platform/core/${name}.ts`, import.meta.url)),
}));

/** The specs that run against the backoffice (the `umbraco` Vitest project); every other spec runs in `core`. */
const umbracoSpecs = ["src/platform/umbraco/**/*.test.ts", "src/examples/**/*.test.ts"];

/**
 * The core project's guard: any `@umbraco-cms/*` import from any module a core spec loads throws, so a spec can't
 * pass on the backoffice by accident. Type-only imports are erased before this applies.
 */
export const backofficeBlockedAlias = [
    { find: /^@umbraco-cms\/.*$/, replacement: fileURLToPath(new URL("./vitest.backoffice-blocked.ts", import.meta.url)) },
];

/** True for an alias from platformBuildAlias, so a build that bundles the specifiers (Storybook) can remove them. */
export const isPlatformBuildAlias = (entry: { find: string | RegExp }): boolean =>
    platformBuildAlias.some((alias) => String(alias.find) === String(entry.find));

// Same browser matrix as Umbraco UI: Chromium locally, all three engines on CI.
const isCI = process.env.CI === "true" || !!process.env.TF_BUILD;
const browserInstances = isCI
    ? [{ browser: "chromium" as const }, { browser: "firefox" as const }, { browser: "webkit" as const }]
    : [{ browser: "chromium" as const }];

export default defineConfig(({ command }) => ({
    resolve: { alias: command === "build" ? [...platformBuildAlias, ...chartJsAlias] : chartJsAlias },
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
        // Two projects share the options below. `core` is the default: every spec runs against the core's swap points
        // (#platform/* resolves to src/platform/core/) with no backoffice, so a spec can't pass on backoffice state.
        // `umbraco` runs what is about the backoffice itself: src/platform/umbraco/ (the swap points, the package
        // manifest, localization extensions, the smoke set) and src/examples/, whose product-style pages extend UmbLitElement.
        projects: [
            {
                extends: true,
                resolve: { alias: [...coreTestAlias, ...backofficeBlockedAlias] },
                test: {
                    name: "core",
                    include: ["src/**/*.test.ts"],
                    // Timing specs are flaky while three engines share a small CI runner, so CI runs them alone
                    // (`npm run test:perf`, vitest.perf.config.ts). Locally they stay in the normal run.
                    exclude: [...configDefaults.exclude, ...umbracoSpecs, ...(isCI ? ["src/internal/perf/**"] : [])],
                    // Per project, not in the shared options: a project's setupFiles are appended to the root's, so a
                    // root entry would run the backoffice setup in the core project too.
                    setupFiles: ["./vitest.setup.core.ts"],
                },
            },
            {
                extends: true,
                test: { name: "umbraco", include: umbracoSpecs, setupFiles: ["./vitest.setup.ts"] },
            },
        ],
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
            commands: { lintText },
        },
        onConsoleLog: (log: string) => {
            if (log.includes("Lit is in dev mode")) return false;
            return undefined;
        },
    },
}));
