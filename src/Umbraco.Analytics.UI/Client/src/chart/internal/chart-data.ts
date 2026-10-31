import { bucketOffset, dateOnly, type BucketUnit, type UauiWeekStart } from "../../internal/date/date-math.js";
import type { UauiChartKind, UauiSeries } from "../types.js";

export interface UauiChartData {
    /** Every date in any series, ascending. */
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

/** The series with each point's date cut to its calendar day, so a date-time point lands on the day it names. */
const dayPoints = (s: UauiSeries): UauiSeries => ({ ...s, points: s.points.map((p) => ({ ...p, date: dateOnly(p.date) })) });

/** The sorted dates of the series' points, each once. */
const sortedDates = (series: UauiSeries[]) => [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();

/**
 * The bucket number of each date, counted from the bucket of `anchor` (the first date when there is none). A date
 * that isn't a real calendar date takes its position in the list instead.
 */
function offsetsOf(dates: string[], unit: BucketUnit, weekStart: UauiWeekStart | undefined, anchor = dates[0]): number[] {
    return dates.map((d, i) => bucketOffset(anchor, d, unit, weekStart) ?? i);
}

/** The first day of each side's period, when the product knows it. Without one a side starts at its first point. */
export interface UauiChartAnchors {
    from?: string;
    compareFrom?: string;
}

/** Points on the same date add up, whichever series the rule is applied to. */
function sumByDate(points: UauiSeries["points"]): Map<string, number> {
    const sums = new Map<string, number>();
    for (const p of points) sums.set(p.date, (sums.get(p.date) ?? 0) + p.value);
    return sums;
}

/** Compare values added up per bucket offset, with the earliest real date seen in each. */
function compareByOffset(points: UauiSeries["points"], unit: BucketUnit, weekStart: UauiWeekStart | undefined, start: string) {
    const byOffset = new Map<number, { value: number; date: string }>();
    const position = new Map([...new Set(points.map((p) => p.date))].sort().map((d, i) => [d, i]));
    [...points]
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        .forEach((p) => {
            const offset = bucketOffset(start, p.date, unit, weekStart) ?? position.get(p.date)!;
            const entry = byOffset.get(offset);
            if (entry) entry.value += p.value;
            else byOffset.set(offset, { value: p.value, date: p.date });
        });
    return byOffset;
}

/**
 * Lines the series up on one shared list of dates. A date a series has no point for is `null`; points on the
 * same date add up. A compare series is matched to its series by `id`, then by bucket offset: its point in the
 * Nth bucket (`groupBy` unit) from the compare period's start sits under the Nth bucket from the current period's
 * start. A start is `anchors.from` or `anchors.compareFrom` when given, else the first date of that side. Compare
 * points whose offset has no current date are dropped, and current dates with no compare point stay `null`. Weeks
 * start on `weekStart` (Monday by default).
 */
export function buildChartData(rawSeries: UauiSeries[], rawCompareSeries: UauiSeries[] = [], groupBy: BucketUnit = "day", anchors: UauiChartAnchors = {}, weekStart?: UauiWeekStart): UauiChartData {
    const series = rawSeries.map(dayPoints);
    const compareSeries = rawCompareSeries.map(dayPoints);
    const dates = sortedDates(series);
    const indexOfOffset = new Map(offsetsOf(dates, groupBy, weekStart, anchors.from ? dateOnly(anchors.from) : undefined).map((offset, i) => [offset, i]));
    const compareStart = anchors.compareFrom ? dateOnly(anchors.compareFrom) : sortedDates(compareSeries)[0];
    const place = (byOffset: Map<number, { value: number; date: string }>) => {
        const values = dates.map(() => null as number | null);
        const compareDates = dates.map(() => null as string | null);
        for (const [offset, entry] of byOffset) {
            const index = indexOfOffset.get(offset);
            if (index === undefined) continue;
            values[index] = entry.value;
            compareDates[index] = entry.date;
        }
        return { values, compareDates };
    };
    const allCompare = compareByOffset(compareSeries.flatMap((s) => s.points), groupBy, weekStart, compareStart);
    const total = place(allCompare);
    return {
        dates,
        compareTotal: allCompare.size === 0 ? undefined : { values: total.values, dates: total.compareDates },
        series: series.map((s) => {
            const sums = sumByDate(s.points);
            const values = dates.map((d) => sums.get(d) ?? null);
            const match = compareSeries.find((c) => c.id === s.id);
            if (!match) return { id: s.id, label: s.label, values };
            const { values: compare, compareDates } = place(compareByOffset(match.points, groupBy, weekStart, compareStart));
            return { id: s.id, label: s.label, values, compare, compareDates };
        }),
    };
}

/** The total of each date: the sum of the series' values, or `null` where every series is missing a point. */
export function seriesTotals(data: UauiChartData): (number | null)[] {
    return data.dates.map((_, i) => {
        const present = data.series.map((s) => s.values[i]).filter((v): v is number => v !== null);
        return present.length ? present.reduce((a, b) => a + b, 0) : null;
    });
}

/** True when every plotted value, compare values included, is a whole number. */
export function allWhole(data: UauiChartData): boolean {
    const values = [...data.series.flatMap((s) => [...s.values, ...(s.compare ?? [])]), ...(data.compareTotal?.values ?? [])];
    return values.every((v) => v === null || Number.isInteger(v));
}

/**
 * The largest value the y-axis has to reach, or 0 when there are none. Lines count every series and its compare
 * line. `stacked-bar` counts each date's total; `bar` counts each series' value. Both count the compare total.
 */
export function maxValue(data: UauiChartData, kind: UauiChartKind = "line"): number {
    if (kind === "bar" || kind === "stacked-bar") {
        const current = kind === "bar" ? data.series.flatMap((s) => s.values) : seriesTotals(data);
        return Math.max(0, ...[...current, ...(data.compareTotal?.values ?? [])].filter((v): v is number => v !== null));
    }
    return Math.max(
        0,
        ...data.series.flatMap((s) => [...s.values, ...(s.compare ?? [])].filter((v): v is number => v !== null)),
    );
}
