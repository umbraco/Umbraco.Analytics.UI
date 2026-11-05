// Which bucket of a chart a moment falls in: markers, now and incomplete-from all find theirs here.
import { bucketEnd, dateOnly } from "../../internal/date/date-math.js";
import { hourStart, localDateOf } from "../../internal/date/hour-math.js";
import type { UauiGroupBy } from "../../group-by/group-by.element.js";
import type { UauiMarker } from "../types.js";

/** The markers that share one dot: every marker whose date falls in the bucket at `index` of the chart's dates. */
export interface MarkerBucket {
    index: number;
    /** Earliest first; markers on the same date keep the order they were passed in. */
    markers: UauiMarker[];
}

// Markers keep dateOnly at day level, as points do (R6); now and incomplete-from use localDateOf instead. Keep them apart.
/** What a marker's date is bucketed by: the local hour that contains it at hour level, else the day it starts with. */
const keyOf = (marker: UauiMarker, groupBy: UauiGroupBy) => (groupBy === "hour" ? hourStart(marker.date) : dateOnly(marker.date));

/**
 * What a moment (`now`, `incomplete-from`) is bucketed by: the local hour that contains it at hour level, else its
 * local date (a `Z` or offset is converted to the browser's time first). `undefined` when it isn't a real date or time.
 */
export function momentKey(value: string, groupBy: UauiGroupBy): string | undefined {
    return groupBy === "hour" ? hourStart(value) : localDateOf(value) ?? dateOnly(value);
}

/** The end of the bucket at `index`: where the next one starts, or after one period, whichever is first. */
export function bucketLimit(dates: string[], index: number, groupBy: UauiGroupBy): string {
    const periodEnd = bucketEnd(dates[index], groupBy);
    const next = dates[index + 1];
    return next !== undefined && next < periodEnd ? next : periodEnd;
}

/** The index of the bucket of `dates` that contains `key`, or -1 when none does. */
export function bucketIndexOf(key: string, dates: string[], groupBy: UauiGroupBy): number {
    const index = lastStartOnOrBefore(dates, key);
    return index < 0 || key >= bucketLimit(dates, index, groupBy) ? -1 : index;
}

/**
 * Puts each marker into the bucket of the chart that contains its date (at hour level, the local hour that contains its moment). The chart's points are already grouped,
 * so each date in `dates` (ascending ISO dates) is the start of a bucket: a day, a week or a month, per `groupBy`.
 * A bucket ends where the next one starts, or after one period, whichever is first, so a marker before the first
 * bucket, after the last one's period or in a gap between points belongs to no bucket and is dropped.
 */
export function bucketMarkers(markers: UauiMarker[], dates: string[], groupBy: UauiGroupBy): MarkerBucket[] {
    const buckets = new Map<number, UauiMarker[]>();
    for (const marker of markers) {
        const key = keyOf(marker, groupBy);
        if (key === undefined) continue;
        const index = bucketIndexOf(key, dates, groupBy);
        if (index < 0) continue;
        const list = buckets.get(index);
        if (list) list.push(marker);
        else buckets.set(index, [marker]);
    }
    return [...buckets]
        .sort(([a], [b]) => a - b)
        .map(([index, list]) => ({ index, markers: [...list].sort((a, b) => (keyOf(a, groupBy) ?? "").localeCompare(keyOf(b, groupBy) ?? "")) }));
}

/** Binary search for the last date that is on or before `day`, or -1 when `day` is before them all. */
export function lastStartOnOrBefore(dates: string[], day: string): number {
    let low = 0;
    let high = dates.length - 1;
    let found = -1;
    while (low <= high) {
        const mid = (low + high) >> 1;
        if (dates[mid] <= day) {
            found = mid;
            low = mid + 1;
        } else high = mid - 1;
    }
    return found;
}
