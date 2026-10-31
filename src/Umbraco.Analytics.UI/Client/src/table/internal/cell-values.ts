// Coercion of the unknown cell values a product's rows hold.
import { parseIso } from "../../internal/date/date-math.js";

/** The value as a finite number, or `undefined` for anything else (missing, text, NaN, Infinity). */
export function asNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** The value as display text: strings and numbers as they are, anything else (missing, objects) as empty. */
export function asText(value: unknown): string {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint"
        ? String(value)
        : "";
}

/**
 * The calendar day of an ISO date (`yyyy-mm-dd`) or date-time (`yyyy-mm-ddThh:mm...`, or a space for the `T`), read as written so no timezone
 * shifts it: "2026-06-11T23:30:00-05:00" is 11 June. `undefined` for anything else, or a day that isn't real.
 */
export function asIsoDay(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    // The day alone, or followed by a time ("T" or a space, then hh:mm): "2026-06-01 soon" isn't a date.
    const day = /^(\d{4}-\d{2}-\d{2})(?:$|[T ]\d{2}:\d{2})/.exec(value.trim())?.[1];
    return day && parseIso(day) ? day : undefined;
}
