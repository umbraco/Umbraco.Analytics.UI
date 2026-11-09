import { defineMain } from "@storybook/web-components-vite/node";
import remarkGfm from "remark-gfm";
import { isPlatformBuildAlias } from "../vite.config.ts";

// Stories tagged "internal" document the package's own parts, not its public API. The published
// Storybook (`storybook build`) leaves them out; `storybook dev` shows them.
const hiddenTags = ["internal"];

export default defineMain({
    framework: "@storybook/web-components-vite",
    stories: ["../src/**/*.mdx", "../src/**/*.story.@(js|ts)"],
    addons: [
        // remark-gfm gives the MDX guides GitHub-style Markdown tables.
        { name: "@storybook/addon-docs", options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } } },
        "@storybook/addon-a11y",
    ],
    docs: {},
    experimental_indexers: (indexers, options) =>
        options.configType === "PRODUCTION" && !process.env["STORYBOOK_SHOW_INTERNAL"]
            ? (indexers ?? []).map((indexer) => ({
                  ...indexer,
                  createIndex: async (fileName, indexOptions) =>
                      (await indexer.createIndex(fileName, indexOptions)).filter((entry) => !entry.tags?.some((tag) => hiddenTags.includes(tag))),
              }))
            : indexers,
    viteFinal(config) {
        // The library build marks @umbraco-cms/* as external (the backoffice provides it at
        // runtime). Storybook has no backoffice, so it must bundle those imports instead.
        if (config.build?.rolldownOptions) {
            delete config.build.rolldownOptions.external;
        }
        // vite.config.ts aliases the #platform/* swap points straight to the external specifiers for the library build.
        // Storybook bundles those specifiers, so drop the aliases and let package.json `imports` resolve them.
        if (Array.isArray(config.resolve?.alias)) {
            config.resolve.alias = config.resolve.alias.filter((entry) => !isPlatformBuildAlias(entry));
        }
        return config;
    },
});
