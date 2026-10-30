import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UanGroupByElement } from "./group-by.element.js";
import "./group-by.element.js";

const meta: Meta<UanGroupByElement> = {
    title: "Components/Group By",
    component: "uan-group-by",
    args: { value: "week", options: ["day", "week", "month"] },
    argTypes: {
        value: { control: "inline-radio", options: ["day", "week", "month"] },
        options: { control: "object" },
    },
    render: (args) =>
        html`<uan-group-by
            .value=${args.value}
            .options=${args.options}
            @change=${(e: CustomEvent<{ value: UanGroupByElement["value"] }>) => {
                (e.currentTarget as UanGroupByElement).value = e.detail.value;
            }}></uan-group-by>`,
};

export default meta;
type Story = StoryObj<UanGroupByElement>;

export const Default: Story = {};

/** A product that can't offer every grouping passes fewer options. */
export const TwoOptions: Story = { args: { value: "day", options: ["day", "week"] } };

export const AllStates: Story = {
    render: () => html`<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">
        <uan-group-by value="day"></uan-group-by>
        <uan-group-by value="week"></uan-group-by>
        <uan-group-by value="month"></uan-group-by>
        <uan-group-by value="day" .options=${["day", "week"]}></uan-group-by>
    </div>`,
};
