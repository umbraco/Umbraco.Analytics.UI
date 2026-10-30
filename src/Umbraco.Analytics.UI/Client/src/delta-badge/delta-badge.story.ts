import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UanDeltaBadgeElement } from "./delta-badge.element.js";
import "./delta-badge.element.js";

const meta: Meta<UanDeltaBadgeElement> = {
    title: "Components/Delta Badge",
    component: "uan-delta-badge",
    args: {
        value: 12.4,
        unit: "percent",
        lowerIsBetter: false,
        maxDecimals: 1,
    },
    argTypes: {
        unit: { control: "inline-radio", options: ["percent", "points"] },
    },
    render: (args) =>
        html`<uan-delta-badge
            .value=${args.value}
            .unit=${args.unit}
            .lowerIsBetter=${args.lowerIsBetter}
            .maxDecimals=${args.maxDecimals}></uan-delta-badge>`,
};

export default meta;
type Story = StoryObj<UanDeltaBadgeElement>;

export const Increase: Story = {};

export const Decrease: Story = { args: { value: -3 } };

export const NoChange: Story = { args: { value: 0.02 } };

/** A fall in refund rate is good, so it shows green. */
export const LowerIsBetter: Story = { args: { value: -1.2, unit: "points", lowerIsBetter: true } };

export const AllStates: Story = {
    render: () => html`<div style="display:flex;gap:16px;flex-wrap:wrap">
        <uan-delta-badge .value=${12.4}></uan-delta-badge>
        <uan-delta-badge .value=${-3}></uan-delta-badge>
        <uan-delta-badge .value=${0}></uan-delta-badge>
        <uan-delta-badge .value=${-1.2} unit="points" lower-is-better></uan-delta-badge>
        <uan-delta-badge .value=${4.5} unit="points" lower-is-better></uan-delta-badge>
    </div>`,
};
