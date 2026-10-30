import tseslint from "typescript-eslint";
import lit from "eslint-plugin-lit";
import litA11y from "eslint-plugin-lit-a11y";
import wc from "eslint-plugin-wc";
import storybook from "eslint-plugin-storybook";

export default tseslint.config(
    { ignores: ["node_modules", "types", "storybook-static", "../wwwroot"] },
    ...tseslint.configs.recommended,
    wc.configs["flat/recommended"],
    lit.configs["flat/recommended"],
    litA11y.configs.recommended,
    ...storybook.configs["flat/recommended"],
    {
        files: ["src/**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            regex: "^lit(/|$)",
                            message: "Import Lit from @umbraco-cms/backoffice/external/lit so we share the backoffice's copy.",
                        },
                        {
                            regex: "^@umbraco-(engage|commerce|ai)/",
                            message: "Shared components must not depend on a product.",
                        },
                    ],
                },
            ],
        },
    },
);
