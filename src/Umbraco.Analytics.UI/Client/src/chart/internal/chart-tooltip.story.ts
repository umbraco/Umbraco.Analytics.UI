import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import "./chart-tooltip.element.js";
import type { UaxChartTooltipElement } from "./chart-tooltip.element.js";

const numberFormat = new Intl.NumberFormat("en");

const meta: Meta<UaxChartTooltipElement> = {
    title: "Internal/Chart tooltip",
    component: "uax-chart-tooltip",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uax-chart-tooltip` is the tooltip over a hovered date of `uax-time-series-chart`. The chart positions it; here it sits in the flow.") } },
    },
    args: {
        date: "Jun 11, 2026",
        bars: false,
        rows: [{ slot: 1, value: 1280 }],
        total: undefined,
        compareTotal: undefined,
        numberFormat,
    },
    render: (args) => html`<div style="width: 240px">
        <uax-chart-tooltip
            style="position: static"
            .date=${args.date}
            .rows=${args.rows}
            .bars=${args.bars}
            .total=${args.total}
            .compareTotal=${args.compareTotal}
            .numberFormat=${args.numberFormat}></uax-chart-tooltip>
    </div>`,
};

export default meta;
type Story = StoryObj<UaxChartTooltipElement>;

/** One series: the value only, no label. */
export const Default: Story = {};

/** Several series: each row has its label. */
export const SeveralSeries: Story = {
    name: "Several series",
    args: {
        rows: [
            { slot: 1, value: 1280, label: "Pageviews" },
            { slot: 2, value: 640, label: "Sessions" },
        ],
    },
};

/** Lines with a compare point: the compare value, its date and the change, in a badge. */
export const WithCompare: Story = {
    name: "With compare",
    args: { rows: [{ slot: 1, value: 1280, compare: { value: 1000, date: "Apr 27, 2026", current: 1280 } }] },
};

/** Bars: square swatches, the total of the stack and the compare total. */
export const Bars: Story = {
    args: {
        bars: true,
        rows: [
            { slot: 1, value: 1280, label: "Pageviews" },
            { slot: 2, value: 640, label: "Sessions" },
        ],
        total: { value: 1920, label: "Total" },
        compareTotal: { value: 2400, date: "Apr 27, 2026", current: 1920 },
    },
};
