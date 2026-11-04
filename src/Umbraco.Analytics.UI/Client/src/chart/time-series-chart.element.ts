import {
    customElement,
    html,
    nothing,
    property,
    state,
    type CSSResultGroup,
    type PropertyValues,
    type TemplateResult,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiChartMixin } from "./chart.mixin.js";
import type { UauiGroupBy } from "../group-by/group-by.element.js";
import type { UauiWeekStart } from "../date-helpers/date-helpers.js";
import { resolveWeekStart } from "../internal/date/date-math.js";
import { formatIsoDate } from "../internal/date/format-date.js";
import { getNumberFormat } from "../internal/format/number-format.js";
import { bucketMarkers, type MarkerBucket } from "./internal/marker-buckets.js";
import type { UauiMarkerPlacement } from "./internal/markers-plugin.js";
import { buildChartData } from "./internal/chart-data.js";
import { maxValue, seriesTotals, shareTotals, shareValues, type UauiChartData } from "./internal/chart-values.js";
import "./internal/chart-data-table.element.js";
import "./internal/chart-legend.element.js";
import "./internal/chart-markers.element.js";
import { UauiSeriesVisibility, visibleData } from "./internal/series-visibility.js";
import "./internal/chart-tooltip.element.js";
import type { UauiChartMarkersActiveDetail } from "./internal/chart-markers.element.js";
import type { UauiChartLegendToggleDetail } from "./internal/chart-legend.element.js";
import type { UauiChartTooltipCompare, UauiChartTooltipRow } from "./internal/chart-tooltip.element.js";
import type { UauiChartDrawColors } from "./internal/chart-colors.js";
import { UauiChartController } from "./internal/chart.controller.js";
import { renderChartFrame, UauiChartFrameStyles } from "./internal/chart-frame.js";
import type { UauiChartRenderer } from "./internal/chart-renderer.js";
import { colorKeyOf, seriesKindOf } from "./internal/chart-series.js";
import { chartYAxis, usesLogScale } from "./internal/chart-y-axis.js";
import { UauiTimeSeriesOverlays } from "./internal/time-series-overlays.js";
import { TODAY_LABEL_ROOM } from "./internal/today-plugin.js";
import type { UauiCompare, UauiDateRange } from "../date-range/types.js";
import type { UauiChartKind, UauiChartStack, UauiMarker, UauiMarkerClickDetail, UauiSeries, UauiSeriesKind } from "./types.js";

const axisDateFormat: Record<UauiGroupBy, Intl.DateTimeFormatOptions> = {
    day: { day: "numeric", month: "short" },
    week: { day: "numeric", month: "short" },
    month: { month: "short", year: "numeric" },
};

const tooltipDateFormat: Record<UauiGroupBy, Intl.DateTimeFormatOptions> = {
    day: { day: "numeric", month: "short", year: "numeric" },
    week: { day: "numeric", month: "short", year: "numeric" },
    month: { month: "long", year: "numeric" },
};

/** The share view's y-axis: 0 to 100% in quarters. */
const SHARE_STEP = 0.25;
const SHARE_TICK_FORMAT: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 0 };
/** A share in the tooltip and the hidden table: "42.5%". */
const SHARE_FORMAT: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 1 };

interface DerivedFrom {
    kind: UauiChartKind;
    series: UauiSeries[];
    compareSeries: UauiSeries[];
    range?: UauiDateRange;
    compare?: UauiCompare;
    groupBy: UauiGroupBy;
    weekStart: UauiWeekStart;
    valueFormat?: Intl.NumberFormatOptions;
    lang: string;
    /** The share view is on (`stack="percent"` with a kind that stacks). */
    share: boolean;
    /** The ids of the series the editor hid from the legend. */
    hidden: ReadonlySet<string>;
}

