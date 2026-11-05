import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UauiTimeSeriesChartElement } from "./time-series-chart.element.js";
import "./time-series-chart.element.js";
import {
    approved,
    cancelled,
    compareRangeLabel,
    errored,
    erroredPrevious,
    markers,
    newVisitors,
    pageviews,
    pageviewsPrevious,
    pending,
    previousVisitors,
    returningVisitors,
    revenue,
    sessions,
    sessionsPrevious,
    sourcePages,
    sundayWeeks,
    topSourcePages,
    sundayWeeksPrevious,
    wideRange,
    workflowActivity,
    workflowToday,
} from "./internal/chart-fixtures.js";

const meta: Meta<UauiTimeSeriesChartElement> = {
    title: "Components/Time Series Chart",
    component: "uaui-time-series-chart",
    args: {
        kind: "line",
        stack: "normal",
        series: [pageviews],
        compareSeries: [],
        compareLabel: undefined,
        lowerIsBetter: false,
        markers: [],
        today: undefined,
        incompleteFrom: undefined,
        yScale: "linear",
        groupBy: "day",
        weekStart: 1,
        valueFormat: undefined,
        loading: false,
        error: false,
        errorHeadline: undefined,
        errorDescription: undefined,
        retryable: false,
        emptyHeadline: undefined,
        emptyDescription: undefined,
    },
    argTypes: {
        kind: { control: "inline-radio", options: ["line", "area", "bar", "stacked-bar"] },
        stack: { control: "inline-radio", options: ["normal", "percent"] },
        yScale: { control: "inline-radio", options: ["linear", "log"] },
        groupBy: { control: "inline-radio", options: ["day", "week", "month"] },
        weekStart: { control: "inline-radio", options: [1, 2, 3, 4, 5, 6, 7], description: "ISO weekday: 1 is Monday, 7 is Sunday" },
    },
    render: (args) =>
        html`<uui-box headline="Pageviews over time" style="--uui-box-default-padding: 0">
            <uaui-time-series-chart
                .kind=${args.kind}
                .stack=${args.stack}
                .series=${args.series}
                .compareSeries=${args.compareSeries}
                .compareLabel=${args.compareLabel}
                .lowerIsBetter=${args.lowerIsBetter}
                .markers=${args.markers}
                .today=${args.today}
                .incompleteFrom=${args.incompleteFrom}
                .yScale=${args.yScale}
                .groupBy=${args.groupBy}
                .weekStart=${args.weekStart}
                .valueFormat=${args.valueFormat}
                .loading=${args.loading}
                .error=${args.error}
                .errorHeadline=${args.errorHeadline}
                .errorDescription=${args.errorDescription}
                .retryable=${args.retryable}
                .emptyHeadline=${args.emptyHeadline}
                .emptyDescription=${args.emptyDescription}></uaui-time-series-chart>
        </uui-box>`,
};

export default meta;
type Story = StoryObj<UauiTimeSeriesChartElement>;

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

/** The load failed: the error state in place of the plot, with Retry when `retryable` (it raises `retry`). Error wins over loading and empty. */
export const LoadFailed: Story = { args: { error: true, retryable: true } };

/** Two series get a legend. */
export const TwoSeries: Story = { args: { series: [pageviews, sessions] } };

/** One series against the previous period: a dashed line, the gap shaded (green where above, red where below; see Lower is better) and a legend. */
export const Compare: Story = {
    args: { series: [pageviews], compareSeries: [pageviewsPrevious], compareLabel: compareRangeLabel },
};

/**
 * For a metric where a fall is good (refund rate, bounce rate, average duration), set `lower-is-better`: the gap is green
 * where the series is below the compare line and red where above, and the tooltip's change badges read a fall as an
 * improvement. It applies to every series and the total, because one chart shows one metric.
 */
export const LowerIsBetter: Story = {
    name: "Lower is better",
    args: {
        series: [{ ...pageviews, id: "duration", label: "Average duration (ms)" }],
        compareSeries: [{ ...pageviewsPrevious, id: "duration", label: "Average duration (ms)" }],
        compareLabel: compareRangeLabel,
        lowerIsBetter: true,
    },
};

/** Each series is matched to its compare series by `id`; they share the one compare colour and label. */
export const CompareTwoSeries: Story = {
    name: "Compare, two series",
    args: { series: [pageviews, sessions], compareSeries: [pageviewsPrevious, sessionsPrevious], compareLabel: compareRangeLabel },
};

/**
 * Press a legend entry to hide or show its series (they are toggle buttons: Tab to one, Enter or Space). Hiding is
 * visual and per chart: the y-axis rescales to the series drawn, the tooltip and the hidden table list only those, and
 * the other series keep their colours. Here the first series is hidden, as after pressing "Pageviews".
 */
