import { customElement, html, nothing, property, type CSSResultGroup, type PropertyValues, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { getNumberFormat } from "../internal/format/number-format.js";
import { UauiChartMixin } from "./chart.mixin.js";
import { buildCategoryData } from "./internal/category-data.js";
import { maxValue, seriesTotals, type UauiChartData } from "./internal/chart-values.js";
import "./internal/chart-data-table.element.js";
import "./internal/chart-legend.element.js";
import "./internal/chart-tooltip.element.js";
import { UauiSeriesVisibility, visibleData } from "./internal/series-visibility.js";
import type { UauiChartLegendToggleDetail } from "./internal/chart-legend.element.js";
import type { UauiChartTooltipCompare, UauiChartTooltipRow } from "./internal/chart-tooltip.element.js";
import type { UauiChartDrawColors } from "./internal/chart-colors.js";
import { UauiChartController } from "./internal/chart.controller.js";
import { renderChartFrame, UauiChartFrameStyles } from "./internal/chart-frame.js";
import type { UauiChartRenderer } from "./internal/chart-renderer.js";
import { colorKeyOf } from "./internal/chart-series.js";
import { chartYAxis, usesLogScale } from "./internal/chart-y-axis.js";
import type { UauiCategory, UauiCategoryChartKind, UauiCategorySeries } from "./types.js";

interface DerivedFrom {
    categories: UauiCategory[];
    series: UauiCategorySeries[];
    compareSeries: UauiCategorySeries[];
    valueFormat?: Intl.NumberFormatOptions;
    lang: string;
    /** The ids of the series the editor hid from the legend. */
    hidden: ReadonlySet<string>;
}

interface Derived {
    /** What is drawn: every series but the hidden ones. */
    data: UauiChartData;
    /** For each series in `data`, its index in the chart's `series`. */
    shown: number[];
    /** Any series has a value, hidden ones counted, so hiding them all leaves the chart and its legend. */
    hasData: boolean;
    /** The chart compares, counting every series, so the legend's compare entry stays while the compared series is hidden. */
    comparing: boolean;
    /** Each category's label, on the same indexes as `data.labels` (its ids). */
    labels: string[];
    /** The sum of the series per category, `null` where every series is missing a point. */
    totals: (number | null)[];
    numberFormat: Intl.NumberFormat;
    lang: string;
}

/** The compared period is drawn as a bar behind the bars: one array, so the legend doesn't re-render on hover. */
const COMPARE_SHAPES = ["bar"] as const;

const emptyDerived: Derived = {
    data: { labels: [], series: [] },
    shown: [],
    hasData: false,
    comparing: false,
    labels: [],
    totals: [],
    numberFormat: getNumberFormat("en"),
    lang: "en",
};

/**
 * `UmbLitElement` with the settings every chart shares (`UauiChartMixin`), for category series: the base of
 * `uaui-category-chart`. Exported so its type has a name in the public API; extend the element, not this.
 */
export const UauiCategoryChartElementBase = UauiChartMixin(UmbLitElement);

/**
 * Shows a metric per category, such as submissions by hour of the day, as bars or stacked bars, with a legend, a hover
 * tooltip and a visually hidden table of the same data for screen readers. It looks and behaves like
 * `uaui-time-series-chart`'s bar kinds, with categories on the x-axis in place of dates.
 *
 * Draws only: pass the x-axis in `categories` (each an `id` and a `label`, in order, labels already localized) and the
 * values in `series`, each point naming its category by `id`. Points in the same category add up; a point in a
 * category that isn't in `categories` is not drawn. Pass last period's values in `compare-series`: a compare value is
 * matched by series `id` and category `id`, and the compare series added up are drawn per category as one bar behind the
 * current bar or bars. `stacked-bar` stacks the series per category and adds a total to the tooltip and the hidden table.
 * Each series in the legend is a toggle button: pressing it hides or shows that series (visual only, for this chart only).
 * The y-axis rescales to the bars drawn, and the tooltip and the hidden table list only those.
 * `y-scale="log"` spaces the y-axis by powers of ten (not with `stacked-bar`). Every number (axis, tooltip, table) is
 * formatted with `value-format` in the backoffice user's culture.
 * While `loading` is set it shows a skeleton on first load, or keeps the old data under a loading bar when reloading.
 * With no points it shows `uaui-empty-state`. While `error` is set it shows `uaui-error-state` in place of the plot
 * (error wins over loading, and loading over empty).
 *
 * @element uaui-category-chart
 * @fires retry - The Retry button of the error state was pressed (needs `retryable`). Bubbles, not composed.
 * @cssprop --uaui-chart-height - Height of the plot, without the legend or padding. Defaults to 260px.
 * @cssprop --uaui-chart-padding - Padding around the plot, legend and empty state, as a CSS `padding` value. Defaults to `12px 24px 28px`. The loading bar ignores it and spans the full width at the top edge, so put the chart in a `uui-box` with `--uui-box-default-padding: 0`.
 * @cssprop --uaui-bar-1 - Colour of the first series' bars. Bars 2 to 8 follow (`--uaui-bar-5` to `--uaui-bar-8` default to their line colours). Each falls back to `--uaui-series-N`, then to a livelier default than the line colour.
 * @cssprop --uaui-bar-2 - Colour of the second series' bars.
 * @cssprop --uaui-bar-3 - Colour of the third series' bars.
 * @cssprop --uaui-bar-4 - Colour of the fourth series' bars.
 * @cssprop --uaui-series-1 - The fallback of `--uaui-bar-1`. Series 2 to 8 follow, then the colours repeat.
 * @cssprop --uaui-bar-default - Colour of a `color: "default"` series' bars. The other statuses follow (`--uaui-bar-positive`, `--uaui-bar-warning`, `--uaui-bar-danger`). Each falls back to `--uaui-series-<status>`.
 * @cssprop --uaui-compare - Colour of the compare bar (at 45% opacity).
 */
@customElement("uaui-category-chart")
export class UauiCategoryChartElement extends UauiCategoryChartElementBase {
    /** How the series are drawn: `"bar"` side by side, `"stacked-bar"` stacked in one bar per category. Any other value draws `"bar"`. */
    @property({ type: String, reflect: true })
    kind: UauiCategoryChartKind = "bar";

    /** The x-axis, in order: each category's `id` (which points name) and its `label`, already localized ("2 PM", "Mobile"). */
    @property({ attribute: false })
    categories: UauiCategory[] = [];

    /** Names the categories as the hidden table's column heading, e.g. "Hour of day". Defaults to the translation of "Category". */
    @property({ type: String, attribute: "category-label" })
    categoryLabel?: string;

    /**
     * The sets of bars, from `UauiChartMixin`. Each point names its category by `id`; points in the same category add
     * up (aggregate rates and averages first), a category with no point has no bar, and a point in a category that isn't
     * in `categories` is not drawn.
     */
    declare series: UauiCategorySeries[];

    /**
     * Last period's values, from `UauiChartMixin`. Matched by series `id` and category `id`: only compare series with the
     * `id` of a series count, added up per category into one compare bar behind the current bar or bars.
     */
    declare compareSeries: UauiCategorySeries[];

    /** Description of the empty state, from `UauiLoadStateMixin`. Defaults to the translation of "There is nothing to show yet.". */
    declare emptyDescription?: string;

    /** Draws the chart (Chart.js through the renderer), and holds the hover. */
    #visibility = new UauiSeriesVisibility(this);
    #chart = new UauiChartController(this, {
        colorKeys: () => this.#derived.shown.map((i) => colorKeyOf(this.series[i], i)),
        draw: (renderer, colors) => this.#draw(renderer, colors),
    });
    /** Everything derived from the inputs: the data on the categories, the totals and the number format. */
    #derived: Derived = emptyDerived;
    /** What `#derived` was built from. Hovering re-renders the element but changes none of these. */
    #derivedFrom?: DerivedFrom;

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const next: DerivedFrom = { categories: this.categories, series: this.series, compareSeries: this.compareSeries, valueFormat: this.valueFormat, lang: this.localize.lang(), hidden: this.#visibility.hidden };
        const prev = this.#derivedFrom;
        if (!prev || (Object.keys(next) as (keyof DerivedFrom)[]).some((key) => prev[key] !== next[key])) {
            this.#derivedFrom = next;
            this.#derived = this.#derive(next);
            this.#chart.invalidate();
        }
        if (changed.has("kind") || changed.has("lowerIsBetter") || changed.has("yScale")) this.#chart.invalidate();
    }

    /**
     * Builds the data, labels and number format once per change of inputs: `localize.number` builds a new `Intl`
     * formatter on every call, too slow for every table cell. This one uses the language `localize` does.
     */
    #derive({ categories, series, compareSeries, valueFormat, lang, hidden }: DerivedFrom): Derived {
        const full = buildCategoryData(categories, series, compareSeries);
        const { data, shown } = visibleData(full, series.map((s) => s.id), hidden, () =>
            buildCategoryData(categories, series, compareSeries.filter((c) => !hidden.has(c.id))),
        );
        const labelOf = new Map<string, string>();
        for (const c of categories) if (!labelOf.has(c.id)) labelOf.set(c.id, c.label);
        return {
            data,
            shown,
            hasData: full.series.some((s) => s.values.some((v) => v !== null)),
            comparing: !!full.compareTotal,
            labels: data.labels.map((id) => labelOf.get(id) ?? id),
            totals: seriesTotals(data),
            numberFormat: getNumberFormat(lang, valueFormat),
            lang,
        };
    }

    /** The drawn kind: `"stacked-bar"`, else `"bar"`. */
    get #kind(): UauiCategoryChartKind {
        return this.kind === "stacked-bar" ? "stacked-bar" : "bar";
    }

    get #hasData() {
        return this.#derived.hasData;
    }

    /** The drawn bars are compared: there is a compare bar. */
    get #comparing() {
        return !!this.#derived.data.compareTotal;
    }

    /** The total is shown (tooltip, hidden table) where there are several series and they stack or are compared. */
    get #showsTotal() {
        return this.#derived.data.series.length > 1 && (this.#kind === "stacked-bar" || this.#comparing);
    }

    get #isLog() {
        return usesLogScale(this.yScale, this.#kind, this.#derived.data.series.length);
    }

    get #totalText() {
        return this.localize.term("uauiAnalytics_chartTotalLabel");
    }

    get #compareText() {
        return this.compareLabel || this.localize.term("uauiAnalytics_chartComparisonLabel");
    }

    /** Hands the renderer the chart's model. Called by the chart controller. */
    #draw(renderer: UauiChartRenderer, colors: UauiChartDrawColors) {
        const { data, labels, lang } = this.#derived;
        const kind = this.#kind;
        if (this.yScale === "log" && !this.#isLog && data.series.length) {
            this.#chart.warnOnce(
                "log-stacked",
                'y-scale="log" is ignored with kind="stacked-bar", as stacked bars on a log axis don\'t add up by height. Use kind="bar".',
            );
        }
        const axis = chartYAxis(data, maxValue(data, kind), this.#isLog, lang, this.valueFormat);
        const to = axis.toAxis ?? ((value: number | null) => value);
        renderer.update({
            kind,
            labels,
            colors,
            lowerIsBetter: this.lowerIsBetter,
            datasets: data.series.map((s) => ({ label: s.label, kind: "bar", values: s.values.map(to) })),
            compareTotal: data.compareTotal?.values.map(to),
            yMax: axis.yMax,
            yStep: axis.yStep,
            formatTick: axis.formatTick,
            yTicks: axis.yTicks,
        });
    }

    /** One row per series with a value in the hovered category, then the total and the compare total. */
    #renderTooltip() {
        const hover = this.#chart.hover;
        const { data, shown, labels, totals, numberFormat } = this.#derived;
        // With every series hidden nothing is drawn, so there is nothing to describe.
        if (!hover || !data.series.length || labels[hover.index] === undefined) return nothing;
        const { index } = hover;
        const rows = data.series.flatMap((s, i): UauiChartTooltipRow[] => {
            const value = s.values[index];
            return value === null ? [] : [{ color: colorKeyOf(this.series[shown[i]], shown[i]), value, label: this.series.length > 1 ? s.label : undefined }];
        });
        const total = totals[index];
        const compareValue = data.compareTotal?.values[index];
        const compareTotal: UauiChartTooltipCompare | undefined =
            compareValue === null || compareValue === undefined ? undefined : { value: compareValue, label: this.#compareText, current: total };
        return html`<uaui-chart-tooltip
            style="visibility:hidden"
            aria-hidden="true"
            .heading=${labels[index]}
            .rows=${rows}
            .bars=${true}
            .lowerIsBetter=${this.lowerIsBetter}
            .total=${this.#showsTotal && total !== null ? { value: total, label: this.#totalText } : undefined}
            .compareTotal=${compareTotal}
            .numberFormat=${numberFormat}></uaui-chart-tooltip>`;
    }

    #renderLegend() {
        const { comparing } = this.#derived;
        if (this.series.length < 2 && !comparing) return nothing;
        const hidden = this.#visibility.hidden;
        const entries = this.series.map((s, i) => ({ id: s.id, label: s.label, color: colorKeyOf(s, i), bar: true, selected: !hidden.has(s.id) }));
        return html`<uaui-chart-legend
            .entries=${entries}
            .bars=${true}
            .compareShapes=${COMPARE_SHAPES}
            .compareLabel=${comparing ? this.#compareText : undefined}
            @selected=${this.#onLegendToggle}
            @deselected=${this.#onLegendToggle}></uaui-chart-legend>`;
    }

    /** A legend entry was pressed: hide its series, or show it again. */
    #onLegendToggle(e: CustomEvent<UauiChartLegendToggleDetail>) {
        this.#visibility.toggle(e.detail.id);
    }

    /** The same data for screen readers, a row per category. */
    #renderTable() {
        const { data, labels, totals, numberFormat } = this.#derived;
        return html`<uaui-chart-data-table
            .labelsHeader=${this.categoryLabel || this.localize.term("uauiAnalytics_chartTableCategoryHeader")}
            .labels=${labels}
            .series=${data.series}
            .totals=${this.#showsTotal ? totals : undefined}
            .totalLabel=${this.#totalText}
            .compareTotal=${data.compareTotal?.values}
            .logScale=${this.#isLog}
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
            emptyDescription: this.emptyDescription ?? this.localize.term("uauiAnalytics_chartCategoryEmptyDescription"),
            tooltip: this.#renderTooltip(),
            legend: () => this.#renderLegend(),
            table: () => this.#renderTable(),
        });
    }

    static override styles: CSSResultGroup = UauiChartFrameStyles;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-category-chart": UauiCategoryChartElement;
    }
}