interface Derived {
    /** What is drawn: every series but the hidden ones. */
    data: UauiChartData;
    /** For each series in `data`, its index in the chart's `series`. */
    shown: number[];
    /** How each series in `data` is drawn: its own `kind`, else the chart's. */
    kinds: UauiSeriesKind[];
    /** How every series is drawn, hidden ones too, for the legend. */
    allKinds: UauiSeriesKind[];
    /** How the chart compares, counting every series (hidden or not), so the legend's compare entry stays. */
    legendCompare: { bars: boolean; lines: boolean };
    axisLabels: string[];
    dateLabels: string[];
    /** Per series, the formatted date of each compare point (empty string where there is none). */
    compareDateLabels: string[][];
    /** The sum of the bar series per date (of every series when there are no bars), `null` where all are missing a point. */
    totals: (number | null)[];
    /** For the bar kinds, the formatted date of each compare total (empty string where there is none). */
    compareTotalDateLabels: string[];
    /**
     * The share view: per series, each value's share (0 to 1) of its date's total, `null` where the series has no point
     * or the date's total is 0. Absent otherwise.
     */
    shares?: (number | null)[][];
    numberFormat: Intl.NumberFormat;
    /** Formats a share: "42.5%". */
    shareFormat: Intl.NumberFormat;
    /** A marker's own date, whichever bucket it is drawn in. */
    markerDate: Intl.DateTimeFormat;
    lang: string;
}

interface MarkersFrom {
    markers: UauiMarker[];
    dates: string[];
    groupBy: UauiGroupBy;
}

const emptyDerived: Derived = {
    data: { labels: [], series: [] },
    shown: [],
    kinds: [],
    allKinds: [],
    legendCompare: { bars: false, lines: false },
    axisLabels: [],
    dateLabels: [],
    compareDateLabels: [],
    totals: [],
    compareTotalDateLabels: [],
    numberFormat: getNumberFormat("en"),
    shareFormat: getNumberFormat("en", SHARE_FORMAT),
    markerDate: new Intl.DateTimeFormat("en", tooltipDateFormat.day),
    lang: "en",
};

/**
 * `UmbLitElement` with the settings every chart shares (`UauiChartMixin`), for dated series: the base of
 * `uaui-time-series-chart`. Exported so its type has a name in the public API; extend the element, not this.
 */
export const UauiTimeSeriesChartElementBase = UauiChartMixin(UmbLitElement);

