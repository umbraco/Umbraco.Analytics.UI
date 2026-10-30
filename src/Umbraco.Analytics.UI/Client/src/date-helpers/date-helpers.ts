import type { UmbLocalizationController } from "@umbraco-cms/backoffice/localization-api";
import type { UaxCompare, UaxDateRange } from "../date-range/types.js";
import type { UaxGroupBy } from "../group-by/group-by.element.js";
import { compareRangeFor, dateBuckets, daysIn, previousPeriodRange, previousYearRange } from "../internal/date/date-math.js";
import { displayIsoDate, displayIsoDateWithoutYear } from "../internal/date/format-date.js";

/** The two ISO dates every helper reads. A `UaxDateRange` or a `UaxCompare` fits. */
export type UaxDateSpan = Pick<UaxDateRange, "from" | "to">;

/** One bucket of a range: the date its chart point is plotted at, and the days of the range inside it. */
export type UaxDateBucket = {
    /** ISO date: the day itself, the Monday of its week or the 1st of its month. Before the range's own start for a first week or month that begins earlier. */
    start: string;
    /** ISO dates in order. Only days inside the range, so the first and last bucket can be short. */
    days: string[];
};

/** The same number of days immediately before `range`, or `undefined` when `range` isn't a valid range (an unreal date, or `to` before `from`). */
export function uaxPreviousPeriod(range: UaxDateSpan): UaxDateSpan | undefined {
    return previousPeriodRange(range);
}

/** The same dates one year earlier (29 Feb becomes 28 Feb when that year has no leap day), or `undefined` when `range` isn't a valid range. */
export function uaxPreviousYear(range: UaxDateSpan): UaxDateSpan | undefined {
    return previousYearRange(range);
}

/**
 * The comparison `mode` gives for `range`, as the `UaxCompare` that `uax-date-range` and the chart take.
 * `undefined` for `custom` (the editor picks those dates) or when `range` isn't a valid range.
 */
export function uaxCompareFor(mode: UaxCompare["mode"], range: UaxDateSpan): UaxCompare | undefined {
    const dates = compareRangeFor(mode, range);
    return dates && { mode, ...dates };
}

/** Every ISO date from `range.from` to `range.to`, both included. Empty when `range` isn't a valid range. */
export function uaxDaysIn(range: UaxDateSpan): string[] {
    return daysIn(range);
}

/**
 * Splits `range` into the buckets `uax-group-by` offers, in order: one per day, per week (Monday to Sunday) or per
 * month. Plot each at its `start`, as `uax-time-series-chart` expects its points' dates. Empty when `range` isn't a valid range.
 */
export function uaxDateBuckets(range: UaxDateSpan, groupBy: UaxGroupBy): UaxDateBucket[] {
    return dateBuckets(range, groupBy);
}

/** Options for `uaxFormatDateRange`. */
export type UaxFormatDateRangeOptions = {
    /** Show the year on both dates. Defaults to true. Turn it off when the year is clear from the range beside it. */
    showYear?: boolean;
};

/**
 * A date range as the text `uax-date-range` shows on its button, such as "May 25, 2026 to Jun 23, 2026": each date
 * in the medium style of the backoffice user's culture, joined by the translated `{0} to {1}` term. Use it for
 * the chart's `compareLabel`. Pass the element's `this.localize`. A date that isn't a real calendar date is shown as it is.
 */
export function uaxFormatDateRange(localize: Pick<UmbLocalizationController, "date" | "term">, range: UaxDateSpan, options: UaxFormatDateRangeOptions = {}): string {
    const { from, to } = range;
    const display = options.showYear === false ? displayIsoDateWithoutYear : displayIsoDate;
    return localize.term("uaxAnalytics_dateRangeRange", display(from, localize), display(to, localize));
}
