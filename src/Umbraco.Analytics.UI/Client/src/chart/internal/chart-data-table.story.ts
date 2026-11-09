import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "#platform/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import "./chart-data-table.element.js";
import type { UauiChartDataTableElement } from "./chart-data-table.element.js";

const meta: Meta<UauiChartDataTableElement> = {
    title: "Internal/Chart data table",
    component: "uaui-chart-data-table",
    tags: ["internal"],
    parameters: {
        docs: {
            description: {
                component: notPublicApi(
                    "`uaui-chart-data-table` is the visually hidden table of a chart's data (`uaui-time-series-chart`, `uaui-category-chart`), for screen readers. It is clipped away, so the story shows it unclipped to inspect.",
                ),
            },
        },
    },
    args: {
        labelsHeader: "Date",
        labels: ["Jun 9, 2026", "Jun 10, 2026", "Jun 11, 2026"],
        series: [
            { id: "pageviews", label: "Pageviews", values: [120, 150, null], compare: [100, 90, 80] },
            { id: "sessions", label: "Sessions", values: [60, 70, 80] },
        ],
        totals: undefined,
        totalLabel: "Total",
        compareTotal: undefined,
        logScale: false,
    },
    // The table is clipped to 1px; the story puts it back in the flow.
    render: (args) => html`<uaui-chart-data-table
        style="position: static; width: auto; height: auto; margin: 0; overflow: visible; clip-path: none"
        .labelsHeader=${args.labelsHeader}
        .labels=${args.labels}
        .series=${args.series}
        .logScale=${args.logScale}
        .totals=${args.totals}
        .totalLabel=${args.totalLabel}
        .compareTotal=${args.compareTotal}></uaui-chart-data-table>`,
};

export default meta;
type Story = StoryObj<UauiChartDataTableElement>;

/** Lines: a column per series, and one for its compare points. */
export const Default: Story = {};

/** On a log y-axis the caption says so, as the table is all a screen reader gets of the chart. */
export const LogScale: Story = { name: "Log scale", args: { logScale: true } };

/** Bars: the total and the compare total are columns of their own. */
export const Bars: Story = {
    args: {
        series: [
            { id: "pageviews", label: "Pageviews", values: [120, 150, 40] },
            { id: "sessions", label: "Sessions", values: [60, 70, 80] },
        ],
        totals: [180, 220, 120],
        compareTotal: [200, null, 150],
    },
};
