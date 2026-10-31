import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

// The timing specs on their own: Chromium only, one file at a time, so nothing else competes for the CPU.
// CI excludes them from the main run (vite.config.ts) and runs this config as a separate step.
export default defineConfig({
    test: {
        include: ["src/internal/perf/**/*.test.ts"],
        testTimeout: 30_000,
        fileParallelism: false,
        browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" as const }],
            headless: true,
        },
        setupFiles: ["./vitest.setup.ts"],
        onConsoleLog: (log: string) => {
            if (log.includes("Lit is in dev mode")) return false;
            return undefined;
        },
    },
});