/**
 * Shows a metric over time as lines, filled areas, bars or stacked bars, with a legend, a hover tooltip and a visually
 * hidden table of the same data for screen readers.
 *
 * Draws only: pass the points in `series`. Pass last period's points in `compare-series` to draw them as a
 * dashed line with the gap shaded. Series are matched by `id`. Compare points are matched by bucket (`group-by`) offset from the first compare date, not
 * by calendar date: the 2nd week or month of the compare period sits under the 2nd of the current one. A shorter compare
 * period leaves the trailing dates empty. Points on the same date add up.
 * The bar kinds draw each date's compare series, added together, as one bar behind the current bar or bars
 * (so there `compare-series` needn't match the `id`s of `series`). `stacked-bar` stacks the series per date and
 * adds a total to the tooltip and the hidden table.
 * A series' own `kind` (`"line"` or `"bar"`) mixes the two in one chart, on one y-axis: lines are drawn over the bars
 * and never stack; a compare series matched to a line by `id` is its dashed line, and the rest add up into the compare
 * bar. The total counts the bars only.
 * `today` draws a thin labelled line at today's date, for dates that run past it. `y-scale="log"` spaces the y-axis by
 * powers of ten, bending toward 0 at the bottom so 0 stays on the axis line.
 * `stack="percent"` with `kind="stacked-bar"` or `"area"` is a 100% share view: each date's series as its share of that
 * date's total, on a 0 to 100% axis, with the share and the value in the tooltip and the hidden table.
 * Many series stay readable: series 5 to 8 get their own palette slots (teal, sky blue, plum, olive in light; sage, orchid, pink, gold in dark) before the colours
 * repeat, a legend of more than 8 series folds to the first 7 and a "Show N more" button, and a tooltip of more than 8
 * rows lists the 7 largest (in its usual order) and "+N more". In the share view the tooltip lists the rows as the stack
 * draws them, top first.
 * Each series in the legend is a toggle button: pressing it hides or shows that series (visual only, for this chart only).
 * The y-axis rescales to the series drawn, and the tooltip and the hidden table list only those; in the share view the
 * shares are worked out again. The compare entry stays, and with every series hidden the plot is empty but the legend stays.
 * `markers` draw a dashed line and a dot on the x-axis at their date (in the bucket that contains it when grouped by
 * week or month; none when it is outside the chart). Each dot is a button: hover or focus shows the markers' dates,
 * titles and descriptions, and click or Enter raises `marker-click`. Markers in one bucket share a dot.
 * The x-axis labels follow `group-by`, and every number
 * (axis, tooltip, table) is formatted with `value-format` in the backoffice user's culture.
 * While `loading` is set it shows a skeleton on first load, or keeps the old data under a loading bar
 * when reloading. With no points it shows `uaui-empty-state`. While `error` is set it shows `uaui-error-state` in place
 * of the plot (error wins over loading, and loading over empty).
 *
 * @element uaui-time-series-chart
 * @fires retry - The Retry button of the error state was pressed (needs `retryable`). Bubbles, not composed.
 * @fires marker-click - The editor clicked a marker's dot, or pressed Enter or Space on it. Bubbles, not composed or cancelable, like `uaui-group-by`'s `change`. `detail` is `{ id }` (`UauiMarkerClickDetail`); a dot standing for several markers raises the earliest one's id.
 * @cssprop --uaui-chart-height - Height of the plot, without the legend or padding. Defaults to 260px.
 * @cssprop --uaui-chart-padding - Padding around the plot, legend and empty state, as a CSS `padding` value. Defaults to `12px 24px 28px`. The loading bar ignores it and spans the full width at the top edge, so put the chart in a `uui-box` with `--uui-box-default-padding: 0`.
 * @cssprop --uaui-series-1 - Colour of the first series. Series 2 to 8 follow (5 to 8 for charts with many series), then the colours repeat.
 * @cssprop --uaui-series-2 - Colour of the second series.
 * @cssprop --uaui-series-3 - Colour of the third series.
 * @cssprop --uaui-series-4 - Colour of the fourth series.
 * @cssprop --uaui-series-5 - Colour of the fifth series (teal in light, sage in dark). `--uaui-series-6` to `--uaui-series-8` follow (sky blue, plum and olive in light; orchid, pink and gold in dark).
 * @cssprop --uaui-bar-1 - Colour of the first series' bars. Bars 2 to 8 follow (`--uaui-bar-5` to `--uaui-bar-8` default to their line colours). Each falls back to `--uaui-series-N`, then to a livelier default than the line colour.
 * @cssprop --uaui-bar-2 - Colour of the second series' bars.
 * @cssprop --uaui-bar-3 - Colour of the third series' bars.
 * @cssprop --uaui-bar-4 - Colour of the fourth series' bars.
 * @cssprop --uaui-series-default - Colour of a series with `color: "default"`. Defaults to a neutral grey.
 * @cssprop --uaui-series-positive - Colour of a series with `color: "positive"`. Defaults to UUI's positive green.
 * @cssprop --uaui-series-warning - Colour of a series with `color: "warning"`. Defaults to UUI's warning yellow (dark sunglow in light).
 * @cssprop --uaui-series-danger - Colour of a series with `color: "danger"`. Defaults to UUI's danger red.
 * @cssprop --uaui-bar-default - Colour of a `color: "default"` series' bars. The other statuses follow (`--uaui-bar-positive`, `--uaui-bar-warning`, `--uaui-bar-danger`). Each falls back to `--uaui-series-<status>`.
 * @cssprop --uaui-compare - Colour of the compare line, and of the compare bar (at 45% opacity).
 * @cssprop --uaui-marker - Colour of the marker dots and their dashed lines (the lines at 26% opacity). Defaults to space cadet in light and white in dark.
 * @cssprop --uaui-gap-positive - Shading between a series and its compare line where the series is doing better than it (above it, or below it with `lower-is-better`).
 * @cssprop --uaui-gap-negative - Shading between a series and its compare line where the series is doing worse than it (below it, or above it with `lower-is-better`).
 */
@customElement("uaui-time-series-chart")
export class UauiTimeSeriesChartElement extends UauiTimeSeriesChartElementBase {
    /** How the series are drawn. A series' own `kind` (`"line"` or `"bar"`) overrides it for that series. */
    @property({ type: String, reflect: true })
    kind: UauiChartKind = "line";

    /**
     * `"percent"` is a 100% share view, for how a whole splits (entries per source page): each date's series as its
     * share of that date's total, stacked to 100% on a 0 to 100% axis. It needs a kind that stacks: `"stacked-bar"`
     * (segments) or `"area"` (bands, each filled down to the one below). With `"line"` or `"bar"` it is ignored, with a
     * warning once. The tooltip and the hidden table show each share with its value, and the total. A date whose total
     * is 0 shows no share (nothing is drawn there), and a value below 0 counts as 0. In the share view every series is
     * drawn as the chart's `kind` (a series' own `kind` is ignored), `compare-series` isn't drawn (each date adds up to
     * 100%, so the compared period would hide in it; show it beside the chart instead) and `y-scale` is linear; each
     * of these warns once. `"normal"` (the default, and any other value) draws the values as `kind` says.
     */
    @property({ type: String, reflect: true })
    stack: UauiChartStack = "normal";

