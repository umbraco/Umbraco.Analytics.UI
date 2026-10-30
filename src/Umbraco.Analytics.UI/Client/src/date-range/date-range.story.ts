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
    args: { value, compare: undefined, allowCompare: true, maxDate: undefined, today: undefined },
    argTypes: {
        value: { control: "object" },
        compare: { control: "object" },
        presets: { control: "object" },
        allowCompare: { control: "boolean" },
        maxDate: { control: "text" },
        today: { control: "text" },
    },
    // The host stands in for the backoffice's modal manager and container
    render: (args) =>
        html`<uax-test-modal-host><uax-date-range
            .value=${args.value}
            .compare=${args.compare}
            .allowCompare=${args.allowCompare}
            max-date=${args.maxDate ?? ""}
            today=${args.today ?? ""}
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

/** A saved comparison adds a second "vs …" line under the dates, in the same button height. */
export const WithCompare: Story = { args: { compare } };

/** The dialog with Compare on and a custom comparison range: the extra row of fields sits under the switch. */
export const OpenDialogWithCompare: Story = {
    args: { compare: { mode: "custom" as const, from: "2026-03-01", to: "2026-03-31" } },
    play: ({ canvasElement }) => {
        canvasElement.querySelector("uax-date-range")?.shadowRoot?.querySelector("uui-button")?.click();
    },
};

/**
 * `today` fixes the day the presets, the default range and the latest allowed date count from, so a demo or test
 * never drifts with the clock. Here the dialog opens with "today" set to 23 Jun 2026: "Last 7 days" gives 17 to 23 Jun.
 */
export const FixedToday: Story = {
    args: { value: undefined, today: "2026-06-23" },
    play: ({ canvasElement }) => {
        canvasElement.querySelector("uax-date-range")?.shadowRoot?.querySelector("uui-button")?.click();
    },
};
