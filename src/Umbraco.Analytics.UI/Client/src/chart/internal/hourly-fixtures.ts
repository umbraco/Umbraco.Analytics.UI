// Shared set-up for the hourly chart specs (docs/plans/hourly-buckets). The specs run with the browser's time zone
// pinned to Europe/Copenhagen (PLAN.md T1): CET (+01:00) in November, CEST (+02:00) until 25 Oct 2026.
import { Chart } from "@umbraco/analytics-ui/external/chart.js";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { deepQuery, renderElement, shadow } from "../../internal/test/dom.js";
import type { UauiSeries } from "../types.js";
import "../time-series-chart.element.js";

/** `count` UTC hours from `firstUtc` (an ISO instant), as ISO instants. */
export const utcHours = (firstUtc: string, count: number) =>
    Array.from({ length: count }, (_, i) => new Date(Date.parse(firstUtc) + i * 3_600_000).toISOString());

/** The local hours of 5 Nov 2026 in Copenhagen: 23:00Z on the 4th to 22:00Z on the 5th. */
export const hoursOf5Nov = utcHours("2026-11-04T23:00:00Z", 24);
/** The 23 local hours of 29 Mar 2026, the day clocks go forward: 1 AM is followed by 3 AM. */
export const hoursOf29Mar = utcHours("2026-03-28T23:00:00Z", 23);
/** The local hours of 4 Nov 2026. */
export const hoursOf4Nov = utcHours("2026-11-03T23:00:00Z", 24);
/** The 25 local hours of 25 Oct 2026, the day clocks go back. Indexes 2 and 3 are both 2 AM. */
export const hoursOf25Oct = utcHours("2026-10-24T22:00:00Z", 25);
/** The local hours of 26 Oct 2026. */
export const hoursOf26Oct = utcHours("2026-10-25T23:00:00Z", 24);

export const seriesAt = (id: string, dates: string[], value: (i: number) => number = (i) => i + 1): UauiSeries => ({
    id,
    label: id,
    points: dates.map((date, i) => ({ date, value: value(i) })),
});

export type HourlyChartOptions = {
    series: UauiSeries[];
    compareSeries?: UauiSeries[];
    range?: { from: string; to: string };
    compare?: { mode: "custom"; from: string; to: string };
    groupBy?: string;
    now?: string;
    incompleteFrom?: string;
    kind?: string;
};

/** Renders the chart. `now` is set as a property. */
export const hourlyChart = ({ series, compareSeries = [], range, compare, groupBy = "hour", now, incompleteFrom, kind = "bar" }: HourlyChartOptions) =>
    renderElement(
        html`<uaui-time-series-chart kind=${kind} group-by=${groupBy} .series=${series} .compareSeries=${compareSeries} .range=${range} .compare=${compare}
            .now=${now} .incompleteFrom=${incompleteFrom} style="width:800px"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );

export const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;
export const rowHeaders = (el: Element) => [...deepQuery<HTMLTableElement>(shadow(el), "table")!.querySelectorAll("tbody th")].map((th) => th.textContent!.trim());
export const xTickLabels = (el: Element) => chartOf(el).scales["x"].ticks.map((t) => String(t.label));
