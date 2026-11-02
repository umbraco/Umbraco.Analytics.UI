import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import "./chart-tooltip.element.js";
import type { UauiChartTooltipElement } from "./chart-tooltip.element.js";

const numberFormat = new Intl.NumberFormat("en");

const meta: Meta<UauiChartTooltipElement> = {
    title: "Internal/Chart tooltip",
    component: "uaui-chart-tooltip",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uaui-chart-tooltip` is the tooltip over a hovered date of `uaui-time-series-chart`. The chart positions it; here it sits in the flow.") } },
    },
    args: {
        date: "Jun 11, 2026",
        bars: false,
        rows: [{ color: 1, value: 1280 }],
        total: undefined,
        compareTotal: undefined,
        numberFormat,
    },
    render: (args) => html`<div style="width: 240px">
        <uaui-chart-tooltip
            style="position: static"
            .date=${args.date}
            .rows=${args.rows}
            .bars=${args.bars}
            .total=${args.total}
            .compareTotal=${args.compareTotal}
            .numberFormat=${args.numberFormat}></uaui-chart-tooltip>
    </div>`,
};

export default meta;
type Story = StoryObj<UauiChartTooltipElement>;

/** One series: the value only, no label. */
export const Default: Story = {};

/** Several series: each row has its label. */
export const SeveralSeries: Story = {
    name: "Several series",
    args: {
        rows: [
            { color: 1, value: 1280, label: "Pageviews" },
            { color: 2, value: 640, label: "Sessions" },
        ],
    },
};

/** Lines with a compare point: the compare value, its date and the change, in a badge. */
export const WithCompare: Story = {
    name: "With compare",
    args: { rows: [{ color: 1, value: 1280, compare: { value: 1000, date: "Apr 27, 2026", current: 1280 } }] },
};

/** Bars: square swatches, the total of the stack and the compare total. */
export const Bars: Story = {
    args: {
        bars: true,
        rows: [
            { color: 1, value: 1280, label: "Pageviews" },
            { color: 2, value: 640, label: "Sessions" },
        ],
        total: { value: 1920, label: "Total" },
        compareTotal: { value: 2400, date: "Apr 27, 2026", current: 1920 },
    },
};

/** Bars and a line in one chart, on today's date: square swatches for the bars, a dot for the line, each row's own. */
export const BarsAndLine: Story = {
    name: "Bars and a line",
    args: {
        date: "Jun 22, 2026 (today)",
        bars: true,
        rows: [
            { color: "positive", value: 6, label: "Approved" },
            { color: "danger", value: 1, label: "Errored" },
            { color: "warning", value: 14, label: "Pending", bar: false, compare: { value: 11, date: "May 23, 2026", current: 14 } },
        ],
    },
};
