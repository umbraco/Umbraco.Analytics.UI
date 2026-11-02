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
import type { UauiGroupBy } from "../group-by/group-by.element.js";
import type { UauiWeekStart } from "../date-helpers/date-helpers.js";
import { resolveWeekStart } from "../internal/date/date-math.js";
import { formatIsoDate } from "../internal/date/format-date.js";
import { getNumberFormat } from "../internal/format/number-format.js";
import { bucketMarkers, type MarkerBucket } from "./internal/marker-buckets.js";
import type { UauiMarkerPlacement } from "./internal/markers-plugin.js";
import { buildChartData } from "./internal/chart-data.js";
import { maxValue, seriesTotals, type UauiChartData } from "./internal/chart-values.js";
import "./internal/chart-data-table.element.js";
import "./internal/chart-legend.element.js";
import "./internal/chart-markers.element.js";
import "./internal/chart-tooltip.element.js";
import type { UauiChartMarkersActiveDetail } from "./internal/chart-markers.element.js";
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
import type { UauiChartKind, UauiChartScale, UauiMarker, UauiMarkerClickDetail, UauiSeries, UauiSeriesKind } from "./types.js";

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
}

interface Derived {
    data: UauiChartData;
    /** How each series is drawn: its own `kind`, else the chart's. */
    kinds: UauiSeriesKind[];
    axisLabels: string[];
    dateLabels: string[];
    /** Per series, the formatted date of each compare point (empty string where there is none). */
    compareDateLabels: string[][];
    /** The sum of the bar series per date (of every series when there are no bars), `null` where all are missing a point. */
    totals: (number | null)[];
    /** For the bar kinds, the formatted date of each compare total (empty string where there is none). */
    compareTotalDateLabels: string[];
    numberFormat: Intl.NumberFormat;
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
    kinds: [],
    axisLabels: [],
    dateLabels: [],
    compareDateLabels: [],
    totals: [],
    compareTotalDateLabels: [],
    numberFormat: getNumberFormat("en"),
    markerDate: new Intl.DateTimeFormat("en", tooltipDateFormat.day),
    lang: "en",
};

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
 * @cssprop --uaui-series-1 - Colour of the first series. Series 2 to 4 follow, then the colours repeat.
 * @cssprop --uaui-series-2 - Colour of the second series.
 * @cssprop --uaui-series-3 - Colour of the third series.
 * @cssprop --uaui-series-4 - Colour of the fourth series.
 * @cssprop --uaui-bar-1 - Colour of the first series' bars. Bars 2 to 4 follow. Each falls back to `--uaui-series-N`, then to a livelier default than the line colour.
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
export class UauiTimeSeriesChartElement extends UmbLitElement {
    /** How the series are drawn. A series' own `kind` (`"line"` or `"bar"`) overrides it for that series. */
    @property({ type: String, reflect: true })
    kind: UauiChartKind = "line";

    /**
     * How the y-axis spaces its values. `"log"` spaces it by powers of ten, for values that span widely. It still starts
     * at 0: 0 sits on the axis line and the axis bends toward it near the bottom, so a 0 needs no gap and the smallest
     * bar still shows. Higher up, each power of ten gets close to the same height; the lowest decade is about three
     * quarters of one. The shape depends on the smallest value above 0 (the first tick is the power of ten at or below
     * it), so it can change when the date range does. Ticks are at 0 and each power of ten (with the 2s and 5s when there
     * are only one or two), every other or third one when the axis is too short for all. The hidden table's caption
     * says the scale is logarithmic. `stacked-bar` keeps a linear axis, as stacked segments on a log axis don't add up
     * by height. Any other value is linear.
     */
    @property({ type: String, attribute: "y-scale", reflect: true })
    yScale: UauiChartScale = "linear";

    /** One line per series. Dates are ISO ("2026-06-11"). Series needn't share the same dates. */
    @property({ attribute: false })
    series: UauiSeries[] = [];

    /**
     * The same metrics for another period, drawn as a dashed line. Each is matched to the series with the same `id`,
     * and its points to that series' dates by bucket offset (the Nth `group-by` bucket from its first date under the Nth
     * from the series' first date), so the two periods can cover different dates. Points on one date add up.
     */
    @property({ attribute: false })
    compareSeries: UauiSeries[] = [];

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

