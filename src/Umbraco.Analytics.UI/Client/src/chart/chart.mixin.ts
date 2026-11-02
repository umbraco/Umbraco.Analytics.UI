import { property } from "@umbraco-cms/backoffice/external/lit";
import type { HTMLElementConstructor } from "@umbraco-cms/backoffice/extension-api";
import type { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import type { UauiChartScale } from "./types.js";

/**
 * The settings every chart element shares, whatever its x-axis: the series, the y-axis, the value format, the compare
 * label, and the loading, error and empty states. `TSeries` is the chart's series type (`UauiSeries` for
 * `uaui-time-series-chart`, `UauiCategorySeries` for `uaui-category-chart`).
 */
export interface UauiChartMixinInterface<TSeries> {
    /**
     * How the y-axis spaces its values. `"log"` spaces it by powers of ten, for values that span widely. It still starts
     * at 0: 0 sits on the axis line and the axis bends toward it near the bottom, so a 0 needs no gap and the smallest
     * bar still shows. Higher up, each power of ten gets close to the same height; the lowest decade is about three
     * quarters of one. The shape depends on the smallest value above 0 (the first tick is the power of ten at or below
     * it), so it can change when the data does. Ticks are at 0 and each power of ten (with the 2s and 5s when there
     * are only one or two), every other or third one when the axis is too short for all. The hidden table's caption
     * says the scale is logarithmic. `stacked-bar` keeps a linear axis, as stacked segments on a log axis don't add up
     * by height. Any other value is linear.
     */
    yScale: UauiChartScale;

    /** The series to draw: one line or set of bars each. Their shape is the chart's own (see the chart's series type). */
    series: TSeries[];

    /**
     * The same metrics for another period, drawn as a compare bar behind the bars, or as a dashed line beside a line.
     * How compare series are matched differs per chart (see each chart): on `uaui-time-series-chart` a line's compare
     * series is matched by `id`, while its bar kinds add up every compare series, matched or not, into the compare bar,
     * and points line up by bucket offset; on `uaui-category-chart` only compare series with the `id` of a series count,
     * matched by category id.
     */
    compareSeries: TSeries[];

    /**
     * Names the compared period in the legend and tooltip, e.g. "Apr 25, 2026 – May 24, 2026". Defaults to the
     * translation of "Comparison".
     */
    compareLabel?: string;

    /**
     * Shows a fall as good, for a metric like refund rate, bounce rate or average duration. The gap shading between a
     * series and its compare line flips (below the compare line is good) and every change badge in the tooltip reads a
     * fall as an improvement. One chart shows one metric, so it applies to every series and to the total.
     */
    lowerIsBetter: boolean;

    /**
     * How numbers are formatted, e.g. `{ style: "currency", currency: "EUR" }`.
     */
    valueFormat?: Intl.NumberFormatOptions;

    /**
     * Shows a skeleton on first load, or a loading bar over the old data when reloading.
     */
    loading: boolean;

    /**
     * The load failed. Shows `uaui-error-state` in place of the plot, legend and data table, and wins over `loading` and
     * the empty state.
     */
    error: boolean;

    /**
     * Headline of the error state. Defaults to the translation of "Something went wrong".
     */
    errorHeadline?: string;

    /**
     * Description of the error state. Defaults to the translation of "The data could not be loaded.".
     */
    errorDescription?: string;

    /**
     * Shows a Retry button in the error state. Pressing it raises `retry` on the chart.
     */
    retryable: boolean;

    /**
     * Headline of the empty state. Defaults to the translation of "No data yet".
     */
    emptyHeadline?: string;

    /**
     * Description of the empty state. Defaults to the translation of "Try a wider date range.".
     */
    emptyDescription?: string;
}

/**
 * Adds the settings every chart element shares (`UauiChartMixinInterface`) to a class, with the same attribute names
 * and defaults on every chart. Called in two steps, first with the chart's series type, then with the class to extend:
 * `UauiChartMixin<UauiSeries>()(UmbLitElement)`. The two steps let the class's own type be inferred while the series
 * type is given: TypeScript can't infer one type argument and take another explicitly in a single call, so a one-step
 * `UauiChartMixin<UauiSeries>(MyBase)` would drop `MyBase`'s own members from the result.
 *
 * @returns A function that takes the class to extend (`UmbLitElement` or a subclass of it) and returns it with the
 * shared chart settings.
 */
export const UauiChartMixin =
    <TSeries>() =>
    <T extends HTMLElementConstructor<UmbLitElement>>(superClass: T): HTMLElementConstructor<UauiChartMixinInterface<TSeries>> & T => {
    class UauiChartMixinClass extends superClass {
        /**
         * How the y-axis spaces its values. `"log"` spaces it by powers of ten, for values that span widely. It still starts
         * at 0: 0 sits on the axis line and the axis bends toward it near the bottom, so a 0 needs no gap and the smallest
         * bar still shows. Higher up, each power of ten gets close to the same height; the lowest decade is about three
         * quarters of one. The shape depends on the smallest value above 0 (the first tick is the power of ten at or below
         * it), so it can change when the data does. Ticks are at 0 and each power of ten (with the 2s and 5s when there
         * are only one or two), every other or third one when the axis is too short for all. The hidden table's caption
         * says the scale is logarithmic. `stacked-bar` keeps a linear axis, as stacked segments on a log axis don't add up
         * by height. Any other value is linear.
         */
        @property({ type: String, attribute: "y-scale", reflect: true })
        yScale: UauiChartScale = "linear";

        /** The series to draw: one line or set of bars each. Their shape is the chart's own (see the chart's series type). */
        @property({ attribute: false })
        series: TSeries[] = [];

        /**
         * The same metrics for another period, drawn as a compare bar behind the bars, or as a dashed line beside a line.
         * How compare series are matched differs per chart (see each chart): on `uaui-time-series-chart` a line's compare
         * series is matched by `id`, while its bar kinds add up every compare series, matched or not, into the compare bar,
         * and points line up by bucket offset; on `uaui-category-chart` only compare series with the `id` of a series count,
         * matched by category id.
         */
        @property({ attribute: false })
        compareSeries: TSeries[] = [];

        /**
         * Names the compared period in the legend and tooltip, e.g. "Apr 25, 2026 – May 24, 2026". Defaults to the
         * translation of "Comparison".
         */
        @property({ type: String, attribute: "compare-label" })
        compareLabel?: string;

        /**
         * Shows a fall as good, for a metric like refund rate, bounce rate or average duration. The gap shading between a
         * series and its compare line flips (below the compare line is good) and every change badge in the tooltip reads a
         * fall as an improvement. One chart shows one metric, so it applies to every series and to the total.
         */
        @property({ type: Boolean, attribute: "lower-is-better", reflect: true })
        lowerIsBetter = false;

        /**
         * How numbers are formatted, e.g. `{ style: "currency", currency: "EUR" }`.
         */
        @property({ type: Object, attribute: "value-format" })
        valueFormat?: Intl.NumberFormatOptions;

        /**
         * Shows a skeleton on first load, or a loading bar over the old data when reloading.
         */
        @property({ type: Boolean, reflect: true })
        loading = false;

        /**
         * The load failed. Shows `uaui-error-state` in place of the plot, legend and data table, and wins over `loading` and
         * the empty state.
         */
        @property({ type: Boolean, reflect: true })
        error = false;

        /**
         * Headline of the error state. Defaults to the translation of "Something went wrong".
         */
        @property({ type: String, attribute: "error-headline" })
        errorHeadline?: string;

        /**
         * Description of the error state. Defaults to the translation of "The data could not be loaded.".
         */
        @property({ type: String, attribute: "error-description" })
        errorDescription?: string;

        /**
         * Shows a Retry button in the error state. Pressing it raises `retry` on the chart.
         */
        @property({ type: Boolean })
        retryable = false;

        /**
         * Headline of the empty state. Defaults to the translation of "No data yet".
         */
        @property({ type: String, attribute: "empty-headline" })
        emptyHeadline?: string;

        /**
         * Description of the empty state. Defaults to the translation of "Try a wider date range.".
         */
        @property({ type: String, attribute: "empty-description" })
        emptyDescription?: string;
    }
    return UauiChartMixinClass as HTMLElementConstructor<UauiChartMixinInterface<TSeries>> & T;
};
