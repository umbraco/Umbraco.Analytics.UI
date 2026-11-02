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
        docs: { description: { component: notPublicApi("`uaui-chart-tooltip` is the tooltip over the hovered x value of a chart (a date on `uaui-time-series-chart`). The chart positions it; here it sits in the flow.") } },
    },
    args: {
        heading: "Jun 11, 2026",
        bars: false,
        rows: [{ color: 1, value: 1280 }],
        total: undefined,
        compareTotal: undefined,
        numberFormat,
    },
    render: (args) => html`<div style="width: 240px">
        <uaui-chart-tooltip
            style="position: static"
            .heading=${args.heading}
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

/** Lines with a compare point: the compare value, its x value (a date here) and the change, in a badge. */
export const WithCompare: Story = {
    name: "With compare",
    args: { rows: [{ color: 1, value: 1280, compare: { value: 1000, label: "Apr 27, 2026", current: 1280 } }] },
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
        compareTotal: { value: 2400, label: "Apr 27, 2026", current: 1920 },
    },
};

/** The share view (`stack="percent"`): each row's share first, its value at the end, and the total. */
export const Share: Story = {
    args: {
        bars: true,
        rows: [
            { color: 1, value: 64, share: 0.5, label: "Summer conference" },
            { color: 2, value: 40, share: 0.3125, label: "Events" },
            { color: 3, value: 24, share: 0.1875, label: "Home" },
        ],
        total: { value: 128, label: "Total" },
    },
};

/** More than 8 rows (11 source pages): the 7 largest, in the order given, and "+4 more" for the rest. */
export const ManyRows: Story = {
    name: "Many rows",
    args: {
        bars: true,
        rows: [
            ["Summer conference", 61],
            ["Events", 44],
            ["Workshop: Getting started", 31],
            ["Home", 28],
            ["Newsletter, June", 26],
            ["Blog: Spring recap", 20],
            ["Contact", 18],
            ["Pricing", 12],
            ["About us", 9],
            ["Careers", 9],
            ["Partners", 5],
        ].map(([label, value], i) => ({
            color: ((i % 8) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
            value: value as number,
            share: (value as number) / 263,
            label: label as string,
        })),
        total: { value: 263, label: "Total" },
    },
};

/** Bars and a line in one chart, on today's date: square swatches for the bars, a dot for the line, each row's own. */
export const BarsAndLine: Story = {
    name: "Bars and a line",
    args: {
        heading: "Jun 22, 2026 (today)",
        bars: true,
        rows: [
            { color: "positive", value: 6, label: "Approved" },
            { color: "danger", value: 1, label: "Errored" },
            { color: "warning", value: 14, label: "Pending", bar: false, compare: { value: 11, label: "May 23, 2026", current: 14 } },
        ],
    },
};
