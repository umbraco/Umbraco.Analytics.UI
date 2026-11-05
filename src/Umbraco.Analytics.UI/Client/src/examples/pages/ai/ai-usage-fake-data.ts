// A stand-in for the Umbraco AI usage API, for the "Umbraco AI > Usage" page example. Everything is
// invented and generated from the date, so the same range always gives the same numbers. A real
// product fetches this over HTTP.
import { uauiTimeBuckets, uauiDaysIn } from "../../../date-helpers/index.js";
import type { UauiCompare, UauiDateRange } from "../../../date-range/types.js";
import type { UauiGroupBy } from "../../../group-by/group-by.element.js";
import type { UauiTableSortDirection } from "../../../table/types.js";
import { wait } from "../fake-latency.js";

/** What happened in one bucket of time (an hour, a day, a week or a month), or in a whole range. */
export type UsageTotals = {
    requests: number;
    failed: number;
    inputTokens: number;
    /** The part of `inputTokens` that came from a provider's prompt cache. */
    cachedInputTokens: number;
    outputTokens: number;
    durationMs: number;
};

export type UsageBucket = UsageTotals & {
    /** The bucket's start: an ISO date, or a UTC instant for an hour. */
    date: string;
};

export type UsageQuery = {
    range: UauiDateRange;
    compare?: UauiCompare;
    groupBy: UauiGroupBy;
};

export type UsageResult = {
    summary: UsageTotals;
    compareSummary?: UsageTotals;
    buckets: UsageBucket[];
    compareBuckets?: UsageBucket[];
};

export type BreakdownBy = "model" | "profile";
export type BreakdownSortKey = "name" | "requests" | "totalTokens" | "successRate" | "avgDurationMs";

export type BreakdownQuery = {
    by: BreakdownBy;
    range: UauiDateRange;
    compare?: UauiCompare;
    sort: { key: BreakdownSortKey; direction: UauiTableSortDirection };
    page: number;
    pageSize: number;
    /** Text the name must contain. */
    query: string;
};

export type BreakdownRow = {
    name: string;
    requests: number;
    totalTokens: number;
    /** A fraction: 0.97 is 97%. */
    successRate: number;
    avgDurationMs: number;
};

export type BreakdownResult = {
    /** The page asked for. */
    rows: BreakdownRow[];
    /** The same rows in the comparison period, when there is one. */
    compareRows: BreakdownRow[];
    /** Rows that match the search, across every page. */
    totalRows: number;
    /** Each number column's total and largest value across every row, before the search, so shares keep their meaning. */
    stats: Record<"requests" | "totalTokens", { total: number; max: number }>;
};

type Model = { name: string; requests: number; inputPerRequest: number; outputPerRequest: number; cached: number; failRate: number; durationMs: number };

const models: Model[] = [
    { name: "nimbus-mini", requests: 420, inputPerRequest: 900, outputPerRequest: 220, cached: 0.35, failRate: 0.012, durationMs: 900 },
    { name: "atlas-large", requests: 260, inputPerRequest: 2100, outputPerRequest: 640, cached: 0.5, failRate: 0.018, durationMs: 2400 },
    { name: "atlas-small", requests: 180, inputPerRequest: 750, outputPerRequest: 180, cached: 0.4, failRate: 0.01, durationMs: 700 },
    { name: "nimbus-large", requests: 140, inputPerRequest: 1500, outputPerRequest: 420, cached: 0.2, failRate: 0.025, durationMs: 1800 },
    { name: "zephyr-fast", requests: 110, inputPerRequest: 1100, outputPerRequest: 260, cached: 0, failRate: 0.02, durationMs: 600 },
    { name: "nimbus-pro", requests: 90, inputPerRequest: 1800, outputPerRequest: 500, cached: 0.25, failRate: 0.03, durationMs: 2000 },
    { name: "zephyr-mini", requests: 40, inputPerRequest: 800, outputPerRequest: 240, cached: 0, failRate: 0.04, durationMs: 800 },
];

const profiles: { name: string; weight: number }[] = [
    { name: "Content assistant", weight: 22 },
    { name: "Alt text writer", weight: 16 },
    { name: "Support triage", weight: 14 },
    { name: "SEO helper", weight: 11 },
    { name: "Translator", weight: 9 },
    { name: "Product descriptions", weight: 8 },
    { name: "Meeting summaries", weight: 6 },
    { name: "FAQ answers", weight: 5 },
    { name: "Newsletter drafts", weight: 4 },
    { name: "Tone checker", weight: 2 },
    { name: "Release notes", weight: 2 },
    { name: "Code reviewer", weight: 1 },
];

const DAY = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** A repeatable number between 0 and 1 for any text. */
function hash01(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    h ^= h >>> 15;
    h = Math.imul(h, 2246822507);
    h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
}

const empty = (): UsageTotals => ({ requests: 0, failed: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, durationMs: 0 });

function add(a: UsageTotals, b: UsageTotals): UsageTotals {
    return {
        requests: a.requests + b.requests,
        failed: a.failed + b.failed,
        inputTokens: a.inputTokens + b.inputTokens,
        cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
        outputTokens: a.outputTokens + b.outputTokens,
        durationMs: a.durationMs + b.durationMs,
    };
}

