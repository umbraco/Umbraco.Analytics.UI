import { bucketEnd, dateOnly } from "../../internal/date/date-math.js";
import type { UauiGroupBy } from "../../group-by/group-by.element.js";
import { lastStartOnOrBefore } from "./marker-buckets.js";

/**
 * The index of the first incomplete date (bucket) of the chart's `dates` (ascending ISO dates, each the start of a
 * bucket per `groupBy`), when everything from `from` onward is incomplete: the bucket that contains `from`, or the
 * first one after it when `from` falls in a gap. Buckets are told apart as `bucketMarkers` does for today's date.
 * Everything is incomplete (0) when `from` is before the first date, and nothing (`undefined`) when it is after the
 * last bucket.
 */
export function firstIncompleteIndex(from: string, dates: string[], groupBy: UauiGroupBy): number | undefined {
    const day = dateOnly(from);
    const at = lastStartOnOrBefore(dates, day);
    if (at < 0) return dates.length ? 0 : undefined;
    const periodEnd = bucketEnd(dates[at], groupBy);
    const next = dates[at + 1];
    const index = day < (next !== undefined && next < periodEnd ? next : periodEnd) ? at : at + 1;
    return index < dates.length ? index : undefined;
}
