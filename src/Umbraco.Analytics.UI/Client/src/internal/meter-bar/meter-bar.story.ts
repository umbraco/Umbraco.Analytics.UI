import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../story/internal.js";
import "./meter-bar.element.js";
import type { UauiMeterBarElement } from "./meter-bar.element.js";

const meta: Meta<UauiMeterBarElement> = {
    title: "Internal/Meter bar",
    component: "uaui-meter-bar",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uaui-meter-bar` is the bar under a share or progress value.") } },
    },
    args: { percent: 60, color: 1 },
    render: (args) => html`<div style="width: 240px"><uaui-meter-bar .percent=${args.percent} .color=${args.color}></uaui-meter-bar></div>`,
};

export default meta;
type Story = StoryObj<UauiMeterBarElement>;

/** One bar. Change `percent` and `color` in the controls. */
export const Default: Story = {};

/** The four palette slots, at different fills. */
export const Colours: Story = {
    render: () =>
        html`<div style="width: 240px; display: grid; gap: 12px">
            ${([1, 2, 3, 4] as const).map((color) => html`<uaui-meter-bar .percent=${100 - color * 20} .color=${color}></uaui-meter-bar>`)}
        </div>`,
};
