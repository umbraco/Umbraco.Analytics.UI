import type { UauiWeekStart } from "../../date-helpers/date-helpers.js";
import { bucketOffset, dateOnly, type BucketUnit } from "../../internal/date/date-math.js";
import type { UauiSeries } from "../types.js";
import type { UauiChartData } from "./chart-values.js";

// The generic helpers live in `chart-values.ts`, shared with any chart; re-exported for the existing imports.
export { allWhole, maxValue, minPositive, seriesTotals, type UauiChartData } from "./chart-values.js";

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
 *
 * `lines` says, per series, which are drawn as lines (the rest as bars). Given, only a line series gets its compare
 * values, and the compare total adds up every compare series that isn't matched to a line series. Left out, every
 * series gets its compare values and the compare total adds up every compare series.
 */
export function buildChartData(rawSeries: UauiSeries[], rawCompareSeries: UauiSeries[] = [], groupBy: BucketUnit = "day", anchors: UauiChartAnchors = {}, weekStart?: UauiWeekStart, lines?: boolean[]): UauiChartData {
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
    const lineIds = new Set(lines ? series.filter((_, i) => lines[i]).map((s) => s.id) : []);
    const totalled = lines ? compareSeries.filter((c) => !lineIds.has(c.id)) : compareSeries;
    const allCompare = compareByOffset(totalled.flatMap((s) => s.points), groupBy, weekStart, compareStart);
    const total = place(allCompare);
    return {
        labels: dates,
        compareTotal: allCompare.size === 0 ? undefined : { values: total.values, labels: total.compareDates },
        series: series.map((s, i) => {
            const sums = sumByDate(s.points);
            const values = dates.map((d) => sums.get(d) ?? null);
            const match = !lines || lines[i] ? compareSeries.find((c) => c.id === s.id) : undefined;
            if (!match) return { id: s.id, label: s.label, values };
            const { values: compare, compareDates } = place(compareByOffset(match.points, groupBy, weekStart, compareStart));
            return { id: s.id, label: s.label, values, compare, compareLabels: compareDates };
        }),
    };
}
