import type { UaxSeries } from "../types.js";

export interface UaxChartData {
    /** Every date in any series, ascending. */
    dates: string[];
    series: {
        id: string;
        label: string;
        values: (number | null)[];
        /** The compare series' values on the same dates, matched by position. Absent when it has no compare series. */
        compare?: (number | null)[];
        /** The ISO date of each compare value, on the same indexes as `compare`. */
        compareDates?: (string | null)[];
    }[];
}

/**
 * Lines the series up on one shared list of dates. A date a series has no point for is `null`.
 * A compare series is matched to its series by `id`, then point by point: its first point sits on the
 * date of the series' first point, and so on. Compare points beyond the series' last point are dropped.
 */
export function buildChartData(series: UaxSeries[], compareSeries: UaxSeries[] = []): UaxChartData {
    const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
    const indexOfDate = new Map(dates.map((d, i) => [d, i]));
    return {
        dates,
        series: series.map((s) => {
            const byDate = new Map(s.points.map((p) => [p.date, p.value]));
            const values = dates.map((d) => byDate.get(d) ?? null);
            const match = compareSeries.find((c) => c.id === s.id);
            if (!match) return { id: s.id, label: s.label, values };

            const ownDates = [...byDate.keys()].sort();
            const compare = dates.map(() => null as number | null);
            const compareDates = dates.map(() => null as string | null);
            [...match.points]
                .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
                .slice(0, ownDates.length)
                .forEach((p, position) => {
                    const index = indexOfDate.get(ownDates[position])!;
                    compare[index] = p.value;
                    compareDates[index] = p.date;
                });
            return { id: s.id, label: s.label, values, compare, compareDates };
        }),
    };
}

/** The largest value across every series and compare series, or 0 when there are none. */
export function maxValue(data: UaxChartData): number {
    return Math.max(
        0,
        ...data.series.flatMap((s) => [...s.values, ...(s.compare ?? [])].filter((v): v is number => v !== null)),
    );
}

/** Parses "2026-06-11" as a local date, so formatting it can't shift it to the day before. */
export function parseIsoDate(iso: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(iso);
}