export const LegendHiddenSeries: Story = {
    name: "Legend, series hidden",
    args: { series: [pageviews, sessions], compareSeries: [pageviewsPrevious, sessionsPrevious], compareLabel: compareRangeLabel },
    play: async ({ canvasElement }) => {
        const chart = canvasElement.querySelector("uaui-time-series-chart")!;
        await chart.updateComplete;
        const legend = chart.shadowRoot!.querySelector("uaui-chart-legend")!;
        await legend.updateComplete;
        legend.shadowRoot!.querySelector<HTMLButtonElement>("button.legend-entry")?.click();
    },
};

/** In the share view, hiding a series recomputes the shares: the series left add up to 100% again. */
export const LegendHiddenShare: Story = {
    name: "Legend, series hidden in the share view",
    args: { kind: "stacked-bar", stack: "percent", series: topSourcePages },
    play: async ({ canvasElement }) => {
        const chart = canvasElement.querySelector("uaui-time-series-chart")!;
        await chart.updateComplete;
        const legend = chart.shadowRoot!.querySelector("uaui-chart-legend")!;
        await legend.updateComplete;
        legend.shadowRoot!.querySelector<HTMLButtonElement>("button.legend-entry")?.click();
    },
};

/**
 * Weeks that start on Sunday (`week-start="7"`, the same as `Intl.Locale.getWeekInfo().firstDay` for en-US): the
 * points are the Sundays of `uauiTimeBuckets(range, "week", { weekStart: 7 })` and the compare weeks line up on them.
 */
export const SundayWeekStart: Story = {
    name: "Sunday week start",
    args: { groupBy: "week", weekStart: 7, series: [sundayWeeks], compareSeries: [sundayWeeksPrevious], compareLabel: compareRangeLabel },
};

/** One bar per date. */
export const Bar: Story = { args: { kind: "bar", series: [sessions] } };

/** Series stack into one bar per date; the tooltip adds a total. */
export const StackedBar: Story = {
    name: "Stacked bar",
    args: { kind: "stacked-bar", series: [returningVisitors, newVisitors] },
};

/** The compare series are added up per date and drawn as one lighter, wider bar behind each current bar. */
export const StackedWithCompare: Story = {
    name: "Stacked with compare",
    args: { kind: "stacked-bar", series: [returningVisitors, newVisitors], compareSeries: [previousVisitors], compareLabel: compareRangeLabel },
};

/** Each event is a dot on the x-axis with a dashed line. Hover or Tab to one for its date, title and description; click or Enter raises `marker-click`. Two events on 18 Jun share a dot with a count. */
export const Markers: Story = { args: { kind: "area", markers } };

/** Markers work on every kind. */
export const MarkersOnStackedBar: Story = {
    name: "Markers on stacked bar",
    args: { kind: "stacked-bar", series: [returningVisitors, newVisitors], markers },
};

/**
 * A series' `color` takes a status colour (`"default"`, `"positive"`, `"warning"` or `"danger"`, the status cell's names)
 * as well as a palette slot, for a series that carries a meaning: here Workflow's approved, pending, errored and
 * cancelled. The colour only repeats the label, which says the meaning. Use the kind control for line, area and bar.
 */
export const StatusColors: Story = {
    name: "Status colours",
    args: { kind: "stacked-bar", series: [approved, pending, errored, cancelled] },
};

/** A status series against the previous period: the series keeps its status colour, the compare line keeps the compare colour. */
export const StatusColorCompare: Story = {
    name: "Status colour, compare",
    args: { series: [errored], compareSeries: [erroredPrevious], compareLabel: compareRangeLabel },
};

/**
 * Workflow's approval activity: approved, cancelled and errored as daily bars in their status colours, with pending
 * (a running total) as a line over them (`kind: "line"` on that series). 28 days back and 7 ahead, with `today`
 * drawing a labelled line. Try `stacked-bar` (the line doesn't stack) and `log`.
 */
export const WorkflowActivity: Story = {
    name: "Bars and a line, with today",
    args: { kind: "bar", series: workflowActivity, today: workflowToday },
};

/** Days after today: the series has a point (0) for each, and the today line shows where today is. */
export const DaysAfterToday: Story = {
    name: "Days after today",
    args: { kind: "bar", series: [workflowActivity[0]], today: workflowToday },
};

/**
 * `incomplete-from` marks the latest data as not final: here the last 2 days of 30. The line fades with hollow dots over a
 * light hatched band, so the low last values don't read as a crash. The tooltip and the hidden table say "(incomplete)".
 */
export const IncompleteTail: Story = {
    name: "Incomplete tail",
    args: { series: [pageviews], incompleteFrom: "2026-06-22" },
};

/** The compare line is the previous period, so it is never faded. */
export const IncompleteWithCompare: Story = {
    name: "Incomplete tail, compare",
    args: { series: [pageviews], compareSeries: [pageviewsPrevious], compareLabel: compareRangeLabel, incompleteFrom: "2026-06-22" },
};

