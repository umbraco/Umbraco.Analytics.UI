import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html, ifDefined } from "@umbraco-cms/backoffice/external/lit";
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
        detail: undefined,
        detailValue: undefined,
        detailFormat: undefined,
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
                .detail=${args.detail}
                .detailValue=${args.detailValue}
                .detailFormat=${args.detailFormat}
                .lowerIsBetter=${args.lowerIsBetter}
                .loading=${args.loading}
                .noData=${args.noData}
                .error=${args.error}
                .selectable=${args.selectable}
                .selected=${args.selected}
                .openable=${args.openable}
                .href=${args.href}
                lang=${ifDefined(args.lang || undefined)}
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

/** A number of 1,000,000 or more is shown compact ("€1.23M") unless `valueFormat` sets `notation`. The exact amount is the hover title and what screen readers read. */
export const BigNumberEur: Story = {
    name: "Big number (EUR)",
    args: { value: 1234567.89, previous: 1075000, delta: undefined },
};

/** In Danish kroner, drawn in Danish (`lang="da-DK"`): "12,3 mio. kr.". */
export const BigNumberDkk: Story = {
    name: "Big number (DKK)",
    args: { value: 12345678, valueFormat: { style: "currency", currency: "DKK" }, previous: 11000000, delta: undefined, lang: "da-DK" },
};

