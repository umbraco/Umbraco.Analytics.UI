import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import "./chart-data-table.element.js";
import type { UaxChartDataTableElement } from "./chart-data-table.element.js";

const meta: Meta<UaxChartDataTableElement> = {
    title: "Internal/Chart data table",
    component: "uax-chart-data-table",
    tags: ["internal"],
    parameters: {
        docs: {
            description: {
                component: notPublicApi(
                    "`uax-chart-data-table` is the visually hidden table of `uax-time-series-chart`'s data, for screen readers. It is clipped away, so the story shows it unclipped to inspect.",
                ),
            },
        },
    },
    args: {
        dates: ["Jun 9, 2026", "Jun 10, 2026", "Jun 11, 2026"],
        series: [
            { id: "pageviews", label: "Pageviews", values: [120, 150, null], compare: [100, 90, 80] },
            { id: "sessions", label: "Sessions", values: [60, 70, 80] },
        ],
        bars: false,
        totals: undefined,
        totalLabel: "Total",
        compareTotal: undefined,
    },
    // The table is clipped to 1px; the story puts it back in the flow.
    render: (args) => html`<uax-chart-data-table
        style="position: static; width: auto; height: auto; margin: 0; overflow: visible; clip-path: none"
        .dates=${args.dates}
        .series=${args.series}
        .bars=${args.bars}
        .totals=${args.totals}
        .totalLabel=${args.totalLabel}
        .compareTotal=${args.compareTotal}></uax-chart-data-table>`,
};

export default meta;
type Story = StoryObj<UaxChartDataTableElement>;

/** Lines: a column per series, and one for its compare points. */
export const Default: Story = {};

/** Bars: the total and the compare total are columns of their own. */
export const Bars: Story = {
    args: {
        bars: true,
        series: [
            { id: "pageviews", label: "Pageviews", values: [120, 150, 40] },
            { id: "sessions", label: "Sessions", values: [60, 70, 80] },
        ],
        totals: [180, 220, 120],
        compareTotal: [200, null, 150],
    },
};
