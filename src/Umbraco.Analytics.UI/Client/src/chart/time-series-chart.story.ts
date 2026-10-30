import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UaxTimeSeriesChartElement } from "./time-series-chart.element.js";
import "./time-series-chart.element.js";
import { compareRangeLabel, pageviews, pageviewsPrevious, revenue, sessions, sessionsPrevious } from "./internal/chart-fixtures.js";

const meta: Meta<UaxTimeSeriesChartElement> = {
    title: "Components/Time Series Chart",
    component: "uax-time-series-chart",
    args: {
        kind: "line",
        series: [pageviews],
        compareSeries: [],
        compareLabel: undefined,
        groupBy: "day",
        valueFormat: undefined,
        loading: false,
        emptyHeadline: undefined,
        emptyDescription: undefined,
    },
    argTypes: {
        kind: { control: "inline-radio", options: ["line", "area"] },
        groupBy: { control: "inline-radio", options: ["day", "week", "month"] },
    },
    render: (args) =>
        html`<uui-box headline="Pageviews over time" style="--uui-box-default-padding: 0">
            <uax-time-series-chart
                .kind=${args.kind}
                .series=${args.series}
                .compareSeries=${args.compareSeries}
                .compareLabel=${args.compareLabel}
                .groupBy=${args.groupBy}
                .valueFormat=${args.valueFormat}
                .loading=${args.loading}
                .emptyHeadline=${args.emptyHeadline}
                .emptyDescription=${args.emptyDescription}></uax-time-series-chart>
        </uui-box>`,
};

export default meta;
type Story = StoryObj<UaxTimeSeriesChartElement>;

export const Line: Story = {};

export const Area: Story = { args: { kind: "area" } };

/** Axis, tooltip and screen reader table all use the product's `value-format` in the editor's culture. */
export const Currency: Story = {
    args: { kind: "area", series: [revenue], valueFormat: { style: "currency", currency: "EUR" } },
};

/** First load, nothing to show yet: a skeleton the size of the chart. */
export const Loading: Story = { args: { series: [], loading: true } };

/** Reloading with data already shown: the old data stays under a thin loading bar. */
export const Reloading: Story = { args: { loading: true } };

/** No points: the empty state, with the product's own text when it sets one. */
export const Empty: Story = {
    args: { series: [], emptyHeadline: "No pageviews yet", emptyDescription: "Views appear here once visitors arrive." },
};

/** Two series get a legend. */
export const TwoSeries: Story = { args: { series: [pageviews, sessions] } };

/** One series against the previous period: a dashed line, the gap shaded (green where above, red where below) and a legend. */
export const Compare: Story = {
    args: { series: [pageviews], compareSeries: [pageviewsPrevious], compareLabel: compareRangeLabel },
};

/** Each series is matched to its compare series by `id`; they share the one compare colour and label. */
export const CompareTwoSeries: Story = {
    name: "Compare, two series",
    args: { series: [pageviews, sessions], compareSeries: [pageviewsPrevious, sessionsPrevious], compareLabel: compareRangeLabel },
};
