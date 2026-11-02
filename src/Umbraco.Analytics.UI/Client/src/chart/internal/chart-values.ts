import type { UauiChartKind } from "../types.js";

// What a chart plots, and the numbers worked out from it, whatever its x-axis is. The time-series chart builds it from
// dated points (`chart-data.ts`); a chart with another x-axis builds the same shape from its own.

export interface UauiChartData {
    /** The x-axis values, in order: for the time-series chart, every date in any series, ascending. */
    labels: string[];
    /**
     * For the bar kinds: the compare series added up into one total per x value, matched to `labels` (by bucket offset
     * on the time-series chart), with the x value each total is from. Absent when there is no compare series.
     */
    compareTotal?: { values: (number | null)[]; labels: (string | null)[] };
    series: {
        id: string;
        label: string;
        values: (number | null)[];
        /** The compare series' values on the same x values (matched by bucket offset on the time-series chart). Absent when it has no compare series. */
        compare?: (number | null)[];
        /** The x value each compare value is from (an ISO date on the time-series chart), on the same indexes as `compare`. */
        compareLabels?: (string | null)[];
    }[];
}

/**
 * The total of each x value: the sum of the series' values, or `null` where every series is missing a point. With
 * `include`, only the series it marks `true` count (the bars of a chart that mixes bars and lines).
 */
export function seriesTotals(data: UauiChartData, include?: boolean[]): (number | null)[] {
    const counted = include ? data.series.filter((_, i) => include[i]) : data.series;
    return data.labels.map((_, i) => {
        const present = counted.map((s) => s.values[i]).filter((v): v is number => v !== null);
        return present.length ? present.reduce((a, b) => a + b, 0) : null;
    });
}

/**
 * The share view's values: per series, each value's share (0 to 1) of its x value's total. A value below 0 counts as 0.
 * `null` where the series has no value, or where the total is 0 (no share to show, rather than NaN).
 */
export function shareValues(data: UauiChartData): (number | null)[][] {
    const totals = data.labels.map((_, i) => data.series.reduce((sum, s) => sum + Math.max(s.values[i] ?? 0, 0), 0));
    return data.series.map((s) => s.values.map((v, i) => (v === null || !(totals[i] > 0) ? null : Math.max(v, 0) / totals[i])));
}

/**
 * The share view's total of each x value: the sum of the series' values with a value below 0 counted as 0, as
 * `shareValues` counts it, so the shares add up to it. `null` where every series is missing a value.
 */
export function shareTotals(data: UauiChartData): (number | null)[] {
    return data.labels.map((_, i) => {
        const present = data.series.map((s) => s.values[i]).filter((v): v is number => v !== null);
        return present.length ? present.reduce((sum, v) => sum + Math.max(v, 0), 0) : null;
    });
}

/** Every value the chart plots: each series, its compare values and the compare total. */
function plottedValues(data: UauiChartData): (number | null)[] {
    return [...data.series.flatMap((s) => [...s.values, ...(s.compare ?? [])]), ...(data.compareTotal?.values ?? [])];
}

/** True when every plotted value, compare values included, is a whole number. */
export function allWhole(data: UauiChartData): boolean {
    return plottedValues(data).every((v) => v === null || Number.isInteger(v));
}

/** The smallest value above 0 the chart plots, or `undefined` when there is none: where a log axis starts. */
export function minPositive(data: UauiChartData): number | undefined {
    const positive = plottedValues(data).filter((v): v is number => v !== null && v > 0 && Number.isFinite(v));
    return positive.length ? Math.min(...positive) : undefined;
}

/**
 * The largest value the y-axis has to reach, or 0 when there are none. A line counts its values and its compare
 * values. Bars count each value (with `stacked-bar`, each x value's total of the bars) and the compare total. `bars`
 * says which series are bars; left out, every series is a bar in the bar kinds and a line in the others.
 */
export function maxValue(data: UauiChartData, kind: UauiChartKind = "line", bars?: boolean[]): number {
    const barKind = kind === "bar" || kind === "stacked-bar";
    const isBar = data.series.map((_, i) => (bars ? !!bars[i] : barKind));
    const values: (number | null)[] = [];
    data.series.forEach((s, i) => {
        if (!isBar[i]) values.push(...s.values, ...(s.compare ?? []));
        else if (kind !== "stacked-bar") values.push(...s.values);
    });
    if (isBar.some(Boolean)) {
        if (kind === "stacked-bar") values.push(...seriesTotals(data, isBar));
        values.push(...(data.compareTotal?.values ?? []));
    }
    return Math.max(0, ...values.filter((v): v is number => v !== null));
}

