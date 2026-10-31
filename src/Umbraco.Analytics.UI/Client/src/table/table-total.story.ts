import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UauiTableTotalElement } from "./table-total.element.js";
import "./table-total.element.js";

const meta: Meta<UauiTableTotalElement> = {
    title: "Components/Data Table/Total",
    component: "uaui-table-total",
    parameters: {
        layout: "padded",
        docs: {
            description: {
                component:
                    "One total for the column toolbar of a `uaui-data-table`: a small uppercase label, the value in bold and an optional change badge. Slot it into `toolbar-<column key>` so it sits over its column. It takes the text alignment of its cell.",
            },
        },
    },
    args: {
        label: "Total pageviews",
        value: "272",
        delta: undefined,
        current: 272,
        previous: 251,
        deltaUnit: "percent",
        lowerIsBetter: false,
    },
    argTypes: {
        deltaUnit: { control: "inline-radio", options: ["percent", "points"] },
    },
    render: (args) =>
        html`<uaui-table-total
            .label=${args.label}
            .value=${args.value}
            .delta=${args.delta}
            .current=${args.current}
            .previous=${args.previous}
            .deltaUnit=${args.deltaUnit}
            .lowerIsBetter=${args.lowerIsBetter}></uaui-table-total>`,
};

export default meta;
type Story = StoryObj<UauiTableTotalElement>;

/** Give `current` and `previous` and the badge works out the change (here +8.4%). */
export const Default: Story = {};

/** Give `delta` when the product has already worked out the change. It wins over `current` and `previous`. */
export const WithDelta: Story = {
    name: "With a delta",
    args: { current: undefined, previous: undefined, delta: -3.2 },
};

/** Without a change to show there is no badge: no `previous`, or a `previous` of 0 for a percent change. */
export const NoChange: Story = {
    name: "No badge",
    args: { current: 272, previous: 0 },
};

/** A rate compared in percentage points. Values are in percent units (62 means 62%). */
export const Points: Story = {
    args: { label: "Bounce rate", value: "62%", current: 62, previous: 66, deltaUnit: "points", lowerIsBetter: true },
};

/** In an end-aligned column the total ends on the right too. */
export const EndAligned: Story = {
    name: "End aligned",
    render: (args) =>
        html`<div style="text-align: end; width: 240px">
            <uaui-table-total .label=${args.label} .value=${args.value} .current=${args.current} .previous=${args.previous}></uaui-table-total>
        </div>`,
};
