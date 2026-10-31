import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UauiStatElement } from "./stat.element.js";
import "./stat.element.js";

const meta: Meta<UauiStatElement> = {
    title: "Components/Stat",
    component: "uaui-stat",
    parameters: {
        layout: "padded",
        docs: {
            description: {
                component:
                    'One figure with its label and an optional change badge. `layout="stacked"` (the default) is for the column toolbar of a `uaui-data-table`: a small uppercase label above the value and badge. Slot it into `toolbar-<column key>` so it sits over its column; it takes the text alignment of its cell. `layout="inline"` puts everything on one line, for a `uui-box` `header-actions` slot.',
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
        layout: "stacked",
    },
    argTypes: {
        deltaUnit: { control: "inline-radio", options: ["percent", "points"] },
        layout: { control: "inline-radio", options: ["stacked", "inline"] },
    },
    render: (args) =>
        html`<uaui-stat
            .label=${args.label}
            .value=${args.value}
            .delta=${args.delta}
            .current=${args.current}
            .previous=${args.previous}
            .deltaUnit=${args.deltaUnit}
            .lowerIsBetter=${args.lowerIsBetter}
            layout=${args.layout}></uaui-stat>`,
};

export default meta;
type Story = StoryObj<UauiStatElement>;

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
            <uaui-stat .label=${args.label} .value=${args.value} .current=${args.current} .previous=${args.previous}></uaui-stat>
        </div>`,
};

/** On one line, in a `uui-box` header: the label muted, the value bold, then the badge. */
export const Inline: Story = {
    args: { label: "Overall", value: "3.8%", current: 3.8, previous: 3.6, deltaUnit: "points", layout: "inline" },
    render: (args) =>
        html`<uui-box headline="Conversion funnel" style="width: 360px">
            <uaui-stat
                slot="header-actions"
                layout="inline"
                .label=${args.label}
                .value=${args.value}
                .current=${args.current}
                .previous=${args.previous}
                .deltaUnit=${args.deltaUnit}
                .lowerIsBetter=${args.lowerIsBetter}></uaui-stat>
            <p style="margin: 0">The pane's content.</p>
        </uui-box>`,
};

/** Both layouts in the dark backoffice theme. The toolbar's theme switcher shows any story in the other themes too. */
export const Dark: Story = {
    globals: { theme: "dark" },
    render: (args) =>
        html`<div style="display: grid; gap: 24px; justify-items: start">
            <uaui-stat .label=${args.label} .value=${args.value} .current=${args.current} .previous=${args.previous}></uaui-stat>
            <uui-box headline="Cart conversion" style="width: 360px">
                <uaui-stat
                    slot="header-actions"
                    layout="inline"
                    label="Overall"
                    value="25.6%"
                    .current=${25.6}
                    .previous=${27.2}
                    delta-unit="points"></uaui-stat>
            </uui-box>
        </div>`,
};
