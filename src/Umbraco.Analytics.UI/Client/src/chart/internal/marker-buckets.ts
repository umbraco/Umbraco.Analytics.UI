import { bucketEnd, dateOnly } from "../../internal/date/date-math.js";
import type { UaxGroupBy } from "../../group-by/group-by.element.js";
import type { UaxMarker } from "../types.js";

/** The markers that share one dot: every marker whose date falls in the bucket at `index` of the chart's dates. */
export interface MarkerBucket {
    index: number;
    /** Earliest first; markers on the same date keep the order they were passed in. */
    markers: UaxMarker[];
}

const dayOf = (marker: UaxMarker) => dateOnly(marker.date);

/**
 * Puts each marker into the bucket of the chart that contains its date. The chart's points are already grouped,
 * so each date in `dates` (ascending ISO dates) is the start of a bucket: a day, a week or a month, per `groupBy`.
 * A bucket ends where the next one starts, or after one period, whichever is first, so a marker before the first
 * bucket, after the last one's period or in a gap between points belongs to no bucket and is dropped.
 */
export function bucketMarkers(markers: UaxMarker[], dates: string[], groupBy: UaxGroupBy): MarkerBucket[] {
    const buckets = new Map<number, UaxMarker[]>();
    for (const marker of markers) {
        const day = dayOf(marker);
        const index = lastStartOnOrBefore(dates, day);
        if (index < 0) continue;
        const periodEnd = bucketEnd(dates[index], groupBy);
        const next = dates[index + 1];
        if (day >= (next !== undefined && next < periodEnd ? next : periodEnd)) continue;
        const list = buckets.get(index);
        if (list) list.push(marker);
        else buckets.set(index, [marker]);
    }
    return [...buckets]
        .sort(([a], [b]) => a - b)
        .map(([index, list]) => ({ index, markers: [...list].sort((a, b) => dayOf(a).localeCompare(dayOf(b))) }));
}

/** Binary search for the last date that is on or before `day`, or -1 when `day` is before them all. */
function lastStartOnOrBefore(dates: string[], day: string): number {
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
