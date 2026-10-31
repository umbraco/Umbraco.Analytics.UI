import {
    css,
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
import "../empty-state/empty-state.element.js";
import "../error-state/error-state.element.js";
import type { UauiGroupBy } from "../group-by/group-by.element.js";
import type { UauiWeekStart } from "../date-helpers/date-helpers.js";
import { resolveWeekStart } from "../internal/date/date-math.js";
import { formatIsoDate } from "../internal/date/format-date.js";
import { getNumberFormat } from "../internal/format/number-format.js";
import { getLoadingMode, isBusy } from "../internal/loading/loading-mode.js";
import "../internal/loading/loading-bar.element.js";
import "../internal/loading/skeleton.element.js";
import { UauiPaletteStyles } from "../theme/index.js";
import { bucketMarkers, type MarkerBucket } from "./internal/marker-buckets.js";
import type { UauiMarkerPlacement } from "./internal/markers-plugin.js";
import { allWhole, buildChartData, maxValue, seriesTotals, type UauiChartData } from "./internal/chart-data.js";
import "./internal/chart-data-table.element.js";
import "./internal/chart-legend.element.js";
import "./internal/chart-markers.element.js";
import "./internal/chart-tooltip.element.js";
import type { UauiChartMarkersActiveDetail } from "./internal/chart-markers.element.js";
import type { UauiChartTooltipCompare, UauiChartTooltipElement, UauiChartTooltipRow } from "./internal/chart-tooltip.element.js";
import { colorsDiffer, resolveChartColors, type UauiChartColors } from "./internal/chart-colors.js";
import { UauiChartRenderer, type UauiChartHover } from "./internal/chart-renderer.js";
import { niceScale } from "./internal/nice-scale.js";
import { clampInside, placeTooltip } from "./internal/place-tooltip.js";
import { watchTheme } from "./internal/theme-watch.js";
import type { UauiCompare, UauiDateRange } from "../date-range/types.js";
import type { UauiChartKind, UauiMarker, UauiMarkerClickDetail, UauiSeries } from "./types.js";

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
    axisLabels: string[];
    dateLabels: string[];
    /** Per series, the formatted date of each compare point (empty string where there is none). */
    compareDateLabels: string[][];
    /** The sum of the series per date, `null` where every series is missing a point. */
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
    data: { dates: [], series: [] },
    axisLabels: [],
    dateLabels: [],
    compareDateLabels: [],
    totals: [],
    compareTotalDateLabels: [],
    numberFormat: getNumberFormat("en"),
    markerDate: new Intl.DateTimeFormat("en", tooltipDateFormat.day),
    lang: "en",
};

/** The palette slot (1 to 4) of a series: its `color` when valid, else its position, cycling through the four. */
function slotOf(series: UauiSeries | undefined, position: number): number {
    const color = series?.color;
    return color === 1 || color === 2 || color === 3 || color === 4 ? color : (position % 4) + 1;
}

/** Whole numbers on the axis unless the step is fractional; compact once the numbers get long. */
function tickFormat(valueFormat: Intl.NumberFormatOptions | undefined, max: number, step: number): Intl.NumberFormatOptions {
    const fractional = !Number.isInteger(step);
    return {
        notation: max >= 10_000 ? "compact" : "standard",
        ...valueFormat,
        minimumFractionDigits: fractional ? undefined : 0,
        maximumFractionDigits: fractional ? Math.min(Math.max(2 - Math.floor(Math.log10(step)), 1), 6) : 0,
    };
}

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
 * @cssprop --uaui-compare - Colour of the compare line, and of the compare bar (at 45% opacity).
 * @cssprop --uaui-marker - Colour of the marker dots and their dashed lines (the lines at 26% opacity). Defaults to space cadet in light and white in dark.
 * @cssprop --uaui-gap-positive - Shading between a series and its compare line where the series is above it.
 * @cssprop --uaui-gap-negative - Shading between a series and its compare line where the series is below it.
 */
@customElement("uaui-time-series-chart")
export class UauiTimeSeriesChartElement extends UmbLitElement {
    /** How the series are drawn. */
    @property({ type: String, reflect: true })
    kind: UauiChartKind = "line";

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

    /** Events shown as a dot on the x-axis with a dashed line. One outside the chart's dates draws nothing. */
    @property({ attribute: false })
    markers: UauiMarker[] = [];

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

    @state()
    private _hover?: UauiChartHover;

    /** Escape hides the date tooltip until the pointer moves to another date or leaves. */
    @state()
    private _hoverDismissed = false;

    /** Where the renderer drew the marker dots, to put a button over each. */
    @state()
    private _markerPlacements: UauiMarkerPlacement[] = [];