    /** Names the compared period in the legend and tooltip, e.g. "Apr 25, 2026 – May 24, 2026". Defaults to the translation of "Comparison". */
    @property({ type: String, attribute: "compare-label" })
    compareLabel?: string;

    /**
     * Shows a fall as good, for a metric like refund rate, bounce rate or average duration. The gap shading between a series
     * and its compare line flips (below the compare line is good) and every change badge in the tooltip reads a fall as an
     * improvement. One chart shows one metric, so it applies to every series and to the total.
     */
    @property({ type: Boolean, attribute: "lower-is-better", reflect: true })
    lowerIsBetter = false;

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

    /** How numbers are formatted, e.g. `{ style: "currency", currency: "EUR" }`. */
    @property({ type: Object, attribute: "value-format" })
    valueFormat?: Intl.NumberFormatOptions;

    /** Shows a skeleton on first load, or a loading bar over the old data when reloading. */
    @property({ type: Boolean, reflect: true })
    loading = false;

    /** The load failed. Shows `uaui-error-state` in place of the plot, legend and data table, and wins over `loading` and the empty state. */
    @property({ type: Boolean, reflect: true })
    error = false;

    /** Headline of the error state. Defaults to the translation of "Something went wrong". */
    @property({ type: String, attribute: "error-headline" })
    errorHeadline?: string;

    /** Description of the error state. Defaults to the translation of "The data could not be loaded.". */
    @property({ type: String, attribute: "error-description" })
    errorDescription?: string;

    /** Shows a Retry button in the error state. Pressing it raises `retry` on the chart. */
    @property({ type: Boolean })
    retryable = false;

    /** Headline of the empty state. Defaults to the translation of "No data yet". */
    @property({ type: String, attribute: "empty-headline" })
    emptyHeadline?: string;

    /** Description of the empty state. Defaults to the translation of "Try a wider date range.". */
    @property({ type: String, attribute: "empty-description" })
    emptyDescription?: string;

    /** Where the renderer drew the marker dots, to put a button over each. */
    @state()
    private _markerPlacements: UauiMarkerPlacement[] = [];

    /** The marker dot (by date index) that shows its tooltip, as `uaui-chart-markers` reports it. */
    @state()
    private _activeMarker?: number;

