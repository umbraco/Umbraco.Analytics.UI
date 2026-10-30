import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UaxDateRangeElement } from "./date-range.element.js";
import "./date-range.element.js";
import "../internal/test/modal-host.element.js";

const value = { from: "2026-05-25", to: "2026-06-23" };
const compare = { mode: "previous-period" as const, from: "2026-04-25", to: "2026-05-24" };

const meta: Meta<UaxDateRangeElement> = {
    title: "Components/Date Range",
    component: "uax-date-range",
    args: { value, compare: undefined, allowCompare: true, maxDate: undefined },
    argTypes: {
        value: { control: "object" },
        compare: { control: "object" },
        presets: { control: "object" },
        allowCompare: { control: "boolean" },
        maxDate: { control: "text" },
    },
    // The host stands in for the backoffice's modal manager and container
    render: (args) =>
        html`<uax-test-modal-host><uax-date-range
            .value=${args.value}
            .compare=${args.compare}
            .allowCompare=${args.allowCompare}
            max-date=${args.maxDate ?? ""}
            @change=${(e: CustomEvent) => console.info("change", e.detail)}></uax-date-range></uax-test-modal-host>`,
};

export default meta;
type Story = StoryObj<UaxDateRangeElement>;

/** The button as it sits in a pane header. */
export const Button: Story = {};

/** The button with its dialog open. Edits stay in the dialog until Save. */
export const OpenDialog: Story = {
    play: ({ canvasElement }) => {
        canvasElement.querySelector("uax-date-range")?.shadowRoot?.querySelector("uui-button")?.click();
    },
};

/** A saved comparison adds a "Compare to:" line. The dialog's compare controls arrive with DR-2. */
export const WithCompare: Story = { args: { compare } };
