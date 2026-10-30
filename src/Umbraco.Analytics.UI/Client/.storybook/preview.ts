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
import { registerUanLocalization } from "../src/internal/localization/register.js";
import backofficeEn from "../src/internal/test/backoffice-en.js";
import customElements from "../custom-elements.json";

// Same theme switcher as Umbraco UI's Storybook, so components are checked against every backoffice theme
const themes: Record<string, string> = {
    light: lightCss,
    dark: darkCss,
    "high-contrast": highContrastCss,
};

let themeStyleEl: HTMLStyleElement | null = null;

function applyTheme(theme: string) {
    if (!themeStyleEl) {
        themeStyleEl = document.createElement("style");
        themeStyleEl.id = "uui-theme";
        document.head.appendChild(themeStyleEl);
    }
    themeStyleEl.textContent = themes[theme] ?? lightCss;
    document.body.style.background = "var(--uui-color-background)";
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
            applyTheme(context.globals["theme"] ?? "light");
            return html`<div class="uui-font uui-text">${story()}</div>`;
        },
    ],
};

// Stories show text, not keys: register translations like the backoffice would.
registerUanLocalization(backofficeEn);

setCustomElementsManifest(customElements);

export default preview;
