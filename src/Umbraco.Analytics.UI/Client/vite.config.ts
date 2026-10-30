import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

// Same browser matrix as Umbraco UI: Chromium locally, all three engines on CI.
const isCI = process.env.CI === "true" || !!process.env.TF_BUILD;
const browserInstances = isCI
    ? [{ browser: "chromium" as const }, { browser: "firefox" as const }, { browser: "webkit" as const }]
    : [{ browser: "chromium" as const }];

export default defineConfig({
    build: {
        lib: {
            // The translations are a second entry so the backoffice can load lang/en.js on its own.
            entry: {
                "umbraco-analytics-ui": "src/index.ts",
                "lang/en": "src/lang/en.ts",
            },
            formats: ["es"],
            fileName: (_format: string, entryName: string) => `${entryName}.js`
        },
        outDir: '../wwwroot/',
        emptyOutDir: true,
        sourcemap: true,
        rolldownOptions: {
            // Provided by the backoffice at runtime. chart.js is deliberately NOT external:
            // one private copy ships inside this package so products never load their own.
            external: [/^@umbraco-cms\//],
        },
    },
    test: {
        include: ["src/**/*.test.ts"],
        // Three browser engines run at once on CI, and a canvas screenshot waits for the chart to settle,
        // so give a loaded machine more time than the defaults (15s per test, 1s per poll).
        testTimeout: 30_000,
        expect: { poll: { timeout: 5_000 } },
        browser: {
            enabled: true,
            provider: playwright(),
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
