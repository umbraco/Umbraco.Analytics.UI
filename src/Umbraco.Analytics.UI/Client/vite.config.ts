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
            entry: "src/index.ts",
            formats: ["es"],
            fileName: "umbraco-analytics-ui"
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
