// A stand-in for the product's API: invented numbers for example.com, worked out from the dates asked for.
// A real product fetches this from its own endpoints; the page element below never knows the difference.
import type { UaxMarker, UaxSeries } from "../../../chart/types.js";
import type { UaxColorSlot } from "../../../theme/types.js";
import type { UaxCompare, UaxDateRange } from "../../../date-range/types.js";
import type { UaxGroupBy } from "../../../group-by/group-by.element.js";
import type { UaxTableSortDirection } from "../../../table/types.js";

// #region data
export type PageRow = { url: string; pageviews: number; sessions: number };
export type VisitorTypeRow = { type: string; visitors: number; sessions: number };

const DAY_MS = 86_400_000;
const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);

/** Every ISO date from `from` to `to`, both included. */
export function daysIn(from: string, to: string): string[] {
    const days: string[] = [];
    for (let time = toTime(from); time <= toTime(to); time += DAY_MS) days.push(toIso(time));
    return days;
}

/** The range of the same length that ends the day before `range` starts. */
export function previousPeriod(range: UaxDateRange): UaxCompare {
    const length = daysIn(range.from, range.to).length;
    const to = toTime(range.from) - DAY_MS;
    return { mode: "previous-period", from: toIso(to - (length - 1) * DAY_MS), to: toIso(to) };
}

// Steady "noise" from any text, so the same day or page always gives the same number between 0 and 1.
const noise = (text: string) => {
    let hash = 2166136261;
    for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
    return ((hash ^ (hash >>> 13)) >>> 0) / 4294967296;
};

/** Pageviews on one day: quieter at weekends, a spike when the spring campaign launched on 11 June. */
const pageviewsOn = (date: string) => {
    const weekday = new Date(toTime(date)).getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.55 : 1;
    const spike = date === "2026-06-11" ? 2.4 : 1;
    return Math.round((90 + noise(date) * 40) * weekend * spike);
};

/** Visitors on one day, split into new and returning. */
const visitorsOn = (date: string) => {
    const total = Math.round(pageviewsOn(date) * 0.42);
    const returning = Math.round(total * (0.3 + noise(`${date}!`) * 0.1));
    return { returning, new: total - returning };
};

/** The events drawn on the chart's timeline. */
export const markers: UaxMarker[] = [
    { id: "spring", date: "2026-06-11", title: "Spring campaign", description: "Email to 12,000 subscribers" },
    { id: "pricing", date: "2026-06-18", title: "New pricing page" },
];

/** The first day of the week (Monday) or month `date` falls in. */
function bucketStart(date: string, groupBy: UaxGroupBy): string {
    if (groupBy === "month") return `${date.slice(0, 7)}-01`;
    if (groupBy === "week") {
        const daysSinceMonday = (new Date(toTime(date)).getUTCDay() + 6) % 7;
        return toIso(toTime(date) - daysSinceMonday * DAY_MS);
    }
    return date;
}

/** Adds the days up per day, week or month. */
function series(id: string, label: string, color: UaxColorSlot, range: { from: string; to: string }, groupBy: UaxGroupBy, valueOn: (date: string) => number): UaxSeries {
    const sums = new Map<string, number>();
    for (const date of daysIn(range.from, range.to)) {
        const key = bucketStart(date, groupBy);
        sums.set(key, (sums.get(key) ?? 0) + valueOn(date));
    }
    return { id, label, color, points: [...sums].map(([date, value]) => ({ date, value })) };
}

export type ChartView = "pageviews" | "visitors";

/** The chart's series: pageviews as one series, visitors as returning and new (stacked). */
export function fetchChartSeries(view: ChartView, range: { from: string; to: string }, groupBy: UaxGroupBy): UaxSeries[] {
    return view === "pageviews"
        ? [series("pageviews", "Pageviews", 1, range, groupBy, pageviewsOn)]
        : [
              series("returning", "Returning visitors", 1, range, groupBy, (d) => visitorsOn(d).returning),
              series("new", "New visitors", 2, range, groupBy, (d) => visitorsOn(d).new),
          ];
}

/** The previous period for the chart. The stacked bars draw it as one bar, so visitors are one series. */
export function fetchCompareSeries(view: ChartView, range: { from: string; to: string }, groupBy: UaxGroupBy): UaxSeries[] {
    return view === "pageviews"
        ? [series("pageviews", "Pageviews", 1, range, groupBy, pageviewsOn)]
        : [series("visitors", "Visitors", 1, range, groupBy, (d) => visitorsOn(d).returning + visitorsOn(d).new)];
}

