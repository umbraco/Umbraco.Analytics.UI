import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UauiSegmentedElement } from "./segmented.element.js";
import "./segmented.element.js";

const options = [
    { value: "model", label: "Model" },
    { value: "profile", label: "Profile" },
    { value: "team", label: "Team" },
];

const meta: Meta<UauiSegmentedElement> = {
    title: "Components/Segmented",
    component: "uaui-segmented",
    args: { value: "model", label: "Break down by", options },
    argTypes: {
        value: { control: "inline-radio", options: options.map((o) => o.value) },
        label: { control: "text" },
        options: { control: "object" },
    },
    render: (args) =>
        html`<uaui-segmented
            .value=${args.value}
            .label=${args.label}
            .options=${args.options}
            @change=${(e: CustomEvent<{ value: string }>) => {
                (e.currentTarget as UauiSegmentedElement).value = e.detail.value;
            }}></uaui-segmented>`,
};

export default meta;
type Story = StoryObj<UauiSegmentedElement>;

export const Default: Story = {};

export const TwoOptions: Story = { args: { value: "model", options: options.slice(0, 2) } };

export const AllStates: Story = {
    render: () => html`<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">
        <uaui-segmented label="First selected" value="model" .options=${options}></uaui-segmented>
        <uaui-segmented label="Middle selected" value="profile" .options=${options}></uaui-segmented>
        <uaui-segmented label="Last selected" value="team" .options=${options}></uaui-segmented>
        <uaui-segmented label="Two options" value="model" .options=${options.slice(0, 2)}></uaui-segmented>
    </div>`,
};
