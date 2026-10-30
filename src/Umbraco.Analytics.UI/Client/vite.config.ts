import { defineConfig } from "vite";

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
        rollupOptions: {
            // Provided by the backoffice at runtime. chart.js is deliberately NOT external:
            // one private copy ships inside this package so products never load their own.
            external: [/^@umbraco-cms\//],
        },
    }
});
