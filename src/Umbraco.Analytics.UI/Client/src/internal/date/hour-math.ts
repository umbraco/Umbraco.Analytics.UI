// Hour maths for the hourly chart. Unlike date-math.ts this one uses the browser's time zone on purpose: a bucket is the
// local hour that contains an instant. An hour is keyed by its UTC instant ("2026-11-05T13:00:00.000Z"), not by local
// wall-clock text, because on the day clocks go back 2 AM happens twice and the text would merge the two hours. The
// keys still sort as plain strings. Every function returns `undefined` (`hoursBetween`: an empty list) for bad input, as these run in render paths.

const HOUR_MS = 3_600_000;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

// yyyy-mm-dd, optionally followed by a time and optionally by Z or an offset.
const MOMENT = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * The moment a point's date stands for. `Z` or an offset is an instant; a date-time without one is local time; a plain
 * date is local midnight. `undefined` when it isn't a real date or time.
 */
export function parseMoment(value: string | undefined): Date | undefined {
    const match = MOMENT.exec(value ?? "");
    if (!match) return undefined;
    const [, y, mo, d, h = "0", mi = "0", s = "0", fraction = "0", zone] = match;
    const [year, month, day, hour, minute, second] = [y, mo, d, h, mi, s].map(Number);
    if (hour > 23 || minute > 59 || second > 59) return undefined;
    const date = zone
        ? new Date(value!)
        : new Date(year, month - 1, day, hour, minute, second, Math.floor(Number(`0.${fraction}`) * 1000));
    if (Number.isNaN(date.getTime())) return undefined;
    // Reject a day that doesn't exist (30 Feb) rather than letting Date roll it over.
    const check = new Date(Date.UTC(year, month - 1, day));
    return check.getUTCMonth() === month - 1 && check.getUTCDate() === day ? date : undefined;
}

/** The start of the local hour that contains `value`, as a UTC instant. `undefined` when `value` isn't a real date or time. */
export function hourStart(value: string | undefined): string | undefined {
    const moment = parseMoment(value);
    if (!moment) return undefined;
    // Subtract the local minutes instead of calling setMinutes(0, 0, 0): on the repeated 2 AM that resolves to the first one.
    const sinceHour = ((moment.getMinutes() * 60 + moment.getSeconds()) * 1000) + moment.getMilliseconds();
    return new Date(moment.getTime() - sinceHour).toISOString();
}

/** The instant one hour after the hour that starts at `start`. `undefined` when `start` isn't a real date or time. */
export function nextHour(start: string | undefined): string | undefined {
    const first = hourStart(start);
    return first === undefined ? undefined : new Date(Date.parse(first) + HOUR_MS).toISOString();
}

/** Elapsed hours from the hour `from` falls in to the hour `value` falls in; negative when before. `undefined` when either is invalid. */
export function hourOffset(from: string, value: string): number | undefined {
    const [a, b] = [hourStart(from), hourStart(value)];
    return a === undefined || b === undefined ? undefined : (Date.parse(b) - Date.parse(a)) / HOUR_MS;
}

/**
 * Wall-clock hours from midnight of the local date `fromDate` ("yyyy-mm-dd") to the hour `value` falls in: whole local days
 * times 24 plus the local hour. A 23 or 25 hour day still counts 24, so 2 PM lines up with 2 PM on another day.
 * `undefined` when either is invalid.
 */
export function wallClockHourOffset(fromDate: string, value: string): number | undefined {
    const [from, at] = [parseMoment(fromDate), parseMoment(value)];
    if (!from || !at) return undefined;
    const days = Math.round((Date.UTC(at.getFullYear(), at.getMonth(), at.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86_400_000);
    return days * 24 + at.getHours();
}

function localDate(moment: Date): string {
    return `${pad(moment.getFullYear(), 4)}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`;
}

/**
 * Every local hour from midnight of `fromDate` up to midnight of `untilDate` (both "yyyy-mm-dd", `untilDate` not included),
 * each with its UTC start, its end and the one local date it is in. A 23 or 25 hour day gives 23 or 25 hours.
 * Empty when either date is invalid or `untilDate` isn't after `fromDate`.
 */
export function hoursBetween(fromDate: string, untilDate: string): { start: string; end: string; date: string }[] {
    const [first, until] = [parseMoment(fromDate), parseMoment(untilDate)];
    const hours: { start: string; end: string; date: string }[] = [];
    if (!first || !until) return hours;
    for (let at = first.getTime(); at < until.getTime(); at += HOUR_MS) {
        hours.push({ start: new Date(at).toISOString(), end: new Date(at + HOUR_MS).toISOString(), date: localDate(new Date(at)) });
    }
    return hours;
}