    /** The marker dot (by date index) that shows its tooltip, as `uaui-chart-markers` reports it. */
    @state()
    private _activeMarker?: number;

    #renderer?: UauiChartRenderer;
    #stopThemeWatch?: () => void;
    #colors?: UauiChartColors;
    /** Everything derived from the inputs below: shared dates, formatted labels and formatters. */
    #derived: Derived = emptyDerived;
    /** What `#derived` was built from. Hovering re-renders the element but changes none of these. */
    #derivedFrom?: DerivedFrom;
    #markerBuckets: MarkerBucket[] = [];
    #markersFrom?: MarkersFrom;
    /** The chart needs drawing: the derived data or the kind changed. */
    #dirty = true;

    override connectedCallback() {
        super.connectedCallback();
        this.#stopThemeWatch = watchTheme(() => this.#syncColors());
        document.addEventListener("keydown", this.#onDocumentKeydown);
        // On reconnect the first render has already happened, so rebuild the chart in `updated`.
        if (this.hasUpdated) this.requestUpdate();
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        this.#stopThemeWatch?.();
        this.#stopThemeWatch = undefined;
        this.#renderer?.destroy();
        this.#renderer = undefined;
        this.#colors = undefined;
        this._hover = undefined;
        this._markerPlacements = [];
        this._activeMarker = undefined;
        this._hoverDismissed = false;
        document.removeEventListener("keydown", this.#onDocumentKeydown);
    }

    /** WCAG 1.4.13: Escape hides the date tooltip without moving the pointer; `uaui-chart-markers` does the same for its own. */
    #onDocumentKeydown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && this._hover) this._hoverDismissed = true;
    };

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const next = { series: this.series, compareSeries: this.compareSeries, range: this.range, compare: this.compare, groupBy: this.groupBy, weekStart: resolveWeekStart(this.weekStart), valueFormat: this.valueFormat, lang: this.localize.lang() };
        const prev = this.#derivedFrom;
        if (!prev || (Object.keys(next) as (keyof typeof next)[]).some((key) => prev[key] !== next[key])) {
            this.#derivedFrom = next;
            this.#derived = this.#derive(next);
            this.#dirty = true;
        }
        if (changed.has("kind")) this.#dirty = true;

        const markersNext = { markers: this.markers, dates: this.#derived.data.dates, groupBy: this.groupBy };
        const markersPrev = this.#markersFrom;
        if (!markersPrev || (Object.keys(markersNext) as (keyof MarkersFrom)[]).some((key) => markersPrev[key] !== markersNext[key])) {
            this.#markersFrom = markersNext;
            this.#markerBuckets = bucketMarkers(markersNext.markers, markersNext.dates, markersNext.groupBy);
            this.#dirty = true;
        }
    }

    protected override updated(changed: PropertyValues<this>) {
        super.updated(changed);
        this.#syncChart();
        if (this._hover) void this.#placeTooltip();
    }

    get #hasData() {
        return this.series.some((s) => s.points.length > 0);
    }

