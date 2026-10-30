import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, html, LitElement, nothing } from "@umbraco-cms/backoffice/external/lit";
import { getLoadingMode } from "./loading-mode.js";
import "./skeleton.element.js";
import "./loading-bar.element.js";

/** Story-only element: a stand-in data element that uses the loading parts as a chart or table will. */
class UanLoadingDemoElement extends LitElement {
    static override properties = { loading: { type: Boolean }, rows: { type: Array } };
    loading = false;
    rows: string[] = [];

    override render() {
        const mode = getLoadingMode(this.loading, this.rows.length > 0);
        return html`<div class="region" aria-busy=${this.loading ? "true" : "false"}>
            ${mode === "reload" ? html`<uan-loading-bar></uan-loading-bar>` : nothing}
            ${mode === "skeleton"
                ? html`<uan-skeleton></uan-skeleton>`
                : html`<ul>
                      ${this.rows.map((row) => html`<li>${row}</li>`)}
                  </ul>`}
        </div>`;
    }

    static override styles = css`
        :host {
            display: block;
            --_uan-skeleton-height: 160px;
        }
        .region {
            position: relative;
            box-sizing: border-box;
            min-height: var(--_uan-skeleton-height);
            padding: var(--uui-size-space-4);
            border-radius: var(--uui-border-radius-3);
            background: var(--uui-color-surface);
            color: var(--uui-color-text);
            overflow: hidden;
        }
        uan-skeleton {
            height: 128px;
        }
        ul {
            margin: 0;
            padding: 0;
            list-style: none;
        }
        li {
            padding: var(--uui-size-space-2) 0;
        }
    `;
}

if (!customElements.get("uan-loading-demo")) {
    customElements.define("uan-loading-demo", UanLoadingDemoElement);
}

const rows = ["Home", "Contact", "Pricing"];

const meta: Meta = {
    title: "Internal/Loading",
};

export default meta;
type Story = StoryObj;

/** First load, no data yet: a skeleton the height the host declares with `--_uan-skeleton-height`. */
export const FirstLoad: Story = {
    render: () => html`<uan-loading-demo loading></uan-loading-demo>`,
};

/** Reload with data shown: the old data stays, under a thin bar on the top edge. */
export const Reload: Story = {
    render: () => html`<uan-loading-demo loading .rows=${rows}></uan-loading-demo>`,
};

/** Loaded: neither part shows. */
export const Loaded: Story = {
    render: () => html`<uan-loading-demo .rows=${rows}></uan-loading-demo>`,
};

/** Every state together, for checking all three themes at once. */
export const AllStates: Story = {
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-4)">
            <uan-loading-demo loading></uan-loading-demo>
            <uan-loading-demo loading .rows=${rows}></uan-loading-demo>
            <uan-loading-demo .rows=${rows}></uan-loading-demo>
        </div>`,
};

/** Smaller blocks, e.g. table rows: set an inline height and width on each skeleton. */
export const SkeletonRows: Story = {
    render: () =>
        html`<div style="background: var(--uui-color-surface); padding: var(--uui-size-space-4); display: grid; gap: 12px">
            ${[85, 80, 75, 70].map(
                (width) => html`<uan-skeleton style="height: 16px; width: ${width}%"></uan-skeleton>`,
            )}
        </div>`,
};
