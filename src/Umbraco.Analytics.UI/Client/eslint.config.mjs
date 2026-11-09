import tseslint from "typescript-eslint";
import lit from "eslint-plugin-lit";
import litA11y from "eslint-plugin-lit-a11y";
import wc from "eslint-plugin-wc";
import storybook from "eslint-plugin-storybook";

const sharedPatterns = [
    {
        regex: "external/chart\\.js/index",
        message: "Import the shared Chart.js by its bare specifier, @umbraco/analytics-ui/external/chart.js: a relative path misses the CMS cache-buster and loads a second copy.",
    },
    {
        regex: "^@umbraco-(engage|commerce|ai)/",
        message: "Shared components must not depend on a product.",
    },
];

const platformPatterns = [
    { regex: "^@umbraco-cms/backoffice/(context-api|observable-api|class-api|controller-api)$", message: "Import contexts and observable state from #platform/context." },
    { regex: "^lit(/|$)", message: "Import Lit from #platform/lit." },
    { regex: "^@umbraco-cms/backoffice/external/lit$", message: "Import Lit from #platform/lit." },
    // UUI's CSS assets (themes) are not code, so tests may load them directly.
    { regex: "^@umbraco-ui/uui(/(?!.*\\.css)|$)", message: "Import UUI from #platform/uui." },
    { regex: "^@umbraco-cms/backoffice/external/uui$", message: "Import UUI from #platform/uui." },
    { regex: "^chart\\.js(/|$)", message: "Import Chart.js from #platform/chart." },
    { regex: "^@umbraco/analytics-ui/external/chart\\.js$", message: "Import Chart.js from #platform/chart." },
    { regex: "^@umbraco-cms/backoffice/modal$", message: "Open modals through #platform/date-range-opener." },
    { regex: "^@umbraco-cms/backoffice/style$", message: "Use UUITextStyles from #platform/uui." },
    {
        regex: "^@umbraco-cms/backoffice/lit-element$",
        importNames: ["UmbLitElement"],
        message: "Extend UauiLitElement from #platform/base-element.",
    },
];

// A build's folder (platform/umbraco, platform/core) is reached only through #platform/*, never by relative path.
const buildFolderPatterns = [
    { regex: "(^|/)platform/(umbraco|core)(/|$)", message: "Import the build's files through #platform/*; only src/platform may reach platform/umbraco or platform/core directly." },
];

const umbracoFolderPatterns = [
    { regex: "(^|/)platform/umbraco(/|$)", message: "Specs run on the core build. A spec that needs the backoffice belongs in src/platform/umbraco/." },
];

export default tseslint.config(
    { ignores: ["node_modules", "types", "storybook-static", "../wwwroot"] },
    ...tseslint.configs.recommended,
    wc.configs["flat/recommended"],
    lit.configs["flat/recommended"],
    litA11y.configs.recommended,
    ...storybook.configs["flat/recommended"],
    {
        files: ["src/**/*.ts"],
        rules: { "no-restricted-imports": ["error", { patterns: sharedPatterns }] },
    },
    {
        // Lit, UUI, Chart.js and the backoffice base class are real imports only inside the platform folder (and the
        // examples, which show what a product writes). Everything else goes through #platform/* so a build can swap them.
        files: ["src/**/*.ts"],
        ignores: ["src/platform/**", "src/examples/**"],
        rules: { "no-restricted-imports": ["error", { patterns: [...platformPatterns, ...buildFolderPatterns, ...sharedPatterns] }] },
    },
    {
        // Specs and test helpers run on the core build, so they may use the core's files by relative path (its public
        // `registerUauiTranslations`, the translation reset) but never the Umbraco build's: what needs the backoffice
        // is a spec in src/platform/umbraco/.
        files: ["src/**/*.test.ts", "src/internal/test/**"],
        ignores: ["src/platform/**", "src/examples/**"],
        rules: { "no-restricted-imports": ["error", { patterns: [...platformPatterns, ...umbracoFolderPatterns, ...sharedPatterns] }] },
    },
    {
        // Storybook runs on the Umbraco build, so a story may use its test modal host.
        files: ["src/**/*.story.ts"],
        ignores: ["src/platform/**", "src/examples/**"],
        rules: { "no-restricted-imports": ["error", { patterns: [...platformPatterns, ...sharedPatterns] }] },
    },
    {
        // The shared external entry and its look are the only files that may import Chart.js directly.
        files: ["src/external/chart.js/index.ts", "src/external/chart.js/look.ts"],
        rules: {
            "no-restricted-imports": ["error", { patterns: [...platformPatterns.filter((p) => !p.regex.includes("chart")), ...sharedPatterns] }],
        },
    },
    {
        // Its own test imports the shared entry by the bare specifier (the one test of that entry), not chart.js itself.
        files: ["src/external/chart.js/look.test.ts"],
        rules: {
            "no-restricted-imports": ["error", { patterns: [...platformPatterns.filter((p) => !p.regex.includes("analytics-ui")), ...sharedPatterns] }],
        },
    },
);
