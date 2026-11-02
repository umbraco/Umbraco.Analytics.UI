import { getNumberFormat } from "../../internal/format/number-format.js";
import type { UauiChartKind, UauiChartScale } from "../types.js";
import { allWhole, minPositive, type UauiChartData } from "./chart-values.js";
import { logScale } from "./log-scale.js";
import { niceScale } from "./nice-scale.js";

// A chart's y-axis, linear or log, whatever its x-axis is.

/** The y-axis as the renderer takes it, and how to move a value onto it. */
export interface UauiChartYAxis {
    /** A value's height on the axis. Absent on a linear axis, where a value is its own height. */
    toAxis?: (value: number | null) => number | null;
    yMax: number;
    yStep: number;
    formatTick: (value: number) => string;
    /** The log axis's own ticks (see `UauiChartModel.yTicks`). */
    yTicks?: { value: number; label: string }[];
}

/** Whole numbers on the axis unless the step is fractional; compact once the numbers get long. */
export function tickFormat(valueFormat: Intl.NumberFormatOptions | undefined, max: number, step: number): Intl.NumberFormatOptions {
    const fractional = !Number.isInteger(step);
    return {
        notation: max >= 10_000 ? "compact" : "standard",
        ...valueFormat,
        minimumFractionDigits: fractional ? undefined : 0,
        maximumFractionDigits: fractional ? Math.min(Math.max(2 - Math.floor(Math.log10(step)), 1), 6) : 0,
    };
}

/** Log, unless the bars stack: stacked segments on a log axis don't add up by height. */
export function usesLogScale(yScale: UauiChartScale, kind: UauiChartKind, barCount: number): boolean {
    return yScale === "log" && !(kind === "stacked-bar" && barCount > 0);
}

/**
 * The y-axis for `data`, reaching `max`. A log axis draws values at their heights on the log curve, on a linear
 * Chart.js axis with our own ticks (see `logScale`); else a nice linear scale from 0. Ticks are formatted with
 * `valueFormat` in `lang`.
 */
export function chartYAxis(data: UauiChartData, max: number, log: boolean, lang: string, valueFormat: Intl.NumberFormatOptions | undefined): UauiChartYAxis {
    if (log) {
        const scale = logScale(max, minPositive(data));
        const tick = getNumberFormat(lang, tickFormat(valueFormat, scale.top, scale.unit));
        return {
            toAxis: scale.toAxis,
            yMax: scale.toAxis(scale.top)!,
            yStep: 1,
            formatTick: (value) => tick.format(value),
            yTicks: scale.ticks.map((value) => ({ value: scale.toAxis(value)!, label: tick.format(value) })),
        };
    }
    const scale = niceScale(max, 5, allWhole(data));
    const tick = getNumberFormat(lang, tickFormat(valueFormat, scale.max, scale.step));
    return { yMax: scale.max, yStep: scale.step, formatTick: (value) => tick.format(value) };
}