const slugs = [
    "", "products/", "products/oak-desk/", "products/linen-sofa/", "blog/", "blog/spring-living-room-ideas/", "about/", "contact/",
    "products/brass-lamp/", "stores/", "stores/copenhagen/", "blog/caring-for-oak/", "products/wool-rug/", "sale/", "delivery/",
    "returns/", "products/walnut-shelf/", "blog/small-space-storage/", "products/ceramic-vase/", "gift-cards/", "careers/",
    "products/linen-curtains/", "blog/colour-trends-2026/", "stores/aarhus/", "faq/", "products/cane-chair/", "blog/our-workshop/",
    "products/stone-table/", "newsletter/", "privacy/", "products/glass-pendant/", "blog/room-by-room/", "stores/odense/", "terms/",
];
const everyUrl = slugs.map((slug) => `https://www.example.com/${slug}`);
// Each page's slice of all pageviews: the busiest page first, tapering off.
const weights = everyUrl.map((_, i) => 1 / (i + 2));
const weightSum = weights.reduce((sum, w) => sum + w, 0);

const sumOver = (range: { from: string; to: string }, valueOn: (date: string) => number) =>
    daysIn(range.from, range.to).reduce((sum, date) => sum + valueOn(date), 0);

const allPages = (range: { from: string; to: string }): PageRow[] => {
    const total = sumOver(range, pageviewsOn);
    return everyUrl.map((url, i) => {
        const pageviews = Math.round((total * weights[i]) / weightSum);
        return { url, pageviews, sessions: Math.round(pageviews * (0.55 + noise(`${url}${range.from}`) * 0.2)) };
    });
};

export type PagesQuery = {
    range: { from: string; to: string };
    compare?: { from: string; to: string };
    sort: { key: string; direction: UaxTableSortDirection };
    page: number;
    pageSize: number;
    query: string;
};

export type PagesResult = {
    rows: PageRow[];
    /** The same pages in the compare range, for the badges. */
    compareRows: PageRow[];
    /** How many pages match the search, across every page of the table. */
    totalRows: number;
    /** Each column's total (what a share is a percent of) and largest value (what a full bar stands for) over every page, searched or not. */
    stats: Record<"pageviews" | "sessions", { total: number; max: number }>;
    /** All pageviews in the range and in the compare range. */
    pageviews: { current: number; previous?: number };
};

/** One page of the pages table, searched and sorted the way a server would. */
export function fetchPages({ range, compare, sort, page, pageSize, query }: PagesQuery): PagesResult {
    const every = allPages(range);
    const needle = query.trim().toLowerCase();
    const matching = every.filter((row) => row.url.toLowerCase().includes(needle));
    const by = sort.key as keyof PageRow;
    const direction = sort.direction === "asc" ? 1 : -1;
    matching.sort((a, b) => direction * (by === "url" ? a.url.localeCompare(b.url) : a[by] - b[by]));
    const previous = compare ? allPages(compare) : [];
    return {
        rows: matching.slice((page - 1) * pageSize, page * pageSize),
        compareRows: previous,
        totalRows: matching.length,
        stats: {
            pageviews: { total: every.reduce((s, r) => s + r.pageviews, 0), max: Math.max(...every.map((r) => r.pageviews)) },
            sessions: { total: every.reduce((s, r) => s + r.sessions, 0), max: Math.max(...every.map((r) => r.sessions)) },
        },
        pageviews: { current: sumOver(range, pageviewsOn), previous: compare ? sumOver(compare, pageviewsOn) : undefined },
    };
}

const visitorTypes = (range: { from: string; to: string }): VisitorTypeRow[] => {
    const days = daysIn(range.from, range.to);
    const returning = days.reduce((sum, d) => sum + visitorsOn(d).returning, 0);
    const added = days.reduce((sum, d) => sum + visitorsOn(d).new, 0);
    return [
        { type: "New visitors", visitors: added, sessions: added },
        { type: "Returning visitors", visitors: returning, sessions: Math.round(returning * 2.1) },
    ];
};

/** The visitors table: one row per user type, for the range and the compare range. */
export function fetchVisitorTypes(range: { from: string; to: string }, compare?: { from: string; to: string }) {
    const rows = visitorTypes(range);
    const compareRows = compare ? visitorTypes(compare) : [];
    return {
        rows,
        compareRows,
        visitors: { current: rows.reduce((s, r) => s + r.visitors, 0), previous: compare ? compareRows.reduce((s, r) => s + r.visitors, 0) : undefined },
    };
}
// #endregion