/** Usage started on this day: ranges before it have no requests at all. */
export const USAGE_STARTED = "2026-01-01";

const scale = (t: UsageTotals, f: number): UsageTotals => ({
    requests: Math.round(t.requests * f),
    failed: Math.round(t.failed * f),
    inputTokens: Math.round(t.inputTokens * f),
    cachedInputTokens: Math.round(t.cachedInputTokens * f),
    outputTokens: Math.round(t.outputTokens * f),
    durationMs: Math.round(t.durationMs * f),
});

/** The fake server's date today. Usage after the clock hasn't happened yet. */
export const CLOCK_DATE = "2026-06-23";
/** The fake server's clock as an instant: 2:23 PM on `CLOCK_DATE` in the browser's time zone. */
export const CLOCK = new Date(`${CLOCK_DATE}T14:23:00`).toISOString();

/** How busy each local hour is, as a weight: quiet at night, busy from 9 to 5, a lunchtime spike at 1 PM. */
const hourWeights = [1, 0.5, 0.4, 0.3, 0.3, 0.6, 1.5, 4, 9, 14, 17, 15, 12, 30, 14, 12, 9, 6, 4, 3, 2.5, 2, 1.5, 1];

/**
 * The weight of each local hour of a day, in order: busyness with a little jitter, times the part of the hour the clock
 * has reached (1 for a day that is over, 0 for hours still to come). Hours and days both count from it, so they agree.
 */
const dayHourCache = new Map<string, { starts: string[]; weights: number[]; share: number }>();
function dayHours(date: string) {
    let day = dayHourCache.get(date);
    if (!day) {
        const clock = Date.parse(CLOCK);
        const hours = uauiTimeBuckets({ from: date, to: date }, "hour");
        const seen = new Map<number, number>();
        const full = hours.map(({ start }) => {
            const hour = new Date(start).getHours();
            const n = seen.get(hour) ?? 0;
            seen.set(hour, n + 1);
            return hourWeights[hour] * (0.85 + 0.3 * hash01(`${date}|${hour}|${n}`));
        });
        const weights = hours.map(({ start }, i) => full[i] * Math.min(1, Math.max(0, (clock - Date.parse(start)) / 3_600_000)));
        const total = full.reduce((a, b) => a + b, 0);
        day = { starts: hours.map((h) => h.start), weights, share: total ? weights.reduce((a, b) => a + b, 0) / total : 1 };
        dayHourCache.set(date, day);
    }
    return day;
}

/** The part of a day's usage that has happened by the clock: 1 for a past day, 0 for a future one. */
const happenedShare = (date: string) => (date < CLOCK_DATE ? 1 : date > CLOCK_DATE ? 0 : dayHours(date).share);

/** One model on one day, up to the clock. Quieter at weekends, a little busier as the months go by. */
function modelDay(model: Model, date: string): UsageTotals {
    const share = happenedShare(date);
    return share === 1 ? modelDayInFull(model, date) : scale(modelDayInFull(model, date), share);
}

function modelDayInFull(model: Model, date: string): UsageTotals {
    if (date < USAGE_STARTED) return empty();
    const weekday = new Date(utc(date)).getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.45 : 1;
    const growth = 1 + ((utc(date) - utc("2026-01-01")) / DAY) * 0.0015;
    const requests = Math.round(model.requests * weekend * growth * (0.75 + 0.5 * hash01(`${model.name}|${date}|r`)));
    const failed = Math.round(requests * model.failRate * (0.4 + 1.2 * hash01(`${model.name}|${date}|f`)));
    const inputTokens = Math.round(requests * model.inputPerRequest * (0.9 + 0.2 * hash01(`${model.name}|${date}|i`)));
    return {
        requests,
        failed,
        inputTokens,
        cachedInputTokens: Math.round(inputTokens * model.cached * (0.85 + 0.3 * hash01(`${model.name}|${date}|c`))),
        outputTokens: Math.round(requests * model.outputPerRequest * (0.9 + 0.2 * hash01(`${model.name}|${date}|o`))),
        durationMs: Math.round(requests * model.durationMs * (0.9 + 0.2 * hash01(`${model.name}|${date}|d`))),
    };
}

/** Everything that happened on one day, across every model. */
const dayTotals = (date: string): UsageTotals => models.reduce((sum, model) => add(sum, modelDay(model, date)), empty());

/** Shares `total` out by `fractions` in whole numbers that add back up to `total`. */
function split(total: number, fractions: number[]): number[] {
    let cumulative = 0;
    let given = 0;
    return fractions.map((fraction) => {
        cumulative += fraction;
        const next = Math.round(total * cumulative);
        const share = next - given;
        given = next;
        return share;
    });
}

