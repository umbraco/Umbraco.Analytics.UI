import { defineMain } from "@storybook/web-components-vite/node";

export default defineMain({
    framework: "@storybook/web-components-vite",
    stories: ["../src/**/*.mdx", "../src/**/*.story.@(js|ts)"],
    addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
    docs: {},
    viteFinal(config) {
        // The library build marks @umbraco-cms/* as external (the backoffice provides it at
        // runtime). Storybook has no backoffice, so it must bundle those imports instead.
        if (config.build?.rolldownOptions) {
            delete config.build.rolldownOptions.external;
        }
        return config;
    },
});
