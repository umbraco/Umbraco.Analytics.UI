import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, html, LitElement } from "@umbraco-cms/backoffice/external/lit";
import { uanThemeTokens } from "./tokens.css.js";

const tokens = [
    "series-1",
    "series-2",
    "series-3",
    "series-4",
    "compare",
    "tint-positive",
    "tint-negative",
    "tint-neutral",
    "text-positive",
    "text-negative",
    "text-neutral",
];

/** Story-only element: shows each resolved token, the same way a component sees it. */
class UanThemeSwatchesElement extends LitElement {
    override render() {
        return html`<div class="grid">
            ${tokens.map(
                (name) => html`<div class="item">
                    <div class="swatch" style="background: var(--_uan-${name})"></div>
                    <code>--uan-${name}</code>
                </div>`,
            )}
        </div>`;
    }

    static override styles = [
        uanThemeTokens,
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

if (!customElements.get("uan-theme-swatches")) {
    customElements.define("uan-theme-swatches", UanThemeSwatchesElement);
}

const meta: Meta = {
    title: "Foundation/Theme",
    render: () => html`<uan-theme-swatches></uan-theme-swatches>`,
};

export default meta;
type Story = StoryObj;

/** Switch the toolbar theme to check light, dark and high contrast. */
export const Swatches: Story = {};

/** A parent sets `--uan-series-1`, so the first swatch follows it. */
export const Overridden: Story = {
    render: () => html`<div style="--uan-series-1: hotpink"><uan-theme-swatches></uan-theme-swatches></div>`,
};
