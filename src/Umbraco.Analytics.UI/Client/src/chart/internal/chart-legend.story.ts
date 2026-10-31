import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import "./chart-legend.element.js";
import type { UauiChartLegendElement } from "./chart-legend.element.js";

const meta: Meta<UauiChartLegendElement> = {
    title: "Internal/Chart legend",
    component: "uaui-chart-legend",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uaui-chart-legend` is the legend under `uaui-time-series-chart`.") } },
    },
    args: {
        entries: [
            { id: "pageviews", label: "Pageviews", slot: 1 },
            { id: "sessions", label: "Sessions", slot: 2 },
        ],
        bars: false,
        compareLabel: undefined,
    },
    render: (args) => html`<uaui-chart-legend .entries=${args.entries} .bars=${args.bars} .compareLabel=${args.compareLabel}></uaui-chart-legend>`,
};

export default meta;
type Story = StoryObj<UauiChartLegendElement>;

/** Lines, one per series. */
export const Default: Story = {};

/** The compared period adds a dashed line named by `compareLabel`. */
export const WithCompare: Story = { name: "With compare", args: { compareLabel: "Apr 25, 2026 – May 24, 2026" } };

/** The bar kinds use squares in the bar colours. */
export const Bars: Story = { args: { bars: true, compareLabel: "Comparison" } };