/** `notation: "standard"` keeps the exact amount. */
export const BigNumberExact: Story = {
    name: "Big number, exact",
    args: { value: 1234567.89, valueFormat: { style: "currency", currency: "EUR", notation: "standard" }, previous: 1075000, delta: undefined },
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

// The default render is 240px, where the badge wraps under the value; these stories are wider so the line sits under both.
const detailTile = (args: Story["args"] & object, width: number) =>
    html`<div style="width: ${width}px">
        <uaui-kpi-tile
            .label=${args.label}
            .value=${args.value}
            .icon=${args.icon}
            .delta=${args.delta}
            .detail=${args.detail}
            .detailValue=${args.detailValue}></uaui-kpi-tile>
    </div>`;

const TOKENS: Story["args"] = { label: "Input tokens", value: 134800, valueFormat: undefined, icon: "icon-chart-curve", delta: 18.7 };

/**
 * A quieter second line under the value, for a part of the total. `detail` is the text with `{0}` where the number goes,
 * already translated by the product; `detailValue` is the number, formatted like the value (or with `detailFormat`).
 * A value under 1,000,000 is not shortened.
 */
export const WithDetail: Story = {
    name: "With detail",
    args: { ...TOKENS, detail: "{0} cached", detailValue: 114300 },
    render: (args) => detailTile(args, 320),
};

/** A `detail` with no `{0}` is shown as given, with no `detailValue`: a plain note. */
export const DetailNote: Story = {
    name: "Detail, plain note",
    args: { label: "Cost", value: 12.4, valueFormat: EUR, icon: "icon-coins", delta: undefined, detail: "Estimated" },
};

/** When the value is shown short (1,000,000 or more), the line's number is short too, even under 1,000,000: "412K from agents". The exact amount is its hover title and what screen readers read. */
export const DetailShortNumber: Story = {
    name: "Detail, short number",
    args: { label: "Requests", value: 1280000, valueFormat: undefined, icon: "icon-chart-curve", delta: 18.7, detail: "{0} from agents", detailValue: 412000 },
};

/** When the value and the badge don't fit on one line, they stack in that order: value, line, then badge. Shown in a 180px cell. */
export const DetailBadgeWrapped: Story = {
    name: "Detail, badge wrapped",
    render: () =>
        html`<div style="width: 180px">
            <uaui-kpi-tile label="Input tokens" .value=${134800} icon="icon-chart-curve" .delta=${18.7} detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>
        </div>`,
};

/** A line too long for the tile is cut with "…", with the full text as its hover title. */
export const DetailLong: Story = {
    name: "Detail, long line",
    args: { ...TOKENS, detail: "{0} served from the prompt cache across all agents and models", detailValue: 114300 },
    render: (args) => detailTile(args, 320),
};

/** First load with a `detail` set: the skeleton is the height of a loaded tile with its line. */
export const DetailLoading: Story = {
    name: "Detail, loading",
    args: { ...TOKENS, value: undefined, delta: undefined, loading: true, detail: "{0} cached", detailValue: 114300 },
};

/** Reloading with a value already shown: the value and the line stay, the tile is marked busy. */
export const DetailReloading: Story = {
    name: "Detail, reloading",
    args: { ...TOKENS, loading: true, detail: "{0} cached", detailValue: 114300 },
};

/** The load failed: no line, only the dash, even though `detail` is set. */
export const DetailError: Story = {
    name: "Detail, error",
    args: { ...TOKENS, error: true, detail: "{0} cached", detailValue: 114300 },
};

/** A row of tiles where some have a line. Tiles in one grid row keep the same height. */
export const RowWithDetail: Story = {
    name: "Row with detail",
    render: () =>
        html`<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; max-width: 1000px">
            <uaui-kpi-tile label="Input tokens" .value=${134800} icon="icon-chart-curve" .delta=${18.7} detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>
            <uaui-kpi-tile label="Requests" .value=${1280000} icon="icon-chart-curve" .delta=${8.1} detail="{0} from agents" .detailValue=${412000}></uaui-kpi-tile>
            <uaui-kpi-tile label="Cost" .value=${12.4} .valueFormat=${EUR} icon="icon-coins" detail="Estimated"></uaui-kpi-tile>
            <uaui-kpi-tile label="Errors" .value=${26} icon="icon-alert" .delta=${-3.2}></uaui-kpi-tile>
        </div>`,
};

/** First load: a skeleton the size of a loaded tile. */
export const Loading: Story = { args: { value: undefined, loading: true } };

/** Reloading with a value already shown: the value stays, the tile is marked busy. */
export const Reloading: Story = { args: { loading: true } };

/** Tiles in one grid row keep the same height, even when a label wraps. The badge drops below a narrow value. */
export const RowOfTiles: Story = {
    render: () =>
        html`<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; max-width: 1000px">
            <uaui-kpi-tile label="Revenue" .value=${4837.4} .valueFormat=${EUR} icon="icon-coins" .delta=${18.7}></uaui-kpi-tile>
            <uaui-kpi-tile label="Orders" .value=${26} icon="icon-inbox" .delta=${8.1}></uaui-kpi-tile>
            <uaui-kpi-tile label="Carts created" .value=${64} icon="icon-shopping-basket" .delta=${12.4}></uaui-kpi-tile>
            <uaui-kpi-tile label="New customers" .value=${13} icon="icon-user" .delta=${4.8}></uaui-kpi-tile>
        </div>`,
};

/**
 * The recommended grid for a row of tiles: `repeat(auto-fit, minmax(240px, 1fr))`. Tiles are 240px at the narrowest, which still
 * fits the icon beside the text and a long value like "€27,337.11". Below 240px they stack the icon above the text.
 * Resize the canvas to see the columns come and go.
 */
export const KpiRow: Story = {
    name: "KPI row",
    render: () =>
        html`<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; max-width: 960px">
            <uaui-kpi-tile label="Revenue" .value=${27337.11} .valueFormat=${EUR} icon="icon-coins" .delta=${18.7}></uaui-kpi-tile>
            <uaui-kpi-tile label="Orders" .value=${526} icon="icon-inbox" .delta=${8.1}></uaui-kpi-tile>
            <uaui-kpi-tile label="Average order value" .value=${51.97} .valueFormat=${EUR} icon="icon-shopping-basket" .delta=${-3.2}></uaui-kpi-tile>
        </div>`,
};

/**
 * A tile narrower than 240px stacks its icon above the label and value, and steps the value down from 24px to 18px as it
 * gets narrower. Shown at 220px (the old grid minimum), with the loading skeleton the same height.
 */
export const Narrow: Story = {
    render: () =>
        html`<div style="display: grid; grid-template-columns: 220px 220px; gap: 16px; width: 456px">
            <uaui-kpi-tile label="Revenue" .value=${27337.11} .valueFormat=${EUR} icon="icon-coins" .delta=${18.7}></uaui-kpi-tile>
            <uaui-kpi-tile label="Revenue" .loading=${true} icon="icon-coins"></uaui-kpi-tile>
            <uaui-kpi-tile label="Revenue" .value=${27337.11} .valueFormat=${EUR} icon="icon-coins" .delta=${18.7} selectable selected></uaui-kpi-tile>
            <uaui-kpi-tile label="Revenue" .value=${27337.11} .valueFormat=${EUR} icon="icon-coins" href="#revenue"></uaui-kpi-tile>
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
            style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; max-width: 1000px"
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
        html`<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; max-width: 1000px">
            <uaui-kpi-tile label="Approved" .value=${128} icon="icon-check" color="positive" href="#history?status=approved"></uaui-kpi-tile>
            <uaui-kpi-tile label="Pending" .value=${12} icon="icon-time" color="warning" href="#active"></uaui-kpi-tile>
            <uaui-kpi-tile label="Rejected" .value=${7} icon="icon-wrong" color="danger" href="#history?status=rejected"></uaui-kpi-tile>
            <uaui-kpi-tile label="Cancelled" .value=${3} icon="icon-block" color="default" href="#history?status=cancelled"></uaui-kpi-tile>
        </div>`,
};
