import type { UaxChartKind, UaxSeries } from "../types.js";

export interface UaxChartData {
    /** Every date in any series, ascending. */
    dates: string[];
    /**
     * For the bar kinds: the compare series added up into one total per date, matched to `dates` by position.
     * Absent when there is no compare series.
     */
    compareTotal?: { values: (number | null)[]; dates: (string | null)[] };
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
        compareTotal: buildCompareTotal(dates, compareSeries),
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

/**
 * Adds the compare series together, date by date. Like a series' compare points, the compare dates line up
 * with the current dates by position (first with first), whichever series they belong to.
 */
function buildCompareTotal(dates: string[], compareSeries: UaxSeries[]): UaxChartData["compareTotal"] {
    const compareDates = [...new Set(compareSeries.flatMap((s) => s.points.map((p) => p.date)))].sort().slice(0, dates.length);
    if (compareDates.length === 0) return undefined;
    const totals = new Map<string, number>();
    for (const s of compareSeries) for (const p of s.points) totals.set(p.date, (totals.get(p.date) ?? 0) + p.value);
    return {
        values: dates.map((_, i) => (i < compareDates.length ? totals.get(compareDates[i])! : null)),
        dates: dates.map((_, i) => compareDates[i] ?? null),
    };
}

/** The total of each date: the sum of the series' values, or `null` where every series is missing a point. */
export function seriesTotals(data: UaxChartData): (number | null)[] {
    return data.dates.map((_, i) => {
        const present = data.series.map((s) => s.values[i]).filter((v): v is number => v !== null);
        return present.length ? present.reduce((a, b) => a + b, 0) : null;
    });
}

/** True when every plotted value, compare values included, is a whole number. */
export function allWhole(data: UaxChartData): boolean {
    const values = [...data.series.flatMap((s) => [...s.values, ...(s.compare ?? [])]), ...(data.compareTotal?.values ?? [])];
    return values.every((v) => v === null || Number.isInteger(v));
}

/**
 * The largest value the y-axis has to reach, or 0 when there are none. Lines count every series and its compare
 * line. `stacked-bar` counts each date's total; `bar` counts each series' value. Both count the compare total.
 */
export function maxValue(data: UaxChartData, kind: UaxChartKind = "line"): number {
    if (kind === "bar" || kind === "stacked-bar") {
        const current = kind === "bar" ? data.series.flatMap((s) => s.values) : seriesTotals(data);
        return Math.max(0, ...[...current, ...(data.compareTotal?.values ?? [])].filter((v): v is number => v !== null));
    }
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
