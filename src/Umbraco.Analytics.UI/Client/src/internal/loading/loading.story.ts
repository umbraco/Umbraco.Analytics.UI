import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, html, LitElement, nothing } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../story/internal.js";
import { getLoadingMode } from "./loading-mode.js";
import "./skeleton.element.js";
import "./loading-bar.element.js";

/** Story-only element: a stand-in data element that uses the loading parts as a chart or table will. */
class UauiLoadingDemoElement extends LitElement {
    static override properties = { loading: { type: Boolean }, rows: { type: Array } };
    loading = false;
    rows: string[] = [];

    override render() {
        const mode = getLoadingMode(this.loading, this.rows.length > 0);
        return html`<div class="region" aria-busy=${this.loading ? "true" : "false"}>
            ${mode === "reload" ? html`<uaui-loading-bar></uaui-loading-bar>` : nothing}
            ${mode === "skeleton"
                ? html`<uaui-skeleton></uaui-skeleton>`
                : html`<ul>
                      ${this.rows.map((row) => html`<li>${row}</li>`)}
                  </ul>`}
        </div>`;
    }

    static override styles = css`
        :host {
            display: block;
            --_uaui-skeleton-height: 160px;
        }
        .region {
            position: relative;
            box-sizing: border-box;
            min-height: var(--_uaui-skeleton-height);
            padding: var(--uui-size-space-4);
            border-radius: var(--uui-border-radius-3);
            background: var(--uui-color-surface);
            color: var(--uui-color-text);
            overflow: hidden;
        }
        uaui-skeleton {
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

if (!customElements.get("uaui-loading-demo")) {
    customElements.define("uaui-loading-demo", UauiLoadingDemoElement);
}

const rows = ["Home", "Contact", "Pricing"];

const meta: Meta = {
    title: "Internal/Loading",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uaui-skeleton` and `uaui-loading-bar` are the loading parts the data elements share.") } },
    },
};

export default meta;
type Story = StoryObj;

/** First load, no data yet: a skeleton the height the host declares with `--_uaui-skeleton-height`. */
export const FirstLoad: Story = {
    render: () => html`<uaui-loading-demo loading></uaui-loading-demo>`,
};

/** Reload with data shown: the old data stays, under a thin bar on the top edge. */
export const Reload: Story = {
    render: () => html`<uaui-loading-demo loading .rows=${rows}></uaui-loading-demo>`,
};

/** Loaded: neither part shows. */
export const Loaded: Story = {
    render: () => html`<uaui-loading-demo .rows=${rows}></uaui-loading-demo>`,
};

/** Every state together, for checking all three themes at once. */
export const AllStates: Story = {
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-4)">
            <uaui-loading-demo loading></uaui-loading-demo>
            <uaui-loading-demo loading .rows=${rows}></uaui-loading-demo>
            <uaui-loading-demo .rows=${rows}></uaui-loading-demo>
        </div>`,
};

/** Smaller blocks, e.g. table rows: set an inline height and width on each skeleton. */
export const SkeletonRows: Story = {
    render: () =>
        html`<div style="background: var(--uui-color-surface); padding: var(--uui-size-space-4); display: grid; gap: 12px">
            ${[85, 80, 75, 70].map(
                (width) => html`<uaui-skeleton style="height: 16px; width: ${width}%"></uaui-skeleton>`,
            )}
        </div>`,
};
