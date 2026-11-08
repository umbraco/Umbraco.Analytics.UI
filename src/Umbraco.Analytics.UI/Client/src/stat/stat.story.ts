import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html, ifDefined } from "#platform/lit";
import type { UauiStatElement } from "./stat.element.js";
import "./stat.element.js";

const PERCENT: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 1 };

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
        value: 272,
        valueFormat: undefined,
        delta: undefined,
        current: undefined,
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
            .valueFormat=${args.valueFormat}
            .delta=${args.delta}
            .current=${args.current}
            .previous=${args.previous}
            .deltaUnit=${args.deltaUnit}
            .lowerIsBetter=${args.lowerIsBetter}
            lang=${ifDefined(args.lang || undefined)}
            layout=${args.layout}></uaui-stat>`,
};

export default meta;
type Story = StoryObj<UauiStatElement>;

/**
 * A number `value` is formatted in the backoffice user's culture. `current` defaults to it, so `previous` alone gives
 * the badge (here +8.4%).
 */
export const Default: Story = {};

/** The product picks the currency, here euros. */
export const CurrencyEur: Story = {
    name: "Currency (EUR)",
    args: { label: "Total revenue", value: 4837.4, valueFormat: { style: "currency", currency: "EUR" }, previous: 4075 },
};

/** The product picks the currency, here Danish kroner. */
export const CurrencyDkk: Story = {
    name: "Currency (DKK)",
    args: { label: "Total revenue", value: 36125.5, valueFormat: { style: "currency", currency: "DKK" }, previous: 30410 },
};

/** A number of 1,000,000 or more is shown compact ("€1.23M") unless `valueFormat` sets `notation`. The exact amount is the hover title and what screen readers read. */
export const BigNumberEur: Story = {
    name: "Big number (EUR)",
    args: { label: "Total revenue", value: 1234567.89, valueFormat: { style: "currency", currency: "EUR" }, previous: 1075000 },
};

/** In Danish kroner, drawn in Danish (`lang="da-DK"`): "12,3 mio. kr.". */
export const BigNumberDkk: Story = {
    name: "Big number (DKK)",
    args: { label: "Total revenue", value: 12345678, valueFormat: { style: "currency", currency: "DKK" }, previous: 11000000, lang: "da-DK" },
};

/** `notation: "standard"` keeps the exact amount. */
export const BigNumberExact: Story = {
    name: "Big number, exact",
    args: { label: "Total revenue", value: 1234567.89, valueFormat: { style: "currency", currency: "EUR", notation: "standard" }, previous: 1075000 },
};

/** `style: "percent"` takes a fraction: 0.038 is 3.8%. `previous` is a fraction too, and points come out right: +0.2 pp. */
export const Percent: Story = {
    args: { label: "Conversion rate", value: 0.038, valueFormat: PERCENT, previous: 0.036, deltaUnit: "points" },
};

/** A unit from `valueFormat`, here hours, written out in the user's language. */
export const Unit: Story = {
    args: { label: "Time saved", value: 12.5, valueFormat: { style: "unit", unit: "hour", unitDisplay: "long" }, previous: 11 },
};

/**
 * A string `value` is shown exactly as given, for a figure the product formats itself. `valueFormat` is ignored, and
 * the badge needs `current` as a number.
 */
export const StringValue: Story = {
    name: "String value",
    args: { label: "Total pageviews", value: "272 views", valueFormat: PERCENT, current: 272, previous: 251 },
};

/** Give `delta` when the product has already worked out the change. It wins over `current` and `previous`. */
export const WithDelta: Story = {
    name: "With a delta",
    args: { previous: undefined, delta: -3.2 },
};

/** Without a change to show there is no badge: no `previous`, or a `previous` of 0 for a percent change. */
export const NoChange: Story = {
    name: "No badge",
    args: { previous: 0 },
};

/** A rate compared in percentage points. With a percent `valueFormat`, `value` and `previous` are fractions (0.62 is 62%). */
export const Points: Story = {
    args: { label: "Bounce rate", value: 0.62, valueFormat: PERCENT, previous: 0.66, deltaUnit: "points", lowerIsBetter: true },
};

/** In an end-aligned column the total ends on the right too. */
export const EndAligned: Story = {
    name: "End aligned",
    render: (args) =>
        html`<div style="text-align: end; width: 240px">
            <uaui-stat .label=${args.label} .value=${args.value} .valueFormat=${args.valueFormat} .current=${args.current} .previous=${args.previous}></uaui-stat>
        </div>`,
};

/** On one line, in a `uui-box` header: the label muted, the value bold, then the badge. */
export const Inline: Story = {
    args: { label: "Overall", value: 0.038, valueFormat: PERCENT, previous: 0.036, deltaUnit: "points", layout: "inline" },
    render: (args) =>
        html`<uui-box headline="Conversion funnel" style="width: 360px">
            <uaui-stat
                slot="header-actions"
                layout="inline"
                .label=${args.label}
                .value=${args.value}
                .valueFormat=${args.valueFormat}
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
            <uaui-stat .label=${args.label} .value=${args.value} .valueFormat=${args.valueFormat} .current=${args.current} .previous=${args.previous}></uaui-stat>
            <uui-box headline="Cart conversion" style="width: 360px">
                <uaui-stat
                    slot="header-actions"
                    layout="inline"
                    label="Overall"
                    .value=${0.256}
                    .valueFormat=${PERCENT}
                    .previous=${0.272}
                    delta-unit="points"></uaui-stat>
            </uui-box>
        </div>`,
};
