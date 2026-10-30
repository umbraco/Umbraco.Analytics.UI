import type { UaxSeries } from "../types.js";

export interface UaxChartData {
    /** Every date in any series, ascending. */
    dates: string[];
    series: { id: string; label: string; values: (number | null)[] }[];
}

/** Lines the series up on one shared list of dates. A date a series has no point for is `null`. */
export function buildChartData(series: UaxSeries[]): UaxChartData {
    const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
    return {
        dates,
        series: series.map((s) => {
            const byDate = new Map(s.points.map((p) => [p.date, p.value]));
            return { id: s.id, label: s.label, values: dates.map((d) => byDate.get(d) ?? null) };
        }),
    };
}

/** The largest value across every series, or 0 when there are none. */
export function maxValue(data: UaxChartData): number {
    return Math.max(0, ...data.series.flatMap((s) => s.values.filter((v): v is number => v !== null)));
}

/** Parses "2026-06-11" as a local date, so formatting it can't shift it to the day before. */
export function parseIsoDate(iso: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(iso);
}
