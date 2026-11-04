/// <reference types="vite/client" />
import { setCustomElementsManifest, type Preview } from "@storybook/web-components-vite";
import lightCss from "@umbraco-ui/uui/themes/light.css?inline";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import "@umbraco-ui/uui/styles/uui-font.css";
import "@umbraco-ui/uui/styles/uui-text.css";
import { html } from "@umbraco-cms/backoffice/external/lit";
// Registers every uui-* element, as the backoffice does
import "@umbraco-cms/backoffice/external/uui";
import { UmbIconRegistry } from "@umbraco-cms/backoffice/icon";
import { registerUauiLocalization } from "../src/internal/localization/register.js";
import backofficeEn from "../src/internal/test/backoffice-en.js";
import customElements from "../custom-elements.json";

// Same theme switcher as Umbraco UI's Storybook, so components are checked against every backoffice theme
const themes: Record<string, string> = {
    light: lightCss,
    dark: darkCss,
    "high-contrast": highContrastCss,
};

let themeStyleEl: HTMLStyleElement | null = null;
let scopedThemesEl: HTMLStyleElement | null = null;

/**
 * Each theme's tokens again, scoped to `[data-uaui-sb-theme="<name>"]` instead of `:root`. A docs page renders every
 * story of a component in one document, so a story that asks for a theme (e.g. a "Dark" story) must not switch the
 * whole page: each story's wrapper carries its own theme instead.
 */
function ensureScopedThemes() {
    if (scopedThemesEl) return;
    scopedThemesEl = document.createElement("style");
    scopedThemesEl.id = "uui-theme-scoped";
    scopedThemesEl.textContent = Object.entries(themes)
        .map(([name, css]) => css.replaceAll(":root", `[data-uaui-sb-theme="${name}"]`))
        .join("\n");
    document.head.appendChild(scopedThemesEl);
}

function applyTheme(theme: string) {
    if (!themeStyleEl) {
        themeStyleEl = document.createElement("style");
        themeStyleEl.id = "uui-theme";
        document.head.appendChild(themeStyleEl);
    }
    themeStyleEl.textContent = themes[theme] ?? lightCss;
    // The backoffice sets both on its body. Without the colour, text outside a component (a page's own
    // headings, a uui-box headline) falls back to the browser's black, unreadable on the dark themes.
    document.body.style.background = "var(--uui-color-background)";
    document.body.style.color = "var(--uui-color-text)";
}

export const globalTypes = {
    theme: {
        name: "Theme",
        defaultValue: "light",
        toolbar: {
            icon: "paintbrush",
            items: [
                { value: "light", title: "Light" },
                { value: "dark", title: "Dark" },
                { value: "high-contrast", title: "High Contrast" },
            ],
            dynamicTitle: true,
        },
    },
};

const preview: Preview = {
    parameters: {
        // Like Umbraco UI's Storybook: the guides first, then the public sections, worked examples, internals last.
        options: {
            storySort: {
                order: [
                    "Guides",
                    ["Getting started", "Theming and palette", "Events, loading and errors", "Translations", "Versioning"],
                    "Components",
                    "Foundation",
                    "Examples",
                    "Internal",
                ],
            },
        },
        docs: {
            source: {
                excludeDecorators: true,
                format: "html",
            },
        },
    },
    tags: ["autodocs"],
    decorators: [
        (story, context) => {
            const theme = context.globals["theme"] ?? "light";
            ensureScopedThemes();
            // A story on its own fills the canvas, so the page takes its theme. On a docs page the page stays
            // light and each story's wrapper carries its own theme, so a "Dark" story doesn't turn the others dark.
            applyTheme(context.viewMode === "docs" ? "light" : theme);
            // On a docs page a story in another theme gets that theme's background, so it reads as a panel.
            const panel = context.viewMode === "docs" && theme !== "light";
            return html`<div
                class="uui-font uui-text"
                data-uaui-sb-theme=${theme}
                style=${panel
                    ? "color: var(--uui-color-text); background: var(--uui-color-background); padding: var(--uui-size-space-5); border-radius: var(--uui-border-radius)"
                    : "color: var(--uui-color-text)"}>
                ${story()}
            </div>`;
        },
    ],
};

// Stories show icons, not blanks: the backoffice icon registry is not loaded here, so register
// just the icons the stories use. Add a line when a story needs another icon.
const storyIconNames = ["icon-search", "icon-chart", "icon-coins", "icon-inbox", "icon-shopping-basket", "icon-user", "icon-calendar", "icon-navigation-left", "icon-navigation-right", "icon-delete", "icon-check", "icon-time", "icon-receipt-dollar", "icon-calculator", "icon-trending-up-down", "icon-alert", "icon-wrong", "icon-undo", "icon-users", "icon-tag", "icon-block"];
const icons = import.meta.glob(
    "../node_modules/@umbraco-cms/backoffice/dist-cms/packages/core/icon-registry/icons/{icon-search,icon-chart,icon-coins,icon-inbox,icon-shopping-basket,icon-user,icon-calendar,icon-navigation-left,icon-navigation-right,icon-delete,icon-check,icon-time,icon-receipt-dollar,icon-calculator,icon-trending-up-down,icon-alert,icon-wrong,icon-undo,icon-users,icon-tag,icon-block}.js",
);
if (Object.keys(icons).length < storyIconNames.length) {
    throw new Error(`Storybook icon glob found ${Object.keys(icons).length} of ${storyIconNames.length} icons`);
}
const iconRegistry = new UmbIconRegistry();
iconRegistry.setIcons(
    Object.entries(icons).map(([path, load]) => ({
        name: path.split("/").pop()!.replace(".js", ""),
        path: load as () => Promise<{ default: string }>,
    })),
);
iconRegistry.attach(document.body);

// The backoffice's layout sizes (umb-css.css in Umbraco CMS), which umb-body-layout's header and footer read.
document.documentElement.style.setProperty("--umb-header-layout-height", "70px");
document.documentElement.style.setProperty("--umb-footer-layout-height", "54px");

// Stories show text, not keys: register translations like the backoffice would.
registerUauiLocalization(backofficeEn);

setCustomElementsManifest(customElements);

export default preview;
