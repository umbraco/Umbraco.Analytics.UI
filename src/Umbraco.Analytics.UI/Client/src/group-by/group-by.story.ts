import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UauiGroupByElement } from "./group-by.element.js";
import "./group-by.element.js";

const meta: Meta<UauiGroupByElement> = {
    title: "Components/Group By",
    component: "uaui-group-by",
    args: { value: "week", options: ["day", "week", "month"] },
    argTypes: {
        value: { control: "inline-radio", options: ["day", "week", "month"] },
        options: { control: "object" },
    },
    render: (args) =>
        html`<uaui-group-by
            .value=${args.value}
            .options=${args.options}
            @change=${(e: CustomEvent<{ value: UauiGroupByElement["value"] }>) => {
                (e.currentTarget as UauiGroupByElement).value = e.detail.value;
            }}></uaui-group-by>`,
};

export default meta;
type Story = StoryObj<UauiGroupByElement>;

export const Default: Story = {};

/** A product that can't offer every grouping passes fewer options. */
export const TwoOptions: Story = { args: { value: "day", options: ["day", "week"] } };

export const AllStates: Story = {
    render: () => html`<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">
        <uaui-group-by value="day"></uaui-group-by>
        <uaui-group-by value="week"></uaui-group-by>
        <uaui-group-by value="month"></uaui-group-by>
        <uaui-group-by value="day" .options=${["day", "week"]}></uaui-group-by>
    </div>`,
};