    /** Draws the chart (Chart.js through the renderer), and holds the hover. */
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
        const next = { kind: this.kind, series: this.series, compareSeries: this.compareSeries, range: this.range, compare: this.compare, groupBy: this.groupBy, weekStart: resolveWeekStart(this.weekStart), valueFormat: this.valueFormat, lang: this.localize.lang() };
        const prev = this.#derivedFrom;
        if (!prev || (Object.keys(next) as (keyof typeof next)[]).some((key) => prev[key] !== next[key])) {
            this.#derivedFrom = next;
            this.#derived = this.#derive(next);
            this.#chart.invalidate();
        }
        if (changed.has("kind") || changed.has("lowerIsBetter") || changed.has("yScale") || changed.has("today")) this.#chart.invalidate();

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
    #derive({ kind, series, compareSeries, range, compare, groupBy, weekStart, valueFormat, lang }: DerivedFrom): Derived {
        const kinds = series.map((s) => seriesKindOf(s, kind));
        const lines = kinds.map((k) => k === "line");
        const bars = kinds.map((k) => k === "bar");
        const data = buildChartData(series, compareSeries, groupBy, { from: range?.from, compareFrom: compare?.from }, weekStart, lines);
        const axisDate = new Intl.DateTimeFormat(lang, axisDateFormat[groupBy] ?? axisDateFormat.day);
        const tooltipDate = new Intl.DateTimeFormat(lang, tooltipDateFormat[groupBy] ?? tooltipDateFormat.day);
        const tooltipLabel = (iso: string | null) => (iso ? formatIsoDate(iso, tooltipDate) : "");
        return {
            data,
            kinds,
            axisLabels: data.labels.map((d) => formatIsoDate(d, axisDate)),
            dateLabels: data.labels.map(tooltipLabel),
            compareDateLabels: data.series.map((s) => (s.compareLabels ?? []).map(tooltipLabel)),
            totals: seriesTotals(data, bars.some(Boolean) ? bars : undefined),
            compareTotalDateLabels: (data.compareTotal?.labels ?? []).map(tooltipLabel),
            numberFormat: getNumberFormat(lang, valueFormat),
            markerDate: new Intl.DateTimeFormat(lang, tooltipDateFormat.day),
            lang,
        };
    }

    get #colorKeys() {
        return this.#derived.data.series.map((_, i) => colorKeyOf(this.series[i], i));
    }

    /** How many series are drawn as bars. */
    get #barCount() {
        return this.#derived.kinds.filter((k) => k === "bar").length;
    }

    /** Bars compare against the compare total (one bar per date behind them). */
    get #comparesBars() {
        return this.#barCount > 0 && !!this.#derived.data.compareTotal;
    }

    /** A line compares against its own compare series (matched by `id`), drawn dashed. */
    get #comparesLines() {
        return this.#derived.data.series.some((s, i) => this.#derived.kinds[i] === "line" && s.compare);
    }

    get #isComparing() {
        return this.#comparesBars || this.#comparesLines;
    }

    /**
     * The total of the bars is shown (tooltip, hidden table) where there are several to add up and it is either
     * what the bars stack to or what the compare total is compared against.
     */
    get #showsTotal() {
        return this.#barCount > 1 && (this.kind === "stacked-bar" || this.#comparesBars);
    }

    get #isLog() {
        return usesLogScale(this.yScale, this.kind, this.#barCount);
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
        if (this.yScale !== "log" || this.#isLog || !this.#barCount) return;
        this.#chart.warnOnce(
            "log-stacked",
            'y-scale="log" is ignored with kind="stacked-bar", as stacked bars on a log axis don\'t add up by height. Use kind="bar".',
        );
    }

    /** One row per series with a point at the hovered date, and for the bar kinds the total and the compare total. */
    #renderTooltip() {
        const hover = this.#chart.hover;
        const { data, kinds, dateLabels, compareDateLabels, compareTotalDateLabels, totals, numberFormat } = this.#derived;
        if (!hover || !dateLabels[hover.index] || this._activeMarker !== undefined) return nothing;
        const { index } = hover;
        const bars = this.#barCount > 0;
        const rows = data.series.flatMap((s, i): UauiChartTooltipRow[] => {
            const value = s.values[index];
            if (value === null) return [];
            const compare = s.compare?.[index];
            return [
                {
                    color: colorKeyOf(this.series[i], i),
                    bar: kinds[i] === "bar",
                    value,
                    label: data.series.length > 1 ? s.label : undefined,
                    compare: compare === null || compare === undefined ? undefined : { value: compare, label: compareDateLabels[i][index], current: value },
                },
            ];
        });
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
            .total=${bars && this.#showsTotal && total !== null ? { value: total, label: this.#totalText } : undefined}
            .compareTotal=${compareTotal}
            .numberFormat=${numberFormat}></uaui-chart-tooltip>`;
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

    #renderLegend() {
        if (this.series.length < 2 && !this.#isComparing) return nothing;
        const { kinds } = this.#derived;
        const entries = this.series.map((s, i) => ({ id: s.id, label: s.label, color: colorKeyOf(s, i), bar: kinds[i] === "bar" }));
        // The compare entry shows each way the chart draws the compared period: a bar, a dashed line, or both.
        const compareShapes = [...(this.#comparesBars ? (["bar"] as const) : []), ...(this.#comparesLines ? (["line"] as const) : [])];
        return html`<uaui-chart-legend
            .entries=${entries}
            .bars=${this.#barCount > 0}
            .compareShapes=${compareShapes}
            .compareLabel=${this.#isComparing ? this.#compareText : undefined}></uaui-chart-legend>`;
    }

    /** The same data for screen readers. Every input is stable until the data changes, so it re-renders only then. */
    #renderTable() {
        const { data, totals, numberFormat } = this.#derived;
        return html`<uaui-chart-data-table
            .labels=${this.#tableDates}
            .series=${data.series}
            .totals=${this.#showsTotal ? totals : undefined}
            .totalLabel=${this.#totalText}
            .compareTotal=${this.#comparesBars ? data.compareTotal?.values : undefined}
            .logScale=${this.#isLog}
            .numberFormat=${numberFormat}></uaui-chart-data-table>`;
    }

    override render(): TemplateResult {
        return renderChartFrame({
            label: this.localize.term("uauiAnalytics_chartAriaLabel"),
            hasData: this.#hasData,
            loading: this.loading,
            error: this.error,
            errorHeadline: this.errorHeadline,
            errorDescription: this.errorDescription,
            retryable: this.retryable,
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
