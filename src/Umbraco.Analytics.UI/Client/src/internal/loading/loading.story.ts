import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, html, LitElement, nothing } from "@umbraco-cms/backoffice/external/lit";
import { getLoadingMode } from "./loading-mode.js";
import "./skeleton.element.js";
import "./loading-bar.element.js";

/** Story-only element: a stand-in data element that uses the loading parts as a chart or table will. */
class UaxLoadingDemoElement extends LitElement {
    static override properties = { loading: { type: Boolean }, rows: { type: Array } };
    loading = false;
    rows: string[] = [];

    override render() {
        const mode = getLoadingMode(this.loading, this.rows.length > 0);
        return html`<div class="region" aria-busy=${this.loading ? "true" : "false"}>
            ${mode === "reload" ? html`<uax-loading-bar></uax-loading-bar>` : nothing}
            ${mode === "skeleton"
                ? html`<uax-skeleton></uax-skeleton>`
                : html`<ul>
                      ${this.rows.map((row) => html`<li>${row}</li>`)}
                  </ul>`}
        </div>`;
    }

    static override styles = css`
        :host {
            display: block;
            --_uax-skeleton-height: 160px;
        }
        .region {
            position: relative;
            box-sizing: border-box;
            min-height: var(--_uax-skeleton-height);
            padding: var(--uui-size-space-4);
            border-radius: var(--uui-border-radius-3);
            background: var(--uui-color-surface);
            color: var(--uui-color-text);
            overflow: hidden;
        }
        uax-skeleton {
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

if (!customElements.get("uax-loading-demo")) {
    customElements.define("uax-loading-demo", UaxLoadingDemoElement);
}

const rows = ["Home", "Contact", "Pricing"];

const meta: Meta = {
    title: "Internal/Loading",
};

export default meta;
type Story = StoryObj;

/** First load, no data yet: a skeleton the height the host declares with `--_uax-skeleton-height`. */
export const FirstLoad: Story = {
    render: () => html`<uax-loading-demo loading></uax-loading-demo>`,
};

/** Reload with data shown: the old data stays, under a thin bar on the top edge. */
export const Reload: Story = {
    render: () => html`<uax-loading-demo loading .rows=${rows}></uax-loading-demo>`,
};

/** Loaded: neither part shows. */
export const Loaded: Story = {
    render: () => html`<uax-loading-demo .rows=${rows}></uax-loading-demo>`,
};

/** Every state together, for checking all three themes at once. */
export const AllStates: Story = {
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-4)">
            <uax-loading-demo loading></uax-loading-demo>
            <uax-loading-demo loading .rows=${rows}></uax-loading-demo>
            <uax-loading-demo .rows=${rows}></uax-loading-demo>
        </div>`,
};

/** Smaller blocks, e.g. table rows: set an inline height and width on each skeleton. */
export const SkeletonRows: Story = {
    render: () =>
        html`<div style="background: var(--uui-color-surface); padding: var(--uui-size-space-4); display: grid; gap: 12px">
            ${[85, 80, 75, 70].map(
                (width) => html`<uax-skeleton style="height: 16px; width: ${width}%"></uax-skeleton>`,
            )}
        </div>`,
};
