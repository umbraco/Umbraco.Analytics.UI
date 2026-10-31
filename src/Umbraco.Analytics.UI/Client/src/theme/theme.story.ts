import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, html, LitElement } from "@umbraco-cms/backoffice/external/lit";
import { UauiPaletteStyles } from "./index.js";

const tokens = [
    "series-1",
    "series-2",
    "series-3",
    "series-4",
    "compare",
    "tint-positive",
    "tint-negative",
    "tint-neutral",
    "tint-warning",
    "text-positive",
    "text-negative",
    "text-neutral",
    "text-warning",
];

/** Story-only element: shows each resolved token, the same way a component sees it. */
class UauiThemeSwatchesElement extends LitElement {
    override render() {
        return html`<div class="grid">
            ${tokens.map(
                (name) => html`<div class="item">
                    <div class="swatch" style="background: var(--uaui-color-${name})"></div>
                    <code>--uaui-${name}</code>
                </div>`,
            )}
        </div>`;
    }

    static override styles = [
        UauiPaletteStyles,
        css`
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, 160px);
                gap: var(--uui-size-space-4);
            }
            .swatch {
                height: 64px;
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius);
            }
            code {
                color: var(--uui-color-text);
                font-size: var(--uui-type-small-size);
            }
        `,
    ];
}

if (!customElements.get("uaui-theme-swatches")) {
    customElements.define("uaui-theme-swatches", UauiThemeSwatchesElement);
}

const meta: Meta = {
    title: "Foundation/Theme",
    render: () => html`<uaui-theme-swatches></uaui-theme-swatches>`,
};

export default meta;
type Story = StoryObj;

/** Switch the toolbar theme to check light, dark and high contrast. */
export const Swatches: Story = {};

/** A parent sets `--uaui-series-1`, so the first swatch follows it. */
export const Overridden: Story = {
    render: () => html`<div style="--uaui-series-1: hotpink"><uaui-theme-swatches></uaui-theme-swatches></div>`,
};
