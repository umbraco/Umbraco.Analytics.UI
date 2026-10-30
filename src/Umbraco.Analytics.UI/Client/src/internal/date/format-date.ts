import { isoToDate } from "./date-math.js";

/** The ISO date (`yyyy-mm-dd`) as text with `format`, or `iso` as it is when it isn't a real calendar date. */
export function formatIsoDate(iso: string, format: { format(date: Date): string }): string {
    const date = isoToDate(iso);
    return date ? format.format(date) : iso;
}

/** The ISO date as the date range shows it to the editor (medium date style, the backoffice user's culture), or `iso` as it is when it isn't a real date. */
export function displayIsoDate(iso: string, localize: { date(date: Date, options?: Intl.DateTimeFormatOptions): string }): string {
    return formatIsoDate(iso, { format: (date) => localize.date(date, { dateStyle: "medium" }) });
}
