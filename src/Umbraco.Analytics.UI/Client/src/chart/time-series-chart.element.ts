import {
    css,
    customElement,
    html,
    nothing,
    property,
    repeat,
    state,
    type CSSResultGroup,
    type PropertyValues,
    type TemplateResult,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../empty-state/empty-state.element.js";
import "../error-state/error-state.element.js";
import type { UaxGroupBy } from "../group-by/group-by.element.js";
import { dateOnly } from "../internal/date/date-math.js";
import { formatIsoDate } from "../internal/date/format-date.js";
import { getNumberFormat } from "../internal/format/number-format.js";
import { getLoadingMode } from "../internal/loading/loading-mode.js";
import "../internal/loading/loading-bar.element.js";
import "../internal/loading/skeleton.element.js";
import { UaxPaletteStyles } from "../theme/index.js";
import { bucketMarkers, type MarkerBucket } from "./internal/marker-buckets.js";
import type { UaxMarkerPlacement } from "./internal/markers-plugin.js";
import { allWhole, buildChartData, maxValue, seriesTotals, type UaxChartData } from "./internal/chart-data.js";
import "./internal/chart-data-table.element.js";
import "./internal/chart-legend.element.js";
import "./internal/chart-marker-tooltip.element.js";
import "./internal/chart-tooltip.element.js";
import type { UaxChartMarkerTooltipElement } from "./internal/chart-marker-tooltip.element.js";
import type { UaxChartTooltipCompare, UaxChartTooltipElement, UaxChartTooltipRow } from "./internal/chart-tooltip.element.js";
import { colorsDiffer, resolveChartColors, type UaxChartColors } from "./internal/chart-colors.js";
import { UaxChartRenderer, type UaxChartHover } from "./internal/chart-renderer.js";
import { niceScale } from "./internal/nice-scale.js";
import { watchTheme } from "./internal/theme-watch.js";
import type { UaxCompare, UaxDateRange } from "../date-range/types.js";
import type { UaxChartKind, UaxMarker, UaxMarkerClickDetail, UaxSeries } from "./types.js";

const axisDateFormat: Record<UaxGroupBy, Intl.DateTimeFormatOptions> = {
    day: { day: "numeric", month: "short" },
    week: { day: "numeric", month: "short" },
    month: { month: "short", year: "numeric" },
};

const tooltipDateFormat: Record<UaxGroupBy, Intl.DateTimeFormatOptions> = {
    day: { day: "numeric", month: "short", year: "numeric" },
    week: { day: "numeric", month: "short", year: "numeric" },
    month: { month: "long", year: "numeric" },
};

interface DerivedFrom {
    series: UaxSeries[];
    compareSeries: UaxSeries[];
    range?: UaxDateRange;
    compare?: UaxCompare;
    groupBy: UaxGroupBy;
    valueFormat?: Intl.NumberFormatOptions;
    lang: string;
}

interface Derived {
    data: UaxChartData;
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
    markers: UaxMarker[];
    dates: string[];
    groupBy: UaxGroupBy;
}

/** A tooltip lists this many markers of a crowded dot, then says how many more there are. */
const MAX_MARKERS_IN_TOOLTIP = 4;

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
function slotOf(series: UaxSeries | undefined, position: number): number {
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
 * when reloading. With no points it shows `uax-empty-state`. While `error` is set it shows `uax-error-state` in place
 * of the plot (error wins over loading, and loading over empty).
 *
 * @element uax-time-series-chart
 * @fires retry - The Retry button of the error state was pressed (needs `retryable`). Bubbles, not composed.
 * @fires marker-click - The editor clicked a marker's dot, or pressed Enter or Space on it. Bubbles, not composed or cancelable, like `uax-group-by`'s `change`. `detail` is `{ id }` (`UaxMarkerClickDetail`); a dot standing for several markers raises the earliest one's id.
 * @cssprop --uax-chart-height - Height of the plot, without the legend or padding. Defaults to 260px.
 * @cssprop --uax-chart-padding - Padding around the plot, legend and empty state, as a CSS `padding` value. Defaults to `12px 24px 28px`. The loading bar ignores it and spans the full width at the top edge, so put the chart in a `uui-box` with `--uui-box-default-padding: 0`.
 * @cssprop --uax-series-1 - Colour of the first series. Series 2 to 4 follow, then the colours repeat.
 * @cssprop --uax-series-2 - Colour of the second series.
 * @cssprop --uax-series-3 - Colour of the third series.
 * @cssprop --uax-series-4 - Colour of the fourth series.
 * @cssprop --uax-bar-1 - Colour of the first series' bars. Bars 2 to 4 follow. Each falls back to `--uax-series-N`, then to a livelier default than the line colour.
 * @cssprop --uax-bar-2 - Colour of the second series' bars.
 * @cssprop --uax-bar-3 - Colour of the third series' bars.
 * @cssprop --uax-bar-4 - Colour of the fourth series' bars.
 * @cssprop --uax-compare - Colour of the compare line, and of the compare bar (at 45% opacity).
 * @cssprop --uax-marker - Colour of the marker dots and their dashed lines (the lines at 26% opacity). Defaults to space cadet in light and white in dark.
 * @cssprop --uax-gap-positive - Shading between a series and its compare line where the series is above it.
 * @cssprop --uax-gap-negative - Shading between a series and its compare line where the series is below it.
 */
@customElement("uax-time-series-chart")
export class UaxTimeSeriesChartElement extends UmbLitElement {
    /** How the series are drawn. */
    @property({ type: String, reflect: true })
    kind: UaxChartKind = "line";

    /** One line per series. Dates are ISO ("2026-06-11"). Series needn't share the same dates. */
    @property({ attribute: false })
    series: UaxSeries[] = [];

    /**
     * The same metrics for another period, drawn as a dashed line. Each is matched to the series with the same `id`,
     * and its points to that series' dates by bucket offset (the Nth `group-by` bucket from its first date under the Nth
     * from the series' first date), so the two periods can cover different dates. Points on one date add up.
     */
    @property({ attribute: false })
    compareSeries: UaxSeries[] = [];

    /**
     * The period the series cover, as `uax-date-range` emits it. Optional but recommended with `compare`: compare
     * points are aligned from the start of this range's first bucket. Without it, from the first point of the
     * series, which misaligns the compare when sparse data omits the period's first days (or weeks, or months).
     */
    @property({ attribute: false })
    range?: UaxDateRange;

    /**
     * The period `compareSeries` covers, as `uax-date-range` emits it. Optional but recommended with `range`: see
     * `range`. Without it, the compare period starts at the first point of `compareSeries`.
     */
    @property({ attribute: false })
    compare?: UaxCompare;

    /** Names the compared period in the legend and tooltip, e.g. "Apr 25, 2026 – May 24, 2026". Defaults to the translation of "Comparison". */
    @property({ type: String, attribute: "compare-label" })
    compareLabel?: string;

    /** Events shown as a dot on the x-axis with a dashed line. One outside the chart's dates draws nothing. */
    @property({ attribute: false })
    markers: UaxMarker[] = [];

    /** Sets the format of the x-axis labels, and the bucket unit (day, Monday week, month) that compare points are aligned in. The points themselves are not grouped: pass them already grouped, with each bucket at its first day. */
    @property({ type: String, attribute: "group-by" })
    groupBy: UaxGroupBy = "day";

    /** How numbers are formatted, e.g. `{ style: "currency", currency: "EUR" }`. */
    @property({ type: Object, attribute: "value-format" })
    valueFormat?: Intl.NumberFormatOptions;

    /** Shows a skeleton on first load, or a loading bar over the old data when reloading. */
    @property({ type: Boolean, reflect: true })
    loading = false;

    /** The load failed. Shows `uax-error-state` in place of the plot, legend and data table, and wins over `loading` and the empty state. */
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
    private _hover?: UaxChartHover;

    /** Escape hides the date tooltip until the pointer moves to another date or leaves. */
    @state()
    private _hoverDismissed = false;

    /** Where the renderer drew the marker dots, to put a button over each. */
    @state()
    private _markerPlacements: UaxMarkerPlacement[] = [];

    /** The marker dots (by date index) the pointer is over and the keyboard is on. Hover wins. */
    @state()
    private _hoverMarker?: number;

    @state()
    private _focusMarker?: number;

    #renderer?: UaxChartRenderer;
    #stopThemeWatch?: () => void;
    #colors?: UaxChartColors;
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
        this._hoverMarker = undefined;
        this._focusMarker = undefined;
        this._hoverDismissed = false;
        document.removeEventListener("keydown", this.#onDocumentKeydown);
    }

    /** WCAG 1.4.13: Escape hides a tooltip that opened on hover or focus, without moving the pointer or focus. */
    #onDocumentKeydown = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        if (this._hover) this._hoverDismissed = true;
        this._hoverMarker = undefined;
        this._focusMarker = undefined;
    };

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const next = { series: this.series, compareSeries: this.compareSeries, range: this.range, compare: this.compare, groupBy: this.groupBy, valueFormat: this.valueFormat, lang: this.localize.lang() };
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
            // The old buttons go without a mouseleave or blur, so what they set would stick.
            this._hoverMarker = undefined;
            this._focusMarker = undefined;
            this.#dirty = true;
        }
    }

    protected override updated(changed: PropertyValues<this>) {
        super.updated(changed);
        this.#syncChart();
        this.#renderer?.setActiveMarker(this.#activeMarker);
        if (this._hover) void this.#placeTooltip();
        if (this.#activeMarker !== undefined) void this.#placeMarkerTooltip();
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
    #derive({ series, compareSeries, range, compare, groupBy, valueFormat, lang }: DerivedFrom): Derived {
        const data = buildChartData(series, compareSeries, groupBy, { from: range?.from, compareFrom: compare?.from });
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
        return this.localize.term("uaxAnalytics_chartTotalLabel");
    }

    get #compareText() {
        return this.compareLabel || this.localize.term("uaxAnalytics_chartComparisonLabel");
    }

    /** Creates the chart if it doesn't exist, and draws it when the data or kind changed. */
    #syncChart() {
        const canvas = this.#canvas;
        const probe = this.#probe;
        if (!canvas || !probe) return;

        if (!this.#renderer) {
            this.#renderer = new UaxChartRenderer(
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
        const tip = this.shadowRoot?.querySelector<UaxChartTooltipElement>("uax-chart-tooltip");
        const plot = this.shadowRoot?.querySelector<HTMLElement>(".plot");
        if (!tip || !plot) return;
        // The tooltip draws its rows a microtask after this render, and its size depends on them.
        await tip.updateComplete;
        const hover = this._hover;
        if (!hover || !tip.isConnected) return;
        const gap = 14;
        const left = hover.x + gap + tip.offsetWidth > plot.clientWidth ? hover.x - gap - tip.offsetWidth : hover.x + gap;
        const top = Math.min(Math.max(hover.y - tip.offsetHeight - 8, 0), Math.max(plot.clientHeight - tip.offsetHeight, 0));
        tip.style.left = `${Math.max(left, 0)}px`;
        tip.style.top = `${top}px`;
        tip.style.visibility = "visible";
    }

    /** One row per series with a point at the hovered date, and for the bar kinds the total and the compare total. */
    #renderTooltip() {
        const hover = this._hover;
        const { data, dateLabels, compareDateLabels, compareTotalDateLabels, totals, numberFormat } = this.#derived;
        if (!hover || this._hoverDismissed || !dateLabels[hover.index] || this.#activeMarker !== undefined) return nothing;
        const { index } = hover;
        const bars = this.#isBars;
        const rows = data.series.flatMap((s, i): UaxChartTooltipRow[] => {
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
        const compareTotal: UaxChartTooltipCompare | undefined =
            compareTotalValue === null || compareTotalValue === undefined
                ? undefined
                : { value: compareTotalValue, date: compareTotalDateLabels[index], current: total };
        return html`<uax-chart-tooltip
            style="visibility:hidden"
            aria-hidden="true"
            .date=${dateLabels[index]}
            .rows=${rows}
            .bars=${bars}
            .total=${bars && this.#showsTotal && total !== null ? { value: total, label: this.#totalText } : undefined}
            .compareTotal=${compareTotal}
            .numberFormat=${numberFormat}></uax-chart-tooltip>`;
    }

    /** The hovered or focused dot, only while it has a bucket and a placement. */
    get #activeMarker() {
        const index = this._hoverMarker ?? this._focusMarker;
        if (index === undefined) return undefined;
        const drawn = this.#markerBuckets.some((b) => b.index === index) && this._markerPlacements.some((p) => p.index === index);
        return drawn ? index : undefined;
    }

    /** Puts the marker tooltip over its dot, centred, kept inside the plot. */
    async #placeMarkerTooltip() {
        const tip = this.shadowRoot?.querySelector<UaxChartMarkerTooltipElement>("uax-chart-marker-tooltip");
        const plot = this.shadowRoot?.querySelector<HTMLElement>(".plot");
        if (!tip || !plot) return;
        // The tooltip draws its entries a microtask after this render, and its width depends on them.
        await tip.updateComplete;
        const placement = this._markerPlacements.find((p) => p.index === this.#activeMarker);
        if (!placement || !tip.isConnected) return;
        const left = Math.min(Math.max(placement.x - tip.offsetWidth / 2, 0), Math.max(plot.clientWidth - tip.offsetWidth, 0));
        tip.style.left = `${left}px`;
        tip.style.visibility = "visible";
    }

    /** The marker's date, whatever time of day it carries. */
    #markerDateText(marker: UaxMarker) {
        return formatIsoDate(dateOnly(marker.date), this.#derived.markerDate);
    }

    #markerLabel(bucket: MarkerBucket) {
        const text = bucket.markers.map((m) => `${m.title} (${this.#markerDateText(m)})`).join("; ");
        return this.localize.term("uaxAnalytics_chartMarkerAriaLabel", text);
    }

    #onMarkerClick(e: MouseEvent, bucket: MarkerBucket) {
        // A pointer click leaves focus on the button; only the hover then shows the tooltip, so it goes when the pointer does.
        if (e.detail > 0) this._focusMarker = undefined;
        this.dispatchEvent(new CustomEvent<UaxMarkerClickDetail>("marker-click", { bubbles: true, detail: { id: bucket.markers[0].id } }));
    }

    /** One button over each dot, in date order so the tab order follows the timeline. */
    #renderMarkers() {
        const placements = new Map(this._markerPlacements.map((p) => [p.index, p]));
        const active = this.#activeMarker;
        const drawn = this.#markerBuckets.filter((b) => placements.has(b.index));
        // Keyed by what the button stands for, so a reused button never stands for a different bucket.
        return repeat(
            drawn,
            (bucket) => `${bucket.index}:${bucket.markers.map((m) => m.id).join(",")}`,
            (bucket) => {
            const placement = placements.get(bucket.index)!;
            return html`<button
                type="button"
                class="marker"
                style="left:${placement.x}px; top:${placement.y}px"
                aria-label=${this.#markerLabel(bucket)}
                aria-describedby=${active === bucket.index ? "marker-tooltip" : nothing}
                @mouseenter=${() => (this._hoverMarker = bucket.index)}
                @mouseleave=${() => (this._hoverMarker = undefined)}
                @focus=${() => (this._focusMarker = bucket.index)}
                @blur=${() => (this._focusMarker = undefined)}
                @click=${(e: MouseEvent) => this.#onMarkerClick(e, bucket)}></button>`;
            },
        );
    }

    #renderMarkerTooltip() {
        const bucket = this.#markerBuckets.find((b) => b.index === this.#activeMarker);
        if (!bucket || !this._markerPlacements.some((p) => p.index === bucket.index)) return nothing;
        const shown = bucket.markers.slice(0, MAX_MARKERS_IN_TOOLTIP);
        return html`<uax-chart-marker-tooltip
            id="marker-tooltip"
            style="visibility:hidden"
            .entries=${shown.map((m) => ({ date: this.#markerDateText(m), title: m.title, description: m.description }))}
            .more=${bucket.markers.length - shown.length}></uax-chart-marker-tooltip>`;
    }

    #renderLegend() {
        if (this.series.length < 2 && !this.#isComparing) return nothing;
        const entries = this.series.map((s, i) => ({ id: s.id, label: s.label, slot: slotOf(s, i) }));
        return html`<uax-chart-legend
            .entries=${entries}
            .bars=${this.#isBars}
            .compareLabel=${this.#isComparing ? this.#compareText : undefined}></uax-chart-legend>`;
    }

    /** The same data for screen readers. Every input is stable until the data changes, so it re-renders only then. */
    #renderTable() {
        const { data, dateLabels, totals, numberFormat } = this.#derived;
        const bars = this.#isBars;
        return html`<uax-chart-data-table
            .dates=${dateLabels}
            .series=${data.series}
            .bars=${bars}
            .totals=${this.#showsTotal ? totals : undefined}
            .totalLabel=${this.#totalText}
            .compareTotal=${bars ? data.compareTotal?.values : undefined}
            .numberFormat=${numberFormat}></uax-chart-data-table>`;
    }

    // The error state's `retry` stops at its shadow root, so the chart raises its own.
    #onRetry() {
        this.dispatchEvent(new Event("retry", { bubbles: true }));
    }

    override render(): TemplateResult {
        // Error wins over loading, and loading over empty.
        const mode = this.error ? "idle" : getLoadingMode(this.loading, this.#hasData);
        const busy = this.loading && !this.error;
        const showPlot = this.#hasData && mode !== "skeleton" && !this.error;
        return html`<div
            class="region"
            role="figure"
            aria-label=${this.localize.term("uaxAnalytics_chartAriaLabel")}
            aria-busy=${busy ? "true" : "false"}>
            ${mode === "reload" ? html`<uax-loading-bar></uax-loading-bar>` : nothing}
            <div class="content">
            ${mode === "skeleton" ? html`<uax-skeleton></uax-skeleton>` : nothing}
            ${this.error
                ? html`<div class="empty">
                      <uax-error-state
                          .headline=${this.errorHeadline}
                          .description=${this.errorDescription}
                          .retryable=${this.retryable}
                          @retry=${this.#onRetry}></uax-error-state>
                  </div>`
                : nothing}
            ${mode === "idle" && !this.error && !this.#hasData
                ? html`<div class="empty">
                      <uax-empty-state
                          .headline=${this.emptyHeadline}
                          .description=${this.emptyDescription}></uax-empty-state>
                  </div>`
                : nothing}
            <!-- The plot stays in the DOM while hidden, so the chart is never rebuilt by a loading toggle. -->
            <div class="plot" ?hidden=${!showPlot}>
                <canvas aria-hidden="true"></canvas>
                ${this.#renderTooltip()}
                ${showPlot ? this.#renderMarkers() : nothing} ${showPlot ? this.#renderMarkerTooltip() : nothing}
            </div>
            ${showPlot ? this.#renderLegend() : nothing} ${showPlot ? this.#renderTable() : nothing}
            </div>
            <span class="probe" hidden></span>
        </div>`;
    }

    static override styles: CSSResultGroup = [
        UaxPaletteStyles,
        css`
            :host {
                display: block;
                --_uax-skeleton-height: var(--uax-chart-height, 260px);
            }

            .region {
                position: relative;
            }

            /* The chart pads its own content, so the loading bar can span the full width at the top edge. */
            .content {
                padding: var(--uax-chart-padding, var(--uui-size-space-4) var(--uui-size-space-6) 28px);
            }

            .plot {
                position: relative;
                height: var(--_uax-skeleton-height);
            }

            .empty {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: var(--_uax-skeleton-height);
            }

            uax-empty-state,
            uax-error-state {
                width: 100%;
            }

            /* The canvas draws the dot; this transparent button over it is the hover and focus target. */
            .marker {
                position: absolute;
                z-index: 1;
                width: 24px;
                height: 24px;
                margin: -12px 0 0 -12px;
                padding: 0;
                border: 0;
                border-radius: 50%;
                background: transparent;
                cursor: pointer;
            }

            .marker:focus-visible {
                outline: 2px solid var(--uui-color-focus);
                outline-offset: 0;
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-time-series-chart": UaxTimeSeriesChartElement;
    }
}
