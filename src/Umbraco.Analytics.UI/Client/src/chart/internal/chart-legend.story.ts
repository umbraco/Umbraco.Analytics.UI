import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import "./chart-legend.element.js";
import type { UaxChartLegendElement } from "./chart-legend.element.js";

const meta: Meta<UaxChartLegendElement> = {
    title: "Internal/Chart legend",
    component: "uax-chart-legend",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uax-chart-legend` is the legend under `uax-time-series-chart`.") } },
    },
    args: {
        entries: [
            { id: "pageviews", label: "Pageviews", slot: 1 },
            { id: "sessions", label: "Sessions", slot: 2 },
        ],
        bars: false,
        compareLabel: undefined,
    },
    render: (args) => html`<uax-chart-legend .entries=${args.entries} .bars=${args.bars} .compareLabel=${args.compareLabel}></uax-chart-legend>`,
};

export default meta;
type Story = StoryObj<UaxChartLegendElement>;

/** Lines, one per series. */
export const Default: Story = {};

/** The compared period adds a dashed line named by `compareLabel`. */
export const WithCompare: Story = { name: "With compare", args: { compareLabel: "Apr 25, 2026 – May 24, 2026" } };

/** The bar kinds use squares in the bar colours. */
export const Bars: Story = { args: { bars: true, compareLabel: "Comparison" } };
