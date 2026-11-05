/** One x-axis tick the chart shows at hour level: its text, and whether it is bold (a day's date). */
export interface UauiHourTick {
    label: string;
    bold: boolean;
}

/** A one-day range (counting the 25 hours of the day clocks go back) starts at a label every 3 hours; a longer one every 6. */
const ONE_DAY_HOURS = 25;
/** The steps a crowded axis widens through. Each divides the next, so a wider grid is always a subset of a finer one. */
const STEPS = [3, 6, 12, 24];
/** The least room a label gets, in pixels: the widest label (the bold date, such as "Wed, Nov 4") at the 11px tick font, and air. Fixed rather than measured to keep the code small. */
const MIN_LABEL_WIDTH = 72;

const localDay = (date: Date) => date.getFullYear() * 400 + date.getMonth() * 32 + date.getDate();

/**
 * Which hours get an x-axis label on an axis `width` pixels wide, chosen here rather than by Chart.js's auto-skip: the
 * hours whose local wall-clock hour is a multiple of the step (0, 3, 6... or 0, 6, 12, 18), the step widening (3, 6, 12,
 * 24) until the labels fit. It counts the
 * local hour of each key, never the index, so a 23 or 25 hour day keeps its labels on the same hours: an hour that is
 * missing is just not labelled, and one that happens twice is labelled twice if it is on the grid.
 * Each local day's first labelled hour shows the day's date (bold) in place of the hour, which is midnight on a
 * whole day. `keys` are hour keys (UTC instants); `hourLabels` their formatted hours. A tick is `undefined` where
 * the axis shows none.
 */
export function hourTicks(keys: string[], hourLabels: string[], dateFormat: { format(date: Date): string }, width: number): (UauiHourTick | undefined)[] {
    let at = keys.length <= ONE_DAY_HOURS ? 0 : 1;
    // Widen while the labels would be nearer than MIN_LABEL_WIDTH.
    while (at < STEPS.length - 1 && (width * STEPS[at]) / keys.length < MIN_LABEL_WIDTH) at++;
    const step = STEPS[at];
    let day: number | undefined;
    return keys.map((key, i) => {
        const date = new Date(key);
        if (Number.isNaN(date.getTime()) || date.getHours() % step !== 0) return undefined;
        const at = localDay(date);
        if (at === day) return { label: hourLabels[i], bold: false };
        day = at;
        return { label: dateFormat.format(date), bold: true };
    });
}

/**
 * Whether the hour that starts at `key` shares its local wall-clock hour with the one before or after it: the two
 * 2 AMs of the day clocks go back. Their texts only differ by the zone.
 */
export function isRepeatedHour(key: string): boolean {
    const start = Date.parse(key);
    if (Number.isNaN(start)) return false;
    const [before, at, after] = [-3_600_000, 0, 3_600_000].map((offset) => new Date(start + offset));
    return before.getHours() === at.getHours() || after.getHours() === at.getHours();
}
