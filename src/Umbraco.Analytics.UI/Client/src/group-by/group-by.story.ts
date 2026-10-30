import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UaxGroupByElement } from "./group-by.element.js";
import "./group-by.element.js";

const meta: Meta<UaxGroupByElement> = {
    title: "Components/Group By",
    component: "uax-group-by",
    args: { value: "week", options: ["day", "week", "month"] },
    argTypes: {
        value: { control: "inline-radio", options: ["day", "week", "month"] },
        options: { control: "object" },
    },
    render: (args) =>
        html`<uax-group-by
            .value=${args.value}
            .options=${args.options}
            @change=${(e: CustomEvent<{ value: UaxGroupByElement["value"] }>) => {
                (e.currentTarget as UaxGroupByElement).value = e.detail.value;
            }}></uax-group-by>`,
};

export default meta;
type Story = StoryObj<UaxGroupByElement>;

export const Default: Story = {};

/** A product that can't offer every grouping passes fewer options. */
export const TwoOptions: Story = { args: { value: "day", options: ["day", "week"] } };

export const AllStates: Story = {
    render: () => html`<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">
        <uax-group-by value="day"></uax-group-by>
        <uax-group-by value="week"></uax-group-by>
        <uax-group-by value="month"></uax-group-by>
        <uax-group-by value="day" .options=${["day", "week"]}></uax-group-by>
    </div>`,
};
