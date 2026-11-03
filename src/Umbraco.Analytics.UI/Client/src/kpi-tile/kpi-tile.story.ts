import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UauiKpiTileElement } from "./kpi-tile.element.js";
import "./kpi-tile.element.js";

const EUR: Intl.NumberFormatOptions = { style: "currency", currency: "EUR" };
const PERCENT: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 1 };

const meta: Meta<UauiKpiTileElement> = {
    title: "Components/KPI Tile",
    component: "uaui-kpi-tile",
    args: {
        label: "Revenue",
        value: 4837.4,
        valueFormat: EUR,
        icon: "icon-coins",
        delta: 18.7,
        deltaUnit: "percent",
        lowerIsBetter: false,
        loading: false,
        noData: false,
        error: false,
        selectable: false,
        selected: false,
        openable: false,
        href: undefined,
        color: undefined,
    },
    argTypes: {
        deltaUnit: { control: "inline-radio", options: ["percent", "points"] },
        color: { control: "select", options: [undefined, "default", "positive", "warning", "danger"] },
    },
    render: (args) =>
        html`<div style="width: 240px">
            <uaui-kpi-tile
                .label=${args.label}
                .value=${args.value}
                .valueFormat=${args.valueFormat}
                .icon=${args.icon}
                .delta=${args.delta}
                .current=${args.current}
                .previous=${args.previous}
                .deltaUnit=${args.deltaUnit}
                .lowerIsBetter=${args.lowerIsBetter}
                .loading=${args.loading}
                .noData=${args.noData}
                .error=${args.error}
                .selectable=${args.selectable}
                .selected=${args.selected}
                .openable=${args.openable}
                .href=${args.href}
                .color=${args.color}></uaui-kpi-tile>
        </div>`,
};

export default meta;
type Story = StoryObj<UauiKpiTileElement>;

/** A number `value` is formatted in the backoffice user's culture, with the currency from `valueFormat`. */
export const Default: Story = {};

export const Decrease: Story = { args: { delta: -3.2 } };

/** Give the two numbers instead of the change. `current` defaults to a number `value`, so `previous` is enough: 150 orders against 120 is +25%. */
export const FromTwoNumbers: Story = { args: { label: "Orders", value: 150, valueFormat: undefined, icon: "icon-inbox", delta: undefined, previous: 120 } };

/** Points from a percent `value`: `previous` is a fraction too, so 25.6% against 24% is +1.6 pp. */
export const PercentPoints: Story = {
    name: "Percent in points",
    args: { label: "Conversion rate", value: 0.256, valueFormat: PERCENT, icon: "icon-chart-curve", delta: undefined, previous: 0.24, deltaUnit: "points" },
};

/** The product picks the currency, e.g. the order's currency: here Danish kroner. */
export const CurrencyDkk: Story = {
    name: "Currency (DKK)",
    args: { value: 36125.5, valueFormat: { style: "currency", currency: "DKK" } },
};

/** `style: "percent"` takes a fraction: 0.256 is 25.6%. */
export const Percent: Story = {
    args: { label: "Conversion rate", value: 0.256, valueFormat: PERCENT, icon: "icon-chart-curve", delta: 1.4, deltaUnit: "points" },
};

/** A unit from `valueFormat`, here hours, written out in the user's language. */
export const Unit: Story = {
    args: { label: "Time saved", value: 12.5, valueFormat: { style: "unit", unit: "hour", unitDisplay: "long" }, icon: "icon-time", delta: 6.2 },
};

/** A string `value` is shown exactly as given, for a figure the product formats itself. `valueFormat` is ignored. */
export const StringValue: Story = {
    name: "String value",
    args: { label: "Revenue", value: "€ 4.8k", valueFormat: EUR },
};

/** A fall in refund rate is good, so it shows green. */
export const LowerIsBetter: Story = {
    args: { label: "Refund rate", value: 0.021, valueFormat: PERCENT, delta: -1.2, deltaUnit: "points", lowerIsBetter: true },
};

/** A delta of 0 is a real "no change": a neutral badge, read as "no change". */
export const NoChange: Story = { args: { label: "Success rate", value: 0.98, valueFormat: PERCENT, delta: 0, deltaUnit: "points" } };

/** `delta` unset means unknown (nothing to compare with): no badge. Compare with `NoChange`. */
export const UnknownChange: Story = { args: { label: "Success rate", value: 0.98, valueFormat: PERCENT, delta: undefined, deltaUnit: "points" } };

