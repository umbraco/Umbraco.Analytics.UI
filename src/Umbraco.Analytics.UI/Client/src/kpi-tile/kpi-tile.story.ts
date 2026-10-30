import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UanKpiTileElement } from "./kpi-tile.element.js";
import "./kpi-tile.element.js";

const meta: Meta<UanKpiTileElement> = {
    title: "Components/KPI Tile",
    component: "uan-kpi-tile",
    args: {
        label: "Revenue",
        value: "€ 4,837.40",
        icon: "icon-coins",
        delta: 18.7,
        deltaUnit: "percent",
        lowerIsBetter: false,
        loading: false,
    },
    argTypes: {
        deltaUnit: { control: "inline-radio", options: ["percent", "points"] },
    },
    render: (args) =>
        html`<div style="width: 240px">
            <uan-kpi-tile
                .label=${args.label}
                .value=${args.value}
                .icon=${args.icon}
                .delta=${args.delta}
                .deltaUnit=${args.deltaUnit}
                .lowerIsBetter=${args.lowerIsBetter}
                .loading=${args.loading}></uan-kpi-tile>
        </div>`,
};

export default meta;
type Story = StoryObj<UanKpiTileElement>;

export const Default: Story = {};

export const Decrease: Story = { args: { delta: -3.2 } };

/** A fall in refund rate is good, so it shows green. */
export const LowerIsBetter: Story = {
    args: { label: "Refund rate", value: "2.1%", delta: -1.2, deltaUnit: "points", lowerIsBetter: true },
};

export const NoDelta: Story = { args: { label: "Orders", value: "26", icon: "icon-inbox", delta: undefined } };

/** First load: a skeleton the size of a loaded tile. */
export const Loading: Story = { args: { value: undefined, loading: true } };

/** Reloading with a value already shown: the value stays, the tile is marked busy. */
export const Reloading: Story = { args: { loading: true } };

/** Tiles in one grid row keep the same height, even when a label wraps. The badge drops below a narrow value. */
export const RowOfTiles: Story = {
    render: () =>
        html`<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 880px">
            <uan-kpi-tile label="Revenue" value="€ 4,837.40" icon="icon-coins" .delta=${18.7}></uan-kpi-tile>
            <uan-kpi-tile label="Orders" value="26" icon="icon-inbox" .delta=${8.1}></uan-kpi-tile>
            <uan-kpi-tile label="Carts created" value="64" icon="icon-shopping-basket" .delta=${12.4}></uan-kpi-tile>
            <uan-kpi-tile label="New customers" value="13" icon="icon-user" .delta=${4.8}></uan-kpi-tile>
        </div>`,
};
