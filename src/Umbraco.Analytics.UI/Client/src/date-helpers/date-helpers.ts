import type { UmbLocalizationController } from "@umbraco-cms/backoffice/localization-api";
import type { UauiCompare, UauiDateRange } from "../date-range/types.js";
import type { UauiGroupBy } from "../group-by/group-by.element.js";
import { compareRangeFor, dateBuckets, daysIn, previousPeriodRange, previousYearRange, type UauiWeekStart } from "../internal/date/date-math.js";
import { displayIsoDate, displayIsoDateWithoutYear } from "../internal/date/format-date.js";

/** The two ISO dates every helper reads. A `UauiDateRange` or a `UauiCompare` fits. */
export type UauiDateSpan = Pick<UauiDateRange, "from" | "to">;

/** One bucket of a range: the date its chart point is plotted at, and the days of the range inside it. */
export type UauiDateBucket = {
    /** ISO date: the day itself, the first day of its week (Monday unless `weekStart` says otherwise) or the 1st of its month. Before the range's own start for a first week or month that begins earlier. */
    start: string;
    /** ISO dates in order. Only days inside the range, so the first and last bucket can be short. */
    days: string[];
};

/** The same number of days immediately before `range`, or `undefined` when `range` isn't a valid range (an unreal date, or `to` before `from`). */
export function uauiPreviousPeriod(range: UauiDateSpan): UauiDateSpan | undefined {
    return previousPeriodRange(range);
}

/** The same dates one year earlier (29 Feb becomes 28 Feb when that year has no leap day), or `undefined` when `range` isn't a valid range. */
export function uauiPreviousYear(range: UauiDateSpan): UauiDateSpan | undefined {
    return previousYearRange(range);
}

/**
 * The comparison `mode` gives for `range`, as the `UauiCompare` that `uaui-date-range` and the chart take.
 * `undefined` for `custom` (the editor picks those dates) or when `range` isn't a valid range.
 */
export function uauiCompareFor(mode: UauiCompare["mode"], range: UauiDateSpan): UauiCompare | undefined {
    const dates = compareRangeFor(mode, range);
    return dates && { mode, ...dates };
}

/** Every ISO date from `range.from` to `range.to`, both included. Empty when `range` isn't a valid range. */
export function uauiDaysIn(range: UauiDateSpan): string[] {
    return daysIn(range);
}

/** Options for `uauiDateBuckets`. */
export type UauiDateBucketsOptions = {
    /**
     * The day weeks start on, as an ISO weekday number: 1 is Monday up to 7 for Sunday, the same as
     * `Intl.Locale.prototype.getWeekInfo().firstDay`, so the editor's culture can be passed straight through:
     * `{ weekStart: new Intl.Locale(culture).getWeekInfo().firstDay }`. Defaults to 1 (Monday), also for any other value.
     * Give the chart the same value in its `weekStart`.
     */
    weekStart?: UauiWeekStart;
};

/**
 * Splits `range` into the buckets `uaui-group-by` offers, in order: one per day, per week (seven days from the
 * `weekStart` day, Monday by default) or per month. Plot each at its `start`, as `uaui-time-series-chart` expects its
 * points' dates. Empty when `range` isn't a valid range.
 */
export function uauiDateBuckets(range: UauiDateSpan, groupBy: UauiGroupBy, options: UauiDateBucketsOptions = {}): UauiDateBucket[] {
    return dateBuckets(range, groupBy, options.weekStart);
}

/** Options for `uauiFormatDateRange`. */
export type UauiFormatDateRangeOptions = {
    /** Show the year on both dates. Defaults to true. Turn it off when the year is clear from the range beside it. */
    showYear?: boolean;
};

/**
 * A date range as the text `uaui-date-range` shows on its button, such as "May 25, 2026 to Jun 23, 2026": each date
 * in the medium style of the backoffice user's culture, joined by the translated `{0} to {1}` term. Use it for
 * the chart's `compareLabel`. Pass the element's `this.localize`. A date that isn't a real calendar date is shown as it is.
 */
export function uauiFormatDateRange(localize: Pick<UmbLocalizationController, "date" | "term">, range: UauiDateSpan, options: UauiFormatDateRangeOptions = {}): string {
    const { from, to } = range;
    const display = options.showYear === false ? displayIsoDateWithoutYear : displayIsoDate;
    return localize.term("uauiAnalytics_dateRangeRange", display(from, localize), display(to, localize));
}