    /**
     * The period the series cover, as `uaui-date-range` emits it. Optional but recommended with `compare`: compare
     * points are aligned from the start of this range's first bucket. Without it, from the first point of the
     * series, which misaligns the compare when sparse data omits the period's first days (or weeks, or months).
     */
    @property({ attribute: false })
    range?: UauiDateRange;

    /**
     * The period `compareSeries` covers, as `uaui-date-range` emits it. Optional but recommended with `range`: see
     * `range`. Without it, the compare period starts at the first point of `compareSeries`.
     */
    @property({ attribute: false })
    compare?: UauiCompare;

    /**
     * One line (or set of bars) per series, from `UauiChartMixin`. Dates are ISO ("2026-06-11"); a date-time is read as
     * the day it starts with. Series needn't share the same dates. Points of one series on the same date add up, so
     * aggregate rates and averages first.
     */
    declare series: UauiSeries[];

    /**
     * The same metrics for another period, from `UauiChartMixin`. A line's compare series is matched to the series with
     * the same `id` and drawn as a dashed line; its points line up by bucket offset (the Nth `group-by` bucket from its
     * first date under the Nth from the series' first date), so the two periods can cover different dates. Points on
     * one date add up. The bar kinds add every compare series up, matched or not, into one compare bar per date.
     */
    declare compareSeries: UauiSeries[];

    /** Events shown as a dot on the x-axis with a dashed line. One outside the chart's dates draws nothing. */
    @property({ attribute: false })
    markers: UauiMarker[] = [];

    /**
     * Today's ISO date ("2026-11-02"), to draw a thin solid line at it labelled "Today", for a chart whose dates run on
     * past today (reviews due next week). Taken from the product, not the clock, so it is the editor's day as the
     * product counts it. It is drawn in the date (or the week or month, per `group-by`) that contains it, and not at all
     * when no date does. The tooltip and the hidden table name that date as today. Dates after today are drawn like any
     * other: pass a point (0 when there is nothing yet) for each, as the chart's dates are its points' dates.
     */
    @property({ type: String })
    today?: string;

    /** Sets the format of the x-axis labels, and the bucket unit (day, week, month) that compare points are aligned in. The points themselves are not grouped: pass them already grouped, with each bucket at its first day. */
    @property({ type: String, attribute: "group-by" })
    groupBy: UauiGroupBy = "day";

    /**
     * The day weeks start on when `groupBy` is `week`, as an ISO weekday number: 1 is Monday up to 7 for Sunday, the same
     * as `Intl.Locale.prototype.getWeekInfo().firstDay`, so the editor's culture can be passed straight through:
     * `new Intl.Locale(culture).getWeekInfo().firstDay`. It decides which week a compare point falls in, so give
     * `uauiDateBuckets` the same value. Defaults to 1 (Monday). A value that isn't a whole number from 1 to 7 is read as Monday.
     * If it doesn't match how the product bucketed its points, the compare line can shift by a week when one period starts on the week-start day.
     */
    @property({ type: Number, attribute: "week-start" })
    weekStart: UauiWeekStart = 1;

    /** Where the renderer drew the marker dots, to put a button over each. */
    @state()
    private _markerPlacements: UauiMarkerPlacement[] = [];

    /** The marker dot (by date index) that shows its tooltip, as `uaui-chart-markers` reports it. */
    @state()
    private _activeMarker?: number;