/** Bars at the incomplete dates fade; the hatch covers their slots. */
export const IncompleteBars: Story = {
    name: "Incomplete tail, bars",
    args: { kind: "bar", series: [pageviews], incompleteFrom: "2026-06-22" },
};

/** Every segment of a stacked bar fades at an incomplete date. */
export const IncompleteStackedBars: Story = {
    name: "Incomplete tail, stacked bars",
    args: { kind: "stacked-bar", series: [returningVisitors, newVisitors], incompleteFrom: "2026-06-22" },
};

/** With `group-by="week"` the week that contains the date is incomplete, from its first day. */
export const IncompleteWeeks: Story = {
    name: "Incomplete tail, weeks",
    args: { kind: "bar", series: [sundayWeeks], groupBy: "week", weekStart: 7, incompleteFrom: "2026-06-22" },
};

/** `today` and `incomplete-from` are independent: the today line stays on top of the hatch. */
export const IncompleteWithToday: Story = {
    name: "Incomplete tail, with today",
    args: { series: [pageviews], today: "2026-06-23", incompleteFrom: "2026-06-23" },
};

/**
 * `y-scale="log"` for values that span widely: hundreds of pageviews beside a few errors. The axis is spaced by
 * powers of ten and bends toward 0 at the bottom, so 0 sits on the axis line and days with no errors still draw.
 */
export const LogScale: Story = {
    name: "Log scale",
    args: { kind: "line", series: wideRange, yScale: "log" },
};

/** Nine decades on a short axis: the ticks thin to every other (or third) power of ten, so labels never overlap. */
export const LogScaleManyDecades: Story = {
    name: "Log scale, many decades",
    args: {
        kind: "line",
        yScale: "log",
        series: [{ id: "bytes", label: "Bytes", points: ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04"].map((date, i) => ({ date, value: [1, 1e3, 1e6, 1e9][i] })) }],
    },
    render: (args, context) => html`<div style="--uaui-chart-height: 140px">${meta.render!(args, context)}</div>`,
};

/** The Workflow activity chart on a log axis: the few errors stay readable beside the pending total. */
export const LogScaleMixed: Story = {
    name: "Log scale, bars and a line",
    args: { kind: "bar", series: workflowActivity, today: workflowToday, yScale: "log" },
};

/**
 * `stack="percent"` with `kind="stacked-bar"`: each date's entries per source page as shares of that date's total, on a
 * 0 to 100% axis. Hover a bar: each page's share with its entries beside it, and the total. 31 May had no entries, so
 * it shows nothing rather than an empty 100%.
 */
export const ShareStackedBar: Story = {
    name: "Share, stacked bar",
    args: { kind: "stacked-bar", stack: "percent", series: topSourcePages },
};

/** `stack="percent"` with `kind="area"`: the same shares as bands, each filled down to the one below. */
export const ShareArea: Story = {
    name: "Share, area",
    args: { kind: "area", stack: "percent", series: topSourcePages },
};

/** The share view in the dark theme. */
export const ShareDark: Story = {
    name: "Share, dark",
    args: { kind: "area", stack: "percent", series: topSourcePages },
    globals: { theme: "dark" },
};

/**
 * One line per source page, 11 in all: series 5 to 8 take slots 5 to 8 (teal, sky blue, plum and olive here; sage, orchid, pink and gold in dark), then the colours
 * repeat. The legend lists the first 7 and folds the rest behind "Show 4 more"; hover a date and the tooltip lists the
 * 7 largest and "+4 more" (the hidden table has every page). Order the series largest first, so the fold hides the
 * smallest. Past eight series, consider grouping the smallest into one "Other" series with `color: "default"`.
 */
export const ManySeries: Story = {
    name: "Many series",
    args: { kind: "line", series: sourcePages },
};

/** The many series in the dark theme: slots 5 to 8 have their own dark shades. */
export const ManySeriesDark: Story = {
    name: "Many series, dark",
    args: { kind: "line", series: sourcePages },
    globals: { theme: "dark" },
};

/** The legend folded: "Show 4 more" is a button (Tab to it, Enter or Space) that lists every series and becomes "Show fewer". */
export const LegendFolded: Story = {
    name: "Legend, folded",
    args: { kind: "stacked-bar", stack: "percent", series: sourcePages },
};

/** The legend unfolded, as after pressing "Show 4 more". */
export const LegendExpanded: Story = {
    name: "Legend, expanded",
    args: { kind: "stacked-bar", stack: "percent", series: sourcePages },
    play: async ({ canvasElement }) => {
        const chart = canvasElement.querySelector("uaui-time-series-chart")!;
        await chart.updateComplete;
        const legend = chart.shadowRoot!.querySelector("uaui-chart-legend")!;
        await legend.updateComplete;
        legend.shadowRoot!.querySelector<HTMLButtonElement>(".legend-toggle")?.click();
    },
};
