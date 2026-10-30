import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import "./date-field.element.js";
import type { UaxDateFieldElement } from "./date-field.element.js";

const meta: Meta<UaxDateFieldElement> = {
    title: "Internal/Date field",
    component: "uax-date-field",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uax-date-field` is one date field of the date range dialog: label, date input and message.") } },
    },
    args: { name: "from", label: "From", value: "2026-05-25", max: "2026-06-23", error: undefined },
    render: (args) => html`<div style="width: 200px">
        <uax-date-field
            .name=${args.name}
            label=${args.label}
            .value=${args.value}
            .max=${args.max}
            .error=${args.error}
            @change=${(e: Event) => {
                // The field is controlled: it raises `change`, and the story keeps the value like the dialog does.
                console.info("change", (e.target as UaxDateFieldElement).value);
            }}></uax-date-field>
    </div>`,
};

export default meta;
type Story = StoryObj<UaxDateFieldElement>;

/** A date. */
export const Default: Story = {};

/** Empty or half-typed: the field shows the "required" message. */
export const Empty: Story = { args: { value: "" } };

/** An `error` replaces it, and is announced. */
export const WithError: Story = { name: "With error", args: { error: "The end date must be on or after the start date." } };
