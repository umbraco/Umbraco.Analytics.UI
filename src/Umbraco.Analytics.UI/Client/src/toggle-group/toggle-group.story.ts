import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UauiToggleGroupElement } from "./toggle-group.element.js";
import "./toggle-group.element.js";

const options = [
    { value: "model", label: "Model" },
    { value: "profile", label: "Profile" },
    { value: "team", label: "Team" },
];

const meta: Meta<UauiToggleGroupElement> = {
    title: "Components/Toggle Group",
    component: "uaui-toggle-group",
    args: { value: "model", label: "Break down by", options },
    argTypes: {
        value: { control: "inline-radio", options: options.map((o) => o.value) },
        label: { control: "text" },
        options: { control: "object" },
    },
    render: (args) =>
        html`<uaui-toggle-group
            .value=${args.value}
            .label=${args.label}
            .options=${args.options}
            @change=${(e: CustomEvent<{ value: string }>) => {
                (e.currentTarget as UauiToggleGroupElement).value = e.detail.value;
            }}></uaui-toggle-group>`,
};

export default meta;
type Story = StoryObj<UauiToggleGroupElement>;

export const Default: Story = {};

export const TwoOptions: Story = { args: { value: "model", options: options.slice(0, 2) } };

export const AllStates: Story = {
    render: () => html`<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">
        <uaui-toggle-group label="First selected" value="model" .options=${options}></uaui-toggle-group>
        <uaui-toggle-group label="Middle selected" value="profile" .options=${options}></uaui-toggle-group>
        <uaui-toggle-group label="Last selected" value="team" .options=${options}></uaui-toggle-group>
        <uaui-toggle-group label="Two options" value="model" .options=${options.slice(0, 2)}></uaui-toggle-group>
    </div>`,
};