/** The range has no data: a dash instead of "0", no badge, hidden "No data for this period" for screen readers. Still selectable. */
export const NoData: Story = { args: { value: undefined, delta: undefined, noData: true, selectable: true } };

/** The load failed: a dash with hidden "Something went wrong" text in place of the value, and no badge. Wins over loading and no-data. */
export const LoadFailed: Story = { args: { error: true, selectable: true } };

export const NoDelta: Story = { args: { label: "Orders", value: 26, valueFormat: undefined, icon: "icon-inbox", delta: undefined } };

/** First load: a skeleton the size of a loaded tile. */
export const Loading: Story = { args: { value: undefined, loading: true } };

/** Reloading with a value already shown: the value stays, the tile is marked busy. */
export const Reloading: Story = { args: { loading: true } };

/** Tiles in one grid row keep the same height, even when a label wraps. The badge drops below a narrow value. */
export const RowOfTiles: Story = {
    render: () =>
        html`<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 880px">
            <uaui-kpi-tile label="Revenue" .value=${4837.4} .valueFormat=${EUR} icon="icon-coins" .delta=${18.7}></uaui-kpi-tile>
            <uaui-kpi-tile label="Orders" .value=${26} icon="icon-inbox" .delta=${8.1}></uaui-kpi-tile>
            <uaui-kpi-tile label="Carts created" .value=${64} icon="icon-shopping-basket" .delta=${12.4}></uaui-kpi-tile>
            <uaui-kpi-tile label="New customers" .value=${13} icon="icon-user" .delta=${4.8}></uaui-kpi-tile>
        </div>`,
};

/** A button: hover, focus and press with the mouse or Enter / Space. It raises `selected` and `deselected`. */
export const Selectable: Story = { args: { selectable: true } };

/**
 * A row of selectable tiles where exactly one drives the chart. Each tile is `deselectable=false`, and the
 * product clears the others when one raises `selected`.
 */
export const SelectableRow: Story = {
    render: () =>
        html`<div
            style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 880px"
            @selected=${(e: Event) => {
                const row = e.currentTarget as HTMLElement;
                for (const tile of row.querySelectorAll("uaui-kpi-tile")) if (tile !== e.target) tile.selected = false;
            }}>
            <uaui-kpi-tile label="Revenue" .value=${4837.4} .valueFormat=${EUR} icon="icon-coins" .delta=${18.7} selectable selected .deselectable=${false}></uaui-kpi-tile>
            <uaui-kpi-tile label="Orders" .value=${26} icon="icon-inbox" .delta=${8.1} selectable .deselectable=${false}></uaui-kpi-tile>
            <uaui-kpi-tile label="Carts created" .value=${64} icon="icon-shopping-basket" .delta=${12.4} selectable .deselectable=${false}></uaui-kpi-tile>
            <uaui-kpi-tile label="New customers" .value=${13} icon="icon-user" .delta=${4.8} selectable .deselectable=${false}></uaui-kpi-tile>
        </div>`,
};


/** A link that drills down, as `uui-card`'s `href`: hover underlines the label, focus is the card's outline. Enter follows it. */
export const Link: Story = { args: { label: "Approved", value: 128, valueFormat: undefined, icon: "icon-check", delta: undefined, href: "#history?status=approved", color: "positive" } };

/** `openable`: a button that raises `open` (click, Enter or Space) for a product that navigates itself, as `uui-card`'s `open`. */
export const Openable: Story = { args: { label: "Pending", value: 12, valueFormat: undefined, icon: "icon-time", delta: undefined, openable: true, color: "warning" } };

/**
 * Status tiles, as Workflow's approval activity: each tints its icon square with a status `color` and links to the
 * history filtered by that status. Unset `color` keeps the pink square. The label carries the meaning.
 */
export const StatusTiles: Story = {
    render: () =>
        html`<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 880px">
            <uaui-kpi-tile label="Approved" .value=${128} icon="icon-check" color="positive" href="#history?status=approved"></uaui-kpi-tile>
            <uaui-kpi-tile label="Pending" .value=${12} icon="icon-time" color="warning" href="#active"></uaui-kpi-tile>
            <uaui-kpi-tile label="Rejected" .value=${7} icon="icon-wrong" color="danger" href="#history?status=rejected"></uaui-kpi-tile>
            <uaui-kpi-tile label="Cancelled" .value=${3} icon="icon-block" color="default" href="#history?status=cancelled"></uaui-kpi-tile>
        </div>`,
};