    /** Draws the chart (Chart.js through the renderer), and holds the hover. */
    #visibility = new UauiSeriesVisibility(this);
    #chart = new UauiChartController(this, {
        colorKeys: () => this.#colorKeys,
        draw: (renderer, colors) => this.#draw(renderer, colors),
        plugins: () => this.#overlays.plugins(),
    });
    /** The marker dots and the today line: what only a date x-axis draws. */
    #overlays = new UauiTimeSeriesOverlays((placements) => {
        this._markerPlacements = placements;
    });
    /** Everything derived from the inputs below: shared dates, formatted labels and formatters. */
    #derived: Derived = emptyDerived;
    /** What `#derived` was built from. Hovering re-renders the element but changes none of these. */
    #derivedFrom?: DerivedFrom;
    #markerBuckets: MarkerBucket[] = [];
    #markersFrom?: MarkersFrom;
    /** The index of the date that contains `today`, if any. */
    #todayIndex?: number;
    /** The dates of the hidden table and the tooltip, with today's named, and the `#derived` they were made from. */
    #tableDates: string[] = [];
    #tableDatesFrom?: Derived;

    // The chart controller does the connect, disconnect and draw work. `connectedCallback` and `updated` stay overridden
    // only because the public API report lists them (dropping them changes `api/analytics-ui.api.md`).
    override connectedCallback() {
        super.connectedCallback();
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        // The controller destroys the chart; a new one starts with no marker active.
        this.#overlays.setActiveMarker(undefined);
        this._markerPlacements = [];
        this._activeMarker = undefined;
    }

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const next = { kind: this.kind, series: this.series, compareSeries: this.compareSeries, range: this.range, compare: this.compare, groupBy: this.groupBy, weekStart: resolveWeekStart(this.weekStart), valueFormat: this.valueFormat, lang: this.localize.lang(), share: this.#isShare, hidden: this.#visibility.hidden };
        const prev = this.#derivedFrom;
        if (!prev || (Object.keys(next) as (keyof typeof next)[]).some((key) => prev[key] !== next[key])) {
            this.#derivedFrom = next;
            this.#derived = this.#derive(next);
            this.#chart.invalidate();
        }
        if (changed.has("kind") || changed.has("stack") || changed.has("lowerIsBetter") || changed.has("yScale") || changed.has("today")) this.#chart.invalidate();

        const todayIndex = this.today ? bucketMarkers([{ id: "today", date: this.today, title: "" }], this.#derived.data.labels, this.groupBy)[0]?.index : undefined;
        if (todayIndex !== this.#todayIndex || this.#tableDatesFrom !== this.#derived) {
            this.#todayIndex = todayIndex;
            this.#tableDatesFrom = this.#derived;
            const { dateLabels } = this.#derived;
            this.#tableDates = todayIndex === undefined ? dateLabels : dateLabels.map((label, i) => (i === todayIndex ? this.#todayDate(label) : label));
            this.#chart.invalidate();
        }

        const markersNext = { markers: this.markers, dates: this.#derived.data.labels, groupBy: this.groupBy };
        const markersPrev = this.#markersFrom;
        if (!markersPrev || (Object.keys(markersNext) as (keyof MarkersFrom)[]).some((key) => markersPrev[key] !== markersNext[key])) {
            this.#markersFrom = markersNext;
            this.#markerBuckets = bucketMarkers(markersNext.markers, markersNext.dates, markersNext.groupBy);
            this.#chart.invalidate();
        }
    }

    protected override updated(changed: PropertyValues<this>) {
        super.updated(changed);
    }

    get #hasData() {
        return this.series.some((s) => s.points.length > 0);
    }

    /**
     * Builds the shared dates, the formatted labels and the formatters once per change of inputs.
     * `localize.number` and `localize.date` build a new `Intl` formatter on every call, which is far
     * too slow for the hundreds of labels and table cells of a long chart. These formatters use the
     * same language `localize` does.
     */
    #derive({ kind, series, compareSeries, range, compare, groupBy, weekStart, valueFormat, lang, share, hidden }: DerivedFrom): Derived {
        // The share view draws every series as the chart's kind, so they all stack, and draws no compare.
        const allKinds = series.map((s) => (share ? seriesKindOf({}, kind) : seriesKindOf(s, kind)));
        const lines = allKinds.map((k) => k === "line");
        const build = (compareOf: UauiSeries[]) =>
            buildChartData(series, share ? [] : compareOf, groupBy, { from: range?.from, compareFrom: compare?.from }, weekStart, lines);
        const full = build(compareSeries);
        const { data, shown } = visibleData(full, series.map((s) => s.id), hidden, () => build(compareSeries.filter((c) => !hidden.has(c.id))));
        const kinds = shown.map((i) => allKinds[i]);
        const bars = kinds.map((k) => k === "bar");
        const axisDate = new Intl.DateTimeFormat(lang, axisDateFormat[groupBy] ?? axisDateFormat.day);
        const tooltipDate = new Intl.DateTimeFormat(lang, tooltipDateFormat[groupBy] ?? tooltipDateFormat.day);
        const tooltipLabel = (iso: string | null) => (iso ? formatIsoDate(iso, tooltipDate) : "");
        return {
            data,
            shown,
            kinds,
            allKinds,
            legendCompare: { bars: allKinds.includes("bar") && !!full.compareTotal, lines: full.series.some((s, i) => allKinds[i] === "line" && !!s.compare) },
            axisLabels: data.labels.map((d) => formatIsoDate(d, axisDate)),
            dateLabels: data.labels.map(tooltipLabel),
            compareDateLabels: data.series.map((s) => (s.compareLabels ?? []).map(tooltipLabel)),
            // The share view's total counts a value below 0 as 0, as its shares do, so the shares add up to it.
            totals: share ? shareTotals(data) : seriesTotals(data, bars.some(Boolean) ? bars : undefined),
            compareTotalDateLabels: (data.compareTotal?.labels ?? []).map(tooltipLabel),
            shares: share ? shareValues(data) : undefined,
            numberFormat: getNumberFormat(lang, valueFormat),
            shareFormat: getNumberFormat(lang, SHARE_FORMAT),
            markerDate: new Intl.DateTimeFormat(lang, tooltipDateFormat.day),
            lang,
        };
    }

    get #colorKeys() {
        return this.#derived.shown.map((i) => colorKeyOf(this.series[i], i));
    }

    /** How many series are drawn as bars. */
    get #barCount() {
        return this.#derived.kinds.filter((k) => k === "bar").length;
    }

    /** Bars compare against the compare total (one bar per date behind them). */
    get #comparesBars() {
        return this.#barCount > 0 && !!this.#derived.data.compareTotal;
    }

    /**
     * The total of the bars is shown (tooltip, hidden table) where there are several to add up and it is either
     * what the bars stack to or what the compare total is compared against.
     */
    get #showsTotal() {
        if (this.#isShare) return this.#derived.data.series.length > 1;
        return this.#barCount > 1 && (this.kind === "stacked-bar" || this.#comparesBars);
    }

    get #isLog() {
        return !this.#isShare && usesLogScale(this.yScale, this.kind, this.#barCount);
    }

    /** The share view: `stack="percent"` with a kind that stacks. */
    get #isShare() {
        return this.stack === "percent" && (this.kind === "stacked-bar" || this.kind === "area");
    }

    /** A date as the tooltip and the hidden table name it when it is today's. */
    #todayDate(label: string) {
        // A week or month isn't today: it contains it.
        return this.groupBy === "week" || this.groupBy === "month"
            ? this.localize.term("uauiAnalytics_chartTodayInBucket", label)
            : this.localize.term("uauiAnalytics_chartTodayDate", label);
    }

    get #totalText() {
        return this.localize.term("uauiAnalytics_chartTotalLabel");
    }

    get #compareText() {
        return this.compareLabel || this.localize.term("uauiAnalytics_chartComparisonLabel");
    }

    /** Hands the renderer the chart's model. Called by the chart controller. */
    #draw(renderer: UauiChartRenderer, colors: UauiChartDrawColors) {
        const { data, kinds, axisLabels, lang } = this.#derived;
        const max = maxValue(data, this.kind, kinds.map((k) => k === "bar"));
        this.#overlays.set(
            colors,
            this.#markerBuckets.map((b) => ({ index: b.index, count: b.markers.length })),
            this.#todayIndex === undefined ? undefined : { index: this.#todayIndex, label: this.localize.term("uauiAnalytics_chartToday") },
        );
        this.#warnLogStacked();
        this.#warnShare();
        if (this.#isShare) {
            const tick = getNumberFormat(lang, SHARE_TICK_FORMAT);
            renderer.update({
                kind: this.kind,
                share: true,
                labels: axisLabels,
                roomAbove: this.today ? TODAY_LABEL_ROOM : 0,
                colors,
                datasets: data.series.map((s, i) => ({ label: s.label, kind: kinds[i], values: this.#bandValues(i) })),
                yMax: 1,
                yStep: SHARE_STEP,
                formatTick: (value) => tick.format(value),
            });
            return;
        }
        const axis = chartYAxis(data, max, this.#isLog, lang, this.valueFormat);
        const to = axis.toAxis ?? ((value: number | null) => value);
        const compareTotal = this.#barCount > 0 ? data.compareTotal?.values : undefined;
        renderer.update({
            kind: this.kind,
            labels: axisLabels,
            // Room above the plot for the today label, whether or not today is among the dates, so the plot doesn't
            // jump as the editor moves through date ranges.
            roomAbove: this.today ? TODAY_LABEL_ROOM : 0,
            colors,
            lowerIsBetter: this.lowerIsBetter,
            datasets: data.series.map((s, i) => ({
                label: s.label,
                kind: kinds[i],
                values: s.values.map(to),
                compare: kinds[i] === "line" ? s.compare?.map(to) : undefined,
            })),
            compareTotal: axis.toAxis ? compareTotal?.map(axis.toAxis) : compareTotal,
            yMax: axis.yMax,
            yStep: axis.yStep,
            formatTick: axis.formatTick,
            yTicks: axis.yTicks,
        });
    }

    /** Warns once per chart that `y-scale="log"` is ignored while bars stack. */
    #warnLogStacked() {
        if (this.yScale !== "log" || this.#isLog || !this.#barCount || this.#isShare) return;
        this.#chart.warnOnce(
            "log-stacked",
            'y-scale="log" is ignored with kind="stacked-bar", as stacked bars on a log axis don\'t add up by height. Use kind="bar".',
        );
    }

    /**
     * The share view's drawn values of series `i`: its shares. For `area`, a series with no point on a date that has a
     * total is drawn at 0 (a band of no thickness), else the band above it, filled down to it, would have a hole there.
     * Only a date whose total is 0 stays `null` (every series together), so it is left empty. The tooltip and hidden table
     * keep the `null`: the series has no value there. Stacked bars need no 0: a missing segment leaves no hole.
     */
    #bandValues(i: number): (number | null)[] {
        const shares = this.#derived.shares ?? [];
        const values = shares[i] ?? [];
        if (this.kind !== "area") return values;
        return values.map((v, date) => (v === null && shares.some((s) => s[date] !== null) ? 0 : v));
    }

    /** Warns once per chart about what `stack="percent"` ignores, or that it is ignored. */
    #warnShare() {
        if (this.stack !== "percent") return;
        if (!this.#isShare) {
            this.#chart.warnOnce(
                "share-kind",
                `stack="percent" is ignored with kind="${this.kind}": a share view stacks the series. Use kind="stacked-bar" or kind="area".`,
            );
            return;
        }
        if (this.compareSeries.length)
            this.#chart.warnOnce(
                "share-compare",
                'compare-series is not drawn with stack="percent": every date adds up to 100%, so the compared period would hide in it. Show the compare beside the chart, or use stack="normal".',
            );
        if (this.yScale === "log")
            this.#chart.warnOnce("share-log", 'y-scale="log" is ignored with stack="percent": shares are drawn on a 0 to 100% axis.');
        if (this.series.some((s) => (s.kind === "line" || s.kind === "bar") && s.kind !== seriesKindOf({}, this.kind)))
            this.#chart.warnOnce(
                "share-series-kind",
                `a series' own kind is ignored with stack="percent": every series is drawn as kind="${this.kind}", so the shares stack to 100%.`,
            );
    }

    /** One row per series with a point at the hovered date, and for the bar kinds the total and the compare total. */
    #renderTooltip() {
        const hover = this.#chart.hover;
        const { data, shown, kinds, dateLabels, compareDateLabels, compareTotalDateLabels, totals, shares, numberFormat, shareFormat } = this.#derived;
        // With every series hidden nothing is drawn, so there is nothing to describe.
        if (!hover || !data.series.length || !dateLabels[hover.index] || this._activeMarker !== undefined) return nothing;
        const { index } = hover;
        // The share view draws bands and segments in the bar colours, so its swatches are squares.
        const bars = this.#barCount > 0 || !!shares;
        const rows = data.series.flatMap((s, i): UauiChartTooltipRow[] => {
            const value = s.values[index];
            if (value === null) return [];
            const compare = s.compare?.[index];
            return [
                {
                    color: colorKeyOf(this.series[shown[i]], shown[i]),
                    bar: !!shares || kinds[i] === "bar",
                    value,
                    label: this.series.length > 1 ? s.label : undefined,
                    ...(shares ? { share: shares[i][index] } : {}),
                    compare: compare === null || compare === undefined ? undefined : { value: compare, label: compareDateLabels[i][index], current: value },
                },
            ];
        });
        // The share view lists the rows as the stack draws them, top segment or band first (the last series).
        if (shares) rows.reverse();
        const total = totals[index];
        const compareTotalValue = bars ? data.compareTotal?.values[index] : null;
        const compareTotal: UauiChartTooltipCompare | undefined =
            compareTotalValue === null || compareTotalValue === undefined
                ? undefined
                : { value: compareTotalValue, label: compareTotalDateLabels[index], current: total };
        return html`<uaui-chart-tooltip
            style="visibility:hidden"
            aria-hidden="true"
            .heading=${this.#tableDates[index] ?? dateLabels[index]}
            .rows=${rows}
            .bars=${bars}
            .lowerIsBetter=${this.lowerIsBetter}
            .total=${(bars || shares) && this.#showsTotal && total !== null ? { value: total, label: this.#totalText } : undefined}
            .compareTotal=${compareTotal}
            .numberFormat=${numberFormat}
            .shareFormat=${shareFormat}></uaui-chart-tooltip>`;
    }

    #onActiveMarker(e: CustomEvent<UauiChartMarkersActiveDetail>) {
        this._activeMarker = e.detail.index;
        if (this.#chart.created && this.#overlays.setActiveMarker(e.detail.index)) this.#chart.draw();
    }

    // The markers' own `marker-click` doesn't bubble, so the chart raises the public one.
    #onMarkerClick(e: CustomEvent<UauiMarkerClickDetail>) {
        this.dispatchEvent(new CustomEvent<UauiMarkerClickDetail>("marker-click", { bubbles: true, detail: e.detail }));
    }

    /** One button over each dot, and the tooltip of the one the pointer or keyboard is on. */
    #renderMarkers() {
        return html`<uaui-chart-markers
            .buckets=${this.#markerBuckets}
            .placements=${this._markerPlacements}
            .dateFormat=${this.#derived.markerDate}
            @active-change=${this.#onActiveMarker}
            @marker-click=${this.#onMarkerClick}></uaui-chart-markers>`;
    }

    /** A legend entry was pressed: hide its series, or show it again. */
    #onLegendToggle(e: CustomEvent<UauiChartLegendToggleDetail>) {
        this.#visibility.toggle(e.detail.id);
    }

    #renderLegend() {
        const { allKinds, legendCompare } = this.#derived;
        if (this.series.length < 2 && !legendCompare.bars && !legendCompare.lines) return nothing;
        const share = this.#isShare;
        const hidden = this.#visibility.hidden;
        const entries = this.series.map((s, i) => ({
            id: s.id,
            label: s.label,
            color: colorKeyOf(s, i),
            bar: share || allKinds[i] === "bar",
            selected: !hidden.has(s.id),
        }));
        // The compare entry shows each way the chart draws the compared period: a bar, a dashed line, or both. It counts
        // every series, so it stays when the series that is compared is hidden.
        const compareShapes = [...(legendCompare.bars ? (["bar"] as const) : []), ...(legendCompare.lines ? (["line"] as const) : [])];
        return html`<uaui-chart-legend
            .entries=${entries}
            .bars=${share || entries.some((e) => e.bar)}
            .compareShapes=${compareShapes}
            .compareLabel=${compareShapes.length ? this.#compareText : undefined}
            @selected=${this.#onLegendToggle}
            @deselected=${this.#onLegendToggle}></uaui-chart-legend>`;
    }

    /** The same data for screen readers. Every input is stable until the data changes, so it re-renders only then. */
    #renderTable() {
        const { data, totals, shares, numberFormat, shareFormat } = this.#derived;
        return html`<uaui-chart-data-table
            .labelsHeader=${this.localize.term("uauiAnalytics_chartTableDateHeader")}
            .labels=${this.#tableDates}
            .series=${data.series}
            .totals=${this.#showsTotal ? totals : undefined}
            .totalLabel=${this.#totalText}
            .compareTotal=${this.#comparesBars ? data.compareTotal?.values : undefined}
            .logScale=${this.#isLog}
            .shares=${shares}
            .shareFormat=${shareFormat}
            .numberFormat=${numberFormat}></uaui-chart-data-table>`;
    }

    override render(): TemplateResult {
        return renderChartFrame({
            label: this.localize.term("uauiAnalytics_chartAriaLabel"),
            hasData: this.#hasData,
            mode: this.loadingMode(this.#hasData),
            busy: this.isBusy(),
            error: this.error,
            errorHeadline: this.errorHeadline,
            errorDescription: this.errorDescription,
            retryable: this.retryable,
            onRetry: this.dispatchRetry,
            emptyHeadline: this.emptyHeadline,
            emptyDescription: this.emptyDescription,
            tooltip: this.#renderTooltip(),
            overlay: () => this.#renderMarkers(),
            legend: () => this.#renderLegend(),
            table: () => this.#renderTable(),
        });
    }

    static override styles: CSSResultGroup = UauiChartFrameStyles;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-time-series-chart": UauiTimeSeriesChartElement;
    }
}