/** One day's usage as each profile's part of it, so a profile table adds up to the same totals as a model table. */
function profileDay(date: string): UsageTotals[] {
    const day = dayTotals(date);
    const weights = profiles.map((p) => p.weight * (0.7 + 0.6 * hash01(`${p.name}|${date}`)));
    const sum = weights.reduce((a, b) => a + b, 0);
    const fractions = weights.map((w) => w / sum);
    const requests = split(day.requests, fractions);
    const inputTokens = split(day.inputTokens, fractions);
    const cachedInputTokens = split(day.cachedInputTokens, fractions);
    const outputTokens = split(day.outputTokens, fractions);
    // Failures lean towards some profiles, so success rates differ between them.
    const failWeights = fractions.map((f, i) => f * (0.3 + 1.4 * hash01(`${profiles[i].name}|${date}|f`)));
    const failSum = failWeights.reduce((a, b) => a + b, 0);
    const failed = split(day.failed, failWeights.map((w) => w / failSum));
    return fractions.map((f, i) => ({
        requests: requests[i],
        failed: failed[i],
        inputTokens: inputTokens[i],
        cachedInputTokens: cachedInputTokens[i],
        outputTokens: outputTokens[i],
        durationMs: day.durationMs * f * (0.8 + 0.4 * hash01(`${profiles[i].name}|${date}|d`)),
    }));
}

/** One day's usage as each of its hours' part of it, in whole numbers that add back up to the day. Hours still to come get 0. */
function hourTotalsOf(date: string): UsageBucket[] {
    const { starts, weights } = dayHours(date);
    const sum = weights.reduce((a, b) => a + b, 0);
    const fractions = weights.map((w) => (sum ? w / sum : 0));
    const day = dayTotals(date);
    const cut = (value: number) => split(value, fractions);
    const [requests, failed, inputTokens, cachedInputTokens, outputTokens, durationMs] = [
        day.requests,
        day.failed,
        day.inputTokens,
        day.cachedInputTokens,
        day.outputTokens,
        day.durationMs,
    ].map(cut);
    return starts.map((date, i) => ({
        date,
        requests: requests[i],
        failed: failed[i],
        inputTokens: inputTokens[i],
        cachedInputTokens: cachedInputTokens[i],
        outputTokens: outputTokens[i],
        durationMs: durationMs[i],
    }));
}

function bucketsFor(range: { from: string; to: string }, groupBy: UauiGroupBy): UsageBucket[] {
    if (groupBy === "hour") return uauiDaysIn(range).flatMap(hourTotalsOf);
    const buckets = uauiTimeBuckets(range, groupBy);
    return buckets.map(({ start, days }) => ({ date: start, ...days.map(dayTotals).reduce(add, empty()) }));
}

const sumOf = (buckets: UsageTotals[]) => buckets.reduce(add, empty());

/** The summary and the chart's points for a range, and for the comparison range when there is one. */
export async function getUsage(query: UsageQuery, latencyMs = 0): Promise<UsageResult> {
    await wait(latencyMs);
    const buckets = bucketsFor(query.range, query.groupBy);
    const compareBuckets = query.compare && bucketsFor(query.compare, query.groupBy);
    return {
        summary: sumOf(buckets),
        compareSummary: compareBuckets && sumOf(compareBuckets),
        buckets,
        compareBuckets,
    };
}

function rowsFor(by: BreakdownBy, range: { from: string; to: string }): BreakdownRow[] {
    const names = by === "model" ? models.map((m) => m.name) : profiles.map((p) => p.name);
    const totals = names.map(() => empty());
    for (const date of uauiDaysIn(range)) {
        const day = by === "model" ? models.map((m) => modelDay(m, date)) : profileDay(date);
        day.forEach((usage, i) => (totals[i] = add(totals[i], usage)));
    }
    return names.map((name, i) => ({
        name,
        requests: totals[i].requests,
        totalTokens: totals[i].inputTokens + totals[i].outputTokens,
        successRate: totals[i].requests ? (totals[i].requests - totals[i].failed) / totals[i].requests : 0,
        avgDurationMs: totals[i].requests ? totals[i].durationMs / totals[i].requests : 0,
    }));
}

/** One page of the breakdown table, sorted and searched. */
export async function getBreakdown(query: BreakdownQuery, latencyMs = 0): Promise<BreakdownResult> {
    await wait(latencyMs);
    const all = rowsFor(query.by, query.range);
    const needle = query.query.trim().toLowerCase();
    const matching = all.filter((row) => row.name.toLowerCase().includes(needle));
    const { key, direction } = query.sort;
    const sign = direction === "asc" ? 1 : -1;
    matching.sort((a, b) => sign * (key === "name" ? a.name.localeCompare(b.name) : a[key] - b[key]));
    const rows = matching.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
    const previous = query.compare && rowsFor(query.by, query.compare);
    return {
        rows,
        compareRows: previous ? previous.filter((p) => rows.some((r) => r.name === p.name)) : [],
        totalRows: matching.length,
        stats: {
            requests: { total: all.reduce((sum, r) => sum + r.requests, 0), max: Math.max(...all.map((r) => r.requests)) },
            totalTokens: { total: all.reduce((sum, r) => sum + r.totalTokens, 0), max: Math.max(...all.map((r) => r.totalTokens)) },
        },
    };
}
