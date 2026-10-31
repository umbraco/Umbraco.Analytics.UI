import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import "./share-bar.element.js";
import type { UauiShareBarElement } from "./share-bar.element.js";

const meta: Meta<UauiShareBarElement> = {
    title: "Internal/Share bar",
    component: "uaui-share-bar",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uaui-share-bar` is the bar under a share value.") } },
    },
    args: { percent: 60, color: 1 },
    render: (args) => html`<div style="width: 240px"><uaui-share-bar .percent=${args.percent} .color=${args.color}></uaui-share-bar></div>`,
};

export default meta;
type Story = StoryObj<UauiShareBarElement>;

/** One bar. Change `percent` and `color` in the controls. */
export const Default: Story = {};

/** The four palette slots, at different fills. */
export const Colours: Story = {
    render: () =>
        html`<div style="width: 240px; display: grid; gap: 12px">
            ${([1, 2, 3, 4] as const).map((color) => html`<uaui-share-bar .percent=${100 - color * 20} .color=${color}></uaui-share-bar>`)}
        </div>`,
};
