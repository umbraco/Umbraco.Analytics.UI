import { defineConfig } from "vite";
import { minifyTemplates } from "./devops/minify-templates.ts";
import { coreTestAlias } from "./vite.config.ts";

/**
 * The core build: the same source as the Umbraco build, with #platform/* resolving to src/platform/core/ (the same
 * map the core test project uses). One file, dist/core/analytics-ui-core.js, with the public API plus the core's own
 * translations and fallback icons.
 * Lit (every subpath), UUI and Chart.js stay external: the host page provides them, and the core's own re-exports in
 * src/platform/core/ are named lists so the bundler adds no namespace shim for them. `check:size` verifies the output.
 */
export default defineConfig({
    resolve: { alias: coreTestAlias },
    // The Umbraco build copies public/ (umbraco-package.json) next to its output; the core has no manifest.
    publicDir: false,
    plugins: [minifyTemplates()],
    build: {
        lib: {
            entry: { "analytics-ui-core": "src/platform/core/index.ts" },
            formats: ["es"],
            fileName: (_format: string, entryName: string) => `${entryName}.js`,
        },
        outDir: "dist/core",
        emptyOutDir: true,
        sourcemap: true,
        rolldownOptions: {
            external: [/^lit(\/.*)?$/, /^@umbraco-ui\/uui(\/.*)?$/, /^chart\.js(\/.*)?$/],
            // Keep `/*! ... */` comments: the Lucide icon licence in icons.ts has to ship with the file.
            output: { comments: { legal: true } },
        },
    },
});
