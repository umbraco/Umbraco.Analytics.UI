import { property } from "#platform/lit";
import type { HTMLElementConstructor } from "@umbraco-cms/backoffice/extension-api";
import type { UauiLitElement } from "#platform/base-element";
import { UauiLoadStateMixin, type UauiLoadStateMixinInterface } from "../load-state/load-state.mixin.js";
import type { UauiChartScale } from "./types.js";

/**
 * The settings every chart element shares, whatever its x-axis: the series, the y-axis, the value format and the compare
 * label, on top of the load states every data element shares (`UauiLoadStateMixinInterface`). `TSeries` is the series
 * type: `unknown` from the mixin, which each chart narrows to its own (`UauiSeries` on `uaui-time-series-chart`,
 * `UauiCategorySeries` on `uaui-category-chart`).
 */
export interface UauiChartMixinInterface<TSeries = unknown> extends UauiLoadStateMixinInterface {
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
     * How numbers are formatted, e.g. `{ style: "currency", currency: "EUR" }`, on the axis, in the tooltip and in
     * the data table. The product picks the currency or unit. Options `Intl` rejects (e.g. a bad currency code) fall back to the default number format.
     */
    valueFormat?: Intl.NumberFormatOptions;
}

/**
 * Adds the settings every chart element shares (`UauiChartMixinInterface`, built on `UauiLoadStateMixin`) to a class,
 * with the same attribute names and defaults on every chart: `UauiChartMixin(UmbLitElement)`. One call, the class's own
 * type inferred, so a subclass of `UmbLitElement` keeps its members. The mixin types `series` and `compareSeries` as
 * `unknown[]`; each chart narrows them to its own series type with a `declare` (`declare series: UauiSeries[]`), with
 * its own docs.
 *
 * @param superClass - The class to extend, `UmbLitElement` or a subclass of it.
 * @returns The class with the shared chart settings.
 */
export const UauiChartMixin = <T extends HTMLElementConstructor<UauiLitElement>>(superClass: T): HTMLElementConstructor<UauiChartMixinInterface> & T => {
    class UauiChartMixinClass extends UauiLoadStateMixin(superClass) {
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
        series: unknown[] = [];

        /**
         * The same metrics for another period, drawn as a compare bar behind the bars, or as a dashed line beside a line.
         * How compare series are matched differs per chart (see each chart): on `uaui-time-series-chart` a line's compare
         * series is matched by `id`, while its bar kinds add up every compare series, matched or not, into the compare bar,
         * and points line up by bucket offset; on `uaui-category-chart` only compare series with the `id` of a series count,
         * matched by category id.
         */
        @property({ attribute: false })
        compareSeries: unknown[] = [];

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
         * How numbers are formatted, e.g. `{ style: "currency", currency: "EUR" }`, on the axis, in the tooltip and in
         * the data table. The product picks the currency or unit. Options `Intl` rejects (e.g. a bad currency code) fall back to the default number format.
         */
        @property({ type: Object, attribute: "value-format" })
        valueFormat?: Intl.NumberFormatOptions;
    }
    return UauiChartMixinClass as unknown as HTMLElementConstructor<UauiChartMixinInterface> & T;
};
