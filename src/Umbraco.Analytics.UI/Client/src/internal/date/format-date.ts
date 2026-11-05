import { isoToDate, type BucketUnit } from "./date-math.js";

/** The ISO date (`yyyy-mm-dd`) as text with `format`, or `iso` as it is when it isn't a real calendar date. */
export function formatIsoDate(iso: string, format: { format(date: Date): string }): string {
    const date = isoToDate(iso);
    return date ? format.format(date) : iso;
}

const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** The hour key (a UTC instant such as "2026-11-05T13:00:00.000Z") as text with `format`, in the browser's time zone, or `key` as it is when it isn't a real instant. */
export function formatHourInstant(key: string, format: { format(date: Date): string }): string {
    // Only a canonical instant (what hourStart returns) is formatted; any other text is shown as written.
    const date = CANONICAL_INSTANT.test(key) ? new Date(key) : undefined;
    return date && !Number.isNaN(date.getTime()) ? format.format(date) : key;
}

/** A chart date key as text with `format`: an hour key at hour level, an ISO date at every other level. */
export function formatBucketKey(key: string, unit: BucketUnit, format: { format(date: Date): string }): string {
    return unit === "hour" ? formatHourInstant(key, format) : formatIsoDate(key, format);
}

/** The ISO date as the date range shows it to the editor (medium date style, the backoffice user's culture), or `iso` as it is when it isn't a real date. */
export function displayIsoDate(iso: string, localize: { date(date: Date, options?: Intl.DateTimeFormatOptions): string }): string {
    return formatIsoDate(iso, { format: (date) => localize.date(date, { dateStyle: "medium" }) });
}

/** The ISO date as `displayIsoDate` shows it, without the year (for a range whose year is clear from the one beside it), or `iso` as it is when it isn't a real date. */
export function displayIsoDateWithoutYear(iso: string, localize: { date(date: Date, options?: Intl.DateTimeFormatOptions): string }): string {
    return formatIsoDate(iso, { format: (date) => localize.date(date, { month: "short", day: "numeric" }) });
}
