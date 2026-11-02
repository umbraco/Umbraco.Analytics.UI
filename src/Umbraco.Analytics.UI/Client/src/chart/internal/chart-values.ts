import type { UauiChartKind } from "../types.js";

// What a chart plots, and the numbers worked out from it, whatever its x-axis is. The time-series chart builds it from
// dated points (`chart-data.ts`); a chart with another x-axis builds the same shape from its own.

export interface UauiChartData {
    /** The x-axis values, in order: for the time-series chart, every date in any series, ascending. */
    dates: string[];
    /**
     * For the bar kinds: the compare series added up into one total per date, matched to `dates` by bucket offset.
     * Absent when there is no compare series.
     */
    compareTotal?: { values: (number | null)[]; dates: (string | null)[] };
    series: {
        id: string;
        label: string;
        values: (number | null)[];
        /** The compare series' values on the same dates, matched by bucket offset. Absent when it has no compare series. */
        compare?: (number | null)[];
        /** The ISO date of each compare value, on the same indexes as `compare`. */
        compareDates?: (string | null)[];
    }[];
}

/**
 * The total of each date: the sum of the series' values, or `null` where every series is missing a point. With
 * `include`, only the series it marks `true` count (the bars of a chart that mixes bars and lines).
 */
export function seriesTotals(data: UauiChartData, include?: boolean[]): (number | null)[] {
    const counted = include ? data.series.filter((_, i) => include[i]) : data.series;
    return data.dates.map((_, i) => {
        const present = counted.map((s) => s.values[i]).filter((v): v is number => v !== null);
        return present.length ? present.reduce((a, b) => a + b, 0) : null;
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
 * values. Bars count each value (with `stacked-bar`, each date's total of the bars) and the compare total. `bars`
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

