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
import "../empty-state/empty-state.element.js";
import type { UaxGroupBy } from "../group-by/group-by.element.js";
import { getLoadingMode } from "../internal/loading/loading-mode.js";
import "../internal/loading/loading-bar.element.js";
import "../internal/loading/skeleton.element.js";
import { uaxThemeTokens } from "../internal/theme/tokens.css.js";
import { buildChartData, maxValue, parseIsoDate, type UaxChartData } from "./internal/chart-data.js";
import { colorsDiffer, resolveChartColors, type UaxChartColors } from "./internal/chart-colors.js";
import { UaxChartRenderer, type UaxChartHover } from "./internal/chart-renderer.js";
import { niceScale } from "./internal/nice-scale.js";
import { watchTheme } from "./internal/theme-watch.js";
import type { UaxChartKind, UaxSeries } from "./types.js";

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
    groupBy: UaxGroupBy;
    valueFormat?: Intl.NumberFormatOptions;
    lang: string;
}

interface Derived {
    data: UaxChartData;
    axisLabels: string[];
    dateLabels: string[];
    numberFormat: Intl.NumberFormat;
    lang: string;
}

const emptyDerived: Derived = {
    data: { dates: [], series: [] },
    axisLabels: [],
    dateLabels: [],
    numberFormat: new Intl.NumberFormat("en"),
    lang: "en",
};

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
 * Shows a metric over time as lines or filled areas, with a legend, a hover tooltip and a visually
 * hidden table of the same data for screen readers.
 *
 * Draws only: pass the points in `series`. The x-axis labels follow `group-by`, and every number
 * (axis, tooltip, table) is formatted with `value-format` in the backoffice user's culture.
 * While `loading` is set it shows a skeleton on first load, or keeps the old data under a loading bar
 * when reloading. With no points it shows `uax-empty-state`.
 *
 * @element uax-time-series-chart
 * @cssprop --uax-chart-height - Height of the plot, without the legend or padding. Defaults to 260px.
 * @cssprop --uax-chart-padding - Padding around the plot, legend and empty state, as a CSS `padding` value. Defaults to `12px 24px 28px`. The loading bar ignores it and spans the full width at the top edge, so put the chart in a `uui-box` with `--uui-box-default-padding: 0`.
 * @cssprop --uax-series-1 - Colour of the first series. Series 2 to 4 follow, then the colours repeat.
 * @cssprop --uax-series-2 - Colour of the second series.
 * @cssprop --uax-series-3 - Colour of the third series.
 * @cssprop --uax-series-4 - Colour of the fourth series.
 */
@customElement("uax-time-series-chart")
export class UaxTimeSeriesChartElement extends UmbLitElement {
    /** How the series are drawn. */
    @property({ type: String, reflect: true })
    kind: UaxChartKind = "line";

    /** One line per series. Dates are ISO ("2026-06-11"). Series needn't share the same dates. */
    @property({ attribute: false })
    series: UaxSeries[] = [];

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

    #renderer?: UaxChartRenderer;
    #stopThemeWatch?: () => void;
    #colors?: UaxChartColors;
    /** Everything derived from the inputs below: shared dates, formatted labels and formatters. */
    #derived: Derived = emptyDerived;
    /** What `#derived` was built from. Hovering re-renders the element but changes none of these. */
    #derivedFrom?: DerivedFrom;
    /** Bumped when `#derived` changes; keys the cached data table. */
    #derivedVersion = 0;
    /** The chart needs drawing: the derived data or the kind changed. */
    #dirty = true;

