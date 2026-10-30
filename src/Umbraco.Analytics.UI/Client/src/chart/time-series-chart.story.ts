import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UaxTimeSeriesChartElement } from "./time-series-chart.element.js";
import "./time-series-chart.element.js";
import { pageviews, revenue, sessions } from "./internal/chart-fixtures.js";

const meta: Meta<UaxTimeSeriesChartElement> = {
    title: "Components/Time Series Chart",
    component: "uax-time-series-chart",
    args: {
        kind: "line",
        series: [pageviews],
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
