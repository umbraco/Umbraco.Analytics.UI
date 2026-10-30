import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UaxKpiTileElement } from "./kpi-tile.element.js";
import "./kpi-tile.element.js";

const meta: Meta<UaxKpiTileElement> = {
    title: "Components/KPI Tile",
    component: "uax-kpi-tile",
    args: {
        label: "Revenue",
        value: "€ 4,837.40",
        icon: "icon-coins",
        delta: 18.7,
        deltaUnit: "percent",
        lowerIsBetter: false,
        loading: false,
        noData: false,
        selectable: false,
        selected: false,
    },
    argTypes: {
        deltaUnit: { control: "inline-radio", options: ["percent", "points"] },
    },
    render: (args) =>
        html`<div style="width: 240px">
            <uax-kpi-tile
                .label=${args.label}
                .value=${args.value}
                .icon=${args.icon}
                .delta=${args.delta}
                .deltaUnit=${args.deltaUnit}
                .lowerIsBetter=${args.lowerIsBetter}
                .loading=${args.loading}
                .noData=${args.noData}
                .selectable=${args.selectable}
                .selected=${args.selected}></uax-kpi-tile>
        </div>`,
};

export default meta;
type Story = StoryObj<UaxKpiTileElement>;

export const Default: Story = {};

export const Decrease: Story = { args: { delta: -3.2 } };

/** A fall in refund rate is good, so it shows green. */
export const LowerIsBetter: Story = {
    args: { label: "Refund rate", value: "2.1%", delta: -1.2, deltaUnit: "points", lowerIsBetter: true },
};

/** A delta of 0 is a real "no change": a neutral badge, read as "no change". */
export const NoChange: Story = { args: { label: "Success rate", value: "98%", delta: 0, deltaUnit: "points" } };

/** `delta` unset means unknown (nothing to compare with): no badge. Compare with `NoChange`. */
export const UnknownChange: Story = { args: { label: "Success rate", value: "98%", delta: undefined, deltaUnit: "points" } };

/** The range has no data: a dash instead of "0", no badge, "No data yet" for screen readers. Still selectable. */
export const NoData: Story = { args: { value: undefined, delta: undefined, noData: true, selectable: true } };

export const NoDelta: Story = { args: { label: "Orders", value: "26", icon: "icon-inbox", delta: undefined } };

/** First load: a skeleton the size of a loaded tile. */
export const Loading: Story = { args: { value: undefined, loading: true } };

/** Reloading with a value already shown: the value stays, the tile is marked busy. */
export const Reloading: Story = { args: { loading: true } };

/** Tiles in one grid row keep the same height, even when a label wraps. The badge drops below a narrow value. */
export const RowOfTiles: Story = {
    render: () =>
        html`<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 880px">
            <uax-kpi-tile label="Revenue" value="€ 4,837.40" icon="icon-coins" .delta=${18.7}></uax-kpi-tile>
            <uax-kpi-tile label="Orders" value="26" icon="icon-inbox" .delta=${8.1}></uax-kpi-tile>
            <uax-kpi-tile label="Carts created" value="64" icon="icon-shopping-basket" .delta=${12.4}></uax-kpi-tile>
            <uax-kpi-tile label="New customers" value="13" icon="icon-user" .delta=${4.8}></uax-kpi-tile>
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
                for (const tile of row.querySelectorAll("uax-kpi-tile")) if (tile !== e.target) tile.selected = false;
            }}>
            <uax-kpi-tile label="Revenue" value="€ 4,837.40" icon="icon-coins" .delta=${18.7} selectable selected .deselectable=${false}></uax-kpi-tile>
            <uax-kpi-tile label="Orders" value="26" icon="icon-inbox" .delta=${8.1} selectable .deselectable=${false}></uax-kpi-tile>
            <uax-kpi-tile label="Carts created" value="64" icon="icon-shopping-basket" .delta=${12.4} selectable .deselectable=${false}></uax-kpi-tile>
            <uax-kpi-tile label="New customers" value="13" icon="icon-user" .delta=${4.8} selectable .deselectable=${false}></uax-kpi-tile>
        </div>`,
};
