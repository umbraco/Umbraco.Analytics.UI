import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UaxSegmentedElement } from "./segmented.element.js";
import "./segmented.element.js";

const options = [
    { value: "model", label: "Model" },
    { value: "profile", label: "Profile" },
    { value: "team", label: "Team" },
];

const meta: Meta<UaxSegmentedElement> = {
    title: "Components/Segmented",
    component: "uax-segmented",
    args: { value: "model", label: "Break down by", options },
    argTypes: {
        value: { control: "inline-radio", options: options.map((o) => o.value) },
        label: { control: "text" },
        options: { control: "object" },
    },
    render: (args) =>
        html`<uax-segmented
            .value=${args.value}
            .label=${args.label}
            .options=${args.options}
            @change=${(e: CustomEvent<{ value: string }>) => {
                (e.currentTarget as UaxSegmentedElement).value = e.detail.value;
            }}></uax-segmented>`,
};

export default meta;
type Story = StoryObj<UaxSegmentedElement>;

export const Default: Story = {};

export const TwoOptions: Story = { args: { value: "model", options: options.slice(0, 2) } };

export const AllStates: Story = {
    render: () => html`<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">
        <uax-segmented label="First selected" value="model" .options=${options}></uax-segmented>
        <uax-segmented label="Middle selected" value="profile" .options=${options}></uax-segmented>
        <uax-segmented label="Last selected" value="team" .options=${options}></uax-segmented>
        <uax-segmented label="Two options" value="model" .options=${options.slice(0, 2)}></uax-segmented>
    </div>`,
};