    get #canvas() {
        return this.shadowRoot?.querySelector<HTMLCanvasElement>("canvas") ?? undefined;
    }

    get #probe() {
        return this.shadowRoot?.querySelector<HTMLElement>(".probe") ?? undefined;
    }

    /**
     * Builds the shared dates, the formatted labels and the formatters once per change of inputs.
     * `localize.number` and `localize.date` build a new `Intl` formatter on every call, which is far
     * too slow for the hundreds of labels and table cells of a long chart. These formatters use the
     * same language `localize` does.
     */
    #derive({ series, compareSeries, range, compare, groupBy, weekStart, valueFormat, lang }: DerivedFrom): Derived {
        const data = buildChartData(series, compareSeries, groupBy, { from: range?.from, compareFrom: compare?.from }, weekStart);
        const axisDate = new Intl.DateTimeFormat(lang, axisDateFormat[groupBy] ?? axisDateFormat.day);
        const tooltipDate = new Intl.DateTimeFormat(lang, tooltipDateFormat[groupBy] ?? tooltipDateFormat.day);
        const tooltipLabel = (iso: string | null) => (iso ? formatIsoDate(iso, tooltipDate) : "");
        return {
            data,
            axisLabels: data.dates.map((d) => formatIsoDate(d, axisDate)),
            dateLabels: data.dates.map(tooltipLabel),
            compareDateLabels: data.series.map((s) => (s.compareDates ?? []).map(tooltipLabel)),
            totals: seriesTotals(data),
            compareTotalDateLabels: (data.compareTotal?.dates ?? []).map(tooltipLabel),
            numberFormat: getNumberFormat(lang, valueFormat),
            markerDate: new Intl.DateTimeFormat(lang, tooltipDateFormat.day),
            lang,
        };
    }

    get #slots() {
        return this.#derived.data.series.map((_, i) => slotOf(this.series[i], i));
    }

    get #isBars() {
        return this.kind === "bar" || this.kind === "stacked-bar";
    }

    /** Bar kinds compare the total of the compare series; line kinds compare each series with its match. */
    get #isComparing() {
        const { data } = this.#derived;
        return this.#isBars ? !!data.compareTotal : data.series.some((s) => s.compare);
    }

    /**
     * The total of the series is shown (tooltip, hidden table) where there are several to add up and it is either
     * what the bars stack to or what the compare total is compared against.
     */
    get #showsTotal() {
        return this.#isBars && this.#derived.data.series.length > 1 && (this.kind === "stacked-bar" || this.#isComparing);
    }

    get #totalText() {
        return this.localize.term("uauiAnalytics_chartTotalLabel");
    }

    get #compareText() {
        return this.compareLabel || this.localize.term("uauiAnalytics_chartComparisonLabel");
    }

    /** Creates the chart if it doesn't exist, and draws it when the data or kind changed. */
    #syncChart() {
        const canvas = this.#canvas;
        const probe = this.#probe;
        if (!canvas || !probe) return;

        if (!this.#renderer) {
            this.#renderer = new UauiChartRenderer(
                canvas,
                (hover) => {
                    this._hoverDismissed = false;
                    this._hover = hover;
                },
                (placements) => {
                    this._markerPlacements = placements;
                },
            );
            this.#dirty = true;
            // Axis text is measured with the web font, so redraw once fonts have settled.
            document.fonts?.ready.then(() => this.#renderer?.redraw());
        }
        if (!this.#dirty) return;
        this.#dirty = false;
        this.#colors = resolveChartColors(probe, this.#slots);
        this.#draw();
    }

    #draw() {
        if (!this.#renderer || !this.#colors) return;
        const { data, axisLabels, lang } = this.#derived;
        const scale = niceScale(maxValue(data, this.kind), 5, allWhole(data));
        const tick = getNumberFormat(lang, tickFormat(this.valueFormat, scale.max, scale.step));
        this.#renderer.update({
            kind: this.kind,
            labels: axisLabels,
            datasets: data.series.map((s) => ({ label: s.label, values: s.values, compare: this.#isBars ? undefined : s.compare })),
            compareTotal: this.#isBars ? data.compareTotal?.values : undefined,
            markers: this.#markerBuckets.map((b) => ({ index: b.index, count: b.markers.length })),
            yMax: scale.max,
            yStep: scale.step,
            formatTick: (value) => tick.format(value),
            colors: this.#colors,
        });
    }

    /** Redraws with the theme's current colours, if they changed. Called when a stylesheet changes. */
    #syncColors() {
        const probe = this.#probe;
        if (!probe || !this.#renderer) return;
        const colors = resolveChartColors(probe, this.#slots);
        if (!colorsDiffer(this.#colors, colors)) return;
        this.#colors = colors;
        this.#draw();
    }

    /** Puts the tooltip beside the hovered point, on the side with room, kept inside the plot. */
    async #placeTooltip() {
        const tip = this.shadowRoot?.querySelector<UauiChartTooltipElement>("uaui-chart-tooltip");
        const plot = this.shadowRoot?.querySelector<HTMLElement>(".plot");
        if (!tip || !plot) return;
        await placeTooltip(tip, ({ width, height }) => {
            const hover = this._hover;
            if (!hover) return undefined;
            const gap = 14;
            const left = hover.x + gap + width > plot.clientWidth ? hover.x - gap - width : hover.x + gap;
            return { left: Math.max(left, 0), top: clampInside(hover.y - height - 8, height, plot.clientHeight) };
        });
    }

    /** One row per series with a point at the hovered date, and for the bar kinds the total and the compare total. */
    #renderTooltip() {
        const hover = this._hover;
        const { data, dateLabels, compareDateLabels, compareTotalDateLabels, totals, numberFormat } = this.#derived;
        if (!hover || this._hoverDismissed || !dateLabels[hover.index] || this._activeMarker !== undefined) return nothing;
        const { index } = hover;
        const bars = this.#isBars;
        const rows = data.series.flatMap((s, i): UauiChartTooltipRow[] => {
            const value = s.values[index];
            if (value === null) return [];
            const compare = bars ? null : s.compare?.[index];
            return [
                {
                    slot: slotOf(this.series[i], i),
                    value,
                    label: data.series.length > 1 ? s.label : undefined,
                    compare: compare === null || compare === undefined ? undefined : { value: compare, date: compareDateLabels[i][index], current: value },
                },
            ];
        });
        const total = totals[index];
        const compareTotalValue = bars ? data.compareTotal?.values[index] : null;
        const compareTotal: UauiChartTooltipCompare | undefined =
            compareTotalValue === null || compareTotalValue === undefined
                ? undefined
                : { value: compareTotalValue, date: compareTotalDateLabels[index], current: total };
        return html`<uaui-chart-tooltip
            style="visibility:hidden"
            aria-hidden="true"
            .date=${dateLabels[index]}
            .rows=${rows}
            .bars=${bars}
            .total=${bars && this.#showsTotal && total !== null ? { value: total, label: this.#totalText } : undefined}
            .compareTotal=${compareTotal}
            .numberFormat=${numberFormat}></uaui-chart-tooltip>`;
    }

    #onActiveMarker(e: CustomEvent<UauiChartMarkersActiveDetail>) {
        this._activeMarker = e.detail.index;
        this.#renderer?.setActiveMarker(e.detail.index);
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
        const entries = this.series.map((s, i) => ({ id: s.id, label: s.label, slot: slotOf(s, i) }));
        return html`<uaui-chart-legend
            .entries=${entries}
            .bars=${this.#isBars}
            .compareLabel=${this.#isComparing ? this.#compareText : undefined}></uaui-chart-legend>`;
    }

    /** The same data for screen readers. Every input is stable until the data changes, so it re-renders only then. */
    #renderTable() {
        const { data, dateLabels, totals, numberFormat } = this.#derived;
        const bars = this.#isBars;
        return html`<uaui-chart-data-table
            .dates=${dateLabels}
            .series=${data.series}
            .bars=${bars}
            .totals=${this.#showsTotal ? totals : undefined}
            .totalLabel=${this.#totalText}
            .compareTotal=${bars ? data.compareTotal?.values : undefined}
            .numberFormat=${numberFormat}></uaui-chart-data-table>`;
    }

    // The error state's `retry` stops at its shadow root, so the chart raises its own.
    #onRetry() {
        this.dispatchEvent(new Event("retry", { bubbles: true }));
    }

    override render(): TemplateResult {
        const mode = getLoadingMode(this.loading, this.#hasData, this.error);
        const busy = isBusy(this.loading, this.error);
        const showPlot = this.#hasData && mode !== "skeleton" && !this.error;
        return html`<div
            class="region"
            role="figure"
            aria-label=${this.localize.term("uauiAnalytics_chartAriaLabel")}
            aria-busy=${busy ? "true" : "false"}>
            ${mode === "reload" ? html`<uaui-loading-bar></uaui-loading-bar>` : nothing}
            <div class="content">
            ${mode === "skeleton" ? html`<uaui-skeleton></uaui-skeleton>` : nothing}
            ${this.error
                ? html`<div class="empty">
                      <uaui-error-state
                          .headline=${this.errorHeadline}
                          .description=${this.errorDescription}
                          .retryable=${this.retryable}
                          @retry=${this.#onRetry}></uaui-error-state>
                  </div>`
                : nothing}
            ${mode === "idle" && !this.error && !this.#hasData
                ? html`<div class="empty">
                      <uaui-empty-state
                          .headline=${this.emptyHeadline}
                          .description=${this.emptyDescription}></uaui-empty-state>
                  </div>`
                : nothing}
            <!-- The plot stays in the DOM while hidden, so the chart is never rebuilt by a loading toggle. -->
            <div class="plot" ?hidden=${!showPlot}>
                <canvas aria-hidden="true"></canvas>
                ${this.#renderTooltip()}
                ${showPlot ? this.#renderMarkers() : nothing}
            </div>
            ${showPlot ? this.#renderLegend() : nothing} ${showPlot ? this.#renderTable() : nothing}
            </div>
            <span class="probe" hidden></span>
        </div>`;
    }

    static override styles: CSSResultGroup = [
        UauiPaletteStyles,
        css`
            :host {
                display: block;
                --_uaui-skeleton-height: var(--uaui-chart-height, 260px);
            }

            .region {
                position: relative;
            }

            /* The chart pads its own content, so the loading bar can span the full width at the top edge. */
            .content {
                padding: var(--uaui-chart-padding, var(--uui-size-space-4) var(--uui-size-space-6) 28px);
            }

            .plot {
                position: relative;
                height: var(--_uaui-skeleton-height);
            }

            .empty {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: var(--_uaui-skeleton-height);
            }

            uaui-empty-state,
            uaui-error-state {
                width: 100%;
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-time-series-chart": UauiTimeSeriesChartElement;
    }
}
