// Pure date maths shared by the date range picker and the chart. Dates are ISO "yyyy-mm-dd" strings in and out,
// built from year/month/day parts so a timezone never shifts a day.

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Formats year, month (1-12) and day as an ISO date. */
const toIso = (year: number, month: number, day: number) => `${pad(year, 4)}-${pad(month)}-${pad(day)}`;

/** The year, month (1-12) and day of an ISO date, or `undefined` when it isn't a real calendar date. */
export function parseIso(iso: string | undefined): { year: number; month: number; day: number } | undefined {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
    if (!match) return undefined;
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const check = new Date(Date.UTC(year, month - 1, day));
    return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day
        ? { year, month, day }
        : undefined;
}

/**
 * The calendar day of an ISO date or date-time: the leading `yyyy-mm-dd` ("2026-06-11T00:00:00Z" gives "2026-06-11"),
 * read as written so no timezone shifts it. Text that doesn't start with one is returned as it is.
 */
export function dateOnly(iso: string): string {
    return /^\d{4}-\d{2}-\d{2}/.exec(iso)?.[0] ?? iso;
}

/** Today's date in the browser's timezone. */
export function todayIso(now: Date = new Date()): string {
    return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** The ISO date `days` after `iso` (negative for before). Returns `iso` unchanged when it isn't a real date. */
export function addDays(iso: string, days: number): string {
    const parts = parseIso(iso);
    if (!parts) return iso;
    const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
    return toIso(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** The first day of the month after `iso`. Returns `iso` unchanged when it isn't a real date. */
export function firstOfNextMonth(iso: string): string {
    const parts = parseIso(iso);
    return parts ? addDays(toIso(parts.year, parts.month, 1), daysInMonth(parts.year, parts.month)) : iso;
}

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Local midnight of an ISO date, for `Intl` formatting. `undefined` when it isn't a real date. */
export function isoToDate(iso: string | undefined): Date | undefined {
    const parts = parseIso(iso);
    return parts ? new Date(parts.year, parts.month - 1, parts.day) : undefined;
}

type Range = { from: string; to: string };

/** The ids of the presets the package knows how to calculate. */
export type UaxBuiltInPresetId = "last-7-days" | "last-30-days" | "last-month" | "last-year";

const builtIn: Record<UaxBuiltInPresetId, (today: string) => Range> = {
    // Rolling windows include today.
    "last-7-days": (today) => ({ from: addDays(today, -6), to: today }),
    "last-30-days": (today) => ({ from: addDays(today, -29), to: today }),
    // The previous calendar month and year, whole.
    "last-month": (today) => {
        const { year, month } = parseIso(today)!;
        const firstOfThisMonth = toIso(year, month, 1);
        const lastOfPrevious = addDays(firstOfThisMonth, -1);
        const previous = parseIso(lastOfPrevious)!;
        return { from: toIso(previous.year, previous.month, 1), to: lastOfPrevious };
    },
    "last-year": (today) => {
        const { year } = parseIso(today)!;
        return { from: toIso(year - 1, 1, 1), to: toIso(year - 1, 12, 31) };
    },
};

/** The dates for a built-in preset as of `today`, or `undefined` for any other id (including "custom"). */
export function builtInPresetRange(id: string, today: string): Range | undefined {
    return id in builtIn ? builtIn[id as UaxBuiltInPresetId](today) : undefined;
}

/** Whole days from `from` to `to`, both inclusive. `undefined` unless both are real dates with `to` on or after `from`. */
function inclusiveDays(range: Range): number | undefined {
    const [a, b] = [parseIso(range.from), parseIso(range.to)];
    if (!a || !b || range.to < range.from) return undefined;
    const ms = Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day);
    return Math.round(ms / 86_400_000) + 1;
}

/** The same number of days immediately before `range`. `undefined` when `range` isn't a valid range. */
export function previousPeriodRange(range: Range): Range | undefined {
    const days = inclusiveDays(range);
    return days === undefined ? undefined : { from: addDays(range.from, -days), to: addDays(range.from, -1) };
}

/** `iso` one year earlier. 29 Feb becomes 28 Feb when the earlier year has no leap day. */
function oneYearBefore(iso: string): string {
    const { year, month, day } = parseIso(iso)!;
    const lastDay = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
    return toIso(year - 1, month, Math.min(day, lastDay));
}

/** The same dates one year earlier. `undefined` when `range` isn't a valid range. */
export function previousYearRange(range: Range): Range | undefined {
    return inclusiveDays(range) === undefined ? undefined : { from: oneYearBefore(range.from), to: oneYearBefore(range.to) };
}

/** The dates a compare mode gives for `range`: `undefined` for a custom comparison, or when `range` isn't a valid range. */
export function compareRangeFor(mode: "previous-period" | "previous-year" | "custom", range: Range): Range | undefined {
    if (mode === "previous-period") return previousPeriodRange(range);
    if (mode === "previous-year") return previousYearRange(range);
    return undefined;
}
