import type { UauiGroupBy } from "../../group-by/group-by.element.js";
import { bucketLimit, lastStartOnOrBefore, momentKey } from "./marker-buckets.js";

/**
 * The index of the first incomplete date (bucket) of the chart's `dates` (ascending ISO dates, each the start of a
 * bucket per `groupBy`), when everything from `from` onward is incomplete: the bucket that contains `from`, or the
 * first one after it when `from` falls in a gap. `from` is a moment: a `Z` or offset is converted to the browser's time, and at hour level it lands in the local hour that contains it. Buckets are told apart as `bucketMarkers` does.
 * Everything is incomplete (0) when `from` is before the first date, and nothing (`undefined`) when it is after the
 * last bucket.
 */
export function firstIncompleteIndex(from: string, dates: string[], groupBy: UauiGroupBy): number | undefined {
    const key = momentKey(from, groupBy);
    if (key === undefined) return undefined;
    const at = lastStartOnOrBefore(dates, key);
    if (at < 0) return dates.length ? 0 : undefined;
    const index = key < bucketLimit(dates, at, groupBy) ? at : at + 1;
    return index < dates.length ? index : undefined;
}
