import {
    css,
    customElement,
    guard,
    html,
    nothing,
    property,
    repeat,
    state,
    type CSSResultGroup,
    type PropertyValues,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../delta-badge/delta-badge.element.js";
import "../empty-state/empty-state.element.js";
import type { UaxGroupBy } from "../group-by/group-by.element.js";
import { getLoadingMode } from "../internal/loading/loading-mode.js";
import "../internal/loading/loading-bar.element.js";
import "../internal/loading/skeleton.element.js";
import { UaxPaletteStyles } from "../theme/index.js";
import { bucketMarkers, type MarkerBucket } from "./internal/marker-buckets.js";
import type { UaxMarkerPlacement } from "./internal/markers-plugin.js";
import { allWhole, buildChartData, maxValue, parseIsoDate, seriesTotals, type UaxChartData } from "./internal/chart-data.js";
import { colorsDiffer, resolveChartColors, type UaxChartColors } from "./internal/chart-colors.js";
import { UaxChartRenderer, type UaxChartHover } from "./internal/chart-renderer.js";
import { niceScale } from "./internal/nice-scale.js";
import { watchTheme } from "./internal/theme-watch.js";
import type { UaxChartKind, UaxMarker, UaxSeries } from "./types.js";

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
    numberFormat: new Intl.NumberFormat("en"),
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
 * dashed line with the gap shaded. Series are matched by `id`, points by position (not by date).
 * The bar kinds draw each date's compare series, added together, as one bar behind the current bar or bars
 * (so there `compare-series` needn't match the `id`s of `series`). `stacked-bar` stacks the series per date and
 * adds a total to the tooltip and the hidden table.
 * `markers` draw a dashed line and a dot on the x-axis at their date (in the bucket that contains it when grouped by
 * week or month; none when it is outside the chart). Each dot is a button: hover or focus shows the markers' dates,
 * titles and descriptions, and click or Enter raises `marker-click`. Markers in one bucket share a dot.
 * The x-axis labels follow `group-by`, and every number
 * (axis, tooltip, table) is formatted with `value-format` in the backoffice user's culture.
 * While `loading` is set it shows a skeleton on first load, or keeps the old data under a loading bar
 * when reloading. With no points it shows `uax-empty-state`.
 *
 * @element uax-time-series-chart
 * @fires marker-click - The editor clicked a marker's dot, or pressed Enter or Space on it. Bubbles and is composed, not cancelable. `detail` is `{ id }`; a dot standing for several markers raises the earliest one's id.
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
     * and its points to that series' points by position (first with first), so the two periods can cover different dates.
     */
    @property({ attribute: false })
    compareSeries: UaxSeries[] = [];

    /** Names the compared period in the legend and tooltip, e.g. "Apr 25, 2026 – May 24, 2026". Defaults to the translation of "Comparison". */
    @property({ type: String, attribute: "compare-label" })
    compareLabel?: string;

    /** Events shown as a dot on the x-axis with a dashed line. One outside the chart's dates draws nothing. */
    @property({ attribute: false })
    markers: UaxMarker[] = [];

    /** Sets the format of the x-axis labels. The points themselves are not grouped: pass them already grouped. */
    @property({ type: String, attribute: "group-by" })
    groupBy: UaxGroupBy = "day";

    /** How numbers are formatted, e.g. `{ style: "currency", currency: "EUR" }`. */
    @property({ type: Object, attribute: "value-format" })
    valueFormat?: Intl.NumberFormatOptions;

    /** Shows a skeleton on first load, or a loading bar over the old data when reloading. */
    @property({ type: Boolean, reflect: true })
    loading = false;

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
    /** Bumped when `#derived` changes; keys the cached data table. */
    #derivedVersion = 0;
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
        const next = { series: this.series, compareSeries: this.compareSeries, groupBy: this.groupBy, valueFormat: this.valueFormat, lang: this.localize.lang() };
        const prev = this.#derivedFrom;
        if (!prev || (Object.keys(next) as (keyof typeof next)[]).some((key) => prev[key] !== next[key])) {
            this.#derivedFrom = next;
            this.#derived = this.#derive(next);
            this.#derivedVersion++;
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
        if (this._hover) this.#placeTooltip();
        if (this.#activeMarker !== undefined) this.#placeMarkerTooltip();
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
    #derive({ series, compareSeries, groupBy, valueFormat, lang }: DerivedFrom): Derived {
        const data = buildChartData(series, compareSeries);
        const axisDate = new Intl.DateTimeFormat(lang, axisDateFormat[groupBy] ?? axisDateFormat.day);
        const tooltipDate = new Intl.DateTimeFormat(lang, tooltipDateFormat[groupBy] ?? tooltipDateFormat.day);
        const dates = data.dates.map(parseIsoDate);
        return {
            data,
            axisLabels: dates.map((d) => axisDate.format(d)),
            dateLabels: dates.map((d) => tooltipDate.format(d)),
            compareDateLabels: data.series.map((s) => (s.compareDates ?? []).map((d) => (d ? tooltipDate.format(parseIsoDate(d)) : ""))),
            totals: seriesTotals(data),
            compareTotalDateLabels: (data.compareTotal?.dates ?? []).map((d) => (d ? tooltipDate.format(parseIsoDate(d)) : "")),
            numberFormat: new Intl.NumberFormat(lang, valueFormat),
            markerDate: new Intl.DateTimeFormat(lang, tooltipDateFormat.day),
            lang,
        };
    }

    #formatValue(value: number) {
        return this.#derived.numberFormat.format(value);
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
        const tick = new Intl.NumberFormat(lang, tickFormat(this.valueFormat, scale.max, scale.step));
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
    #placeTooltip() {
        const tip = this.shadowRoot?.querySelector<HTMLElement>(".tooltip");
        const plot = this.shadowRoot?.querySelector<HTMLElement>(".plot");
        const hover = this._hover;
        if (!tip || !plot || !hover) return;
        const gap = 14;
        const left = hover.x + gap + tip.offsetWidth > plot.clientWidth ? hover.x - gap - tip.offsetWidth : hover.x + gap;
        const top = Math.min(Math.max(hover.y - tip.offsetHeight - 8, 0), Math.max(plot.clientHeight - tip.offsetHeight, 0));
        tip.style.left = `${Math.max(left, 0)}px`;
        tip.style.top = `${top}px`;
        tip.style.visibility = "visible";
    }

    #renderTooltip() {
        const hover = this._hover;
        const { data, dateLabels } = this.#derived;
        if (!hover || this._hoverDismissed || !dateLabels[hover.index] || this.#activeMarker !== undefined) return nothing;
        const values = data.series.map((s, i) => ({ s, i, value: s.values[hover.index] })).filter((v) => v.value !== null);
        const bars = this.#isBars;
        const swatch = bars ? "swatch swatch-square" : "swatch";
        const token = bars ? "bar" : "series";
        return html`<div class="tooltip" style="visibility:hidden" aria-hidden="true">
            <div class="tooltip-date">${dateLabels[hover.index]}</div>
            ${values.map(
                ({ s, i, value }) => html`<div class="tooltip-row tooltip-series">
                        <span class=${swatch} style="--swatch: var(--uax-color-${token}-${slotOf(this.series[i], i)})"></span>
                        <span class="tooltip-value">${this.#formatValue(value!)}</span>
                        ${data.series.length > 1 ? html`<span class="tooltip-label">${s.label}</span>` : nothing}
                    </div>
                    ${bars ? nothing : this.#renderTooltipCompare(value!, s.compare?.[hover.index], this.#derived.compareDateLabels[i][hover.index], false)}`,
            )}
            ${bars ? this.#renderBarTooltipTotals(hover.index) : nothing}
        </div>`;
    }

    /** The hovered or focused dot, only while it has a bucket and a placement. */
    get #activeMarker() {
        const index = this._hoverMarker ?? this._focusMarker;
        if (index === undefined) return undefined;
        const drawn = this.#markerBuckets.some((b) => b.index === index) && this._markerPlacements.some((p) => p.index === index);
        return drawn ? index : undefined;
    }

    /** Puts the marker tooltip over its dot, centred, kept inside the plot. */
    #placeMarkerTooltip() {
        const tip = this.shadowRoot?.querySelector<HTMLElement>(".marker-tooltip");
        const plot = this.shadowRoot?.querySelector<HTMLElement>(".plot");
        const placement = this._markerPlacements.find((p) => p.index === this.#activeMarker);
        if (!tip || !plot || !placement) return;
        const left = Math.min(Math.max(placement.x - tip.offsetWidth / 2, 0), Math.max(plot.clientWidth - tip.offsetWidth, 0));
        tip.style.left = `${left}px`;
        tip.style.visibility = "visible";
    }

    #markerLabel(bucket: MarkerBucket) {
        const { markerDate } = this.#derived;
        const text = bucket.markers.map((m) => `${m.title} (${markerDate.format(parseIsoDate(m.date))})`).join("; ");
        return this.localize.term("uaxAnalytics_chartMarkerAriaLabel", text);
    }

    #onMarkerClick(e: MouseEvent, bucket: MarkerBucket) {
        // A pointer click leaves focus on the button; only the hover then shows the tooltip, so it goes when the pointer does.
        if (e.detail > 0) this._focusMarker = undefined;
        this.dispatchEvent(new CustomEvent("marker-click", { bubbles: true, composed: true, detail: { id: bucket.markers[0].id } }));
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
        const { markerDate } = this.#derived;
        const shown = bucket.markers.slice(0, MAX_MARKERS_IN_TOOLTIP);
        const more = bucket.markers.length - shown.length;
        return html`<div class="marker-tooltip" id="marker-tooltip" style="visibility:hidden">
            ${shown.map(
                (m) => html`<div class="marker-entry">
                    <div class="tooltip-date">${markerDate.format(parseIsoDate(m.date))}</div>
                    <div class="marker-title">${m.title}</div>
                    ${m.description ? html`<div class="marker-note">${m.description}</div>` : nothing}
                </div>`,
            )}
            ${more > 0 ? html`<div class="marker-more">${this.localize.term("uaxAnalytics_chartMarkersMore", more)}</div>` : nothing}
        </div>`;
    }

    /** Bar kinds: the total of the series (stacked only), then the compare total with the change from the current total. */
    #renderBarTooltipTotals(index: number) {
        const { data, compareTotalDateLabels } = this.#derived;
        const total = this.#derived.totals[index];
        return html`${this.#showsTotal && total !== null
            ? html`<div class="tooltip-row tooltip-total">
                  <span class="tooltip-value">${this.#formatValue(total)}</span>
                  <span class="tooltip-label">${this.#totalText}</span>
              </div>`
            : nothing}
        ${this.#renderTooltipCompare(total, data.compareTotal?.values[index], compareTotalDateLabels[index], true)}`;
    }

    /** The compare value, with the change from it to the current value. No badge when there is nothing to divide by. */
    #renderTooltipCompare(value: number | null, compare: number | null | undefined, compareDate: string, square: boolean) {
        if (compare === null || compare === undefined) return nothing;
        return html`<div class="tooltip-compare">
            <div class="tooltip-row">
                <span class=${square ? "swatch swatch-compare swatch-square" : "swatch swatch-compare"}></span>
                <span class="tooltip-value">${this.#formatValue(compare)}</span>
                ${compare !== 0 && value !== null
                    ? html`<uax-delta-badge size="sm" .value=${((value! - compare) / Math.abs(compare)) * 100}></uax-delta-badge>`
                    : nothing}
            </div>
            <div class="tooltip-sub">${compareDate}</div>
        </div>`;
    }

    #renderLegend() {
        if (this.series.length < 2 && !this.#isComparing) return nothing;
        const bars = this.#isBars;
        return html`<ul class="legend" aria-label=${this.localize.term("uaxAnalytics_chartLegendLabel")}>
            ${repeat(
                this.series,
                (s) => s.id,
                (s, i) => html`<li>
                    <span
                        class=${bars ? "legend-swatch" : "legend-line"}
                        style="--swatch: var(--uax-color-${bars ? "bar" : "series"}-${slotOf(this.series[i], i)})"
                        aria-hidden="true"></span>
                    ${s.label}
                </li>`,
            )}
            ${this.#isComparing
                ? html`<li>
                      <span class=${bars ? "legend-swatch legend-compare-swatch" : "legend-line legend-compare"} aria-hidden="true"></span>
                      ${this.#compareText}
                  </li>`
                : nothing}
        </ul>`;
    }

    /** Built from `#derived`, so it is the same template until the data changes (see `guard` in `render`). */
    #renderTable() {
        const { data, dateLabels } = this.#derived;
        const bars = this.#isBars;
        const totals = this.#showsTotal ? this.#derived.totals : undefined;
        const compareTotal = bars ? data.compareTotal : undefined;
        const cell = (value: number | null | undefined) => html`<td>${value === null || value === undefined ? "" : this.#formatValue(value)}</td>`;
        return html`<table class="visually-hidden">
            <caption>
                ${this.localize.term("uaxAnalytics_chartTableCaption")}
            </caption>
            <thead>
                <tr>
                    <th scope="col">${this.localize.term("uaxAnalytics_chartTableDateHeader")}</th>
                    ${data.series.map(
                        (s) => html`<th scope="col">${s.label}</th>
                            ${s.compare && !bars
                                ? html`<th scope="col">${this.localize.term("uaxAnalytics_chartTableCompareHeader", s.label)}</th>`
                                : nothing}`,
                    )}
                    ${totals ? html`<th scope="col">${this.#totalText}</th>` : nothing}
                    ${compareTotal
                        ? html`<th scope="col">${this.localize.term("uaxAnalytics_chartTableCompareHeader", this.#totalText)}</th>`
                        : nothing}
                </tr>
            </thead>
            <tbody>
                ${data.dates.map(
                    (_, row) => html`<tr>
                        <th scope="row">${dateLabels[row]}</th>
                        ${data.series.map(
                            (s) => html`${cell(s.values[row])}${s.compare && !bars ? cell(s.compare[row]) : nothing}`,
                        )}
                        ${totals ? cell(totals[row]) : nothing} ${compareTotal ? cell(compareTotal.values[row]) : nothing}
                    </tr>`,
                )}
            </tbody>
        </table>`;
    }

    override render() {
        const mode = getLoadingMode(this.loading, this.#hasData);
        const showPlot = this.#hasData && mode !== "skeleton";
        return html`<div
            class="region"
            role="figure"
            aria-label=${this.localize.term("uaxAnalytics_chartAriaLabel")}
            aria-busy=${this.loading ? "true" : "false"}>
            ${mode === "reload" ? html`<uax-loading-bar></uax-loading-bar>` : nothing}
            <div class="content">
            ${mode === "skeleton" ? html`<uax-skeleton></uax-skeleton>` : nothing}
            ${mode === "idle" && !this.#hasData
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
            ${showPlot ? this.#renderLegend() : nothing}
            ${showPlot
                ? guard(
                      [
                          this.#derivedVersion,
                          this.kind,
                          this.localize.term("uaxAnalytics_chartTotalLabel"),
                          this.localize.term("uaxAnalytics_chartTableCaption"),
                          this.localize.term("uaxAnalytics_chartTableDateHeader"),
                          this.localize.term("uaxAnalytics_chartTableCompareHeader", "{0}"),
                      ],
                      () => this.#renderTable(),
                  )
                : nothing}
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

            uax-empty-state {
                width: 100%;
            }

            .tooltip,
            .marker-tooltip {
                position: absolute;
                z-index: 2;
                box-sizing: border-box;
                min-width: 96px;
                max-width: 260px;
                padding: var(--uui-size-space-2) var(--uui-size-space-3);
                border: 1px solid color-mix(in srgb, var(--uui-palette-white) 18%, transparent);
                border-radius: var(--uui-border-radius);
                background: var(--uui-palette-space-cadet);
                box-shadow: var(--uui-shadow-depth-3);
                color: var(--uui-palette-white);
                /* A dark surface in every theme, so the series colours take their light-on-dark shade. */
                color-scheme: dark;
                font-size: 12px;
                pointer-events: none;
            }

            .marker-tooltip {
                top: 6px;
                max-width: 240px;
                padding: 9px 12px;
            }

            .marker-entry + .marker-entry {
                margin-top: var(--uui-size-space-2);
                padding-top: var(--uui-size-space-2);
                border-top: 1px solid color-mix(in srgb, var(--uui-palette-white) 18%, transparent);
            }

            .marker-title {
                font-size: 13px;
                font-weight: 700;
                line-height: 1.3;
            }

            .marker-note {
                margin-top: 3px;
                line-height: 1.45;
                color: color-mix(in srgb, var(--uui-palette-white) 82%, transparent);
            }

            .marker-more {
                margin-top: var(--uui-size-space-2);
                font-size: 11px;
                color: color-mix(in srgb, var(--uui-palette-white) 70%, transparent);
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

            .tooltip-date {
                margin-bottom: 2px;
                font-size: 11px;
                font-weight: 700;
                color: var(--uui-palette-spanish-pink);
            }

            .tooltip-row {
                display: flex;
                align-items: center;
                gap: var(--uui-size-space-2);
                line-height: 1.6;
            }

            .swatch {
                flex: none;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--swatch);
            }

            .tooltip-value {
                font-size: 13px;
                font-weight: 700;
            }

            /* The tooltip is dark in every theme: the badge reads its dark branch and ignores product overrides here. */
            .tooltip uax-delta-badge {
                margin-left: auto;
                --uui-color-scheme: dark;
                --uax-text-positive: initial;
                --uax-text-negative: initial;
                --uax-text-neutral: var(--uui-palette-white);
                --uax-tint-positive: color-mix(in srgb, var(--uui-palette-jungle-green) 20%, transparent);
                --uax-tint-negative: color-mix(in srgb, var(--uui-palette-spanish-pink) 20%, transparent);
                --uax-tint-neutral: color-mix(in srgb, var(--uui-palette-white) 20%, transparent);
            }

            .tooltip-value,
            .tooltip uax-delta-badge {
                white-space: nowrap;
            }

            /* Indented under the value, past the swatch and its gap. */
            .tooltip-sub {
                margin: -2px 0 2px calc(8px + var(--uui-size-space-2));
                font-size: 11px;
                white-space: nowrap;
                color: color-mix(in srgb, var(--uui-palette-white) 70%, transparent);
            }

            .swatch-square {
                border-radius: 2px;
            }

            .swatch-compare {
                background: var(--uax-color-compare);
            }

            .swatch-compare.swatch-square {
                background: var(--uax-color-compare-bar);
            }

            /* Indented under the swatch column, with a hairline above, so it reads as the sum of the rows. */
            .tooltip-total {
                margin-top: 2px;
                padding: 2px 0 0 calc(8px + var(--uui-size-space-2));
                border-top: 1px solid color-mix(in srgb, var(--uui-palette-white) 18%, transparent);
            }

            .tooltip-label {
                min-width: 0;
                overflow-wrap: anywhere;
                color: color-mix(in srgb, var(--uui-palette-white) 82%, transparent);
            }

            .legend {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                gap: var(--uui-size-space-2) var(--uui-size-space-6);
                margin: var(--uui-size-space-3) 0 0;
                padding: 0;
                list-style: none;
                font-size: 12.5px;
                color: var(--uui-color-text);
            }

            .legend li {
                display: inline-flex;
                align-items: center;
                gap: 7px;
            }

            .legend-line {
                width: 18px;
                border-top: 3px solid var(--swatch);
                border-radius: 2px;
            }

            .legend-swatch {
                flex: none;
                width: 10px;
                height: 10px;
                border-radius: 2px;
                background: var(--swatch);
            }

            .legend-compare-swatch {
                background: var(--uax-color-compare-bar);
            }

            .legend-compare {
                border-top-style: dashed;
                border-top-width: 2px;
                border-top-color: var(--uax-color-compare);
            }

            .visually-hidden {
                position: absolute;
                width: 1px;
                height: 1px;
                margin: -1px;
                padding: 0;
                overflow: hidden;
                clip-path: inset(50%);
                white-space: nowrap;
                border: 0;
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-time-series-chart": UaxTimeSeriesChartElement;
    }
}