    override connectedCallback() {
        super.connectedCallback();
        this.#stopThemeWatch = watchTheme(() => this.#syncColors());
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
    }

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const next = { series: this.series, groupBy: this.groupBy, valueFormat: this.valueFormat, lang: this.localize.lang() };
        const prev = this.#derivedFrom;
        if (!prev || (Object.keys(next) as (keyof typeof next)[]).some((key) => prev[key] !== next[key])) {
            this.#derivedFrom = next;
            this.#derived = this.#derive(next);
            this.#derivedVersion++;
            this.#dirty = true;
        }
        if (changed.has("kind")) this.#dirty = true;
    }

    protected override updated(changed: PropertyValues<this>) {
        super.updated(changed);
        this.#syncChart();
        if (this._hover) this.#placeTooltip();
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
    #derive({ series, groupBy, valueFormat, lang }: DerivedFrom): Derived {
        const data = buildChartData(series);
        const axisDate = new Intl.DateTimeFormat(lang, axisDateFormat[groupBy] ?? axisDateFormat.day);
        const tooltipDate = new Intl.DateTimeFormat(lang, tooltipDateFormat[groupBy] ?? tooltipDateFormat.day);
        const dates = data.dates.map(parseIsoDate);
        return {
            data,
            axisLabels: dates.map((d) => axisDate.format(d)),
            dateLabels: dates.map((d) => tooltipDate.format(d)),
            numberFormat: new Intl.NumberFormat(lang, valueFormat),
            lang,
        };
    }

    #formatValue(value: number) {
        return this.#derived.numberFormat.format(value);
    }

    /** Creates the chart if it doesn't exist, and draws it when the data or kind changed. */
    #syncChart() {
        const canvas = this.#canvas;
        const probe = this.#probe;
        if (!canvas || !probe) return;

        if (!this.#renderer) {
            this.#renderer = new UaxChartRenderer(canvas, (hover) => {
                this._hover = hover;
            });
            this.#dirty = true;
            // Axis text is measured with the web font, so redraw once fonts have settled.
            document.fonts?.ready.then(() => this.#renderer?.redraw());
        }
        if (!this.#dirty) return;
        this.#dirty = false;
        this.#colors = resolveChartColors(probe, this.#derived.data.series.length);
        this.#draw();
    }

    #draw() {
        if (!this.#renderer || !this.#colors) return;
        const { data, axisLabels, lang } = this.#derived;
        const scale = niceScale(maxValue(data));
        const tick = new Intl.NumberFormat(lang, tickFormat(this.valueFormat, scale.max, scale.step));
        this.#renderer.update({
            kind: this.kind === "area" ? "area" : "line",
            labels: axisLabels,
            datasets: data.series.map((s) => ({ label: s.label, values: s.values })),
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
        const colors = resolveChartColors(probe, this.#derived.data.series.length);
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
        if (!hover || !dateLabels[hover.index]) return nothing;
        const values = data.series.map((s, i) => ({ s, i, value: s.values[hover.index] })).filter((v) => v.value !== null);
        return html`<div class="tooltip" style="visibility:hidden" aria-hidden="true">
            <div class="tooltip-date">${dateLabels[hover.index]}</div>
            ${values.map(
                ({ s, i, value }) => html`<div class="tooltip-row">
                    <span class="swatch" style="--swatch: var(--_uax-series-${(i % 4) + 1})"></span>
                    <span class="tooltip-value">${this.#formatValue(value!)}</span>
                    ${data.series.length > 1 ? html`<span class="tooltip-label">${s.label}</span>` : nothing}
                </div>`,
            )}
        </div>`;
    }

    #renderLegend() {
        if (this.series.length < 2) return nothing;
        return html`<ul class="legend" aria-label=${this.localize.term("uaxAnalytics_chartLegendLabel")}>
            ${repeat(
                this.series,
                (s) => s.id,
                (s, i) => html`<li>
                    <span class="legend-line" style="--swatch: var(--_uax-series-${(i % 4) + 1})" aria-hidden="true"></span>
                    ${s.label}
                </li>`,
            )}
        </ul>`;
    }

    /** Built from `#derived`, so it is the same template until the data changes (see `guard` in `render`). */
    #renderTable() {
        const { data, dateLabels } = this.#derived;
        return html`<table class="visually-hidden">
            <caption>
                ${this.localize.term("uaxAnalytics_chartTableCaption")}
            </caption>
            <thead>
                <tr>
                    <th scope="col">${this.localize.term("uaxAnalytics_chartTableDateHeader")}</th>
                    ${data.series.map((s) => html`<th scope="col">${s.label}</th>`)}
                </tr>
            </thead>
            <tbody>
                ${data.dates.map(
                    (_, row) => html`<tr>
                        <th scope="row">${dateLabels[row]}</th>
                        ${data.series.map((s) => html`<td>${s.values[row] === null ? "" : this.#formatValue(s.values[row]!)}</td>`)}
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
            </div>
            ${showPlot ? this.#renderLegend() : nothing}
            ${showPlot
                ? guard(
                      [
                          this.#derivedVersion,
                          this.localize.term("uaxAnalytics_chartTableCaption"),
                          this.localize.term("uaxAnalytics_chartTableDateHeader"),
                      ],
                      () => this.#renderTable(),
                  )
                : nothing}
            </div>
            <span class="probe" hidden></span>
        </div>`;
    }

    static override styles: CSSResultGroup = [
        uaxThemeTokens,
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

            .tooltip {
                position: absolute;
                z-index: 2;
                box-sizing: border-box;
                min-width: 96px;
                max-width: 240px;
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

            .tooltip-label {
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
